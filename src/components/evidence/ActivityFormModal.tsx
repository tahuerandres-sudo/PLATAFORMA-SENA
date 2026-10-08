/**
 * @license
 * SENA Learning Hub - Modal de Creación y Edición de Actividades Pedagógicas
 * PROMPT 31: Estructura simplificada Programa → Ficha → RAP → Actividad
 * Se eliminan Curso/Ambiente y Competencia Laboral del formulario obligatorio.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Target,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  ListOrdered,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderArchive,
  Sliders,
} from 'lucide-react';
import {
  EvidenceActivity,
  EvidenceType,
  ActivityStatus,
  TrainingProgram,
  Ficha,
  LearningOutcome,
  Rubric,
} from '../../types/academic';
import {
  getTrainingPrograms,
  getFichasForInstructor,
} from '../../services/firebase/academicService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { activityService } from '../../services/academic/activityService';
import { rubricService } from '../../services/academic/rubricService';
import { fichaService } from '../../services/academic/fichaService';
import { EVIDENCE_TYPE_CONFIGS, getEvidenceTypeConfig } from '../../config/fileLimits';
import { Modal } from '../ui/Modal';
import { RubricFormModal } from '../rubrics/RubricFormModal';
import { useAuth } from '../../hooks/useAuth';

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivitySaved: (activity: EvidenceActivity) => void;
  initialActivity?: EvidenceActivity | null;
  defaultFichaId?: string;
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  onActivitySaved,
  initialActivity,
  defaultFichaId,
}) => {
  const { userProfile, currentUser } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';

  // Catálogos reales cargados desde Firestore
  const [allPrograms, setAllPrograms] = useState<TrainingProgram[]>([]);
  const [allFichas, setAllFichas] = useState<Ficha[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Estados del Formulario (PROMPT 31: Programa → Ficha → RAP → Actividad)
  // 1. Programa
  const [programId, setProgramId] = useState<string>('');
  // 2. Ficha
  const [fichaId, setFichaId] = useState<string>('');
  // Preservar courseId y competencyId si vienen de actividad existente en edición
  const [existingCourseId, setExistingCourseId] = useState<string | undefined>(undefined);
  const [existingCompetencyId, setExistingCompetencyId] = useState<string | undefined>(undefined);
  // 3. Resultado de Aprendizaje (RAP)
  const [learningOutcomeId, setLearningOutcomeId] = useState<string>('');
  // 4. Nombre / Título de la actividad
  const [title, setTitle] = useState('');
  // 5. Descripción pedagógica
  const [description, setDescription] = useState('');
  // 6. Instrucciones
  const [instructions, setInstructions] = useState('');
  // 7. Tipo de evidencia
  const [submissionType, setSubmissionType] = useState<EvidenceType>('pdf');
  const [maxFileSize, setMaxFileSize] = useState<number>(10);
  const [allowMultipleFiles, setAllowMultipleFiles] = useState(false);
  // 8. Fecha de apertura
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  // 9. Fecha de cierre
  const [dueDate, setDueDate] = useState('');
  // 10. Estado
  const [status, setStatus] = useState<ActivityStatus>('published');

  // Integración con Rúbricas Pedagógicas (Prompt 19 - Requisito 18)
  const [useRubric, setUseRubric] = useState<boolean>(Boolean(initialActivity?.rubricId));
  const [selectedRubricId, setSelectedRubricId] = useState<string>(initialActivity?.rubricId || '');
  const [availableRubrics, setAvailableRubrics] = useState<Rubric[]>([]);
  const [createRubricModalOpen, setCreateRubricModalOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar rúbricas disponibles para la ficha seleccionada
  useEffect(() => {
    if (!isOpen) return;
    async function loadFichaRubrics() {
      if (!fichaId) {
        setAvailableRubrics([]);
        return;
      }
      try {
        const list = await rubricService.getRubricsByFicha(fichaId);
        setAvailableRubrics(list);
      } catch (err) {
        console.warn('[ActivityFormModal] Error cargando rúbricas de la ficha:', err);
      }
    }
    loadFichaRubrics();
  }, [isOpen, fichaId]);

  // Carga inicial de datos de catálogo
  useEffect(() => {
    async function initCatalog() {
      setLoadingCatalog(true);
      try {
        const [progs, fetchedFichas] = await Promise.all([
          getTrainingPrograms(),
          getFichasForInstructor(instructorUid),
        ]);
        let fList = [...fetchedFichas];

        setAllPrograms(progs);
        setAllFichas(fList);

        // Inicializar selección si hay actividad en edición
        if (initialActivity) {
          setTitle(initialActivity.title || initialActivity.name || '');
          setDescription(initialActivity.description || '');
          setInstructions(initialActivity.instructions || '');
          setSubmissionType(initialActivity.submissionType || 'pdf');
          setStatus(initialActivity.status || 'published');
          setProgramId(initialActivity.programId || progs[0]?.id || '');
          setFichaId(initialActivity.fichaId || fList[0]?.id || '');
          setExistingCourseId(initialActivity.courseId);
          setExistingCompetencyId(initialActivity.competencyId);
          setLearningOutcomeId(initialActivity.learningOutcomeId || '');
          setStartDate(
            initialActivity.startDate
              ? initialActivity.startDate.split('T')[0]
              : initialActivity.publishedAt
              ? initialActivity.publishedAt.split('T')[0]
              : new Date().toISOString().split('T')[0]
          );
          setDueDate(
            initialActivity.dueDate
              ? initialActivity.dueDate.split('T')[0]
              : initialActivity.endDate
              ? initialActivity.endDate.split('T')[0]
              : ''
          );
        } else {
          // Valores iniciales
          let initialProg = progs[0]?.id || '';
          let initialFicha = fList[0]?.id || '';

          if (defaultFichaId) {
            let matchedFicha = fList.find((f) => f.id === defaultFichaId || f.number === defaultFichaId);
            if (!matchedFicha) {
              try {
                const directF = await fichaService.getFichaById(defaultFichaId);
                if (directF) {
                  matchedFicha = directF;
                  fList = [directF, ...fList];
                  setAllFichas(fList);
                }
              } catch (eF) {
                console.warn('[ActivityFormModal] Error buscando ficha directa:', eF);
              }
            }

            if (matchedFicha) {
              initialFicha = matchedFicha.id;
              if (matchedFicha.programId) initialProg = matchedFicha.programId;
            } else {
              initialFicha = defaultFichaId;
            }
          } else {
            const matchingFichas = fList.filter((f) => f.programId === initialProg);
            initialFicha = matchingFichas[0]?.id || fList[0]?.id || '';
          }

          setProgramId(initialProg);
          setFichaId(initialFicha);
          setExistingCourseId(undefined);
          setExistingCompetencyId(undefined);

          // Fecha límite sugerida: 2 semanas a partir de hoy
          const d = new Date();
          d.setDate(d.getDate() + 14);
          setDueDate(d.toISOString().split('T')[0]);
        }
      } catch (err) {
        console.warn('[ActivityFormModal] Error cargando catálogos:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }

    if (isOpen) {
      initCatalog();
    }
  }, [isOpen, initialActivity, instructorUid, defaultFichaId]);

  // Filtro en Cascada 1: Fichas disponibles según el Programa seleccionado
  const availableFichas = useMemo(() => {
    if (!programId) return allFichas;
    const filtered = allFichas.filter((f) => f.programId === programId);
    return filtered.length > 0 ? filtered : allFichas;
  }, [allFichas, programId]);

  // Cuando cambia el programa, asegurar que la ficha seleccionada corresponda
  const handleProgramChange = (newProgId: string) => {
    setProgramId(newProgId);
    const matching = allFichas.filter((f) => f.programId === newProgId);
    if (matching.length > 0) {
      setFichaId(matching[0].id);
    }
  };

  // PROMPT 31: Resultados de Aprendizaje (RAP) disponibles vinculados directamente a la Ficha / Programa
  useEffect(() => {
    if (!isOpen) return;
    async function loadOutcomes() {
      try {
        const curFicha = allFichas.find((f) => f.id === fichaId || f.number === fichaId);
        const effectiveProgId = programId || curFicha?.programId;
        const res = await learningOutcomeService.getLearningOutcomes(
          effectiveProgId ? { programId: effectiveProgId } : undefined
        );
        let list = res.data || [];
        setLearningOutcomes(list);
        if (list.length > 0 && (!learningOutcomeId || !list.some((o) => o.id === learningOutcomeId))) {
          setLearningOutcomeId(list[0].id);
        }
      } catch (err) {
        console.warn('[ActivityFormModal] Error cargando RAPs:', err);
      }
    }
    loadOutcomes();
  }, [isOpen, fichaId, programId, allFichas]);

  // Al cambiar tipo de evidencia, ajustar tamaño sugerido
  const handleTypeChange = (newType: EvidenceType) => {
    setSubmissionType(newType);
    const cfg = getEvidenceTypeConfig(newType);
    setMaxFileSize(cfg.defaultMaxFileSizeMb);
  };

  const currentTypeConfig = getEvidenceTypeConfig(submissionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Por favor ingresa el título de la actividad formativa.');
      return;
    }

    if (!instructions.trim() && !description.trim()) {
      setErrorMessage('Por favor define las instrucciones pedagógicas para los aprendices.');
      return;
    }

    if (!fichaId) {
      setErrorMessage('Debes seleccionar una Ficha de formación para asignar la actividad.');
      return;
    }

    if (!learningOutcomeId) {
      setErrorMessage('Debes vincular la actividad a un Resultado de Aprendizaje (RAP).');
      return;
    }

    if (!submissionType) {
      setErrorMessage('Debes seleccionar el tipo de evidencia requerida.');
      return;
    }

    if (!dueDate) {
      setErrorMessage('Por favor define la fecha límite de entrega de la actividad.');
      return;
    }

    if (useRubric && !selectedRubricId) {
      setErrorMessage('Has activado la evaluación por rúbrica. Por favor selecciona una rúbrica pedagógica de la lista o desmarca la casilla.');
      return;
    }

    if (!instructorUid) {
      setErrorMessage('No se identificó un instructor autenticado para registrar la autoría.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const now = new Date().toISOString();
    const activityId = initialActivity?.id || `act_${Date.now()}`;

    // Actividad vinculada directamente: Programa → Ficha → RAP → Actividad (PROMPT 31)
    const newActivity: EvidenceActivity = {
      id: activityId,
      title: title.trim(),
      name: title.trim(),
      description: description.trim(),
      instructions: instructions.trim(),
      programId: programId || undefined,
      fichaId,
      // Si existía un curso/competencia previo (actividad antigua editada), preservarlo; si es nueva queda undefined
      courseId: existingCourseId || undefined,
      competencyId: existingCompetencyId || undefined,
      learningOutcomeId,
      learningOutcomeIds: learningOutcomeId ? [learningOutcomeId] : [], // Soporte multi-RAP
      createdBy: instructorUid,
      instructorId: instructorUid,
      instructorEmail: userProfile?.email || 'instructor@sena.edu.co',
      status,
      publishedAt: startDate ? `${startDate}T00:00:00Z` : now,
      startDate: startDate ? `${startDate}T00:00:00Z` : now,
      dueDate: `${dueDate}T23:59:59Z`,
      endDate: `${dueDate}T23:59:59Z`,
      points: 100,
      rubricId: useRubric && selectedRubricId ? selectedRubricId : null,
      rubricTitle: useRubric
        ? availableRubrics.find((r) => r.id === selectedRubricId)?.title
        : undefined,
      submissionType,
      allowedExtensions: currentTypeConfig.allowedExtensions,
      allowedMimeTypes: currentTypeConfig.allowedMimeTypes,
      maxFileSize: currentTypeConfig.isFile ? Number(maxFileSize) : undefined,
      maxFiles: allowMultipleFiles ? 5 : 1,
      allowMultipleFiles,
      requiresUrl: currentTypeConfig.isUrl,
      requiresFile: currentTypeConfig.isFile,
      createdAt: initialActivity?.createdAt || now,
      updatedAt: now,
    };

    try {
      await activityService.saveActivity(newActivity);
      onActivitySaved(newActivity);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al persistir la actividad en Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialActivity ? 'Editar Actividad de Aprendizaje' : 'Crear Nueva Actividad de Aprendizaje'}
      subtitle="Estructura Académica Directa SENA (Programa → Ficha → RAP → Actividad)"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="activity-form-modal"
            disabled={isSaving || loadingCatalog}
            className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Guardando en Firestore...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {initialActivity ? 'Actualizar Actividad' : 'Publicar Actividad'}
              </>
            )}
          </button>
        </>
      }
    >
      {loadingCatalog ? (
        <div className="py-12 text-center text-xs text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-[#39A900] mx-auto mb-2" />
          Cargando estructura curricular desde Firestore...
        </div>
      ) : (
        <form id="activity-form-modal" onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Banner de Jerarquía Curricular Directa */}
          <div className="p-3 bg-[#EBF8E7] border border-[#39A900]/30 rounded-xl space-y-1 text-slate-700">
            <span className="font-bold text-[#2E8500] flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5" />
              Trazabilidad Curricular Directa SENA (PROMPT 31)
            </span>
            <p className="text-[11px] text-slate-600">
              Programa → Ficha → Resultado de Aprendizaje (RAP) → Actividad de Aprendizaje.
            </p>
          </div>

          {/* SECCIÓN 1: VINCULACIÓN ACADÉMICA (Programa → Ficha → RAP) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-[#00324D] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>1. Vinculación Académica Directa</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Programa de Formación */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  1. Programa de Formación *
                </label>
                {defaultFichaId ? (
                  <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-800 font-semibold text-xs truncate">
                    {allPrograms.find((p) => p.id === programId)?.name || 'Programa de la Ficha'}
                  </div>
                ) : (
                  <select
                    value={programId}
                    onChange={(e) => handleProgramChange(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
                  >
                    {allPrograms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.level})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. Ficha de Formación */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  2. Ficha de Formación *
                </label>
                {defaultFichaId ? (
                  <div className="w-full px-3 py-1.5 border border-[#39A900]/40 rounded-lg bg-[#EBF8E7]/60 text-slate-900 font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <span className="bg-[#00324D] text-[#8CE665] font-mono text-[11px] px-2 py-0.5 rounded font-bold shrink-0">
                        FICHA #{allFichas.find((f) => f.id === fichaId || f.number === fichaId)?.number || defaultFichaId}
                      </span>
                      <span className="text-xs font-bold text-[#00324D] truncate">
                        {allFichas.find((f) => f.id === fichaId || f.number === fichaId)?.name ||
                         allFichas.find((f) => f.id === fichaId || f.number === fichaId)?.programName ||
                         'Ficha Asignada'}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#2E8500] font-bold bg-white px-2 py-0.5 rounded border border-[#39A900]/30 shrink-0">
                      Asignada fija
                    </span>
                  </div>
                ) : (
                  <select
                    value={fichaId}
                    onChange={(e) => setFichaId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
                  >
                    {availableFichas.map((f) => (
                      <option key={f.id} value={f.id}>
                        Ficha #{f.number} {f.name ? `· ${f.name}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 3. Resultado de Aprendizaje (RAP) Asociado */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>3. Resultado de Aprendizaje (RAP) Asociado *</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {learningOutcomes.length} RAPs disponibles para el programa / ficha
                </span>
              </label>
              {learningOutcomes.length === 0 ? (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                  No hay RAPs registrados directamente para esta ficha o programa. Se conservará la asociación actual.
                </div>
              ) : (
                <select
                  value={learningOutcomeId}
                  onChange={(e) => setLearningOutcomeId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
                >
                  {learningOutcomes.map((rap) => (
                    <option key={rap.id} value={rap.id}>
                      {rap.code} - Sec #{rap.sequence}: {rap.description.slice(0, 85)}...
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: DETALLES DE LA ACTIVIDAD */}
          <div className="space-y-3">
            {/* 4. Nombre de la actividad */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                4. Nombre / Título de la Actividad *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Presentación de Árbol Genealógico y Expresión Oral"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            {/* 5. Descripción Pedagógica */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                5. Descripción Pedagógica
              </label>
              <textarea
                rows={2}
                placeholder="Contextualización pedagógica de la tarea..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            {/* 6. Instrucciones */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                6. Instrucciones para el Aprendiz *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Indica paso a paso qué debe entregar el aprendiz y bajo qué criterios..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>
          </div>

          {/* SECCIÓN 3: EVIDENCIA, FECHAS Y ESTADO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            {/* 7. Tipo de evidencia */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                7. Tipo de Evidencia *
              </label>
              <select
                value={submissionType}
                onChange={(e) => handleTypeChange(e.target.value as EvidenceType)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
              >
                {Object.values(EVIDENCE_TYPE_CONFIGS).map((cfg) => (
                  <option key={cfg.type} value={cfg.type}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 8. Fecha de apertura */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                8. Fecha de Apertura *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
              />
            </div>

            {/* 9. Fecha de cierre */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                9. Fecha de Cierre *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
              />
            </div>
          </div>

          {/* SECCIÓN: RÚBRICA PEDAGÓGICA DE EVALUACIÓN (Prompt 19 - Requisito 18) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
                <input
                  type="checkbox"
                  checked={useRubric}
                  onChange={(e) => setUseRubric(e.target.checked)}
                  className="w-4 h-4 text-[#39A900] focus:ring-[#39A900] rounded cursor-pointer"
                />
                <span>Esta actividad utiliza una rúbrica de evaluación pedagógica</span>
              </label>

              {useRubric && (
                <button
                  type="button"
                  onClick={() => setCreateRubricModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00324D] text-white rounded-lg text-xs font-semibold hover:bg-[#00253a] transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear nueva rúbrica</span>
                </button>
              )}
            </div>

            {useRubric && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Seleccionar rúbrica existente para esta ficha:
                    </label>
                    <select
                      value={selectedRubricId}
                      onChange={(e) => setSelectedRubricId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-[#39A900]"
                    >
                      <option value="">-- Selecciona una rúbrica --</option>
                      {availableRubrics.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.isPublished ? 'PUBLICADA' : 'BORRADOR'} · {r.criteria?.length || 0} criterios)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Previsualización de la rúbrica seleccionada */}
                {selectedRubricId && (
                  (() => {
                    const sel = availableRubrics.find((r) => r.id === selectedRubricId);
                    if (!sel) return null;
                    return (
                      <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-[#39A900]" />
                            <span>Rúbrica: {sel.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {sel.criteria?.length || 0} criterios · Ponderación total: {sel.totalPoints || 100} pts
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sel.isPublished
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {sel.isPublished ? 'PUBLICADA' : 'BORRADOR'}
                        </span>
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>

          {/* 10. Estado */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-slate-700">10. Estado de la Actividad:</label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="activityStatus"
                    value="published"
                    checked={status === 'published'}
                    onChange={() => setStatus('published')}
                    className="text-[#39A900] focus:ring-[#39A900]"
                  />
                  <span className="font-bold text-[#2E8500]">Publicada (Activa)</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer ml-3">
                  <input
                    type="radio"
                    name="activityStatus"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="text-slate-600 focus:ring-slate-500"
                  />
                  <span className="text-slate-600">Borrador</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer ml-3">
                  <input
                    type="radio"
                    name="activityStatus"
                    value="closed"
                    checked={status === 'closed'}
                    onChange={() => setStatus('closed')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-rose-700">Cerrada</span>
                </label>
              </div>
            </div>
          </div>
        </form>
      )}
    </Modal>

    {/* Modal de Creación Rápida de Rúbrica */}
    {createRubricModalOpen && (
      <RubricFormModal
        isOpen={createRubricModalOpen}
        onClose={() => setCreateRubricModalOpen(false)}
        preselectedFichaId={fichaId}
        onRubricSaved={(newRub) => {
          setAvailableRubrics((prev) => [newRub, ...prev]);
          setSelectedRubricId(newRub.id);
          setUseRubric(true);
        }}
      />
    )}
  </>
  );
};
