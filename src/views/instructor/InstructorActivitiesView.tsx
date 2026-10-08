/**
 * @license
 * SENA Learning Hub - Vista de Actividades y Evidencias (Instructor)
 * PROMPT 4: Requisitos 2, 3, 17, 21, 23
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  Tag,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Users,
  Eye,
  SlidersHorizontal,
  Sliders,
  Award,
} from 'lucide-react';
import {
  EvidenceActivity,
  EvidenceType,
  ActivityStatus,
  Ficha,
  Course,
  TrainingProgram,
  LearningOutcome,
  Competency,
  Rubric,
} from '../../types/academic';
import { activityService, ActivityStats } from '../../services/academic/activityService';
import { rubricService } from '../../services/academic/rubricService';
import { ActivityFormModal } from '../../components/evidence/ActivityFormModal';
import { RubricFormModal } from '../../components/rubrics/RubricFormModal';
import { RubricDetailModal } from '../../components/rubrics/RubricDetailModal';
import { DriveConnectionStatus } from '../../components/evidence/DriveConnectionStatus';
import { getEvidenceTypeConfig } from '../../config/fileLimits';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { fichaService } from '../../services/academic/fichaService';
import { getTrainingPrograms, getCourses } from '../../services/firebase/academicService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { competencyService } from '../../services/academic/competencyService';
import { useAuth } from '../../hooks/useAuth';

interface InstructorActivitiesViewProps {
  onNavigateToSubmissions: (activityId: string) => void;
  fichaId?: string;
  onBackToFichas?: () => void;
}

export const InstructorActivitiesView: React.FC<InstructorActivitiesViewProps> = ({
  onNavigateToSubmissions,
  fichaId,
  onBackToFichas,
}) => {
  const { userProfile, currentUser } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid;

  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [rubricsMap, setRubricsMap] = useState<Record<string, Rubric>>({});
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<EvidenceActivity | null>(null);

  // Estados de modales de rúbricas (Prompt 19)
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [rubricTargetActivity, setRubricTargetActivity] = useState<EvidenceActivity | null>(null);
  const [isRubricDetailOpen, setIsRubricDetailOpen] = useState(false);
  const [viewingRubric, setViewingRubric] = useState<Rubric | null>(null);

  // Filtros (si viene fichaId, preseleccionar y fijar dicha ficha)
  const [selectedFicha, setSelectedFicha] = useState<string>(fichaId || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estadísticas por actividad (ID -> Stats)
  const [statsMap, setStatsMap] = useState<Record<string, ActivityStats>>({});

  const loadActivities = async () => {
    setLoading(true);
    try {
      const [actsRes, fichasRes, progsRes, coursesRes, rapsRes, compsRes] = await Promise.all([
        fichaId
          ? activityService.getActivitiesByFicha(fichaId, instructorUid)
          : activityService.getActivities(),
        fichaService.getFichas(instructorUid),
        getTrainingPrograms(),
        getCourses(),
        learningOutcomeService.getLearningOutcomes(),
        competencyService.getCompetencies(),
      ]);

      const loadedFichas = fichasRes.data || [];
      setFichas(loadedFichas);
      setPrograms(progsRes || []);
      setCourses(coursesRes || []);
      setLearningOutcomes(rapsRes.data || []);
      setCompetencies(compsRes.data || []);

      let relevantActs: EvidenceActivity[] = [];
      if (fichaId) {
        relevantActs = actsRes.data || [];
      } else {
        const assignedFichaIds = loadedFichas.map((f) => f.id);
        if (assignedFichaIds.length > 0) {
          relevantActs = (actsRes.data || []).filter(
            (a) => assignedFichaIds.includes(a.fichaId) || a.createdBy === instructorUid
          );
        } else {
          relevantActs = (actsRes.data || []).filter((a) => a.createdBy === instructorUid);
        }
      }
      setActivities(relevantActs);

      // Cargar estadísticas y rúbricas para cada actividad
      const newStats: Record<string, ActivityStats> = {};
      const newRubrics: Record<string, Rubric> = {};

      for (const act of relevantActs) {
        newStats[act.id] = await activityService.getActivityStats(act.id);
        if (act.rubricId) {
          const rub = await rubricService.getRubric(act.rubricId);
          if (rub) newRubrics[act.id] = rub;
        } else {
          const rub = await rubricService.getRubricByActivity(act.id);
          if (rub) newRubrics[act.id] = rub;
        }
      }
      setStatsMap(newStats);
      setRubricsMap(newRubrics);
    } catch (err) {
      console.error('[InstructorActivitiesView] Error cargando actividades:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRubricSaved = (savedRubric: Rubric) => {
    if (savedRubric.activityId) {
      setRubricsMap((prev) => ({ ...prev, [savedRubric.activityId!]: savedRubric }));
      setActivities((prev) =>
        prev.map((a) =>
          a.id === savedRubric.activityId
            ? { ...a, rubricId: savedRubric.id, rubricTitle: savedRubric.title }
            : a
        )
      );
    }
    setIsRubricModalOpen(false);
    setEditingRubric(null);
    setRubricTargetActivity(null);
  };

  useEffect(() => {
    loadActivities();
  }, [instructorUid]);

  const handleActivitySaved = (savedAct: EvidenceActivity) => {
    setActivities((prev) => {
      const idx = prev.findIndex((a) => a.id === savedAct.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = savedAct;
        return updated;
      }
      return [savedAct, ...prev];
    });
    setIsCreateModalOpen(false);
    setEditingActivity(null);
  };

  const handleStatusChange = async (activityId: string, newStatus: ActivityStatus) => {
    await activityService.updateActivityStatus(activityId, newStatus);
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, status: newStatus } : a))
    );
  };

  const filteredActivities = activities.filter((act) => {
    if (selectedFicha !== 'all' && act.fichaId !== selectedFicha) return false;
    if (selectedStatus !== 'all' && act.status !== selectedStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(term);
      const matchDesc = act.description.toLowerCase().includes(term);
      return matchTitle || matchDesc;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#00324D]">Actividades y Evidencias Pedagógicas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Publica tareas, guías de aprendizaje y evidencias asociadas a RAPs y Google Drive
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DriveConnectionStatus compact />
          <button
            onClick={() => {
              setEditingRubric(null);
              setRubricTargetActivity(null);
              setIsRubricModalOpen(true);
            }}
            className="px-3.5 py-2 bg-white border border-[#39A900] text-[#2E8500] hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            + Crear Rúbrica
          </button>
          <button
            onClick={() => {
              setEditingActivity(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Crear Actividad
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros y Búsqueda */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar actividad por título o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedFicha}
            onChange={(e) => setSelectedFicha(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none focus:border-[#39A900]"
          >
            <option value="all">Todas las Fichas</option>
            {fichas.map((f) => (
              <option key={f.id} value={f.id}>
                Ficha {f.number} {f.programName ? `· ${f.programName}` : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none focus:border-[#39A900]"
          >
            <option value="all">Todos los Estados</option>
            <option value="published">Publicadas</option>
            <option value="draft">Borradores</option>
            <option value="closed">Cerradas</option>
            <option value="archived">Archivadas</option>
          </select>
        </div>
      </div>

      {/* 3. Grid de Actividades */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Cargando catálogo pedagógico de actividades...
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No se encontraron actividades</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No hay actividades con los filtros seleccionados. Crea una nueva actividad con evidencias configuradas.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 bg-[#39A900] text-white rounded-lg text-xs font-bold"
          >
            Crear Actividad Ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredActivities.map((act) => {
            const config = getEvidenceTypeConfig(act.submissionType);
            const stats = statsMap[act.id] || {
              totalApprentices: 25,
              submittedCount: 0,
              pendingCount: 25,
              underReviewCount: 0,
              approvedCount: 0,
              notApprovedCount: 0,
              correctionRequiredCount: 0,
            };

            const ficha = fichas.find((f) => f.id === act.fichaId || f.number === act.fichaId);
            const course = courses.find((c) => c.id === act.courseId);
            const rap = learningOutcomes.find((r) => r.id === act.learningOutcomeId);

            return (
              <div
                key={act.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-[#39A900] transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3.5">
                  {/* Fila superior: Ficha + Estado */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#00324D] bg-slate-100 px-2 py-0.5 rounded">
                      Ficha {ficha?.number || act.fichaId}{course?.name || course?.code ? ` · ${course?.name || course?.code}` : ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={act.status}
                        onChange={(e) =>
                          handleStatusChange(act.id, e.target.value as ActivityStatus)
                        }
                        className="text-[10px] font-bold uppercase rounded px-2 py-0.5 border border-slate-200 bg-white cursor-pointer"
                      >
                        <option value="published">Publicada</option>
                        <option value="draft">Borrador</option>
                        <option value="closed">Cerrada</option>
                        <option value="archived">Archivada</option>
                      </select>
                    </div>
                  </div>

                  {/* Título y Descripción */}
                  <div>
                    <h3 className="text-base font-bold text-slate-800 leading-snug">{act.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {act.instructions || act.description}
                    </p>
                  </div>

                  {/* RAP Asociado */}
                  {rap && (
                    <div className="text-[11px] text-slate-600 bg-emerald-50/70 border border-emerald-100 p-2 rounded-lg">
                      <strong className="text-emerald-800 font-bold block">
                        Resultado de Aprendizaje (RAP):
                      </strong>
                      <span className="line-clamp-1">{rap.description}</span>
                    </div>
                  )}

                  {/* Metadatos de Evidencia */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        Vence:{' '}
                        <strong className="text-slate-800">
                          {act.dueDate ? act.dueDate.split('T')[0] : 'Sin fecha'}
                        </strong>
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badgeClass}`}
                    >
                      {config.label} {act.maxFileSize ? `(Máx ${act.maxFileSize}MB)` : ''}
                    </span>
                  </div>

                  {/* Rúbrica Pedagógica Asociada (Prompt 19) */}
                  {(() => {
                    const actRubric = rubricsMap[act.id];
                    return (
                      <div className="p-2.5 rounded-lg border text-xs bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-slate-200">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Sliders className="w-4 h-4 text-[#39A900] shrink-0" />
                          {actRubric ? (
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className="font-bold text-[#00324D] truncate max-w-[160px]" title={actRubric.title}>
                                {actRubric.title}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                  actRubric.isPublished
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {actRubric.isPublished ? 'Publicada (100%)' : 'Borrador'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Sin rúbrica asociada
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          {actRubric ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingRubric(actRubric);
                                  setIsRubricDetailOpen(true);
                                }}
                                className="px-2 py-1 text-[10.5px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              >
                                Ver
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRubric(actRubric);
                                  setRubricTargetActivity(act);
                                  setIsRubricModalOpen(true);
                                }}
                                className="px-2 py-1 text-[10.5px] font-bold text-[#2E8500] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                              >
                                Editar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRubric(null);
                                setRubricTargetActivity(act);
                                setIsRubricModalOpen(true);
                              }}
                              className="px-2 py-1 text-[10.5px] font-bold text-[#2E8500] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Asignar Rúbrica
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Barra de progreso de entregas */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-medium">
                        Entregas:{' '}
                        <strong className="text-[#00324D]">
                          {stats.submittedCount} / {stats.totalApprentices}
                        </strong>
                      </span>
                      <span className="text-emerald-700 font-bold">
                        {stats.approvedCount} Aprobadas
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-[#39A900] h-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (stats.approvedCount / Math.max(1, stats.totalApprentices)) * 100
                          )}%`,
                        }}
                      />
                      <div
                        className="bg-amber-400 h-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (stats.underReviewCount / Math.max(1, stats.totalApprentices)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer de Tarjeta */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingActivity(act);
                        setIsCreateModalOpen(true);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Editar
                    </button>
                    {config.isFile && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-[#39A900]" />
                        Respaldado en Drive
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onNavigateToSubmissions(act.id)}
                    className="text-xs font-bold text-[#2E8500] hover:text-[#00324D] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    Ver entregas ({stats.submittedCount})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear / Editar Actividad Formativa */}
      {isCreateModalOpen && (
        <ActivityFormModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingActivity(null);
          }}
          onActivitySaved={handleActivitySaved}
          initialActivity={editingActivity}
        />
      )}

      {/* Modal: Crear / Editar Rúbrica Pedagógica (Prompt 19) */}
      {isRubricModalOpen && (
        <RubricFormModal
          isOpen={isRubricModalOpen}
          onClose={() => {
            setIsRubricModalOpen(false);
            setEditingRubric(null);
            setRubricTargetActivity(null);
          }}
          onRubricSaved={handleRubricSaved}
          initialRubric={editingRubric}
          preselectedFichaId={rubricTargetActivity?.fichaId || (selectedFicha !== 'all' ? selectedFicha : undefined)}
          preselectedActivityId={rubricTargetActivity?.id}
        />
      )}

      {/* Modal: Consulta Detallada de Rúbrica Pedagógica */}
      {isRubricDetailOpen && viewingRubric && (
        <RubricDetailModal
          isOpen={isRubricDetailOpen}
          onClose={() => {
            setIsRubricDetailOpen(false);
            setViewingRubric(null);
          }}
          rubric={viewingRubric}
          userRole="instructor"
        />
      )}
    </div>
  );
};
