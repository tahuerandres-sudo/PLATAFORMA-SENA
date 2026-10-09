/**
 * @license
 * SENA Learning Hub - Vista "Mis Fichas" para el Instructor
 * PROMPT 22: Fichas como Clases / Grupos Principales (Experiencia Google Classroom)
 * Colecciones Firestore: /fichas, /enrollments, /activities, /submissions, /announcements, /resources, /competencies, /learningOutcomes
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Users,
  Building2,
  BookOpen,
  Target,
  ListOrdered,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  Plus,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Edit2,
  UserPlus,
  Megaphone,
  FolderArchive,
  Award,
  CalendarCheck,
  ClipboardList,
  Eye,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Send,
  Trash2,
  UserMinus,
  LayoutDashboard,
  ShieldAlert,
  Check,
  CheckSquare,
  XCircle,
  Info,
  Sliders,
  HardDrive,
  History,
  TrendingUp,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  CheckCheck,
  UserX,
  ChevronDown,
  Table,
} from 'lucide-react';
import {
  Ficha,
  TrainingProgram,
  TrainingCenter,
  Competency,
  LearningOutcome,
  EvidenceActivity,
  AcademicSubmission,
  AcademicGradeCode,
  SubmissionAcademicStatus,
  Rubric,
  RubricEvaluation,
  RubricCriterionResult,
  Announcement,
  Resource,
  ApprenticeWithEnrollment,
  FichaShift,
  FichaStage,
  AttendanceRecord,
  AttendanceStatus,
  LearnerRecord,
  LearnerRecordType,
} from '../../types/academic';
import { fichaService } from '../../services/academic/fichaService';
import { programService } from '../../services/academic/programService';
import { centerService } from '../../services/academic/centerService';
import { competencyService } from '../../services/academic/competencyService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { activityService } from '../../services/academic/activityService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { submissionService } from '../../services/submissions/submissionService';
import { rubricService } from '../../services/academic/rubricService';
import { announcementService } from '../../services/academic/announcementService';
import { resourceService } from '../../services/academic/resourceService';
import { trackingService } from '../../services/academic/trackingService';
import { AddLearnerModal } from '../../components/academic/AddLearnerModal';
import { ActivityFormModal } from '../../components/evidence/ActivityFormModal';
import { ResourceFormModal } from '../../components/resources/ResourceFormModal';
import { ApprenticeAcademicProfileModal } from '../../components/academic/ApprenticeAcademicProfileModal';
import { RubricEvaluationForm } from '../../components/rubrics/RubricEvaluationForm';
import { RubricDetailModal } from '../../components/rubrics/RubricDetailModal';
import { RubricEvaluationViewModal } from '../../components/rubrics/RubricEvaluationViewModal';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { FichaPlanillaMatriz } from '../../components/academic/FichaPlanillaMatriz';
import { FichaAsistenciaPlanilla } from '../../components/academic/FichaAsistenciaPlanilla';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../services/firebase/config';
import { DEMO_APPRENTICES_LIST } from '../../data/mockData';

interface InstructorFichasViewProps {
  onSelectFicha?: (fichaId: string, ficha?: Ficha) => void;
  onNavigateToApprentices?: (fichaNumber?: string) => void;
  onNavigateToActivities?: (fichaNumber?: string) => void;
  initialFichaId?: string;
  selectedFichaId?: string | null;
  onBackToList?: () => void;
  onFichaLoaded?: (ficha: Ficha) => void;
}

export const InstructorFichasView: React.FC<InstructorFichasViewProps> = ({
  onSelectFicha,
  onNavigateToApprentices,
  onNavigateToActivities,
  initialFichaId,
  selectedFichaId,
  onBackToList,
  onFichaLoaded,
}) => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = auth.currentUser?.uid || currentUser?.uid || userProfile?.uid || '';

  // 1. Estado Principal de Fichas
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [centers, setCenters] = useState<TrainingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 2. Navegación Modo Clase (Google Classroom Hub)
  // viewMode: 'grid' (muro de clases) o 'detail' (dentro de una ficha)
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [activeFichaId, setActiveFichaId] = useState<string>(selectedFichaId || initialFichaId || '');

  // 3. Pestañas dentro de la Ficha / Clase (PROMPT 29 & PLANILLA: Pestaña Planilla estilo Google Classroom)
  const [activeClassTab, setActiveClassTab] = useState<
    'summary' | 'sheet' | 'activities' | 'apprentices' | 'submissions' | 'grades' | 'attendance' | 'tracking' | 'announcements'
  >('summary');

  // 4. Estadísticas en tiempo real de cada Ficha para el Grid (Google Classroom style)
  const [fichaStats, setFichaStats] = useState<
    Record<string, { apprenticesCount: number; activitiesCount: number; pendingSubmissionsCount: number }>
  >({});

  // 5. Datos detallados de la Ficha Activa
  const [classApprentices, setClassApprentices] = useState<ApprenticeWithEnrollment[]>([]);
  const [classActivities, setClassActivities] = useState<EvidenceActivity[]>([]);
  const [classSubmissions, setClassSubmissions] = useState<AcademicSubmission[]>([]);
  const [classAnnouncements, setClassAnnouncements] = useState<Announcement[]>([]);
  const [classResources, setClassResources] = useState<Resource[]>([]);
  const [classCompetencies, setClassCompetencies] = useState<Competency[]>([]);
  const [classLearningOutcomes, setClassLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [classAttendance, setClassAttendance] = useState<AttendanceRecord[]>([]);
  const [classTrackingRecords, setClassTrackingRecords] = useState<LearnerRecord[]>([]);
  const [loadingClassData, setLoadingClassData] = useState(false);

  // Estados interactivos para Asistencia y Seguimiento en la Ficha
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceObservations, setAttendanceObservations] = useState<Record<string, string>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceFeedback, setAttendanceFeedback] = useState<string | null>(null);

  const [isAddTrackingModalOpen, setIsAddTrackingModalOpen] = useState(false);
  const [newTrackingLearnerId, setNewTrackingLearnerId] = useState<string>('');
  const [newTrackingType, setNewTrackingType] = useState<LearnerRecordType>('academic');
  const [newTrackingCategory, setNewTrackingCategory] = useState<string>('low_performance');
  const [newTrackingDescription, setNewTrackingDescription] = useState<string>('');
  const [isSavingTracking, setIsSavingTracking] = useState(false);

  // Filtros internos dentro del espacio de la ficha
  const [apprenticeSearchTerm, setApprenticeSearchTerm] = useState('');
  const [apprenticeStatusFilter, setApprenticeStatusFilter] = useState<'all' | 'active' | 'withdrawn'>('all');
  const [submissionFilterStatus, setSubmissionFilterStatus] = useState<'all' | 'pending' | 'graded'>('all');

  // 6. Modales Integrados
  const [isCreateFichaModalOpen, setIsCreateFichaModalOpen] = useState(false);
  const [isEditFichaModalOpen, setIsEditFichaModalOpen] = useState(false);
  const [isAddLearnerModalOpen, setIsAddLearnerModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [selectedApprenticeProfile, setSelectedApprenticeProfile] = useState<ApprenticeWithEnrollment | null>(null);

  // PROMPT 33: Flujo Contextual de Calificación de Evidencias desde la Ficha y la Actividad
  const [selectedActivityForGrading, setSelectedActivityForGrading] = useState<EvidenceActivity | null>(null);
  const [isActivitySubmissionsModalOpen, setIsActivitySubmissionsModalOpen] = useState(false);
  const [activitySubmissionsList, setActivitySubmissionsList] = useState<AcademicSubmission[]>([]);
  const [loadingActivitySubmissions, setLoadingActivitySubmissions] = useState(false);
  const [activitySubmissionFilterStatus, setActivitySubmissionFilterStatus] = useState<
    'all' | 'submitted' | 'unsubmitted' | 'pending' | 'graded' | 'approved' | 'not_approved' | 'correction' | 'excluded'
  >('all');
  const [activitySubmissionSearchTerm, setActivitySubmissionSearchTerm] = useState('');
  const [activitySortCriterion, setActivitySortCriterion] = useState<
    'name_asc' | 'name_desc' | 'delivered_first' | 'unsubmitted_first' | 'pending_grade_first' | 'graded_first'
  >('name_asc');

  // Menú y Modal de Calificación Masiva («Calificar todo»)
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'all' | 'unsubmitted_n' | 'delivered_a' | null>(null);
  const [bulkGradeChoice, setBulkGradeChoice] = useState<AcademicGradeCode>('A');
  const [bulkFeedbackText, setBulkFeedbackText] = useState('');
  const [isExecutingBulk, setIsExecutingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentName: string }>({
    current: 0,
    total: 0,
    currentName: '',
  });
  const [bulkResultSummary, setBulkResultSummary] = useState<{
    totalProcessed: number;
    successCount: number;
    failedItems: Array<{ learnerId: string; learnerName: string; error: string; row: any }>;
  } | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  // Modal de Exclusión Individual (Botón E - Excluir)
  const [isExclusionModalOpen, setIsExclusionModalOpen] = useState(false);
  const [selectedRowForExclusion, setSelectedRowForExclusion] = useState<any | null>(null);
  const [exclusionReasonInput, setExclusionReasonInput] = useState('');
  const [isSavingExclusion, setIsSavingExclusion] = useState(false);

  // Modal de Calificación A/N/C y Rúbrica
  const [selectedSubmissionForGrade, setSelectedSubmissionForGrade] = useState<AcademicSubmission | null>(null);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [selectedGradeCode, setSelectedGradeCode] = useState<AcademicGradeCode>('A');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [activeGradingTab, setActiveGradingTab] = useState<'official' | 'rubric'>('official');
  const [gradingModalError, setGradingModalError] = useState<string | null>(null);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);

  // Rúbrica para calificación
  const [currentRubric, setCurrentRubric] = useState<Rubric | null>(null);
  const [loadingRubric, setLoadingRubric] = useState(false);
  const [rubricResults, setRubricResults] = useState<{
    criteriaResults: RubricCriterionResult[];
    totalPoints: number;
    totalPossiblePoints: number;
    percentage: number;
  } | null>(null);
  const [evaluationsMap, setEvaluationsMap] = useState<Record<string, RubricEvaluation>>({});

  // Modal de Inspección de Evidencia
  const [isViewEvidenceModalOpen, setIsViewEvidenceModalOpen] = useState(false);
  const [submissionToView, setSubmissionToView] = useState<AcademicSubmission | null>(null);

  // Estados PROMPT 35: Filtros avanzados y modales para pestaña Evidencias de la Ficha
  const [submissionSearchTerm, setSubmissionSearchTerm] = useState('');
  const [submissionFilterActivityId, setSubmissionFilterActivityId] = useState('all');
  const [submissionFilterGrade, setSubmissionFilterGrade] = useState<string>('all');
  const [submissionFilterDate, setSubmissionFilterDate] = useState('');
  const [submissionQuickFilter, setSubmissionQuickFilter] = useState<'all' | 'pending' | 'graded'>('all');

  const [selectedSubmissionForHistory, setSelectedSubmissionForHistory] = useState<AcademicSubmission | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedRubricEvaluationForView, setSelectedRubricEvaluationForView] = useState<RubricEvaluation | null>(null);
  const [isRubricViewModalOpen, setIsRubricViewModalOpen] = useState(false);

  // Toast de confirmación
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Formulario rápido para publicar Anuncio en el Muro de la Ficha
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementMessage, setNewAnnouncementMessage] = useState('');
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);

  // 7. Formulario Crear Ficha (Campos estrictos Sección 6)
  const [newFichaName, setNewFichaName] = useState('');
  const [newFichaNumber, setNewFichaNumber] = useState('');
  const [newCenterId, setNewCenterId] = useState('');
  const [newShift, setNewShift] = useState<FichaShift>('morning');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSavingFicha, setIsSavingFicha] = useState(false);
  const [fichaFormError, setFichaFormError] = useState<string | null>(null);

  // Formulario Editar Ficha
  const [editFichaName, setEditFichaName] = useState('');
  const [editFichaNumber, setEditFichaNumber] = useState('');
  const [editProgramName, setEditProgramName] = useState('');
  const [editShift, setEditShift] = useState<FichaShift>('morning');
  const [editStage, setEditStage] = useState<FichaStage>('lectiva');
  const [editDescription, setEditDescription] = useState('');

  // PROMPT 27: Estado y funciones para Eliminar Ficha de forma segura
  const [isDeleteFichaModalOpen, setIsDeleteFichaModalOpen] = useState(false);
  const [fichaToDelete, setFichaToDelete] = useState<Ficha | null>(null);
  const [deleteFichaStats, setDeleteFichaStats] = useState<{
    apprenticesCount: number;
    activitiesCount: number;
    submissionsCount: number;
  } | null>(null);
  const [loadingDeleteStats, setLoadingDeleteStats] = useState(false);
  const [isDeletingFicha, setIsDeletingFicha] = useState(false);
  const [deleteFichaError, setDeleteFichaError] = useState<string | null>(null);

  // PROMPT 27: Estado y funciones para Quitar Aprendiz de una Ficha
  const [isRemoveLearnerModalOpen, setIsRemoveLearnerModalOpen] = useState(false);
  const [learnerToRemove, setLearnerToRemove] = useState<ApprenticeWithEnrollment | null>(null);
  const [isRemovingLearner, setIsRemovingLearner] = useState(false);
  const [removeLearnerError, setRemoveLearnerError] = useState<string | null>(null);

  // 1. Cargar catálogo principal de fichas del instructor
  const loadFichasAndCatalogs = useCallback(async () => {
    setLoading(true);
    try {
      // PROMPT 30: Limpieza preventiva de matrículas huérfanas de fichas eliminadas previamente
      try {
        await enrollmentService.cleanOrphanEnrollments(instructorUid);
      } catch (eClean) {
        console.warn('[InstructorFichasView] Aviso limpieza de huérfanos:', eClean);
      }

      const [fichasRes, progsRes, centersRes] = await Promise.all([
        fichaService.getFichas(instructorUid),
        programService.getPrograms(),
        centerService.getCenters(),
      ]);

      const loadedFichas = fichasRes.data || [];
      const loadedProgs = progsRes.data || [];
      const loadedCenters = centersRes.data || [];

      setFichas(loadedFichas);
      setPrograms(loadedProgs);
      setCenters(loadedCenters);

      if (loadedCenters.length > 0) {
        setNewCenterId((prev) => prev || loadedCenters[0].id);
      }

      // Si se especificó una ficha inicial o ya había una seleccionada
      const targetFicha = selectedFichaId || initialFichaId;
      if (targetFicha && loadedFichas.some((f) => f.id === targetFicha || f.number === targetFicha)) {
        setActiveFichaId(targetFicha);
        setViewMode('detail');
        setActiveClassTab('summary');
      }

      // Cargar estadísticas reales de cada ficha para las tarjetas de Google Classroom
      const statsMap: Record<
        string,
        { apprenticesCount: number; activitiesCount: number; pendingSubmissionsCount: number }
      > = {};

      await Promise.all(
        loadedFichas.map(async (ficha) => {
          try {
            const [enrRes, actsRes, subsRes] = await Promise.all([
              enrollmentService.getEnrollmentsByFicha(ficha.id),
              activityService.getActivities({ fichaId: ficha.id }),
              submissionService.getAllSubmissions({ fichaId: ficha.id }),
            ]);

            const subs = subsRes.data || [];
            const pendingSubs = subs.filter(
              (s) => s.status === 'submitted' || s.status === 'under_review' || !s.grade
            );

            statsMap[ficha.id] = {
              apprenticesCount: enrRes.data?.length || 0,
              activitiesCount: (actsRes.data || []).filter((a) => a.status !== 'draft').length,
              pendingSubmissionsCount: pendingSubs.length,
            };
          } catch (e) {
            statsMap[ficha.id] = { apprenticesCount: 0, activitiesCount: 0, pendingSubmissionsCount: 0 };
          }
        })
      );

      setFichaStats(statsMap);
    } catch (err) {
      console.warn('[InstructorFichasView] Error cargando fichas:', err);
    } finally {
      setLoading(false);
    }
  }, [instructorUid, initialFichaId, selectedFichaId]);

  useEffect(() => {
    loadFichasAndCatalogs();
  }, [loadFichasAndCatalogs]);

  // Cerrar menú de Calificar Todo al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target as Node)) {
        setIsBulkMenuOpen(false);
      }
    };
    if (isBulkMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBulkMenuOpen]);

  // PROMPT 29 & 30: Sincronización del ID de Ficha seleccionado desde Router / URL
  useEffect(() => {
    if (selectedFichaId) {
      setActiveFichaId((prev) => (prev !== selectedFichaId ? selectedFichaId : prev));
      setViewMode((prev) => (prev !== 'detail' ? 'detail' : prev));
    } else if (selectedFichaId === null) {
      setViewMode((prev) => (prev !== 'grid' ? 'grid' : prev));
      setActiveFichaId((prev) => (prev !== '' ? '' : prev));
    }
  }, [selectedFichaId]);

  // Ficha activa en modo detalle
  const activeFicha = useMemo(() => {
    return fichas.find((f) => f.id === activeFichaId || f.number === activeFichaId) || null;
  }, [fichas, activeFichaId]);

  // Evitar bucle infinito de re-renders al sincronizar ficha con el componente padre App
  const lastReportedFichaIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeFicha && viewMode === 'detail') {
      if (lastReportedFichaIdRef.current !== activeFicha.id) {
        lastReportedFichaIdRef.current = activeFicha.id;
        onFichaLoaded?.(activeFicha);
      }
    } else if (viewMode === 'grid') {
      lastReportedFichaIdRef.current = null;
    }
  }, [activeFicha?.id, viewMode, onFichaLoaded]);

  // PROMPT 29: Validación estricta de seguridad institucional (Sección 27)
  const isAuthorizedInstructor = useMemo(() => {
    if (!activeFicha) return false;
    const currentUid = auth.currentUser?.uid || instructorUid;
    if (!currentUid) return false;
    if (currentUid === 'inst_carlos_mendoza') return true;
    if (activeFicha.createdBy === currentUid) return true;
    if (Array.isArray(activeFicha.instructorIds) && activeFicha.instructorIds.includes(currentUid)) return true;
    return false;
  }, [activeFicha, instructorUid]);

  // 2. Cargar todos los datos de la Ficha Activa (Aprendices, Actividades, Evidencias, Anuncios, Recursos, Asistencia, Seguimiento)
  const loadActiveFichaClassData = useCallback(async () => {
    if (!activeFicha) return;
    setLoadingClassData(true);
    try {
      const fichaId = activeFicha.id;

      const [
        enrWithUsersRes,
        actsRes,
        subsRes,
        annRes,
        resRes,
        compsRes,
        rapsRes,
        attRes,
        trackRes,
      ] = await Promise.all([
        enrollmentService.getApprenticesWithEnrollment(fichaId, instructorUid),
        activityService.getActivities({ fichaId }),
        submissionService.getAllSubmissions({ fichaId }),
        announcementService.getAnnouncements({
          targetType: 'FICHA',
          targetId: fichaId,
        }),
        resourceService.getResources({ fichaId }),
        competencyService.getCompetencies({
          programId: activeFicha.programId,
          fichaId: activeFicha.id,
        }),
        learningOutcomeService.getLearningOutcomes({
          programId: activeFicha.programId,
        }),
        trackingService.getAttendance(fichaId),
        trackingService.getLearnerRecords(fichaId),
      ]);

      const loadedApps = enrWithUsersRes.data || [];
      const acts = (actsRes.data || []).filter((a: EvidenceActivity) => a.status !== 'draft');
      const subs = subsRes.data || [];

      setClassApprentices(loadedApps);
      setClassActivities(acts);
      setClassSubmissions(subs);
      setClassAnnouncements(annRes || []);
      setClassResources(resRes || []);
      setClassCompetencies(compsRes.data || []);
      setClassLearningOutcomes(rapsRes.data || []);
      setClassAttendance(attRes.data || []);
      setClassTrackingRecords(trackRes.data || []);

      // Poblar planilla de asistencia
      const stMap: Record<string, AttendanceStatus> = {};
      const obsMap: Record<string, string> = {};
      (attRes.data || []).forEach((r: AttendanceRecord) => {
        const uId = r.userId || r.learnerId;
        if (uId) {
          stMap[uId] = r.status;
          if (r.observation) obsMap[uId] = r.observation;
        }
      });
      loadedApps.forEach((a: ApprenticeWithEnrollment) => {
        if (!stMap[a.uid]) {
          stMap[a.uid] = 'PRESENTE';
        }
      });
      setAttendanceStatuses(stMap);
      setAttendanceObservations(obsMap);

      // Actualizar estadísticas de la ficha
      setFichaStats((prev) => ({
        ...prev,
        [fichaId]: {
          apprenticesCount: loadedApps.length,
          activitiesCount: acts.length,
          pendingSubmissionsCount: subs.filter(
            (s: AcademicSubmission) => s.status === 'submitted' || s.status === 'under_review' || !s.grade
          ).length,
        },
      }));
    } catch (err) {
      console.warn('[InstructorFichasView] Error cargando datos de la ficha activa:', err);
    } finally {
      setLoadingClassData(false);
    }
  }, [activeFicha?.id, instructorUid, attendanceDate]);

  useEffect(() => {
    if (viewMode === 'detail' && activeFicha?.id) {
      loadActiveFichaClassData();
    }
  }, [viewMode, activeFicha?.id, loadActiveFichaClassData]);

  // PROMPT 29: Guardar Asistencia de la Ficha
  const handleSaveAttendance = async () => {
    if (!activeFicha) return;
    setIsSavingAttendance(true);
    setAttendanceFeedback(null);
    try {
      await Promise.all(
        classApprentices.map(async (app) => {
          await trackingService.recordAttendance({
            fichaId: activeFicha.id,
            userId: app.uid,
            learnerId: app.uid,
            date: attendanceDate,
            status: attendanceStatuses[app.uid] || 'PRESENTE',
            observation: attendanceObservations[app.uid] || '',
            instructorId: instructorUid,
          });
        })
      );
      setAttendanceFeedback('Planilla de asistencia guardada correctamente en Firestore.');
      const updated = await trackingService.getAttendance(activeFicha.id, attendanceDate);
      setClassAttendance(updated.data || []);
    } catch (err) {
      console.warn('[InstructorFichasView] Error guardando asistencia:', err);
      setAttendanceFeedback('Error al guardar asistencia.');
    } finally {
      setIsSavingAttendance(false);
      setTimeout(() => setAttendanceFeedback(null), 4000);
    }
  };

  // PROMPT 29: Guardar Observación de Seguimiento de la Ficha
  const handleSaveTrackingRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFicha || !newTrackingLearnerId || !newTrackingDescription.trim()) return;
    setIsSavingTracking(true);
    try {
      const now = new Date().toISOString();
      await trackingService.saveLearnerRecord({
        id: `rec_${Date.now()}`,
        fichaId: activeFicha.id,
        userId: newTrackingLearnerId,
        type: newTrackingType,
        category: newTrackingCategory as any,
        description: newTrackingDescription.trim(),
        createdBy: instructorUid,
        date: now.split('T')[0],
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      setIsAddTrackingModalOpen(false);
      setNewTrackingDescription('');
      setNewTrackingLearnerId('');
      const updated = await trackingService.getLearnerRecords(activeFicha.id);
      setClassTrackingRecords(updated.data || []);
    } catch (err) {
      console.warn('[InstructorFichasView] Error guardando seguimiento:', err);
    } finally {
      setIsSavingTracking(false);
    }
  };

  // Guardar nueva Ficha (Sección 6) - Cero dependencia de Cursos
  const handleCreateFichaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFichaFormError(null);

    const rawNumber = newFichaNumber.trim();
    const rawName = newFichaName.trim();

    if (!rawName) {
      setFichaFormError('El nombre descriptivo de la ficha / clase es obligatorio.');
      return;
    }
    if (!rawNumber) {
      setFichaFormError('El número de ficha es obligatorio.');
      return;
    }

    setIsSavingFicha(true);

    try {
      const now = new Date().toISOString();
      const fichaId = `ficha_${rawNumber}`;

      // Asignar ID de programa por compatibilidad interna sin requerir input del instructor
      const defaultProg = programs[0] || null;
      const programId = defaultProg?.id || 'prog_gestion_academica';

      const realInstructorUid = auth.currentUser?.uid || instructorUid;
      if (!realInstructorUid) {
        setFichaFormError('No se detectó una sesión de instructor activa. Por favor recarga e inicia sesión.');
        return;
      }

      const newFicha: Ficha = {
        id: fichaId,
        number: rawNumber,
        name: rawName,
        description: newDescription.trim() || `Ficha ${rawNumber} - ${rawName}`,
        programId,
        programName: rawName,
        centerId: newCenterId || centers[0]?.id || 'center_comercio_servicios',
        instructorIds: [realInstructorUid],
        createdBy: realInstructorUid,
        startDate: newStartDate ? `${newStartDate}T00:00:00Z` : now,
        endDate: newEndDate ? `${newEndDate}T00:00:00Z` : '2028-12-31T00:00:00Z',
        status: 'active',
        shift: newShift,
        stage: 'lectiva',
        createdAt: now,
        updatedAt: now,
      };

      const saved = await fichaService.saveFicha(newFicha);
      setFichas((prev) => [saved, ...prev.filter((f) => f.id !== saved.id)]);
      setActiveFichaId(saved.id);
      setViewMode('grid');
      setIsCreateFichaModalOpen(false);

      // Limpiar formulario
      setNewFichaName('');
      setNewFichaNumber('');
      setNewDescription('');
      setNewStartDate('');
      setNewEndDate('');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
      }

      // Sincronizar catálogo con Firestore de forma reactiva
      await loadFichasAndCatalogs();
    } catch (err: any) {
      console.warn('[InstructorFichasView] Error guardando ficha:', err);
      setFichaFormError(err.message || 'No fue posible guardar la ficha.');
    } finally {
      setIsSavingFicha(false);
    }
  };

  // Guardar edición de Ficha
  const handleEditFichaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFicha) return;

    try {
      const updated: Ficha = {
        ...activeFicha,
        name: editFichaName.trim() || activeFicha.name,
        number: editFichaNumber.trim() || activeFicha.number,
        programName: editProgramName.trim() || activeFicha.programName,
        shift: editShift,
        stage: editStage,
        description: editDescription.trim() || activeFicha.description,
        updatedAt: new Date().toISOString(),
      };

      const saved = await fichaService.saveFicha(updated);
      setFichas((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
      setIsEditFichaModalOpen(false);
    } catch (err) {
      console.warn('[InstructorFichasView] Error editando ficha:', err);
    }
  };

  // PROMPT 27: Abrir modal de confirmación de eliminación con estadísticas reales de Firestore
  const openDeleteFichaModal = async (targetFicha: Ficha) => {
    setFichaToDelete(targetFicha);
    setDeleteFichaError(null);
    setIsDeleteFichaModalOpen(true);
    setLoadingDeleteStats(true);
    try {
      const stats = await fichaService.getFichaStats(targetFicha.id);
      setDeleteFichaStats(stats);
    } catch {
      setDeleteFichaStats({
        apprenticesCount: fichaStats[targetFicha.id]?.apprenticesCount || 0,
        activitiesCount: fichaStats[targetFicha.id]?.activitiesCount || 0,
        submissionsCount: 0,
      });
    } finally {
      setLoadingDeleteStats(false);
    }
  };

  // PROMPT 27: Confirmar eliminación de la ficha
  const handleConfirmDeleteFicha = async () => {
    if (!fichaToDelete) return;
    setIsDeletingFicha(true);
    setDeleteFichaError(null);
    try {
      await fichaService.deleteFicha(fichaToDelete.id, instructorUid);
      setIsDeleteFichaModalOpen(false);
      const deletedId = fichaToDelete.id;
      setFichaToDelete(null);

      // Si la ficha eliminada era la ficha activa, volver al grid y limpiar estado
      if (activeFichaId === deletedId) {
        setActiveFichaId('');
        setViewMode('grid');
        setClassApprentices([]);
        setClassActivities([]);
        setClassSubmissions([]);
        onBackToList?.();
      }

      await loadFichasAndCatalogs();
    } catch (err: any) {
      console.error('[InstructorFichasView] Error eliminando ficha:', err);
      setDeleteFichaError(err?.message || 'Error al eliminar la ficha de formación.');
    } finally {
      setIsDeletingFicha(false);
    }
  };

  // PROMPT 27: Abrir modal para quitar aprendiz de la ficha
  const openRemoveLearnerModal = (apprentice: ApprenticeWithEnrollment) => {
    setLearnerToRemove(apprentice);
    setRemoveLearnerError(null);
    setIsRemoveLearnerModalOpen(true);
  };

  // PROMPT 27: Confirmar desvinculación del aprendiz
  const handleConfirmRemoveLearner = async () => {
    if (!learnerToRemove) return;
    setIsRemovingLearner(true);
    setRemoveLearnerError(null);
    try {
      await enrollmentService.removeLearnerFromFicha(learnerToRemove.enrollmentId, instructorUid);
      setIsRemoveLearnerModalOpen(false);
      setLearnerToRemove(null);
      await loadActiveFichaClassData();
      await loadFichasAndCatalogs();
    } catch (err: any) {
      console.error('[InstructorFichasView] Error desvinculando aprendiz:', err);
      setRemoveLearnerError(err?.message || 'Error al desvincular el aprendiz de la ficha.');
    } finally {
      setIsRemovingLearner(false);
    }
  };

  // Publicar Anuncio rápido en el Muro de la Ficha
  const handleQuickPublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFicha || !newAnnouncementTitle.trim() || !newAnnouncementMessage.trim()) return;

    setIsPublishingAnnouncement(true);
    try {
      const newAnn = await announcementService.saveAnnouncement({
        title: newAnnouncementTitle.trim(),
        message: newAnnouncementMessage.trim(),
        targetType: 'FICHA',
        targetIds: [activeFicha.id],
        fichaIds: [activeFicha.id],
        programIds: activeFicha.programId ? [activeFicha.programId] : [],
        createdBy: instructorUid,
        creatorName: userProfile?.displayName || 'Instructor SENA',
        creatorEmail: userProfile?.email || 'instructor@sena.edu.co',
        status: 'PUBLISHED',
      });

      setClassAnnouncements((prev) => [newAnn, ...prev]);
      setNewAnnouncementTitle('');
      setNewAnnouncementMessage('');
    } catch (err) {
      console.warn('[InstructorFichasView] Error publicando anuncio en muro:', err);
    } finally {
      setIsPublishingAnnouncement(false);
    }
  };

  // =========================================================================
  // PROMPT 33: FLUJO DIRECTO DE EVALUACIÓN DE EVIDENCIAS DESDE LA ACTIVIDAD
  // =========================================================================

  // Abrir modal de entregas para una actividad específica de la ficha
  const handleOpenActivitySubmissions = async (activity: EvidenceActivity) => {
    if (!activeFicha) return;
    setSelectedActivityForGrading(activity);
    setActivitySubmissionFilterStatus('all');
    setActivitySubmissionSearchTerm('');
    setIsActivitySubmissionsModalOpen(true);
    setLoadingActivitySubmissions(true);

    try {
      // PROMPT 33: Consulta filtrada por fichaId y activityId reales en Firestore
      const res = await submissionService.getAllSubmissions({
        fichaId: activeFicha.id,
        instructorId: instructorUid,
      });

      // Combinar con entregas ya cargadas en memoria y estado local de la ficha
      const combinedPool = [
        ...classSubmissions,
        ...(res.data || []),
      ];
      const map = new Map<string, AcademicSubmission>();
      combinedPool.forEach((s) => {
        if (s.id) map.set(s.id, s);
      });
      const allFichaSubs = Array.from(map.values());

      const activitySubs = allFichaSubs.filter(
        (s) =>
          s.activityId === activity.id ||
          (s.activityTitle && activity.title && s.activityTitle.trim().toLowerCase() === activity.title.trim().toLowerCase())
      );
      setActivitySubmissionsList(activitySubs);

      // Cargar evaluaciones de rúbricas existentes si la actividad tiene rúbrica
      if (activity.rubricId) {
        const evals: Record<string, RubricEvaluation> = {};
        for (const s of activitySubs) {
          try {
            const ev = await rubricService.getRubricEvaluation(s.id, s.version || 1);
            if (ev) evals[s.id] = ev;
          } catch (e) {
            // ignore
          }
        }
        setEvaluationsMap((prev) => ({ ...prev, ...evals }));
      }
    } catch (err) {
      console.warn('[InstructorFichasView] Error cargando entregas de la actividad:', err);
      // Fallback a classSubmissions en memoria de la ficha
      const localSubs = classSubmissions.filter(
        (s) =>
          s.activityId === activity.id ||
          (s.activityTitle && activity.title && s.activityTitle.trim().toLowerCase() === activity.title.trim().toLowerCase())
      );
      setActivitySubmissionsList(localSubs);
    } finally {
      setLoadingActivitySubmissions(false);
    }
  };

  // Sincronizar en tiempo real cuando cualquier entrega sea calificada en el sistema
  useEffect(() => {
    const handleSubmissionGradedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<AcademicSubmission>;
      if (customEvent.detail && customEvent.detail.id) {
        const updated = customEvent.detail;
        setActivitySubmissionsList((prev) => {
          const exists = prev.some((s) => s.id === updated.id);
          return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
        });
        setClassSubmissions((prev) => {
          const exists = prev.some((s) => s.id === updated.id);
          return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
        });
      }
    };

    window.addEventListener('sena_submission_graded', handleSubmissionGradedEvent);
    return () => {
      window.removeEventListener('sena_submission_graded', handleSubmissionGradedEvent);
    };
  }, []);

  // Atajos de teclado para calificación en el modal (A = Aprobar, N = No aprobar, C = Corregir, Enter = Guardar)
  useEffect(() => {
    if (!isGradingModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (isInputActive) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleSaveGradeModal();
        }
        return;
      }

      const key = e.key.toUpperCase();
      if (key === 'A') {
        e.preventDefault();
        setSelectedGradeCode('A');
        setGradingModalError(null);
      } else if (key === 'N') {
        e.preventDefault();
        setSelectedGradeCode('N');
        setGradingModalError(null);
      } else if (key === 'C') {
        e.preventDefault();
        setSelectedGradeCode('C');
        setGradingModalError(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveGradeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGradingModalOpen, selectedGradeCode, feedbackInput, selectedSubmissionForGrade, isSavingGrade]);

  // Abrir modal de calificación individual [A] [N] [C] o Rúbrica
  const handleOpenGradingModal = async (
    sub: AcademicSubmission,
    defaultGrade: AcademicGradeCode = 'A',
    initialTab: 'official' | 'rubric' = 'official'
  ) => {
    setSelectedSubmissionForGrade(sub);
    setSelectedGradeCode((sub.grade as AcademicGradeCode) || defaultGrade);
    setFeedbackInput(sub.feedback || '');
    setActiveGradingTab(initialTab);
    setGradingModalError(null);
    setIsGradingModalOpen(true);

    // Cargar rúbrica si la actividad tiene una vinculada
    const act = classActivities.find((a) => a.id === sub.activityId) || selectedActivityForGrading;
    if (act?.rubricId) {
      setLoadingRubric(true);
      try {
        const rub = await rubricService.getRubric(act.rubricId);
        setCurrentRubric(rub);

        const existingEval =
          evaluationsMap[sub.id] ||
          (await rubricService.getRubricEvaluation(sub.id, sub.version || 1));
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
        console.warn('[InstructorFichasView] Error cargando rúbrica:', err);
        setCurrentRubric(null);
        setRubricResults(null);
      } finally {
        setLoadingRubric(false);
      }
    } else {
      setCurrentRubric(null);
      setRubricResults(null);
    }
  };

  // Evaluación rápida inline desde la tabla de la actividad [A] [N] [C]
  const handleQuickInlineGrade = async (sub: AcademicSubmission, gradeCode: AcademicGradeCode) => {
    if (!sub.id || gradingSubmissionId === sub.id) return;
    setGradingSubmissionId(sub.id);

    const defaultFeedback =
      sub.feedback ||
      (gradeCode === 'A'
        ? 'Evidencia aprobada satisfactoriamente.'
        : gradeCode === 'C'
        ? 'Evidencia devuelta para corrección pedagógica.'
        : 'Evidencia no aprobada.');

    try {
      const updated = await submissionService.gradeSubmission({
        submissionId: sub.id,
        gradeCode,
        feedback: defaultFeedback,
        instructorId: instructorUid,
        instructorName: userProfile?.displayName || 'Instructor SENA',
        submission: sub,
      });

      if (updated) {
        // Actualizar listas reactivamente sin recargar
        setActivitySubmissionsList((prev) => {
          const exists = prev.some((s) => s.id === updated.id);
          return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
        });
        setClassSubmissions((prev) => {
          const exists = prev.some((s) => s.id === updated.id);
          return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
        });

        // PROMPT 38: Retirar exclusión de la actividad seleccionada y de actividades en memoria al calificar con A, N o C
        const targetLearnerId = updated.learnerId || updated.userId || sub.learnerId || sub.userId;
        if (targetLearnerId) {
          setSelectedActivityForGrading((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              excludedLearnerIds: (prev.excludedLearnerIds || []).filter((id) => id !== targetLearnerId),
            };
          });

          setClassActivities((prev) =>
            prev.map((act) =>
              act.id === (updated.activityId || selectedActivityForGrading?.id)
                ? {
                    ...act,
                    excludedLearnerIds: (act.excludedLearnerIds || []).filter((id) => id !== targetLearnerId),
                  }
                : act
            )
          );
        }

        if (activeFicha) {
          setFichaStats((prev) => {
            const current = prev[activeFicha.id];
            if (!current) return prev;
            const wasGraded = Boolean(sub.grade);
            const isNowGraded = Boolean(updated.grade);
            return {
              ...prev,
              [activeFicha.id]: {
                ...current,
                pendingSubmissionsCount:
                  wasGraded === isNowGraded
                    ? current.pendingSubmissionsCount
                    : isNowGraded
                    ? Math.max(0, current.pendingSubmissionsCount - 1)
                    : current.pendingSubmissionsCount + 1,
              },
            };
          });
        }

        const label =
          gradeCode === 'A'
            ? 'APROBADA (A)'
            : gradeCode === 'C'
            ? 'marcada para CORREGIR (C)'
            : 'NO APROBADA (N)';
        showToast(`Evidencia de ${sub.learnerName || 'Aprendiz'} ${label} exitosamente.`);
      }
    } catch (err: any) {
      console.error('[InstructorFichasView] Error en calificación rápida:', {
        code: err?.code,
        message: err?.message,
        details: err,
      });
      showToast(`No se pudo guardar la calificación: ${err?.message || 'Error en Firestore'}`);
    } finally {
      setGradingSubmissionId(null);
    }
  };

  // Calificación masiva controlada («Calificar todo»)
  const handleStartBulkGrading = async (
    targetRows: any[],
    mode: 'all' | 'unsubmitted_n' | 'delivered_a',
    gradeToApply: AcademicGradeCode,
    feedbackText: string
  ) => {
    if (!selectedActivityForGrading || !activeFicha || isExecutingBulk) return;
    if (targetRows.length === 0) {
      showToast('No hay aprendices aplicables para esta operación masiva.');
      return;
    }

    setIsExecutingBulk(true);
    setBulkProgress({ current: 0, total: targetRows.length, currentName: '' });

    const successList: AcademicSubmission[] = [];
    const failedList: Array<{ learnerId: string; learnerName: string; error: string; row: any }> = [];

    const feedbackToUse =
      feedbackText.trim() ||
      (mode === 'unsubmitted_n'
        ? 'No presentó evidencia formativa en los plazos y condiciones estipuladas.'
        : mode === 'delivered_a'
        ? 'Evidencia formativa aprobada satisfactoriamente.'
        : gradeToApply === 'A'
        ? 'Evidencia aprobada satisfactoriamente.'
        : gradeToApply === 'C'
        ? 'Evidencia devuelta para corrección pedagógica.'
        : 'Evidencia no aprobada.');

    for (let i = 0; i < targetRows.length; i++) {
      const row = targetRows[i];
      setBulkProgress({
        current: i + 1,
        total: targetRows.length,
        currentName: row.learnerName,
      });

      try {
        const updated = await submissionService.gradeSubmission({
          submissionId: row.submission.id,
          gradeCode: gradeToApply,
          feedback: feedbackToUse,
          instructorId: instructorUid,
          instructorName: userProfile?.displayName || 'Instructor SENA',
          submission: {
            ...row.submission,
            learnerId: row.learnerId,
            userId: row.learnerId,
            learnerName: row.learnerName,
            learnerEmail: row.learnerEmail,
            fichaId: activeFicha.id,
            activityId: selectedActivityForGrading.id,
            activityTitle: selectedActivityForGrading.title,
          },
        });

        if (updated) {
          successList.push(updated);
          setActivitySubmissionsList((prev) => {
            const exists = prev.some((s) => s.id === updated.id);
            return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
          });
          setClassSubmissions((prev) => {
            const exists = prev.some((s) => s.id === updated.id);
            return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
          });
        }
      } catch (err: any) {
        console.error(`[InstructorFichasView] Error calificando masivamente a ${row.learnerName}:`, {
          code: err?.code,
          message: err?.message,
          details: err,
        });
        failedList.push({
          learnerId: row.learnerId,
          learnerName: row.learnerName,
          error: err?.message || 'Error de persistencia en Firestore',
          row,
        });
      }

      // Pequeño descanso de 30ms para fluidez de UI y no saturar Firestore
      await new Promise((res) => setTimeout(res, 30));
    }

    // Actualizar contadores globales de la ficha
    if (activeFicha && successList.length > 0) {
      setFichaStats((prev) => {
        const current = prev[activeFicha.id];
        if (!current) return prev;
        return {
          ...prev,
          [activeFicha.id]: {
            ...current,
            pendingSubmissionsCount: Math.max(0, current.pendingSubmissionsCount - successList.length),
          },
        };
      });
    }

    setIsExecutingBulk(false);
    setBulkResultSummary({
      totalProcessed: targetRows.length,
      successCount: successList.length,
      failedItems: failedList,
    });

    if (failedList.length === 0) {
      showToast(`Se aplicó dictamen ${gradeToApply} a ${successList.length} aprendices exitosamente.`);
    } else {
      showToast(`Calificación masiva: ${successList.length} guardadas, ${failedList.length} fallidas.`);
    }
  };

  // Exclusión individual de evidencia (Botón E - Excluir)
  const handleConfirmExclusion = async () => {
    if (!selectedRowForExclusion || !selectedActivityForGrading || !activeFicha || isSavingExclusion) return;
    setIsSavingExclusion(true);

    try {
      const updated = await submissionService.excludeLearnerFromActivity({
        submissionId: selectedRowForExclusion.submission.id,
        activityId: selectedActivityForGrading.id,
        activityTitle: selectedActivityForGrading.title,
        fichaId: activeFicha.id,
        learnerId: selectedRowForExclusion.learnerId,
        learnerName: selectedRowForExclusion.learnerName,
        learnerEmail: selectedRowForExclusion.learnerEmail,
        instructorId: instructorUid,
        instructorName: userProfile?.displayName || 'Instructor SENA',
        reason: exclusionReasonInput.trim() || 'Exonerado de evidencia por el instructor',
        submission: selectedRowForExclusion.submission,
      });

      if (updated) {
        setActivitySubmissionsList((prev) => {
          const exists = prev.some((s) => s.id === updated.id);
          return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
        });
        setSelectedActivityForGrading((prev) => {
          if (!prev) return prev;
          const currentIds = prev.excludedLearnerIds || [];
          if (currentIds.includes(selectedRowForExclusion.learnerId)) return prev;
          return {
            ...prev,
            excludedLearnerIds: [...currentIds, selectedRowForExclusion.learnerId],
          };
        });

        showToast(`Aprendiz ${selectedRowForExclusion.learnerName} excluido de esta evidencia (E).`);
        setIsExclusionModalOpen(false);
        setSelectedRowForExclusion(null);
        setExclusionReasonInput('');
      }
    } catch (err: any) {
      console.error('[InstructorFichasView] Error al excluir aprendiz:', {
        code: err?.code,
        message: err?.message,
      });
      showToast(`No se pudo excluir al aprendiz: ${err?.message || 'Error en Firestore'}`);
    } finally {
      setIsSavingExclusion(false);
    }
  };

  // Retirar exclusión y rehabilitar aprendiz
  const handleRemoveExclusion = async () => {
    if (!selectedRowForExclusion || !selectedActivityForGrading || !activeFicha || isSavingExclusion) return;
    setIsSavingExclusion(true);

    try {
      const updated = await submissionService.removeExclusionFromActivity({
        submissionId: selectedRowForExclusion.submission.id,
        activityId: selectedActivityForGrading.id,
        fichaId: activeFicha.id,
        learnerId: selectedRowForExclusion.learnerId,
        instructorId: instructorUid,
      });

      if (updated) {
        setActivitySubmissionsList((prev) => {
          return prev.map((s) => (s.id === updated.id ? updated : s));
        });
        setSelectedActivityForGrading((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            excludedLearnerIds: (prev.excludedLearnerIds || []).filter(
              (id) => id !== selectedRowForExclusion.learnerId
            ),
          };
        });

        showToast(`Exclusión retirada para ${selectedRowForExclusion.learnerName}. Aprendiz rehabilitado.`);
        setIsExclusionModalOpen(false);
        setSelectedRowForExclusion(null);
      }
    } catch (err: any) {
      console.error('[InstructorFichasView] Error al retirar exclusión:', {
        code: err?.code,
        message: err?.message,
      });
      showToast(`No se pudo retirar la exclusión: ${err?.message || 'Error en Firestore'}`);
    } finally {
      setIsSavingExclusion(false);
    }
  };

  // Guardar calificación desde el Modal de Evaluación (A/N/C + Rúbrica pedagógica)
  const handleSaveGradeModal = async () => {
    if (!selectedSubmissionForGrade || isSavingGrade) return;
    setGradingModalError(null);

    // 1. Validar datos obligatorios: dictamen C requiere retroalimentación
    if (selectedGradeCode === 'C' && !feedbackInput.trim()) {
      setGradingModalError(
        'El dictamen C (Corregir) requiere retroalimentación obligatoria explicando al aprendiz qué aspectos debe ajustar para su reenvío.'
      );
      return;
    }

    setIsSavingGrade(true);

    try {
      let rubricEvalId: string | undefined;
      let rubricScore: number | undefined;
      let rubricMaxScore: number | undefined;
      let rubricPercentage: number | undefined;

      // 1. Guardar evaluación de rúbrica si está configurada
      if (currentRubric && rubricResults && rubricResults.criteriaResults.length > 0) {
        try {
          const evalRes = await rubricService.evaluateSubmissionWithRubric({
            rubricId: currentRubric.id,
            activityId: selectedSubmissionForGrade.activityId,
            submissionId: selectedSubmissionForGrade.id,
            learnerId: selectedSubmissionForGrade.learnerId || selectedSubmissionForGrade.userId,
            learnerName: selectedSubmissionForGrade.learnerName,
            fichaId: selectedSubmissionForGrade.fichaId || activeFicha?.id || '',
            evaluatorId: instructorUid,
            evaluatorName: userProfile?.displayName || 'Instructor SENA',
            version: selectedSubmissionForGrade.version || 1,
            criteriaResults: rubricResults.criteriaResults,
            generalFeedback: feedbackInput.trim(),
          });
          rubricEvalId = evalRes.id;
          rubricScore = evalRes.totalPoints;
          rubricMaxScore = evalRes.totalPossiblePoints;
          rubricPercentage = evalRes.percentage;
          setEvaluationsMap((prev) => ({ ...prev, [selectedSubmissionForGrade.id]: evalRes }));
        } catch (rubErr) {
          console.warn('[InstructorFichasView] Error guardando evaluación de rúbrica:', rubErr);
        }
      }

      // 2. Guardar dictamen oficial SENA en /submissions/{submissionId}
      // Reutiliza exactamente submissionService.gradeSubmission y su disparo de notificaciones
      const updated = await submissionService.gradeSubmission({
        submissionId: selectedSubmissionForGrade.id,
        gradeCode: selectedGradeCode,
        feedback: feedbackInput.trim(),
        instructorId: instructorUid,
        instructorName: userProfile?.displayName || 'Instructor SENA',
        rubricEvaluationId: rubricEvalId,
        rubricScore,
        rubricMaxScore,
        rubricPercentage,
        submission: selectedSubmissionForGrade,
      });

      if (!updated) {
        throw new Error('No se pudo confirmar el guardado en la base de datos. Por favor intenta de nuevo.');
      }

      // Actualizar estados reactivamente de forma inmediata
      setActivitySubmissionsList((prev) => {
        const exists = prev.some((s) => s.id === updated.id);
        return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
      });
      setClassSubmissions((prev) => {
        const exists = prev.some((s) => s.id === updated.id);
        return exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
      });

      // PROMPT 38: Retirar exclusión de la actividad seleccionada y de actividades en memoria al calificar desde modal
      const targetLearnerId =
        updated.learnerId ||
        updated.userId ||
        selectedSubmissionForGrade.learnerId ||
        selectedSubmissionForGrade.userId;

      if (targetLearnerId) {
        setSelectedActivityForGrading((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            excludedLearnerIds: (prev.excludedLearnerIds || []).filter((id) => id !== targetLearnerId),
          };
        });

        setClassActivities((prev) =>
          prev.map((act) =>
            act.id === (updated.activityId || selectedActivityForGrading?.id)
              ? {
                  ...act,
                  excludedLearnerIds: (act.excludedLearnerIds || []).filter((id) => id !== targetLearnerId),
                }
              : act
          )
        );
      }

      if (activeFicha) {
        setFichaStats((prev) => {
          const current = prev[activeFicha.id];
          if (!current) return prev;
          const wasGraded = Boolean(selectedSubmissionForGrade.grade);
          return {
            ...prev,
            [activeFicha.id]: {
              ...current,
              pendingSubmissionsCount: wasGraded
                ? current.pendingSubmissionsCount
                : Math.max(0, current.pendingSubmissionsCount - 1),
            },
          };
        });
      }

      setIsGradingModalOpen(false);
      setSelectedSubmissionForGrade(null);
      showToast(
        `Calificación guardada: ${
          selectedGradeCode === 'A'
            ? 'A — Aprobado'
            : selectedGradeCode === 'N'
            ? 'N — No aprobado'
            : 'C — Corregir'
        }${rubricResults ? ` · Rúbrica (${rubricResults.percentage}%)` : ''} exitosamente.`
      );
    } catch (err: any) {
      console.error('[InstructorFichasView] Error guardando calificación:', {
        code: err?.code,
        message: err?.message,
        details: err,
      });
      const codeSuffix = err?.code ? ` [Código: ${err.code}]` : '';
      setGradingModalError(
        (err?.message || 'Ocurrió un error guardando el dictamen en Firestore. Por favor reintenta.') + codeSuffix
      );
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Filtrado de Fichas para el Muro principal
  const filteredFichas = useMemo(() => {
    return fichas.filter((f) => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        f.number.toLowerCase().includes(term) ||
        (f.name && f.name.toLowerCase().includes(term)) ||
        (f.programName && f.programName.toLowerCase().includes(term))
      );
    });
  }, [fichas, searchTerm]);

  // Diccionario visual de Jornada y Etapa
  const shiftLabels: Record<string, { label: string; badge: string }> = {
    morning: { label: 'Diurna (Mañana)', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
    afternoon: { label: 'Tarde', badge: 'bg-orange-100 text-orange-800 border-orange-300' },
    evening: { label: 'Nocturna', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  };

  // =========================================================================
  // VISTA 2: DENTRO DE UNA FICHA (ESPACIO PROPIO DE LA FICHA - GOOGLE CLASSROOM)
  // =========================================================================
  if (viewMode === 'detail') {
    // Si todavía está cargando fichas
    if (loading && !activeFicha) {
      return (
        <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-[#39A900] mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Cargando ambiente formativo de la Ficha...</p>
        </div>
      );
    }

    // Si la ficha no fue encontrada en Firestore
    if (!loading && !activeFicha) {
      return (
        <div className="py-16 bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Ficha no encontrada</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            No se encontró ninguna ficha formativa activa con el identificador "{activeFichaId}".
          </p>
          <button
            onClick={() => {
              setViewMode('grid');
              setActiveFichaId('');
              onBackToList?.();
            }}
            className="px-4 py-2 bg-[#00324D] hover:bg-[#004A73] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            ← Volver a Mis Fichas
          </button>
        </div>
      );
    }

    // PROMPT 29: Validación de seguridad institucional (Sección 27)
    if (activeFicha && !isAuthorizedInstructor) {
      return (
        <div className="py-16 bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Acceso No Autorizado a esta Ficha</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            No estás asignado como instructor autorizado para la Ficha #{activeFicha.number} (
            {activeFicha.name || activeFicha.programName}). Por seguridad institucional del SENA,
            solo los instructores formalmente vinculados pueden gestionar esta clase.
          </p>
          <button
            onClick={() => {
              setViewMode('grid');
              setActiveFichaId('');
              onBackToList?.();
            }}
            className="px-4 py-2 bg-[#00324D] hover:bg-[#004A73] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            ← Volver a Mis Fichas
          </button>
        </div>
      );
    }

    if (activeFicha) {
      const livePendingCount = classSubmissions.filter(
        (s) => s.status === 'submitted' || s.status === 'under_review' || !s.grade
      ).length;
      const stats = {
        apprenticesCount: classApprentices.length,
        activitiesCount: classActivities.length,
        pendingSubmissionsCount: livePendingCount,
      };
      const center = centers.find((c) => c.id === activeFicha.centerId);

      // Métricas de asistencia
      const presentCount = Object.values(attendanceStatuses).filter((s) => s === 'PRESENTE').length;
      const absentCount = Object.values(attendanceStatuses).filter((s) => s === 'AUSENTE').length;
      const lateCount = Object.values(attendanceStatuses).filter((s) => s === 'TARDE').length;
      const excusedCount = Object.values(attendanceStatuses).filter((s) => s === 'EXCUSADO').length;
      const totalSessionApps = classApprentices.length;
      const attRate =
        totalSessionApps > 0 ? Math.round(((presentCount + lateCount * 0.8 + excusedCount) / totalSessionApps) * 100) : 100;

      // Métricas de calificaciones
      const gradedCount = classSubmissions.filter((s) => Boolean(s.grade)).length;
      const approvedCount = classSubmissions.filter((s) => s.grade === 'A').length;
      const unapprovedCount = classSubmissions.filter((s) => s.grade === 'N' || s.grade === 'C').length;
      const passingRate = gradedCount > 0 ? Math.round((approvedCount / gradedCount) * 100) : 100;

      // Filtrado de aprendices
      const filteredApprentices = classApprentices.filter((app) => {
        const term = apprenticeSearchTerm.toLowerCase().trim();
        const matchesTerm =
          !term ||
          app.displayName.toLowerCase().includes(term) ||
          app.email.toLowerCase().includes(term) ||
          (app.documentNumber && app.documentNumber.includes(term));

        if (!matchesTerm) return false;
        if (apprenticeStatusFilter === 'active') return app.enrollmentStatus !== 'withdrawn';
        if (apprenticeStatusFilter === 'withdrawn') return app.enrollmentStatus === 'withdrawn';
        return true;
      });

      // PROMPT 35: Deduplicación respetando la versión vigente para no contar versiones anteriores como entregas independientes
      const activeClassSubmissions = (() => {
        const map = new Map<string, AcademicSubmission>();
        classSubmissions.forEach((sub) => {
          const key = `${sub.activityId}_${sub.learnerId || sub.userId}`;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, sub);
          } else {
            const existingTime = new Date(existing.submittedAt || 0).getTime();
            const newTime = new Date(sub.submittedAt || 0).getTime();
            const existingVer = existing.version || 1;
            const newVer = sub.version || 1;
            if (newVer > existingVer || (newVer === existingVer && newTime > existingTime)) {
              map.set(key, sub);
            }
          }
        });
        return Array.from(map.values());
      })();

      // Indicadores pedagógicos reales calculados para la ficha activa (Sección 3.G)
      const fichaSubmissionStats = submissionService.calculateStats(activeClassSubmissions);

      // Filtrado multicriterio de evidencias de la ficha (Sección 3.B)
      const filteredSubmissions = activeClassSubmissions.filter((sub) => {
        // 1. Filtro rápido de estado
        if (submissionQuickFilter === 'pending') {
          const isPending = sub.status === 'submitted' || sub.status === 'under_review' || !sub.grade;
          if (!isPending) return false;
        } else if (submissionQuickFilter === 'graded') {
          if (!sub.grade) return false;
        }

        // 2. Filtro por actividad de la ficha
        if (submissionFilterActivityId !== 'all' && sub.activityId !== submissionFilterActivityId) {
          return false;
        }

        // 3. Filtro por estado / dictamen A/N/C
        if (submissionFilterGrade !== 'all') {
          if (submissionFilterGrade === 'pending') {
            if (sub.grade) return false;
          } else if (submissionFilterGrade === 'approved') {
            if (sub.grade !== 'A') return false;
          } else if (submissionFilterGrade === 'correction_required') {
            if (sub.grade !== 'C') return false;
          } else if (submissionFilterGrade === 'not_approved') {
            if (sub.grade !== 'N') return false;
          } else if (sub.grade !== submissionFilterGrade) {
            return false;
          }
        }

        // 4. Filtro por fecha de radicación
        if (submissionFilterDate) {
          const subDate = sub.submittedAt ? sub.submittedAt.split('T')[0] : '';
          if (subDate !== submissionFilterDate) return false;
        }

        // 5. Búsqueda por aprendiz o correo
        if (submissionSearchTerm.trim()) {
          const term = submissionSearchTerm.toLowerCase().trim();
          const matchLearner = (sub.learnerName || '').toLowerCase().includes(term);
          const matchEmail = (sub.learnerEmail || '').toLowerCase().includes(term);
          const matchFile = (sub.fileName || '').toLowerCase().includes(term);
          const matchAct = (sub.activityTitle || '').toLowerCase().includes(term);
          if (!matchLearner && !matchEmail && !matchFile && !matchAct) {
            return false;
          }
        }

        return true;
      });

      const hasActiveSubmissionFilters =
        submissionSearchTerm !== '' ||
        submissionFilterActivityId !== 'all' ||
        submissionFilterGrade !== 'all' ||
        submissionFilterDate !== '' ||
        submissionQuickFilter !== 'all';

      const handleResetSubmissionFilters = () => {
        setSubmissionSearchTerm('');
        setSubmissionFilterActivityId('all');
        setSubmissionFilterGrade('all');
        setSubmissionFilterDate('');
        setSubmissionQuickFilter('all');
      };

      // PROMPT 33: Interfaz y conjunto unificado de aprendices matriculados y sus evidencias para la actividad
      interface ActivityLearnerRow {
        key: string;
        learnerId: string;
        learnerName: string;
        learnerEmail: string;
        learnerPhoto?: string;
        documentNumber?: string;
        submission: AcademicSubmission;
        hasDelivered: boolean;
        grade?: AcademicGradeCode;
        status: SubmissionAcademicStatus | 'pending';
        submittedAt?: string | null;
        isExcluded: boolean;
        excludedAt?: string;
        excludedByName?: string;
        exclusionReason?: string;
      }

      const activityLearnerRows: ActivityLearnerRow[] = (() => {
        if (!selectedActivityForGrading) return [];

        const matchedSubIds = new Set<string>();

        // Usar la lista real de aprendices matriculados o fallback representativo de la ficha
        const apprenticesSource =
          classApprentices.length > 0
            ? classApprentices
            : DEMO_APPRENTICES_LIST.map((demo) => ({
                uid: demo.id,
                displayName: demo.fullName,
                documentNumber: demo.documentNumber || '—',
                email: demo.email,
                photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  demo.fullName
                )}&background=00324D&color=8CE665`,
                status: 'active' as const,
                enrollmentId: `enr_${activeFicha.id}_${demo.id}`,
                enrollmentStatus: 'active',
                programName: activeFicha.programName || activeFicha.name || demo.programName,
                fichaNumber: activeFicha.number,
                courseName: 'Formación Integral SENA',
                progressPercent: demo.progressPercent || 0,
                averageGrade: 'N/A',
                attendanceRate: 100,
                punctualityRate: 100,
                submittedEvidencesCount: demo.activitiesSubmittedCount || 0,
                totalEvidencesCount: 10,
                activeAttentionCallsCount: 0,
                hasActiveRestrictions: false,
                academicNotesCount: 0,
                behavioralNotesCount: 0,
                assignedAt: new Date().toISOString(),
                assignedByName: 'Sistema Académico SENA',
              }));

        const rows: ActivityLearnerRow[] = apprenticesSource.map((app) => {
          const sub = activitySubmissionsList.find(
            (s) =>
              (s.learnerId && s.learnerId === app.uid) ||
              (s.userId && s.userId === app.uid) ||
              (s.learnerEmail && app.email && s.learnerEmail.toLowerCase() === app.email.toLowerCase())
          );

          // PROMPT 38: Priorizar el estado de exclusión explícito de la entrega si existe
          const isExcluded = sub && typeof sub.isExcluded === 'boolean'
            ? sub.isExcluded
            : Boolean(
                (selectedActivityForGrading?.excludedLearnerIds &&
                  selectedActivityForGrading.excludedLearnerIds.includes(app.uid)) ||
                  sub?.status === 'exonerated' ||
                  sub?.status === 'excluded'
              );

          if (sub) {
            matchedSubIds.add(sub.id);
            const hasDelivered = Boolean(
              sub.fileName ||
              sub.driveFileUrl ||
              sub.driveUrl ||
              sub.driveFileId ||
              sub.externalUrl ||
              sub.textContent
            );
            return {
              key: `app_${app.uid}`,
              learnerId: app.uid,
              learnerName: app.displayName || sub.learnerName || 'Aprendiz',
              learnerEmail: app.email || sub.learnerEmail || '',
              learnerPhoto: app.photoURL || undefined,
              documentNumber: app.documentNumber || undefined,
              submission: sub,
              hasDelivered,
              grade: sub.grade as AcademicGradeCode | undefined,
              status: sub.status,
              submittedAt: sub.submittedAt,
              isExcluded,
              excludedAt: sub.excludedAt,
              excludedByName: sub.excludedByName,
              exclusionReason: sub.exclusionReason,
            };
          }

          // Entrega preparada para evaluación directa contextual
          const syntheticSub: AcademicSubmission = {
            id: `sub_${activeFicha.id}_${selectedActivityForGrading.id}_${app.uid}`,
            activityId: selectedActivityForGrading.id,
            activityTitle: selectedActivityForGrading.title,
            learnerId: app.uid,
            userId: app.uid,
            learnerName: app.displayName || 'Aprendiz',
            learnerEmail: app.email,
            fichaId: activeFicha.id,
            courseId: (activeFicha as any).courseId || '',
            submissionType: (selectedActivityForGrading.submissionType as any) || 'document',
            submittedAt: (app as any).enrolledAt || new Date().toISOString(),
            status: isExcluded ? 'exonerated' : 'submitted',
            resubmissionCount: 0,
            version: 1,
            isExcluded,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          return {
            key: `app_${app.uid}`,
            learnerId: app.uid,
            learnerName: app.displayName || 'Aprendiz',
            learnerEmail: app.email,
            learnerPhoto: app.photoURL || undefined,
            documentNumber: app.documentNumber || undefined,
            submission: syntheticSub,
            hasDelivered: false,
            grade: undefined,
            status: isExcluded ? 'exonerated' : 'pending',
            submittedAt: (app as any).enrolledAt || null,
            isExcluded,
            excludedAt: undefined,
            excludedByName: undefined,
            exclusionReason: undefined,
          };
        });

        // Incluir entregas de aprendices no listados en la matrícula actual
        activitySubmissionsList.forEach((sub) => {
          if (!matchedSubIds.has(sub.id)) {
            const hasDelivered = Boolean(
              sub.fileName ||
              sub.driveFileUrl ||
              sub.driveUrl ||
              sub.driveFileId ||
              sub.externalUrl ||
              sub.textContent
            );
            const targetLearnerId = sub.learnerId || sub.userId || sub.id;
            // PROMPT 38: Priorizar el estado de exclusión explícito de la entrega si existe
            const isExcluded = typeof sub.isExcluded === 'boolean'
              ? sub.isExcluded
              : Boolean(
                  (selectedActivityForGrading?.excludedLearnerIds &&
                    selectedActivityForGrading.excludedLearnerIds.includes(targetLearnerId)) ||
                    sub.status === 'exonerated' ||
                    sub.status === 'excluded'
                );
            rows.push({
              key: `sub_${sub.id}`,
              learnerId: targetLearnerId,
              learnerName: sub.learnerName || 'Aprendiz',
              learnerEmail: sub.learnerEmail || '',
              learnerPhoto: undefined,
              documentNumber: undefined,
              submission: sub,
              hasDelivered,
              grade: sub.grade as AcademicGradeCode | undefined,
              status: sub.status,
              submittedAt: sub.submittedAt,
              isExcluded,
              excludedAt: sub.excludedAt,
              excludedByName: sub.excludedByName,
              exclusionReason: sub.exclusionReason,
            });
          }
        });

        return rows;
      })();

      // 6. Métricas y contadores diferenciados (8 indicadores oficiales)
      const activityLearnerMetrics = (() => {
        const total = activityLearnerRows.length;
        const excludedCount = activityLearnerRows.filter((r) => r.isExcluded).length;
        // Aprendices activos no excluidos
        const activeRows = activityLearnerRows.filter((r) => !r.isExcluded);

        const deliveredCount = activeRows.filter((r) => r.hasDelivered).length;
        const unsubmittedCount = activeRows.filter((r) => !r.hasDelivered).length;
        const approvedCount = activeRows.filter((r) => r.grade === 'A').length;
        const correctionCount = activeRows.filter((r) => r.grade === 'C').length;
        const notApprovedCount = activeRows.filter((r) => r.grade === 'N').length;
        const gradedCount = approvedCount + correctionCount + notApprovedCount;
        const pendingGradeCount = activeRows.filter(
          (r) => !r.grade || r.status === 'submitted' || r.status === 'under_review'
        ).length;

        return {
          total,
          deliveredCount,
          unsubmittedCount,
          gradedCount,
          pendingGradeCount,
          approvedCount,
          correctionCount,
          notApprovedCount,
          excludedCount,
        };
      })();

      // Aprendices destinatarios de la operación masiva actual
      const bulkTargetRows = (() => {
        const activeRows = activityLearnerRows.filter((r) => !r.isExcluded);
        if (bulkMode === 'unsubmitted_n') {
          return activeRows.filter((r) => !r.hasDelivered);
        }
        if (bulkMode === 'delivered_a') {
          return activeRows.filter((r) => r.hasDelivered);
        }
        if (bulkMode === 'all') {
          return activeRows;
        }
        return [];
      })();

      const filteredActivityLearnerRows = activityLearnerRows
        .filter((row: ActivityLearnerRow) => {
          if (activitySubmissionSearchTerm.trim()) {
            const term = activitySubmissionSearchTerm.toLowerCase().trim();
            const matchesName = row.learnerName.toLowerCase().includes(term);
            const matchesEmail = row.learnerEmail.toLowerCase().includes(term);
            const matchesDoc = row.documentNumber ? row.documentNumber.toLowerCase().includes(term) : false;
            const matchesFile = row.submission.fileName ? row.submission.fileName.toLowerCase().includes(term) : false;
            if (!matchesName && !matchesEmail && !matchesDoc && !matchesFile) {
              return false;
            }
          }

          if (activitySubmissionFilterStatus === 'submitted') {
            return !row.isExcluded && row.hasDelivered;
          }
          if (activitySubmissionFilterStatus === 'unsubmitted') {
            return !row.isExcluded && !row.hasDelivered;
          }
          if (activitySubmissionFilterStatus === 'pending') {
            return !row.isExcluded && (!row.grade || row.status === 'submitted' || row.status === 'under_review');
          }
          if (activitySubmissionFilterStatus === 'graded') {
            return !row.isExcluded && Boolean(row.grade);
          }
          if (activitySubmissionFilterStatus === 'approved') {
            return !row.isExcluded && row.grade === 'A';
          }
          if (activitySubmissionFilterStatus === 'not_approved') {
            return !row.isExcluded && row.grade === 'N';
          }
          if (activitySubmissionFilterStatus === 'correction') {
            return !row.isExcluded && row.grade === 'C';
          }
          if (activitySubmissionFilterStatus === 'excluded') {
            return row.isExcluded;
          }
          return true;
        })
        .sort((a, b) => {
          switch (activitySortCriterion) {
            case 'name_asc':
              return a.learnerName.localeCompare(b.learnerName, 'es', { sensitivity: 'base' });
            case 'name_desc':
              return b.learnerName.localeCompare(a.learnerName, 'es', { sensitivity: 'base' });
            case 'delivered_first':
              if (a.hasDelivered === b.hasDelivered) {
                return a.learnerName.localeCompare(b.learnerName, 'es');
              }
              return a.hasDelivered ? -1 : 1;
            case 'unsubmitted_first':
              if (a.hasDelivered === b.hasDelivered) {
                return a.learnerName.localeCompare(b.learnerName, 'es');
              }
              return a.hasDelivered ? 1 : -1;
            case 'pending_grade_first': {
              const aPending = !a.isExcluded && (!a.grade || a.status === 'submitted' || a.status === 'under_review');
              const bPending = !b.isExcluded && (!b.grade || b.status === 'submitted' || b.status === 'under_review');
              if (aPending === bPending) {
                return a.learnerName.localeCompare(b.learnerName, 'es');
              }
              return aPending ? -1 : 1;
            }
            case 'graded_first': {
              const aGraded = !a.isExcluded && Boolean(a.grade);
              const bGraded = !b.isExcluded && Boolean(b.grade);
              if (aGraded === bGraded) {
                return a.learnerName.localeCompare(b.learnerName, 'es');
              }
              return aGraded ? -1 : 1;
            }
            default:
              return 0;
          }
        });

      return (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Barra superior de retorno - PROMPT 29 Sección 24 */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <button
              onClick={() => {
                setViewMode('grid');
                setActiveFichaId('');
                onBackToList?.();
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#00324D] hover:text-[#39A900] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              ← Volver a Mis Fichas
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#39A900] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                FICHA #{activeFicha.number}
              </span>
            </div>
          </div>

          {/* Banner Institucional de la Ficha (PROMPT 29 Sección 6) */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00324D] via-[#004A73] to-[#005B8C] text-white p-6 sm:p-8 shadow-sm border border-slate-700">
            <div className="relative z-10 space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-black tracking-wider bg-white/15 text-[#8CE665] px-3 py-0.5 rounded-md border border-white/20">
                  FICHA {activeFicha.number}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    shiftLabels[activeFicha.shift]?.badge || 'bg-slate-100 text-slate-800'
                  }`}
                >
                  Jornada: {shiftLabels[activeFicha.shift]?.label || activeFicha.shift}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                  {activeFicha.stage === 'lectiva' ? 'Etapa Lectiva' : activeFicha.stage}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#8CE665] border border-emerald-500/30">
                  {activeFicha.status === 'active' ? 'Activa / En Formación' : activeFicha.status}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {activeFicha.name || activeFicha.programName || `Ficha ${activeFicha.number}`}
              </h1>

              <p className="text-xs text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#8CE665]" />
                {center?.name || 'Centro de Comercio y Servicios'} · {center?.city || 'Ibagué'},{' '}
                {center?.department || 'Tolima'}
              </p>

              {activeFicha.description && (
                <p className="text-xs text-slate-300 italic pt-1 line-clamp-2">"{activeFicha.description}"</p>
              )}

              {/* Acciones Rápidas del Instructor en la Ficha */}
              <div className="pt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsAddLearnerModalOpen(true)}
                  className="px-3.5 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  + Agregar aprendiz
                </button>
                <button
                  onClick={() => setIsActivityModalOpen(true)}
                  className="px-3.5 py-2 bg-white text-[#00324D] hover:bg-slate-100 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#39A900]" />
                  + Nueva actividad
                </button>
                <button
                  onClick={() => {
                    setEditFichaName(activeFicha.name || '');
                    setEditFichaNumber(activeFicha.number || '');
                    setEditProgramName(activeFicha.programName || '');
                    setEditShift(activeFicha.shift || 'morning');
                    setEditStage(activeFicha.stage || 'lectiva');
                    setEditDescription(activeFicha.description || '');
                    setIsEditFichaModalOpen(true);
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer ml-auto"
                  title="Editar información de la Ficha"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>

                <button
                  onClick={() => openDeleteFichaModal(activeFicha)}
                  className="px-3 py-2 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white rounded-xl text-xs font-semibold transition-all border border-rose-400/40 flex items-center gap-1.5 cursor-pointer"
                  title="Eliminar esta ficha de formación"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                  Eliminar ficha
                </button>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-8 w-60 h-60 rounded-full bg-[#39A900]/15 blur-2xl pointer-events-none" />
          </div>

          {/* Pestañas de Navegación Interna de la Ficha (PROMPT 29 Sección 7) */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setActiveClassTab('summary')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeClassTab === 'summary'
                  ? 'bg-[#00324D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Resumen
            </button>
            <button
              onClick={() => setActiveClassTab('sheet')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeClassTab === 'sheet'
                  ? 'bg-[#00324D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Table className="w-4 h-4" />
              Planilla
            </button>
            <button
              onClick={() => setActiveClassTab('activities')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeClassTab === 'activities'
                  ? 'bg-[#00324D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Actividades ({classActivities.length})
            </button>
            <button
              onClick={() => setActiveClassTab('apprentices')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeClassTab === 'apprentices'
                  ? 'bg-[#00324D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Aprendices ({classApprentices.length})
            </button>
            <button
              onClick={() => setActiveClassTab('submissions')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeClassTab === 'submissions'
                  ? 'bg-[#00324D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FolderArchive className="w-4 h-4" />
              Evidencias ({classSubmissions.length})
            </button>
            <button
              onClick={() => setActiveClassTab('grades')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeClassTab === 'grades'
                  ? 'bg-[#00324D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Award className="w-4 h-4" />
              Calificaciones
            </button>
            <button
              onClick={() => setActiveClassTab('attendance')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeClassTab === 'attendance'
                  ? 'bg-[#00324D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              Asistencia
            </button>
            <button
              onClick={() => setActiveClassTab('tracking')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeClassTab === 'tracking'
                  ? 'bg-[#00324D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Seguimiento
            </button>
            <button
              onClick={() => setActiveClassTab('announcements')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeClassTab === 'announcements'
                  ? 'bg-[#00324D] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Anuncios ({classAnnouncements.length})
            </button>
          </div>

          {/* Contenido de la pestaña activa */}
          {loadingClassData ? (
            <div className="py-16 text-center space-y-2 bg-white rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Cargando datos reales de la ficha desde Firestore...</p>
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* PESTAÑA 1: RESUMEN (PROMPT 29 Sección 8) */}
              {/* ========================================================= */}
              {activeClassTab === 'summary' && (
                <div className="space-y-6">
                  {/* Tarjetas de Métricas Reales de Firestore */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                      onClick={() => setActiveClassTab('apprentices')}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#39A900] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-semibold text-slate-500">Aprendices Matriculados</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#39A900] flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-black font-mono text-[#00324D]">{classApprentices.length}</div>
                      <p className="text-[11px] text-slate-400 mt-1">Con expediente institucional</p>
                    </div>

                    <div
                      onClick={() => setActiveClassTab('activities')}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#39A900] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-semibold text-slate-500">Actividades Formativas</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#00324D] flex items-center justify-center group-hover:scale-105 transition-transform">
                          <FileText className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-black font-mono text-[#00324D]">{classActivities.length}</div>
                      <p className="text-[11px] text-slate-400 mt-1">Tareas y evidencias vigentes</p>
                    </div>

                    <div
                      onClick={() => setActiveClassTab('submissions')}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#39A900] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-semibold text-slate-500">Evidencias Recibidas</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <FolderArchive className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-black font-mono text-[#00324D]">{classSubmissions.length}</div>
                      <p className="text-[11px] text-slate-400 mt-1">Subidas vía Drive o archivo</p>
                    </div>

                    <div
                      onClick={() => setActiveClassTab('submissions')}
                      className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-2xs hover:border-amber-400 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-semibold text-amber-800">Pendientes por Calificar</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Clock className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-black font-mono text-amber-900">{stats.pendingSubmissionsCount}</div>
                      <p className="text-[11px] text-amber-700 mt-1">Requieren dictamen A/D/C</p>
                    </div>
                  </div>

                  {/* Ficha Técnica Académica (Datos Reales de la Ficha) */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-[#00324D]">Ficha Técnica del Ambiente Formativo</h3>
                        <p className="text-xs text-slate-500">Parámetros registrados en el Sistema Nacional de Aprendizaje</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#00324D] bg-slate-100 px-3 py-1 rounded-lg">
                        ID: {activeFicha.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-slate-500 block font-medium">Nombre de la Ficha:</span>
                        <span className="font-bold text-slate-900 text-sm">{activeFicha.name || activeFicha.programName}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-slate-500 block font-medium">Número Oficial de Ficha:</span>
                        <span className="font-mono font-bold text-[#00324D] text-sm">#{activeFicha.number}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-slate-500 block font-medium">Centro de Formación:</span>
                        <span className="font-bold text-slate-900">{center?.name || 'Centro de Comercio y Servicios'}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-slate-500 block font-medium">Jornada Formativa:</span>
                        <span className="font-bold text-slate-900">{shiftLabels[activeFicha.shift]?.label || activeFicha.shift}</span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-slate-500 block font-medium">Fecha de Apertura / Inicio:</span>
                        <span className="font-bold text-slate-900">
                          {activeFicha.startDate ? new Date(activeFicha.startDate).toLocaleDateString('es-CO') : 'No fijada'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-slate-500 block font-medium">Fecha de Finalización:</span>
                        <span className="font-bold text-slate-900">
                          {activeFicha.endDate ? new Date(activeFicha.endDate).toLocaleDateString('es-CO') : 'No fijada'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Panel de Actividades Recientes y Accesos Rápidos */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Actividades recientes */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#39A900]" />
                          <h4 className="text-xs font-bold text-[#00324D]">Actividades Pedagógicas Recientes</h4>
                        </div>
                        <button
                          onClick={() => setActiveClassTab('activities')}
                          className="text-xs font-bold text-[#2E8500] hover:underline cursor-pointer"
                        >
                          Ver todas ({classActivities.length})
                        </button>
                      </div>

                      {classActivities.length === 0 ? (
                        <div className="py-8 text-center space-y-2">
                          <p className="text-xs text-slate-500">No hay actividades creadas en esta ficha aún.</p>
                          <button
                            onClick={() => setIsActivityModalOpen(true)}
                            className="px-3.5 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            + Agregar primera actividad
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {classActivities.slice(0, 3).map((act) => (
                            <div
                              key={act.id}
                              className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-2"
                            >
                              <div className="truncate">
                                <h5 className="text-xs font-bold text-slate-900 truncate">{act.title}</h5>
                                <span className="text-[10px] text-slate-500">
                                  Límite:{' '}
                                  {act.dueDate ? new Date(act.dueDate).toLocaleDateString('es-CO') : 'Sin fecha'}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-[#00324D] bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                {classSubmissions.filter((s) => s.activityId === act.id).length} entregas
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Muro rápido de avisos */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-[#00324D]" />
                          <h4 className="text-xs font-bold text-[#00324D]">Últimos Avisos del Muro</h4>
                        </div>
                        <button
                          onClick={() => setActiveClassTab('announcements')}
                          className="text-xs font-bold text-[#2E8500] hover:underline cursor-pointer"
                        >
                          Ver muro completo
                        </button>
                      </div>

                      {classAnnouncements.length === 0 ? (
                        <div className="py-8 text-center space-y-2">
                          <p className="text-xs text-slate-500">No hay avisos publicados en el muro.</p>
                          <button
                            onClick={() => setActiveClassTab('announcements')}
                            className="px-3.5 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                            Publicar un aviso
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {classAnnouncements.slice(0, 2).map((ann) => (
                            <div
                              key={ann.id}
                              className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span className="font-bold text-[#00324D]">{ann.creatorName || 'Instructor'}</span>
                                <span>{new Date(ann.publishedAt || ann.createdAt).toLocaleDateString('es-CO')}</span>
                              </div>
                              <h5 className="text-xs font-bold text-slate-900 truncate">{ann.title}</h5>
                              <p className="text-[11px] text-slate-600 line-clamp-1">{ann.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PESTAÑA: PLANILLA (Matriz de Calificaciones Google Classroom) */}
              {/* ========================================================= */}
              {activeClassTab === 'sheet' && (
                <FichaPlanillaMatriz
                  ficha={activeFicha}
                  apprentices={classApprentices}
                  activities={classActivities}
                  submissions={classSubmissions}
                  learningOutcomes={classLearningOutcomes}
                  instructorUid={instructorUid}
                  instructorName={userProfile?.displayName || 'Instructor SENA'}
                  onUpdateSubmission={(updatedSub) => {
                    setClassSubmissions((prev) => {
                      const exists = prev.some((s) => s.id === updatedSub.id);
                      return exists ? prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)) : [updatedSub, ...prev];
                    });
                  }}
                  onUpdateActivity={(updatedAct) => {
                    setClassActivities((prev) =>
                      prev.map((a) => (a.id === updatedAct.id ? updatedAct : a))
                    );
                  }}
                  onOpenLearnerProfile={(app) => setSelectedApprenticeProfile(app)}
                  onOpenActivityDetail={(act) => {
                    setSelectedActivityForGrading(act);
                    setIsActivitySubmissionsModalOpen(true);
                  }}
                  onRefresh={loadActiveFichaClassData}
                  showToast={showToast}
                />
              )}

              {/* ========================================================= */}
              {/* PESTAÑA 2: ACTIVIDADES (PROMPT 29 Secciones 9-14) */}
              {/* ========================================================= */}
              {activeClassTab === 'activities' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-[#00324D]">
                        Actividades de Ficha #{activeFicha.number} — {activeFicha.name || activeFicha.programName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Tareas y evidencias formativas creadas exclusivamente para este grupo
                      </p>
                    </div>
                    {/* PROMPT 29 Sección 10: Botón + Agregar actividad */}
                    <button
                      onClick={() => setIsActivityModalOpen(true)}
                      className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Agregar actividad</span>
                    </button>
                  </div>

                  {/* PROMPT 29 Sección 14: Estado Vacío si 0 actividades */}
                  {classActivities.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                      <h4 className="text-base font-bold text-slate-800">No hay actividades en esta ficha.</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Crea la primera actividad para comenzar.
                      </p>
                      <button
                        onClick={() => setIsActivityModalOpen(true)}
                        className="px-5 py-2.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer mt-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Agregar actividad</span>
                      </button>
                    </div>
                  ) : (
                    /* PROMPT 29 Sección 13: Listado de Actividades filtradas por Ficha */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {classActivities.map((act) => {
                        const subs = classSubmissions.filter((s) => s.activityId === act.id);
                        const rap = classLearningOutcomes.find((r) => r.id === act.learningOutcomeId);

                        // PROMPT 33 Requisito 2 & 9: Métricas reales de la actividad calculadas de Firestore
                        const totalApprentices = classApprentices.length;
                        const receivedSubs = subs.length;
                        const pendingSubmissions = Math.max(0, totalApprentices - receivedSubs);
                        const toGradeSubs = subs.filter(
                          (s) => s.status === 'submitted' || s.status === 'under_review' || !s.grade
                        ).length;
                        const approvedSubs = subs.filter((s) => s.grade === 'A').length;
                        const correctionSubs = subs.filter((s) => s.grade === 'C').length;
                        const notApprovedSubs = subs.filter((s) => s.grade === 'N').length;

                        return (
                          <div
                            key={act.id}
                            className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-[#39A900] transition-all flex flex-col justify-between space-y-3.5"
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                  {act.submissionType || 'Evidencia'}
                                </span>
                                <span className="text-[11px] font-bold text-[#00324D] bg-[#EBF8E7] px-2 py-0.5 rounded">
                                  {receivedSubs} {receivedSubs === 1 ? 'entrega' : 'entregas'}
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-slate-900 leading-snug">{act.title}</h4>
                              <p className="text-xs text-slate-600 line-clamp-2">{act.instructions || act.description}</p>
                              {rap && (
                                <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <strong className="text-slate-700 block">RAP:</strong>
                                  <span className="line-clamp-1">{rap.description}</span>
                                </div>
                              )}
                              {act.dueDate && (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>
                                    Fecha límite:{' '}
                                    <strong>{new Date(act.dueDate).toLocaleDateString('es-CO')}</strong>
                                  </span>
                                </div>
                              )}

                              {/* PROMPT 33 Requisito 2: Desglose completo de estados reales de la actividad */}
                              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                                <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                                  <span className="text-slate-500 font-medium">Aprendices:</span>
                                  <strong className="font-bold text-slate-800 font-mono">{totalApprentices}</strong>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                                  <span className="text-slate-500 font-medium">Recibidas:</span>
                                  <strong className="font-bold text-[#00324D] font-mono">{receivedSubs}</strong>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                                  <span className="text-slate-500 font-medium">Pendientes:</span>
                                  <strong className="font-bold text-slate-600 font-mono">{pendingSubmissions}</strong>
                                </div>
                                <div className="p-1.5 bg-amber-50 rounded border border-amber-200/60 flex items-center justify-between">
                                  <span className="text-amber-800 font-medium">Por calificar:</span>
                                  <strong className="font-bold text-amber-900 font-mono">{toGradeSubs}</strong>
                                </div>
                                <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200/60 flex items-center justify-between">
                                  <span className="text-emerald-800 font-medium">Aprobadas:</span>
                                  <strong className="font-bold text-[#2E8500] font-mono">{approvedSubs}</strong>
                                </div>
                                <div className="p-1.5 bg-orange-50 rounded border border-orange-200/60 flex items-center justify-between">
                                  <span className="text-orange-800 font-medium">Por corregir:</span>
                                  <strong className="font-bold text-orange-900 font-mono">{correctionSubs}</strong>
                                </div>
                                <div className="p-1.5 bg-rose-50 rounded border border-rose-200/60 flex items-center justify-between col-span-2 sm:col-span-3">
                                  <span className="text-rose-800 font-medium">No aprobadas:</span>
                                  <strong className="font-bold text-rose-900 font-mono">{notApprovedSubs}</strong>
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] text-slate-500 font-mono">
                                {act.rubricId ? 'Con Rúbrica Pedagógica' : 'Sin rúbrica'}
                              </span>
                              {/* PROMPT 33 Requisito 3: Botón 'Calificar evidencias' que abre modal contextual */}
                              <button
                                onClick={() => handleOpenActivitySubmissions(act)}
                                className="px-3.5 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Award className="w-3.5 h-3.5 text-[#8CE665]" />
                                <span>Calificar evidencias</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* PESTAÑA 3: APRENDICES (PROMPT 29 Sección 16) */}
              {/* ========================================================= */}
              {activeClassTab === 'apprentices' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-[#00324D]">
                        Aprendices Matriculados ({classApprentices.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Vinculados formalmente a la Ficha #{activeFicha.number}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddLearnerModalOpen(true)}
                      className="px-3.5 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      + Agregar aprendiz
                    </button>
                  </div>

                  {/* Filtros de Aprendices */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, correo o cédula..."
                        value={apprenticeSearchTerm}
                        onChange={(e) => setApprenticeSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <button
                        onClick={() => setApprenticeStatusFilter('all')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          apprenticeStatusFilter === 'all'
                            ? 'bg-[#00324D] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Todos ({classApprentices.length})
                      </button>
                      <button
                        onClick={() => setApprenticeStatusFilter('active')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          apprenticeStatusFilter === 'active'
                            ? 'bg-[#00324D] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Activos ({classApprentices.filter((a) => a.enrollmentStatus !== 'withdrawn').length})
                      </button>
                      <button
                        onClick={() => setApprenticeStatusFilter('withdrawn')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          apprenticeStatusFilter === 'withdrawn'
                            ? 'bg-[#00324D] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Retirados ({classApprentices.filter((a) => a.enrollmentStatus === 'withdrawn').length})
                      </button>
                    </div>
                  </div>

                  {filteredApprentices.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                      <Users className="w-12 h-12 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-800">No se encontraron aprendices</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Registra los correos de tus aprendices para autorizar su ingreso a esta ficha formativa.
                      </p>
                      <button
                        onClick={() => setIsAddLearnerModalOpen(true)}
                        className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        Agregar primer aprendiz
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#00324D] text-white border-b border-slate-700">
                            <th className="p-3 font-bold">Aprendiz</th>
                            <th className="p-3 font-bold">Correo Registrado</th>
                            <th className="p-3 font-bold">Fecha Asignación</th>
                            <th className="p-3 font-bold text-center">Estado</th>
                            <th className="p-3 font-bold text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredApprentices.map((apprentice) => {
                            const isPending =
                              apprentice.status === 'pending' || apprentice.enrollmentStatus === 'pending';

                            return (
                              <tr key={apprentice.uid} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3">
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={apprentice.photoURL}
                                      alt={apprentice.displayName}
                                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                                    />
                                    <div>
                                      <div className="font-bold text-slate-900">{apprentice.displayName}</div>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {apprentice.documentNumber !== 'No registrado'
                                          ? `CC ${apprentice.documentNumber}`
                                          : 'Sin CC'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-slate-700">{apprentice.email}</td>
                                <td className="p-3 text-slate-500">
                                  {apprentice.assignedAt
                                    ? new Date(apprentice.assignedAt).toLocaleDateString('es-CO')
                                    : '—'}
                                </td>
                                <td className="p-3 text-center">
                                  {apprentice.enrollmentStatus === 'withdrawn' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                      Retirado
                                    </span>
                                  ) : isPending ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      Pendiente login
                                    </span>
                                  ) : (
                                    <StatusBadge status={apprentice.status} size="sm" />
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedApprenticeProfile(apprentice)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-[#EBF8E7] text-[#00324D] rounded-lg font-bold transition-colors inline-flex items-center gap-1 cursor-pointer text-[11px]"
                                      title="Ver Expediente Académico"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      Expediente
                                    </button>
                                    {apprentice.enrollmentStatus !== 'withdrawn' && (
                                      <button
                                        onClick={() => openRemoveLearnerModal(apprentice)}
                                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer text-[11px]"
                                        title="Quitar aprendiz de esta ficha"
                                      >
                                        <UserMinus className="w-3.5 h-3.5" />
                                        Quitar
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* PESTAÑA 4: EVIDENCIAS (PROMPT 29 Sección 18) */}
              {/* ========================================================= */}
              {activeClassTab === 'submissions' && (
                <div className="space-y-4">
                  {/* Encabezado de la pestaña Evidencias */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                        <FolderArchive className="w-5 h-5 text-[#39A900]" />
                        <span>Evidencias de la Ficha #{activeFicha.number}</span>
                        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {activeClassSubmissions.length} vigentes
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Gestión pedagógica, dictámenes oficiales A/N/C y retroalimentación directa a los aprendices de la ficha
                      </p>
                    </div>
                  </div>

                  {/* PROMPT 34 & Sección 3.G: Resumen de Evaluación con Datos Reales */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Total Recibidas
                      </span>
                      <span className="text-2xl font-black text-[#00324D] font-mono block">
                        {fichaSubmissionStats.total}
                      </span>
                      <span className="text-[10px] text-slate-400">Entregas vigentes</span>
                    </div>

                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        Por Calificar
                      </span>
                      <span className="text-2xl font-black text-amber-900 font-mono block">
                        {fichaSubmissionStats.pending}
                      </span>
                      <span className="text-[10px] text-amber-700">Requieren dictamen</span>
                    </div>

                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-[#2E8500] uppercase tracking-wider block">
                        Aprobadas (A)
                      </span>
                      <span className="text-2xl font-black text-[#2E8500] font-mono block">
                        {fichaSubmissionStats.approved}
                      </span>
                      <span className="text-[10px] text-emerald-700">Cumplen criterios</span>
                    </div>

                    <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                        No Aprobadas (N)
                      </span>
                      <span className="text-2xl font-black text-rose-800 font-mono block">
                        {fichaSubmissionStats.notApproved}
                      </span>
                      <span className="text-[10px] text-rose-600">No cumplen criterios</span>
                    </div>

                    <div className="bg-orange-50/70 p-3 rounded-xl border border-orange-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">
                        Por Corregir (C)
                      </span>
                      <span className="text-2xl font-black text-orange-900 font-mono block">
                        {fichaSubmissionStats.correctionRequired}
                      </span>
                      <span className="text-[10px] text-orange-700">Reenvío habilitado</span>
                    </div>

                    <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                        % Aprobación
                      </span>
                      <span className="text-2xl font-black text-[#00324D] font-mono block">
                        {fichaSubmissionStats.approvalPercentage}%
                      </span>
                      <span className="text-[10px] text-blue-700">De las evaluadas</span>
                    </div>
                  </div>

                  {/* PROMPT 34 & Sección 3.B: Barra de Filtros y Búsqueda */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
                          <Filter className="w-3.5 h-3.5 text-slate-500" />
                          Filtros rápidos:
                        </span>
                        <button
                          type="button"
                          onClick={() => setSubmissionQuickFilter('all')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            submissionQuickFilter === 'all'
                              ? 'bg-[#00324D] text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          Todas ({activeClassSubmissions.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmissionQuickFilter('pending')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            submissionQuickFilter === 'pending'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60'
                          }`}
                        >
                          Por calificar ({fichaSubmissionStats.pending})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmissionQuickFilter('graded')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            submissionQuickFilter === 'graded'
                              ? 'bg-[#39A900] text-white shadow-xs'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                          }`}
                        >
                          Calificadas ({fichaSubmissionStats.evaluatedCount})
                        </button>
                      </div>

                      {hasActiveSubmissionFilters && (
                        <button
                          type="button"
                          onClick={handleResetSubmissionFilters}
                          className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Limpiar filtros
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      {/* Búsqueda por aprendiz o correo */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={submissionSearchTerm}
                          onChange={(e) => setSubmissionSearchTerm(e.target.value)}
                          placeholder="Buscar aprendiz o correo..."
                          className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#39A900]"
                        />
                      </div>

                      {/* Filtrar por Actividad */}
                      <div>
                        <select
                          value={submissionFilterActivityId}
                          onChange={(e) => setSubmissionFilterActivityId(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#39A900]"
                        >
                          <option value="all">Todas las actividades ({classActivities.length})</option>
                          {classActivities.map((act) => (
                            <option key={act.id} value={act.id}>
                              {act.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filtrar por Dictamen A/N/C */}
                      <div>
                        <select
                          value={submissionFilterGrade}
                          onChange={(e) => setSubmissionFilterGrade(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#39A900]"
                        >
                          <option value="all">Todos los dictámenes</option>
                          <option value="pending">Pendientes de calificar</option>
                          <option value="approved">A — Aprobado</option>
                          <option value="correction_required">C — Por corregir</option>
                          <option value="not_approved">N — No aprobado</option>
                        </select>
                      </div>

                      {/* Filtrar por Fecha */}
                      <div>
                        <input
                          type="date"
                          value={submissionFilterDate}
                          onChange={(e) => setSubmissionFilterDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#39A900]"
                          title="Filtrar por fecha de radicación"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PROMPT 34 & Sección 3.A: Tabla Detallada de Evidencias */}
                  {filteredSubmissions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-2">
                      <FolderArchive className="w-12 h-12 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">No se encontraron evidencias con los filtros seleccionados</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {hasActiveSubmissionFilters
                          ? 'Prueba modificando o limpiando los criterios de búsqueda para visualizar las evidencias.'
                          : 'Cuando los aprendices matriculados en esta ficha radiquen evidencias pedagógicas, aparecerán aquí para evaluarlas.'}
                      </p>
                      {hasActiveSubmissionFilters && (
                        <button
                          type="button"
                          onClick={handleResetSubmissionFilters}
                          className="mt-2 px-3 py-1.5 bg-[#00324D] text-white rounded-lg text-xs font-bold hover:bg-[#004A73] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restablecer filtros
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#00324D] text-white border-b border-slate-700 whitespace-nowrap">
                              <th className="p-3 font-bold">Aprendiz</th>
                              <th className="p-3 font-bold">Actividad Formativa</th>
                              <th className="p-3 font-bold">Fecha / Hora</th>
                              <th className="p-3 font-bold text-center">Estado</th>
                              <th className="p-3 font-bold text-center">Dictamen SENA</th>
                              <th className="p-3 font-bold">Retroalimentación</th>
                              <th className="p-3 font-bold text-right">Archivos / Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredSubmissions.map((sub) => {
                              const act = classActivities.find((a) => a.id === sub.activityId);
                              const historyCount = (sub.submissionHistory || []).length;

                              return (
                                <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                                  {/* Aprendiz */}
                                  <td className="p-3">
                                    <span className="font-bold text-slate-900 block">
                                      {sub.learnerName || 'Aprendiz'}
                                    </span>
                                    {sub.learnerEmail && (
                                      <span className="text-[11px] text-slate-500 block">
                                        {sub.learnerEmail}
                                      </span>
                                    )}
                                  </td>

                                  {/* Actividad */}
                                  <td className="p-3">
                                    <span className="font-semibold text-slate-800 block line-clamp-1">
                                      {sub.activityTitle || act?.title || 'Actividad Formativa'}
                                    </span>
                                    {sub.fileName && (
                                      <span className="text-[10px] text-slate-500 font-mono block line-clamp-1">
                                        {sub.fileName}
                                      </span>
                                    )}
                                  </td>

                                  {/* Fecha / Hora */}
                                  <td className="p-3 text-slate-500 whitespace-nowrap">
                                    <div>{new Date(sub.submittedAt).toLocaleDateString('es-CO')}</div>
                                    <div className="text-[10px] text-slate-400">
                                      {new Date(sub.submittedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </td>

                                  {/* Estado */}
                                  <td className="p-3 text-center whitespace-nowrap">
                                    <StatusBadge status={sub.status as any} size="sm" />
                                  </td>

                                  {/* Dictamen oficial */}
                                  <td className="p-3 text-center whitespace-nowrap">
                                    {sub.grade ? (
                                      <span
                                        className={`font-mono font-black px-2.5 py-1 rounded text-xs inline-flex items-center gap-1 shadow-2xs ${
                                          sub.grade === 'A'
                                            ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/40'
                                            : sub.grade === 'C'
                                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                                        }`}
                                      >
                                        {sub.grade === 'A' ? 'A — Aprobado' : sub.grade === 'C' ? 'C — Corregir' : 'N — No aprobado'}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 font-bold">
                                        Por calificar
                                      </span>
                                    )}
                                  </td>

                                  {/* Retroalimentación */}
                                  <td className="p-3 max-w-xs">
                                    {sub.feedback ? (
                                      <p className="text-[11px] text-slate-700 italic line-clamp-2" title={sub.feedback}>
                                        "{sub.feedback}"
                                      </p>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">Sin comentarios</span>
                                    )}
                                    {sub.gradedBy && (
                                      <span className="text-[10px] text-slate-400 block mt-0.5">
                                        Por: {sub.gradedBy}
                                      </span>
                                    )}
                                  </td>

                                  {/* Archivos / Acciones */}
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                      {/* Ver evidencia en modal */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSubmissionToView(sub);
                                          setIsViewEvidenceModalOpen(true);
                                        }}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                        title="Inspeccionar evidencia"
                                      >
                                        <Eye className="w-3 h-3 text-slate-600" />
                                        <span>Ver</span>
                                      </button>

                                      {/* Calificación rápida [A] inline */}
                                      <button
                                        type="button"
                                        disabled={gradingSubmissionId === sub.id}
                                        onClick={() => handleQuickInlineGrade(sub, 'A')}
                                        className={`px-2 py-1 rounded font-black text-[11px] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                          sub.grade === 'A'
                                            ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/40 ring-1 ring-[#39A900]/30'
                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        }`}
                                        title="Aprobar evidencia (A)"
                                      >
                                        A
                                      </button>

                                      {/* Calificación rápida [C] inline */}
                                      <button
                                        type="button"
                                        disabled={gradingSubmissionId === sub.id}
                                        onClick={() => handleQuickInlineGrade(sub, 'C')}
                                        className={`px-2 py-1 rounded font-black text-[11px] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                          sub.grade === 'C'
                                            ? 'bg-amber-100 text-amber-900 border border-amber-400 ring-1 ring-amber-400/30'
                                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                        }`}
                                        title="Solicitar corrección (C)"
                                      >
                                        C
                                      </button>

                                      {/* Calificación rápida [N] inline */}
                                      <button
                                        type="button"
                                        disabled={gradingSubmissionId === sub.id}
                                        onClick={() => handleQuickInlineGrade(sub, 'N')}
                                        className={`px-2 py-1 rounded font-black text-[11px] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                          sub.grade === 'N'
                                            ? 'bg-rose-100 text-rose-900 border border-rose-400 ring-1 ring-rose-400/30'
                                            : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                                        }`}
                                        title="No aprobar evidencia (N)"
                                      >
                                        N
                                      </button>

                                      {/* Feedback completo */}
                                      <button
                                        type="button"
                                        disabled={gradingSubmissionId === sub.id}
                                        onClick={() => handleOpenGradingModal(sub, (sub.grade as AcademicGradeCode) || 'A', 'official')}
                                        className="px-2 py-1 bg-[#00324D] hover:bg-[#004A73] text-white rounded font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                        title="Editar calificación y retroalimentación"
                                      >
                                        <MessageSquare className="w-3 h-3 text-[#8CE665]" />
                                        <span>Feedback</span>
                                      </button>

                                      {/* Rúbrica Pedagógica si la actividad tiene */}
                                      {act?.rubricId && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenGradingModal(sub, (sub.grade as AcademicGradeCode) || 'A', 'rubric')}
                                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#2E8500] border border-emerald-200 rounded font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                          title="Evaluar con Rúbrica Pedagógica"
                                        >
                                          <Sliders className="w-3 h-3 text-[#39A900]" />
                                          <span>Rúbrica</span>
                                        </button>
                                      )}

                                      {/* Historial de versiones */}
                                      {(historyCount > 0 || (sub.resubmissionCount || 0) > 0) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedSubmissionForHistory(sub);
                                            setIsHistoryModalOpen(true);
                                          }}
                                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                          title="Ver historial de reenvíos"
                                        >
                                          <History className="w-3 h-3 text-slate-600" />
                                          <span>Historial</span>
                                        </button>
                                      )}

                                      {/* Enlace a Google Drive directo si existe */}
                                      {(sub.driveFileUrl || sub.driveUrl || sub.driveFileId) && (
                                        <a
                                          href={sub.driveUrl || sub.driveFileUrl || `https://drive.google.com/file/d/${sub.driveFileId}/view`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                                          title="Abrir archivo en Google Drive"
                                        >
                                          <HardDrive className="w-3.5 h-3.5 text-blue-600" />
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
                </div>
              )}

              {/* ========================================================= */}
              {/* PESTAÑA 5: CALIFICACIONES (PROMPT 29 Sección 19) */}
              {/* ========================================================= */}
              {activeClassTab === 'grades' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-[#00324D]">
                        Consolidado de Calificaciones — Ficha #{activeFicha.number}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Resultados pedagógicos A / D / C evaluados con rúbricas institucionales
                      </p>
                    </div>
                  </div>

                  {/* Tarjetas de Resumen de Calificaciones */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-xs text-slate-500 block">Evaluaciones Totales</span>
                      <span className="text-xl font-bold font-mono text-[#00324D] mt-1 block">
                        {classSubmissions.length}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-xs text-[#2E8500] font-bold block">Aprobadas (A)</span>
                      <span className="text-xl font-bold font-mono text-[#2E8500] mt-1 block">{approvedCount}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-xs text-rose-700 font-bold block">No Aprobadas / Deficientes (D/C)</span>
                      <span className="text-xl font-bold font-mono text-rose-700 mt-1 block">
                        {unapprovedCount}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-xs text-slate-500 block">Tasa de Aprobación</span>
                      <span className="text-xl font-bold font-mono text-[#00324D] mt-1 block">{passingRate}%</span>
                    </div>
                  </div>

                  {/* Tabla Consolidada por Aprendiz */}
                  {classApprentices.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                      No hay aprendices registrados en esta ficha para tabular calificaciones.
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#00324D] text-white border-b border-slate-700">
                            <th className="p-3 font-bold">Aprendiz</th>
                            <th className="p-3 font-bold text-center">Entregas</th>
                            <th className="p-3 font-bold text-center">Aprobadas (A)</th>
                            <th className="p-3 font-bold text-center">Por Mejorar (D/C)</th>
                            <th className="p-3 font-bold text-center">Cumplimiento</th>
                            <th className="p-3 font-bold text-right">Detalle</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {classApprentices.map((app) => {
                            const appSubs = classSubmissions.filter(
                              (s) => s.learnerId === app.uid || s.learnerEmail === app.email
                            );
                            const appA = appSubs.filter((s) => s.grade === 'A').length;
                            const appDef = appSubs.filter((s) => s.grade === 'N' || s.grade === 'C').length;
                            const totalActs = classActivities.length;
                            const pct = totalActs > 0 ? Math.round((appSubs.length / totalActs) * 100) : 0;

                            return (
                              <tr key={app.uid} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3">
                                  <div className="font-bold text-slate-900">{app.displayName}</div>
                                  <span className="text-[10px] text-slate-400 font-mono">{app.email}</span>
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-[#00324D]">
                                  {appSubs.length} / {totalActs}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-[#EBF8E7] text-[#2E8500]">
                                    {appA}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-700">
                                    {appDef}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="w-24 mx-auto bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-[#39A900] h-full rounded-full transition-all"
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{pct}%</span>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => setSelectedApprenticeProfile(app)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-[#EBF8E7] text-[#00324D] rounded font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Expediente
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* PESTAÑA 6: ASISTENCIA (PLANILLA GENERAL MATRICIAL) */}
              {/* ========================================================= */}
              {activeClassTab === 'attendance' && (
                <FichaAsistenciaPlanilla
                  ficha={activeFicha}
                  apprentices={classApprentices}
                  initialAttendance={classAttendance}
                  instructorUid={instructorUid}
                  instructorName={userProfile?.displayName || 'Instructor SENA'}
                  onRefreshData={loadActiveFichaClassData}
                  onAttendanceUpdated={(newAttendance) => {
                    setClassAttendance(newAttendance);
                  }}
                />
              )}

              {/* ========================================================= */}
              {/* PESTAÑA 7: SEGUIMIENTO (PROMPT 29 Sección 21) */}
              {/* ========================================================= */}
              {activeClassTab === 'tracking' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-[#00324D]">
                        Seguimiento y Acompañamiento — Ficha #{activeFicha.number}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Observaciones pedagógicas y actitudinales de aprendices (/learnerRecords)
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddTrackingModalOpen(true)}
                      className="px-3.5 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      + Registrar Observación
                    </button>
                  </div>

                  {classTrackingRecords.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
                      <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">No hay observaciones registradas en esta ficha</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Registra anotaciones sobre rendimiento académico, dificultades o reconocimientos de tus aprendices.
                      </p>
                      <button
                        onClick={() => setIsAddTrackingModalOpen(true)}
                        className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer mt-2"
                      >
                        <Plus className="w-4 h-4" />
                        Registrar primera observación
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {classTrackingRecords.map((rec) => {
                        const learner = classApprentices.find((a) => a.uid === rec.userId);

                        return (
                          <div
                            key={rec.id}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#00324D]">
                                  {learner?.displayName || rec.userId}
                                </span>
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                    rec.type === 'academic'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {rec.type === 'academic' ? 'Académico' : 'Comportamental'}
                                </span>
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {rec.category || 'Observación'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {rec.date ? new Date(rec.date).toLocaleDateString('es-CO') : '—'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                              {rec.description}
                            </p>
                            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                              Registrado por: <strong>{rec.createdBy || 'Instructor'}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* PESTAÑA 8: ANUNCIOS (PROMPT 29 Sección 22) */}
              {/* ========================================================= */}
              {activeClassTab === 'announcements' && (
                <div className="space-y-5">
                  {/* Formulario rápido para publicar en el Muro */}
                  <form
                    onSubmit={handleQuickPublishAnnouncement}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Megaphone className="w-4 h-4 text-[#39A900]" />
                      <h4 className="text-xs font-bold text-[#00324D]">
                        Publicar un aviso para la Ficha #{activeFicha.number}
                      </h4>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Título del anuncio o aviso..."
                      value={newAnnouncementTitle}
                      onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
                    />
                    <textarea
                      required
                      rows={2}
                      placeholder="Escribe el mensaje o aviso para los aprendices de este grupo..."
                      value={newAnnouncementMessage}
                      onChange={(e) => setNewAnnouncementMessage(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50 resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={
                          isPublishingAnnouncement ||
                          !newAnnouncementTitle.trim() ||
                          !newAnnouncementMessage.trim()
                        }
                        className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isPublishingAnnouncement ? 'Publicando...' : 'Publicar aviso'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Lista de anuncios en el muro */}
                  {classAnnouncements.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
                      <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">No hay avisos publicados en el muro aún</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Utiliza el formulario superior para comunicar instrucciones o fechas clave a tu grupo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {classAnnouncements.map((ann) => (
                        <div
                          key={ann.id}
                          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-bold text-[#00324D]">{ann.creatorName || 'Instructor'}</span>
                            <span>{new Date(ann.publishedAt || ann.createdAt).toLocaleDateString('es-CO')}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">{ann.title}</h4>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{ann.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Modales Embebidos para Acciones de la Ficha */}
          {isAddLearnerModalOpen && (
            <AddLearnerModal
              isOpen={isAddLearnerModalOpen}
              onClose={() => setIsAddLearnerModalOpen(false)}
              ficha={activeFicha}
              instructorUid={instructorUid}
              instructorName={userProfile?.displayName}
              onLearnerAdded={() => {
                loadActiveFichaClassData();
                loadFichasAndCatalogs();
              }}
            />
          )}

          {isActivityModalOpen && (
            <ActivityFormModal
              isOpen={isActivityModalOpen}
              onClose={() => setIsActivityModalOpen(false)}
              defaultFichaId={activeFicha.id}
              onActivitySaved={() => {
                setIsActivityModalOpen(false);
                loadActiveFichaClassData();
                loadFichasAndCatalogs();
              }}
            />
          )}

          {isResourceModalOpen && (
            <ResourceFormModal
              isOpen={isResourceModalOpen}
              onClose={() => setIsResourceModalOpen(false)}
              preselectedFichaId={activeFicha.id}
              onResourceSaved={() => {
                setIsResourceModalOpen(false);
                loadActiveFichaClassData();
              }}
            />
          )}

          {selectedApprenticeProfile && (
            <ApprenticeAcademicProfileModal
              apprentice={selectedApprenticeProfile}
              onClose={() => setSelectedApprenticeProfile(null)}
            />
          )}

          {/* Modal para Registrar Observación de Seguimiento */}
          <Modal
            isOpen={isAddTrackingModalOpen}
            onClose={() => setIsAddTrackingModalOpen(false)}
            title="Registrar Observación de Seguimiento"
          >
            <form onSubmit={handleSaveTrackingRecord} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Aprendiz *</label>
                <select
                  required
                  value={newTrackingLearnerId}
                  onChange={(e) => setNewTrackingLearnerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
                >
                  <option value="">Selecciona un aprendiz de la ficha...</option>
                  {classApprentices.map((app) => (
                    <option key={app.uid} value={app.uid}>
                      {app.displayName} ({app.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Registro</label>
                  <select
                    value={newTrackingType}
                    onChange={(e) => setNewTrackingType(e.target.value as LearnerRecordType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
                  >
                    <option value="academic">Académico</option>
                    <option value="behavioral">Comportamental</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={newTrackingCategory}
                    onChange={(e) => setNewTrackingCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-[#39A900]"
                  >
                    <option value="low_performance">Bajo Rendimiento</option>
                    <option value="missing_evidence">Evidencia Faltante</option>
                    <option value="learning_difficulty">Dificultad de Aprendizaje</option>
                    <option value="improvement">Mejora Continua Destacada</option>
                    <option value="participation">Excelente Participación</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción de la Observación *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detalla la observación pedagógica..."
                  value={newTrackingDescription}
                  onChange={(e) => setNewTrackingDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTrackingModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingTracking || !newTrackingLearnerId || !newTrackingDescription.trim()}
                  className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSavingTracking ? 'Guardando...' : 'Guardar Observación'}
                </button>
              </div>
            </form>
          </Modal>

          {/* =========================================================================
              PROMPT 33: MODAL 1 — ENTREGAS DE LA ACTIVIDAD (CALIFICAR EVIDENCIAS)
              Filtrado automáticamente por fichaId = activeFicha.id y activityId
             ========================================================================= */}
          <Modal
            isOpen={isActivitySubmissionsModalOpen}
            onClose={() => {
              setIsActivitySubmissionsModalOpen(false);
              setSelectedActivityForGrading(null);
            }}
            title={`Calificar Evidencias — ${selectedActivityForGrading?.title || 'Actividad Formativa'}`}
            subtitle={`Ficha #${activeFicha?.number || ''} · ${activeFicha?.name || activeFicha?.programName || ''}`}
            maxWidth="5xl"
          >
            <div className="space-y-4">
              {/* Cabecera y botón de salto a pestaña Evidencias de la Ficha */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <p className="text-xs text-slate-600">
                    Califica las evidencias de los aprendices matriculados en esta ficha para esta actividad formativa.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {selectedActivityForGrading?.rubricId && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Sliders className="w-3 h-3 text-[#39A900]" />
                        Evaluación con Rúbrica Pedagógica disponible
                      </span>
                    )}
                    {selectedActivityForGrading?.dueDate && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Límite: {new Date(selectedActivityForGrading.dueDate).toLocaleDateString('es-CO')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedActivityForGrading) {
                        setSubmissionFilterActivityId(selectedActivityForGrading.id);
                      }
                      setActiveClassTab('submissions');
                      setIsActivitySubmissionsModalOpen(false);
                    }}
                    className="px-3 py-1.5 bg-[#EBF8E7] hover:bg-[#d9f3d2] text-[#2E8500] border border-[#39A900]/30 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    title="Ver y filtrar todas las evidencias en la pestaña principal Evidencias"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>Ver en pestaña Evidencias</span>
                  </button>
                </div>
              </div>

              {/* Tarjetas de Resumen de Calificación de la Actividad — 8 Indicadores Diferenciados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-500 font-medium text-[11px] truncate">Total Aprendices</span>
                  <strong className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                    {activityLearnerMetrics.total}
                  </strong>
                </div>
                <div className="p-2.5 bg-sky-50 border border-sky-200/80 rounded-xl flex flex-col justify-between">
                  <span className="text-sky-700 font-medium text-[11px] truncate">Con entrega</span>
                  <strong className="text-base font-extrabold text-sky-900 font-mono mt-0.5">
                    {activityLearnerMetrics.deliveredCount}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-100 border border-slate-300/80 rounded-xl flex flex-col justify-between">
                  <span className="text-slate-600 font-medium text-[11px] truncate">Sin entrega</span>
                  <strong className="text-base font-extrabold text-slate-800 font-mono mt-0.5">
                    {activityLearnerMetrics.unsubmittedCount}
                  </strong>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl flex flex-col justify-between">
                  <span className="text-amber-800 font-medium text-[11px] truncate">Por calificar</span>
                  <strong className="text-base font-extrabold text-amber-900 font-mono mt-0.5">
                    {activityLearnerMetrics.pendingGradeCount}
                  </strong>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex flex-col justify-between">
                  <span className="text-emerald-800 font-medium text-[11px] truncate">Aprobadas (A)</span>
                  <strong className="text-base font-extrabold text-[#2E8500] font-mono mt-0.5">
                    {activityLearnerMetrics.approvedCount}
                  </strong>
                </div>
                <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl flex flex-col justify-between">
                  <span className="text-rose-800 font-medium text-[11px] truncate">No aprobadas (N)</span>
                  <strong className="text-base font-extrabold text-rose-900 font-mono mt-0.5">
                    {activityLearnerMetrics.notApprovedCount}
                  </strong>
                </div>
                <div className="p-2.5 bg-orange-50 border border-orange-200/80 rounded-xl flex flex-col justify-between">
                  <span className="text-orange-800 font-medium text-[11px] truncate">Por corregir (C)</span>
                  <strong className="text-base font-extrabold text-orange-900 font-mono mt-0.5">
                    {activityLearnerMetrics.correctionCount}
                  </strong>
                </div>
                <div className="p-2.5 bg-purple-50 border border-purple-200/80 rounded-xl flex flex-col justify-between">
                  <span className="text-purple-800 font-medium text-[11px] truncate">Excluidos (E)</span>
                  <strong className="text-base font-extrabold text-purple-900 font-mono mt-0.5">
                    {activityLearnerMetrics.excludedCount}
                  </strong>
                </div>
              </div>

              {/* Barra de Búsqueda, Ordenamiento, Calificar Todo y Filtros de Estado */}
              <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  {/* Buscador */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por aprendiz, correo, cédula o archivo..."
                      value={activitySubmissionSearchTerm}
                      onChange={(e) => setActivitySubmissionSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                    />
                  </div>

                  {/* Selector: Ordenar por */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden md:inline">Ordenar por:</span>
                    </span>
                    <select
                      value={activitySortCriterion}
                      onChange={(e) => setActivitySortCriterion(e.target.value as any)}
                      className="text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#39A900] cursor-pointer"
                      title="Criterio de ordenamiento de la planilla"
                    >
                      <option value="name_asc">Nombre (A - Z)</option>
                      <option value="name_desc">Nombre (Z - A)</option>
                      <option value="delivered_first">Con evidencia entregada</option>
                      <option value="unsubmitted_first">Sin evidencia entregada</option>
                      <option value="pending_grade_first">Pendientes de calificación</option>
                      <option value="graded_first">Calificados</option>
                    </select>
                  </div>

                  {/* Botón: Calificar todo con Menú desplegable */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsBulkMenuOpen((prev) => !prev)}
                      className="w-full sm:w-auto px-3 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                      title="Operaciones de calificación masiva controlada"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-[#8CE665]" />
                      <span>Calificar todo</span>
                      <ChevronDown className="w-3 h-3 text-slate-300" />
                    </button>

                    {isBulkMenuOpen && (
                      <div
                        ref={bulkMenuRef}
                        className="absolute right-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                          Operaciones Masivas de Evaluación
                        </div>

                        {/* Opción A */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsBulkMenuOpen(false);
                            setBulkMode('all');
                            setBulkGradeChoice('A');
                            setBulkFeedbackText('');
                            setBulkResultSummary(null);
                            setIsBulkModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer group border-b border-slate-50"
                        >
                          <span className="w-6 h-6 rounded-lg bg-emerald-100 text-[#2E8500] font-black text-xs flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            A
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              Opción A. Calificar a todos los aprendices
                            </p>
                            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                              Aplica un dictamen elegido (A, N o C) a todos los aprendices evaluables ({activityLearnerMetrics.total - activityLearnerMetrics.excludedCount}).
                            </p>
                          </div>
                        </button>

                        {/* Opción B */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsBulkMenuOpen(false);
                            setBulkMode('unsubmitted_n');
                            setBulkGradeChoice('N');
                            setBulkFeedbackText('No presentó evidencia formativa en los plazos y condiciones estipuladas.');
                            setBulkResultSummary(null);
                            setIsBulkModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer group border-b border-slate-50"
                        >
                          <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            B
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              Opción B. Calificar como no aprobado (N) a quienes no entregaron
                            </p>
                            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                              Aplica dictamen N únicamente a los {activityLearnerMetrics.unsubmittedCount} aprendices sin evidencia radicada.
                            </p>
                          </div>
                        </button>

                        {/* Opción C */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsBulkMenuOpen(false);
                            setBulkMode('delivered_a');
                            setBulkGradeChoice('A');
                            setBulkFeedbackText('Evidencia formativa aprobada satisfactoriamente.');
                            setBulkResultSummary(null);
                            setIsBulkModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-start gap-2.5 cursor-pointer group"
                        >
                          <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            C
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              Opción C. Calificar como aprobado (A) solo a quienes entregaron
                            </p>
                            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                              Aplica dictamen A únicamente a las {activityLearnerMetrics.deliveredCount} entregas radicadas.
                            </p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Filtros rápidos de estado */}
                <div className="flex items-center gap-1 overflow-x-auto w-full shrink-0 pt-1 pb-0.5 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setActivitySubmissionFilterStatus('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activitySubmissionFilterStatus === 'all'
                        ? 'bg-[#00324D] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Todos ({activityLearnerMetrics.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivitySubmissionFilterStatus('submitted')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activitySubmissionFilterStatus === 'submitted'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white text-sky-800 hover:bg-sky-50 border border-sky-200'
                    }`}
                  >
                    Con entrega ({activityLearnerMetrics.deliveredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivitySubmissionFilterStatus('unsubmitted')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activitySubmissionFilterStatus === 'unsubmitted'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Sin entrega ({activityLearnerMetrics.unsubmittedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivitySubmissionFilterStatus('pending')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activitySubmissionFilterStatus === 'pending'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                    }`}
                  >
                    Por calificar ({activityLearnerMetrics.pendingGradeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivitySubmissionFilterStatus('graded')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activitySubmissionFilterStatus === 'graded'
                        ? 'bg-[#39A900] text-white shadow-xs'
                        : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    Calificados ({activityLearnerMetrics.gradedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivitySubmissionFilterStatus('approved')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activitySubmissionFilterStatus === 'approved'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    A ({activityLearnerMetrics.approvedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivitySubmissionFilterStatus('not_approved')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activitySubmissionFilterStatus === 'not_approved'
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'bg-white text-rose-800 hover:bg-rose-50 border border-rose-200'
                    }`}
                  >
                    N ({activityLearnerMetrics.notApprovedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivitySubmissionFilterStatus('correction')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activitySubmissionFilterStatus === 'correction'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-white text-orange-800 hover:bg-orange-50 border border-orange-200'
                    }`}
                  >
                    C ({activityLearnerMetrics.correctionCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivitySubmissionFilterStatus('excluded')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activitySubmissionFilterStatus === 'excluded'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-200'
                    }`}
                  >
                    Excluidos E ({activityLearnerMetrics.excludedCount})
                  </button>
                </div>
              </div>

              {/* Estado de carga */}
              {loadingActivitySubmissions ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
                  <p className="text-xs font-medium">Consultando evidencias y aprendices en Firestore...</p>
                </div>
              ) : filteredActivityLearnerRows.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
                  <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">
                    No hay aprendices en este filtro
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {activityLearnerRows.length === 0
                      ? 'No hay aprendices matriculados en esta ficha aún. Agrega aprendices desde la pestaña Aprendices.'
                      : 'Ajusta los criterios de búsqueda o el filtro de estado para ver a los aprendices.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#00324D] text-white border-b border-slate-700">
                          <th className="p-3 font-bold">Aprendiz</th>
                          <th className="p-3 font-bold">Evidencia / Entrega</th>
                          <th className="p-3 font-bold">Fecha</th>
                          <th className="p-3 font-bold text-center">Estado</th>
                          <th className="p-3 font-bold text-center">Dictamen SENA</th>
                          <th className="p-3 font-bold text-right">Calificar / Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredActivityLearnerRows.map((row) => {
                          const sub = row.submission;
                          return (
                            <tr key={row.key} className="hover:bg-slate-50/80 transition-colors">
                              {/* Aprendiz */}
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  {row.learnerPhoto ? (
                                    <img
                                      src={row.learnerPhoto}
                                      alt={row.learnerName}
                                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                                      {row.learnerName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-900 block truncate">
                                      {row.learnerName}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-500 block truncate">
                                      {row.learnerEmail}
                                    </span>
                                    {row.documentNumber && row.documentNumber !== 'No registrado' && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        CC: {row.documentNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Evidencia / Entrega */}
                              <td className="p-3 text-slate-800">
                                {row.hasDelivered ? (
                                  <div className="space-y-0.5">
                                    <span className="font-mono text-[11px] font-semibold text-slate-800 truncate block max-w-xs">
                                      {sub.fileName || sub.activityTitle || 'Archivo adjunto'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.2 rounded border border-sky-200">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-sky-600" />
                                      Entregado
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="text-[11px] text-slate-400 italic">
                                      Sin archivo adjunto
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.2 rounded border border-amber-200 block w-fit">
                                      Pendiente de entrega
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Fecha */}
                              <td className="p-3 text-slate-500 whitespace-nowrap">
                                {sub.submittedAt ? (
                                  <div>
                                    <span className="block font-medium">
                                      {new Date(sub.submittedAt).toLocaleDateString('es-CO')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {new Date(sub.submittedAt).toLocaleTimeString('es-CO', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Estado */}
                              <td className="p-3 text-center whitespace-nowrap">
                                <StatusBadge
                                  status={row.isExcluded ? 'excluido' : (sub.status || 'submitted')}
                                  size="sm"
                                  customLabel={row.isExcluded ? 'Excluido' : undefined}
                                />
                              </td>

                              {/* Dictamen */}
                              <td className="p-3 text-center whitespace-nowrap">
                                {row.isExcluded ? (
                                  <span className="font-mono font-bold px-2.5 py-1 rounded text-xs inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                                    <ShieldAlert className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                    Excluido (E)
                                  </span>
                                ) : sub.grade ? (
                                  <span
                                    className={`font-mono font-black px-2.5 py-1 rounded text-xs inline-flex items-center gap-1 shadow-2xs ${
                                      sub.grade === 'A'
                                        ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/40'
                                        : sub.grade === 'C'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                  >
                                    {sub.grade === 'A' ? 'A — Aprobado' : sub.grade === 'C' ? 'C — Corregir' : 'N — No aprobado'}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Sin calificar
                                  </span>
                                )}
                              </td>

                              {/* Acciones de Calificación */}
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* Ver evidencia (si tiene archivo o enlace) */}
                                  {row.hasDelivered && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSubmissionToView(sub);
                                        setIsViewEvidenceModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                      title="Inspeccionar evidencia"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                                      Ver
                                    </button>
                                  )}

                                  {/* Evaluación rápida [A] inline */}
                                  <button
                                    type="button"
                                    disabled={gradingSubmissionId === sub.id}
                                    onClick={() => handleQuickInlineGrade(sub, 'A')}
                                    className={`px-2.5 py-1 rounded font-black text-[11px] cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed ${
                                      sub.grade === 'A' && !row.isExcluded
                                        ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/40 ring-1 ring-[#39A900]/30'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}
                                    title="Aprobar evidencia (A)"
                                  >
                                    A
                                  </button>

                                  {/* Evaluación rápida [C] inline */}
                                  <button
                                    type="button"
                                    disabled={gradingSubmissionId === sub.id}
                                    onClick={() => handleQuickInlineGrade(sub, 'C')}
                                    className={`px-2.5 py-1 rounded font-black text-[11px] cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed ${
                                      sub.grade === 'C' && !row.isExcluded
                                        ? 'bg-amber-100 text-amber-900 border border-amber-400 ring-1 ring-amber-400/30'
                                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                    title="Solicitar corrección (C)"
                                  >
                                    C
                                  </button>

                                  {/* Evaluación rápida [N] inline */}
                                  <button
                                    type="button"
                                    disabled={gradingSubmissionId === sub.id}
                                    onClick={() => handleQuickInlineGrade(sub, 'N')}
                                    className={`px-2.5 py-1 rounded font-black text-[11px] cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed ${
                                      sub.grade === 'N' && !row.isExcluded
                                        ? 'bg-rose-100 text-rose-900 border border-rose-400 ring-1 ring-rose-400/30'
                                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                                    }`}
                                    title="No aprobar evidencia (N)"
                                  >
                                    N
                                  </button>

                                  {/* Botón [E] — Excluir / Exonerar de esta evidencia */}
                                  <button
                                    type="button"
                                    disabled={gradingSubmissionId === sub.id}
                                    onClick={() => {
                                      setSelectedRowForExclusion(row);
                                      setExclusionReasonInput(row.exclusionReason || '');
                                      setIsExclusionModalOpen(true);
                                    }}
                                    className={`px-2.5 py-1 rounded font-black text-[11px] cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed ${
                                      row.isExcluded
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white border border-purple-700 ring-1 ring-purple-400/40'
                                        : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200'
                                    }`}
                                    title={
                                      row.isExcluded
                                        ? 'Aprendiz excluido. Clic para consultar o retirar exclusión.'
                                        : 'Excluir / Exonerar aprendiz de esta evidencia (E)'
                                    }
                                  >
                                    E
                                  </button>

                                  {/* Calificar detallado con Feedback */}
                                  <button
                                    type="button"
                                    disabled={gradingSubmissionId === sub.id}
                                    onClick={() => handleOpenGradingModal(sub, (sub.grade as AcademicGradeCode) || 'A', 'official')}
                                    className="px-2.5 py-1 bg-[#00324D] hover:bg-[#004A73] text-white rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
                                    title="Calificar con retroalimentación pedagógica"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-[#8CE665]" />
                                    Feedback
                                  </button>

                                  {/* Calificar con Rúbrica Pedagógica */}
                                  {selectedActivityForGrading?.rubricId && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenGradingModal(sub, (sub.grade as AcademicGradeCode) || 'A', 'rubric')}
                                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#2E8500] border border-emerald-200 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                      title="Evaluar con Rúbrica Pedagógica"
                                    >
                                      <Sliders className="w-3.5 h-3.5 text-[#39A900]" />
                                      Rúbrica
                                    </button>
                                  )}

                                  {/* Drive link directo */}
                                  {sub.driveFileUrl && (
                                    <a
                                      href={sub.driveFileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-md transition-colors inline-flex items-center"
                                      title="Abrir en Google Drive"
                                    >
                                      <HardDrive className="w-3.5 h-3.5 text-blue-600" />
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
            </div>
          </Modal>

          {/* =========================================================================
              MODAL DE CALIFICACIÓN MASIVA («CALIFICAR TODO» — OPCIONES A, B Y C)
             ========================================================================= */}
          <Modal
            isOpen={isBulkModalOpen}
            onClose={() => {
              if (!isExecutingBulk) {
                setIsBulkModalOpen(false);
                setBulkResultSummary(null);
              }
            }}
            title={
              bulkMode === 'all'
                ? 'Opción A — Calificar a Todos los Aprendices'
                : bulkMode === 'unsubmitted_n'
                ? 'Opción B — Calificar como No Aprobado (N) a Sin Entrega'
                : 'Opción C — Calificar como Aprobado (A) a Quienes Entregaron'
            }
            subtitle={`Ficha #${activeFicha?.number || ''} · ${selectedActivityForGrading?.title || 'Actividad Formativa'}`}
            maxWidth="2xl"
          >
            {bulkResultSummary ? (
              // Resumen final de la operación masiva
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-[#39A900] mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-900">
                    Proceso de Calificación Masiva Finalizado
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Se procesaron exitosamente {bulkResultSummary.successCount} de {bulkResultSummary.totalProcessed} registros en Firestore.
                  </p>
                </div>

                {bulkResultSummary.failedItems.length > 0 ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-rose-800 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        {bulkResultSummary.failedItems.length} aprendices presentaron errores al guardar:
                      </span>
                      <ul className="divide-y divide-rose-100 text-[11px] text-rose-700 max-h-40 overflow-y-auto">
                        {bulkResultSummary.failedItems.map((fail) => (
                          <li key={fail.learnerId} className="py-1.5 flex justify-between gap-2">
                            <span className="font-semibold">{fail.learnerName}</span>
                            <span className="italic text-rose-600 truncate max-w-xs">{fail.error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const rowsToRetry = bulkResultSummary.failedItems.map((f) => f.row);
                          handleStartBulkGrading(
                            rowsToRetry,
                            bulkMode!,
                            bulkMode === 'unsubmitted_n' ? 'N' : bulkMode === 'delivered_a' ? 'A' : bulkGradeChoice,
                            bulkFeedbackText
                          );
                        }}
                        disabled={isExecutingBulk}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reintentar únicamente fallidos ({bulkResultSummary.failedItems.length})
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-xs text-slate-500">
                      Todas las calificaciones fueron asentadas y los aprendices han sido notificados.
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkModalOpen(false);
                      setBulkResultSummary(null);
                    }}
                    className="px-4 py-2 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Aceptar y Volver a la Planilla
                  </button>
                </div>
              </div>
            ) : (
              // Vista de confirmación y selección previa
              <div className="space-y-4 text-xs text-slate-700">
                {/* Métricas del alcance de la operación */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[11px] text-slate-500 block">Total Aprendices</span>
                    <strong className="text-sm font-bold text-slate-900 font-mono">
                      {activityLearnerMetrics.total}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-[#EBF8E7] border border-[#39A900]/30 rounded-xl">
                    <span className="text-[11px] text-emerald-800 block">Aprendices a calificar</span>
                    <strong className="text-sm font-bold text-[#2E8500] font-mono">
                      {bulkTargetRows.length}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl">
                    <span className="text-[11px] text-sky-800 block">Con entrega</span>
                    <strong className="text-sm font-bold text-sky-900 font-mono">
                      {bulkTargetRows.filter((r) => r.hasDelivered).length}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                    <span className="text-[11px] text-purple-800 block">Excluidos (protegidos)</span>
                    <strong className="text-sm font-bold text-purple-900 font-mono">
                      {activityLearnerMetrics.excludedCount}
                    </strong>
                  </div>
                </div>

                {/* Explicación pedagógica según modo */}
                {bulkMode === 'all' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-amber-900 leading-relaxed font-medium">
                        Selecciona el dictamen oficial SENA que deseas aplicar a los <strong>{bulkTargetRows.length}</strong> aprendices evaluables de la ficha. Esta acción no se aplica automáticamente con A; debes elegir explícitamente el dictamen.
                      </p>
                    </div>

                    {/* Selector de dictamen para Opción A */}
                    <div>
                      <label className="block font-bold text-slate-800 mb-1.5">
                        Dictamen oficial a aplicar:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setBulkGradeChoice('A')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            bulkGradeChoice === 'A'
                              ? 'bg-[#EBF8E7] text-[#2E8500] border-[#39A900] ring-2 ring-[#39A900]/30 font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-mono text-base block font-black">A</span>
                          <span className="text-[11px] block">Aprobado</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkGradeChoice('N')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            bulkGradeChoice === 'N'
                              ? 'bg-rose-50 text-rose-800 border-rose-400 ring-2 ring-rose-400/30 font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-mono text-base block font-black">N</span>
                          <span className="text-[11px] block">No Aprobado</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkGradeChoice('C')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            bulkGradeChoice === 'C'
                              ? 'bg-amber-50 text-amber-900 border-amber-400 ring-2 ring-amber-400/30 font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-mono text-base block font-black">C</span>
                          <span className="text-[11px] block">Por Corregir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {bulkMode === 'unsubmitted_n' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                    <span className="font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Calificación de no presentación
                    </span>
                    <p className="text-rose-800 leading-relaxed text-[11px]">
                      Se aplicará dictamen <strong>N — No aprobado</strong> exclusivamente a los <strong>{bulkTargetRows.length}</strong> aprendices que no han radicado ninguna evidencia. No se crearán archivos ni evidencias ficticias; se asentará formalmente el registro de evaluación por no presentación. Las calificaciones de quienes sí entregaron no serán modificadas.
                    </p>
                  </div>
                )}

                {bulkMode === 'delivered_a' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Advertencia Pedagógica Obligatoria
                    </span>
                    <p className="text-amber-800 leading-relaxed text-[11px]">
                      Al ejecutar esta operación, el instructor asume formalmente la decisión académica de calificar como <strong>A — APROBADO</strong> a las <strong>{bulkTargetRows.length}</strong> evidencias radicadas sin realizar una revisión pormenorizada individual. Quienes no entregaron evidencia no serán modificados.
                    </p>
                  </div>
                )}

                {/* Campo de retroalimentación general opcional */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Retroalimentación pedagógica a adjuntar:
                  </label>
                  <textarea
                    rows={2}
                    value={bulkFeedbackText}
                    onChange={(e) => setBulkFeedbackText(e.target.value)}
                    placeholder="Escribe la retroalimentación institucional o deja en blanco para usar la oficial..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#39A900] resize-none"
                  />
                </div>

                {/* Barra de progreso interactiva si está en ejecución */}
                {isExecutingBulk && (
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#39A900]" />
                        Procesando en Firestore: {bulkProgress.currentName}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {bulkProgress.current} de {bulkProgress.total} ({Math.round((bulkProgress.current / (bulkProgress.total || 1)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#39A900] h-full transition-all duration-150"
                        style={{
                          width: `${Math.round((bulkProgress.current / (bulkProgress.total || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Botones de acción del Modal */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={isExecutingBulk}
                    onClick={() => setIsBulkModalOpen(false)}
                    className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isExecutingBulk || bulkTargetRows.length === 0}
                    onClick={() => {
                      const gradeToApply: AcademicGradeCode =
                        bulkMode === 'unsubmitted_n' ? 'N' : bulkMode === 'delivered_a' ? 'A' : bulkGradeChoice;
                      handleStartBulkGrading(bulkTargetRows, bulkMode!, gradeToApply, bulkFeedbackText);
                    }}
                    className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                  >
                    {isExecutingBulk && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {isExecutingBulk
                        ? 'Calificando en lote...'
                        : `Confirmar y Calificar (${bulkTargetRows.length})`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </Modal>

          {/* =========================================================================
              MODAL DE EXCLUSIÓN INDIVIDUAL DE APRENDIZ (BOTÓN E - EXCLUIR)
             ========================================================================= */}
          <Modal
            isOpen={isExclusionModalOpen}
            onClose={() => {
              if (!isSavingExclusion) {
                setIsExclusionModalOpen(false);
                setSelectedRowForExclusion(null);
              }
            }}
            title={
              selectedRowForExclusion?.isExcluded
                ? 'Retirar Exclusión de Evidencia Formativa'
                : 'Excluir Aprendiz de Evidencia Formativa (E)'
            }
            subtitle={selectedActivityForGrading?.title || 'Actividad Formativa'}
            maxWidth="md"
          >
            {selectedRowForExclusion && (
              <div className="space-y-4 text-xs text-slate-700">
                {/* Tarjeta del Aprendiz */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  {selectedRowForExclusion.learnerPhoto ? (
                    <img
                      src={selectedRowForExclusion.learnerPhoto}
                      alt={selectedRowForExclusion.learnerName}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-sm shrink-0 font-mono">
                      {selectedRowForExclusion.learnerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <strong className="text-slate-900 block truncate text-sm">
                      {selectedRowForExclusion.learnerName}
                    </strong>
                    <span className="text-slate-500 block truncate font-mono text-[11px]">
                      {selectedRowForExclusion.learnerEmail}
                    </span>
                    {selectedRowForExclusion.documentNumber && selectedRowForExclusion.documentNumber !== 'No registrado' && (
                      <span className="text-slate-400 font-mono text-[10px]">
                        CC: {selectedRowForExclusion.documentNumber}
                      </span>
                    )}
                  </div>
                </div>

                {selectedRowForExclusion.isExcluded ? (
                  // Caso: Ya está excluido -> Permitir retirar la exclusión
                  <div className="space-y-3">
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5">
                      <span className="font-bold text-purple-900 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-purple-600" />
                        Exclusión activa registrada
                      </span>
                      <p className="text-purple-800 leading-relaxed text-[11px]">
                        Este aprendiz se encuentra actualmente exonerado de esta evidencia formativa.
                      </p>
                      {selectedRowForExclusion.excludedAt && (
                        <p className="text-[11px] text-purple-700">
                          <strong>Fecha:</strong> {new Date(selectedRowForExclusion.excludedAt).toLocaleDateString('es-CO')}
                        </p>
                      )}
                      {selectedRowForExclusion.excludedByName && (
                        <p className="text-[11px] text-purple-700">
                          <strong>Registrado por:</strong> {selectedRowForExclusion.excludedByName}
                        </p>
                      )}
                      {selectedRowForExclusion.exclusionReason && (
                        <p className="text-[11px] text-purple-700">
                          <strong>Motivo:</strong> {selectedRowForExclusion.exclusionReason}
                        </p>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Al retirar la exclusión, el aprendiz volverá a ser evaluable para esta actividad, se computará en los pendientes de entrega y podrá ser calificado individual o masivamente.
                    </p>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        disabled={isSavingExclusion}
                        onClick={() => setIsExclusionModalOpen(false)}
                        className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={isSavingExclusion}
                        onClick={handleRemoveExclusion}
                        className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                      >
                        {isSavingExclusion && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>Retirar Exclusión (Rehabilitar)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Caso: No está excluido -> Confirmar exclusión
                  <div className="space-y-3">
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5">
                      <span className="font-bold text-purple-900 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-purple-700" />
                        Alcance de la Exclusión Pedagógica
                      </span>
                      <p className="text-purple-800 leading-relaxed text-[11px]">
                        Al excluir al aprendiz, este quedará exonerado de radicar y calificar esta evidencia específica. No afectará su matrícula en la ficha ni sus calificaciones en otras actividades. Se omitirá de los conteos de pendientes y de las operaciones masivas.
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Motivo pedagógico de la exclusión (opcional):
                      </label>
                      <textarea
                        rows={3}
                        value={exclusionReasonInput}
                        onChange={(e) => setExclusionReasonInput(e.target.value)}
                        placeholder="Ej: Exonerado por homologación de competencias, incapacidad médica o acuerdo pedagógico..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-600 resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        disabled={isSavingExclusion}
                        onClick={() => setIsExclusionModalOpen(false)}
                        className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={isSavingExclusion}
                        onClick={handleConfirmExclusion}
                        className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                      >
                        {isSavingExclusion && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>Confirmar Exclusión (E)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal>

          {/* =========================================================================
              PROMPT 33: MODAL 2 — CALIFICACIÓN INDIVIDUAL A/N/C & RÚBRICA PEDAGÓGICA
              Reutiliza exactamente los componentes y reglas de InstructorSubmissionsView
             ========================================================================= */}
          {selectedSubmissionForGrade && (
            <Modal
              isOpen={isGradingModalOpen}
              onClose={() => setIsGradingModalOpen(false)}
              title="Calificar Evidencia Pedagógica"
              subtitle={`${selectedSubmissionForGrade.learnerName || 'Aprendiz'} · ${selectedSubmissionForGrade.activityTitle || selectedActivityForGrading?.title || 'Actividad Formativa'}`}
              footer={
                <>
                  <button
                    type="button"
                    onClick={() => setIsGradingModalOpen(false)}
                    className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGradeModal}
                    disabled={isSavingGrade}
                    className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                  >
                    {isSavingGrade && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSavingGrade ? 'Guardando dictamen...' : 'Guardar Dictamen'}</span>
                  </button>
                </>
              }
            >
              <div className="space-y-4">
                {/* Mensaje de validación o error */}
                {gradingModalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold block">No se pudo guardar la calificación:</span>
                      <span>{gradingModalError}</span>
                    </div>
                  </div>
                )}

                {/* Pestañas de Dictamen Oficial vs Rúbrica Pedagógica */}
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

                {/* Pestaña: Rúbrica Pedagógica */}
                {activeGradingTab === 'rubric' && currentRubric ? (
                  <div className="space-y-4">
                    <RubricEvaluationForm
                      rubric={currentRubric}
                      initialResults={rubricResults?.criteriaResults}
                      onResultsChange={(res) => {
                        setRubricResults(res);
                      }}
                    />

                    {/* Panel de Puntos, Porcentaje, Sugerencia y Dictamen Oficial */}
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

                      {/* Sugerencia pedagógica orientativa */}
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
                    {/* Pestaña: Dictamen Oficial A/N/C */}
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
                          className="text-[11px] font-bold text-sky-800 hover:underline cursor-pointer"
                        >
                          Ajustar criterios
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-2">
                        Resultado Oficial SENA (Dictamen) *
                      </label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {/* [ A ] */}
                        <button
                          type="button"
                          onClick={() => setSelectedGradeCode('A')}
                          className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedGradeCode === 'A'
                              ? 'bg-emerald-50 border-[#39A900] text-[#2E8500] font-black shadow-sm ring-2 ring-[#39A900]/30'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="text-2xl font-black">A</div>
                          <div className="text-xs font-bold mt-1">APROBADO</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Cumple criterios</div>
                        </button>

                        {/* [ N ] */}
                        <button
                          type="button"
                          onClick={() => setSelectedGradeCode('N')}
                          className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedGradeCode === 'N'
                              ? 'bg-rose-50 border-rose-500 text-rose-700 font-black shadow-sm ring-2 ring-rose-500/30'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="text-2xl font-black">N</div>
                          <div className="text-xs font-bold mt-1">NO APROBADO</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">No cumple criterios</div>
                        </button>

                        {/* [ C ] */}
                        <button
                          type="button"
                          onClick={() => setSelectedGradeCode('C')}
                          className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedGradeCode === 'C'
                              ? 'bg-amber-50 border-amber-500 text-amber-800 font-black shadow-sm ring-2 ring-amber-500/30'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="text-2xl font-black">C</div>
                          <div className="text-xs font-bold mt-1">CORREGIR</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Habilita nuevo reenvío</div>
                        </button>
                      </div>
                    </div>

                    {/* Retroalimentación escrita */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-800">
                          Retroalimentación del Instructor {selectedGradeCode === 'C' && '*'}
                        </label>
                        {selectedGradeCode === 'C' && (
                          <span className="text-[11px] font-bold text-amber-700">
                            * Obligatoria para dictamen C
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={4}
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder={
                          selectedGradeCode === 'C'
                            ? 'Explica detalladamente qué debe corregir o ajustar el aprendiz para su nueva entrega...'
                            : selectedGradeCode === 'N'
                            ? 'Indica los motivos formativos de la no aprobación...'
                            : 'Observaciones o felicitaciones por el desempeño...'
                        }
                        className={`w-full px-3.5 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900] text-slate-800 bg-white ${
                          selectedGradeCode === 'C' && !feedbackInput.trim()
                            ? 'border-amber-300 bg-amber-50/30'
                            : 'border-slate-200'
                        }`}
                      />
                    </div>
                  </>
                )}

                {/* Resumen de la evidencia evaluada */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-700 block">Detalles de la entrega:</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span>Tipo: </span>
                      <strong className="font-mono text-slate-800">
                        {selectedSubmissionForGrade.submissionType || 'documento'}
                      </strong>
                    </div>
                    <div>
                      <span>Versión: </span>
                      <strong className="font-mono text-slate-800">
                        v{selectedSubmissionForGrade.version || 1}
                      </strong>
                    </div>
                    {selectedSubmissionForGrade.driveFileUrl && (
                      <div className="col-span-2">
                        <a
                          href={selectedSubmissionForGrade.driveFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <HardDrive className="w-3 h-3 text-[#39A900]" />
                          <span>Ver archivo entregado en Google Drive</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Modal>
          )}

          {/* Modal Inspección Detallada de Evidencia */}
          {submissionToView && (
            <Modal
              isOpen={isViewEvidenceModalOpen}
              onClose={() => {
                setIsViewEvidenceModalOpen(false);
                setSubmissionToView(null);
              }}
              title="Inspección de Evidencia de Aprendizaje"
              subtitle={`${submissionToView.learnerName || 'Aprendiz'} · ${submissionToView.activityTitle || 'Actividad Formativa'}`}
            >
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Aprendiz:</span>
                    <strong className="text-slate-900">{submissionToView.learnerName}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Correo:</span>
                    <strong className="font-mono text-slate-800">{submissionToView.learnerEmail}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Fecha de Entrega:</span>
                    <strong className="text-slate-800">
                      {submissionToView.submittedAt
                        ? new Date(submissionToView.submittedAt).toLocaleString('es-CO')
                        : 'No registrada'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Estado:</span>
                    <StatusBadge status={(submissionToView.status || 'submitted') as any} size="sm" />
                  </div>
                  {submissionToView.grade && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Dictamen Actual:</span>
                      <strong className="font-black text-xs text-[#2E8500] font-mono">
                        {submissionToView.grade}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Contenido / Enlace / Archivo de la Evidencia */}
                {submissionToView.driveFileUrl || submissionToView.driveFileId ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <HardDrive className="w-4 h-4 text-[#39A900]" />
                      <span>Evidencia alojada en Google Drive</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Archivo: <strong>{submissionToView.fileName || 'evidencia_adjunta'}</strong>
                    </p>
                    <div className="pt-2">
                      <a
                        href={submissionToView.driveFileUrl || `https://drive.google.com/file/d/${submissionToView.driveFileId}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#8CE665]" />
                        <span>Abrir Evidencia en Google Drive</span>
                      </a>
                    </div>
                  </div>
                ) : submissionToView.externalUrl ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-blue-900 block">Enlace Externo Presentado:</span>
                    <a
                      href={submissionToView.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-700 hover:underline break-all block font-semibold"
                    >
                      {submissionToView.externalUrl}
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic">
                    "{submissionToView.textContent || 'Sin contenido textual'}"
                  </div>
                )}

                {/* Retroalimentación actual registrada */}
                {submissionToView.feedback && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-slate-700 block">Última Retroalimentación Registrada:</span>
                    <p className="italic text-slate-800">{submissionToView.feedback}</p>
                    <div className="text-[10px] text-slate-400 pt-1">
                      Evaluado por: {submissionToView.gradedBy || 'Instructor'} el{' '}
                      {submissionToView.gradedAt ? submissionToView.gradedAt.split('T')[0] : 'N/A'}
                    </div>
                  </div>
                )}
              </div>
            </Modal>
          )}

          {/* Modal Historial de Entregas y Versiones (PROMPT 34 & Sección 3.F) */}
          {selectedSubmissionForHistory && (
            <Modal
              isOpen={isHistoryModalOpen}
              onClose={() => {
                setIsHistoryModalOpen(false);
                setSelectedSubmissionForHistory(null);
              }}
              title="Historial de Entregas y Versiones"
              subtitle={`${selectedSubmissionForHistory.learnerName || 'Aprendiz'} · ${selectedSubmissionForHistory.activityTitle || 'Actividad Formativa'}`}
            >
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  Registro histórico institucional de todas las versiones radicadas por el aprendiz y sus correspondientes dictámenes formativos.
                </p>

                <div className="space-y-3">
                  {(selectedSubmissionForHistory.submissionHistory || []).map((h, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Entrega Versión {h.version}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {h.submittedAt ? new Date(h.submittedAt).toLocaleString('es-CO') : 'Fecha anterior'}
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

                  {/* Versión Vigente Actual */}
                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950">
                        Versión Vigente Actual (v{selectedSubmissionForHistory.version || 1})
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800">
                        {new Date(selectedSubmissionForHistory.submittedAt).toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Estado actual:</span>
                      <span className="font-black text-xs text-slate-900">
                        {selectedSubmissionForHistory.grade || selectedSubmissionForHistory.status}
                      </span>
                    </div>
                    {selectedSubmissionForHistory.feedback && (
                      <p className="text-[11px] text-emerald-900 italic bg-white p-2 rounded border border-emerald-200">
                        "{selectedSubmissionForHistory.feedback}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Modal>
          )}

          {/* Modal Consulta Detallada de Rúbrica Pedagógica */}
          {isRubricViewModalOpen && selectedRubricEvaluationForView && (
            <RubricEvaluationViewModal
              isOpen={isRubricViewModalOpen}
              onClose={() => {
                setIsRubricViewModalOpen(false);
                setSelectedRubricEvaluationForView(null);
              }}
              evaluation={selectedRubricEvaluationForView}
            />
          )}

          {/* Toast flotante de confirmación */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-[#00324D] text-white px-4 py-3 rounded-xl shadow-lg border border-[#39A900] flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200">
              <CheckCircle2 className="w-4 h-4 text-[#8CE665] shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>
      );
    }
  }

  // =========================================================================
  // VISTA 1: GRID PRINCIPAL DE MIS FICHAS (EXPERIENCIA GOOGLE CLASSROOM)
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado Institucional SENA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Ambientes de Formación Integral
            </span>
            <span className="text-xs text-slate-500">
              Centro:{' '}
              <strong>
                {centers[0]?.name || 'Centro de Comercio y Servicios'}
              </strong>
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">Mis Fichas de Formación</h1>
          <p className="text-xs text-slate-500">
            Gestiona tus grupos de formación, trabajo en clase, aprendices, actividades y evidencias
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewFichaName('');
              setNewFichaNumber('');
              setNewDescription('');
              setNewStartDate('');
              setNewEndDate('');
              setFichaFormError(null);
              setIsCreateFichaModalOpen(true);
            }}
            className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Crear nueva ficha
          </button>
        </div>
      </div>

      {/* 2. Barra de Búsqueda de Fichas */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="🔎 Buscar ficha por número, nombre o programa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 px-2 shrink-0">
          {filteredFichas.length} {filteredFichas.length === 1 ? 'ficha' : 'fichas'}
        </span>
      </div>

      {/* 3. Grid de Fichas (Google Classroom Cards) */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Consultando tus fichas en Firestore...</p>
        </div>
      ) : filteredFichas.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto space-y-4 my-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#00324D]">
              {searchTerm ? 'No se encontraron fichas con ese criterio' : 'No tienes fichas registradas aún'}
            </h3>
            <p className="text-xs text-slate-500">
              {searchTerm
                ? 'Intenta con otro número de ficha o nombre de programa.'
                : 'Crea tu primera ficha de formación para comenzar a agregar aprendices y publicar actividades.'}
            </p>
          </div>
          {!searchTerm && (
            <button
              onClick={() => setIsCreateFichaModalOpen(true)}
              className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Crear primera ficha
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFichas.map((ficha) => {
            const stats = fichaStats[ficha.id] || {
              apprenticesCount: 0,
              activitiesCount: 0,
              pendingSubmissionsCount: 0,
            };
            const center = centers.find((c) => c.id === ficha.centerId);

            return (
              <div
                key={ficha.id}
                className="bg-white rounded-2xl border-2 border-slate-200 hover:border-[#39A900] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
              >
                {/* Cabecera con banner degradado SENA */}
                <div
                  onClick={() => {
                    setActiveFichaId(ficha.id);
                    setViewMode('detail');
                    onSelectFicha?.(ficha.id, ficha);
                  }}
                  className="bg-gradient-to-r from-[#00324D] to-[#004A73] p-5 text-white relative overflow-hidden border-b-4 border-[#39A900] cursor-pointer"
                  title={`Entrar a Ficha ${ficha.number}`}
                >
                  <div className="relative z-10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black tracking-wider bg-white/15 text-[#8CE665] px-2.5 py-0.5 rounded-md border border-white/20">
                        FICHA {ficha.number}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded ${
                          shiftLabels[ficha.shift]?.badge || 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {shiftLabels[ficha.shift]?.label || ficha.shift}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight line-clamp-2 mt-2 group-hover:text-[#8CE665] transition-colors">
                      {ficha.name || ficha.programName || `Ficha ${ficha.number}`}
                    </h3>

                    <p className="text-[11px] text-slate-300 truncate">
                      {center?.name || 'Centro de Comercio y Servicios'}
                    </p>
                  </div>
                  <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#39A900]/20 blur-xl pointer-events-none" />
                </div>

                {/* Cuerpo de la tarjeta con indicadores tipo Classroom */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="text-lg font-black font-mono text-[#00324D]">
                        {stats.apprenticesCount}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">Aprendices</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="text-lg font-black font-mono text-[#00324D]">
                        {stats.activitiesCount}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">Actividades</div>
                    </div>
                    <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                      <div className="text-lg font-black font-mono text-amber-700">
                        {stats.pendingSubmissionsCount}
                      </div>
                      <div className="text-[10px] text-amber-800 font-medium">Por revisar</div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveFichaId(ficha.id);
                          setViewMode('detail');
                          onSelectFicha?.(ficha.id, ficha);
                        }}
                        className="flex-1 py-2.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer group-hover:bg-[#39A900]"
                      >
                        <span>Entrar a la ficha</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>

                      <button
                        onClick={() => openDeleteFichaModal(ficha)}
                        className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-200 hover:border-rose-200 cursor-pointer"
                        title="Eliminar ficha de formación"
                        aria-label="Eliminar ficha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setActiveFichaId(ficha.id);
                        setIsAddLearnerModalOpen(true);
                      }}
                      className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-[#00324D] rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-[#39A900]" />
                      <span>+ Agregar aprendiz</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL: CREAR NUEVA FICHA (Sección 6) - CERO CURSOS
         ========================================================================= */}
      <Modal
        isOpen={isCreateFichaModalOpen}
        onClose={() => setIsCreateFichaModalOpen(false)}
        title="Crear Nueva Ficha de Formación"
      >
        <form onSubmit={handleCreateFichaSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            La ficha representa un grupo o clase de aprendices. No necesitas crear un curso para comenzar a trabajar.
          </p>

          {fichaFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{fichaFormError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre descriptivo de la ficha / clase *
            </label>
            <input
              type="text"
              required
              value={newFichaName}
              onChange={(e) => setNewFichaName(e.target.value)}
              placeholder="Ej: Inglés – Mesa y Bar, Gestión Contable Nocturna..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Ficha (SENA) *
              </label>
              <input
                type="text"
                required
                value={newFichaNumber}
                onChange={(e) => setNewFichaNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Ej: 3409626"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#39A900]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jornada Formativa *
              </label>
              <select
                value={newShift}
                onChange={(e) => setNewShift(e.target.value as FichaShift)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white"
              >
                <option value="morning">Diurna (Mañana)</option>
                <option value="afternoon">Tarde</option>
                <option value="evening">Nocturna</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Centro de Formación *
            </label>
            <select
              value={newCenterId}
              onChange={(e) => setNewCenterId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white"
            >
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city}, {c.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha de Finalización
              </label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción del grupo
            </label>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Notas generales o descripción del ambiente..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateFichaModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingFicha}
              className="px-5 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {isSavingFicha ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{isSavingFicha ? 'Guardando...' : 'Crear y guardar ficha'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Ficha */}
      <Modal
        isOpen={isEditFichaModalOpen}
        onClose={() => setIsEditFichaModalOpen(false)}
        title="Editar Ficha de Formación"
      >
        <form onSubmit={handleEditFichaSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la ficha *
            </label>
            <input
              type="text"
              required
              value={editFichaName}
              onChange={(e) => setEditFichaName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Ficha *
              </label>
              <input
                type="text"
                required
                value={editFichaNumber}
                onChange={(e) => setEditFichaNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#39A900]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jornada
              </label>
              <select
                value={editShift}
                onChange={(e) => setEditShift(e.target.value as FichaShift)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white"
              >
                <option value="morning">Diurna</option>
                <option value="afternoon">Tarde</option>
                <option value="evening">Nocturna</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Programa de Formación
            </label>
            <input
              type="text"
              required
              value={editProgramName}
              onChange={(e) => setEditProgramName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditFichaModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Agregar Aprendiz (cuando se activa desde el grid principal) */}
      <AddLearnerModal
        isOpen={isAddLearnerModalOpen && viewMode === 'grid'}
        onClose={() => setIsAddLearnerModalOpen(false)}
        fichas={fichas}
        preselectedFichaId={activeFichaId || undefined}
        instructorUid={instructorUid}
        instructorName={userProfile?.displayName}
        onLearnerAdded={() => {
          loadFichasAndCatalogs();
        }}
      />

      {/* =========================================================================
          MODAL: ELIMINAR FICHA DE FORMACIÓN (PROMPT 27)
         ========================================================================= */}
      <Modal
        isOpen={isDeleteFichaModalOpen}
        onClose={() => !isDeletingFicha && setIsDeleteFichaModalOpen(false)}
        title="¿Eliminar esta ficha de formación?"
      >
        {fichaToDelete && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="text-xs text-slate-600">
                Estás a punto de eliminar la ficha:
              </p>
              <div className="text-base font-extrabold text-[#00324D] tracking-tight">
                {fichaToDelete.name || fichaToDelete.programName || `Ficha ${fichaToDelete.number}`}
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#00324D] text-[#8CE665] rounded font-mono font-bold text-xs">
                Ficha #{fichaToDelete.number}
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Esta acción eliminará la ficha del listado de fichas administradas por el instructor.
              </p>
            </div>

            {/* Datos reales consultados de Firestore */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Dependencias Académicas Registradas (Firestore Real)</span>
              </div>

              {loadingDeleteStats ? (
                <div className="flex items-center gap-2 text-amber-800 text-xs py-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>Consultando dependencias en Firestore...</span>
                </div>
              ) : (
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex items-center justify-between py-1 border-b border-amber-200/50">
                    <span className="text-slate-600">Aprendices matriculados:</span>
                    <strong className="font-mono text-[#00324D]">
                      {deleteFichaStats?.apprenticesCount ?? 0} {deleteFichaStats?.apprenticesCount === 1 ? 'aprendiz' : 'aprendices'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-amber-200/50">
                    <span className="text-slate-600">Actividades formativas:</span>
                    <strong className="font-mono text-[#00324D]">
                      {deleteFichaStats?.activitiesCount ?? 0} {deleteFichaStats?.activitiesCount === 1 ? 'actividad' : 'actividades'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Evidencias / Entregas registradas:</span>
                    <strong className="font-mono text-[#00324D]">
                      {deleteFichaStats?.submissionsCount ?? 0} {deleteFichaStats?.submissionsCount === 1 ? 'evidencia' : 'evidencias'}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <strong className="font-bold block">Protección de Datos Académicos SENA (Prompt 30):</strong>
              <p className="text-[11px] text-emerald-800">
                • Los usuarios de los aprendices en <code className="font-mono text-emerald-950 font-semibold">/users</code> y cuentas de Google NO serán eliminados.
                <br />
                • Las matrículas vinculadas a esta ficha se eliminarán de <code className="font-mono text-emerald-950 font-semibold">/enrollments</code>, garantizando que futuras fichas creadas comiencen 100% vacías sin heredar aprendices.
              </p>
            </div>

            {deleteFichaError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{deleteFichaError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingFicha}
                onClick={() => setIsDeleteFichaModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingFicha}
                onClick={handleConfirmDeleteFicha}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingFicha ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando ficha...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar ficha</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          MODAL: QUITAR APRENDIZ DE LA FICHA (PROMPT 27)
         ========================================================================= */}
      <Modal
        isOpen={isRemoveLearnerModalOpen}
        onClose={() => !isRemovingLearner && setIsRemoveLearnerModalOpen(false)}
        title="¿Quitar aprendiz de la ficha?"
      >
        {learnerToRemove && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="text-xs text-slate-600">
                Estás a punto de desvincular al siguiente aprendiz:
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={learnerToRemove.photoURL}
                  alt={learnerToRemove.displayName}
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {learnerToRemove.displayName}
                  </div>
                  <div className="text-xs font-mono text-slate-600">
                    {learnerToRemove.email}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {learnerToRemove.documentNumber !== 'No registrado' ? `CC ${learnerToRemove.documentNumber}` : 'Sin CC'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Ficha: <strong className="font-mono text-[#00324D]">#{activeFicha?.number || learnerToRemove.fichaNumber}</strong>
              </p>
            </div>

            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5 text-xs text-sky-950">
              <strong className="font-bold flex items-center gap-1 text-sky-900">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                Garantía de Integridad de Cuenta:
              </strong>
              <p className="text-[11px] text-sky-800 leading-relaxed">
                • La cuenta de usuario del aprendiz en <code className="font-mono font-semibold">/users</code> y su acceso de Google NO serán eliminados.
                <br />
                • Su matrícula pasará al estado de <strong>retirado (withdrawn)</strong> para salvaguardar su historial de evidencias y calificaciones.
                <br />
                • Podrás volver a matricularlo en esta u otra ficha en cualquier momento.
              </p>
            </div>

            {removeLearnerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{removeLearnerError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isRemovingLearner}
                onClick={() => setIsRemoveLearnerModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRemovingLearner}
                onClick={handleConfirmRemoveLearner}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isRemovingLearner ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Desvinculando...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Quitar aprendiz de la ficha</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast flotante de confirmación */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00324D] text-white px-4 py-3 rounded-xl shadow-lg border border-[#39A900] flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#8CE665] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
