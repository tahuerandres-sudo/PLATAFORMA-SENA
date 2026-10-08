/**
 * @license
 * SENA Learning Hub - Modal de Detalle de Actividad Pedagógica (Aprendiz)
 * Permite al aprendiz consultar toda la información pedagógica oficial antes
 * o durante la entrega de evidencias: Título, Descripción, Ficha, RAP, Fechas,
 * Instrucciones, Tipo de evidencia requerida, Rúbrica y estado de entrega.
 */

import React from 'react';
import {
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Upload,
  BookOpen,
  Award,
  Layers,
  Sliders,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  EvidenceActivity,
  AcademicSubmission,
  LearningOutcome,
  Rubric,
  Ficha,
} from '../../types/academic';
import { getEvidenceTypeConfig } from '../../config/fileLimits';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';

interface ActivityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: EvidenceActivity;
  submission?: AcademicSubmission | null;
  ficha?: Ficha | null;
  learningOutcome?: LearningOutcome | null;
  rubric?: Rubric | null;
  onOpenSubmit: () => void;
  onOpenRubric?: () => void;
  isBlocked?: boolean;
  blockReason?: string;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  isOpen,
  onClose,
  activity,
  submission,
  ficha,
  learningOutcome,
  rubric,
  onOpenSubmit,
  onOpenRubric,
  isBlocked = false,
  blockReason,
}) => {
  const config = getEvidenceTypeConfig(activity.submissionType);

  const isApproved = submission?.status === 'approved';
  const isCorrection = submission?.status === 'correction_required';
  const isSubmitted = submission && (submission.status === 'submitted' || submission.status === 'under_review');
  const isPending = !submission || isCorrection;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activity.title}
      subtitle={`Ficha #${ficha?.number || activity.fichaId} · Tarea Formativa SENA`}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            {rubric && onOpenRubric && (
              <button
                type="button"
                onClick={() => {
                  onOpenRubric();
                }}
                className="px-3.5 py-2 border border-[#39A900] text-[#2E8500] hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                Ver Rúbrica
              </button>
            )}

            {!isApproved && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubmit();
                }}
                disabled={isBlocked}
                className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {submission ? (isCorrection ? 'Reenviar Corrección' : 'Ver / Editar Entrega') : 'Entregar Evidencia'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Banner de Estado de la Evidencia */}
        <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${config.badgeClass}`}>
              {config.label}
            </span>
            <span className="text-slate-500 font-medium text-xs">
              Puntos: <strong className="text-slate-800">{activity.points || 100} pts</strong>
            </span>
          </div>

          <div>
            {submission ? (
              <StatusBadge
                status={
                  submission.status === 'approved'
                    ? 'aprobada'
                    : submission.status === 'not_approved'
                    ? 'no_aprobada'
                    : submission.status === 'correction_required'
                    ? 'corregir'
                    : 'pendiente'
                }
                size="sm"
              />
            ) : (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                Pendiente por entregar
              </span>
            )}
          </div>
        </div>

        {/* Metadatos de Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha de Publicación</span>
              <strong className="text-slate-700 text-xs">
                {activity.publishedAt
                  ? new Date(activity.publishedAt).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Registrada'}
              </strong>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Límite de Entrega</span>
              <strong className="text-slate-800 text-xs">
                {activity.dueDate
                  ? new Date(activity.dueDate).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Sin fecha de cierre'}
              </strong>
            </div>
          </div>
        </div>

        {/* RAP Curricular */}
        {learningOutcome && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#2E8500] text-xs">
              <Award className="w-3.5 h-3.5 text-[#39A900]" />
              <span>Resultado de Aprendizaje (RAP)</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              <span className="font-mono text-[11px] font-bold text-[#00324D] mr-1.5">
                [{learningOutcome.code}]
              </span>
              {learningOutcome.description}
            </p>
          </div>
        )}

        {/* Descripción Pedagógica */}
        {activity.description && (
          <div className="space-y-1">
            <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Contextualización Pedagógica</span>
            </h4>
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700 text-xs leading-relaxed whitespace-pre-line">
              {activity.description}
            </div>
          </div>
        )}

        {/* Instrucciones Paso a Paso */}
        <div className="space-y-1">
          <h4 className="font-bold text-[#00324D] text-xs flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#39A900]" />
            <span>Instrucciones para el Aprendiz *</span>
          </h4>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 text-xs leading-relaxed whitespace-pre-line font-medium">
            {activity.instructions || 'Sigue las indicaciones del instructor para radicar tu evidencia.'}
          </div>
        </div>

        {/* Rúbrica Pedagógica */}
        {rubric && (
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#39A900]" />
                <span>Rúbrica de Evaluación: {rubric.title}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {rubric.criteria?.length || 0} criterios pedagógicos · Ponderación total: {rubric.totalPoints || 100} pts
              </p>
            </div>
            {onOpenRubric && (
              <button
                type="button"
                onClick={onOpenRubric}
                className="px-2.5 py-1 text-[11px] font-bold text-[#2E8500] hover:bg-emerald-50 border border-emerald-300 rounded-md transition-colors cursor-pointer shrink-0"
              >
                Consultar Criterios
              </button>
            )}
          </div>
        )}

        {/* Estado de Entrega Previa si existe */}
        {submission && (
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs">Tu Entrega Actual:</span>
              <span className="text-[11px] text-slate-500">
                Radicado el {new Date(submission.submittedAt).toLocaleString('es-CO')}
              </span>
            </div>

            {submission.fileName && (
              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-xs flex items-center justify-between">
                <span className="font-medium text-slate-700 truncate">{submission.fileName}</span>
                {submission.driveUrl && (
                  <a
                    href={submission.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2E8500] font-bold hover:underline flex items-center gap-1 text-[11px] shrink-0 ml-2"
                  >
                    Ver en Drive <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {submission.feedback && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs space-y-1">
                <span className="font-bold text-emerald-900 block">Retroalimentación del Instructor:</span>
                <p className="text-emerald-800 italic text-[11px]">"{submission.feedback}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
