/**
 * @license
 * SENA Learning Hub - Servicio de Autenticación y Perfil con Firebase
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './config';
import { UserProfile, RegisterPayload, UpdateProfilePayload, UserRole } from '../../types/auth';

/**
 * Código de control para registrar instructores en entorno de prueba
 * En producción se gestiona a través de asignación administrativa o Custom Claims
 */
const INSTRUCTOR_DEV_CODE = 'SENA-INSTRUCTOR-2026';

/**
 * Traduce códigos de error técnicos de Firebase a mensajes comprensibles en español
 */
export function translateAuthError(error: any): string {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
    return 'El dominio actual de la aplicación no está autorizado en Firebase Authentication. Para solucionarlo, debes agregar este dominio (ej: plataform-sena.netlify.app) en Firebase Console > Authentication > Settings > Dominios autorizados.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'El proveedor de autenticación no está habilitado en Firebase Console (Authentication > Sign-in method). Por favor habilítalo en la consola de Firebase.';
  }
  if (
    code === 'auth/api-key-not-valid-please-pass-a-valid-api-key' ||
    code === 'auth/invalid-api-key' ||
    message.includes('api-key-not-valid')
  ) {
    return 'La API Key de Firebase configurada en el entorno es inválida o está incompleta. Por favor verifica las credenciales de Firebase en el proyecto sena-learning-hub.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'El correo electrónico o la contraseña ingresada no son correctos.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }
  if (code === 'auth/weak-password') {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (code === 'auth/invalid-email') {
    return 'El formato de correo electrónico no es válido.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'La ventana de inicio de sesión con Google se cerró antes de completar.';
  }
  if (code === 'auth/popup-blocked') {
    return 'El navegador bloqueó la ventana emergente de Google. Por favor permite las ventanas emergentes en tu navegador para continuar.';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Se canceló la solicitud de autenticación debido a una acción simultánea o apertura múltiple de ventanas.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Demasiados intentos fallidos consecutivos. Por favor espera unos minutos antes de intentar de nuevo.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Error de conexión de red. Verifica tu acceso a internet.';
  }
  if (code === 'auth/user-disabled') {
    return 'Esta cuenta de usuario ha sido deshabilitada en el sistema. Contacta al centro de formación.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'Ya existe una cuenta asociada a este correo con otro método de autenticación. Inicia sesión con tus credenciales originales.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'Esta acción requiere una autenticación reciente. Por favor vuelve a iniciar sesión.';
  }
  if (message.includes('cuenta bloqueada') || message.includes('blocked')) {
    return 'Tu cuenta se encuentra bloqueada. Contacta al instructor o administrador del centro.';
  }
  if (message.includes('cuenta inactiva') || message.includes('inactive')) {
    return 'Tu cuenta se encuentra inactiva. Contacta al centro de formación.';
  }

  return message || 'Ocurrió un error al procesar la solicitud de autenticación.';
}

/**
 * Registra un nuevo usuario en Firebase Authentication y crea su documento en /users/{uid}
 */
export async function registerWithFirebase(payload: RegisterPayload): Promise<UserProfile> {
  const {
    email,
    password,
    displayName,
    documentNumber,
    phone,
    role,
    instructorAccessCode,
  } = payload;

  // 1. Registro público abierto: NUNCA permite crear un rol de instructor directamente
  // Todos los nuevos usuarios se crean de forma segura con rol 'apprentice'
  const finalRole: UserRole = 'apprentice';

  // 1. Crear usuario en Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // 2. Crear documento de perfil en Firestore: /users/{uid}
  const now = new Date().toISOString();
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email || email,
    displayName: displayName.trim(),
    photoURL:
      user.photoURL ||
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    role: finalRole,
    documentNumber: documentNumber.trim(),
    phone: phone.trim(),
    programId: 'prog_gestion_contable',
    programName: 'Gestión Contable y de Información Financiera',
    fichaId: '1234567',
    centerId: 'center_comercio_servicios',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'users', user.uid), profile);
  return profile;
}

/**
 * Inicia sesión con correo y contraseña, y obtiene el perfil desde /users/{uid}
 */
export async function loginWithFirebase(email: string, password: string): Promise<UserProfile> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const profile = await getUserProfileFromFirestore(user);
  if (profile.status === 'blocked') {
    await signOut(auth);
    throw new Error('cuenta bloqueada');
  }
  if (profile.status === 'inactive') {
    await signOut(auth);
    throw new Error('cuenta inactiva');
  }

  return profile;
}

/**
 * Inicia sesión con Google Sign-In
 * Regla de seguridad: Si el usuario es nuevo, SIEMPRE se crea como APRENDIZ
 */
