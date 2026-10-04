/**
 * @license
 * SENA Learning Hub - Dashboard Académico del Instructor
 * PROMPT 9: Dashboard con Datos Reales de Firestore, Indicadores de Seguimiento,
 * Alertas Tempranas, Filtro Global por Ficha y Drill-Down Interactivo hacia Registros Reales
 *
 * Colecciones Firestore Reales:
 * - /fichas
 * - /enrollments
 * - /activities
 * - /submissions
 * - /academicRestrictions
 * - /attentionCalls
 * - /courses
 * - /competencies
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  BookOpen,
  FileText,
  ArrowRight,
  Clock,
  Sparkles,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  Award,
  AlertCircle,
  RotateCcw,
  CheckSquare,
  ShieldAlert,
  AlertTriangle,
  Filter,
  ExternalLink,
  HardDrive,
  Calendar,
  Layers,
  ChevronRight,
  X,
  Target,
  GraduationCap,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import {
  Ficha,
  EvidenceActivity,
  AcademicSubmission,
  AcademicRestriction,
  AttentionCall,
  ApprenticeWithEnrollment,
} from '../../types/academic';
import { fichaService } from '../../services/academic/fichaService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { activityService } from '../../services/academic/activityService';
import { submissionService } from '../../services/submissions/submissionService';
import { trackingService } from '../../services/academic/trackingService';
import { normalizeEvaluationStatus } from '../../utils/evaluationUtils';

interface InstructorDashboardProps {
  onNavigate: (viewId: string) => void;
  onOpenCreateActivity: () => void;
  onOpenCreateFicha: () => void;
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  onNavigate,
  onOpenCreateActivity,
  onOpenCreateFicha,
}) => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';

  // Datos base reales de Firestore
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [apprentices, setApprentices] = useState<ApprenticeWithEnrollment[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [restrictions, setRestrictions] = useState<AcademicRestriction[]>([]);
  const [attentionCalls, setAttentionCalls] = useState<AttentionCall[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro global de ficha para el Dashboard
  const [selectedFichaId, setSelectedFichaId] = useState<string>('all');

  // Estado para modal drill-down de aprendices con alertas/restricciones
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);

  // Carga inicial y reactiva de colecciones reales desde Firestore
  const loadDashboardData = async () => {
    if (!instructorUid) return;
    setLoading(true);
    try {
      const [
        fichasRes,
        appsRes,
        actsRes,
        subsRes,
        restrRes,
        callsRes,
      ] = await Promise.all([
        fichaService.getFichas(instructorUid),
        enrollmentService.getApprenticesWithEnrollment('all', instructorUid),
        activityService.getActivities(),
        submissionService.getAllSubmissions(instructorUid),
        trackingService.getRestrictions(),
        trackingService.getAttentionCalls(),
      ]);

      const loadedFichas = fichasRes.data || [];
      setFichas(loadedFichas);
      setApprentices(appsRes.data || []);
      setActivities(actsRes.data || []);
      setSubmissions(subsRes.data || []);
      setRestrictions(restrRes.data || []);
      setAttentionCalls(callsRes.data || []);
    } catch (err) {
      console.warn('[InstructorDashboard] Error cargando métricas reales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [instructorUid]);

  // Fichas filtradas según asignación del instructor
  const myFichas = useMemo(() => {
    return fichas.filter((f) => {
      if (!f.instructorIds || f.instructorIds.length === 0) return true;
      return f.instructorIds.includes(instructorUid);
    });
  }, [fichas, instructorUid]);

  const myFichaIds = useMemo(() => new Set(myFichas.map((f) => f.id)), [myFichas]);
  const myFichaNumbers = useMemo(() => new Set(myFichas.map((f) => f.number)), [myFichas]);

  // Filtrado de actividades del instructor y de la ficha seleccionada
  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      // Si la actividad tiene fichaId, verificar que pertenezca al instructor
      const matchesInstructorFicha =
        !a.fichaId ||
        myFichaIds.has(a.fichaId) ||
        myFichaNumbers.has(a.fichaId) ||
        a.createdBy === instructorUid;

      if (!matchesInstructorFicha) return false;

      // Filtro por ficha específica seleccionada en el dashboard
      if (selectedFichaId !== 'all') {
        const matchesSelected =
          a.fichaId === selectedFichaId ||
          myFichas.find((f) => f.id === selectedFichaId)?.number === a.fichaId;
        return matchesSelected;
      }

      return true;
    });
  }, [activities, myFichas, myFichaIds, myFichaNumbers, selectedFichaId, instructorUid]);

  // Filtrado de aprendices matriculados según ficha seleccionada
  const filteredApprentices = useMemo(() => {
    if (selectedFichaId === 'all') {
      return apprentices;
    }
    const targetFicha = myFichas.find((f) => f.id === selectedFichaId);
    return apprentices.filter(
      (a) =>
        a.fichaId === selectedFichaId ||
        (targetFicha && (a.fichaNumber === targetFicha.number || a.fichaId === targetFicha.number))
    );
  }, [apprentices, selectedFichaId, myFichas]);

  // Filtrado de entregas (submissions) según la ficha seleccionada
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const subFicha = sub.fichaId || '';
      // Debe corresponder a las fichas del instructor
      const isMyFicha =
        myFichaIds.has(subFicha) ||
        myFichaNumbers.has(subFicha) ||
        myFichas.some(
          (f) => subFicha.toLowerCase().includes(f.number.toLowerCase()) || f.id === subFicha
        );

      if (!isMyFicha && myFichas.length > 0) return false;

      // Filtro por ficha seleccionada en dashboard
      if (selectedFichaId !== 'all') {
        const targetFicha = myFichas.find((f) => f.id === selectedFichaId);
        const matchesSelected =
          subFicha === selectedFichaId ||
          (targetFicha && (subFicha === targetFicha.number || subFicha.includes(targetFicha.number)));
        return matchesSelected;
      }

      return true;
    });
  }, [submissions, myFichas, myFichaIds, myFichaNumbers, selectedFichaId]);

  // Filtrado de restricciones académicas activas
  const activeRestrictions = useMemo(() => {
    return restrictions.filter((r) => {
      const isActive = r.status === 'ACTIVA' || r.status === 'active';
      if (!isActive) return false;

      if (selectedFichaId !== 'all') {
        const targetFicha = myFichas.find((f) => f.id === selectedFichaId);
        return (
          r.fichaId === selectedFichaId ||
          (targetFicha && (r.fichaId === targetFicha.number || r.fichaNumber === targetFicha.number))
        );
      }
      return true;
    });
  }, [restrictions, selectedFichaId, myFichas]);

  // Filtrado de llamados de atención pendientes o notificados
  const activeAttentionCalls = useMemo(() => {
    return attentionCalls.filter((c) => {
      const isPending =
        c.status === 'NOTIFICADO' ||
        c.status === 'PENDIENTE' ||
        c.status === 'EN_REVISION';
      if (!isPending) return false;

      if (selectedFichaId !== 'all') {
        const targetFicha = myFichas.find((f) => f.id === selectedFichaId);
        return (
          c.fichaId === selectedFichaId ||
          (targetFicha && (c.fichaId === targetFicha.number || c.fichaNumber === targetFicha.number))
        );
      }
      return true;
    });
  }, [attentionCalls, selectedFichaId, myFichas]);

  // Aprendices con alertas tempranas (restricciones o llamados activos)
  const apprenticesWithAlerts = useMemo(() => {
    const alertsMap = new Map<
      string,
      {
        learnerId: string;
        learnerName: string;
        fichaId: string;
        restrictionsCount: number;
        attentionCallsCount: number;
        hasBlock: boolean;
      }
    >();

    activeRestrictions.forEach((r) => {
      const key = r.userId || r.learnerId || r.id;
      const current = alertsMap.get(key) || {
        learnerId: key,
        learnerName: r.learnerName || 'Aprendiz',
        fichaId: r.fichaNumber || r.fichaId || '—',
        restrictionsCount: 0,
        attentionCallsCount: 0,
        hasBlock: false,
      };
      current.restrictionsCount += 1;
      if (
        r.type === 'BLOQUEO_ENTREGA_EVIDENCIA' ||
        r.type === 'evidence_submission' ||
        r.type === 'CONDICIONAMIENTO_MATRICULA'
      ) {
        current.hasBlock = true;
      }
      alertsMap.set(key, current);
    });

    activeAttentionCalls.forEach((c) => {
      const key = c.userId || c.learnerId || c.id;
      const current = alertsMap.get(key) || {
        learnerId: key,
        learnerName: c.learnerName || 'Aprendiz',
        fichaId: c.fichaNumber || c.fichaId || '—',
        restrictionsCount: 0,
        attentionCallsCount: 0,
        hasBlock: false,
      };
      current.attentionCallsCount += 1;
      alertsMap.set(key, current);
    });

    return Array.from(alertsMap.values());
  }, [activeRestrictions, activeAttentionCalls]);

  // Indicadores de Evaluación Real A / N / C (PROMPT 9.2: Normalización mutuamente excluyente)
  const evalStats = useMemo(() => {
    const total = filteredSubmissions.length;
    let approved = 0;
    let notApproved = 0;
    let correctionRequired = 0;
    let pending = 0;

    for (const s of filteredSubmissions) {
      const norm = normalizeEvaluationStatus(s);
      if (norm === 'A') approved++;
      else if (norm === 'N') notApproved++;
      else if (norm === 'C') correctionRequired++;
      else pending++;
    }

    const evaluatedCount = approved + notApproved + correctionRequired;
    const approvalRate =
      evaluatedCount > 0 ? Math.round((approved / evaluatedCount) * 100) : 0;

    return {
      total,
      approved,
      notApproved,
      correctionRequired,
      pending,
      evaluatedCount,
      approvalRate,
    };
  }, [filteredSubmissions]);

  // Lista de entregas pendientes ordenadas por antigüedad (esperando evaluación formativa)
  const pendingSubmissions = useMemo(() => {
    return filteredSubmissions
      .filter((s) => normalizeEvaluationStatus(s) === 'PENDING')
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  }, [filteredSubmissions]);

  // Diccionario de actividades para enriquecer la visualización de entregas
  const activityMap = useMemo(() => {
    const map = new Map<string, EvidenceActivity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  // Cálculo de antigüedad de entrega en días
  const getDaysWaiting = (submittedAt?: string) => {
    if (!submittedAt) return 0;
    const submittedDate = new Date(submittedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - submittedDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Banner Institucional de Bienvenida con Acciones Rápidas */}
      <div className="bg-gradient-to-r from-[#00324D] via-[#003B5C] to-[#004A73] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xs border border-slate-700/50">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-[#39A900]/25 text-[#8CE665] border border-[#39A900]/40 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Instructor Bilingüe · Centro de Comercio y Servicios
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Panel de Control Académico SENA
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            Monitoreo en tiempo real de aprendices, escala oficial de evaluación (A / N / C),
            alertas pedagógicas tempranas y trazabilidad curricular directa en Cloud Firestore.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('submissions')}
              className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Calificar Evidencias ({evalStats.pending})</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Reportes de Evaluación</span>
            </button>
            <button
              onClick={() => onNavigate('calendar')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Calendario Académico</span>
            </button>
            <button
              onClick={onOpenCreateActivity}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#8CE665]" />
              <span>Nueva Actividad</span>
            </button>
            <button
              onClick={loadDashboardData}
              className="px-3 py-2 bg-black/20 hover:bg-black/30 text-slate-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
              title="Recargar datos de Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#39A900]' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Efecto visual de fondo */}
        <div className="absolute -right-12 -bottom-12 w-72 h-72 rounded-full bg-[#39A900]/10 blur-3xl pointer-events-none" />
      </div>

      {/* 2. Filtro Global de Ficha para el Dashboard */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#00324D] uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[#39A900]" />
          <span>Filtrar Dashboard por Ficha de Formación:</span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedFichaId}
            onChange={(e) => setSelectedFichaId(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-[#39A900] min-w-[240px]"
          >
            <option value="all">Todas mis fichas ({myFichas.length})</option>
            {myFichas.map((f) => (
              <option key={f.id} value={f.id}>
                Ficha #{f.number} — {f.programName || f.name}
              </option>
            ))}
          </select>

          {selectedFichaId !== 'all' && (
            <button
              onClick={() => setSelectedFichaId('all')}
              className="text-xs text-[#2E8500] hover:underline font-semibold cursor-pointer shrink-0"
            >
              Ver todo
            </button>
          )}
        </div>
      </div>

      {/* 3. Tarjetas Superiores de Resumen General (Prompt 9 - Sección 3.A) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Mis Fichas Activas"
          value={loading ? '...' : String(myFichas.length)}
          icon={Layers}
          hint={myFichas.length > 0 ? `${myFichas.length} grupos asignados` : 'Sin fichas registradas'}
          iconColor="text-[#00324D]"
          iconBg="bg-slate-100"
          onClick={() => onNavigate('fichas')}
        />
        <StatCard
          label="Total de Aprendices"
          value={loading ? '...' : String(filteredApprentices.length)}
          icon={Users}
          hint={
            filteredApprentices.length > 0
              ? 'Matrículas en /enrollments'
              : 'Sin aprendices matriculados'
          }
          iconColor="text-blue-700"
          iconBg="bg-blue-50"
          onClick={() => onNavigate('apprentices')}
        />
        <StatCard
          label="Total Actividades"
          value={loading ? '...' : String(filteredActivities.length)}
          icon={BookOpen}
          hint={
            filteredActivities.length > 0
              ? 'Actividades de evidencias'
              : 'Sin actividades creadas'
          }
          iconColor="text-indigo-700"
          iconBg="bg-indigo-50"
          onClick={() => onNavigate('activities')}
        />
        <StatCard
          label="Evidencias Pendientes"
          value={loading ? '...' : String(evalStats.pending)}
          icon={Clock}
          hint="Esperando evaluación A/N/C"
          iconColor="text-amber-700"
          iconBg="bg-amber-50"
          onClick={() => onNavigate('submissions')}
        />
      </div>

      {/* 4. Tarjetas de Evaluación y Alertas Tempranas (Drill-Down Interactivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="A · Evidencias Aprobadas"
          value={loading ? '...' : String(evalStats.approved)}
          icon={CheckCircle2}
          hint="Cumplen criterios de evaluación"
          iconColor="text-[#2E8500]"
          iconBg="bg-[#EBF8E7]"
          onClick={() => onNavigate('reports')}
        />
        <StatCard
          label="C · Por Corregir"
          value={loading ? '...' : String(evalStats.correctionRequired)}
          icon={RotateCcw}
          hint="Reenvíos formativos solicitados"
          iconColor="text-orange-700"
          iconBg="bg-orange-50"
          onClick={() => onNavigate('submissions')}
        />
        <StatCard
          label="N · No Aprobadas"
          value={loading ? '...' : String(evalStats.notApproved)}
          icon={AlertCircle}
          hint="Requieren plan de nivelación"
          iconColor="text-rose-700"
          iconBg="bg-rose-50"
          onClick={() => onNavigate('submissions')}
        />
        <StatCard
          label="Alertas / Restricciones"
          value={loading ? '...' : String(apprenticesWithAlerts.length)}
          icon={ShieldAlert}
          hint={
            apprenticesWithAlerts.length > 0
              ? `${apprenticesWithAlerts.length} aprendices con novedades`
              : 'Sin restricciones activas'
          }
          iconColor={apprenticesWithAlerts.length > 0 ? 'text-rose-700' : 'text-slate-500'}
          iconBg={apprenticesWithAlerts.length > 0 ? 'bg-rose-50' : 'bg-slate-100'}
          onClick={() => setAlertsModalOpen(true)}
        />
      </div>

      {/* 5. Indicadores de Seguimiento y Gestión (Sección 3.B) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* A. Tasa de Aprobación Real y Distribución A/N/C (7 columnas) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
                  Seguimiento Oficial
                </span>
                <h2 className="text-base font-bold text-[#00324D]">
                  Desempeño y Distribución de Calificaciones
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo basado en registros reales de la colección <code>/submissions</code>
              </p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-[#2E8500] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              Ver reporte
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Métrica destacada de Tasa de Aprobación */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-600 block">
                Tasa de Aprobación Real (Aprobadas / Total Evaluadas)
              </span>
              <div className="text-2xl font-black text-[#00324D] mt-0.5">
                {evalStats.evaluatedCount > 0 ? `${evalStats.approvalRate}%` : 'Sin evaluaciones'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {evalStats.evaluatedCount > 0
                  ? `${evalStats.approved} aprobadas de ${evalStats.evaluatedCount} evidencias evaluadas`
                  : 'Aún no se han emitido calificaciones A/N/C en este periodo'}
              </p>
            </div>

            <div className="w-full sm:w-48">
              <ProgressBar
                progress={evalStats.approvalRate}
                showLabel={false}
                size="md"
                color={
                  evalStats.approvalRate >= 70
                    ? 'bg-[#39A900]'
                    : evalStats.approvalRate >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }
              />
            </div>
          </div>

          {/* Desglose Gráfico de la Escala SENA */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Distribución Escala SENA (A / N / C)
            </h4>

            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#39A900]" />
                    A · Aprobado
                  </span>
                  <span className="font-bold text-[#2E8500]">
                    {evalStats.approved}{' '}
                    <span className="text-slate-400 font-normal">
                      (
                      {evalStats.total > 0
                        ? Math.round((evalStats.approved / evalStats.total) * 100)
                        : 0}
                      %)
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#39A900] transition-all duration-300"
                    style={{
                      width: `${
                        evalStats.total > 0
                          ? Math.round((evalStats.approved / evalStats.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    C · Por Corregir
                  </span>
                  <span className="font-bold text-amber-700">
                    {evalStats.correctionRequired}{' '}
                    <span className="text-slate-400 font-normal">
                      (
                      {evalStats.total > 0
                        ? Math.round((evalStats.correctionRequired / evalStats.total) * 100)
                        : 0}
                      %)
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{
                      width: `${
                        evalStats.total > 0
                          ? Math.round((evalStats.correctionRequired / evalStats.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    N · No Aprobado
                  </span>
                  <span className="font-bold text-rose-700">
                    {evalStats.notApproved}{' '}
                    <span className="text-slate-400 font-normal">
                      (
                      {evalStats.total > 0
                        ? Math.round((evalStats.notApproved / evalStats.total) * 100)
                        : 0}
                      %)
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{
                      width: `${
                        evalStats.total > 0
                          ? Math.round((evalStats.notApproved / evalStats.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    Pendiente de Evaluación
                  </span>
                  <span className="font-bold text-slate-700">
                    {evalStats.pending}{' '}
                    <span className="text-slate-400 font-normal">
                      (
                      {evalStats.total > 0
                        ? Math.round((evalStats.pending / evalStats.total) * 100)
                        : 0}
                      %)
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 transition-all duration-300"
                    style={{
                      width: `${
                        evalStats.total > 0
                          ? Math.round((evalStats.pending / evalStats.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* B. Alertas Académicas Tempranas (5 columnas) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Alertas Pedagógicas
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aprendices que requieren acompañamiento o tienen novedades
                </p>
              </div>
              <button
                onClick={() => onNavigate('tracking')}
                className="text-xs font-bold text-[#2E8500] hover:underline cursor-pointer"
              >
                Seguimiento
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#39A900] mb-2" />
                Consultando alertas en Firestore...
              </div>
            ) : apprenticesWithAlerts.length === 0 ? (
              <div className="py-8 text-center space-y-2 bg-[#EBF8E7]/40 rounded-xl border border-dashed border-[#39A900]/30 p-4">
                <CheckCircle2 className="w-8 h-8 text-[#39A900] mx-auto" />
                <h4 className="text-xs font-bold text-slate-800">
                  ¡Excelente! Sin alertas críticas activas
                </h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  No hay restricciones de entrega ni llamados de atención pendientes para el grupo
                  seleccionado.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {apprenticesWithAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.learnerId}
                    className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {alert.learnerName}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">Ficha #{alert.fichaId}</span>
                        {alert.hasBlock && (
                          <span className="bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                            Entrega Bloqueada
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <button
                        onClick={() => onNavigate('tracking')}
                        className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Gestionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => setAlertsModalOpen(true)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Ver todas las alertas ({apprenticesWithAlerts.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Sección de Entregas Pendientes de Calificar con Drill-Down Directo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
                Consola de Evaluación
              </span>
              <h2 className="text-base font-bold text-[#00324D]">
                Evidencias Pendientes de Calificar
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Entregas radicadas por aprendices esperando dictamen formativo A / N / C
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('submissions')}
              className="px-3.5 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
            >
              <span>Ir a Consola Completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#39A900] mb-2" />
            Cargando entregas pendientes desde Firestore...
          </div>
        ) : pendingSubmissions.length === 0 ? (
          <div className="py-10 text-center space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-[#39A900] mx-auto" />
            <h4 className="text-xs font-bold text-slate-700">¡Al día con las calificaciones!</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              No hay evidencias pendientes de revisión en la base de datos de Firestore.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="p-3 font-bold">Aprendiz</th>
                  <th className="p-3 font-bold">Ficha</th>
                  <th className="p-3 font-bold">Actividad / Evidencia</th>
                  <th className="p-3 font-bold">Fecha Entrega</th>
                  <th className="p-3 font-bold">Espera</th>
                  <th className="p-3 font-bold text-right">Acción Formativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingSubmissions.slice(0, 6).map((sub) => {
                  const act = activityMap.get(sub.activityId);
                  const daysWaiting = getDaysWaiting(sub.submittedAt);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{sub.learnerName || 'Aprendiz'}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {sub.learnerEmail || sub.userId}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {sub.fichaId ? sub.fichaId.replace('ficha_', '') : '—'}
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="font-semibold text-slate-800 line-clamp-1">
                          {act?.title || sub.activityId}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                          <span>{sub.fileName || sub.externalUrl || 'Evidencia digital'}</span>
                          {sub.driveUrl && (
                            <a
                              href={sub.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#39A900] hover:underline inline-flex items-center gap-0.5 shrink-0"
                            >
                              <HardDrive className="w-3 h-3" /> Drive
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {sub.submittedAt ? sub.submittedAt.split('T')[0] : 'Hoy'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            daysWaiting > 3
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {daysWaiting === 0 ? 'Hoy' : `${daysWaiting} d esperando`}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onNavigate('submissions')}
                          className="px-3 py-1 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-md text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Calificar A/N/C</span>
                          <ArrowRight className="w-3 h-3" />
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

      {/* 7. Mis Fichas de Formación Asignadas con Drill-Down */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#00324D]">Mis Fichas de Formación</h2>
              <span className="text-[10px] font-bold bg-[#EBF8E7] text-[#2E8500] px-1.5 py-0.5 rounded">
                Cloud Firestore
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Grupos académicos donde tu usuario figura en <code>instructorIds</code>
            </p>
          </div>
          <button
            onClick={() => onNavigate('fichas')}
            className="text-xs font-bold text-[#2E8500] hover:underline flex items-center gap-1 cursor-pointer"
          >
            Administrar Fichas ({myFichas.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-2 bg-white rounded-xl border border-slate-200">
            <RefreshCw className="w-5 h-5 animate-spin text-[#39A900] mx-auto" />
            <p className="text-xs text-slate-500">Cargando fichas desde Firestore...</p>
          </div>
        ) : myFichas.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <p className="text-xs text-slate-600">
              No tienes fichas asignadas a tu cuenta en Firestore actualmente.
            </p>
            <button
              onClick={onOpenCreateFicha}
              className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Crear o Asignar Ficha
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myFichas.slice(0, 6).map((ficha) => {
              const fichaApprenticesCount = apprentices.filter(
                (a) => a.fichaId === ficha.id || a.fichaNumber === ficha.number
              ).length;

              const fichaSubmissions = submissions.filter(
                (s) => s.fichaId === ficha.id || s.fichaId === ficha.number
              );
              const fichaPending = fichaSubmissions.filter(
                (s) =>
                  s.status === 'pending' ||
                  s.status === 'submitted' ||
                  s.status === 'under_review' ||
                  (!s.grade && s.status !== 'approved' && s.status !== 'not_approved')
              ).length;

              return (
                <div
                  key={ficha.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:border-[#39A900] transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#00324D] bg-slate-100 px-2 py-0.5 rounded font-mono">
                        Ficha #{ficha.number}
                      </span>
                      <StatusBadge status={ficha.status} size="sm" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                        {ficha.programName || ficha.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Centro: <span className="font-semibold text-slate-700">{ficha.centerName || 'Centro de Comercio y Servicios'}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center text-xs">
                      <div>
                        <div className="font-bold text-[#00324D]">{fichaApprenticesCount}</div>
                        <div className="text-[10px] text-slate-400">Aprendices</div>
                      </div>
                      <div>
                        <div className="font-bold text-amber-700">{fichaPending}</div>
                        <div className="text-[10px] text-slate-400">Pendientes</div>
                      </div>
                      <div>
                        <div className="font-bold text-[#2E8500]">
                          {ficha.academicStage || 'Lectiva'}
                        </div>
                        <div className="text-[10px] text-slate-400">Etapa</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedFichaId(ficha.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-[11px] text-slate-500 hover:text-[#00324D] font-semibold underline cursor-pointer"
                    >
                      Filtrar dashboard
                    </button>
                    <button
                      onClick={() => onNavigate('fichas')}
                      className="text-xs font-bold text-[#2E8500] hover:text-[#00324D] flex items-center gap-1 group cursor-pointer"
                    >
                      <span>Ver ficha</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. Modal Drill-Down de Aprendices con Alertas y Restricciones */}
      {alertsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#00324D]">
                    Aprendices con Alertas y Restricciones Activas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Datos reales de <code>/academicRestrictions</code> y <code>/attentionCalls</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAlertsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {apprenticesWithAlerts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-[#39A900] mx-auto mb-2" />
                  <p className="font-bold">No hay aprendices con alertas en este momento</p>
                  <p className="text-[11px] text-slate-400">
                    Todos los aprendices de tus fichas tienen su estado académico regular.
                  </p>
                </div>
              ) : (
                apprenticesWithAlerts.map((al) => (
                  <div
                    key={al.learnerId}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{al.learnerName}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Ficha: <span className="font-mono font-semibold">#{al.fichaId}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {al.restrictionsCount > 0 && (
                          <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {al.restrictionsCount} restricción(es) activa(s)
                          </span>
                        )}
                        {al.attentionCallsCount > 0 && (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {al.attentionCallsCount} llamado(s) de atención
                          </span>
                        )}
                        {al.hasBlock && (
                          <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-300">
                            Bloqueo de Evidencia Activo
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setAlertsModalOpen(false);
                          onNavigate('tracking');
                        }}
                        className="px-3 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Abrir Seguimiento
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setAlertsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
