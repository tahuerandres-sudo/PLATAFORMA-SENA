/**
 * @license
 * SENA Learning Hub - Modal de Visualización de Evaluación por Rúbrica
 * PROMPT 19: Requisitos 7, 10, 11, 12 (Vista Aprendiz e Instructor)
 */

import React from 'react';
import {
  FileText,
  Sliders,
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { RubricEvaluation } from '../../types/academic';

interface RubricEvaluationViewModalProps {
  evaluation: RubricEvaluation | null;
  isOpen: boolean;
  onClose: () => void;
  officialGrade?: string | number;
}

export const RubricEvaluationViewModal: React.FC<RubricEvaluationViewModalProps> = ({
  evaluation,
  isOpen,
  onClose,
  officialGrade,
}) => {
  if (!isOpen || !evaluation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#00324D] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#39A900]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Award className="w-5 h-5 text-[#8CE665]" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Dictamen Formativo por Rúbrica · Versión {evaluation.version || 1}
              </span>
              <h2 className="text-lg font-bold text-white line-clamp-1">
                {evaluation.rubricTitle || 'Evaluación de Rúbrica Pedagógica'}
              </h2>
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
          {/* Tarjeta de Resumen de Calificación */}
          <div className="p-5 bg-linear-to-r from-emerald-50 via-teal-50 to-sky-50 rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                Puntaje Total de la Rúbrica
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#2E8500]">
                  {evaluation.totalPoints}
                </span>
                <span className="text-sm font-bold text-slate-500">
                  / {evaluation.totalPossiblePoints} puntos
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-white border border-emerald-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Porcentaje
                </span>
                <span className="text-xl font-black text-[#00324D]">{evaluation.percentage}%</span>
              </div>

              {officialGrade && (
                <div className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-center shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Dictamen Oficial
                  </span>
                  <span
                    className={`text-xl font-black ${
                      officialGrade === 'A'
                        ? 'text-[#2E8500]'
                        : officialGrade === 'N'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {officialGrade === 'A'
                      ? 'A (Aprobado)'
                      : officialGrade === 'N'
                      ? 'N (No Aprobado)'
                      : 'C (Por Corregir)'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Metadatos del evaluador y fecha */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 px-1">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>
                Evaluado por:{' '}
                <strong className="text-slate-700">
                  {evaluation.evaluatorName || 'Instructor SENA'}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>
                Fecha:{' '}
                <strong className="text-slate-700">
                  {evaluation.createdAt ? new Date(evaluation.createdAt).toLocaleDateString('es-CO') : 'Reciente'}
                </strong>
              </span>
            </div>
          </div>

          {/* Desglose por Criterios */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-200">
              Desglose de Criterios y Niveles Obtenidos
            </h3>

            <div className="space-y-3">
              {evaluation.criteriaResults?.map((cr, idx) => (
                <div
                  key={cr.criterionId || idx}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#00324D] text-white flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 uppercase">
                        {cr.criterionTitle} ({cr.weight}%)
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {cr.levelName}
                      </span>
                      <span className="text-xs font-black text-[#2E8500]">
                        {cr.points} / {cr.maxPoints} pts
                      </span>
                    </div>
                  </div>

                  {cr.comment && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed italic">
                      "{cr.comment}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Retroalimentación general si existe */}
          {evaluation.generalFeedback && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Retroalimentación Pedagógica General
              </h3>
              <p className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {evaluation.generalFeedback}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 italic">
            Evaluación formativa orientada al mejoramiento continuo del aprendiz.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#00324D] text-white rounded-xl text-xs font-semibold hover:bg-[#00253a] transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
