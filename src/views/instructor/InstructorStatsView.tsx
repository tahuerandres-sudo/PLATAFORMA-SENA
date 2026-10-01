/**
 * @license
 * SENA Learning Hub - Vista de Estadísticas Pedagógicas (Instructor)
 * PROMPT 9: Estadísticas Calculadas con Datos Reales de Cloud Firestore (Sin Mock Data)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Award,
  RefreshCw,
  AlertCircle,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { fichaService } from '../../services/academic/fichaService';
import { submissionService } from '../../services/submissions/submissionService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { activityService } from '../../services/academic/activityService';
import { Ficha, AcademicSubmission, EvidenceActivity, ApprenticeWithEnrollment } from '../../types/academic';
import { normalizeEvaluationStatus, evaluateDeliveryCompliance } from '../../utils/evaluationUtils';

export const InstructorStatsView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';

  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [apprentices, setApprentices] = useState<ApprenticeWithEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!instructorUid) return;
      setLoading(true);
      try {
        const [fichasRes, subsRes, actsRes, appsRes] = await Promise.all([
          fichaService.getFichas(instructorUid),
          submissionService.getAllSubmissions(instructorUid),
          activityService.getActivities(),
          enrollmentService.getApprenticesWithEnrollment('all', instructorUid),
        ]);

        setFichas(fichasRes.data || []);
        setSubmissions(subsRes.data || []);
        setActivities(actsRes.data || []);
        setApprentices(appsRes.data || []);
      } catch (err) {
        console.warn('[InstructorStatsView] Error cargando estadísticas reales:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [instructorUid]);

  // Fichas del instructor
  const myFichas = useMemo(() => {
    return fichas.filter((f) => {
      if (!f.instructorIds || f.instructorIds.length === 0) return true;
      return f.instructorIds.includes(instructorUid);
    });
  }, [fichas, instructorUid]);

  const myFichaIds = useMemo(() => new Set(myFichas.map((f) => f.id)), [myFichas]);
  const myFichaNumbers = useMemo(() => new Set(myFichas.map((f) => f.number)), [myFichas]);

  // Entregas filtradas para las fichas del instructor
  const mySubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const subFicha = sub.fichaId || '';
      return (
        myFichaIds.has(subFicha) ||
        myFichaNumbers.has(subFicha) ||
        myFichas.some(
          (f) => subFicha.toLowerCase().includes(f.number.toLowerCase()) || f.id === subFicha
        )
      );
    });
  }, [submissions, myFichas, myFichaIds, myFichaNumbers]);

  // Cálculos estadísticos reales (PROMPT 9.2: Normalización y evaluación segura)
  const stats = useMemo(() => {
    const totalSubs = mySubmissions.length;
    let approved = 0;
    let notApproved = 0;
    let correction = 0;
    let pending = 0;

    for (const s of mySubmissions) {
      const norm = normalizeEvaluationStatus(s);
      if (norm === 'A') approved++;
      else if (norm === 'N') notApproved++;
      else if (norm === 'C') correction++;
      else pending++;
    }

    const evaluated = approved + notApproved + correction;
    const approvalRate = evaluated > 0 ? Math.round((approved / evaluated) * 100) : null;

    // Puntualidad de entregas usando evaluateDeliveryCompliance
    let onTimeCount = 0;
    const actMap = new Map(activities.map((a) => [a.id, a]));

    mySubmissions.forEach((sub) => {
      const act = actMap.get(sub.activityId);
      const compliance = evaluateDeliveryCompliance(sub.submittedAt, act?.dueDate);
      if (compliance.status === 'ENTREGADO_A_TIEMPO' || compliance.status === 'SIN_FECHA_LIMITE') {
        onTimeCount++;
      }
    });

    const onTimeRate = totalSubs > 0 ? Math.round((onTimeCount / totalSubs) * 100) : null;

    return {
      totalSubs,
      approved,
      notApproved,
      correction,
      pending,
      evaluated,
      approvalRate,
      onTimeRate,
      totalApprentices: apprentices.length,
    };
  }, [mySubmissions, activities, apprentices]);

  // Rendimiento real por cada ficha
  const fichasBreakdown = useMemo(() => {
    return myFichas.map((f) => {
      const fSubs = mySubmissions.filter(
        (s) => s.fichaId === f.id || s.fichaId === f.number
      );
      let approved = 0;
      let notApproved = 0;
      let correction = 0;

      for (const s of fSubs) {
        const norm = normalizeEvaluationStatus(s);
        if (norm === 'A') approved++;
        else if (norm === 'N') notApproved++;
        else if (norm === 'C') correction++;
      }

      const evaluated = approved + notApproved + correction;
      const rate = evaluated > 0 ? Math.round((approved / evaluated) * 100) : null;

      const fApprenticesCount = apprentices.filter(
        (a) => a.fichaId === f.id || a.fichaNumber === f.number
      ).length;

      return {
        id: f.id,
        number: f.number,
        programName: f.programName || f.name,
        apprenticesCount: fApprenticesCount,
        submissionsCount: fSubs.length,
        evaluatedCount: evaluated,
        approvedCount: approved,
        approvalRate: rate,
      };
    });
  }, [myFichas, mySubmissions, apprentices]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#00324D]">Estadísticas Pedagógicas Oficiales</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas reales de aprobación, retención y cumplimiento calculadas desde Cloud Firestore
          </p>
        </div>
      </div>

      {/* Tarjetas Principales de Métricas Reales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tasa de Aprobación"
          value={
            loading
              ? '...'
              : stats.approvalRate !== null
              ? `${stats.approvalRate}%`
              : 'Sin datos'
          }
          icon={CheckCircle2}
          hint={
            stats.approvalRate !== null
              ? `${stats.approved} aprobadas de ${stats.evaluated} evaluadas`
              : 'Sin evaluaciones registradas'
          }
          iconColor="text-[#2E8500]"
          iconBg="bg-[#EBF8E7]"
        />
        <StatCard
          label="Entregas a Tiempo"
          value={
            loading
              ? '...'
              : stats.onTimeRate !== null
              ? `${stats.onTimeRate}%`
              : 'Sin datos'
          }
          icon={Clock}
          hint={
            stats.onTimeRate !== null
              ? 'Puntualidad en radicación'
              : 'Sin entregas registradas'
          }
          iconColor="text-blue-700"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Aprendices Matriculados"
          value={loading ? '...' : String(stats.totalApprentices)}
          icon={Users}
          hint="En fichas asignadas (/enrollments)"
          iconColor="text-indigo-700"
          iconBg="bg-indigo-50"
        />
        <StatCard
          label="Total Evidencias Evaluadas"
          value={loading ? '...' : String(stats.evaluated)}
          icon={Award}
          hint={
            stats.pending > 0
              ? `${stats.pending} pendientes por calificar`
              : 'Al día con las calificaciones'
          }
          iconColor="text-amber-700"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Desglose de Rendimiento Real por Ficha */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#00324D]">
              Rendimiento Académico por Ficha Asignada
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cálculo en vivo de aprobación y avance por cada grupo de formación
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {myFichas.length} fichas activas
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#39A900] mb-2" />
            Calculando estadísticas desde Firestore...
          </div>
        ) : fichasBreakdown.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700">Sin fichas asignadas</h4>
            <p className="text-[11px] text-slate-500">
              No tienes fichas registradas para calcular estadísticas pedagógicas.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {fichasBreakdown.map((fb) => (
              <div key={fb.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-2">
                  <div className="font-bold text-slate-800">
                    Ficha #{fb.number} — <span className="text-slate-600 font-normal">{fb.programName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[11px]">
                      {fb.apprenticesCount} aprendices · {fb.submissionsCount} entregas
                    </span>
                    <span
                      className={`font-bold ${
                        fb.approvalRate !== null && fb.approvalRate >= 70
                          ? 'text-[#2E8500]'
                          : fb.approvalRate !== null
                          ? 'text-amber-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {fb.approvalRate !== null ? `${fb.approvalRate}% Aprobación` : 'Sin calificaciones'}
                    </span>
                  </div>
                </div>

                <ProgressBar
                  progress={fb.approvalRate || 0}
                  showLabel={false}
                  size="sm"
                  color={
                    fb.approvalRate && fb.approvalRate >= 70
                      ? 'bg-[#39A900]'
                      : fb.approvalRate && fb.approvalRate >= 50
                      ? 'bg-amber-500'
                      : 'bg-slate-300'
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
