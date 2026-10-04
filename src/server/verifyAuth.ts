/**
 * @license
 * SENA Learning Hub - Backend Authentication & Authorization Guard
 * PROMPT 15.1: Verificación Server-Side del Firebase ID Token y Control de Acceso RBAC
 *
 * Directivas de Seguridad:
 * 1. La API Key de Gemini NUNCA se expone al cliente.
 * 2. El endpoint /api/gemini/generate exige un Firebase ID Token válido en Authorization: Bearer <token>.
 * 3. Se valida la firma criptográfica RS256 con los certificados públicos oficiales de Google.
 * 4. El rol real del usuario se consulta directamente en Firestore (/users/{uid}) sin confiar en campos enviados desde el frontend.
 * 5. Los aprendices solo pueden ejecutar herramientas de su catálogo. Intentar invocar herramientas de instructor resulta en HTTP 403 Forbidden.
 */

import crypto from 'crypto';
import {
  APPRENTICE_ALLOWED_TOOLS,
  INSTRUCTOR_ONLY_TOOLS,
  AiToolType,
} from '../services/ai/aiTypes.ts';

// Proyecto Firebase oficial
export const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  'sena-learning-hub';

// Estructura del resultado de validación
export interface AuthValidationResult {
  authenticated: boolean;
  uid?: string;
  email?: string;
  role?: 'instructor' | 'apprentice';
  error?: string;
  statusCode?: number;
}

// Caché en memoria para los certificados públicos de Google
interface CertCache {
  certs: Record<string, string>;
  expiresAt: number;
}

let certCache: CertCache | null = null;

/**
 * Obtiene los certificados públicos X.509 oficiales de Google para validar tokens de Firebase.
 * Implementa almacenamiento en caché respetando las cabeceras Cache-Control de Google.
 */
async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (certCache && now < certCache.expiresAt) {
    return certCache.certs;
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    if (!res.ok) {
      throw new Error(`Google certs endpoint returned HTTP ${res.status}`);
    }

    const certs = (await res.json()) as Record<string, string>;
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeSeconds = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

    certCache = {
      certs,
      expiresAt: now + maxAgeSeconds * 1000,
    };

    return certs;
  } catch (err: any) {
    console.error('[auth/certs] Error obteniendo certificados de Google:', err?.message || err);
    if (certCache && Object.keys(certCache.certs).length > 0) {
      return certCache.certs; // Usar caché existente en caso de falla transitoria
    }
    throw err;
  }
}

/**
 * Decodifica una cadena en base64url a UTF-8
 */
function decodeBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/**
 * Valida criptográficamente un Firebase ID Token (JWT con RS256).
 * Verifica firma, emisor, audiencia, vigencia temporal y formato.
 */
export async function verifyFirebaseIdToken(
  token: string,
  projectId = FIREBASE_PROJECT_ID
): Promise<{ valid: boolean; uid?: string; email?: string; error?: string }> {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token no suministrado.' };
    }

    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Estructura de JWT inválida.' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header: any;
    let payload: any;
    try {
      header = JSON.parse(decodeBase64Url(headerB64));
      payload = JSON.parse(decodeBase64Url(payloadB64));
    } catch {
      return { valid: false, error: 'No fue posible parsear las partes del token.' };
    }

    // 1. Validar encabezado
    if (header.alg !== 'RS256') {
      return { valid: false, error: 'Algoritmo de firma incompatible (se requiere RS256).' };
    }
    if (!header.kid) {
      return { valid: false, error: 'El encabezado del token carece de Key ID (kid).' };
    }

    // 2. Validar claims temporales y de identidad
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < nowSeconds) {
      return { valid: false, error: 'El token de autenticación ha expirado.' };
    }
    if (typeof payload.iat === 'number' && payload.iat > nowSeconds + 300) {
      return { valid: false, error: 'El token fue emitido en el futuro (desfase de reloj).' };
    }

    // 3. Validar audiencia y emisor contra el proyecto Firebase
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    if (payload.aud !== projectId) {
      return { valid: false, error: `Audiencia del token no coincide con el proyecto (${payload.aud} !== ${projectId}).` };
    }
    if (payload.iss !== expectedIssuer) {
      return { valid: false, error: `Emisor de token no autorizado (${payload.iss} !== ${expectedIssuer}).` };
    }
    if (!payload.sub || typeof payload.sub !== 'string') {
      return { valid: false, error: 'Identificador único de usuario (sub/uid) ausente.' };
    }

    // 4. Obtener certificado público de Google correspondiente al kid
    let certs = await getGooglePublicCerts();
    let cert = certs[header.kid];

    // Si la clave no está en caché, refrescar una vez
    if (!cert && certCache) {
      certCache.expiresAt = 0;
      certs = await getGooglePublicCerts();
      cert = certs[header.kid];
    }

    if (!cert) {
      return { valid: false, error: 'No se encontró la clave pública de Google para verificar el token.' };
    }

    // 5. Verificar firma criptográfica con Node.js crypto
    const signedData = `${headerB64}.${payloadB64}`;
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signedData);

    const isSignatureValid = verifier.verify(cert, signatureB64, 'base64url');
    if (!isSignatureValid) {
      return { valid: false, error: 'Firma criptográfica del token inválida.' };
    }

    return {
      valid: true,
      uid: payload.sub,
      email: payload.email,
    };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Error validando firma del token.' };
  }
}

