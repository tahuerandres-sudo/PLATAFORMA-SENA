/**
 * @license
 * SENA Learning Hub - Vista de Mis Actividades Pedagógicas (Aprendiz)
 * PROMPT 4: Requisitos 14, 15, 16, 21, 22
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  HardDrive,
  ExternalLink,
  Tag,
  Paperclip,
  Search,
  Filter,
  RefreshCw,
  Award,
  BookOpen,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import {
  EvidenceActivity,
  AcademicSubmission,
  Enrollment,
  Course,
  LearningOutcome,
  Rubric,
} from '../../types/academic';
import { activityService } from '../../services/academic/activityService';
import { rubricService } from '../../services/academic/rubricService';
import { submissionService } from '../../services/submissions/submissionService';
import { trackingService } from '../../services/academic/trackingService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { getCourses } from '../../services/firebase/academicService';
import { getEvidenceTypeConfig } from '../../config/fileLimits';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { SubmissionForm } from '../../components/evidence/SubmissionForm';
import { RubricDetailModal } from '../../components/rubrics/RubricDetailModal';
import { DriveConnectionStatus } from '../../components/evidence/DriveConnectionStatus';
import { useAuth } from '../../hooks/useAuth';

export const ApprenticeActivitiesView: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const learnerId = currentUser?.uid || userProfile?.uid || '';

  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rubricsMap, setRubricsMap] = useState<Record<string, Rubric>>({});
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [rubricModalOpen, setRubricModalOpen] = useState(false);
  const [activeBlock, setActiveBlock] = useState<{ blocked: boolean; reason?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'graded'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de entrega
  const [selectedActivity, setSelectedActivity] = useState<EvidenceActivity | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const loadData = async () => {
    if (!learnerId) return;
    setLoading(true);
    try {
      const [actRes, subRes, blockRes, enr, rapsRes, coursesList] = await Promise.all([
        activityService.getActivities(),
        submissionService.getSubmissionsByLearner(learnerId),
        trackingService.checkLearnerHasEvidenceBlock(learnerId),
        enrollmentService.getEnrollmentByLearnerId(learnerId),
        learningOutcomeService.getLearningOutcomes(),
        getCourses(),
      ]);

      setEnrollment(enr);
      setLearningOutcomes(rapsRes.data || []);
      setCourses(coursesList || []);

      // Filtrar actividades: Solo de su ficha/programa y que no estén en borrador (Requisitos 7 y 8)
      let visibleActivities = actRes.data.filter((a) => a.status !== 'draft');
      if (enr?.fichaId) {
        visibleActivities = visibleActivities.filter(
          (a) => a.fichaId === enr.fichaId || a.fichaId === (enr as any).fichaNumber
        );
      }
      setActivities(visibleActivities);
      setSubmissions(subRes.data || []);
      setActiveBlock(blockRes.blocked ? blockRes : null);

      // Cargar rúbricas publicadas de las actividades (Prompt 19)
      const rubrics: Record<string, Rubric> = {};
      for (const act of visibleActivities) {
        try {
          let rub: Rubric | null = null;
          if (act.rubricId) {
            rub = await rubricService.getRubric(act.rubricId);
          }
          if (!rub) {
            rub = await rubricService.getRubricByActivity(act.id);
          }
          if (rub && rub.isPublished) {
            rubrics[act.id] = rub;
          }
        } catch (e) {
          // ignore
        }
      }
      setRubricsMap(rubrics);
    } catch (err) {
      console.error('[ApprenticeActivitiesView] Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [learnerId]);

  // Asociar actividad con su entrega del aprendiz
  const getSubmissionForActivity = (actId: string): AcademicSubmission | undefined => {
    return submissions.find((s) => s.activityId === actId);
  };

  const filteredActivities = activities.filter((act) => {
    const sub = getSubmissionForActivity(act.id);
    const hasSubmission = !!sub;
    const isGraded = sub && (sub.status === 'approved' || sub.status === 'not_approved');
    const isSubmitted = sub && (sub.status === 'submitted' || sub.status === 'under_review');
    const isPending = !hasSubmission || sub?.status === 'correction_required';

    if (activeTab === 'pending' && !isPending) return false;
    if (activeTab === 'submitted' && !isSubmitted) return false;
    if (activeTab === 'graded' && !isGraded) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        act.title.toLowerCase().includes(term) ||
        (act.description && act.description.toLowerCase().includes(term))
      );
    }

    return true;
  });

  const handleOpenSubmit = (act: EvidenceActivity) => {
    setSelectedActivity(act);
    setSubmitModalOpen(true);
  };

  const handleSubmissionComplete = (newSub: AcademicSubmission) => {
    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.id === newSub.id || s.activityId === newSub.activityId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newSub;
        return copy;
      }
      return [newSub, ...prev];
    });
    setSubmitModalOpen(false);
    setSelectedActivity(null);
  };

  // Contadores para pestañas
  const pendingCount = activities.filter((a) => {
    const s = getSubmissionForActivity(a.id);
    return !s || s.status === 'correction_required';
  }).length;

  const submittedCount = activities.filter((a) => {
    const s = getSubmissionForActivity(a.id);
    return s && (s.status === 'submitted' || s.status === 'under_review');
  }).length;

  const gradedCount = activities.filter((a) => {
    const s = getSubmissionForActivity(a.id);
    return s && (s.status === 'approved' || s.status === 'not_approved');
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#00324D]">Mis Actividades y Evidencias</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta las tareas formativas asignadas, entrega tus evidencias a tiempo y revisa tus calificaciones
          </p>
        </div>
        <DriveConnectionStatus compact />
      </div>

      {/* Banner de Restricción Académica Activa (Requisito 9 y 13) */}
      {activeBlock && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-900 flex items-start gap-3.5 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-bold text-sm text-rose-800">
              Restricción Académica Activa: Entrega de Evidencias Bloqueada
            </strong>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">
              {activeBlock.reason || 'Tienes una medida preventiva activa que bloquea el envío de evidencias.'}
            </p>
            <p className="text-[11px] text-rose-600 mt-1">
              Para levantar esta restricción, dirígete a la sección <strong>"Asistencia y Justificaciones"</strong> en tu menú lateral y radica una justificación formal con soporte.
            </p>
          </div>
        </div>
      )}

      {/* 2. Pestañas de Filtro y Buscador */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-[#00324D] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Pendientes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/50">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('submitted')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'submitted'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>En Revisión</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/50">
              {submittedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('graded')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'graded'
                ? 'bg-[#39A900] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Calificadas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/50">
              {gradedCount}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar actividad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-white"
          />
        </div>
      </div>

      {/* 3. Grid de Actividades */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Cargando actividades formativas asignadas...
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No hay actividades en esta sección</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'pending'
              ? '¡Excelente! Estás al día con todas tus evidencias requeridas.'
              : 'No se encontraron evidencias registradas en este estado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredActivities.map((act) => {
            const config = getEvidenceTypeConfig(act.submissionType);
            const sub = getSubmissionForActivity(act.id);
            const rap = learningOutcomes.find((r) => r.id === act.learningOutcomeId);
            const course = courses.find((c) => c.id === act.courseId);

            return (
              <div
                key={act.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-[#39A900] transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Tipo de Evidencia y Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                      {course && (
                        <span className="text-[10px] font-semibold text-[#00324D] bg-slate-100 px-2 py-0.5 rounded">
                          {course.name || course.code}
                        </span>
                      )}
                    </div>

                    {sub ? (
                      <StatusBadge
                        status={
                          sub.status === 'approved'
                            ? 'aprobada'
                            : sub.status === 'not_approved'
                            ? 'no_aprobada'
                            : sub.status === 'correction_required'
                            ? 'corregir'
                            : 'pendiente'
                        }
                        size="sm"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Pendiente por entregar
                      </span>
                    )}
                  </div>

                  {/* Título y Descripción */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{act.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {act.instructions || act.description}
                    </p>
                  </div>

                  {/* RAP pedagógico */}
                  {rap && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <strong className="text-slate-700 block">RAP:</strong>
                      <span className="line-clamp-1">{rap.description}</span>
                    </div>
                  )}

                  {/* Metadatos de Fecha y Puntuación */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        Vence:{' '}
                        <strong className="text-slate-800">
                          {act.dueDate ? act.dueDate.split('T')[0] : 'Sin fecha'}
                        </strong>
                      </span>
                    </div>
                    <span className="font-bold text-[#2E8500] text-xs">Máx {act.points} pts</span>
                  </div>

                  {/* Rúbrica Pedagógica si está publicada (Prompt 19) */}
                  {rubricsMap[act.id] && (
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Sliders className="w-3.5 h-3.5 text-[#39A900] shrink-0" />
                        <span className="font-semibold text-emerald-950 truncate">
                          Rúbrica: {rubricsMap[act.id].title} ({rubricsMap[act.id].criteria?.length || 0} criterios · 100%)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRubric(rubricsMap[act.id]);
                          setRubricModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-[#2E8500] hover:text-white bg-white hover:bg-[#39A900] border border-emerald-300 rounded-md transition-colors cursor-pointer shrink-0"
                      >
                        Ver Criterios
                      </button>
                    </div>
                  )}

                  {/* Calificación y Retroalimentación del Instructor si ya está evaluada */}
                  {sub && sub.status === 'approved' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-emerald-900">
                        <span>Dictamen: Aprobado (A)</span>
                        <span>{sub.grade !== undefined ? `${sub.grade} / 100` : '100%'}</span>
                      </div>
                      {sub.feedback && (
                        <p className="text-emerald-800 text-[11px] italic">"{sub.feedback}"</p>
                      )}
                    </div>
                  )}

                  {sub && sub.status === 'correction_required' && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-1">
                      <div className="font-bold text-amber-900">Requiere Corrección (C)</div>
                      {sub.feedback && (
                        <p className="text-amber-800 text-[11px]">{sub.feedback}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Botón de Acción */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  {sub ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] text-slate-400">
                        Entregado: {sub.submittedAt ? sub.submittedAt.split('T')[0] : 'Hoy'}
                      </span>
                      <button
                        onClick={() => handleOpenSubmit(act)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#00324D] rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        {sub.status === 'correction_required' ? 'Reenviar Evidencia' : 'Ver Entrega'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenSubmit(act)}
                      className="w-full py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Entregar Evidencia
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Formulario de Entrega de Evidencia */}
      {selectedActivity && (
        <Modal
          isOpen={submitModalOpen}
          onClose={() => {
            setSubmitModalOpen(false);
            setSelectedActivity(null);
          }}
          title="Radicar Entrega de Evidencia"
          subtitle={selectedActivity.title}
        >
          <SubmissionForm
            activity={selectedActivity}
            existingSubmission={getSubmissionForActivity(selectedActivity.id)}
            onSubmissionComplete={handleSubmissionComplete}
            onCancel={() => {
              setSubmitModalOpen(false);
              setSelectedActivity(null);
            }}
          />
        </Modal>
      )}

      {/* Modal: Consulta Detallada de Rúbrica Pedagógica (Prompt 19) */}
      {rubricModalOpen && selectedRubric && (
        <RubricDetailModal
          isOpen={rubricModalOpen}
          onClose={() => {
            setRubricModalOpen(false);
            setSelectedRubric(null);
          }}
          rubric={selectedRubric}
          userRole="apprentice"
        />
      )}
    </div>
  );
};
