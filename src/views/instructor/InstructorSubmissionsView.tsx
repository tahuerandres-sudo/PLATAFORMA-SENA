/**
 * @license
 * SENA Learning Hub - Vista Integral de Entregas de Evidencias y Calificaciones A/N/C (Instructor)
 * PROMPT 7: Sistema Real de Calificaciones A/N/C, Evaluación y Seguimiento del Aprendizaje
 * Colección Firestore: /submissions, /activities, /competencies, /learningOutcomes
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderArchive,
  Search,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  HardDrive,
  ExternalLink,
  Award,
  Calendar,
  X,
  MessageSquare,
  RefreshCw,
  FileText,
  Youtube,
  BookOpen,
  Filter,
  RotateCcw,
  Sparkles,
  CheckSquare,
  Square,
  AlertTriangle,
  History,
  Layers,
  GraduationCap,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Sliders,
  Info,
} from 'lucide-react';
import {
  AcademicSubmission,
  SubmissionAcademicStatus,
  AcademicGradeCode,
  EvidenceActivity,
  Ficha,
  TrainingProgram,
  Course,
  Competency,
  LearningOutcome,
  SubmissionHistoryItem,
  Rubric,
  RubricEvaluation,
  RubricCriterionResult,
} from '../../types/academic';
import { submissionService } from '../../services/submissions/submissionService';
import { activityService } from '../../services/academic/activityService';
import { rubricService } from '../../services/academic/rubricService';
import { RubricEvaluationForm } from '../../components/rubrics/RubricEvaluationForm';
import { RubricEvaluationViewModal } from '../../components/rubrics/RubricEvaluationViewModal';
import { RubricDetailModal } from '../../components/rubrics/RubricDetailModal';
import {
  getFichasForInstructor,
  getTrainingPrograms,
  getCourses,
} from '../../services/firebase/academicService';
import { competencyService } from '../../services/academic/competencyService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { getEvidenceTypeConfig } from '../../config/fileLimits';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { DriveConnectionStatus } from '../../components/evidence/DriveConnectionStatus';
import { useAuth } from '../../hooks/useAuth';

export const InstructorSubmissionsView: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';
  const instructorName = userProfile?.displayName || currentUser?.displayName || 'Instructor SENA';

  // Vista activa: 'submissions' (Lista de evidencias) vs 'competencies' (Seguimiento curricular)
  const [activeTab, setActiveTab] = useState<'submissions' | 'competencies'>('submissions');

  // Datos principales desde Firestore
  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de Evaluación (Requisito 8)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFicha, setSelectedFicha] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCompetency, setSelectedCompetency] = useState('all');
  const [selectedOutcome, setSelectedOutcome] = useState('all');
  const [selectedEvidenceType, setSelectedEvidenceType] = useState('all');

  // Modales
  const [selectedSubmission, setSelectedSubmission] = useState<AcademicSubmission | null>(null);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [viewEvidenceModalOpen, setViewEvidenceModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Selección Masiva (Requisito 7)
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchGradeTarget, setBatchGradeTarget] = useState<AcademicGradeCode>('A');
  const [batchFeedback, setBatchFeedback] = useState('');

  // Estado del modal de calificación individual
  const [selectedGradeCode, setSelectedGradeCode] = useState<AcademicGradeCode>('A');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Estados para Rúbricas Pedagógicas (Prompt 19)
  const [activeGradingTab, setActiveGradingTab] = useState<'official' | 'rubric'>('official');
  const [currentRubric, setCurrentRubric] = useState<Rubric | null>(null);
  const [loadingRubric, setLoadingRubric] = useState(false);
  const [rubricResults, setRubricResults] = useState<{
    criteriaResults: RubricCriterionResult[];
    totalPoints: number;
    totalPossiblePoints: number;
    percentage: number;
  } | null>(null);
  const [evaluationsMap, setEvaluationsMap] = useState<Record<string, RubricEvaluation>>({});
  const [rubricViewModalOpen, setRubricViewModalOpen] = useState(false);
  const [selectedRubricEvaluation, setSelectedRubricEvaluation] = useState<RubricEvaluation | null>(null);

  // Mensaje flotante de confirmación rápida
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cargar datos reales desde Firestore y servicios académicos
  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, actsRes, fichasRes, progsRes, coursesRes, compsRes, outRes] =
        await Promise.all([
          submissionService.getAllSubmissions(instructorUid),
          activityService.getActivities(),
          getFichasForInstructor(instructorUid),
          getTrainingPrograms(),
          getCourses(),
          competencyService.getCompetencies(),
          learningOutcomeService.getLearningOutcomes(),
        ]);

      const loadedSubs = subsRes.data || [];
      setSubmissions(loadedSubs);
      setActivities(actsRes.data || []);
      setFichas(fichasRes || []);
      setPrograms(progsRes || []);
      setCourses(coursesRes || []);
      setCompetencies(compsRes.data || []);
      setLearningOutcomes(outRes.data || []);

      // Cargar evaluaciones de rúbricas existentes
      const evals: Record<string, RubricEvaluation> = {};
      for (const s of loadedSubs) {
        try {
          const ev = await rubricService.getRubricEvaluation(s.id, s.version || 1);
          if (ev) evals[s.id] = ev;
        } catch (e) {
          // ignore
        }
      }
      setEvaluationsMap(evals);
    } catch (err) {
      console.warn('[InstructorSubmissionsView] Aviso cargando entregas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instructorUid]);

  // Cargar rúbrica y evaluación para la entrega seleccionada en el modal de calificación
  useEffect(() => {
    async function loadRubricForGrading() {
      if (!selectedSubmission || !gradingModalOpen) {
        setCurrentRubric(null);
        setRubricResults(null);
        setActiveGradingTab('official');
        return;
      }
      setLoadingRubric(true);
      try {
        const act = activities.find((a) => a.id === selectedSubmission.activityId);
        let rub: Rubric | null = null;
        if (act?.rubricId) {
          rub = await rubricService.getRubric(act.rubricId);
        }
        if (!rub) {
          rub = await rubricService.getRubricByActivity(selectedSubmission.activityId);
        }
        setCurrentRubric(rub);

        const existingEval = evaluationsMap[selectedSubmission.id] || (await rubricService.getRubricEvaluation(
          selectedSubmission.id,
          selectedSubmission.version || 1
        ));
        if (existingEval) {
          setRubricResults({
            criteriaResults: existingEval.criteriaResults,
            totalPoints: existingEval.totalPoints,
            totalPossiblePoints: existingEval.totalPossiblePoints,
            percentage: existingEval.percentage,
          });
        } else {
          setRubricResults(null);
        }
      } catch (err) {
        console.warn('[InstructorSubmissionsView] Error cargando rúbrica para entrega:', err);
      } finally {
        setLoadingRubric(false);
      }
    }
    loadRubricForGrading();
  }, [selectedSubmission, gradingModalOpen, activities]);

  // Mapas para correlación rápida de relaciones curriculares (Sección 9 y 10)
  const activityMap = useMemo(() => {
    const map = new Map<string, EvidenceActivity>();
    activities.forEach((act) => map.set(act.id, act));
    return map;
  }, [activities]);

  const competencyMap = useMemo(() => {
    const map = new Map<string, Competency>();
    competencies.forEach((c) => map.set(c.id, c));
    return map;
  }, [competencies]);

  const outcomeMap = useMemo(() => {
    const map = new Map<string, LearningOutcome>();
    learningOutcomes.forEach((o) => map.set(o.id, o));
    return map;
  }, [learningOutcomes]);

  const getActivityTitle = (actId: string): string => {
    return activityMap.get(actId)?.title || actId;
  };

  // Obtiene jerarquía pedagógica: Actividad -> RAP -> Competencia
  const getHierarchyForActivity = (actId: string) => {
    const act = activityMap.get(actId);
    if (!act) return { activity: null, outcome: null, competency: null };

    const outcome = act.learningOutcomeId ? outcomeMap.get(act.learningOutcomeId) : null;
    const competency = act.competencyId
      ? competencyMap.get(act.competencyId)
      : outcome?.competencyId
      ? competencyMap.get(outcome.competencyId)
      : null;

    return { activity: act, outcome, competency };
  };

  // ==========================================
  // ATAJOS DE TECLADO PARA EVALUACIÓN (Sección 6)
  // A = Aprobar | N = No aprobar | C = Corregir
  // Solo se activa dentro de la interfaz de evaluación y se desactiva en campos de texto
  // ==========================================
  useEffect(() => {
    if (!gradingModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (isInputActive) return;

      const key = e.key.toUpperCase();
      if (key === 'A') {
        e.preventDefault();
        setSelectedGradeCode('A');
      } else if (key === 'N') {
        e.preventDefault();
        setSelectedGradeCode('N');
      } else if (key === 'C') {
        e.preventDefault();
        setSelectedGradeCode('C');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gradingModalOpen]);

  // Filtrado compuesto con los criterios exigidos (Sección 8)
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // 1. Ficha
      if (selectedFicha !== 'all') {
        const subFicha = sub.fichaId.toLowerCase();
        const targetFicha = selectedFicha.toLowerCase();
        if (subFicha !== targetFicha && !subFicha.includes(targetFicha)) {
          return false;
        }
      }

      // 2. Programa
      if (selectedProgram !== 'all' && sub.programId !== selectedProgram) {
        return false;
      }

      // 3. Curso
      if (selectedCourse !== 'all' && sub.courseId !== selectedCourse) {
        return false;
      }

      // 4. Actividad
      if (selectedActivity !== 'all' && sub.activityId !== selectedActivity) {
        return false;
      }

      // 5. Estado
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'approved' && sub.status !== 'approved' && sub.grade !== 'A') return false;
        if (selectedStatus === 'not_approved' && sub.status !== 'not_approved' && sub.grade !== 'N') return false;
        if (selectedStatus === 'correction_required' && sub.status !== 'correction_required' && sub.grade !== 'C') return false;
        if (selectedStatus === 'pending') {
          const isPending =
            sub.status === 'pending' ||
            sub.status === 'submitted' ||
            sub.status === 'under_review' ||
            (!sub.grade && sub.status !== 'approved' && sub.status !== 'not_approved' && sub.status !== 'correction_required');
          if (!isPending) return false;
        }
      }

      // 6. Fecha
      if (selectedDate) {
        const subDate = sub.submittedAt ? sub.submittedAt.split('T')[0] : '';
        if (subDate !== selectedDate) {
          return false;
        }
      }

      // 7. Competencia (a través de la actividad vinculada)
      if (selectedCompetency !== 'all') {
        const act = activityMap.get(sub.activityId);
        if (act && act.competencyId !== selectedCompetency) {
          return false;
        }
      }

      // 8. Resultado de Aprendizaje (RAP)
      if (selectedOutcome !== 'all') {
        const act = activityMap.get(sub.activityId);
        const subOutcome = sub.learningOutcomeId || act?.learningOutcomeId;
        if (subOutcome !== selectedOutcome) {
          return false;
        }
      }

      // 9. Tipo de evidencia
      if (selectedEvidenceType !== 'all') {
        if (sub.submissionType !== selectedEvidenceType) {
          return false;
        }
      }

      // 10. Búsqueda por aprendiz o texto
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchLearner = (sub.learnerName || '').toLowerCase().includes(term);
        const matchEmail = (sub.learnerEmail || '').toLowerCase().includes(term);
        const matchFile = (sub.fileName || '').toLowerCase().includes(term);
        const matchAct = getActivityTitle(sub.activityId).toLowerCase().includes(term);
        if (!matchLearner && !matchEmail && !matchFile && !matchAct) {
          return false;
        }
      }

      return true;
    });
  }, [
    submissions,
    selectedFicha,
    selectedProgram,
    selectedCourse,
    selectedActivity,
    selectedStatus,
    selectedDate,
    selectedCompetency,
    selectedOutcome,
    selectedEvidenceType,
    searchTerm,
    activityMap,
  ]);

  // Indicadores reales (Sección 19)
  const stats = useMemo(() => {
    return submissionService.calculateStats(filteredSubmissions);
  }, [filteredSubmissions]);

  // Abrir modal de calificación con dictamen específico
  const handleOpenGrading = (sub: AcademicSubmission, defaultGrade: AcademicGradeCode = 'A') => {
    setSelectedSubmission(sub);
    setSelectedGradeCode((sub.grade as AcademicGradeCode) || defaultGrade);
    setFeedbackInput(sub.feedback || '');
    setGradingModalOpen(true);
  };

  // Evaluación rápida directa desde la tabla (Botones [A] [N] [C] inline - Sección 4)
  const handleQuickInlineGrade = async (sub: AcademicSubmission, gradeCode: AcademicGradeCode) => {
    // Si requiere corrección o no aprobación, abrir modal para escribir retroalimentación
    if (gradeCode === 'N' || gradeCode === 'C') {
      handleOpenGrading(sub, gradeCode);
      return;
    }

    // Para Aprobación rápida (A)
    try {
      const updated = await submissionService.gradeSubmission({
        submissionId: sub.id,
        gradeCode: 'A',
        feedback: sub.feedback || 'Evidencia aprobada satisfactoriamente.',
        instructorId: instructorUid,
        instructorName,
      });

      if (updated) {
        setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
        showToast(`Evidencia de ${sub.learnerName || 'Aprendiz'} APROBADA (A) exitosamente.`);
      }
    } catch (err) {
      console.error('[InstructorSubmissionsView] Error en evaluación rápida:', err);
    }
  };

  // Guardar calificación individual desde el modal
  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;
    setIsSavingGrade(true);

    try {
      let rubricEvalId: string | undefined;
      let rubricScore: number | undefined;
      let rubricMaxScore: number | undefined;
      let rubricPercentage: number | undefined;

      if (currentRubric && rubricResults && rubricResults.criteriaResults.length > 0) {
        try {
          const evalRes = await rubricService.evaluateSubmissionWithRubric({
            rubricId: currentRubric.id,
            activityId: selectedSubmission.activityId,
            submissionId: selectedSubmission.id,
            learnerId: selectedSubmission.learnerId || selectedSubmission.userId,
            learnerName: selectedSubmission.learnerName,
            fichaId: selectedSubmission.fichaId,
            evaluatorId: instructorUid,
            evaluatorName: instructorName,
            version: selectedSubmission.version || 1,
            criteriaResults: rubricResults.criteriaResults,
            generalFeedback: feedbackInput.trim(),
          });
          rubricEvalId = evalRes.id;
          rubricScore = evalRes.totalPoints;
          rubricMaxScore = evalRes.totalPossiblePoints;
          rubricPercentage = evalRes.percentage;
          setEvaluationsMap((prev) => ({ ...prev, [selectedSubmission.id]: evalRes }));
        } catch (rubErr) {
          console.warn('[InstructorSubmissionsView] Error guardando evaluación de rúbrica:', rubErr);
        }
      }

      const updated = await submissionService.gradeSubmission({
        submissionId: selectedSubmission.id,
        gradeCode: selectedGradeCode,
        feedback: feedbackInput.trim(),
        instructorId: instructorUid,
        instructorName,
        rubricEvaluationId: rubricEvalId,
        rubricScore,
        rubricMaxScore,
        rubricPercentage,
      });

      if (updated) {
        setSubmissions((prev) => prev.map((s) => (s.id === selectedSubmission.id ? updated : s)));
      }

      setGradingModalOpen(false);
      showToast(
        `Calificación guardada: ${
          selectedGradeCode === 'A'
            ? 'A — Aprobado'
            : selectedGradeCode === 'N'
            ? 'N — No aprobado'
            : 'C — Corregir'
        }${rubricResults ? ` · Rúbrica (${rubricResults.percentage}%)` : ''}`
      );
    } catch (err) {
      console.warn('[InstructorSubmissionsView] Error guardando calificación:', err);
    } finally {
      setIsSavingGrade(false);
    }
  };

  // ==========================================
  // EVALUACIÓN MASIVA (Sección 7)
  // ==========================================
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubmissionIds(filteredSubmissions.map((s) => s.id));
    } else {
      setSelectedSubmissionIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedSubmissionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenBatchModal = (gradeCode: AcademicGradeCode) => {
    if (selectedSubmissionIds.length === 0) return;
    setBatchGradeTarget(gradeCode);
    setBatchFeedback('');
    setBatchModalOpen(true);
  };

  const handleExecuteBatchGrade = async () => {
    if (selectedSubmissionIds.length === 0) return;
    setIsSavingGrade(true);

    try {
      await submissionService.batchGradeSubmissions({
        submissionIds: selectedSubmissionIds,
        gradeCode: batchGradeTarget,
        feedback: batchFeedback.trim() || undefined,
        instructorId: instructorUid,
        instructorName,
      });

      const now = new Date().toISOString();
      const status: SubmissionAcademicStatus =
        batchGradeTarget === 'A'
          ? 'approved'
          : batchGradeTarget === 'N'
          ? 'not_approved'
          : 'correction_required';

      setSubmissions((prev) =>
        prev.map((s) =>
          selectedSubmissionIds.includes(s.id)
            ? {
                ...s,
                status,
                grade: batchGradeTarget,
                feedback: batchFeedback.trim() || s.feedback,
                gradedBy: instructorName,
                instructorId: instructorUid,
                gradedAt: now,
                updatedAt: now,
              }
            : s
        )
      );

      const count = selectedSubmissionIds.length;
      setSelectedSubmissionIds([]);
      setBatchModalOpen(false);
      showToast(
        `Evaluación masiva completada: ${count} evidencias calificadas como ${batchGradeTarget}.`
      );
    } catch (err) {
      console.error('[InstructorSubmissionsView] Error en calificación masiva:', err);
    } finally {
      setIsSavingGrade(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedFicha('all');
    setSelectedProgram('all');
    setSelectedCourse('all');
    setSelectedActivity('all');
    setSelectedStatus('all');
    setSelectedDate('');
    setSelectedCompetency('all');
    setSelectedOutcome('all');
    setSelectedEvidenceType('all');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedFicha !== 'all' ||
    selectedProgram !== 'all' ||
    selectedCourse !== 'all' ||
    selectedActivity !== 'all' ||
    selectedStatus !== 'all' ||
    selectedDate !== '' ||
    selectedCompetency !== 'all' ||
    selectedOutcome !== 'all' ||
    selectedEvidenceType !== 'all';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Toast de notificación rápida */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#00324D] text-white px-4 py-2.5 rounded-xl shadow-lg border border-[#39A900] text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#8CE665]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Encabezado con pestañas de modo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#00324D] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#39A900]" />
            Sistema de Evaluación y Calificaciones A/N/C
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Escala oficial SENA: A = Aprobado · N = No aprobado · C = Corregir
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Pestañas */}
          <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-white text-[#00324D] font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Evidencias Recibidas
            </button>
            <button
              onClick={() => setActiveTab('competencies')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'competencies'
                  ? 'bg-white text-[#00324D] font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#39A900]" />
              Seguimiento por Competencias
            </button>
          </div>

          <DriveConnectionStatus compact />

          <button
            onClick={loadData}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sincronizar evidencias desde Firestore y Google Drive"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#39A900]' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Indicadores Pedagógicos Reales (Sección 19) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide block">
            Total Entregas
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">{stats.total}</span>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wide block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            A — Aprobadas
          </span>
          <span className="text-xl font-black text-[#2E8500] mt-1 block">{stats.approved}</span>
        </div>

        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wide block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            C — Por Corregir
          </span>
          <span className="text-xl font-black text-amber-700 mt-1 block">
            {stats.correctionRequired}
          </span>
        </div>

        <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-[10.5px] font-bold text-rose-800 uppercase tracking-wide block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            N — No Aprobadas
          </span>
          <span className="text-xl font-black text-rose-700 mt-1 block">{stats.notApproved}</span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wide block flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Pendientes
          </span>
          <span className="text-xl font-black text-slate-700 mt-1 block">{stats.pending}</span>
        </div>

        <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[10.5px] font-bold text-blue-800 uppercase tracking-wide block flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-600" />
            % Aprobación
          </span>
          <span className="text-xl font-black text-blue-700 mt-1 block">
            {stats.approvalPercentage}%
          </span>
        </div>
      </div>

      {activeTab === 'submissions' ? (
        <>
          {/* 3. Barra de Filtros Pedagógicos (Sección 8) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#39A900]" />
                Filtros Multicriterio de Evaluación ({filteredSubmissions.length} resultados)
              </span>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpiar Filtros
                </button>
              )}
            </div>

            {/* Fila 1: Búsqueda, Ficha, Programa, Curso */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar aprendiz, correo, archivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
                />
              </div>

              <div>
                <select
                  value={selectedFicha}
                  onChange={(e) => setSelectedFicha(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none focus:border-[#39A900]"
                >
                  <option value="all">Todas las Fichas</option>
                  {fichas.map((f) => (
                    <option key={f.id} value={f.id}>
                      Ficha #{f.number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none focus:border-[#39A900] truncate"
                >
                  <option value="all">Todos los Programas</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none focus:border-[#39A900] truncate"
                >
                  <option value="all">Todos los Cursos</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fila 2: Actividad, Competencia, RAP, Estado, Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
              <div>
                <select
                  value={selectedActivity}
                  onChange={(e) => setSelectedActivity(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none focus:border-[#39A900] truncate"
                >
                  <option value="all">Todas las Actividades</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedCompetency}
                  onChange={(e) => setSelectedCompetency(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none focus:border-[#39A900] truncate"
                >
                  <option value="all">Todas las Competencias</option>
                  {competencies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedOutcome}
                  onChange={(e) => setSelectedOutcome(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none focus:border-[#39A900] truncate"
                >
                  <option value="all">Todos los Resultados (RAP)</option>
                  {learningOutcomes.map((rap) => (
                    <option key={rap.id} value={rap.id}>
                      {rap.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none focus:border-[#39A900]"
                >
                  <option value="all">Todos los Estados A/N/C</option>
                  <option value="pending">⚪ Pendientes por Evaluar</option>
                  <option value="approved">🟢 A — Aprobadas</option>
                  <option value="correction_required">🟡 C — Por Corregir</option>
                  <option value="not_approved">🔴 N — No Aprobadas</option>
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  title="Filtrar por fecha de entrega"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none focus:border-[#39A900]"
                />
              </div>
            </div>
          </div>

          {/* 4. Barra de Acciones de Selección Masiva (Sección 7) */}
          {selectedSubmissionIds.length > 0 && (
            <div className="bg-[#00324D] text-white p-3 px-5 rounded-xl shadow-md flex items-center justify-between gap-3 flex-wrap animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#8CE665]" />
                <span className="text-xs font-bold">
                  {selectedSubmissionIds.length} evidencia(s) seleccionada(s) para Evaluación Masiva
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenBatchModal('A')}
                  className="px-3 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aprobar seleccionadas (A)
                </button>

                <button
                  onClick={() => handleOpenBatchModal('C')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Solicitar corrección (C)
                </button>

                <button
                  onClick={() => handleOpenBatchModal('N')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  No aprobar seleccionadas (N)
                </button>

                <button
                  onClick={() => setSelectedSubmissionIds([])}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Deseleccionar
                </button>
              </div>
            </div>
          )}

          {/* 5. Tabla de Entregas con Botones Rápidos [A] [N] [C] */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 space-y-2">
              <RefreshCw className="w-6 h-6 text-[#39A900] animate-spin mx-auto" />
              <p>Consultando evidencias en Firestore y Google Drive...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-6 space-y-3">
              <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No se encontraron evidencias</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No hay evidencias que coincidan con los criterios seleccionados.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedSubmissionIds.length === filteredSubmissions.length &&
                            filteredSubmissions.length > 0
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-slate-300 text-[#39A900] focus:ring-[#39A900] cursor-pointer"
                          title="Seleccionar todas las visibles"
                        />
                      </th>
                      <th className="p-3.5">Aprendiz</th>
                      <th className="p-3.5">Ficha</th>
                      <th className="p-3.5">Actividad Pedagógica</th>
                      <th className="p-3.5">Jerarquía Curricular</th>
                      <th className="p-3.5">Evidencia en Drive</th>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5">Estado A/N/C</th>
                      <th className="p-3.5 text-center">Evaluación Rápida</th>
                      <th className="p-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                      const config = getEvidenceTypeConfig(sub.submissionType);
                      const isSelected = selectedSubmissionIds.includes(sub.id);
                      const driveLink =
                        sub.driveUrl ||
                        sub.driveFileUrl ||
                        (sub.driveFileId
                          ? `https://drive.google.com/file/d/${sub.driveFileId}/view`
                          : null);

                      const { outcome, competency } = getHierarchyForActivity(sub.activityId);
                      const hasHistory = (sub.submissionHistory && sub.submissionHistory.length > 0) || (sub.resubmissionCount || 0) > 0;

                      return (
                        <tr
                          key={sub.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-[#EBF8E7]/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(sub.id)}
                              className="rounded border-slate-300 text-[#39A900] focus:ring-[#39A900] cursor-pointer"
                            />
                          </td>

                          {/* Aprendiz */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">
                              {sub.learnerName || 'Aprendiz SENA'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {sub.learnerEmail || sub.userId}
                            </div>
                          </td>

                          {/* Ficha */}
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                              {sub.fichaId.replace('ficha_', '')}
                            </span>
                          </td>

                          {/* Actividad */}
                          <td className="p-3.5 max-w-[200px]">
                            <div className="font-semibold text-slate-900 truncate">
                              {getActivityTitle(sub.activityId)}
                            </div>
                            {sub.comments && (
                              <div className="text-[10px] text-slate-500 italic truncate mt-0.5">
                                "{sub.comments}"
                              </div>
                            )}
                          </td>

                          {/* Jerarquía Pedagógica (Sección 9 y 10) */}
                          <td className="p-3.5 max-w-[190px]">
                            <div className="space-y-0.5 text-[10px]">
                              {outcome && (
                                <div className="text-slate-700 font-medium truncate" title={outcome.description}>
                                  <strong>RAP:</strong> {outcome.description}
                                </div>
                              )}
                              {competency && (
                                <div className="text-slate-500 truncate" title={competency.name}>
                                  <strong>Comp:</strong> {competency.name}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Archivo / Recurso Google Drive */}
                          <td className="p-3.5 max-w-[180px]">
                            <div className="space-y-1">
                              {config.isFile ? (
                                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-800 truncate">
                                  <HardDrive className="w-3.5 h-3.5 text-[#39A900] shrink-0" />
                                  <span className="truncate" title={sub.fileName}>
                                    {sub.fileName || 'archivo_evidencia'}
                                  </span>
                                </div>
                              ) : sub.submissionType === 'youtube_link' ? (
                                <a
                                  href={sub.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline truncate"
                                >
                                  <Youtube className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">Ver Video</span>
                                </a>
                              ) : sub.submissionType === 'canva_link' ? (
                                <a
                                  href={sub.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[11px] font-semibold text-cyan-700 hover:underline truncate"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">Diseño Canva</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-slate-600 truncate block">
                                  {sub.externalUrl || sub.textContent || 'Texto'}
                                </span>
                              )}

                              {/* Badge de Historial de correcciones */}
                              {hasHistory && (
                                <button
                                  onClick={() => {
                                    setSelectedSubmission(sub);
                                    setHistoryModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-100/70 hover:bg-amber-200/70 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                  title="Ver historial de reenvíos y correcciones anteriores"
                                >
                                  <History className="w-3 h-3 text-amber-700" />
                                  <span>v{sub.version || (sub.resubmissionCount || 0) + 1} ({sub.resubmissionCount} corrección)</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Fecha */}
                          <td className="p-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                            {sub.submittedAt ? sub.submittedAt.split('T')[0] : 'Hoy'}
                          </td>

                          {/* Estado A/N/C */}
                          <td className="p-3.5 whitespace-nowrap">
                            {sub.status === 'approved' || sub.grade === 'A' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 text-[#2E8500] border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                A — Aprobado
                              </span>
                            ) : sub.status === 'not_approved' || sub.grade === 'N' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-rose-100 text-rose-700 border border-rose-300">
                                <X className="w-3.5 h-3.5" />
                                N — No Aprobado
                              </span>
                            ) : sub.status === 'correction_required' || sub.grade === 'C' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                C — Corregir
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Pendiente
                              </span>
                            )}

                            {/* Evaluación de Rúbrica Pedagógica si existe (Prompt 19) */}
                            {evaluationsMap[sub.id] && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRubricEvaluation(evaluationsMap[sub.id]);
                                  setRubricViewModalOpen(true);
                                }}
                                className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#00324D] bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                title="Ver desglose pedagógico de rúbrica"
                              >
                                <Sliders className="w-3 h-3 text-[#39A900]" />
                                <span>Rúbrica {evaluationsMap[sub.id].percentage}%</span>
                              </button>
                            )}
                          </td>

                          {/* BOTONES RÁPIDOS [ A ] [ N ] [ C ] (Sección 4) */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-2xs">
                              {/* Botón [ A ] */}
                              <button
                                onClick={() => handleQuickInlineGrade(sub, 'A')}
                                className={`w-7 h-7 rounded-md font-black text-xs transition-all flex items-center justify-center cursor-pointer ${
                                  sub.grade === 'A' || sub.status === 'approved'
                                    ? 'bg-[#39A900] text-white shadow-xs'
                                    : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300'
                                }`}
                                title="Calificar como A (Aprobado)"
                              >
                                A
                              </button>

                              {/* Botón [ N ] */}
                              <button
                                onClick={() => handleQuickInlineGrade(sub, 'N')}
                                className={`w-7 h-7 rounded-md font-black text-xs transition-all flex items-center justify-center cursor-pointer ${
                                  sub.grade === 'N' || sub.status === 'not_approved'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-white text-rose-800 hover:bg-rose-50 border border-rose-300'
                                }`}
                                title="Calificar como N (No Aprobado)"
                              >
                                N
                              </button>

                              {/* Botón [ C ] */}
                              <button
                                onClick={() => handleQuickInlineGrade(sub, 'C')}
                                className={`w-7 h-7 rounded-md font-black text-xs transition-all flex items-center justify-center cursor-pointer ${
                                  sub.grade === 'C' || sub.status === 'correction_required'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-300'
                                }`}
                                title="Calificar como C (Requiere Corrección)"
                              >
                                C
                              </button>
                            </div>
                          </td>

                          {/* Acciones */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Ver detalle */}
                              <button
                                onClick={() => {
                                  setSelectedSubmission(sub);
                                  setViewEvidenceModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                title="Inspeccionar evidencia"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                Ver
                              </button>

                              {/* Calificar detallado con feedback */}
                              <button
                                onClick={() => handleOpenGrading(sub, (sub.grade as AcademicGradeCode) || 'A')}
                                className="px-2.5 py-1 bg-[#00324D] hover:bg-[#004A73] text-white rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                title="Editar calificación y retroalimentación"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-[#8CE665]" />
                                Feedback
                              </button>

                              {/* Calificar con Rúbrica Pedagógica (Prompt 19) */}
                              <button
                                onClick={() => {
                                  handleOpenGrading(sub, (sub.grade as AcademicGradeCode) || 'A');
                                  setActiveGradingTab('rubric');
                                }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#2E8500] border border-emerald-200 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                title="Evaluar con Rúbrica Pedagógica"
                              >
                                <Sliders className="w-3.5 h-3.5 text-[#39A900]" />
                                Rúbrica
                              </button>

                              {/* Drive link */}
                              {driveLink && (
                                <a
                                  href={driveLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Abrir archivo en Google Drive"
                                >
                                  <HardDrive className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Pestaña: Seguimiento por Competencias y RAP (Sección 10) */
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#39A900]" />
              Matriz de Cumplimiento por Competencias y Resultados de Aprendizaje
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Desempeño y estado de aprobación de los aprendices agrupado por diseño curricular SENA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competencies.map((comp) => {
              const compActivities = activities.filter((a) => a.competencyId === comp.id);
              const compOutcomes = learningOutcomes.filter((o) => o.competencyId === comp.id);
              const compSubmissions = submissions.filter((s) => {
                const act = activityMap.get(s.activityId);
                return act?.competencyId === comp.id;
              });

              const compStats = submissionService.calculateStats(compSubmissions);

              return (
                <div
                  key={comp.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Código: {comp.code}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">{comp.name}</h4>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-[#2E8500] block">
                        {compStats.approvalPercentage}%
                      </span>
                      <span className="text-[10px] text-slate-400">Aprobación</span>
                    </div>
                  </div>

                  {/* Resultados de aprendizaje asociados */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                      Resultados de Aprendizaje (RAP)
                    </span>
                    {compOutcomes.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Sin RAP registrados.</p>
                    ) : (
                      <div className="space-y-2">
                        {compOutcomes.map((rap) => {
                          const rapActivities = activities.filter(
                            (a) => a.learningOutcomeId === rap.id
                          );
                          const rapSubs = submissions.filter((s) => {
                            const act = activityMap.get(s.activityId);
                            return act?.learningOutcomeId === rap.id;
                          });
                          const rapStats = submissionService.calculateStats(rapSubs);

                          return (
                            <div
                              key={rap.id}
                              className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 line-clamp-1">
                                  {rap.description}
                                </span>
                                <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                                  {rapStats.approved}/{rapStats.total} Aprobadas
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                                <span>Actividades: {rapActivities.length}</span>
                                <span>Por corregir: {rapStats.correctionRequired}</span>
                                <span>No aprobadas: {rapStats.notApproved}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CALIFICACIÓN INDIVIDUAL A/N/C (Secciones 4, 5, 6)     */}
      {/* ============================================================== */}
      {selectedSubmission && (
        <Modal
          isOpen={gradingModalOpen}
          onClose={() => setGradingModalOpen(false)}
          title="Calificar Evidencia Pedagógica"
          subtitle={`${selectedSubmission.learnerName || 'Aprendiz'} · ${getActivityTitle(
            selectedSubmission.activityId
          )}`}
          footer={
            <>
              <button
                onClick={() => setGradingModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGrade}
                disabled={isSavingGrade}
                className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
              >
                {isSavingGrade && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Guardar Dictamen
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Pestañas de Evaluación si la actividad tiene Rúbrica Pedagógica (Prompt 19) */}
            {currentRubric && (
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveGradingTab('official')}
                  className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeGradingTab === 'official'
                      ? 'border-[#39A900] text-[#00324D]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-[#39A900]" />
                  <span>Dictamen Oficial A/N/C</span>
                  <span className="text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded font-black">
                    {selectedGradeCode}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGradingTab('rubric')}
                  className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeGradingTab === 'rubric'
                      ? 'border-[#39A900] text-[#00324D]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-[#39A900]" />
                  <span>Rúbrica Pedagógica</span>
                  {rubricResults ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      {rubricResults.percentage}%
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                      Por evaluar
                    </span>
                  )}
                </button>
              </div>
            )}

            {activeGradingTab === 'rubric' && currentRubric ? (
              <div className="space-y-4">
                <RubricEvaluationForm
                  rubric={currentRubric}
                  initialResults={rubricResults?.criteriaResults}
                  onResultsChange={(res) => {
                    setRubricResults(res);
                    // PROMPT 19.1: La rúbrica genera sugerencia pedagógica orientativa pero NUNCA modifica automáticamente el dictamen oficial A/N/C.
                    // El instructor conserva en todo momento la decisión final.
                  }}
                />

                {/* Panel de Puntos, Porcentaje, Sugerencia Pedagógica y Dictamen Oficial (Prompt 19.1 - Requisitos 3 y 4) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Puntaje Obtenido
                      </span>
                      <div className="flex items-baseline gap-1 text-slate-900">
                        <span className="text-2xl font-black text-[#2E8500]">
                          {rubricResults?.totalPoints || 0}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          / {rubricResults?.totalPossiblePoints || currentRubric.totalPoints} pts
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Porcentaje
                      </span>
                      <span className="text-2xl font-black text-[#00324D]">
                        {rubricResults?.percentage || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Sugerencia Pedagógica Informativa */}
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-950">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Sugerencia pedagógica orientativa:</span>
                    </div>
                    <p className="text-[11px] text-blue-900 leading-relaxed">
                      {rubricResults
                        ? rubricResults.percentage >= 70
                          ? 'Desempeño formativo acorde con los estándares esperados (Referencia orientativa: Cumple con los criterios de evaluación formativos).'
                          : rubricResults.percentage >= 50
                          ? 'Se identifican aspectos específicos por fortalecer (Referencia orientativa: Oportunidad de corrección o ajuste puntual).'
                          : 'Criterios mínimos aún no alcanzados (Referencia orientativa: No cumple con los requerimientos esenciales).'
                        : 'Califica los criterios en la rúbrica arriba para obtener una orientación formativa.'}
                    </p>
                    <p className="text-[10px] text-blue-800 italic pt-1 border-t border-blue-100">
                      * Nota institucional: Esta sugerencia es meramente formativa. El instructor debe seleccionar explícitamente el Resultado Oficial SENA a continuación.
                    </p>
                  </div>

                  {/* Selector Explícito de Dictamen Oficial SENA [ A ] [ N ] [ C ] */}
                  <div className="space-y-2 pt-1 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800">
                        Resultado Oficial SENA *
                      </label>
                      <span className="text-xs font-bold text-slate-600">
                        Seleccionado:{' '}
                        <strong
                          className={
                            selectedGradeCode === 'A'
                              ? 'text-[#2E8500]'
                              : selectedGradeCode === 'C'
                              ? 'text-amber-700'
                              : 'text-rose-600'
                          }
                        >
                          {selectedGradeCode === 'A'
                            ? 'A (Aprobado)'
                            : selectedGradeCode === 'C'
                            ? 'C (Por corregir)'
                            : 'N (No aprobado)'}
                        </strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {/* [ A ] */}
                      <button
                        type="button"
                        onClick={() => setSelectedGradeCode('A')}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          selectedGradeCode === 'A'
                            ? 'bg-emerald-50 border-[#39A900] text-[#2E8500] font-black shadow-sm ring-2 ring-[#39A900]/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xl font-black">A</div>
                        <div className="text-xs font-bold">APROBADO</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Cumple criterios</div>
                      </button>

                      {/* [ N ] */}
                      <button
                        type="button"
                        onClick={() => setSelectedGradeCode('N')}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          selectedGradeCode === 'N'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 font-black shadow-sm ring-2 ring-rose-500/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xl font-black">N</div>
                        <div className="text-xs font-bold">NO APROBADO</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">No cumple criterios</div>
                      </button>

                      {/* [ C ] */}
                      <button
                        type="button"
                        onClick={() => setSelectedGradeCode('C')}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          selectedGradeCode === 'C'
                            ? 'bg-amber-50 border-amber-500 text-amber-800 font-black shadow-sm ring-2 ring-amber-500/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xl font-black">C</div>
                        <div className="text-xs font-bold">CORREGIR</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Habilita nuevo reenvío</div>
                      </button>
                    </div>
                  </div>

                  {/* Retroalimentación en la pestaña de rúbrica */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Retroalimentación General del Instructor {selectedGradeCode === 'C' && '*'}
                    </label>
                    <textarea
                      rows={3}
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder={
                        selectedGradeCode === 'C'
                          ? 'Indica con claridad qué aspectos debe corregir el aprendiz para su nueva entrega...'
                          : 'Comentarios formativos adicionales para el aprendiz...'
                      }
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900] text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Banner de Atajos de Teclado (Sección 6) */}
                <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    ⌨️ Atajos de teclado:
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-slate-800">
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-300">A = Aprobar</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-300">N = No aprobar</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-300">C = Corregir</span>
                  </div>
                </div>

                {/* Si la actividad tiene rúbrica y ya tiene puntaje */}
                {rubricResults && (
                  <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#00324D]" />
                      <span className="text-slate-800">
                        Evaluación con Rúbrica: <strong>{rubricResults.percentage}%</strong> ({rubricResults.totalPoints}/{rubricResults.totalPossiblePoints} pts)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveGradingTab('rubric')}
                      className="text-[11px] font-bold text-sky-800 hover:underline"
                    >
                      Ajustar criterios
                    </button>
                  </div>
                )}

                {/* Selector de Dictamen A / N / C */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-2">
                    Dictamen Oficial SENA *
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* [ A ] */}
                    <button
                      type="button"
                      onClick={() => setSelectedGradeCode('A')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedGradeCode === 'A'
                          ? 'bg-emerald-50 border-[#39A900] text-[#2E8500] font-black shadow-sm ring-2 ring-[#39A900]/30'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xl font-black">A</div>
                      <div className="text-xs font-bold">APROBADO</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Cumple criterios</div>
                    </button>

                    {/* [ N ] */}
                    <button
                      type="button"
                      onClick={() => setSelectedGradeCode('N')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedGradeCode === 'N'
                          ? 'bg-rose-50 border-rose-500 text-rose-700 font-black shadow-sm ring-2 ring-rose-500/30'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xl font-black">N</div>
                      <div className="text-xs font-bold">NO APROBADO</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">No cumple criterios</div>
                    </button>

                    {/* [ C ] */}
                    <button
                      type="button"
                      onClick={() => setSelectedGradeCode('C')}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedGradeCode === 'C'
                          ? 'bg-amber-50 border-amber-500 text-amber-800 font-black shadow-sm ring-2 ring-amber-500/30'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xl font-black">C</div>
                      <div className="text-xs font-bold">CORREGIR</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Habilita nuevo reenvío</div>
                    </button>
                  </div>
                </div>

                {/* Retroalimentación formativa obligatoria para C o recomendada */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Retroalimentación del Instructor (Feedback) {selectedGradeCode === 'C' && '*'}
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder={
                      selectedGradeCode === 'C'
                        ? 'Indica con claridad qué aspectos debe corregir el aprendiz para que pueda reenviar la evidencia...'
                        : 'Observaciones pedagógicas cualitativas para el aprendiz...'
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-white leading-relaxed"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-1 block">
                    Esta retroalimentación quedará registrada en Firestore y será visible de inmediato en el perfil del aprendiz.
                  </span>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CONFIRMACIÓN DE EVALUACIÓN MASIVA (Sección 7)         */}
      {/* ============================================================== */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="Confirmación de Evaluación Masiva"
        subtitle={`Se aplicará dictamen ${batchGradeTarget} a ${selectedSubmissionIds.length} evidencia(s) seleccionada(s)`}
        footer={
          <>
            <button
              onClick={() => setBatchModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleExecuteBatchGrade}
              disabled={isSavingGrade}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs ${
                batchGradeTarget === 'A'
                  ? 'bg-[#39A900] hover:bg-[#2E8500]'
                  : batchGradeTarget === 'N'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {isSavingGrade && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Confirmar Evaluación Masiva ({selectedSubmissionIds.length})
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <strong className="block font-bold">Aviso de seguridad institucional:</strong>
            <p>
              Estás a punto de calificar masivamente{' '}
              <strong>{selectedSubmissionIds.length} evidencias</strong> con el dictamen{' '}
              <strong>
                {batchGradeTarget === 'A'
                  ? 'A — Aprobado'
                  : batchGradeTarget === 'N'
                  ? 'N — No aprobado'
                  : 'C — Corregir'}
              </strong>
              . Las evidencias no seleccionadas se mantendrán intactas.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Retroalimentación Masiva Opcional (se aplicará a todas las seleccionadas)
            </label>
            <textarea
              rows={3}
              value={batchFeedback}
              onChange={(e) => setBatchFeedback(e.target.value)}
              placeholder="Retroalimentación institucional estándar para el grupo seleccionado..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-white"
            />
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: INSPECCIÓN DE EVIDENCIA REAL (Google Drive)           */}
      {/* ============================================================== */}
      {selectedSubmission && (
        <Modal
          isOpen={viewEvidenceModalOpen}
          onClose={() => setViewEvidenceModalOpen(false)}
          title="Inspección de Evidencia Real"
          subtitle={`${selectedSubmission.learnerName || 'Aprendiz'} · Ficha ${selectedSubmission.fichaId}`}
        >
          <div className="space-y-4">
            {/* Ruta y Jerarquía Curricular (Sección 9 y 10) */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Jerarquía Pedagógica Oficial:
                </span>
                <span className="font-mono text-[10px] text-slate-400">ID: {selectedSubmission.id}</span>
              </div>
              <p className="font-bold text-slate-900">
                Actividad: {getActivityTitle(selectedSubmission.activityId)}
              </p>
              {(() => {
                const { outcome, competency } = getHierarchyForActivity(selectedSubmission.activityId);
                return (
                  <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200/60">
                    {outcome && <div><strong>RAP:</strong> {outcome.description}</div>}
                    {competency && <div><strong>Competencia:</strong> {competency.name}</div>}
                  </div>
                );
              })()}
              {selectedSubmission.drivePath && (
                <div className="font-mono text-[10.5px] text-[#00324D] pt-1">
                  📁 {selectedSubmission.drivePath}
                </div>
              )}
            </div>

            {/* Enlace y descarga directa a Google Drive */}
            {selectedSubmission.driveFileId ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-[#39A900]" />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Archivo Físico Alojado en Google Drive
                    </span>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      {selectedSubmission.fileName || 'evidencia'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={
                      selectedSubmission.driveUrl ||
                      selectedSubmission.driveFileUrl ||
                      `https://drive.google.com/file/d/${selectedSubmission.driveFileId}/view`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir en Google Drive
                  </a>
                </div>
              </div>
            ) : selectedSubmission.externalUrl ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-blue-900 block">Enlace Externo Presentado:</span>
                <a
                  href={selectedSubmission.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-700 hover:underline break-all block font-semibold"
                >
                  {selectedSubmission.externalUrl}
                </a>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic">
                "{selectedSubmission.textContent}"
              </div>
            )}

            {/* Retroalimentación actual */}
            {selectedSubmission.feedback && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Última Retroalimentación Registrada:</span>
                <p className="italic text-slate-800">{selectedSubmission.feedback}</p>
                <div className="text-[10px] text-slate-400 pt-1">
                  Evaluado por: {selectedSubmission.gradedBy || 'Instructor'} el{' '}
                  {selectedSubmission.gradedAt ? selectedSubmission.gradedAt.split('T')[0] : 'N/A'}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: HISTORIAL DE CORRECCIONES Y ENTREGAS (Sección 12)     */}
      {/* ============================================================== */}
      {selectedSubmission && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title="Historial de Entregas y Correcciones"
          subtitle={`${selectedSubmission.learnerName || 'Aprendiz'} · ${getActivityTitle(
            selectedSubmission.activityId
          )}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Registro histórico de las versiones presentadas por el aprendiz y sus correspondientes dictámenes formativos.
            </p>

            <div className="space-y-3">
              {/* Versiones anteriores guardadas en el historial */}
              {(selectedSubmission.submissionHistory || []).map((h, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Entrega {h.version}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {h.submittedAt ? h.submittedAt.split('T')[0] : 'Fecha anterior'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Dictamen:</span>
                    <span
                      className={`font-black px-2 py-0.5 rounded text-[11px] ${
                        h.grade === 'A'
                          ? 'bg-emerald-100 text-emerald-800'
                          : h.grade === 'N'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {h.grade || h.status}
                    </span>
                  </div>

                  {h.feedback && (
                    <div className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-200">
                      "{h.feedback}"
                    </div>
                  )}

                  {h.driveFileId && (
                    <a
                      href={h.driveUrl || h.driveFileUrl || `https://drive.google.com/file/d/${h.driveFileId}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold pt-1"
                    >
                      <HardDrive className="w-3 h-3 text-[#39A900]" />
                      <span>Ver archivo de esta entrega ({h.fileName || 'evidencia'})</span>
                    </a>
                  )}
                </div>
              ))}

              {/* Versión actual */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950">
                    Entrega Actual (Versión {selectedSubmission.version || (selectedSubmission.resubmissionCount || 0) + 1})
                  </span>
                  <span className="text-[10px] font-mono text-emerald-800">
                    {selectedSubmission.submittedAt ? selectedSubmission.submittedAt.split('T')[0] : 'Hoy'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Estado actual:</span>
                  <span className="font-black text-xs text-slate-900">
                    {selectedSubmission.grade || selectedSubmission.status}
                  </span>
                </div>

                {selectedSubmission.feedback && (
                  <p className="text-[11px] text-emerald-900 italic bg-white p-2 rounded border border-emerald-200">
                    "{selectedSubmission.feedback}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Consulta Detallada de Evaluación por Rúbrica Pedagógica (Prompt 19) */}
      {rubricViewModalOpen && selectedRubricEvaluation && (
        <RubricEvaluationViewModal
          isOpen={rubricViewModalOpen}
          onClose={() => {
            setRubricViewModalOpen(false);
            setSelectedRubricEvaluation(null);
          }}
          evaluation={selectedRubricEvaluation}
        />
      )}
    </div>
  );
};
