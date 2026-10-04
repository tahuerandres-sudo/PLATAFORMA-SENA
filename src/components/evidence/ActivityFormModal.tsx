/**
 * @license
 * SENA Learning Hub - Modal de Creación y Edición de Actividades Pedagógicas
 * PROMPT 8: Requisito 17 - Formulario en cascada con relación real:
 * Programa → Ficha → Curso → Competencia → RAP → Título → Descripción → Instrucciones → Tipo Evidencia → Fechas → Estado
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
  Course,
  Competency,
  LearningOutcome,
  Rubric,
} from '../../types/academic';
import {
  getTrainingPrograms,
  getFichasForInstructor,
  getCoursesForFicha,
  getCourses,
} from '../../services/firebase/academicService';
import { competencyService } from '../../services/academic/competencyService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { activityService } from '../../services/academic/activityService';
import { rubricService } from '../../services/academic/rubricService';
import { EVIDENCE_TYPE_CONFIGS, getEvidenceTypeConfig } from '../../config/fileLimits';
import { Modal } from '../ui/Modal';
import { RubricFormModal } from '../rubrics/RubricFormModal';
import { useAuth } from '../../hooks/useAuth';

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivitySaved: (activity: EvidenceActivity) => void;
  initialActivity?: EvidenceActivity | null;
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  onActivitySaved,
  initialActivity,
}) => {
  const { userProfile, currentUser } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';

  // Catálogos reales cargados desde Firestore
  const [allPrograms, setAllPrograms] = useState<TrainingProgram[]>([]);
  const [allFichas, setAllFichas] = useState<Ficha[]>([]);
  const [coursesForFicha, setCoursesForFicha] = useState<Course[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Estados del Formulario en Orden Estricto (Requisito 17)
  // 1. Programa
  const [programId, setProgramId] = useState<string>('');
  // 2. Ficha
  const [fichaId, setFichaId] = useState<string>('');
  // 3. Curso
  const [courseId, setCourseId] = useState<string>('');
  // 4. Competencia
  const [competencyId, setCompetencyId] = useState<string>('');
  // 5. Resultado de Aprendizaje
  const [learningOutcomeId, setLearningOutcomeId] = useState<string>('');
  // 6. Nombre de la actividad
  const [title, setTitle] = useState('');
  // 7. Descripción
  const [description, setDescription] = useState('');
  // 8. Instrucciones
  const [instructions, setInstructions] = useState('');
  // 9. Tipo de evidencia
  const [submissionType, setSubmissionType] = useState<EvidenceType>('pdf');
  const [maxFileSize, setMaxFileSize] = useState<number>(10);
  const [allowMultipleFiles, setAllowMultipleFiles] = useState(false);
  // 10. Fecha de apertura
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  // 11. Fecha de cierre
  const [dueDate, setDueDate] = useState('');
  // 12. Estado
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
  }, [fichaId]);

  // Carga inicial de datos de catálogo
  useEffect(() => {
    async function initCatalog() {
      setLoadingCatalog(true);
      try {
        const [progs, fList] = await Promise.all([
          getTrainingPrograms(),
          getFichasForInstructor(instructorUid),
        ]);

        setAllPrograms(progs);
        setAllFichas(fList);

        // Inicializar selección si no hay actividad en edición
        if (initialActivity) {
          setTitle(initialActivity.title || initialActivity.name || '');
          setDescription(initialActivity.description || '');
          setInstructions(initialActivity.instructions || '');
          setSubmissionType(initialActivity.submissionType || 'pdf');
          setStatus(initialActivity.status || 'published');
          setProgramId(initialActivity.programId || progs[0]?.id || '');
          setFichaId(initialActivity.fichaId || fList[0]?.id || '');
          setCourseId(initialActivity.courseId || '');
          setCompetencyId(initialActivity.competencyId || '');
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
          const initialProg = progs[0]?.id || '';
          setProgramId(initialProg);

          // Fichas correspondientes al programa inicial
          const matchingFichas = fList.filter((f) => f.programId === initialProg);
          const initialFicha = matchingFichas[0]?.id || fList[0]?.id || '';
          setFichaId(initialFicha);

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
  }, [isOpen, initialActivity, instructorUid]);

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

  // Filtro en Cascada 2: Cursos disponibles según la Ficha seleccionada
  useEffect(() => {
    async function loadCourses() {
      if (!fichaId) return;
      try {
        const cList = await getCoursesForFicha(fichaId);
        setCoursesForFicha(cList);
        if (cList.length > 0 && (!courseId || !cList.some((c) => c.id === courseId))) {
          setCourseId(cList[0].id);
        }
      } catch (err) {
        console.warn('[ActivityFormModal] Error obteniendo cursos de ficha:', err);
      }
    }
    loadCourses();
  }, [fichaId]);

  // Filtro en Cascada 3: Competencias disponibles según el Programa y Curso
  useEffect(() => {
    async function loadCompetencies() {
      try {
        const res = await competencyService.getCompetencies({
          programId,
          courseId,
          fichaId,
        });
        setCompetencies(res.data);
        if (res.data.length > 0 && (!competencyId || !res.data.some((c) => c.id === competencyId))) {
          setCompetencyId(res.data[0].id);
        }
      } catch (err) {
        console.warn('[ActivityFormModal] Error cargando competencias:', err);
      }
    }
    loadCompetencies();
  }, [programId, courseId, fichaId]);

  // Filtro en Cascada 4: Resultados de Aprendizaje (RAP) estrictamente asociados a la Competencia seleccionada (Requisito 17)
  useEffect(() => {
    async function loadOutcomes() {
      if (!competencyId) {
        setLearningOutcomes([]);
        return;
      }
      try {
        const res = await learningOutcomeService.getLearningOutcomes({
          competencyId,
          programId,
        });
        setLearningOutcomes(res.data);
        if (res.data.length > 0 && (!learningOutcomeId || !res.data.some((o) => o.id === learningOutcomeId))) {
          setLearningOutcomeId(res.data[0].id);
        }
      } catch (err) {
        console.warn('[ActivityFormModal] Error cargando RAPs:', err);
      }
    }
    loadOutcomes();
  }, [competencyId, programId]);

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

    if (!courseId) {
      setErrorMessage('Debes asociar la actividad a un Curso formativo.');
      return;
    }

    if (!competencyId) {
      setErrorMessage('Debes asociar la actividad a una Competencia del programa.');
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

    // Actividad que respeta toda la relación: Programa -> Ficha -> Curso -> Competencia -> RAP (Sección 12 y 13)
    const newActivity: EvidenceActivity = {
      id: activityId,
      title: title.trim(),
      name: title.trim(),
      description: description.trim(),
      instructions: instructions.trim(),
      programId,
      fichaId,
      courseId,
      competencyId,
      learningOutcomeId,
      learningOutcomeIds: learningOutcomeId ? [learningOutcomeId] : [], // Soporte multi-RAP (Sección 13)
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
      subtitle="Estructura Académica Oficial SENA (Programa → Ficha → Curso → Competencia → RAP)"
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

          {/* Banner de Jerarquía Curricular */}
          <div className="p-3 bg-[#EBF8E7] border border-[#39A900]/30 rounded-xl space-y-1 text-slate-700">
            <span className="font-bold text-[#2E8500] flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5" />
              Trazabilidad Curricular SENA (Requisito 17)
            </span>
            <p className="text-[11px] text-slate-600">
              Cada actividad evalúa un Resultado de Aprendizaje (RAP) específico correspondiente a una Competencia laboral dentro de una Ficha activa.
            </p>
          </div>

          {/* SECCIÓN 1: VINCULACIÓN CURRICULAR EN CASCADA (Pasos 1 al 5) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-[#00324D] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>1. Vinculación Curricular en Cascada</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Programa de Formación */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  1. Programa de Formación *
                </label>
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
              </div>

              {/* 2. Ficha de Formación (Filtrada por programa) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  2. Ficha de Formación *
                </label>
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
              </div>

              {/* 3. Curso / Ambiente */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  3. Curso / Asignatura *
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
                >
                  {coursesForFicha.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Competencia */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  4. Competencia Laboral *
                </label>
                <select
                  value={competencyId}
                  onChange={(e) => setCompetencyId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
                >
                  {competencies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.code} - {comp.name.slice(0, 38)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Resultado de Aprendizaje (RAP) - Filtrado estricto */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>5. Resultado de Aprendizaje (RAP) Asociado *</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {learningOutcomes.length} RAPs disponibles para esta competencia
                </span>
              </label>
              {learningOutcomes.length === 0 ? (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                  No hay RAPs registrados directamente para esta competencia. Se conservará la asociación actual.
                </div>
              ) : (
                <select
                  value={learningOutcomeId}
                  onChange={(e) => setLearningOutcomeId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
                >
                  {learningOutcomes.map((rap) => (
                    <option key={rap.id} value={rap.id}>
                      {rap.code} - Sec #{rap.sequence}: {rap.description.slice(0, 70)}...
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: DETALLES DE LA ACTIVIDAD (Pasos 6 al 8) */}
          <div className="space-y-3">
            {/* 6. Nombre de la actividad */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                6. Nombre / Título de la Actividad *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Family Tree & Oral Presentation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            {/* 7. Descripción */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                7. Descripción Pedagógica
              </label>
              <textarea
                rows={2}
                placeholder="Contextualización pedagógica de la tarea..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            {/* 8. Instrucciones */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                8. Instrucciones para el Aprendiz *
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

          {/* SECCIÓN 3: EVIDENCIA, FECHAS Y ESTADO (Pasos 9 al 12) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            {/* 9. Tipo de evidencia */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                9. Tipo de Evidencia *
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

            {/* 10. Fecha de apertura */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                10. Fecha de Apertura *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
              />
            </div>

            {/* 11. Fecha de cierre */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                11. Fecha de Cierre *
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

          {/* SECCIÓN: RÚBRICA PEDAGÓGICA DE EVALUACIÓN (PROMPT 19 - Requisito 18) */}
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

          {/* 12. Estado */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-slate-700">12. Estado de la Actividad:</label>
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
