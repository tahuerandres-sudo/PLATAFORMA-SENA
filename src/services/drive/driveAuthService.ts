/**
 * @license
 * SENA Learning Hub - Servicio de Autenticación y Autorización de Google Drive
 * PROMPT 4: Requisitos 7, 8, 22
 *
 * Scope: https://www.googleapis.com/auth/drive.file (Principio de Mínimo Privilegio)
 * Gestión segura de Access Token en memoria sin persistir secretos en localStorage ni Firestore.
 */

import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/config';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Token de acceso OAuth en memoria (Zero-Persistence en LocalStorage/Cookies por seguridad)
let inMemoryAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;
let driveUserEmail: string | null = null;

// Suscriptores de estado de conexión
type DriveAuthListener = (isConnected: boolean, email: string | null) => void;
const listeners: DriveAuthListener[] = [];

function notifyListeners() {
  const connected = !!inMemoryAccessToken;
  listeners.forEach((listener) => {
    try {
      listener(connected, driveUserEmail);
    } catch (err) {
      console.error('[driveAuthService] Error notificando listener:', err);
    }
  });
}

// Limpiar token en memoria si se cierra la sesión en Firebase Auth
onAuthStateChanged(auth, (user) => {
  if (!user) {
    inMemoryAccessToken = null;
    tokenExpiresAt = null;
    driveUserEmail = null;
    notifyListeners();
  }
});

export const driveAuthService = {
  /**
   * Suscribe a cambios en el estado de conexión de Google Drive
   */
  subscribe(listener: DriveAuthListener): () => void {
    listeners.push(listener);
    // Notificar estado inmediato
    listener(!!inMemoryAccessToken, driveUserEmail);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  /**
   * Verifica si existe una conexión activa a Google Drive con token válido
   */
  isConnected(): boolean {
    if (!inMemoryAccessToken) return false;
    if (tokenExpiresAt && Date.now() >= tokenExpiresAt) {
      inMemoryAccessToken = null;
      tokenExpiresAt = null;
      notifyListeners();
      return false;
    }
    return true;
  },

  /**
   * Obtiene el token de acceso actual en memoria
   */
  getAccessToken(): string | null {
    if (!this.isConnected()) return null;
    return inMemoryAccessToken;
  },

  /**
   * Obtiene el correo de la cuenta de Google Drive autorizada
   */
  getConnectedEmail(): string | null {
    return driveUserEmail;
  },

  /**
   * Inicia el flujo de autorización OAuth para Google Drive
   * Utiliza GoogleAuthProvider con el scope mínimo drive.file
   */
  async connectDrive(): Promise<{ accessToken: string; email: string }> {
    const provider = new GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    provider.setCustomParameters({
      prompt: 'consent',
      access_type: 'online',
    });

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential?.accessToken) {
        throw new Error(
          'Google no retornó el token de acceso OAuth necesario para Google Drive. Por favor verifica los permisos concedidos.'
        );
      }

      inMemoryAccessToken = credential.accessToken;
      // Estimar expiración en 55 minutos (los tokens de Google duran 60 min)
      tokenExpiresAt = Date.now() + 55 * 60 * 1000;
      driveUserEmail = result.user.email || auth.currentUser?.email || 'usuario@sena.edu.co';

      notifyListeners();

      return {
        accessToken: inMemoryAccessToken,
        email: driveUserEmail,
      };
    } catch (error: any) {
      console.error('[driveAuthService] Error al conectar Google Drive:', error);
      const msg = error?.message || '';

      if (error?.code === 'auth/popup-closed-by-user') {
        throw new Error('La ventana de autorización de Google Drive se cerró antes de completar.');
      }
      if (error?.code === 'auth/popup-blocked') {
        throw new Error('El navegador bloqueó la ventana emergente de Google. Habilita los popups para continuar.');
      }
      if (msg.includes('access_denied') || msg.includes('Permission denied')) {
        throw new Error('Permiso de Google Drive rechazado por el usuario.');
      }

      throw new Error(`No se pudo conectar a Google Drive: ${msg || 'Error de autenticación'}`);
    }
  },

  /**
   * Desconecta Google Drive en la sesión actual y limpia el token en memoria
   */
  disconnectDrive(): void {
    inMemoryAccessToken = null;
    tokenExpiresAt = null;
    driveUserEmail = null;
    notifyListeners();
  },
};
