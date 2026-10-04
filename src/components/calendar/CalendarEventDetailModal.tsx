/**
 * @license
 * SENA Learning Hub - Modal de Detalle de Evento del Calendario
 * PROMPT 18: Conexión 100% Real con Actividades, Entregas y Anuncios
 */

import React from 'react';
import {
  Calendar,
  Clock,
  FileText,
  Megaphone,
  CalendarCheck,
  Award,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  X,
  ExternalLink,
  ChevronRight,
  Send,
  HelpCircle,
} from 'lucide-react';
import { CalendarEventItem } from '../../types/academic';

interface CalendarEventDetailModalProps {
  event: CalendarEventItem | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: 'instructor' | 'apprentice';
  onNavigateToActivity?: (activityId: string) => void;
  onNavigateToSubmissions?: (activityId: string) => void;
}

export const CalendarEventDetailModal: React.FC<CalendarEventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  userRole,
  onNavigateToActivity,
  onNavigateToSubmissions,
}) => {
  if (!isOpen || !event) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Colores y badges según estado oficial del Prompt 18
  const getStatusBadge = () => {
    switch (event.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            🟢 Completada
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            🟡 Pendiente
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            🔴 Vencida
          </span>
        );
      case 'correction':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            🔵 En corrección
          </span>
        );
      case 'no_date':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            ⚪ Sin fecha límite
          </span>
        );
    }
  };

  const getDueBadge = () => {
    if (!event.dueLabel) return null;
    let bg = 'bg-slate-100 text-slate-700 border-slate-200';
    if (event.dueLabel === 'Due today') {
      bg = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    } else if (event.dueLabel === 'Due tomorrow') {
      bg = 'bg-orange-100 text-orange-800 border-orange-300 font-medium';
    } else if (event.dueLabel === 'Overdue') {
      bg = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    } else if (event.dueLabel.startsWith('Due in')) {
      bg = 'bg-sky-100 text-sky-800 border-sky-300';
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs border ${bg}`}>
        <Clock className="w-3 h-3" />
        {event.dueLabel}
      </span>
    );
  };

  const getTypeHeader = () => {
    switch (event.type) {
      case 'DUE_DATE':
        return {
          label: 'Fecha Límite de Entrega',
          icon: Clock,
          color: 'text-amber-700 bg-amber-50 border-amber-200',
        };
      case 'ACTIVITY':
        return {
          label: 'Actividad de Aprendizaje',
          icon: FileText,
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        };
      case 'ANNOUNCEMENT':
        return {
          label: 'Aviso Institucional',
          icon: Megaphone,
          color: 'text-purple-700 bg-purple-50 border-purple-200',
        };
      case 'ATTENDANCE':
        return {
          label: 'Sesión de Formación',
          icon: CalendarCheck,
          color: 'text-blue-700 bg-blue-50 border-blue-200',
        };
      default:
        return {
          label: 'Evento Académico',
          icon: Calendar,
          color: 'text-slate-700 bg-slate-50 border-slate-200',
        };
    }
  };

  const headerInfo = getTypeHeader();
  const TypeIcon = headerInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#00324D] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#39A900]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                {headerInfo.label}
              </span>
              <h2 className="text-lg font-bold text-white line-clamp-1">{event.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Fila de Estados y Cuenta Regresiva */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge()}
              {getDueBadge()}
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="capitalize">{formatDate(event.startDate)}</span>
              {!event.allDay && <span>• {formatTime(event.startDate)}</span>}
            </div>
          </div>

          {/* Información Contextual (Ficha / Curso) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {event.fichaNumber && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <Users className="w-4 h-4 text-[#39A900] shrink-0" />
                <div>
                  <div className="text-xs text-slate-500 font-medium">Ficha de Formación</div>
                  <div className="font-semibold text-slate-800">Ficha #{event.fichaNumber}</div>
                </div>
              </div>
            )}
            {event.points !== undefined && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500 font-medium">Ponderación Oficial</div>
                  <div className="font-semibold text-slate-800">{event.points} Puntos SENA</div>
                </div>
              </div>
            )}
            {event.instructorName && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />
                <div>
                  <div className="text-xs text-slate-500 font-medium">Docente / Creador</div>
                  <div className="font-semibold text-slate-800">{event.instructorName}</div>
                </div>
              </div>
            )}
          </div>

          {/* Descripción / Contenido */}
          {event.description && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Detalles y Orientaciones
              </h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {event.description}
              </div>
            </div>
          )}

          {/* Instrucciones pedagógicas de la actividad */}
          {event.rawActivity?.instructions && event.rawActivity.instructions !== event.description && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Instrucciones Específicas de Entrega
              </h3>
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {event.rawActivity.instructions}
              </div>
            </div>
          )}

          {/* Estado de entrega del aprendiz */}
          {userRole === 'apprentice' && event.rawActivity && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Estado de tu Entrega
                </span>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-slate-600">
                {event.status === 'completed'
                  ? 'Ya has radicado evidencia para esta actividad formativa.'
                  : event.status === 'correction'
                  ? 'Tu evidencia requiere ajustes según la retroalimentación del instructor.'
                  : event.status === 'overdue'
                  ? 'El plazo límite de entrega ha expirado. Si tienes una justificación formal radicada, el instructor podrá habilitarte una entrega extemporánea.'
                  : 'Esta actividad se encuentra pendiente de entrega.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-white transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            {/* Si es aprendiz y es una actividad */}
            {userRole === 'apprentice' && event.activityId && (
              <button
                onClick={() => {
                  onClose();
                  if (onNavigateToActivity) onNavigateToActivity(event.activityId!);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#39A900] text-white font-semibold text-sm hover:bg-[#2d8500] transition-colors shadow-sm cursor-pointer"
              >
                <span>
                  {event.status === 'correction'
                    ? 'Corregir Evidencia'
                    : event.status === 'completed'
                    ? 'Ver Mi Entrega'
                    : 'Radicar Evidencia'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Si es instructor y es una actividad */}
            {userRole === 'instructor' && event.activityId && (
              <button
                onClick={() => {
                  onClose();
                  if (onNavigateToSubmissions) onNavigateToSubmissions(event.activityId!);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00324D] text-white font-semibold text-sm hover:bg-[#00253a] transition-colors shadow-sm cursor-pointer"
              >
                <span>Ver y Calificar Evidencias</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
