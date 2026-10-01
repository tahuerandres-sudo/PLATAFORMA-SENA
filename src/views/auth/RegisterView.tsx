/**
 * @license
 * SENA Learning Hub - Vista de Registro de Usuarios
 */

import React, { useState } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Phone,
  FileText,
  AlertCircle,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface RegisterViewProps {
  onNavigateToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigateToLogin }) => {
  const { register, authError, clearError } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        email,
        password,
        displayName,
        documentNumber,
        phone,
        role: 'apprentice',
      });
    } catch (err: any) {
      // Error manejado en authError del contexto
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Cabecera */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-[#00324D] border-2 border-[#39A900] flex items-center justify-center font-bold text-2xl text-white mx-auto shadow-sm">
          <GraduationCap className="w-8 h-8 text-[#8CE665]" />
        </div>
        <h1 className="text-2xl font-black text-[#00324D] tracking-tight">
          Registro en SENA Learning Hub
        </h1>
        <p className="text-xs text-slate-600 max-w-sm mx-auto">
          Crea tu cuenta institucional para gestionar tus evidencias y actividades de formación
        </p>
      </div>

      {/* Tarjeta de Registro */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm rounded-2xl border border-slate-200/90 space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#00324D]">Crear Cuenta Nueva</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Completa los datos oficiales de tu ficha de formación
            </p>
          </div>

          {/* Errores */}
          {(formError || authError) && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed">{formError || authError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Nombre Completo */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan David Pérez Gómez"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
                />
              </div>
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correo Electrónico (Institucional @misena / @sena o personal) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@misena.edu.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
                />
              </div>
            </div>

            {/* Documento y Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Número de Cédula / TI *
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="1098765432"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Teléfono Móvil *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="320 445 9812"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contraseña *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirmar *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Rol Institucional Fijo en Registro Público */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <label className="block font-bold text-slate-700 text-xs">
                Rol Asignado en Registro Público
              </label>
              <div className="p-3 rounded-lg border border-[#39A900] bg-[#EBF8E7] text-[#2E8500] flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>👨‍🎓 Aprendiz SENA</span>
                    <span className="text-[10px] bg-[#39A900] text-white px-1.5 py-0.2 rounded font-semibold">
                      Por defecto
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    El registro público crea cuentas exclusivamente con perfil de Aprendiz.
                  </div>
                </div>
                <Shield className="w-5 h-5 text-[#39A900]" />
              </div>
              <p className="text-[10px] text-slate-500 italic">
                * Los instructores deben contar con autorización administrativa previa para acceder a los módulos de gestión.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Creando cuenta en Firebase...</span>
              ) : (
                <>
                  <span>Registrar Cuenta en SENA Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-600">
            ¿Ya tienes una cuenta registrada?{' '}
            <button
              onClick={onNavigateToLogin}
              className="font-bold text-[#2E8500] hover:underline cursor-pointer"
            >
              Inicia sesión aquí
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
