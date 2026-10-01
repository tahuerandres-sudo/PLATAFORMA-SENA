/**
 * @license
 * SENA Learning Hub - Definiciones de Tipos de Autenticación y Perfil
 */

export type UserRole = 'instructor' | 'apprentice';

export type UserStatus = 'active' | 'inactive' | 'pending' | 'blocked';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  documentNumber?: string;
  phone?: string;
  programId?: string | null;
  programName?: string | null;
  fichaId?: string | null;
  centerId?: string | null;
  status: UserStatus;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  documentNumber: string;
  phone: string;
  role: UserRole;
  instructorAccessCode?: string; // Código de seguridad para desarrollo/pruebas de instructor
}

export interface UpdateProfilePayload {
  displayName?: string;
  phone?: string;
  photoURL?: string;
  documentNumber?: string;
}