/**
 * Consulta la base de datos Firestore de forma autorizada con el ID Token para obtener el rol real
 * del usuario en /users/{uid}.
 * NUNCA confía en la información de rol que envíe el cliente en el cuerpo de la petición.
 */
export async function getUserRoleFromFirestore(
  uid: string,
  idToken: string,
  projectId = FIREBASE_PROJECT_ID
): Promise<'instructor' | 'apprentice'> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) {
      // Si el documento aún no existe o hubo un error de lectura, asigna rol apprentice por defecto (mínimo privilegio)
      console.warn(`[auth/role] Firestore respondió status ${res.status} para usuario ${uid}`);
      return 'apprentice';
    }

    const docData: any = await res.json();
    const roleValue = docData?.fields?.role?.stringValue;

    if (roleValue === 'instructor') {
      return 'instructor';
    }

    return 'apprentice';
  } catch (err: any) {
    console.error('[auth/role] Error consultando /users/{uid} en Firestore:', err?.message || err);
    return 'apprentice'; // Principio de menor privilegio
  }
}

/**
 * Verifica la autorización de una herramienta de IA específica según el rol real autenticado.
 */
export function authorizeToolRequest(
  toolType: string | undefined,
  userRole: 'instructor' | 'apprentice'
): { authorized: boolean; statusCode?: number; error?: string } {
  if (!toolType) {
    return {
      authorized: false,
      statusCode: 400,
      error: 'Debe especificar el parámetro "toolType" para invocar las herramientas de IA.',
    };
  }

  const isApprenticeTool = (APPRENTICE_ALLOWED_TOOLS as readonly string[]).includes(toolType);
  const isInstructorTool = (INSTRUCTOR_ONLY_TOOLS as readonly string[]).includes(toolType);

  if (!isApprenticeTool && !isInstructorTool) {
    return {
      authorized: false,
      statusCode: 400,
      error: `La herramienta "${toolType}" no es una herramienta pedagógica reconocida del SENA Learning Hub.`,
    };
  }

  // Si el usuario es instructor, tiene acceso tanto a herramientas de instructor como de aprendiz
  if (userRole === 'instructor') {
    return { authorized: true };
  }

  // Si el usuario es aprendiz, solo tiene acceso a herramientas de aprendiz
  if (isApprenticeTool) {
    return { authorized: true };
  }

  // Aprendiz intentando utilizar una herramienta de instructor -> HTTP 403 Forbidden
  return {
    authorized: false,
    statusCode: 403,
    error: 'Acceso denegado: Esta herramienta es de uso exclusivo para instructores del SENA.',
  };
}

/**
 * Validador principal para Express y Netlify Functions.
 * Extrae la cabecera Authorization, valida el token y obtiene el rol del usuario.
 */
export async function authenticateAndAuthorize(
  authHeader: string | undefined,
  toolType: string | undefined
): Promise<AuthValidationResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'No autorizado. Se requiere un token de autenticación Bearer válido para acceder a las herramientas de IA.',
    };
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Token de autenticación vacío o incompleto.',
    };
  }

  // 1. Validar el token contra Firebase Auth
  const tokenValidation = await verifyFirebaseIdToken(idToken);
  if (!tokenValidation.valid || !tokenValidation.uid) {
    return {
      authenticated: false,
      statusCode: 401,
      error: tokenValidation.error || 'Token de autenticación inválido o expirado.',
    };
  }

  // 2. Obtener el rol real de /users/{uid} en Firestore
  const role = await getUserRoleFromFirestore(tokenValidation.uid, idToken);

  // 3. Validar autorización de la herramienta
  const toolAuth = authorizeToolRequest(toolType, role);
  if (!toolAuth.authorized) {
    return {
      authenticated: true,
      uid: tokenValidation.uid,
      email: tokenValidation.email,
      role,
      statusCode: toolAuth.statusCode || 403,
      error: toolAuth.error || 'Acceso no autorizado para esta herramienta.',
    };
  }

  return {
    authenticated: true,
    uid: tokenValidation.uid,
    email: tokenValidation.email,
    role,
  };
}
