/**
 * @license
 * SENA Learning Hub - Modal Administrativo Seguro para Asignación de Rol Instructor
 * Permite promover o cambiar rol de un usuario existente mediante verificación
 * de código de seguridad institucional o autorización administrativa.
 */

import React, { useState } from 'react';
import { Shield, Key, AlertCircle, CheckCircle2, UserCheck, Lock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { promoteToInstructor } from '../../services/firebase/authService';

interface RolePromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RolePromotionModal: React.FC<RolePromotionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [adminKey, setAdminKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      await promoteToInstructor(currentUser.uid, adminKey);
      await refreshProfile();
      setSuccessMsg('¡Rol de INSTRUCTOR asignado correctamente en Firestore!');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setAdminKey('');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al autorizar el rol de instructor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Autorización Administrativa de Rol Instructor"
      subtitle="Asignación controlada para pruebas de desarrollo e instructores autorizados"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePromote}
            disabled={isSubmitting || !adminKey.trim()}
            className="px-4 py-1.5 bg-[#00324D] hover:bg-[#002235] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Shield className="w-3.5 h-3.5 text-[#8CE665]" />
            {isSubmitting ? 'Verificando...' : 'Autorizar como Instructor'}
          </button>
        </div>
      }
    >
      <form onSubmit={handlePromote} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-[#EBF8E7] border border-[#39A900]/40 text-[#2E8500] text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
          <div className="font-semibold text-slate-700 flex items-center justify-between">
            <span>Usuario a Promover:</span>
            <span className="font-mono text-[11px] text-slate-500">{currentUser?.email}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>Rol actual en Firestore:</span>
            <span className="font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {userProfile?.role || 'apprentice'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Clave de Autorización Institucional SENA *
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              placeholder="Ingresa la clave de autorización"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#39A900] bg-slate-50/50"
            />
          </div>
          <p className="text-[10px] text-slate-500">
            * Clave administrativa de desarrollo: <code className="bg-slate-100 text-[#00324D] px-1 py-0.5 rounded font-bold font-mono">SENA-INSTRUCTOR-2026</code>
          </p>
        </div>

        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
          <Lock className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <p className="leading-relaxed">
            Esta función actualiza directamente el documento <code className="font-mono text-amber-950 font-semibold">/users/{'{uid}'}</code> en Firestore tras verificar la clave. Un usuario no autorizado o sin clave válida no puede cambiar su propio rol.
          </p>
        </div>
      </form>
    </Modal>
  );
};
