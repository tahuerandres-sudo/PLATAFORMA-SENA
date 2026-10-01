/**
 * @license
 * SENA Learning Hub - Vista de Inicio de Sesión
 */

import React, { useState } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginViewProps {
  onNavigateToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigateToRegister }) => {
  const { login, loginWithGoogle, authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      // Error manejado en authError del contexto
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      // Error manejado en authError
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prefill de prueba para desarrollo
  const handlePrefillApprentice = () => {
    setEmail('aprendiz.demo@misena.edu.co');
    setPassword('Sena2026*');
    clearError();
  };

  const handlePrefillInstructor = () => {
    setEmail('instructor.demo@sena.edu.co');
    setPassword('Sena2026*');
    clearError();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Cabecera / Identidad SENA */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-[#00324D] border-2 border-[#39A900] flex items-center justify-center font-bold text-2xl text-white mx-auto shadow-sm">
          <GraduationCap className="w-8 h-8 text-[#8CE665]" />
        </div>
        <h1 className="text-2xl font-black text-[#00324D] tracking-tight">
          SENA Learning Hub
        </h1>
        <p className="text-xs text-slate-600 max-w-sm mx-auto">
          Plataforma de Formación y Bilingüismo · Servicio Nacional de Aprendizaje
        </p>
      </div>

      {/* Tarjeta Principal de Login */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm rounded-2xl border border-slate-200/90 space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#00324D]">Iniciar Sesión</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingresa con tus credenciales institucionales o correo personal
            </p>
          </div>

          {/* Banner de Error traducido */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed">{authError}</div>
            </div>
          )}

          {/* Formulario de Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@misena.edu.co"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (authError) clearError();
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Contraseña *</label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-[11px] font-semibold text-[#2E8500] hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) clearError();
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Separador */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-semibold">o continuar con</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Botón Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>

          {/* Enlace para registrarse */}
          <div className="pt-2 text-center text-xs text-slate-600">
            ¿No tienes una cuenta aún?{' '}
            <button
              onClick={onNavigateToRegister}
              className="font-bold text-[#2E8500] hover:underline cursor-pointer"
            >
              Regístrate aquí
            </button>
          </div>

          {/* Panel de prueba rápida para evaluación (TEST 1 a 10) */}
          <div className="pt-4 border-t border-slate-100 bg-slate-50/80 -mx-6 -mb-8 p-4 rounded-b-2xl border-x-0 border-b-0 space-y-2 text-xs">
            <div className="font-semibold text-slate-500 text-[11px] flex items-center justify-between">
              <span>Atajos de prueba rápida (Demo):</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                PROMPT 2
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePrefillApprentice}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 text-left truncate cursor-pointer"
              >
                👨‍🎓 Rellenar Aprendiz
              </button>
              <button
                type="button"
                onClick={handlePrefillInstructor}
                className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 text-left truncate cursor-pointer"
              >
                👨‍🏫 Rellenar Instructor
              </button>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        initialEmail={email}
      />
    </div>
  );
};
