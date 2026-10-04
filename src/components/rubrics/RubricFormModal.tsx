/**
 * @license
 * SENA Learning Hub - Modal de Creación y Edición de Rúbricas Pedagógicas
 * PROMPT 19: Requisitos 4, 5, 6
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Layers,
  Award,
  Save,
  X,
  HelpCircle,
  Percent,
} from 'lucide-react';
import {
  Rubric,
  RubricCriterion,
  RubricLevel,
  Ficha,
  EvidenceActivity,
} from '../../types/academic';
import { rubricService, validateRubricDefinition } from '../../services/academic/rubricService';
import { fichaService } from '../../services/academic/fichaService';
import { activityService } from '../../services/academic/activityService';
import { useAuth } from '../../hooks/useAuth';

interface RubricFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRubricSaved: (rubric: Rubric) => void;
  initialRubric?: Rubric | null;
  preselectedFichaId?: string;
  preselectedActivityId?: string;
}

// Plantilla por defecto de 4 niveles de desempeño oficial (Requisito 6)
const DEFAULT_LEVELS: Array<{ name: string; description: string; pointsRatio: number; percentageRange: string }> = [
  { name: 'EXCELLENT', description: 'Demuestra dominio sobresaliente y exhaustivo del criterio evaluado.', pointsRatio: 1.0, percentageRange: '90–100%' },
  { name: 'GOOD', description: 'Cumple satisfactoriamente con los requerimientos esenciales del criterio.', pointsRatio: 0.8, percentageRange: '80–89%' },
  { name: 'BASIC', description: 'Alcanza los estándares mínimos esperados con oportunidades puntuales de mejora.', pointsRatio: 0.6, percentageRange: '70–79%' },
  { name: 'NEEDS_IMPROVEMENT', description: 'No alcanza los estándares mínimos esperados; requiere refuerzo pedagógico.', pointsRatio: 0.4, percentageRange: '0–69%' },
];

export const RubricFormModal: React.FC<RubricFormModalProps> = ({
  isOpen,
  onClose,
  onRubricSaved,
  initialRubric,
  preselectedFichaId,
  preselectedActivityId,
}) => {
  const { userProfile, currentUser } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';
  const instructorName = userProfile?.displayName || currentUser?.displayName || 'Instructor SENA';

  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [loadingFichas, setLoadingFichas] = useState(true);

  // Estados del formulario
  const [fichaId, setFichaId] = useState<string>(preselectedFichaId || '');
  const [activityId, setActivityId] = useState<string>(preselectedActivityId || '');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar fichas del instructor
  useEffect(() => {
    async function loadFichas() {
      if (!instructorUid) return;
      setLoadingFichas(true);
      try {
        const res = await fichaService.getFichas(instructorUid);
        setFichas(res.data || []);
      } catch (err) {
        console.warn('[RubricFormModal] Error cargando fichas:', err);
      } finally {
        setLoadingFichas(false);
      }
    }
    loadFichas();
  }, [instructorUid]);

  // Cargar actividades de la ficha seleccionada
  useEffect(() => {
    async function loadActivities() {
      if (!fichaId) {
        setActivities([]);
        return;
      }
      try {
        const res = await activityService.getActivities({ fichaId });
        setActivities(res.data || []);
      } catch (err) {
        console.warn('[RubricFormModal] Error cargando actividades:', err);
      }
    }
    loadActivities();
  }, [fichaId]);

  // Inicializar formulario
  useEffect(() => {
    if (initialRubric) {
      setFichaId(initialRubric.fichaId || '');
      setActivityId(initialRubric.activityId || '');
      setTitle(initialRubric.title || '');
      setDescription(initialRubric.description || '');
      setIsPublished(Boolean(initialRubric.isPublished));
      setCriteria(initialRubric.criteria || []);
    } else {
      setFichaId(preselectedFichaId || '');
      setActivityId(preselectedActivityId || '');
      setTitle('');
      setDescription('');
      setIsPublished(false);

      // Criterios por defecto (ejemplo Oral Presentation con 4 criterios al 25% cada uno)
      const defaultCriteriaNames = ['Pronunciation', 'Vocabulary', 'Grammar', 'Fluency'];
      const initialCriteria: RubricCriterion[] = defaultCriteriaNames.map((name, idx) => {
        const critWeight = 25;
        const levels: RubricLevel[] = DEFAULT_LEVELS.map((lvl, lIdx) => ({
          id: `lvl_${Date.now()}_${idx}_${lIdx}`,
          name: lvl.name,
          description: lvl.description,
          points: Math.round(critWeight * lvl.pointsRatio),
          percentageRange: lvl.percentageRange,
          order: lIdx + 1,
        }));

        return {
          id: `crit_${Date.now()}_${idx}`,
          rubricId: '',
          title: name,
          description: `Evaluación de ${name.toLowerCase()} del aprendiz según los estándares formativos.`,
          weight: critWeight,
          order: idx + 1,
          levels,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      setCriteria(initialCriteria);
    }
    setErrorMessage(null);
  }, [initialRubric, preselectedFichaId, preselectedActivityId, isOpen]);

  // Cálculo automático del porcentaje total
  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = totalWeight === 100;

  // Agregar nuevo criterio
  const handleAddCriterion = () => {
    const nextOrder = criteria.length + 1;
    const remainingWeight = Math.max(0, 100 - totalWeight);
    const weight = remainingWeight > 0 ? remainingWeight : 20;

    const levels: RubricLevel[] = DEFAULT_LEVELS.map((lvl, lIdx) => ({
      id: `lvl_${Date.now()}_${nextOrder}_${lIdx}`,
      name: lvl.name,
      description: lvl.description,
      points: Math.round(weight * lvl.pointsRatio),
      percentageRange: lvl.percentageRange,
      order: lIdx + 1,
    }));

    const newCriterion: RubricCriterion = {
      id: `crit_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      rubricId: initialRubric?.id || '',
      title: `Criterio ${nextOrder}`,
      description: '',
      weight,
      order: nextOrder,
      levels,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCriteria([...criteria, newCriterion]);
  };

  // Modificar criterio
  const handleUpdateCriterion = (index: number, updates: Partial<RubricCriterion>) => {
    const updated = [...criteria];
    const current = updated[index];
    let newWeight = current.weight;

    if (updates.weight !== undefined) {
      const parsed = Number(updates.weight);
      newWeight = Number.isFinite(parsed) && !Number.isNaN(parsed) ? Math.max(0, parsed) : 0;
    }

    // Si cambia el peso, recalcular proporcionalmente los puntos de los niveles si no fueron personalizados
    let newLevels = current.levels;
    if (updates.weight !== undefined && newWeight !== current.weight) {
      newLevels = current.levels.map((lvl) => {
        const ratio = current.weight > 0 ? lvl.points / current.weight : 1;
        return {
          ...lvl,
          points: Math.round(newWeight * ratio),
        };
      });
    }

    updated[index] = {
      ...current,
      ...updates,
      weight: newWeight,
      levels: updates.levels || newLevels,
    };
    setCriteria(updated);
  };

  // Eliminar criterio
  const handleRemoveCriterion = (index: number) => {
    if (criteria.length <= 1) {
      setErrorMessage('La rúbrica debe contener al menos 1 criterio.');
      return;
    }
    const updated = criteria.filter((_, idx) => idx !== index);
    setCriteria(updated);
  };

  // Modificar nivel de desempeño
  const handleUpdateLevel = (
    criterionIndex: number,
    levelIndex: number,
    updates: Partial<RubricLevel>
  ) => {
    const updatedCriteria = [...criteria];
    const crit = updatedCriteria[criterionIndex];
    const updatedLevels = [...crit.levels];
    let safeUpdates = { ...updates };

    if (updates.points !== undefined) {
      const parsedPts = Number(updates.points);
      safeUpdates.points =
        Number.isFinite(parsedPts) && !Number.isNaN(parsedPts) ? Math.max(0, parsedPts) : 0;
    }

    updatedLevels[levelIndex] = {
      ...updatedLevels[levelIndex],
      ...safeUpdates,
    };
    updatedCriteria[criterionIndex] = {
      ...crit,
      levels: updatedLevels,
    };
    setCriteria(updatedCriteria);
  };

  // Guardar rúbrica
  const handleSave = async () => {
    setErrorMessage(null);

    // Validación estricta con la misma lógica de negocio (PROMPT 19.1 - Requisito 5)
    const validation = validateRubricDefinition({
      title: title.trim(),
      fichaId,
      criteria,
      isPublished,
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || 'La rúbrica no cumple con los criterios de validación requeridos.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedFicha = fichas.find((f) => f.id === fichaId);
      const selectedAct = activities.find((a) => a.id === activityId);

      const rubricPayload = {
        title: title.trim(),
        description: description.trim(),
        fichaId,
        fichaNumber: selectedFicha?.number || fichaId,
        activityId: activityId || null,
        activityTitle: selectedAct?.title || undefined,
        totalPoints: 100,
        isPublished,
        createdBy: instructorUid,
        creatorName: instructorName,
        criteria,
      };

      let saved: Rubric;
      if (initialRubric?.id) {
        saved = await rubricService.updateRubric(initialRubric.id, rubricPayload);
      } else {
        saved = await rubricService.createRubric(rubricPayload);
      }

      onRubricSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la rúbrica.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#00324D] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#39A900]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Sliders className="w-5 h-5 text-[#8CE665]" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Gestión Pedagógica SENA
              </span>
              <h2 className="text-lg font-bold text-white">
                {initialRubric ? 'Editar Rúbrica de Evaluación' : 'Crear Rúbrica de Evaluación'}
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

        {/* Formulario con scroll */}
        <div className="p-6 overflow-y-auto space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Información General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Título de la Rúbrica *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Rúbrica — Oral Presentation B1"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900] text-slate-800 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Ficha de Formación *</label>
              <select
                value={fichaId}
                onChange={(e) => {
                  setFichaId(e.target.value);
                  setActivityId('');
                }}
                disabled={loadingFichas}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900] text-slate-800 bg-white"
              >
                <option value="">Selecciona una ficha asignada...</option>
                {fichas.map((f) => (
                  <option key={f.id} value={f.id}>
                    Ficha #{f.number} - {f.programName || 'Formación Técnica'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Actividad Asociada (Opcional)</label>
              <select
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                disabled={!fichaId}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900] text-slate-800 bg-white"
              >
                <option value="">Sin asociar a una actividad aún...</option>
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl self-end">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Publicar Rúbrica</span>
                <span className="text-[11px] text-slate-500">
                  Visible para aprendices y disponible para calificar evidencias
                </span>
              </div>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-[#39A900] focus:ring-[#39A900] rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Descripción u Orientaciones Pedagógicas</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instrucciones para la evaluación y aspectos pedagógicos a considerar..."
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900] text-slate-800 bg-white"
            />
          </div>

          {/* Barra de Validación de Porcentajes (Requisito 5) */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
              isWeightValid
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {isWeightValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-semibold">
                Suma de pesos de los criterios:{' '}
                <strong className="text-sm font-black">{totalWeight}%</strong> / 100%
              </span>
            </div>
            <span className="text-[11px] font-medium">
              {isWeightValid
                ? '✓ Distribución del 100% completa'
                : `Diferencia: ${100 - totalWeight > 0 ? `Faltan ${100 - totalWeight}%` : `Excede por ${totalWeight - 100}%`}`}
            </span>
          </div>

          {/* Lista de Criterios */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#39A900]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Criterios y Niveles de Desempeño ({criteria.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddCriterion}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00324D] text-white rounded-lg text-xs font-semibold hover:bg-[#00253a] transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Criterio</span>
              </button>
            </div>

            {criteria.map((crit, cIdx) => (
              <div
                key={crit.id || cIdx}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                {/* Cabecera del Criterio */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-full bg-[#00324D] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {cIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={crit.title}
                      onChange={(e) => handleUpdateCriterion(cIdx, { title: e.target.value })}
                      placeholder="Nombre del criterio (Ej: Pronunciation)"
                      className="px-3 py-1 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#39A900] text-slate-800 bg-white flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                      <span className="text-[11px] font-bold text-slate-500">Peso:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={crit.weight}
                        onChange={(e) =>
                          handleUpdateCriterion(cIdx, { weight: Number(e.target.value) })
                        }
                        className="w-12 text-xs font-bold text-right focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(cIdx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar criterio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Descripción del criterio */}
                <div>
                  <textarea
                    rows={1}
                    value={crit.description}
                    onChange={(e) => handleUpdateCriterion(cIdx, { description: e.target.value })}
                    placeholder="Descripción del criterio (orientación al aprendiz y evaluador)..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#39A900] text-slate-700 bg-white"
                  />
                </div>

                {/* Niveles de Desempeño */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Niveles de Desempeño ({crit.levels.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {crit.levels.map((lvl, lIdx) => (
                      <div
                        key={lvl.id || lIdx}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <input
                            type="text"
                            value={lvl.name}
                            onChange={(e) =>
                              handleUpdateLevel(cIdx, lIdx, { name: e.target.value })
                            }
                            className="text-xs font-bold text-slate-800 uppercase focus:outline-none w-full"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={lvl.points}
                              onChange={(e) =>
                                handleUpdateLevel(cIdx, lIdx, { points: Number(e.target.value) })
                              }
                              className="w-10 text-xs font-bold text-right border-b border-slate-300 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500">pts</span>
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={lvl.description}
                          onChange={(e) =>
                            handleUpdateLevel(cIdx, lIdx, { description: e.target.value })
                          }
                          placeholder="Descripción del nivel..."
                          className="w-full p-1.5 text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#39A900]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#39A900] hover:bg-[#2d8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Rúbrica'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
