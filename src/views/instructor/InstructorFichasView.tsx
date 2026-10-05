/**
 * @license
 * SENA Learning Hub - Vista "Mis Fichas" para el Instructor
 * PROMPT 22: Fichas como Clases / Grupos Principales (Experiencia Google Classroom)
 * Colecciones Firestore: /fichas, /enrollments, /activities, /submissions, /announcements, /resources, /competencies, /learningOutcomes
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { AddLearnerModal } from '../../components/academic/AddLearnerModal';
import { ActivityFormModal } from '../../components/evidence/ActivityFormModal';
import { ResourceFormModal } from '../../components/resources/ResourceFormModal';
import { ApprenticeAcademicProfileModal } from '../../components/academic/ApprenticeAcademicProfileModal';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../services/firebase/config';

interface InstructorFichasViewProps {
  onSelectFicha?: (fichaId: string) => void;
  onNavigateToApprentices?: (fichaNumber: string) => void;
  onNavigateToActivities?: (fichaNumber: string) => void;
  initialFichaId?: string;
}

export const InstructorFichasView: React.FC<InstructorFichasViewProps> = ({
  onSelectFicha,
  onNavigateToApprentices,
  onNavigateToActivities,
  initialFichaId,
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
  const [activeFichaId, setActiveFichaId] = useState<string>(initialFichaId || '');

  // 3. Pestañas dentro de la Ficha / Clase
  const [activeClassTab, setActiveClassTab] = useState<
    'announcements' | 'activities' | 'people' | 'submissions' | 'resources' | 'attendance' | 'competencies'
  >('activities');

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
  const [loadingClassData, setLoadingClassData] = useState(false);

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

  // 1. Cargar catálogo principal de fichas del instructor
  const loadFichasAndCatalogs = useCallback(async () => {
    setLoading(true);
    try {
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

      if (loadedCenters.length > 0 && !newCenterId) {
        setNewCenterId(loadedCenters[0].id);
      }

      // Si se especificó una ficha inicial o ya había una seleccionada
      if (initialFichaId && loadedFichas.some((f) => f.id === initialFichaId || f.number === initialFichaId)) {
        setActiveFichaId(initialFichaId);
        setViewMode('detail');
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
  }, [instructorUid, initialFichaId, newCenterId]);

  useEffect(() => {
    loadFichasAndCatalogs();
  }, [loadFichasAndCatalogs]);

  // Ficha activa en modo detalle
  const activeFicha = useMemo(() => {
    return fichas.find((f) => f.id === activeFichaId || f.number === activeFichaId) || null;
  }, [fichas, activeFichaId]);

  // 2. Cargar todos los datos de la Ficha Activa (Aprendices, Actividades, Evidencias, Anuncios, Recursos, RAPs)
  const loadActiveFichaClassData = useCallback(async () => {
    if (!activeFicha) return;
    setLoadingClassData(true);
    try {
      const fichaId = activeFicha.id;

      const [enrWithUsersRes, actsRes, subsRes, annRes, resRes, compsRes, rapsRes] = await Promise.all([
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
      ]);

      setClassApprentices(enrWithUsersRes.data || []);
      setClassActivities((actsRes.data || []).filter((a: EvidenceActivity) => a.status !== 'draft'));
      setClassSubmissions(subsRes.data || []);
      setClassAnnouncements(annRes || []);
      setClassResources(resRes || []);
      setClassCompetencies(compsRes.data || []);
      setClassLearningOutcomes(rapsRes.data || []);

      // Actualizar estadísticas de la ficha
      setFichaStats((prev) => ({
        ...prev,
        [fichaId]: {
          apprenticesCount: enrWithUsersRes.data?.length || 0,
          activitiesCount: (actsRes.data || []).filter((a: EvidenceActivity) => a.status !== 'draft').length,
          pendingSubmissionsCount: (subsRes.data || []).filter(
            (s: AcademicSubmission) => s.status === 'submitted' || s.status === 'under_review' || !s.grade
          ).length,
        },
      }));
    } catch (err) {
      console.warn('[InstructorFichasView] Error cargando datos de la ficha activa:', err);
    } finally {
      setLoadingClassData(false);
    }
  }, [activeFicha, instructorUid]);

  useEffect(() => {
    if (viewMode === 'detail' && activeFicha) {
      loadActiveFichaClassData();
    }
  }, [viewMode, activeFicha, loadActiveFichaClassData]);

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
  // VISTA 2: DENTRO DE UNA FICHA (EXPERIENCIA GOOGLE CLASSROOM HUB)
  // =========================================================================
  if (viewMode === 'detail' && activeFicha) {
    const stats = fichaStats[activeFicha.id] || {
      apprenticesCount: classApprentices.length,
      activitiesCount: classActivities.length,
      pendingSubmissionsCount: 0,
    };
    const center = centers.find((c) => c.id === activeFicha.centerId);

    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Barra superior de retorno */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <button
            onClick={() => setViewMode('grid')}
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

        {/* Banner Institucional de la Clase (Estilo Google Classroom) */}
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
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {activeFicha.name || activeFicha.programName || `Ficha ${activeFicha.number}`}
            </h1>

            <p className="text-xs text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#8CE665]" />
              {center?.name || 'Centro de Comercio y Servicios'} · {center?.city || 'Ibagué'}, {center?.department || 'Tolima'}
            </p>

            {activeFicha.description && (
              <p className="text-xs text-slate-300 italic pt-1 line-clamp-2">
                "{activeFicha.description}"
              </p>
            )}

            {/* Acciones Rápidas del Instructor en la Clase */}
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
                onClick={() => setIsResourceModalOpen(true)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
              >
                <FolderArchive className="w-4 h-4 text-[#8CE665]" />
                + Compartir recurso
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
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-60 h-60 rounded-full bg-[#39A900]/15 blur-2xl pointer-events-none" />
        </div>

        {/* Pestañas de Navegación de la Clase (Estilo Google Classroom) */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveClassTab('activities')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeClassTab === 'activities'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Trabajo de Clase ({classActivities.length})
          </button>
          <button
            onClick={() => setActiveClassTab('people')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeClassTab === 'people'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Personas / Aprendices ({classApprentices.length})
          </button>
          <button
            onClick={() => setActiveClassTab('announcements')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeClassTab === 'announcements'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Novedades y Muro ({classAnnouncements.length})
          </button>
          <button
            onClick={() => setActiveClassTab('submissions')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeClassTab === 'submissions'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            Evidencias y Calificaciones ({classSubmissions.length})
          </button>
          <button
            onClick={() => setActiveClassTab('resources')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeClassTab === 'resources'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Recursos y Materiales ({classResources.length})
          </button>
          <button
            onClick={() => setActiveClassTab('competencies')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeClassTab === 'competencies'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Target className="w-4 h-4" />
            Competencias y RAPs ({classCompetencies.length})
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        {loadingClassData ? (
          <div className="py-16 text-center space-y-2 bg-white rounded-xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Cargando datos de la ficha...</p>
          </div>
        ) : (
          <>
            {/* PESTAÑA: TRABAJO DE CLASE / ACTIVIDADES */}
            {activeClassTab === 'activities' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-[#00324D]">Actividades Formativas de la Ficha</h3>
                    <p className="text-xs text-slate-500">Tareas creadas directamente para la Ficha #{activeFicha.number}</p>
                  </div>
                  <button
                    onClick={() => setIsActivityModalOpen(true)}
                    className="px-3 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Nueva actividad
                  </button>
                </div>

                {classActivities.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No hay actividades creadas en esta ficha</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Crea tu primera actividad pedagógica directamente para este grupo de aprendices.
                    </p>
                    <button
                      onClick={() => setIsActivityModalOpen(true)}
                      className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Crear primera actividad
                    </button>
                  </div>
                ) : (
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
                                <span>Fecha límite: <strong>{new Date(act.dueDate).toLocaleDateString('es-CO')}</strong></span>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {act.rubricId ? 'Con Rúbrica Pedagógica' : 'Sin rúbrica'}
                            </span>
                            <button
                              onClick={() => {
                                onNavigateToActivities?.(activeFicha.number);
                              }}
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

            {/* PESTAÑA: PERSONAS / APRENDICES */}
            {activeClassTab === 'people' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-[#00324D]">
                      Aprendices Matriculados ({classApprentices.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Asignados a la Ficha #{activeFicha.number} mediante correo institucional o Gmail
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddLearnerModalOpen(true)}
                    className="px-3.5 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Agregar aprendiz
                  </button>
                </div>

                {classApprentices.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                    <Users className="w-12 h-12 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No hay aprendices agregados a esta ficha</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Registra los correos Gmail de tus aprendices para autorizar su ingreso a esta ficha formativa.
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
                          <th className="p-3 font-bold text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {classApprentices.map((apprentice) => {
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
                                      {apprentice.documentNumber !== 'No registrado' ? `CC ${apprentice.documentNumber}` : 'Sin CC'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-slate-700">{apprentice.email}</td>
                              <td className="p-3 text-slate-500">
                                {apprentice.assignedAt ? new Date(apprentice.assignedAt).toLocaleDateString('es-CO') : '—'}
                              </td>
                              <td className="p-3 text-center">
                                {isPending ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    Pendiente primer login
                                  </span>
                                ) : (
                                  <StatusBadge status={apprentice.status} size="sm" />
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setSelectedApprenticeProfile(apprentice)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-[#EBF8E7] text-[#00324D] rounded font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Ver Expediente"
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

            {/* PESTAÑA: NOVEDADES Y MURO DE ANUNCIOS */}
            {activeClassTab === 'announcements' && (
              <div className="space-y-5">
                {/* Formulario rápido para publicar en el Muro */}
                <form
                  onSubmit={handleQuickPublishAnnouncement}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Megaphone className="w-4 h-4 text-[#39A900]" />
                    <h4 className="text-xs font-bold text-[#00324D]">Publicar un anuncio para la Ficha #{activeFicha.number}</h4>
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
                      disabled={isPublishingAnnouncement || !newAnnouncementTitle.trim() || !newAnnouncementMessage.trim()}
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
                      <div key={ann.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
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

            {/* PESTAÑA: EVIDENCIAS Y CALIFICACIONES */}
            {activeClassTab === 'submissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-[#00324D]">Entregas de Evidencias ({classSubmissions.length})</h3>
                    <p className="text-xs text-slate-500">Revisión y emisión de dictamen A, N o C con rúbricas</p>
                  </div>
                  <button
                    onClick={() => onNavigateToActivities?.(activeFicha.number)}
                    className="text-xs font-bold text-[#2E8500] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ir a módulo de Calificación</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {classSubmissions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center space-y-2">
                    <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700">No hay entregas registradas en esta ficha aún</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Cuando los aprendices envíen sus evidencias a través de Google Drive, aparecerán listadas aquí.
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
                          <th className="p-3 font-bold text-center">Nota (A/N/C)</th>
                          <th className="p-3 font-bold text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {classSubmissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-bold text-slate-900">{sub.learnerName || sub.learnerEmail || 'Aprendiz'}</td>
                            <td className="p-3 text-slate-800">{sub.activityTitle || 'Actividad Formativa'}</td>
                            <td className="p-3 text-slate-500">{new Date(sub.submittedAt).toLocaleDateString('es-CO')}</td>
                            <td className="p-3 text-center">
                              <StatusBadge status={sub.status as any} size="sm" />
                            </td>
                            <td className="p-3 text-center">
                              {sub.grade ? (
                                <span className="font-mono font-black px-2.5 py-0.5 rounded bg-[#00324D] text-[#8CE665]">
                                  {sub.grade}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-mono">Por calificar</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => onNavigateToActivities?.(activeFicha.number)}
                                className="px-2.5 py-1 bg-[#39A900] hover:bg-[#2E8500] text-white rounded font-bold transition-all text-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>Evaluar</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA: RECURSOS Y MATERIALES */}
            {activeClassTab === 'resources' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-[#00324D]">Materiales Pedagógicos ({classResources.length})</h3>
                    <p className="text-xs text-slate-500">Documentos y guías compartidas con la Ficha #{activeFicha.number}</p>
                  </div>
                  <button
                    onClick={() => setIsResourceModalOpen(true)}
                    className="px-3.5 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Compartir recurso
                  </button>
                </div>

                {classResources.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center space-y-3">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700">No hay recursos compartidos con esta ficha</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Sube archivos PDF, guías de aprendizaje o enlaces externos para tus aprendices.
                    </p>
                    <button
                      onClick={() => setIsResourceModalOpen(true)}
                      className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Compartir primer recurso
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classResources.map((res) => (
                      <div
                        key={res.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {res.resourceType}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(res.createdAt).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 mt-2">{res.title}</h4>
                          {res.description && (
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{res.description}</p>
                          )}
                        </div>
                        {(res.driveUrl || res.externalUrl) && (
                          <div className="pt-2 border-t border-slate-100">
                            <a
                              href={res.driveUrl || res.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-[#2E8500] hover:underline inline-flex items-center gap-1"
                            >
                              <span>Abrir recurso</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA: COMPETENCIAS Y RAPs */}
            {activeClassTab === 'competencies' && (
              <div className="space-y-4">
                <div className="pb-1 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-[#00324D]">
                    Competencias del Programa ({classCompetencies.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Normas y Resultados de Aprendizaje (RAPs) del programa institucional
                  </p>
                </div>

                <div className="space-y-3">
                  {classCompetencies.map((comp) => {
                    const compRaps = classLearningOutcomes.filter((r) => r.competencyId === comp.id);

                    return (
                      <div key={comp.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#00324D] bg-white px-2 py-0.5 rounded border border-slate-200">
                              Código: {comp.code}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{comp.name}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                            {comp.type}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 italic bg-white p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                          "{comp.description}"
                        </p>

                        {compRaps.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-700">Resultados de Aprendizaje Vinculados:</span>
                            <div className="space-y-1">
                              {compRaps.map((rap) => (
                                <div key={rap.id} className="text-[11px] text-slate-600 bg-white/70 px-2.5 py-1 rounded border border-slate-100 flex items-center gap-2">
                                  <span className="font-mono font-bold text-[#39A900]">RAP {rap.sequence || 1}:</span>
                                  <span className="truncate">{rap.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Modales Embebidos para Acciones Rápidas de la Ficha */}
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

        <ActivityFormModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          defaultFichaId={activeFicha.id}
          onActivitySaved={() => {
            setIsActivityModalOpen(false);
            loadActiveFichaClassData();
          }}
        />

        <ResourceFormModal
          isOpen={isResourceModalOpen}
          onClose={() => setIsResourceModalOpen(false)}
          preselectedFichaId={activeFicha.id}
          onResourceSaved={() => {
            setIsResourceModalOpen(false);
            loadActiveFichaClassData();
          }}
        />

        <ApprenticeAcademicProfileModal
          apprentice={selectedApprenticeProfile}
          onClose={() => setSelectedApprenticeProfile(null)}
        />
      </div>
    );
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
                <div className="bg-gradient-to-r from-[#00324D] to-[#004A73] p-5 text-white relative overflow-hidden border-b-4 border-[#39A900]">
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
                    <button
                      onClick={() => {
                        setActiveFichaId(ficha.id);
                        setViewMode('detail');
                        onSelectFicha?.(ficha.id);
                      }}
                      className="w-full py-2.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer group-hover:bg-[#39A900]"
                    >
                      <span>Entrar a la ficha</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>

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
    </div>
  );
};
