/**
 * @license
 * SENA Learning Hub - Modal de Consulta de Rúbrica Pedagógica
 * PROMPT 19: Requisito 7 (Vista Aprendiz e Instructor)
 */

import React from 'react';
import {
  FileText,
  Sliders,
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Percent,
  Layers,
} from 'lucide-react';
import { Rubric } from '../../types/academic';

interface RubricDetailModalProps {
  rubric: Rubric | null;
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'instructor' | 'apprentice';
}

export const RubricDetailModal: React.FC<RubricDetailModalProps> = ({
  rubric,
  isOpen,
  onClose,
  userRole = 'apprentice',
}) => {
  if (!isOpen || !rubric) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Institucional */}
        <div className="bg-[#00324D] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#39A900]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Sliders className="w-5 h-5 text-[#8CE665]" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Rúbrica de Evaluación Pedagógica
              </span>
              <h2 className="text-lg font-bold text-white line-clamp-1">{rubric.title}</h2>
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
          {/* Metadatos y Estado */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold ${
                  rubric.isPublished
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    rubric.isPublished ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
                {rubric.isPublished ? 'PUBLICADA' : 'BORRADOR'}
              </span>

              {rubric.activityTitle && (
                <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-medium text-slate-700">
                  Actividad: {rubric.activityTitle}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 font-semibold text-slate-700">
              <span>Ponderación Total:</span>
              <span className="text-sm font-black text-[#2E8500] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                {rubric.totalPoints || 100} pts (100%)
              </span>
            </div>
          </div>

          {/* Descripción de la rúbrica */}
          {rubric.description && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Orientaciones de Evaluación
              </h3>
              <p className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {rubric.description}
              </p>
            </div>
          )}

          {/* Criterios y Niveles de Desempeño */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Layers className="w-4 h-4 text-[#39A900]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Criterios de Evaluación y Niveles ({rubric.criteria?.length || 0})
              </h3>
            </div>

            <div className="space-y-4">
              {rubric.criteria?.map((crit, idx) => (
                <div
                  key={crit.id || idx}
                  className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
                >
                  {/* Cabecera del criterio */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#00324D] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{crit.title}</h4>
                        {crit.description && (
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {crit.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      Peso: {crit.weight}%
                    </span>
                  </div>

                  {/* Niveles de desempeño del criterio */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                    {crit.levels?.map((lvl, lIdx) => (
                      <div
                        key={lvl.id || lIdx}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-800 uppercase tracking-tight line-clamp-1">
                            {lvl.name}
                          </span>
                          <span className="text-[#2E8500] font-black">{lvl.points} pts</span>
                        </div>
                        {lvl.percentageRange && (
                          <span className="inline-block text-[10px] text-slate-500 font-medium">
                            {lvl.percentageRange}
                          </span>
                        )}
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {lvl.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 italic">
            Esta rúbrica fundamenta la retroalimentación pedagógica. El dictamen oficial continúa siendo A / N / C.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#00324D] text-white rounded-xl text-xs font-semibold hover:bg-[#00253a] transition-colors cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
