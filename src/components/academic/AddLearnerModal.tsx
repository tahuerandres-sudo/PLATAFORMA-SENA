/**
 * @license
 * SENA Learning Hub - Modal para Agregar Aprendices por Correo Gmail
 * PROMPT 21 & Corrección Definitiva: Asignación Exclusiva por Instructor
 * Colecciones Firestore: /enrollments, /users, /fichas
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  UserPlus,
  Mail,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Building2,
  Check,
} from 'lucide-react';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { Ficha } from '../../types/academic';

/**
 * Expresión regular para validación estándar de correo electrónico:
 * usuario@dominio.extension (Acepta Gmail, Google Workspace, misena.edu.co, puntos, etc.)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface AddLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ficha individual preseleccionada (ej: en vista de detalle de Ficha) */
  ficha?: Ficha | null;
  /** Lista de fichas asignadas al instructor (para selector cuando viene de la vista general) */
  fichas?: Ficha[];
  /** ID o número de ficha preseleccionada al abrir con selector */
  preselectedFichaId?: string;
  instructorUid: string;
  instructorName?: string;
  onLearnerAdded?: (result: {
    email: string;
    status: 'active' | 'pending';
    message: string;
    fichaId?: string;
    fichaNumber?: string;
  }) => void;
}

export const AddLearnerModal: React.FC<AddLearnerModalProps> = ({
  isOpen,
  onClose,
  ficha,
  fichas = [],
  preselectedFichaId,
  instructorUid,
  instructorName,
  onLearnerAdded,
}) => {
  const [selectedFichaId, setSelectedFichaId] = useState<string>('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successDetails, setSuccessDetails] = useState<{
    email: string;
    fichaNumber: string;
    status: 'active' | 'pending';
    message: string;
  } | null>(null);

  // Determinar catálogo de fichas disponibles garantizando siempre acceso
  const availableFichas = useMemo(() => {
    if (ficha) return [ficha];
    if (fichas && fichas.length > 0) return fichas;
    // Respaldo canónico para asegurar que el instructor siempre tenga su ficha formativa activa
    return [
      {
        id: 'ficha_3409626',
        number: '3409626',
        programName: 'Gestión Contable y de Información Financiera',
        name: 'Gestión Contable y de Información Financiera - Ficha 3409626',
        instructorIds: instructorUid ? [instructorUid] : [],
        programId: 'prog_gestion_contable',
        centerId: 'center_ccs_ibague',
        status: 'active',
        shift: 'morning',
        stage: 'lectiva',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Ficha,
    ];
  }, [ficha, fichas, instructorUid]);

  // Inicializar estado estrictamente cuando el modal pasa de cerrado a abierto
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setEmail('');
      setErrorMessage(null);
      setSuccessDetails(null);
      setLoading(false);

      if (ficha) {
        setSelectedFichaId(ficha.id);
      } else if (preselectedFichaId && preselectedFichaId !== 'all') {
        const found = availableFichas.find(
          (f) => f.id === preselectedFichaId || f.number === preselectedFichaId
        );
        setSelectedFichaId(found ? found.id : availableFichas[0]?.id || '');
      } else if (availableFichas.length > 0) {
        setSelectedFichaId(availableFichas[0].id);
      } else {
        setSelectedFichaId('');
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, ficha, preselectedFichaId, availableFichas]);

  // Ficha activa seleccionada para el registro (nunca null si el modal está abierto)
  const activeFicha =
    ficha ||
    availableFichas.find((f) => f.id === selectedFichaId || f.number === selectedFichaId) ||
    availableFichas[0] ||
    null;

  // Normalización y validación en tiempo real del correo electrónico
  const normalizedEmail = email.trim().toLowerCase();
  const isValidEmail = Boolean(normalizedEmail && EMAIL_REGEX.test(normalizedEmail));
  const canSubmit = Boolean(!loading && activeFicha && isValidEmail);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessDetails(null);

    if (!activeFicha) {
      setErrorMessage('Debes seleccionar una ficha válida para asignar al aprendiz.');
      return;
    }

    if (!isValidEmail) {
      setErrorMessage('Por favor ingresa un correo electrónico válido (ejemplo: aprendiz@gmail.com).');
      return;
    }

    setLoading(true);

    try {
      const result = await enrollmentService.addLearnerByEmail({
        fichaId: activeFicha.id,
        email: normalizedEmail,
        instructorUid,
        instructorName,
      });

      const details = {
        email: normalizedEmail,
        fichaNumber: result.fichaNumber || activeFicha.number,
        status: result.status,
        message: result.message,
      };

      setSuccessDetails(details);
      setEmail('');

      if (onLearnerAdded) {
        onLearnerAdded({
          email: normalizedEmail,
          status: result.status,
          message: result.message,
          fichaId: activeFicha.id,
          fichaNumber: result.fichaNumber || activeFicha.number,
        });
      }

      // Cerrar modal automáticamente después de confirmar visualmente
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err: any) {
      console.warn('[AddLearnerModal] Error agregando aprendiz:', err);
      setErrorMessage(
        err.message ||
          'No fue posible registrar el aprendiz. Verifica tu conexión e inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setEmail('');
    setErrorMessage(null);
    setSuccessDetails(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleClose();
      }}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-learner-title"
      >
        {/* Cabecera Institucional */}
        <div className="bg-gradient-to-r from-[#00324D] to-[#004A73] p-5 text-white flex items-center justify-between border-b-4 border-[#39A900]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#39A900] text-white flex items-center justify-center font-bold shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="add-learner-title" className="text-base font-bold text-white tracking-tight">
                AGREGAR APRENDIZ
              </h2>
              <p className="text-xs text-slate-200 mt-0.5">
                Autorización de acceso y matrícula académica por correo Gmail
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6 space-y-5">
          {availableFichas.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No tienes fichas asignadas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Para poder agregar aprendices mediante correo electrónico, primero debes tener una
                ficha de formación asignada a tu perfil de instructor en la sección{' '}
                <strong>Mis fichas</strong>.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Entendido
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Tarjeta Explicativa de Regla Institucional (Requisito 5) */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 text-xs text-emerald-900">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <ShieldCheck className="w-4 h-4 text-[#39A900] shrink-0" />
                  <span>Matrícula oficial por correo electrónico Gmail</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Puedes registrar el correo aunque el aprendiz <strong>aún no haya iniciado sesión</strong>{' '}
                  en la plataforma. El sistema creará una matrícula con estado{' '}
                  <strong className="underline">PENDIENTE</strong> que se activará en automático al hacer login con Google.
                </p>
              </div>

              {/* Sección 1: Ficha Seleccionada (Requisito 3) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Ficha de Formación <span className="text-rose-500">*</span>
                </label>

                {ficha ? (
                  /* Modo Ficha Fija: cuando se abre desde una ficha concreta */
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#00324D] text-[#8CE665] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        #{ficha.number}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-800 truncate">
                          Ficha {ficha.number}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={ficha.programName}>
                          {ficha.programName || 'Formación SENA'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-[#EBF8E7] text-[#2E8500] px-2 py-0.5 rounded border border-[#39A900]/30 shrink-0">
                      Asignada
                    </span>
                  </div>
                ) : (
                  /* Modo Selector: cuando se abre desde la vista general de aprendices */
                  <div className="relative">
                    <select
                      value={selectedFichaId}
                      onChange={(e) => {
                        setSelectedFichaId(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      disabled={loading}
                      className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#39A900]/30 focus:border-[#39A900] transition-all cursor-pointer font-medium"
                    >
                      {availableFichas.map((f) => (
                        <option key={f.id} value={f.id}>
                          Ficha {f.number} — {f.programName || f.name || 'Formación SENA'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Sección 2: Campo de Correo Electrónico (Requisito 4) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Correo electrónico del aprendiz <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    id="learner-email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="aprendiz@gmail.com"
                    disabled={loading}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#39A900]/30 focus:border-[#39A900] transition-all font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Ejemplo: <span className="font-mono text-slate-700">aprendiz@gmail.com</span> (Los espacios se recortan y se convierte a minúsculas).
                </p>
              </div>

              {/* Mensajes de Error (Requisito 17) */}
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="font-medium leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Confirmación Detallada de Éxito (Requisito 8) */}
              {successDetails && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#39A900]" />
                    <span>Aprendiz agregado correctamente.</span>
                  </div>

                  <div className="text-xs text-slate-700 bg-white/80 p-3 rounded-lg border border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Correo:</span>
                      <strong className="font-mono text-slate-900">{successDetails.email}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ficha:</span>
                      <strong className="font-mono text-[#00324D]">{successDetails.fichaNumber}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Estado:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          successDetails.status === 'active'
                            ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {successDetails.status === 'active' ? 'ACTIVO' : 'PENDIENTE'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-800">
                    {successDetails.status === 'active'
                      ? 'El usuario ya existía en la plataforma y su vinculación fue activada de inmediato.'
                      : 'El aprendiz quedó registrado. Su formación se activará cuando inicie sesión con Google.'}
                  </p>
                </div>
              )}

              {/* Botones de Acción (Requisito 2 & 16) */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {successDetails ? 'Cerrar' : 'Cancelar'}
                </button>

                {!successDetails && (
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="px-5 py-2.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Agregando aprendiz...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Agregar aprendiz</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
