/**
 * @license
 * SENA Learning Hub - Modal "Completa tu Perfil" (Requisito 9)
 */

import React, { useState } from 'react';
import { ShieldCheck, User, Phone, FileText } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [documentNumber, setDocumentNumber] = useState(userProfile?.documentNumber || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentNumber || !phone) {
      setError('Por favor completa tu número de documento y teléfono para validar tu ficha.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateProfile({
        displayName: displayName || userProfile?.displayName,
        documentNumber,
        phone,
      });
      onClose();
    } catch (err: any) {
      setError('No se pudo guardar la información del perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Completa tu Perfil de Aprendiz"
      subtitle="Requerido para vinculación a fichas y seguimiento académico SENA"
      footer={
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          {loading ? 'Guardando...' : 'Guardar y Continuar'}
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nombre Completo
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Número de Documento (Cédula / Tarjeta de Identidad) *
          </label>
          <input
            type="text"
            required
            placeholder="Ej: 1098765432"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Teléfono Móvil de Contacto *
          </label>
          <input
            type="tel"
            required
            placeholder="Ej: 320 445 9812"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
          />
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
          <div className="font-semibold text-[#00324D] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#39A900]" />
            Programa y Ficha Asignada:
          </div>
          <div>Gestión Contable y de Información Financiera (Ficha 1234567)</div>
          <p className="text-[10px] text-slate-400">
            * Se vinculará de forma dinámica en el Módulo Académico del PROMPT 3.
          </p>
        </div>
      </form>
    </Modal>
  );
};
