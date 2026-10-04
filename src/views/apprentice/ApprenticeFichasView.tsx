/**
 * @license
 * SENA Learning Hub - Vista "Mis Fichas" para el Aprendiz
 * PROMPT 22: Ficha como Clase / Grupo Principal (Experiencia Google Classroom)
 * Colecciones Firestore: /enrollments, /fichas, /activities, /submissions, /announcements, /resources
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  FolderArchive,
  Megaphone,
  Download,
  Building2,
  Calendar,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Award,
  HelpCircle,
  User,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getEnrollmentsForApprentice } from '../../services/firebase/academicService';
import { activityService } from '../../services/academic/activityService';
import { submissionService } from '../../services/submissions/submissionService';
import { announcementService } from '../../services/academic/announcementService';
import { resourceService } from '../../services/academic/resourceService';
import {
  EnrichedEnrollment,
  EvidenceActivity,
  AcademicSubmission,
  Announcement,
  Resource,
} from '../../types/academic';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { SubmissionForm } from '../../components/evidence/SubmissionForm';

interface ApprenticeFichasViewProps {
  onNavigateToView?: (viewId: string) => void;
}

export const ApprenticeFichasView: React.FC<ApprenticeFichasViewProps> = ({
  onNavigateToView,
}) => {
  const { currentUser, userProfile } = useAuth();
  const learnerId = currentUser?.uid || userProfile?.uid || '';

  const [enrollments, setEnrollments] = useState<EnrichedEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrichedEnrollment | null>(null);

  // Datos específicos de la ficha seleccionada en modo clase
  const [activeTab, setActiveTab] = useState<'announcements' | 'activities' | 'grades' | 'resources'>('activities');
  const [fichaActivities, setFichaActivities] = useState<EvidenceActivity[]>([]);
  const [fichaSubmissions, setFichaSubmissions] = useState<AcademicSubmission[]>([]);
  const [fichaAnnouncements, setFichaAnnouncements] = useState<Announcement[]>([]);
  const [fichaResources, setFichaResources] = useState<Resource[]>([]);
  const [classDataLoading, setClassDataLoading] = useState(false);

  // Modal para entregar evidencia
  const [selectedActivityForSubmit, setSelectedActivityForSubmit] = useState<EvidenceActivity | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Estadísticas por ficha para las tarjetas de inicio (Google Classroom style)
  const [fichaStats, setFichaStats] = useState<
    Record<string, { activitiesCount: number; pendingSubmissionsCount: number }>
  >({});

  // 1. Cargar inscripciones reales del aprendiz
  useEffect(() => {
    async function loadEnrollments() {
      if (!learnerId) return;
      setLoading(true);
      try {
        const list = await getEnrollmentsForApprentice(
          learnerId,
          currentUser?.email || userProfile?.email || undefined
        );
        setEnrollments(list);

        // Cargar estadísticas para cada tarjeta de ficha
        const [actsRes, subsRes] = await Promise.all([
          activityService.getActivities(),
          submissionService.getSubmissionsByLearner(learnerId),
        ]);

        const allActs = actsRes.data || [];
        const allSubs = subsRes.data || [];

        const stats: Record<string, { activitiesCount: number; pendingSubmissionsCount: number }> = {};
        list.forEach((enr) => {
          const fActs = allActs.filter(
            (a) => a.fichaId === enr.fichaId || (enr.ficha && a.fichaId === enr.ficha.id)
          );
          const submittedActIds = new Set(allSubs.map((s) => s.activityId));
          const pendingCount = fActs.filter((a) => !submittedActIds.has(a.id)).length;

          stats[enr.fichaId] = {
            activitiesCount: fActs.length,
            pendingSubmissionsCount: pendingCount,
          };
        });

        setFichaStats(stats);
      } catch (err) {
        console.warn('[ApprenticeFichasView] Error cargando inscripciones:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEnrollments();
  }, [learnerId]);

  // 2. Cargar contenido de la ficha al entrar en modo clase
  useEffect(() => {
    if (!selectedEnrollment) return;

    async function loadClassData() {
      if (!selectedEnrollment) return;
      const fichaId = selectedEnrollment.fichaId;
      if (!fichaId) return;

      setClassDataLoading(true);
      try {
        const [actsRes, subsRes, annList, resList] = await Promise.all([
          activityService.getActivities({ fichaId }),
          submissionService.getSubmissionsByLearner(learnerId),
          announcementService.getAnnouncements({
            targetType: 'FICHA',
            targetId: fichaId,
          }),
          resourceService.getResources({
            fichaId,
          }),
        ]);

        setFichaActivities((actsRes.data || []).filter((a: EvidenceActivity) => a.status !== 'draft'));
        setFichaSubmissions((subsRes.data || []).filter((s: AcademicSubmission) => s.fichaId === fichaId));
        setFichaAnnouncements(annList || []);
        setFichaResources(resList || []);
      } catch (err) {
        console.warn('[ApprenticeFichasView] Error cargando datos de clase:', err);
      } finally {
        setClassDataLoading(false);
      }
    }

    loadClassData();
  }, [selectedEnrollment, learnerId]);

  // Si está cargando inscripciones
  if (loading) {
    return (
      <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 animate-spin text-[#39A900] mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Consultando tus fichas y clases en el sistema institucional...</p>
      </div>
    );
  }

  // REGLA CRÍTICA PROMPT 21 & 22:
  // Si el aprendiz no tiene ninguna ficha asignada por un instructor -> "Cuenta pendiente de asignación"
  if (enrollments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-amber-300 p-8 sm:p-14 text-center max-w-xl mx-auto space-y-5 animate-in fade-in duration-200 my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
          <HelpCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
            Cuenta pendiente de asignación
          </span>
          <h2 className="text-xl font-bold text-[#00324D] mt-2">
            No tienes una ficha de formación asignada
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            Tu usuario se encuentra autenticado como <strong>Aprendiz</strong>, pero aún no ha sido matriculado en ninguna ficha activa. Tu instructor debe registrar previamente tu correo Gmail en su ficha correspondiente para darte acceso.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl text-left text-xs border border-slate-200 space-y-1.5 max-w-md mx-auto">
          <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
            Datos de tu cuenta para el instructor:
          </p>
          <div className="text-slate-600 font-mono text-[11px] space-y-0.5">
            <div><span className="text-slate-400">Correo:</span> {userProfile?.email || currentUser?.email}</div>
            <div><span className="text-slate-400">Nombre:</span> {userProfile?.displayName || 'Aprendiz SENA'}</div>
            <div><span className="text-slate-400">UID:</span> {currentUser?.uid}</div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic">
          En cuanto tu instructor agregue tu correo, tu ficha aparecerá aquí de forma automática.
        </p>
      </div>
    );
  }

  // ==========================================
  // VISTA DETALLADA: DENTRO DE UNA FICHA (Clase)
  // ==========================================
  if (selectedEnrollment) {
    const ficha = selectedEnrollment.ficha;
    const program = selectedEnrollment.program;
    const center = selectedEnrollment.center;
    const instructor = selectedEnrollment.instructors?.[0];

    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Barra superior de retorno */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <button
            onClick={() => setSelectedEnrollment(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#00324D] hover:text-[#39A900] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            ← Volver a Mis Fichas
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#39A900] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              FICHA #{ficha?.number || selectedEnrollment.fichaId}
            </span>
          </div>
        </div>

        {/* Banner Institucional de la Clase (Estilo Google Classroom) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00324D] via-[#004A73] to-[#005B8C] text-white p-6 sm:p-8 shadow-sm border border-slate-700">
          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#39A900]/25 text-[#8CE665] border border-[#39A900]/40 px-3 py-0.5 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{program?.name || ficha?.programName || 'Formación Profesional Integral'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {ficha?.name || program?.name || `Ficha ${ficha?.number}`}
            </h1>
            <p className="text-xs text-slate-200">
              {center?.name || 'Centro de Comercio y Servicios'} · Jornada {ficha?.shift || 'Diurna'} · {ficha?.academicStage || 'Etapa Lectiva'}
            </p>
            {instructor && (
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-300">
                <User className="w-4 h-4 text-[#8CE665]" />
                <span>Instructor: <strong className="text-white">{instructor.displayName}</strong> ({instructor.email})</span>
              </div>
            )}
          </div>
          <div className="absolute -right-8 -bottom-8 w-60 h-60 rounded-full bg-[#39A900]/15 blur-2xl pointer-events-none" />
        </div>

        {/* Pestañas de Navegación de la Clase (Novedades, Actividades, Calificaciones, Recursos) */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'activities'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Trabajo de Clase ({fichaActivities.length})
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'announcements'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Novedades y Muro ({fichaAnnouncements.length})
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'grades'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            Mis Calificaciones ({fichaSubmissions.length})
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'resources'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Materiales y Recursos ({fichaResources.length})
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        {classDataLoading ? (
          <div className="py-16 text-center space-y-2 bg-white rounded-xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Cargando contenido de la ficha...</p>
          </div>
        ) : (
          <>
            {/* PESTAÑA: ACTIVIDADES / TRABAJO DE CLASE */}
            {activeTab === 'activities' && (
              <div className="space-y-4">
                {fichaActivities.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-700">No hay actividades publicadas en esta ficha</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Tu instructor aún no ha asignado tareas en este grupo. Cuando publique una actividad, aparecerá aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fichaActivities.map((act) => {
                      const submission = fichaSubmissions.find((s) => s.activityId === act.id);
                      const isSubmitted = !!submission;
                      const isGraded = submission && (submission.grade || submission.status === 'approved' || submission.status === 'not_approved');

                      return (
                        <div
                          key={act.id}
                          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-[#39A900] transition-all flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {act.submissionType || 'Evidencia'}
                              </span>
                              {submission ? (
                                <StatusBadge status={submission.status as any} size="sm" />
                              ) : (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Pendiente por entregar
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-bold text-slate-900 leading-snug">{act.title}</h3>
                            <p className="text-xs text-slate-600 line-clamp-2">{act.instructions || act.description}</p>
                            {act.dueDate && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Fecha límite: <strong>{new Date(act.dueDate).toLocaleDateString('es-CO')}</strong></span>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            {isGraded ? (
                              <span className="text-xs font-bold text-[#00324D] bg-[#EBF8E7] px-2.5 py-1 rounded">
                                Calificación: {submission.grade === 'A' ? 'A (Aprobado)' : submission.grade === 'N' ? 'N (No aprobado)' : 'C (Corrección)'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {isSubmitted ? 'Evidencia entregada en revisión' : 'Sin entregar'}
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setSelectedActivityForSubmit(act);
                                setIsSubmitModalOpen(true);
                              }}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 ${
                                isSubmitted
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  : 'bg-[#39A900] hover:bg-[#2E8500] text-white'
                              }`}
                            >
                              <span>{isSubmitted ? 'Ver / Reenviar' : 'Entregar evidencia'}</span>
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

            {/* PESTAÑA: NOVEDADES Y MURO DE ANUNCIOS */}
            {activeTab === 'announcements' && (
              <div className="space-y-4">
                {fichaAnnouncements.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
                    <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-700">No hay novedades publicadas en este momento</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Los comunicados importantes emitidos por tus instructores para esta ficha aparecerán en este muro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fichaAnnouncements.map((ann) => (
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

            {/* PESTAÑA: MIS CALIFICACIONES */}
            {activeTab === 'grades' && (
              <div className="space-y-4">
                {fichaSubmissions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
                    <Award className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-700">Aún no tienes calificaciones en esta ficha</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Entrega tus actividades para que tu instructor evalúe bajo los criterios institucionales A, N o C.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fichaSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-900">{sub.activityTitle || 'Actividad Formativa'}</h4>
                          <p className="text-[11px] text-slate-500">
                            Entregada el: {new Date(sub.submittedAt).toLocaleString('es-CO')}
                          </p>
                          {sub.feedback && (
                            <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2">
                              <strong>Observaciones:</strong> {sub.feedback}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <StatusBadge status={sub.status as any} size="sm" />
                          {sub.grade && (
                            <span className="text-sm font-black font-mono px-3 py-1 bg-[#00324D] text-[#8CE665] rounded-lg">
                              {sub.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA: MATERIALES Y RECURSOS */}
            {activeTab === 'resources' && (
              <div className="space-y-4">
                {fichaResources.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-700">No hay materiales cargados para esta ficha</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Las guías, archivos de Google Drive y enlaces pedagógicos compartidos por el instructor estarán disponibles aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fichaResources.map((res) => (
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
          </>
        )}

        {/* Modal para realizar entrega de evidencias */}
        {selectedActivityForSubmit && (
          <Modal
            isOpen={isSubmitModalOpen}
            onClose={() => {
              setIsSubmitModalOpen(false);
              setSelectedActivityForSubmit(null);
            }}
            title="Radicar Entrega de Evidencia"
            subtitle={selectedActivityForSubmit.title}
          >
            <SubmissionForm
              activity={selectedActivityForSubmit}
              existingSubmission={fichaSubmissions.find(
                (s) => s.activityId === selectedActivityForSubmit.id
              )}
              onSubmissionComplete={() => {
                setIsSubmitModalOpen(false);
                setSelectedActivityForSubmit(null);
                // Recargar entregas
                submissionService.getSubmissionsByLearner(learnerId).then((res) => {
                  setFichaSubmissions((res.data || []).filter((s) => s.fichaId === selectedEnrollment.fichaId));
                });
              }}
              onCancel={() => {
                setIsSubmitModalOpen(false);
                setSelectedActivityForSubmit(null);
              }}
            />
          </Modal>
        )}
      </div>
    );
  }

  // ==========================================
  // VISTA PRINCIPAL: GRID DE MIS FICHAS (Google Classroom style)
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Formación Profesional Integral
            </span>
            <span className="text-[11px] font-bold bg-[#EBF8E7] text-[#2E8500] px-2 py-0.5 rounded border border-[#39A900]/30">
              Mis Fichas Asignadas
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">Mis Fichas de Formación</h1>
          <p className="text-xs text-slate-500">
            Selecciona tu ficha para acceder a las tareas, muro de novedades, calificaciones y recursos formativos
          </p>
        </div>

        <div className="text-xs font-semibold bg-[#EBF8E7] text-[#2E8500] px-3 py-1.5 rounded-lg border border-[#39A900]/30 inline-flex items-center gap-1.5 self-start sm:self-auto">
          <Users className="w-3.5 h-3.5" />
          {enrollments.length} {enrollments.length === 1 ? 'ficha activa' : 'fichas activas'}
        </div>
      </div>

      {/* 2. Grid de Fichas (Google Classroom Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrollments.map((enr) => {
          const ficha = enr.ficha;
          const program = enr.program;
          const center = enr.center;
          const stats = fichaStats[enr.fichaId] || { activitiesCount: 0, pendingSubmissionsCount: 0 };
          const instructor = enr.instructors?.[0];

          return (
            <div
              key={enr.id}
              className="bg-white rounded-2xl border-2 border-slate-200 hover:border-[#39A900] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
            >
              {/* Cabecera con banner SENA */}
              <div className="bg-gradient-to-r from-[#00324D] to-[#004A73] p-5 text-white relative overflow-hidden border-b-4 border-[#39A900]">
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-wider bg-white/15 text-[#8CE665] px-2.5 py-0.5 rounded-md border border-white/20">
                      FICHA {ficha?.number || enr.fichaId}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.2 rounded">
                      {ficha?.shift || 'Lectiva'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight line-clamp-2 mt-2 group-hover:text-[#8CE665] transition-colors">
                    {ficha?.name || program?.name || 'Programa de Formación'}
                  </h3>
                  <p className="text-[11px] text-slate-300 truncate">
                    {center?.name || 'Centro de Comercio y Servicios'}
                  </p>
                </div>
                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#39A900]/20 blur-xl pointer-events-none" />
              </div>

              {/* Cuerpo de la tarjeta con estadísticas */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {instructor && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                      <span className="text-[11px] text-slate-400 block">Instructor Titular:</span>
                      <strong className="text-slate-800">{instructor.displayName}</strong>
                    </div>
                  )}

                  {/* Indicadores de Actividades y Evidencias */}
                  <div className="grid grid-cols-2 gap-2 text-center">
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
                      <div className="text-[10px] text-amber-800 font-medium">Por entregar</div>
                    </div>
                  </div>
                </div>

                {/* Botón de Entrada a la Ficha (Entrar a la clase) */}
                <button
                  onClick={() => setSelectedEnrollment(enr)}
                  className="w-full py-2.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer group-hover:bg-[#39A900]"
                >
                  <span>Entrar a la ficha</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
