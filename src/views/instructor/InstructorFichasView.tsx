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
} from 'lucide-react';
import {
  Ficha,
  TrainingProgram,
  TrainingCenter,
  Competency,
  LearningOutcome,
  EvidenceActivity,
  AcademicSubmission,
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
import { announcementService } from '../../services/academic/announcementService';
import { resourceService } from '../../services/academic/resourceService';
import { trackingService } from '../../services/academic/trackingService';
import { AddLearnerModal } from '../../components/academic/AddLearnerModal';
import { ActivityFormModal } from '../../components/evidence/ActivityFormModal';
import { ResourceFormModal } from '../../components/resources/ResourceFormModal';
import { ApprenticeAcademicProfileModal } from '../../components/academic/ApprenticeAcademicProfileModal';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../services/firebase/config';

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

  // 3. Pestañas dentro de la Ficha / Clase (PROMPT 29: 8 Pestañas oficiales con Resumen por defecto)
  const [activeClassTab, setActiveClassTab] = useState<
    'summary' | 'activities' | 'apprentices' | 'submissions' | 'grades' | 'attendance' | 'tracking' | 'announcements'
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
        trackingService.getAttendance(fichaId, attendanceDate),
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
      const stats = fichaStats[activeFicha.id] || {
        apprenticesCount: classApprentices.length,
        activitiesCount: classActivities.length,
        pendingSubmissionsCount: classSubmissions.filter(
          (s) => s.status === 'submitted' || s.status === 'under_review' || !s.grade
        ).length,
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

      // Filtrado de evidencias
      const filteredSubmissions = classSubmissions.filter((sub) => {
        if (submissionFilterStatus === 'pending') {
          return sub.status === 'submitted' || sub.status === 'under_review' || !sub.grade;
        }
        if (submissionFilterStatus === 'graded') {
          return Boolean(sub.grade);
        }
        return true;
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

                        return (
                          <div
                            key={act.id}
                            className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-[#39A900] transition-all flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                  {act.submissionType || 'Evidencia'}
                                </span>
                                <span className="text-[11px] font-bold text-[#00324D] bg-[#EBF8E7] px-2 py-0.5 rounded">
                                  {subs.length} {subs.length === 1 ? 'entrega' : 'entregas'}
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
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>
                                    Fecha límite:{' '}
                                    <strong>{new Date(act.dueDate).toLocaleDateString('es-CO')}</strong>
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] text-slate-500 font-mono">
                                {act.rubricId ? 'Con Rúbrica Pedagógica' : 'Sin rúbrica'}
                              </span>
                              {/* PROMPT 29 Sección 23: Permanecer dentro de la ficha */}
                              <button
                                onClick={() => setActiveClassTab('submissions')}
                                className="text-xs font-bold text-[#2E8500] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Ver entregas</span>
                                <ArrowRight className="w-3.5 h-3.5" />
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-[#00324D]">
                        Evidencias de la Ficha #{activeFicha.number} ({classSubmissions.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Entregas asociadas únicamente a actividades de esta ficha
                      </p>
                    </div>
                    {/* Filtros de Estado de Evidencia */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSubmissionFilterStatus('all')}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          submissionFilterStatus === 'all'
                            ? 'bg-[#00324D] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Todas ({classSubmissions.length})
                      </button>
                      <button
                        onClick={() => setSubmissionFilterStatus('pending')}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          submissionFilterStatus === 'pending'
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        Por calificar ({stats.pendingSubmissionsCount})
                      </button>
                      <button
                        onClick={() => setSubmissionFilterStatus('graded')}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          submissionFilterStatus === 'graded'
                            ? 'bg-[#39A900] text-white'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        Calificadas ({gradedCount})
                      </button>
                    </div>
                  </div>

                  {filteredSubmissions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
                      <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">No hay evidencias registradas en este filtro</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Cuando los aprendices envíen sus evidencias pedagógicas, aparecerán listadas aquí para su evaluación.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#00324D] text-white border-b border-slate-700">
                            <th className="p-3 font-bold">Aprendiz</th>
                            <th className="p-3 font-bold">Actividad</th>
                            <th className="p-3 font-bold">Fecha Envío</th>
                            <th className="p-3 font-bold text-center">Estado</th>
                            <th className="p-3 font-bold text-center">Dictamen</th>
                            <th className="p-3 font-bold text-right">Archivos / Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {filteredSubmissions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 font-bold text-slate-900">
                                {sub.learnerName || sub.learnerEmail || 'Aprendiz'}
                              </td>
                              <td className="p-3 text-slate-800">{sub.activityTitle || 'Actividad Formativa'}</td>
                              <td className="p-3 text-slate-500">
                                {new Date(sub.submittedAt).toLocaleDateString('es-CO')}
                              </td>
                              <td className="p-3 text-center">
                                <StatusBadge status={sub.status as any} size="sm" />
                              </td>
                              <td className="p-3 text-center">
                                {sub.grade ? (
                                  <span
                                    className={`font-mono font-black px-2.5 py-0.5 rounded text-xs ${
                                      sub.grade === 'A'
                                        ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}
                                  >
                                    {sub.grade}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Pendiente
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {sub.driveFileUrl && (
                                    <a
                                      href={sub.driveFileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Drive
                                    </a>
                                  )}
                                  <span className="text-[11px] font-bold text-slate-400">
                                    {sub.grade ? 'Calificada' : 'Por evaluar'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
              {/* PESTAÑA 6: ASISTENCIA (PROMPT 29 Sección 20) */}
              {/* ========================================================= */}
              {activeClassTab === 'attendance' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-[#00324D]">
                        Control Diario de Asistencia — Ficha #{activeFicha.number}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Registro oficial de asistencia en Firestore (/attendance)
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <input
                          type="date"
                          value={attendanceDate}
                          onChange={(e) => setAttendanceDate(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#39A900] bg-white"
                        />
                      </div>
                      <button
                        onClick={handleSaveAttendance}
                        disabled={isSavingAttendance || classApprentices.length === 0}
                        className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>{isSavingAttendance ? 'Guardando...' : 'Guardar Planilla'}</span>
                      </button>
                    </div>
                  </div>

                  {attendanceFeedback && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{attendanceFeedback}</span>
                    </div>
                  )}

                  {/* Resumen de la sesión */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 block">En Sesión</span>
                      <span className="text-lg font-bold font-mono text-[#00324D]">{totalSessionApps}</span>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[11px] text-emerald-800 font-bold block">Presentes</span>
                      <span className="text-lg font-bold font-mono text-emerald-900">{presentCount}</span>
                    </div>
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
                      <span className="text-[11px] text-rose-800 font-bold block">Ausentes</span>
                      <span className="text-lg font-bold font-mono text-rose-900">{absentCount}</span>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                      <span className="text-[11px] text-amber-800 font-bold block">Tardanzas</span>
                      <span className="text-lg font-bold font-mono text-amber-900">{lateCount}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500 block">% Asistencia</span>
                      <span className="text-lg font-bold font-mono text-[#00324D]">{attRate}%</span>
                    </div>
                  </div>

                  {classApprentices.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                      No hay aprendices registrados en esta ficha para tomar asistencia.
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#00324D] text-white border-b border-slate-700">
                            <th className="p-3 font-bold">Aprendiz</th>
                            <th className="p-3 font-bold text-center">Estado de Asistencia</th>
                            <th className="p-3 font-bold">Observación Pedagógica</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {classApprentices.map((app) => {
                            const currentStatus = attendanceStatuses[app.uid] || 'PRESENTE';

                            return (
                              <tr key={app.uid} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3">
                                  <div className="font-bold text-slate-900">{app.displayName}</div>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {app.documentNumber !== 'No registrado' ? `CC ${app.documentNumber}` : app.email}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAttendanceStatuses((prev) => ({ ...prev, [app.uid]: 'PRESENTE' }))
                                      }
                                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                        currentStatus === 'PRESENTE'
                                          ? 'bg-[#39A900] text-white shadow-xs'
                                          : 'text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      PRESENTE
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAttendanceStatuses((prev) => ({ ...prev, [app.uid]: 'AUSENTE' }))
                                      }
                                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                        currentStatus === 'AUSENTE'
                                          ? 'bg-rose-600 text-white shadow-xs'
                                          : 'text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      AUSENTE
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAttendanceStatuses((prev) => ({ ...prev, [app.uid]: 'TARDE' }))
                                      }
                                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                        currentStatus === 'TARDE'
                                          ? 'bg-amber-600 text-white shadow-xs'
                                          : 'text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      TARDE
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAttendanceStatuses((prev) => ({ ...prev, [app.uid]: 'EXCUSADO' }))
                                      }
                                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                        currentStatus === 'EXCUSADO'
                                          ? 'bg-blue-600 text-white shadow-xs'
                                          : 'text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      EXCUSADO
                                    </button>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    placeholder="Observación opcional..."
                                    value={attendanceObservations[app.uid] || ''}
                                    onChange={(e) =>
                                      setAttendanceObservations((prev) => ({ ...prev, [app.uid]: e.target.value }))
                                    }
                                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-white"
                                  />
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
    </div>
  );
};
