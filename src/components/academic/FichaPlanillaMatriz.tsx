/**
 * @license
 * SENA Learning Hub - Matriz General de Calificaciones y Seguimiento de la Ficha (PLANILLA)
 * Inspirada en el Libro de Calificaciones de Google Classroom con identidad institucional SENA.
 * Colecciones: /fichas, /enrollments, /activities, /submissions
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Search,
  Download,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserX,
  Clock,
  AlertCircle,
  Eye,
  ExternalLink,
  FileText,
  Users,
  Award,
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
  Check,
  Calendar,
  Sparkles,
  Info,
  ChevronRight,
  Send,
} from 'lucide-react';
import {
  Ficha,
  ApprenticeWithEnrollment,
  EvidenceActivity,
  AcademicSubmission,
  AcademicGradeCode,
  LearningOutcome,
} from '../../types/academic';
import { submissionService } from '../../services/submissions/submissionService';
import { Modal } from '../ui/Modal';

export interface FichaPlanillaMatrizProps {
  ficha: Ficha;
  apprentices: ApprenticeWithEnrollment[];
  activities: EvidenceActivity[];
  submissions: AcademicSubmission[];
  learningOutcomes?: LearningOutcome[];
  instructorUid: string;
  instructorName?: string;
  onUpdateSubmission?: (updatedSub: AcademicSubmission) => void;
  onUpdateActivity?: (updatedActivity: EvidenceActivity) => void;
  onOpenLearnerProfile?: (apprentice: ApprenticeWithEnrollment) => void;
  onOpenActivityDetail?: (activity: EvidenceActivity) => void;
  onRefresh?: () => void;
  showToast?: (message: string) => void;
}

export type CellEvidenceState =
  | 'unsubmitted' // Sin entregar
  | 'submitted' // Entregado (pendiente de calificación)
  | 'under_review' // En revisión
  | 'approved' // A - Aprobado
  | 'not_approved' // N - No aprobado
  | 'correction' // C - Corregir
  | 'excluded'; // E - Excluido

interface CellData {
  apprentice: ApprenticeWithEnrollment;
  activity: EvidenceActivity;
  submission?: AcademicSubmission;
  state: CellEvidenceState;
  gradeCode?: AcademicGradeCode;
  isExcluded: boolean;
  scoreDisplay?: string;
  submittedAt?: string;
}

export const FichaPlanillaMatriz: React.FC<FichaPlanillaMatrizProps> = ({
  ficha,
  apprentices,
  activities,
  submissions,
  learningOutcomes = [],
  instructorUid,
  instructorName,
  onUpdateSubmission,
  onUpdateActivity,
  onOpenLearnerProfile,
  onOpenActivityDetail,
  onRefresh,
  showToast,
}) => {
  // 1. Estados de filtrado, búsqueda y ordenamiento
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'has_pending' | 'at_risk'>('all');
  const [sortCriterion, setSortCriterion] = useState<'name_asc' | 'name_desc' | 'progress_desc' | 'progress_asc'>('name_asc');

  // 2. Estado para el Modal de Evaluación / Detalle de Celda
  const [activeCellModal, setActiveCellModal] = useState<CellData | null>(null);
  const [gradeInputFeedback, setGradeInputFeedback] = useState('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [cellModalError, setCellModalError] = useState<string | null>(null);

  // Mapear RAPs por ID para tooltip rápido
  const rapMap = useMemo(() => {
    const map = new Map<string, string>();
    learningOutcomes.forEach((r) => map.set(r.id, r.name || r.description));
    return map;
  }, [learningOutcomes]);

  // Lista ordenada de actividades (por fecha límite o creación)
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [activities]);

  // Map rápido de entregas: clave `${activityId}_${learnerId}`
  const submissionLookup = useMemo(() => {
    const map = new Map<string, AcademicSubmission>();
    submissions.forEach((sub) => {
      const learnerId = sub.learnerId || sub.userId;
      if (sub.activityId && learnerId) {
        map.set(`${sub.activityId}_${learnerId}`, sub);
      }
    });
    return map;
  }, [submissions]);

  // Helper para determinar el estado de una celda
  const getCellData = useCallback(
    (app: ApprenticeWithEnrollment, act: EvidenceActivity): CellData => {
      const key = `${act.id}_${app.uid}`;
      const sub = submissionLookup.get(key);

      // Exclusión: sub.isExcluded === true O app.uid en act.excludedLearnerIds O sub.status === 'exonerated' / 'excluded'
      const isExcluded = sub && typeof sub.isExcluded === 'boolean'
        ? sub.isExcluded
        : Boolean(
            (act.excludedLearnerIds && act.excludedLearnerIds.includes(app.uid)) ||
              sub?.status === 'exonerated' ||
              sub?.status === 'excluded'
          );

      if (isExcluded) {
        return {
          apprentice: app,
          activity: act,
          submission: sub,
          state: 'excluded',
          gradeCode: undefined,
          isExcluded: true,
          scoreDisplay: 'E',
          submittedAt: sub?.submittedAt,
        };
      }

      if (sub) {
        if (sub.grade === 'A' || sub.status === 'approved') {
          return {
            apprentice: app,
            activity: act,
            submission: sub,
            state: 'approved',
            gradeCode: 'A',
            isExcluded: false,
            scoreDisplay: sub.rubricScore !== undefined ? `${sub.rubricScore} pts (A)` : 'A',
            submittedAt: sub.submittedAt,
          };
        }
        if (sub.grade === 'N' || sub.status === 'not_approved') {
          return {
            apprentice: app,
            activity: act,
            submission: sub,
            state: 'not_approved',
            gradeCode: 'N',
            isExcluded: false,
            scoreDisplay: sub.rubricScore !== undefined ? `${sub.rubricScore} pts (N)` : 'N',
            submittedAt: sub.submittedAt,
          };
        }
        if (sub.grade === 'C' || sub.status === 'correction_required') {
          return {
            apprentice: app,
            activity: act,
            submission: sub,
            state: 'correction',
            gradeCode: 'C',
            isExcluded: false,
            scoreDisplay: 'C',
            submittedAt: sub.submittedAt,
          };
        }
        if (sub.status === 'under_review') {
          return {
            apprentice: app,
            activity: act,
            submission: sub,
            state: 'under_review',
            gradeCode: undefined,
            isExcluded: false,
            scoreDisplay: 'En revisión',
            submittedAt: sub.submittedAt,
          };
        }
        // Entregado sin calificar
        return {
          apprentice: app,
          activity: act,
          submission: sub,
          state: 'submitted',
          gradeCode: undefined,
          isExcluded: false,
          scoreDisplay: 'Entregado',
          submittedAt: sub.submittedAt,
        };
      }

      // Sin entregar
      return {
        apprentice: app,
        activity: act,
        submission: undefined,
        state: 'unsubmitted',
        gradeCode: undefined,
        isExcluded: false,
        scoreDisplay: undefined,
      };
    },
    [submissionLookup]
  );

  // Procesar filas de aprendices con métricas de resumen
  const learnerRows = useMemo(() => {
    return apprentices.map((app) => {
      let approvedCount = 0;
      let pendingCount = 0;
      let notApprovedCount = 0;
      let correctionCount = 0;
      let excludedCount = 0;
      let unsubmittedCount = 0;

      const cells: CellData[] = sortedActivities.map((act) => {
        const cell = getCellData(app, act);
        switch (cell.state) {
          case 'approved':
            approvedCount++;
            break;
          case 'submitted':
          case 'under_review':
            pendingCount++;
            break;
          case 'not_approved':
            notApprovedCount++;
            break;
          case 'correction':
            correctionCount++;
            break;
          case 'excluded':
            excludedCount++;
            break;
          case 'unsubmitted':
            unsubmittedCount++;
            break;
        }
        return cell;
      });

      // El total evaluable excluye las actividades excluidas de ese aprendiz
      const evaluableTotal = Math.max(0, sortedActivities.length - excludedCount);
      const progressPercent = evaluableTotal > 0 ? Math.round((approvedCount / evaluableTotal) * 100) : 0;

      let academicStatus: 'complete' | 'on_track' | 'pending' | 'at_risk' = 'pending';
      if (approvedCount === evaluableTotal && evaluableTotal > 0) {
        academicStatus = 'complete';
      } else if (progressPercent >= 70) {
        academicStatus = 'on_track';
      } else if (notApprovedCount > 0 || (unsubmittedCount > 0 && progressPercent < 40)) {
        academicStatus = 'at_risk';
      }

      return {
        apprentice: app,
        cells,
        approvedCount,
        pendingCount,
        notApprovedCount,
        correctionCount,
        excludedCount,
        unsubmittedCount,
        evaluableTotal,
        progressPercent,
        academicStatus,
      };
    });
  }, [apprentices, sortedActivities, getCellData]);

  // Filtrado y ordenamiento
  const filteredRows = useMemo(() => {
    let rows = [...learnerRows];

    // Búsqueda por texto
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.apprentice.displayName.toLowerCase().includes(q) ||
          r.apprentice.email.toLowerCase().includes(q) ||
          (r.apprentice.documentNumber && r.apprentice.documentNumber.toLowerCase().includes(q))
      );
    }

    // Filtro por estado
    if (statusFilter === 'complete') {
      rows = rows.filter((r) => r.academicStatus === 'complete');
    } else if (statusFilter === 'has_pending') {
      rows = rows.filter((r) => r.pendingCount > 0);
    } else if (statusFilter === 'at_risk') {
      rows = rows.filter((r) => r.academicStatus === 'at_risk');
    }

    // Ordenamiento
    rows.sort((a, b) => {
      if (sortCriterion === 'name_asc') {
        return a.apprentice.displayName.localeCompare(b.apprentice.displayName);
      }
      if (sortCriterion === 'name_desc') {
        return b.apprentice.displayName.localeCompare(a.apprentice.displayName);
      }
      if (sortCriterion === 'progress_desc') {
        return b.progressPercent - a.progressPercent;
      }
      if (sortCriterion === 'progress_asc') {
        return a.progressPercent - b.progressPercent;
      }
      return 0;
    });

    return rows;
  }, [learnerRows, searchTerm, statusFilter, sortCriterion]);

  // Estadísticas globales de la planilla
  const globalStats = useMemo(() => {
    const totalLearners = apprentices.length;
    const totalActs = sortedActivities.length;

    let totalApproved = 0;
    let totalPendingReview = 0;
    let totalCellsCount = 0;

    learnerRows.forEach((r) => {
      totalApproved += r.approvedCount;
      totalPendingReview += r.pendingCount;
      totalCellsCount += r.evaluableTotal;
    });

    const averageApprovalRate = totalCellsCount > 0 ? Math.round((totalApproved / totalCellsCount) * 100) : 0;

    return {
      totalLearners,
      totalActs,
      totalPendingReview,
      averageApprovalRate,
    };
  }, [apprentices, sortedActivities, learnerRows]);

  // Estadísticas por columna (por actividad)
  const activityStats = useMemo(() => {
    const map = new Map<
      string,
      { approved: number; delivered: number; notApproved: number; correction: number; excluded: number; total: number }
    >();

    sortedActivities.forEach((act) => {
      let approved = 0;
      let delivered = 0;
      let notApproved = 0;
      let correction = 0;
      let excluded = 0;

      apprentices.forEach((app) => {
        const cell = getCellData(app, act);
        if (cell.state === 'approved') approved++;
        else if (cell.state === 'submitted' || cell.state === 'under_review') delivered++;
        else if (cell.state === 'not_approved') notApproved++;
        else if (cell.state === 'correction') correction++;
        else if (cell.state === 'excluded') excluded++;
      });

      map.set(act.id, {
        approved,
        delivered,
        notApproved,
        correction,
        excluded,
        total: apprentices.length,
      });
    });

    return map;
  }, [sortedActivities, apprentices, getCellData]);

  // Abrir modal de edición / calificación de la celda
  const handleOpenCellModal = (cell: CellData) => {
    setActiveCellModal(cell);
    setCellModalError(null);
    setGradeInputFeedback(cell.submission?.feedback || '');
  };

  // Guardar dictamen oficial (A, N, C) sobre la celda
  const handleApplyGrade = async (gradeCode: AcademicGradeCode) => {
    if (!activeCellModal) return;
    setIsSavingGrade(true);
    setCellModalError(null);

    const { apprentice, activity, submission } = activeCellModal;

    // Garantizar que exista una entrega válida para registrar
    const targetSub: AcademicSubmission = submission || {
      id: `sub_${ficha.id}_${activity.id}_${apprentice.uid}`,
      activityId: activity.id,
      activityTitle: activity.title,
      learnerId: apprentice.uid,
      userId: apprentice.uid,
      learnerName: apprentice.displayName,
      learnerEmail: apprentice.email,
      fichaId: ficha.id,
      courseId: activity.courseId || (ficha as any).courseId || '',
      submissionType: (activity.submissionType as any) || 'document',
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      resubmissionCount: 0,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const defaultFeedback =
      gradeInputFeedback.trim() ||
      (gradeCode === 'A'
        ? 'Evidencia formativa aprobada con éxito.'
        : gradeCode === 'C'
        ? 'Evidencia con observaciones. Requiere nueva entrega de corrección.'
        : 'Evidencia no aprobada. Consulte las recomendaciones del instructor.');

    try {
      // submissionService.gradeSubmission automáticamente:
      // 1. Asigna dictamen A / N / C
      // 2. Retira la exclusión activa (isExcluded: false, excludedAt: null) en /submissions
      // 3. Remueve al aprendiz de excludedLearnerIds en /activities/{activityId}
      const updated = await submissionService.gradeSubmission({
        submissionId: targetSub.id,
        gradeCode,
        feedback: defaultFeedback,
        instructorId: instructorUid,
        instructorName: instructorName || 'Instructor SENA',
        submission: targetSub,
      });

      if (updated) {
        onUpdateSubmission?.(updated);

        // Actualizar actividad en memoria si tenía el aprendiz como excluido
        if (activity.excludedLearnerIds?.includes(apprentice.uid)) {
          const updatedAct: EvidenceActivity = {
            ...activity,
            excludedLearnerIds: (activity.excludedLearnerIds || []).filter((id) => id !== apprentice.uid),
          };
          onUpdateActivity?.(updatedAct);
        }

        showToast?.(`Calificación guardada: ${gradeCode} para ${apprentice.displayName}.`);
        setActiveCellModal(null);
      }
    } catch (err: any) {
      console.error('[FichaPlanillaMatriz] Error guardando calificación:', err);
      setCellModalError(err?.message || 'Error guardando calificación en Firestore. Por favor intenta de nuevo.');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Acción para Excluir / Restaurar (E)
  const handleToggleExclusion = async () => {
    if (!activeCellModal) return;
    setIsSavingGrade(true);
    setCellModalError(null);

    const { apprentice, activity, submission, isExcluded } = activeCellModal;

    try {
      if (isExcluded) {
        // Restaurar exclusión
        const restored = await submissionService.removeExclusionFromActivity({
          submissionId: submission?.id || `sub_${ficha.id}_${activity.id}_${apprentice.uid}`,
          activityId: activity.id,
          fichaId: ficha.id,
          learnerId: apprentice.uid,
          instructorId: instructorUid,
        });
        if (restored) onUpdateSubmission?.(restored);

        if (activity.excludedLearnerIds?.includes(apprentice.uid)) {
          const updatedAct: EvidenceActivity = {
            ...activity,
            excludedLearnerIds: (activity.excludedLearnerIds || []).filter((id) => id !== apprentice.uid),
          };
          onUpdateActivity?.(updatedAct);
        }

        showToast?.(`Exclusión retirada: ${apprentice.displayName} ya no está excluido.`);
      } else {
        // Excluir (E)
        const excluded = await submissionService.excludeLearnerFromActivity({
          submissionId: submission?.id,
          activityId: activity.id,
          activityTitle: activity.title,
          fichaId: ficha.id,
          learnerId: apprentice.uid,
          learnerName: apprentice.displayName,
          learnerEmail: apprentice.email,
          instructorId: instructorUid,
          instructorName: instructorName || 'Instructor SENA',
          reason: gradeInputFeedback.trim() || 'Exonerado de evidencia pedagógica por el instructor',
        });
        if (excluded) onUpdateSubmission?.(excluded);

        const currentIds = activity.excludedLearnerIds || [];
        if (!currentIds.includes(apprentice.uid)) {
          const updatedAct: EvidenceActivity = {
            ...activity,
            excludedLearnerIds: [...currentIds, apprentice.uid],
          };
          onUpdateActivity?.(updatedAct);
        }

        showToast?.(`Aprendiz ${apprentice.displayName} marcado como Excluido (E).`);
      }
      setActiveCellModal(null);
    } catch (err: any) {
      console.error('[FichaPlanillaMatriz] Error alternando exclusión:', err);
      setCellModalError(err?.message || 'Error modificando la exclusión en Firestore.');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Exportar planilla completa a archivo CSV estructurado
  const handleExportCSV = () => {
    try {
      const headerRow = [
        '#',
        'Documento',
        'Aprendiz',
        'Correo Institucional',
        ...sortedActivities.map((a) => `"${a.title.replace(/"/g, '""')}"`),
        'Aprobadas',
        'Total Evaluables',
        '% Cumplimiento',
        'Estado',
      ];

      const rowsData = filteredRows.map((r, idx) => {
        const cellValues = r.cells.map((c) => {
          if (c.state === 'approved') return 'A - Aprobado';
          if (c.state === 'not_approved') return 'N - No aprobado';
          if (c.state === 'correction') return 'C - Corregir';
          if (c.state === 'excluded') return 'E - Excluido';
          if (c.state === 'submitted' || c.state === 'under_review') return 'Entregado (Pendiente)';
          return 'Sin entregar';
        });

        const statusLabel =
          r.academicStatus === 'complete'
            ? 'Completo'
            : r.academicStatus === 'on_track'
            ? 'Al día'
            : r.academicStatus === 'at_risk'
            ? 'En riesgo'
            : 'En progreso';

        return [
          idx + 1,
          `"${r.apprentice.documentNumber || 'N/A'}"`,
          `"${r.apprentice.displayName.replace(/"/g, '""')}"`,
          `"${r.apprentice.email}"`,
          ...cellValues.map((v) => `"${v}"`),
          r.approvedCount,
          r.evaluableTotal,
          `${r.progressPercent}%`,
          `"${statusLabel}"`,
        ].join(',');
      });

      const fichaNum = ficha.number || (ficha as any).code || '';
      const csvContent =
        '\uFEFF' + // BOM UTF-8 para apertura directa en Microsoft Excel
        `"SENA LEARNING HUB - PLANILLA GENERAL DE CALIFICACIONES"\n` +
        `"Ficha:","${fichaNum} - ${ficha.name || ficha.programName || ''}"\n` +
        `"Fecha de exportación:","${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}"\n\n` +
        [headerRow.join(','), ...rowsData].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Planilla_Ficha_${fichaNum}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast?.('Planilla descargada exitosamente en formato CSV / Excel.');
    } catch (err) {
      console.error('[FichaPlanillaMatriz] Error exportando planilla:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & KPI Cards Google Classroom Style */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#00324D]/5 text-[#00324D] rounded-xl border border-[#00324D]/15">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Planilla de Calificaciones y Evidencias
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#39A900]/15 text-[#246B00] border border-[#39A900]/30">
                    Ficha {ficha.number || (ficha as any).code}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Matriz académica oficial de todos los aprendices y actividades asignadas en tiempo real.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Actualizar datos desde Firestore"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refrescar</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#00324D] hover:bg-[#002235] rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Descargar libro de calificaciones en formato Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#8CE665]" />
              <span>Exportar Planilla (CSV)</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Aprendices</span>
              <Users className="w-4 h-4 text-[#00324D]" />
            </div>
            <div className="text-2xl font-black text-slate-900">{globalStats.totalLearners}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Matriculados en la ficha</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Actividades</span>
              <FileText className="w-4 h-4 text-[#00324D]" />
            </div>
            <div className="text-2xl font-black text-slate-900">{globalStats.totalActs}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Asignadas y publicadas</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Por Calificar</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600">{globalStats.totalPendingReview}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Evidencias pendientes</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Aprobación General</span>
              <TrendingUp className="w-4 h-4 text-[#39A900]" />
            </div>
            <div className="text-2xl font-black text-[#246B00]">{globalStats.averageApprovalRate}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Promedio general de notas A</div>
          </div>
        </div>
      </div>

      {/* 2. Barra de Filtros, Búsqueda y Ordenamiento */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, documento o correo del aprendiz..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por estado */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs font-semibold bg-transparent text-slate-700 border-none focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los aprendices ({apprentices.length})</option>
              <option value="complete">100% Aprobados</option>
              <option value="has_pending">Con evidencias por calificar</option>
              <option value="at_risk">En riesgo académico</option>
            </select>
          </div>

          {/* Criterio de ordenamiento */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortCriterion}
              onChange={(e) => setSortCriterion(e.target.value as any)}
              className="text-xs font-semibold bg-transparent text-slate-700 border-none focus:outline-none cursor-pointer"
            >
              <option value="name_asc">Nombre (A - Z)</option>
              <option value="name_desc">Nombre (Z - A)</option>
              <option value="progress_desc">Mayor % Aprobación</option>
              <option value="progress_asc">Menor % Aprobación</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Leyenda rápida de estados de la matriz */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
        <span className="font-bold text-slate-700 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-[#00324D]" /> Convenciones:
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> A — Aprobado
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-semibold text-[11px]">
          <XCircle className="w-3 h-3 text-rose-600" /> N — No aprobado
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
          <RotateCcw className="w-3 h-3 text-amber-600" /> C — Corregir
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-[11px]">
          <UserX className="w-3 h-3 text-slate-500" /> E — Excluido
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[11px]">
          <Clock className="w-3 h-3 text-blue-600" /> Entregado (Pendiente)
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 text-[11px]">
          — Sin entregar
        </span>
        <span className="ml-auto text-[11px] text-slate-400 italic">
          Haz clic en cualquier celda para calificar o ver la entrega
        </span>
      </div>

      {/* 4. Matriz Google Classroom (Tabla con columnas fijas y scroll horizontal) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No se encontraron aprendices</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm ? 'Intenta modificar el término de búsqueda o el filtro.' : 'Esta ficha no tiene aprendices matriculados.'}
            </p>
          </div>
        ) : sortedActivities.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No hay actividades asignadas</h3>
            <p className="text-xs text-slate-500 mt-1">
              Publica actividades en la pestaña de Actividades para visualizar la matriz de calificaciones.
            </p>
          </div>
        ) : (
          <div className="relative overflow-x-auto max-h-[700px] scrollbar-thin">
            <table className="w-full text-left border-collapse border-spacing-0">
              {/* Encabezado Fijo de la Tabla */}
              <thead className="bg-[#00324D] text-white text-xs font-bold sticky top-0 z-30 shadow-xs">
                <tr>
                  {/* Columna 1: Aprendiz (Sticky Izquierda) */}
                  <th className="sticky left-0 z-40 bg-[#00324D] py-3.5 px-4 min-w-[260px] max-w-[280px] border-r border-[#002235] shadow-[4px_0_6px_-2px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center justify-between">
                      <span className="uppercase tracking-wider text-[11px] text-white/90">Aprendiz ({filteredRows.length})</span>
                      <Users className="w-3.5 h-3.5 text-[#8CE665]" />
                    </div>
                  </th>

                  {/* Columnas de Actividades Formativas */}
                  {sortedActivities.map((act) => {
                    const stats = activityStats.get(act.id);
                    const dueDateFormatted = act.dueDate
                      ? new Date(act.dueDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
                      : null;
                    const rapText = act.learningOutcomeId ? rapMap.get(act.learningOutcomeId) : null;

                    return (
                      <th
                        key={act.id}
                        className="py-3 px-3.5 min-w-[170px] max-w-[200px] border-r border-white/10 hover:bg-[#002a41] transition-colors group align-top"
                      >
                        <div className="flex flex-col gap-1">
                          {/* Título de la actividad con botón para ver detalle */}
                          <div className="flex items-start justify-between gap-1.5">
                            <span
                              className="font-bold text-white text-xs line-clamp-2 leading-tight"
                              title={act.title}
                            >
                              {act.title}
                            </span>
                            {onOpenActivityDetail && (
                              <button
                                type="button"
                                onClick={() => onOpenActivityDetail(act)}
                                className="opacity-60 group-hover:opacity-100 hover:text-[#8CE665] transition-opacity p-0.5 cursor-pointer shrink-0"
                                title="Ver detalles de la actividad"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Metadatos: Fecha límite y Puntuación */}
                          <div className="flex items-center justify-between gap-1 text-[10px] text-slate-300 font-normal">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#8CE665]" />
                              {dueDateFormatted ? `Vence: ${dueDateFormatted}` : 'Sin límite'}
                            </span>
                            <span className="bg-white/15 px-1.5 py-0.2 rounded text-slate-200 font-semibold">
                              {act.points ? `${act.points} pts` : 'A / D'}
                            </span>
                          </div>

                          {/* Barra de progreso de la actividad (% evaluados) */}
                          {stats && (
                            <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70">
                              <span>
                                {stats.approved} A · {stats.delivered} pend.
                              </span>
                              <span className="font-bold text-[#8CE665]">
                                {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                              </span>
                            </div>
                          )}

                          {/* Tooltip de RAP si existe */}
                          {rapText && (
                            <div className="text-[9px] text-slate-300 truncate opacity-80" title={`RAP: ${rapText}`}>
                              RAP: {rapText}
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}

                  {/* Columna Final: Resumen Académico */}
                  <th className="py-3 px-4 min-w-[200px] border-l border-white/10 text-center uppercase tracking-wider text-[11px] text-white/90">
                    <div className="flex items-center justify-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#8CE665]" />
                      <span>Resumen Académico</span>
                    </div>
                  </th>
                </tr>
              </thead>

              {/* Cuerpo de la Matriz */}
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRows.map((row) => {
                  const { apprentice, cells, approvedCount, evaluableTotal, progressPercent, academicStatus } = row;

                  return (
                    <tr key={apprentice.uid} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Columna Fija Izquierda: Datos del Aprendiz */}
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 py-3 px-4 border-r border-slate-200 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-3">
                          {/* Avatar / Iniciales */}
                          {apprentice.photoURL ? (
                            <img
                              src={apprentice.photoURL}
                              alt={apprentice.displayName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#00324D] text-[#8CE665] font-bold text-xs flex items-center justify-center shrink-0">
                              {apprentice.displayName.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div
                              onClick={() => onOpenLearnerProfile?.(apprentice)}
                              className="font-bold text-slate-900 truncate hover:text-[#39A900] cursor-pointer"
                              title={apprentice.displayName}
                            >
                              {apprentice.displayName}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                              <span>{apprentice.documentNumber ? `CC ${apprentice.documentNumber}` : apprentice.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Celdas de Actividades Formativas */}
                      {cells.map((cell) => {
                        const { state, scoreDisplay } = cell;

                        return (
                          <td
                            key={cell.activity.id}
                            onClick={() => handleOpenCellModal(cell)}
                            className="py-2.5 px-3 border-r border-slate-100 text-center cursor-pointer hover:bg-slate-100/90 transition-all select-none"
                            title={`Haga clic para evaluar o ver entrega de ${cell.apprentice.displayName}`}
                          >
                            <div className="flex items-center justify-center">
                              {/* 1. APROBADO */}
                              {state === 'approved' && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs shadow-xs hover:border-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{scoreDisplay || 'A'}</span>
                                </div>
                              )}

                              {/* 2. NO APROBADO */}
                              {state === 'not_approved' && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-300 font-bold text-xs shadow-xs hover:border-rose-400">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>{scoreDisplay || 'N'}</span>
                                </div>
                              )}

                              {/* 3. CORREGIR */}
                              {state === 'correction' && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-bold text-xs shadow-xs hover:border-amber-400">
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>C — Corregir</span>
                                </div>
                              )}

                              {/* 4. EXCLUIDO */}
                              {state === 'excluded' && (
                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs shadow-xs hover:border-slate-400">
                                  <UserX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>Excluido (E)</span>
                                </div>
                              )}

                              {/* 5. ENTREGADO / EN REVISIÓN */}
                              {(state === 'submitted' || state === 'under_review') && (
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-300 font-bold text-xs shadow-xs animate-pulse hover:border-blue-400">
                                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>{state === 'under_review' ? 'En revisión' : 'Entregado'}</span>
                                </div>
                              )}

                              {/* 6. SIN ENTREGAR */}
                              {state === 'unsubmitted' && (
                                <span className="text-slate-400 font-normal text-xs hover:text-slate-600 py-1 px-2">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Columna Final: Resumen y Progreso del Aprendiz */}
                      <td className="py-3 px-4 border-l border-slate-200 bg-white group-hover:bg-slate-50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-slate-700">
                                {approvedCount} / {evaluableTotal} Aprobadas
                              </span>
                              <span
                                className={`font-black ${
                                  progressPercent >= 70
                                    ? 'text-emerald-700'
                                    : progressPercent >= 40
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {progressPercent}%
                              </span>
                            </div>
                            {/* Barra de progreso */}
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  progressPercent >= 70
                                    ? 'bg-[#39A900]'
                                    : progressPercent >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Botón de Perfil */}
                          <button
                            type="button"
                            onClick={() => onOpenLearnerProfile?.(apprentice)}
                            className="p-1.5 text-slate-400 hover:text-[#00324D] hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Ver perfil completo del aprendiz"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
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

      {/* 5. Modal de Calificación y Detalle de Celda (Google Classroom Style) */}
      {activeCellModal && (
        <Modal
          isOpen={Boolean(activeCellModal)}
          onClose={() => setActiveCellModal(null)}
          title="Detalle y Calificación de Evidencia"
          subtitle={`Planilla oficial de la Ficha ${ficha.number || (ficha as any).code}`}
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Cabecera del Aprendiz y Actividad */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                {activeCellModal.apprentice.photoURL ? (
                  <img
                    src={activeCellModal.apprentice.photoURL}
                    alt={activeCellModal.apprentice.displayName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#00324D] text-[#8CE665] font-bold text-sm flex items-center justify-center">
                    {activeCellModal.apprentice.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{activeCellModal.apprentice.displayName}</h4>
                  <p className="text-xs text-slate-500">
                    {activeCellModal.apprentice.documentNumber
                      ? `CC ${activeCellModal.apprentice.documentNumber} · `
                      : ''}
                    {activeCellModal.apprentice.email}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Actividad:</span>
                  <span className="text-slate-900 font-semibold">{activeCellModal.activity.title}</span>
                </div>
                {activeCellModal.activity.dueDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Fecha límite:</span>
                    <span className="text-slate-700">
                      {new Date(activeCellModal.activity.dueDate).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estado actual:</span>
                  <span className="font-bold">
                    {activeCellModal.isExcluded ? (
                      <span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded text-[11px]">
                        Excluido (E)
                      </span>
                    ) : activeCellModal.state === 'approved' ? (
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                        A — Aprobado
                      </span>
                    ) : activeCellModal.state === 'not_approved' ? (
                      <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                        N — No aprobado
                      </span>
                    ) : activeCellModal.state === 'correction' ? (
                      <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                        C — Corregir
                      </span>
                    ) : activeCellModal.state === 'submitted' || activeCellModal.state === 'under_review' ? (
                      <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                        Entregado (Pendiente)
                      </span>
                    ) : (
                      <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        Sin entregar
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Archivos o Enlaces de Entrega si existen */}
            {activeCellModal.submission && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  <span>Archivos y evidencias entregadas por el aprendiz:</span>
                </div>

                {activeCellModal.submission.submittedAt && (
                  <div className="text-[11px] text-blue-800">
                    Entregado el:{' '}
                    {new Date(activeCellModal.submission.submittedAt).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}

                {/* Enlace Drive */}
                {(activeCellModal.submission.driveUrl || activeCellModal.submission.driveFileUrl) && (
                  <a
                    href={activeCellModal.submission.driveUrl || activeCellModal.submission.driveFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver documento en Google Drive ({activeCellModal.submission.fileName || 'Archivo'})</span>
                  </a>
                )}

                {/* Enlace externo (Canva / YouTube / etc.) */}
                {activeCellModal.submission.externalUrl && (
                  <div>
                    <a
                      href={activeCellModal.submission.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir enlace entregado ({activeCellModal.submission.externalUrl})</span>
                    </a>
                  </div>
                )}

                {/* Texto enviado */}
                {activeCellModal.submission.textContent && (
                  <div className="p-2.5 bg-white rounded-lg border border-blue-200 text-xs text-slate-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {activeCellModal.submission.textContent}
                  </div>
                )}
              </div>
            )}

            {/* Error si ocurre */}
            {cellModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{cellModalError}</span>
              </div>
            )}

            {/* Campo de retroalimentación pedagógica */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Observaciones y Retroalimentación Pedagógica:
              </label>
              <textarea
                rows={3}
                value={gradeInputFeedback}
                onChange={(e) => setGradeInputFeedback(e.target.value)}
                placeholder="Escribe comentarios, orientaciones o motivo de la calificación para el aprendiz..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#39A900] focus:bg-white transition-all"
              />
            </div>

            {/* PROMPT 38: Botones A, N, C, E siempre habilitados e independientes */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                Dictamen Oficial (Selecciona para calificar o modificar):
              </label>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* BOTÓN A: APROBAR */}
                <button
                  type="button"
                  disabled={isSavingGrade}
                  onClick={() => handleApplyGrade('A')}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Aprobar evidencia (A). Si estaba excluido, se retira la exclusión automáticamente."
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>A — Aprobar</span>
                </button>

                {/* BOTÓN N: NO APROBAR */}
                <button
                  type="button"
                  disabled={isSavingGrade}
                  onClick={() => handleApplyGrade('N')}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="No aprobar evidencia (N). Si estaba excluido, se retira la exclusión automáticamente."
                >
                  <XCircle className="w-4 h-4" />
                  <span>N — No Aprobar</span>
                </button>

                {/* BOTÓN C: CORREGIR */}
                <button
                  type="button"
                  disabled={isSavingGrade}
                  onClick={() => handleApplyGrade('C')}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Solicitar corrección (C). Si estaba excluido, se retira la exclusión automáticamente."
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>C — Corregir</span>
                </button>

                {/* BOTÓN E: EXCLUIR / RESTAURAR */}
                <button
                  type="button"
                  disabled={isSavingGrade}
                  onClick={handleToggleExclusion}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                    activeCellModal.isExcluded
                      ? 'bg-slate-800 hover:bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                  }`}
                  title="Excluir o restaurar evidencia pedagógica"
                >
                  <UserX className="w-4 h-4" />
                  <span>{activeCellModal.isExcluded ? 'Quitar Exclusión' : 'E — Excluir'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 pt-1">
                {activeCellModal.isExcluded
                  ? 'Nota: Este aprendiz está marcado como excluido (E). Al pulsar A, N o C, la exclusión se retirará automáticamente y se guardará el nuevo dictamen oficial en Firestore.'
                  : 'Las calificaciones asignadas se guardan de inmediato en Cloud Firestore y son visibles en el reporte institucional.'}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
