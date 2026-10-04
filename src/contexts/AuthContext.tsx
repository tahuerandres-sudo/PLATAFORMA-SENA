/**
 * @license
 * SENA Learning Hub - Contexto Global de Autenticación
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getRedirectResult, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase/config';
import {
  loginWithFirebase,
  registerWithFirebase,
  loginWithGoogleFirebase,
  logoutFirebase,
  resetPasswordFirebase,
  getUserProfileFromFirestore,
  updateUserProfile,
  translateAuthError,
} from '../services/firebase/authService';
import { UserProfile, RegisterPayload, UpdateProfilePayload } from '../types/auth';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  isInstructor: boolean;
  isApprentice: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: UpdateProfilePayload) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Único listener central onAuthStateChanged y captura de resultado de redirección
  useEffect(() => {
    // Capturar resultado de redirección si se utilizó signInWithRedirect
    getRedirectResult(auth)
      .then(async (credential) => {
        if (credential?.user) {
          try {
            const profile = await getUserProfileFromFirestore(credential.user);
            setUserProfile(profile);
          } catch (err: any) {
            console.error('[Auth] Error al procesar perfil tras redirección:', err);
            setAuthError(translateAuthError(err));
          }
        }
      })
      .catch((err: any) => {
        if (err?.code) {
          console.warn('[Auth] Error detectado en getRedirectResult:', err);
          setAuthError(translateAuthError(err));
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getUserProfileFromFirestore(user);
          setUserProfile(profile);
        } catch (err: any) {
          console.error('[Auth] Error al cargar perfil:', err);
          setAuthError(translateAuthError(err));
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setAuthError(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const profile = await loginWithFirebase(email, password);
      setUserProfile(profile);
    } catch (err: any) {
      const friendlyMsg = translateAuthError(err);
      setAuthError(friendlyMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setLoading(true);
    setAuthError(null);
    try {
      const profile = await registerWithFirebase(payload);
      setUserProfile(profile);
    } catch (err: any) {
      const friendlyMsg = translateAuthError(err);
      setAuthError(friendlyMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const profile = await loginWithGoogleFirebase();
      setUserProfile(profile);
    } catch (err: any) {
      const friendlyMsg = translateAuthError(err);
      setAuthError(friendlyMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutFirebase();
      setCurrentUser(null);
      setUserProfile(null);
    } catch (err: any) {
      console.error('[Auth] Error al cerrar sesión:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      await resetPasswordFirebase(email);
    } catch (err: any) {
      const friendlyMsg = translateAuthError(err);
      setAuthError(friendlyMsg);
      throw err;
    }
  };

  const updateProfile = async (data: UpdateProfilePayload) => {
    if (!currentUser) throw new Error('No hay usuario autenticado');
    setLoading(true);
    try {
      await updateUserProfile(currentUser.uid, data);
      await refreshProfile();
    } catch (err: any) {
      const friendlyMsg = translateAuthError(err);
      setAuthError(friendlyMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!currentUser) return;
    try {
      const profile = await getUserProfileFromFirestore(currentUser);
      setUserProfile(profile);
    } catch (err) {
      console.error('[Auth] Error al refrescar perfil:', err);
    }
  };

  const isAuthenticated = !!currentUser && !!userProfile;
  const isInstructor = isAuthenticated && userProfile?.role === 'instructor';
  const isApprentice = isAuthenticated && userProfile?.role === 'apprentice';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        authError,
        isAuthenticated,
        isInstructor,
        isApprentice,
        login,
        register,
        loginWithGoogle,
        logout,
        resetPassword,
        updateProfile,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
