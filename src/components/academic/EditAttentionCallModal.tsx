/**
 * @license
 * SENA Learning Hub - Modal de Configuración y Edición de Llamado de Atención
 * Formato Oficial SENA (Regional Tolima · Centro Comercio y Servicios)
 * Permite selección múltiple de novedades con sus artículos reglamentarios oficiales,
 * modificación de fecha del llamado, modificación de hora de llegadas tarde,
 * y personalización del plan de mejoramiento.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  User,
  Shield,
  Eye,
  CheckCircle2,
  X,
  Sparkles,
  BookOpen,
  Send,
  Save,
  CheckSquare,
  Square,
  HelpCircle,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { AttentionCall, AttentionCallType } from '../../types/academic';
import { SenaLogo } from '../common/SenaLogo';
import {
  getCustomSenaLogo,
  setCustomSenaLogo,
  clearCustomSenaLogo,
} from '../../utils/senaLogoStorage';

export interface NoveltyOption {
  id: string;
  label: string;
  headerTitle: string;
  normText: string;
  hasTime?: boolean;
  defaultPlan: string;
}

export const SENA_NOVELTIES: NoveltyOption[] = [
  {
    id: 'uniform',
    label: 'Mal porte del Uniforme',
    headerTitle: 'Mal porte del Uniforme',
    normText: `No cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n20. Portar el conjunto de prendas y elementos de trabajo y protección asociados al proceso formativo.`,
    defaultPlan: `El aprendiz deberá portar el conjunto de prendas y elementos de trabajo y protección asociados al proceso formativo conforme a los lineamientos institucionales del SENA.`,
  },
  {
    id: 'late',
    label: 'Llegadas tarde',
    headerTitle: 'Llegadas tarde',
    hasTime: true,
    normText: `No cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n5. Asistir con puntualidad a todas las actividades propias del proceso de formación.`,
    defaultPlan: `El aprendiz deberá\n1. Imprimir, firmar y entregar este llamado de atención al instructor.\n2. Realizar orientaciones académicas: CARTELERA SOBRE la puntualidad (INGLES Y ESPAÑOL). presentar en dos ambientes de formación subir fotos (evidencias) a Google classroom (sección de anuncios)\n3. Presentar por escrito una propuesta y para mejorar su puntualidad. (evidencias) a Google classroom (sección de anuncios)`,
  },
  {
    id: 'absence',
    label: 'Inasistencias',
    headerTitle: 'Inasistencias',
    normText: `No cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n7. Justificar debidamente las inasistencias o incumplimientos a las actividades de la formación, en los términos establecidos en el presente reglamento.`,
    defaultPlan: `El aprendiz deberá\n1. Imprimir, firmar y entregar este llamado de atención al instructor.\n2. Justificar debidamente la inasistencia mediante soporte médico, laboral o de fuerza mayor en SENA Learning Hub dentro de los 3 días hábiles siguientes.\n3. Nivelar las actividades y evidencias pedagógicas pendientes del programa de formación.`,
  },
  {
    id: 'evidence',
    label: 'No entrega de Evidencias',
    headerTitle: 'No entrega de Evidencias',
    normText: `No cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n6. Cumplir con todas las actividades de su proceso formativo, presentando las evidencias según la planeación pedagógica, guías de aprendizaje y cronograma, en los plazos o en la oportunidad que estas deban presentarse o reportarse, a través de los medios dispuestos para ello.`,
    defaultPlan: `El aprendiz deberá concertar con el instructor un plan de mejoramiento con entrega improrrogable de las evidencias pendientes en un plazo máximo de cinco (5) días hábiles.`,
  },
  {
    id: 'plagiarism',
    label: 'Plagio o Fraude',
    headerTitle: 'Plagio o Fraude',
    normText: `No cumplimiento del CAPÍTULO III. Artículo 8 12. Respetar los derechos de autor y demás derechos de propiedad intelectual en los materiales, trabajos, proyectos y demás documentos entregados o generados en el proceso formativo.\nArtículo 9o. Prohibiciones\n4. Plagiar, materiales, trabajos y demás documentos generados en los grupos de trabajo o producto del trabajo en equipo institucional.`,
    defaultPlan: `El aprendiz deberá realizar nuevamente la evidencia con producción propia e inédita, citando rigurosamente las fuentes bajo normas bibliográficas y sustentando oralmente su trabajo ante el instructor.`,
  },
  {
    id: 'attitudinal',
    label: 'Actitudinal',
    headerTitle: 'Actitudinal',
    normText: `No cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n2. Respetar los derechos ajenos y no abusar de los propios, manteniendo buenas relaciones humanas, sana convivencia, respeto a los instructores y compañeros en los ambientes presenciales y virtuales.`,
    defaultPlan: `El aprendiz deberá firmar un compromiso formativo de sana convivencia, respeto y acatamiento de las directrices pedagógicas institucionales.`,
  },
  {
    id: 'other',
    label: 'Otro',
    headerTitle: 'Otro',
    normText: `No cumplimiento de los deberes formativos y compromisos académicos acordados en el Reglamento del Aprendiz SENA.`,
    defaultPlan: `El aprendiz deberá presentar un compromiso pedagógico y subsanar las observaciones realizadas por el instructor.`,
  },
];

interface EditAttentionCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    data: Partial<AttentionCall>,
    applyRestriction?: boolean
  ) => Promise<void> | void;
  initialData: Partial<AttentionCall>;
  isNew?: boolean;
  title?: string;
}

export const EditAttentionCallModal: React.FC<EditAttentionCallModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialData,
  isNew = true,
  title,
}) => {
  // Form fields
  const [learnerName, setLearnerName] = useState('');
  const [learnerDocument, setLearnerDocument] = useState('');
  const [fichaNumber, setFichaNumber] = useState('3405298');
  const [programName, setProgramName] = useState('GESTION CONTABLE Y DE INFORMACION FINANCIERA');
  const [place, setPlace] = useState('2070D');

  // Fecha y Hora modificables
  const [callDate, setCallDate] = useState('2026-09-28');
  const [callTime, setCallTime] = useState('17:50');

  // Selección múltiple de novedades (puede marcar 1, 2 o todas a la vez)
  const [selectedReasons, setSelectedReasons] = useState<string[]>(['late']);

  // Textos editables
  const [normativeArticle, setNormativeArticle] = useState('');
  const [improvementPlan, setImprovementPlan] = useState('');
  const [instructorName, setInstructorName] = useState('ANDRES HUERTAS');
  const [centerName, setCenterName] = useState('Centro Comercio y Servicios');
  const [regionalName, setRegionalName] = useState('Regional Tolima');
  const [callLevel, setCallLevel] = useState<'PRIMER_LLAMADO' | 'SEGUNDO_LLAMADO' | 'TERCER_LLAMADO'>('PRIMER_LLAMADO');
  const [applyRestriction, setApplyRestriction] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logo SENA personalizado
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(() => getCustomSenaLogo());

  useEffect(() => {
    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setCustomLogo(customEvent.detail !== undefined ? customEvent.detail : getCustomSenaLogo());
    };
    window.addEventListener('sena_logo_updated', handleLogoUpdate);
    return () => {
      window.removeEventListener('sena_logo_updated', handleLogoUpdate);
    };
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomSenaLogo(dataUrl);
        setCustomLogo(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetLogo = () => {
    clearCustomSenaLogo();
    setCustomLogo(null);
  };

  // Convierte 'YYYY-MM-DD' a 'DD/MM/YYYY'
  const formatDateToDDMMYYYY = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const parts = clean.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return clean;
    } catch {
      return dateStr;
    }
  };

  // Genera el texto reglamentario compuesto según las novedades marcadas
  const buildNormativeText = (reasons: string[], date: string, time: string): string => {
    const formattedDate = formatDateToDDMMYYYY(date);
    const blocks: string[] = [];

    reasons.forEach((reasonId) => {
      const opt = SENA_NOVELTIES.find((n) => n.id === reasonId);
      if (opt) {
        let block = `${opt.headerTitle}\n${opt.normText}`;
        if (opt.hasTime) {
          block += `\nDía y hora: ${formattedDate} ${time}`;
        }
        blocks.push(block);
      }
    });

    return blocks.join('\n\n');
  };

  // Genera el plan de mejoramiento sugerido según las novedades marcadas
  const buildImprovementPlanText = (reasons: string[]): string => {
    if (reasons.length === 1) {
      const opt = SENA_NOVELTIES.find((n) => n.id === reasons[0]);
      return opt ? opt.defaultPlan : '';
    }

    // Si hay múltiples seleccionadas, concatenar ordenadamente
    const lines: string[] = ['El aprendiz deberá:'];
    let counter = 1;

    reasons.forEach((reasonId) => {
      const opt = SENA_NOVELTIES.find((n) => n.id === reasonId);
      if (opt) {
        if (reasonId === 'late') {
          lines.push(`${counter}. Cumplir puntualmente con los horarios de formación y presentar propuesta de mejora de puntualidad.`);
          counter++;
        } else if (reasonId === 'absence') {
          lines.push(`${counter}. Justificar debidamente las inasistencias en SENA Learning Hub dentro de los 3 días hábiles y nivelar evidencias.`);
          counter++;
        } else if (reasonId === 'uniform') {
          lines.push(`${counter}. Portar el conjunto de prendas y elementos de protección correspondientes al ambiente formativo.`);
          counter++;
        } else if (reasonId === 'evidence') {
          lines.push(`${counter}. Concertar plan de mejoramiento con entrega improrrogable de evidencias en 5 días hábiles.`);
          counter++;
        } else if (reasonId === 'plagiarism') {
          lines.push(`${counter}. Elaborar nuevamente la evidencia con producción propia respetando derechos de autor y normas APA.`);
          counter++;
        } else if (reasonId === 'attitudinal') {
          lines.push(`${counter}. Suscribir compromiso de respeto, sana convivencia y acatamiento de directrices institucionales.`);
          counter++;
        } else {
          lines.push(`${counter}. Subsanar las observaciones pedagógicas y disciplinarias acordadas con el instructor.`);
          counter++;
        }
      }
    });

    lines.push(`${counter}. Imprimir, firmar y entregar este llamado de atención al instructor.`);

    return lines.join('\n');
  };

  // Inicializar campos cuando cambia initialData
  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    const dateVal = initialData.date || now.toISOString().split('T')[0];
    const timeVal =
      initialData.time ||
      (initialData.dateTimeDetail && initialData.dateTimeDetail.includes(' ')
        ? initialData.dateTimeDetail.split(' ')[1]
        : '17:50');

    setLearnerName(initialData.learnerName || '');
    setLearnerDocument(initialData.learnerDocument || '');
    setFichaNumber(initialData.fichaNumber || initialData.fichaId?.replace('ficha_', '') || '');
    setProgramName(
      initialData.programName ||
        initialData.courseName ||
        'Programa de Formación SENA'
    );
    setPlace(initialData.place || '2070D');
    setCallDate(dateVal);
    setCallTime(timeVal);
    setInstructorName(initialData.instructorName || 'ANDRES HUERTAS');
    setCenterName(initialData.centerName || 'Centro Comercio y Servicios');
    setRegionalName(initialData.regionalName || 'Regional Tolima');
    setCallLevel(initialData.callLevel || 'PRIMER_LLAMADO');

    // Inicializar razones marcadas
    let initialReasons: string[] = [];
    if (initialData.selectedReasons && initialData.selectedReasons.length > 0) {
      initialReasons = initialData.selectedReasons;
    } else if (initialData.type === 'TARDANZA') {
      initialReasons = ['late'];
    } else if (initialData.type === 'INASISTENCIA') {
      initialReasons = ['absence'];
    } else if (initialData.type === 'NO_ENTREGA_EVIDENCIA') {
      initialReasons = ['evidence'];
    } else {
      initialReasons = ['late'];
    }

    setSelectedReasons(initialReasons);

    if (initialData.normativeArticle) {
      setNormativeArticle(initialData.normativeArticle);
    } else {
      setNormativeArticle(buildNormativeText(initialReasons, dateVal, timeVal));
    }

    if (initialData.improvementPlan) {
      setImprovementPlan(initialData.improvementPlan);
    } else {
      setImprovementPlan(buildImprovementPlanText(initialReasons));
    }

    setPreviewMode(false);
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Manejar cambio de checkbox de novedad
  const handleToggleReason = (reasonId: string) => {
    let updated: string[];
    if (selectedReasons.includes(reasonId)) {
      if (selectedReasons.length === 1) {
        // Al menos debe quedar una seleccionada
        return;
      }
      updated = selectedReasons.filter((id) => id !== reasonId);
    } else {
      updated = [...selectedReasons, reasonId];
    }

    setSelectedReasons(updated);
    setNormativeArticle(buildNormativeText(updated, callDate, callTime));
    setImprovementPlan(buildImprovementPlanText(updated));
  };

  // Manejar cambio de fecha del llamado
  const handleDateChange = (newDate: string) => {
    setCallDate(newDate);
    // Si incluye Llegadas tarde, actualizar el texto con la nueva fecha
    if (selectedReasons.includes('late')) {
      setNormativeArticle(buildNormativeText(selectedReasons, newDate, callTime));
    }
  };

  // Manejar cambio de hora de llegada tarde
  const handleTimeChange = (newTime: string) => {
    setCallTime(newTime);
    if (selectedReasons.includes('late')) {
      setNormativeArticle(buildNormativeText(selectedReasons, callDate, newTime));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formattedDate = formatDateToDDMMYYYY(callDate);
      const dateTimeDetail = `${formattedDate} ${callTime}`;

      // Determinar tipo representativo principal
      let primaryType: AttentionCallType = 'OTRO';
      if (selectedReasons.includes('late')) primaryType = 'TARDANZA';
      else if (selectedReasons.includes('absence')) primaryType = 'INASISTENCIA';
      else if (selectedReasons.includes('evidence')) primaryType = 'NO_ENTREGA_EVIDENCIA';

      const labels = selectedReasons
        .map((id) => SENA_NOVELTIES.find((n) => n.id === id)?.label)
        .filter(Boolean)
        .join(', ');

      const payload: Partial<AttentionCall> = {
        ...initialData,
        learnerName,
        learnerDocument,
        fichaNumber,
        programName,
        type: primaryType,
        selectedReasons,
        date: callDate,
        time: callTime,
        dateTimeDetail,
        place,
        normativeArticle,
        improvementPlan,
        instructorName,
        centerName,
        regionalName,
        callLevel,
        reason: `Novedad: ${labels}`,
        status: initialData.status || 'NOTIFICADO',
      };

      await onConfirm(payload, applyRestriction);
      onClose();
    } catch (err) {
      console.error('Error al confirmar llamado de atención:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formato largo de fecha para encabezado
  const formatLongDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('es-CO', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const headerCode = `LLA_${callDate.replace(/-/g, '')}_${fichaNumber}_${learnerName
    .toUpperCase()
    .replace(/\s+/g, '_')}`;

  const hasLateSelected = selectedReasons.includes('late');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94vh]">
        {/* Encabezado modal */}
        <div className="bg-[#00324D] text-white p-4 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#8CE665]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {title || (isNew ? 'Configurar y Emitir Llamado de Atención' : 'Modificar Llamado de Atención')}
              </h3>
              <p className="text-xs text-slate-300">
                Selección de Novedades · Reglamento del Aprendiz SENA · Regional Tolima
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Opción para cargar imagen personalizada del Logo SENA */}
            <label
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Cargar imagen personalizada del Logo SENA"
            >
              <Upload className="w-3.5 h-3.5 text-[#8CE665]" />
              <span>{customLogo ? 'Cambiar Logo' : 'Cargar Logo SENA'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>

            {customLogo && (
              <button
                type="button"
                onClick={handleResetLogo}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                title="Restablecer logo oficial"
              >
                <RotateCcw className="w-3 h-3" />
                Original
              </button>
            )}

            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                previewMode
                  ? 'bg-amber-400 text-slate-900 hover:bg-amber-300'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Eye className="w-4 h-4" />
              {previewMode ? 'Volver a Edición' : 'Vista Previa Oficial'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido (Modo Edición vs Modo Vista Previa Oficial) */}
        <div className="p-4 sm:p-6 overflow-y-auto grow">
          {!previewMode ? (
            <form id="edit-call-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Barra de Novedades idéntica a la imagen del usuario */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                {/* Cabecera Verde SENA */}
                <div className="bg-[#39A900] text-white grid grid-cols-7 text-center py-2 px-1 divide-x divide-white/20">
                  {SENA_NOVELTIES.map((opt) => (
                    <div
                      key={opt.id}
                      className="px-1 text-[11px] font-bold leading-tight flex items-center justify-center min-h-[38px]"
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>

                {/* Fila de Checkboxes */}
                <div className="bg-white grid grid-cols-7 text-center py-3 px-1 divide-x divide-slate-100 items-center">
                  {SENA_NOVELTIES.map((opt) => {
                    const isChecked = selectedReasons.includes(opt.id);
                    return (
                      <div key={opt.id} className="flex justify-center items-center">
                        <label className="cursor-pointer p-1.5 rounded-md hover:bg-slate-100 transition-colors flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleReason(opt.id)}
                            className="w-5 h-5 text-[#39A900] rounded border-slate-400 focus:ring-[#39A900] cursor-pointer"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-medium italic text-right">
                * Puedes marcar una, dos o todas las opciones de novedad a la vez. Cada motivo incluirá sus artículos normativos oficiales.
              </div>

              {/* Fila: Selector de Fecha del llamado y Hora (editable para llegadas tarde) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#39A900]" />
                    Fecha del Llamado:
                  </label>
                  <input
                    type="date"
                    required
                    value={callDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#39A900]"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                    {formatLongDate(callDate)}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Hora de Llegada Tarde / Sesión:
                  </label>
                  <input
                    type="time"
                    required
                    value={callTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#39A900] ${
                      hasLateSelected
                        ? 'border-amber-400 ring-1 ring-amber-300 bg-amber-50/30'
                        : 'border-slate-300'
                    }`}
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Formato: HH:mm (24 horas)
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-600" />
                    Lugar / Ambiente:
                  </label>
                  <input
                    type="text"
                    required
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="Ej: 2070D"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#39A900]"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Aula o ambiente de formación
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                    Instructor que Hace el Llamado:
                  </label>
                  <input
                    type="text"
                    required
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#39A900]"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                    Nombre completo del instructor
                  </span>
                </div>
              </div>

              {/* Fila: Datos del Aprendiz y Grupo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Nombres y Apellidos del Aprendiz:
                  </label>
                  <input
                    type="text"
                    required
                    value={learnerName}
                    onChange={(e) => setLearnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#39A900]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Documento de Identidad:
                  </label>
                  <input
                    type="text"
                    required
                    value={learnerDocument}
                    onChange={(e) => setLearnerDocument(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-[#39A900]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Número de Ficha:
                  </label>
                  <input
                    type="text"
                    required
                    value={fichaNumber}
                    onChange={(e) => setFichaNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-[#00324D] focus:ring-2 focus:ring-[#39A900]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Grupo / Programa de Formación:
                  </label>
                  <input
                    type="text"
                    required
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-[#39A900]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Nivel del Llamado:
                  </label>
                  <select
                    value={callLevel}
                    onChange={(e) => setCallLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#39A900]"
                  >
                    <option value="PRIMER_LLAMADO">Primer Llamado Instructor</option>
                    <option value="SEGUNDO_LLAMADO">Segundo Llamado Coordinador Académico</option>
                    <option value="TERCER_LLAMADO">Tercer Llamado Subdirector – Comité Evaluación</option>
                  </select>
                </div>
              </div>

              {/* Fila: Sección MOTIVO (Textarea dinámico / editable) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Sección MOTIVO (Artículos del Reglamento según Novedades Seleccionadas):
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Editable · Aparece tal cual en el documento oficial
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={normativeArticle}
                  onChange={(e) => setNormativeArticle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 leading-relaxed font-sans focus:ring-2 focus:ring-[#39A900] focus:border-[#39A900]"
                  placeholder="Artículos normativos del Reglamento del Aprendiz SENA..."
                />
              </div>

              {/* Fila: PLAN DE MEJORAMIENTO (Textarea editable) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    PLAN DE MEJORAMIENTO (Acciones Pedagógicas y Compromisos):
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Acciones numeradas que el aprendiz deberá ejecutar
                  </span>
                </div>
                <textarea
                  rows={5}
                  required
                  value={improvementPlan}
                  onChange={(e) => setImprovementPlan(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 leading-relaxed font-sans focus:ring-2 focus:ring-[#39A900] focus:border-[#39A900]"
                  placeholder="El aprendiz deberá..."
                />
              </div>

              {/* Fila: Medida Cautelar Opcional */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">
                      Aplicar restricción preventiva de entrega de evidencias
                    </span>
                    <span className="text-[11px] text-amber-700">
                      Bloquea el formulario de entregas hasta que la novedad sea debidamente justificada.
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={applyRestriction}
                    onChange={(e) => setApplyRestriction(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#39A900]"></div>
                </label>
              </div>
            </form>
          ) : (
            /* Vista Previa Oficial del Documento SENA */
            <div
              className="p-10 sm:p-14 text-black space-y-5 bg-white leading-normal rounded-sm"
              style={{
                fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
                fontSize: '11px',
                color: '#000000',
                border: '1px solid #d1d5db',
                borderRadius: '2px',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.08)',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textRendering: 'optimizeLegibility',
              }}
            >
              {/* Código de cabecera */}
              <div
                className="text-right font-mono pb-1"
                style={{ fontSize: '9.5px', color: '#374151' }}
              >
                {headerCode}
              </div>

              {/* Logo y Encabezado Centrado */}
              <div className="text-center space-y-1">
                <SenaLogo width={52} height={52} showText={true} className="mx-auto mb-1.5" />
                <h2
                  className="font-bold tracking-tight leading-tight uppercase"
                  style={{ fontSize: '13px', color: '#111827', letterSpacing: '0.03em' }}
                >
                  {centerName}
                </h2>
                <h3
                  className="font-bold leading-tight uppercase"
                  style={{ fontSize: '12px', color: '#1f2937', letterSpacing: '0.02em' }}
                >
                  {regionalName}
                </h3>
                <h1
                  className="font-black uppercase tracking-wider pt-1.5"
                  style={{ fontSize: '13.5px', color: '#000000', letterSpacing: '0.05em' }}
                >
                  LLAMADO DE ATENCION
                </h1>
              </div>

              {/* Barra de metadatos */}
              <div
                className="pt-3 pb-3 space-y-1.5"
                style={{
                  fontSize: '11px',
                  color: '#000000',
                  borderTop: '1px solid #9ca3af',
                  borderBottom: '1px solid #9ca3af',
                }}
              >
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <span>
                    <strong style={{ fontWeight: 700 }}>GRUPO:</strong> {programName.toUpperCase()}
                  </span>
                  <span>
                    <strong style={{ fontWeight: 700 }}>FICHA:</strong> {fichaNumber}
                  </span>
                  <span>
                    <strong style={{ fontWeight: 700 }}>LUGAR:</strong> {place}
                  </span>
                  <span>
                    <strong style={{ fontWeight: 700 }}>FECHA:</strong> {formatLongDate(callDate)}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 pt-0.5">
                  <span>
                    <strong style={{ fontWeight: 700 }}>NOMBRES Y APELLIDOS:</strong>{' '}
                    {learnerName.toUpperCase()}
                  </span>
                  <span>
                    <strong style={{ fontWeight: 700 }}>DOCUMENTO:</strong> {learnerDocument}
                  </span>
                </div>
              </div>

              {/* Sección MOTIVO con los artículos seleccionados */}
              <div className="space-y-1.5 pt-1" style={{ fontSize: '11px', color: '#000000' }}>
                <h4
                  className="font-bold uppercase tracking-tight"
                  style={{ fontSize: '11.5px', color: '#000000' }}
                >
                  MOTIVO:
                </h4>
                <div
                  className="whitespace-pre-wrap font-normal"
                  style={{ color: '#000000', lineHeight: 1.6 }}
                >
                  {normativeArticle}
                </div>
                <div className="pt-1.5" style={{ color: '#000000' }}>
                  <strong style={{ fontWeight: 700 }}>INSTRUCTOR QUE HACE EL LLAMADO:</strong>{' '}
                  {instructorName.toUpperCase()}
                </div>
              </div>

              {/* Sección PLAN DE MEJORAMIENTO */}
              <div className="space-y-1.5 pt-2" style={{ fontSize: '11px', color: '#000000' }}>
                <h4
                  className="font-bold uppercase tracking-tight"
                  style={{ fontSize: '11.5px', color: '#000000' }}
                >
                  PLAN DE MEJORAMIENTO:
                </h4>
                <div
                  className="whitespace-pre-wrap font-normal"
                  style={{ color: '#000000', lineHeight: 1.6 }}
                >
                  {improvementPlan}
                </div>
              </div>

              {/* Sección OBSERVACIONES QUE HACE EL APRENDIZ */}
              <div className="space-y-1.5 pt-2" style={{ fontSize: '11px', color: '#000000' }}>
                <h4
                  className="font-bold uppercase tracking-tight"
                  style={{ fontSize: '11.5px', color: '#000000' }}
                >
                  OBSERVACIONES QUE HACE EL APRENDIZ
                </h4>
                <div
                  className="rounded-xs h-26 p-2.5"
                  style={{
                    border: '1.5px solid #000000',
                    backgroundColor: '#ffffff',
                    color: '#6b7280',
                    fontSize: '11px',
                    fontStyle: 'italic',
                  }}
                >
                  Espacio reservado para observaciones o descargos del aprendiz...
                </div>
              </div>

              {/* Sección FIRMAS (Conforme a formato oficial con líneas completas) */}
              <div className="pt-14 space-y-14" style={{ color: '#000000' }}>
                {/* Fila 1: Instructor y Aprendiz */}
                <div className="grid grid-cols-2 gap-10 text-center">
                  <div>
                    <div
                      style={{
                        borderTop: '1.5px solid #000000',
                        width: '100%',
                        marginBottom: '8px',
                      }}
                    ></div>
                    <div
                      className="font-bold uppercase tracking-wide"
                      style={{ fontSize: '11px', color: '#000000' }}
                    >
                      PRIMER LLAMADO INSTRUCTOR
                    </div>
                    <div
                      className="font-bold uppercase tracking-wide pt-0.5"
                      style={{ fontSize: '11px', color: '#000000' }}
                    >
                      {instructorName}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        borderTop: '1.5px solid #000000',
                        width: '100%',
                        marginBottom: '8px',
                      }}
                    ></div>
                    <div
                      className="font-bold uppercase tracking-wide"
                      style={{ fontSize: '11px', color: '#000000' }}
                    >
                      APRENDIZ
                    </div>
                    <div
                      className="font-bold uppercase tracking-wide pt-0.5"
                      style={{ fontSize: '11px', color: '#000000' }}
                    >
                      {learnerName} {learnerDocument}
                    </div>
                  </div>
                </div>

                {/* Fila 2: Coordinador Académico y Comité de Evaluación */}
                <div className="grid grid-cols-2 gap-10 text-center">
                  <div>
                    <div
                      style={{
                        borderTop: '1.5px solid #000000',
                        width: '100%',
                        marginBottom: '8px',
                      }}
                    ></div>
                    <div
                      className="font-bold uppercase tracking-wide"
                      style={{ fontSize: '10.5px', color: '#000000' }}
                    >
                      SEGUNDO LLAMADO COORDINADOR ACADÉMICO
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        borderTop: '1.5px solid #000000',
                        width: '100%',
                        marginBottom: '8px',
                      }}
                    ></div>
                    <div
                      className="font-bold uppercase tracking-wide"
                      style={{ fontSize: '10.5px', color: '#000000' }}
                    >
                      TERCER LLAMADO SUBDIRECTOR – COMITÉ EVALUACIÓN
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal con Acciones */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {!previewMode ? (
              <button
                type="button"
                onClick={() => setPreviewMode(true)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Eye className="w-4 h-4 text-slate-600" />
                Previsualizar Documento
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                Volver a Editar
              </button>
            )}

            <button
              type="submit"
              form="edit-call-form"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting
                ? 'Guardando...'
                : isNew
                ? 'Confirmar y Emitir Llamado de Atención'
                : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