export async function loginWithGoogleFirebase(): Promise<UserProfile> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const profile = await getUserProfileFromFirestore(user);
  if (profile.status === 'blocked') {
    await signOut(auth);
    throw new Error('cuenta bloqueada');
  }
  if (profile.status === 'inactive') {
    await signOut(auth);
    throw new Error('cuenta inactiva');
  }

  return profile;
}

/**
 * Obtiene o crea el documento en /users/{uid} para un usuario autenticado
 * REGLA ESTRICTA DE SEGURIDAD (Sección 6):
 * - Consulta Firestore /users/{uid}
 * - Si existe: Mantiene rigurosamente el rol existente (nunca degrada un instructor a aprendiz)
 * - Si no existe (primer ingreso con Google): Crea el perfil con rol 'apprentice' por defecto
 */
export async function getUserProfileFromFirestore(user: FirebaseUser): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', user.uid);
  
  let snapshot;
  try {
    snapshot = await getDoc(userDocRef);
  } catch (error) {
    console.error('[Firestore] Error al consultar perfil en /users/' + user.uid + ':', error);
    throw error;
  }

  // 1. Si el usuario ya existe en Firestore, retornamos su perfil real sin tocar su rol
  if (snapshot.exists()) {
    const existing = snapshot.data() as UserProfile;
    // Sincronización cosmética opcional: si falta foto o nombre y Google los tiene, actualizamos solo esos campos
    if ((!existing.displayName && user.displayName) || (!existing.photoURL && user.photoURL)) {
      try {
        const cosmeticUpdates: Partial<UserProfile> = {
          updatedAt: new Date().toISOString(),
        };
        if (!existing.displayName && user.displayName) cosmeticUpdates.displayName = user.displayName;
        if (!existing.photoURL && user.photoURL) cosmeticUpdates.photoURL = user.photoURL;
        await updateDoc(userDocRef, cosmeticUpdates);
        return { ...existing, ...cosmeticUpdates };
      } catch (err) {
        console.warn('[Firestore] No se pudieron actualizar campos cosméticos de Google:', err);
      }
    }
    return existing;
  }

  // 2. Si NO existe documento (primer ingreso de este usuario con Google o proveedor externo)
  // Siempre se crea con rol seguro 'apprentice'
  const now = new Date().toISOString();
  const defaultRole: UserRole = 'apprentice';
  const newProfile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'Aprendiz SENA',
    photoURL:
      user.photoURL ||
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    role: defaultRole,
    documentNumber: '',
    phone: '',
    programId: '',
    programName: '',
    fichaId: '',
    centerId: '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(userDocRef, newProfile);
  } catch (err) {
    console.error('[Firestore] Error al persistir documento /users/' + user.uid + ':', err);
    throw err;
  }

  return newProfile;
}

/**
 * Cierra la sesión activa
 */
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Envía correo de recuperación de contraseña con Firebase Auth
 */
export async function resetPasswordFirebase(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Actualiza los campos permitidos del perfil en Firestore
 * Solo permite editar nombre, teléfono, foto y documento; nunca rol ni estado.
 */
export async function updateUserProfile(
  uid: string,
  payload: UpdateProfilePayload
): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (payload.displayName !== undefined) updateData.displayName = payload.displayName.trim();
  if (payload.phone !== undefined) updateData.phone = payload.phone.trim();
  if (payload.photoURL !== undefined) updateData.photoURL = payload.photoURL;
  if (payload.documentNumber !== undefined) updateData.documentNumber = payload.documentNumber.trim();

  await updateDoc(userDocRef, updateData);
}

/**
 * Función administrativa para promover una cuenta existente a INSTRUCTOR.
 * Valida la clave institucional de autorización y actualiza /users/{uid} en Firestore.
 * Esto previene que un aprendiz modifique su rol por sí mismo desde la UI estándar.
 */
export async function promoteToInstructor(
  uid: string,
  authorizationKey: string
): Promise<UserProfile> {
  if (authorizationKey.trim() !== INSTRUCTOR_DEV_CODE) {
    throw new Error('Clave de autorización institucional inválida. No tienes permisos para asignar el rol de Instructor.');
  }

  const userDocRef = doc(db, 'users', uid);
  const now = new Date().toISOString();

  // Actualizar rol en Firestore
  await updateDoc(userDocRef, {
    role: 'instructor',
    updatedAt: now,
  });

  const updatedSnap = await getDoc(userDocRef);
  if (!updatedSnap.exists()) {
    throw new Error('No se encontró el documento de usuario en Firestore.');
  }

  return updatedSnap.data() as UserProfile;
}

