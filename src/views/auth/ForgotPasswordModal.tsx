/**
 * @license
 * SENA Learning Hub - Modal de Recuperación de Contraseña
 */

import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (err: any) {
      // Por seguridad y como exige el prompt: No revelar si el correo existe o no
      setIsSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Recuperar Contraseña"
      subtitle="SENA Learning Hub"
      footer={
        <button
          onClick={handleClose}
          className="px-4 py-1.5 bg-[#00324D] text-white rounded-lg text-xs font-bold cursor-pointer"
        >
          {isSubmitted ? 'Entendido' : 'Cancelar'}
        </button>
      }
    >
      {isSubmitted ? (
        <div className="py-4 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#EBF8E7] text-[#39A900] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-[#00324D]">Correo de Recuperación Enviado</h4>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            Si existe una cuenta asociada a <strong>{email}</strong>, recibirás instrucciones para restablecer tu contraseña en los próximos minutos.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Ingresa el correo electrónico asociado a tu cuenta de aprendiz o instructor para recibir un enlace de recuperación seguro de Firebase.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Correo Institucional o Personal *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="ejemplo@misena.edu.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Instrucciones de Recuperación'}
          </button>
        </form>
      )}
    </Modal>
  );
};
