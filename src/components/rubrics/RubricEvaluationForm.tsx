/**
 * @license
 * SENA Learning Hub - Formulario de Evaluación por Rúbrica Pedagógica
 * PROMPT 19: Requisitos 8, 9, 10
 */

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  Percent,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Rubric,
  RubricCriterion,
  RubricLevel,
  RubricCriterionResult,
} from '../../types/academic';

interface RubricEvaluationFormProps {
  rubric: Rubric;
  initialResults?: RubricCriterionResult[];
  onResultsChange: (results: {
    criteriaResults: RubricCriterionResult[];
    totalPoints: number;
    totalPossiblePoints: number;
    percentage: number;
  }) => void;
}

export const RubricEvaluationForm: React.FC<RubricEvaluationFormProps> = ({
  rubric,
  initialResults,
  onResultsChange,
}) => {
  // Inicializar estado de selección de criterios
  const [selectedLevels, setSelectedLevels] = useState<Record<string, { levelId: string; points: number }>>(() => {
    const map: Record<string, { levelId: string; points: number }> = {};
    if (initialResults && initialResults.length > 0) {
      initialResults.forEach((r) => {
        map[r.criterionId] = { levelId: r.levelId, points: r.points };
      });
    } else {
      // Pre-seleccionar el nivel más alto por defecto si no hay inicial
      rubric.criteria?.forEach((crit) => {
        if (crit.levels && crit.levels.length > 0) {
          const defaultLvl = crit.levels[0];
          map[crit.id] = { levelId: defaultLvl.id, points: defaultLvl.points };
        }
      });
    }
    return map;
  });

  const [comments, setComments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (initialResults) {
      initialResults.forEach((r) => {
        if (r.comment) map[r.criterionId] = r.comment;
      });
    }
    return map;
  });

  // Notificar al padre cuando cambie una selección
  const notifyChange = (
    newLevels: Record<string, { levelId: string; points: number }>,
    newComments: Record<string, string>
  ) => {
    const criteriaResults: RubricCriterionResult[] = (rubric.criteria || []).map((crit) => {
      const selected = newLevels[crit.id];
      const lvl = crit.levels?.find((l) => l.id === selected?.levelId) || crit.levels?.[0];
      const maxPts = Math.max(...(crit.levels?.map((l) => l.points) || [crit.weight]));

      return {
        criterionId: crit.id,
        criterionTitle: crit.title,
        weight: crit.weight,
        levelId: lvl?.id || '',
        levelName: lvl?.name || 'EXCELLENT',
        points: selected?.points ?? (lvl?.points || 0),
        maxPoints: maxPts,
        comment: newComments[crit.id] || '',
      };
    });

    const totalPoints = criteriaResults.reduce((sum, cr) => sum + (Number(cr.points) || 0), 0);
    const totalPossiblePoints = criteriaResults.reduce(
      (sum, cr) => sum + (Number(cr.maxPoints) || 0),
      0
    ) || rubric.totalPoints || 100;

    const percentage =
      totalPossiblePoints > 0 ? Math.round((totalPoints / totalPossiblePoints) * 100) : 0;

    onResultsChange({
      criteriaResults,
      totalPoints,
      totalPossiblePoints,
      percentage,
    });
  };

  const handleSelectLevel = (critId: string, level: RubricLevel) => {
    const newLevels = {
      ...selectedLevels,
      [critId]: { levelId: level.id, points: level.points },
    };
    setSelectedLevels(newLevels);
    notifyChange(newLevels, comments);
  };

  const handleCommentChange = (critId: string, commentText: string) => {
    const newComments = {
      ...comments,
      [critId]: commentText,
    };
    setComments(newComments);
    notifyChange(selectedLevels, newComments);
  };

  // Cálculos reactivos de visualización
  const totalPoints = Object.values(selectedLevels).reduce((sum, item) => sum + item.points, 0);
  const totalPossiblePoints = rubric.criteria?.reduce(
    (sum, c) => sum + Math.max(...(c.levels?.map((l) => l.points) || [c.weight])),
    0
  ) || 100;
  const percentage =
    totalPossiblePoints > 0 ? Math.round((totalPoints / totalPossiblePoints) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Banner de Total de Rúbrica */}
      <div className="p-4 bg-linear-to-r from-emerald-50 via-teal-50 to-sky-50 rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#39A900] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#00324D] uppercase tracking-wider">
              {rubric.title}
            </h4>
            <p className="text-[11px] text-slate-600">
              Selecciona el nivel de desempeño para cada criterio formativo
            </p>
          </div>
        </div>

        {/* Marcador de Puntos en Vivo (Requisito 8) */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Puntaje Rúbrica
            </span>
            <div className="flex items-baseline gap-1 text-slate-800">
              <span className="text-2xl font-black text-[#2E8500]">{totalPoints}</span>
              <span className="text-xs font-bold text-slate-500">/ {totalPossiblePoints} pts</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-center shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 block">Porcentaje</span>
            <span className="text-lg font-black text-[#00324D]">{percentage}%</span>
          </div>
        </div>
      </div>

      {/* Recordatorio Institucional Oficial (Requisito 9) */}
      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Regla Institucional SENA:</strong> La rúbrica fundamenta la retroalimentación cualitativa pero <strong>no convierte automáticamente</strong> el puntaje en A / N / C. El instructor debe seleccionar explícitamente el dictamen oficial institucional abajo.
        </p>
      </div>

      {/* Criterios de la Rúbrica */}
      <div className="space-y-4">
        {rubric.criteria?.map((crit, idx) => {
          const selected = selectedLevels[crit.id];

          return (
            <div
              key={crit.id || idx}
              className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
            >
              {/* Encabezado del Criterio */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#00324D] text-white flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase">
                    {crit.title} — {crit.weight}%
                  </h4>
                </div>
                <div className="text-xs font-black text-[#2E8500]">
                  {selected?.points ?? 0} pts
                </div>
              </div>

              {crit.description && (
                <p className="text-[11px] text-slate-500 leading-relaxed">{crit.description}</p>
              )}

              {/* Opciones de Niveles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {crit.levels?.map((lvl) => {
                  const isSelected = selected?.levelId === lvl.id;

                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleSelectLevel(crit.id, lvl)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#39A900] bg-emerald-50/70 text-[#2E8500] ring-2 ring-[#39A900]/30 shadow-xs'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold uppercase truncate">{lvl.name}</span>
                        <span className="text-xs font-black">{lvl.points} pts</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                        {lvl.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Comentario específico para este criterio */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Comentario específico sobre {crit.title} (Opcional):
                </label>
                <input
                  type="text"
                  value={comments[crit.id] || ''}
                  onChange={(e) => handleCommentChange(crit.id, e.target.value)}
                  placeholder={`Observaciones puntuales sobre ${crit.title.toLowerCase()}...`}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#39A900] text-slate-800 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
