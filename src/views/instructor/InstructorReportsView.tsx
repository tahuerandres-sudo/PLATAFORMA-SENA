/**
 * @license
 * SENA Learning Hub - Centro de Reportes Académicos y de Evaluación (Instructor)
 * PROMPT 9: Reportes Reales de Firestore con Filtros Multidimensionales,
 * Pestañas de Reportes Específicos, Matriz de Cumplimiento, Riesgo y Exportación CSV / Excel
 *
 * Colecciones Firestore Reales:
 * - /submissions
 * - /activities
 * - /fichas
 * - /trainingPrograms
 * - /trainingCenters
 * - /courses
 * - /competencies
 * - /learningOutcomes
 * - /enrollments
 * - /academicRestrictions
 * - /attentionCalls
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Filter,
  Download,
  Printer,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  Layers,
  Award,
  BookOpen,
  GraduationCap,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  Users,
  Target,
  FileCheck,
  AlertTriangle,
  ChevronDown,
  Building2,
  ArrowRight,
} from 'lucide-react';
import {
  AcademicSubmission,
  EvidenceActivity,
  Ficha,
  TrainingProgram,
  TrainingCenter,
  Course,
  Competency,
  LearningOutcome,
  ApprenticeWithEnrollment,
  AcademicRestriction,
  AttentionCall,
} from '../../types/academic';
import { submissionService } from '../../services/submissions/submissionService';
import { activityService } from '../../services/academic/activityService';
import { fichaService } from '../../services/academic/fichaService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { programService } from '../../services/academic/programService';
import { centerService } from '../../services/academic/centerService';
import { courseService } from '../../services/academic/courseService';
import { competencyService } from '../../services/academic/competencyService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { trackingService } from '../../services/academic/trackingService';
import { useAuth } from '../../hooks/useAuth';
import {
  normalizeEvaluationStatus,
  evaluateDeliveryCompliance,
} from '../../utils/evaluationUtils';

type ReportTab = 'evaluations' | 'competencies_summary' | 'risk_learners' | 'submissions_matrix';

export const InstructorReportsView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';

  // Pestaña de reporte activo
  const [activeTab, setActiveTab] = useState<ReportTab>('evaluations');

  // Datos base desde Firestore
  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [centers, setCenters] = useState<TrainingCenter[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [apprentices, setApprentices] = useState<ApprenticeWithEnrollment[]>([]);
  const [restrictions, setRestrictions] = useState<AcademicRestriction[]>([]);
  const [attentionCalls, setAttentionCalls] = useState<AttentionCall[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros Multidimensionales (Prompt 9)
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedFicha, setSelectedFicha] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedCompetency, setSelectedCompetency] = useState('all');
  const [selectedOutcome, setSelectedOutcome] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Carga de colecciones reales desde Firestore
  const loadData = async () => {
    if (!instructorUid) return;
    setLoading(true);
    try {
      const [
        subsRes,
        actsRes,
        fichasRes,
        progsRes,
        centersRes,
        coursesRes,
        compsRes,
        outsRes,
        appsRes,
        restrRes,
        callsRes,
      ] = await Promise.all([
        submissionService.getAllSubmissions(instructorUid),
        activityService.getActivities(),
        fichaService.getFichas(instructorUid),
        programService.getPrograms(),
        centerService.getCenters(),
        courseService.getCourses(),
        competencyService.getCompetencies(),
        learningOutcomeService.getLearningOutcomes(),
        enrollmentService.getApprenticesWithEnrollment('all', instructorUid),
        trackingService.getRestrictions(),
        trackingService.getAttentionCalls(),
      ]);

      setSubmissions(subsRes.data || []);
      setActivities(actsRes.data || []);
      setFichas(fichasRes.data || []);
      setPrograms(progsRes.data || []);
      setCenters(centersRes.data || []);
      setCourses(coursesRes.data || []);
      setCompetencies(compsRes.data || []);
      setLearningOutcomes(outsRes.data || []);
      setApprentices(appsRes.data || []);
      setRestrictions(restrRes.data || []);
      setAttentionCalls(callsRes.data || []);
    } catch (err) {
      console.warn('[InstructorReportsView] Error cargando datos de reporte:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instructorUid]);

  // Fichas asignadas al instructor
  const myFichas = useMemo(() => {
    return fichas.filter((f) => {
      if (!f.instructorIds || f.instructorIds.length === 0) return true;
      return f.instructorIds.includes(instructorUid);
    });
  }, [fichas, instructorUid]);

  const myFichaIds = useMemo(() => new Set(myFichas.map((f) => f.id)), [myFichas]);
  const myFichaNumbers = useMemo(() => new Set(myFichas.map((f) => f.number)), [myFichas]);

  // Diccionarios de correlación para lookup O(1)
  const activityMap = useMemo(() => {
    const map = new Map<string, EvidenceActivity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  const outcomeMap = useMemo(() => {
    const map = new Map<string, LearningOutcome>();
    learningOutcomes.forEach((o) => map.set(o.id, o));
    return map;
  }, [learningOutcomes]);

  const competencyMap = useMemo(() => {
    const map = new Map<string, Competency>();
    competencies.forEach((c) => map.set(c.id, c));
    return map;
  }, [competencies]);

  const fichaMap = useMemo(() => {
    const map = new Map<string, Ficha>();
    fichas.forEach((f) => {
      map.set(f.id, f);
      map.set(f.number, f);
    });
    return map;
  }, [fichas]);

  // 1. Filtrado para Reporte 1: Sábana Consolidada de Evaluación
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const subFicha = sub.fichaId || '';

      // Autorización: debe pertenecer a las fichas del instructor
      const isMyFicha =
        myFichaIds.has(subFicha) ||
        myFichaNumbers.has(subFicha) ||
        myFichas.some(
          (f) => subFicha.toLowerCase().includes(f.number.toLowerCase()) || f.id === subFicha
        );
      if (!isMyFicha && myFichas.length > 0) return false;

      // Filtro Ficha
      if (selectedFicha !== 'all') {
        const targetFicha = fichaMap.get(selectedFicha);
        const matchesFicha =
          subFicha === selectedFicha ||
          (targetFicha && (subFicha === targetFicha.number || subFicha.includes(targetFicha.number)));
        if (!matchesFicha) return false;
      }

      // Filtro Programa
      if (selectedProgram !== 'all' && sub.programId && sub.programId !== selectedProgram) {
        return false;
      }

      // Filtro Curso
      if (selectedCourse !== 'all' && sub.courseId && sub.courseId !== selectedCourse) {
        return false;
      }

      // Filtro Actividad
      if (selectedActivity !== 'all' && sub.activityId !== selectedActivity) {
        return false;
      }

      const act = activityMap.get(sub.activityId);

      // Filtro Competencia
      if (selectedCompetency !== 'all') {
        const actComp = act?.competencyId || sub.competencyId;
        if (actComp && actComp !== selectedCompetency) return false;
      }

      // Filtro RAP
      if (selectedOutcome !== 'all') {
        const actOut = act?.learningOutcomeId || sub.learningOutcomeId;
        if (actOut && actOut !== selectedOutcome) return false;
      }

      // Filtro Calificación A / N / C / Pendiente (PROMPT 9.2: Mutuamente excluyente)
      if (selectedGradeFilter !== 'all') {
        const norm = normalizeEvaluationStatus(sub);
        if (selectedGradeFilter === 'A' && norm !== 'A') return false;
        if (selectedGradeFilter === 'N' && norm !== 'N') return false;
        if (selectedGradeFilter === 'C' && norm !== 'C') return false;
        if (selectedGradeFilter === 'pending' && norm !== 'PENDING') return false;
      }

      // Rango de fechas
      if (startDate) {
        const subDate = sub.submittedAt ? sub.submittedAt.split('T')[0] : '';
        if (subDate < startDate) return false;
      }
      if (endDate) {
        const subDate = sub.submittedAt ? sub.submittedAt.split('T')[0] : '';
        if (subDate > endDate) return false;
      }

      return true;
    });
  }, [
    submissions,
    myFichas,
    myFichaIds,
    myFichaNumbers,
    selectedFicha,
    selectedProgram,
    selectedCourse,
    selectedActivity,
    selectedCompetency,
    selectedOutcome,
    selectedGradeFilter,
    startDate,
    endDate,
    activityMap,
    fichaMap,
  ]);

  // Estadísticas del consolidado de evaluación (PROMPT 9.2: Mutuamente excluyente)
  const evaluationStats = useMemo(() => {
    const total = filteredSubmissions.length;
    let approved = 0;
    let notApproved = 0;
    let correction = 0;
    let pending = 0;

    for (const r of filteredSubmissions) {
      const norm = normalizeEvaluationStatus(r);
      if (norm === 'A') approved++;
      else if (norm === 'N') notApproved++;
      else if (norm === 'C') correction++;
      else pending++;
    }

    const evaluatedCount = approved + notApproved + correction;
    const complianceRate = evaluatedCount > 0 ? Math.round((approved / evaluatedCount) * 100) : 0;

    return { total, approved, notApproved, correction, pending, complianceRate, evaluatedCount };
  }, [filteredSubmissions]);

  // 2. Reporte 2: Desempeño por Ficha y Competencia
  const competencyPerformanceReport = useMemo(() => {
    const rows: Array<{
      fichaId: string;
      fichaNumber: string;
      competencyId: string;
      competencyCode: string;
      competencyName: string;
      totalRequiredActivities: number;
      totalSubmissions: number;
      approvedCount: number;
      notApprovedCount: number;
      correctionCount: number;
      pendingCount: number;
      approvalRate: number;
    }> = [];

    const activeFichas =
      selectedFicha !== 'all'
        ? myFichas.filter((f) => f.id === selectedFicha || f.number === selectedFicha)
        : myFichas;

    activeFichas.forEach((f) => {
      const activeCompetencies =
        selectedCompetency !== 'all'
          ? competencies.filter((c) => c.id === selectedCompetency)
          : competencies;

      activeCompetencies.forEach((comp) => {
        // Actividades vinculadas a esta ficha y competencia
        const relatedActs = activities.filter((a) => {
          const matchesFicha = a.fichaId === f.id || a.fichaId === f.number;
          const matchesComp = a.competencyId === comp.id;
          return matchesFicha && matchesComp;
        });

        // Entregas de estas actividades
        const relatedActIds = new Set(relatedActs.map((a) => a.id));
        const relatedSubs = submissions.filter((s) => relatedActIds.has(s.activityId));

        let approved = 0;
        let notApproved = 0;
        let correction = 0;
        let pending = 0;

        for (const s of relatedSubs) {
          const norm = normalizeEvaluationStatus(s);
          if (norm === 'A') approved++;
          else if (norm === 'N') notApproved++;
          else if (norm === 'C') correction++;
          else pending++;
        }

        const evaluated = approved + notApproved + correction;
        const approvalRate = evaluated > 0 ? Math.round((approved / evaluated) * 100) : 0;

        if (relatedActs.length > 0 || relatedSubs.length > 0) {
          rows.push({
            fichaId: f.id,
            fichaNumber: f.number,
            competencyId: comp.id,
            competencyCode: comp.code || 'COMP-SENA',
            competencyName: comp.description || comp.name || 'Competencia',
            totalRequiredActivities: relatedActs.length,
            totalSubmissions: relatedSubs.length,
            approvedCount: approved,
            notApprovedCount: notApproved,
            correctionCount: correction,
            pendingCount: pending,
            approvalRate,
          });
        }
      });
    });

    return rows;
  }, [myFichas, selectedFicha, selectedCompetency, competencies, activities, submissions]);

  // 3. Reporte 3: Aprendices en Riesgo y Alertas Académicas
  const riskLearnersReport = useMemo(() => {
    const list: Array<{
      learnerId: string;
      learnerName: string;
      learnerDocument: string;
      learnerEmail: string;
      fichaNumber: string;
      programName: string;
      activeRestrictionsCount: number;
      hasSubmissionBlock: boolean;
      attentionCallsCount: number;
      reprovedSubmissionsCount: number;
      correctionsCount: number;
      riskLevel: 'ALTO' | 'MEDIO' | 'MODERADO';
      reason: string;
    }> = [];

    const activeFichas =
      selectedFicha !== 'all'
        ? myFichas.filter((f) => f.id === selectedFicha || f.number === selectedFicha)
        : myFichas;
    const allowedFichaIds = new Set(activeFichas.map((f) => f.id));
    const allowedFichaNumbers = new Set(activeFichas.map((f) => f.number));

    const targetApprentices = apprentices.filter((a) => {
      const fId = a.fichaId || '';
      const fNum = a.fichaNumber || '';
      return (
        (fId && allowedFichaIds.has(fId)) ||
        (fNum && allowedFichaNumbers.has(fNum)) ||
        (fId && allowedFichaNumbers.has(fId))
      );
    });

    targetApprentices.forEach((app) => {
      const uid = app.uid || app.id || '';

      // Restricciones activas
      const userRestrictions = restrictions.filter((r) => {
        const isMatch = r.userId === uid || r.learnerId === uid;
        const isActive = r.status === 'ACTIVA' || r.status === 'active';
        return isMatch && isActive;
      });

      const hasBlock = userRestrictions.some(
        (r) =>
          r.type === 'BLOQUEO_ENTREGA_EVIDENCIA' ||
          r.type === 'evidence_submission' ||
          r.type === 'CONDICIONAMIENTO_MATRICULA'
      );

      // Llamados de atención activos
      const userCalls = attentionCalls.filter((c) => {
        const isMatch = c.userId === uid || c.learnerId === uid;
        const isPending =
          c.status === 'NOTIFICADO' ||
          c.status === 'PENDIENTE' ||
          c.status === 'EN_REVISION';
        return isMatch && isPending;
      });

      // Evidencias reprobadas (N) o por corregir (C) (PROMPT 9.2: Normalización mutuamente excluyente)
      const userSubs = submissions.filter((s) => s.userId === uid || s.learnerId === uid);
      const reprovedCount = userSubs.filter((s) => normalizeEvaluationStatus(s) === 'N').length;
      const correctionsCount = userSubs.filter((s) => normalizeEvaluationStatus(s) === 'C').length;

      // Si tiene alguna novedad de riesgo
      if (
        userRestrictions.length > 0 ||
        userCalls.length > 0 ||
        reprovedCount > 0 ||
        correctionsCount > 1
      ) {
        let riskLevel: 'ALTO' | 'MEDIO' | 'MODERADO' = 'MODERADO';
        let reason = '';

        if (hasBlock || reprovedCount >= 2 || userCalls.length >= 2) {
          riskLevel = 'ALTO';
          reason = hasBlock
            ? 'Bloqueo activo para entrega de evidencias'
            : 'Múltiples evidencias no aprobadas (N) o llamados reiterados';
        } else if (userRestrictions.length > 0 || userCalls.length > 0 || reprovedCount > 0) {
          riskLevel = 'MEDIO';
          reason = userCalls.length > 0
            ? 'Llamado de atención por inasistencia o tardanza'
            : 'Evidencia no aprobada pendiente de plan de mejoramiento';
        } else {
          riskLevel = 'MODERADO';
          reason = 'Múltiples correcciones solicitadas en evidencias';
        }

        list.push({
          learnerId: uid,
          learnerName: app.displayName || 'Aprendiz SENA',
          learnerDocument: app.documentNumber || 'No registrado',
          learnerEmail: app.email || 'No registrado',
          fichaNumber: app.fichaNumber || app.fichaId || '—',
          programName: app.programName || 'Programa de Formación',
          activeRestrictionsCount: userRestrictions.length,
          hasSubmissionBlock: hasBlock,
          attentionCallsCount: userCalls.length,
          reprovedSubmissionsCount: reprovedCount,
          correctionsCount,
          riskLevel,
          reason,
        });
      }
    });

    return list.sort((a, b) => (a.riskLevel === 'ALTO' ? -1 : b.riskLevel === 'ALTO' ? 1 : 0));
  }, [myFichas, selectedFicha, apprentices, restrictions, attentionCalls, submissions]);

  // 4. Reporte 4: Matriz de Cumplimiento de Entregas por Actividad (PROMPT 9.2: Evaluación de Fechas Segura)
  const submissionsMatrix = useMemo(() => {
    // Si no hay actividad seleccionada o 'all', tomar la primera de la lista
    const targetActivity =
      selectedActivity !== 'all'
        ? activities.find((a) => a.id === selectedActivity)
        : activities[0];

    if (!targetActivity) return { activity: null, rows: [] };

    // Ficha vinculada a la actividad
    const targetFicha = fichas.find(
      (f) => f.id === targetActivity.fichaId || f.number === targetActivity.fichaId
    );

    // Aprendices de esa ficha
    const learners = apprentices.filter((app) => {
      if (!targetFicha) return true;
      return (
        app.fichaId === targetFicha.id ||
        app.fichaNumber === targetFicha.number ||
        app.fichaId === targetFicha.number
      );
    });

    const rows = learners.map((learner) => {
      const sub = submissions.find(
        (s) =>
          s.activityId === targetActivity.id &&
          (s.userId === learner.uid || s.learnerId === learner.uid)
      );

      let deliveryStatus:
        | 'ENTREGADO_A_TIEMPO'
        | 'ENTREGADO_TARDIO'
        | 'NO_ENTREGADO'
        | 'SIN_FECHA_LIMITE' = 'NO_ENTREGADO';
      let deliveryLabel = 'Sin entregar';

      if (sub) {
        const compliance = evaluateDeliveryCompliance(sub.submittedAt, targetActivity.dueDate);
        deliveryStatus = compliance.status;
        deliveryLabel = compliance.label;
      }

      const normGrade = sub ? normalizeEvaluationStatus(sub) : null;

      return {
        learnerId: learner.uid || learner.id,
        learnerName: learner.displayName || 'Aprendiz SENA',
        learnerDocument: learner.documentNumber || 'No registrado',
        deliveryStatus,
        deliveryLabel,
        submission: sub || null,
        grade: normGrade === 'A' ? 'A' : normGrade === 'N' ? 'N' : normGrade === 'C' ? 'C' : null,
        feedback: sub?.feedback || '',
      };
    });

    return { activity: targetActivity, rows };
  }, [selectedActivity, activities, fichas, apprentices, submissions]);

  // Exportación a archivo CSV con codificación UTF-8 BOM
  const handleExportCsv = () => {
    const nowStr = new Date().toISOString().slice(0, 10);

    if (activeTab === 'evaluations') {
      if (filteredSubmissions.length === 0) return;
      const headers = [
        'Aprendiz',
        'Documento/ID',
        'Correo',
        'Ficha',
        'Actividad',
        'Evidencia',
        'Resultado SENA (A/N/C)',
        'Retroalimentación',
        'Instructor Evaluador',
        'Fecha Entrega',
        'Fecha Calificación',
      ];
      const rows = filteredSubmissions.map((r) => {
        const act = activityMap.get(r.activityId);
        const norm = normalizeEvaluationStatus(r);
        const gradeStr =
          norm === 'A'
            ? 'A - APROBADO'
            : norm === 'N'
            ? 'N - NO APROBADO'
            : norm === 'C'
            ? 'C - POR CORREGIR'
            : 'PENDIENTE DE EVALUACIÓN';

        return [
          `"${r.learnerName || 'Aprendiz'}"`,
          `"${r.userId || r.learnerId || ''}"`,
          `"${r.learnerEmail || ''}"`,
          `"${r.fichaId || ''}"`,
          `"${act?.title || r.activityId}"`,
          `"${r.fileName || r.externalUrl || 'Evidencia'}"`,
          `"${gradeStr}"`,
          `"${(r.feedback || '').replace(/"/g, '""')}"`,
          `"${r.gradedBy || ''}"`,
          `"${r.submittedAt || ''}"`,
          `"${r.gradedAt || ''}"`,
        ].join(',');
      });

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
      triggerDownload(csvContent, `Sabana_Evaluacion_SENA_${nowStr}.csv`);
    } else if (activeTab === 'competencies_summary') {
      if (competencyPerformanceReport.length === 0) return;
      const headers = [
        'Ficha',
        'Código Competencia',
        'Descripción Competencia',
        'Actividades Requeridas',
        'Entregas Recibidas',
        'Aprobadas (A)',
        'Por Corregir (C)',
        'No Aprobadas (N)',
        'Pendientes',
        '% Tasa Aprobación',
      ];
      const rows = competencyPerformanceReport.map((r) => [
        `"Ficha ${r.fichaNumber}"`,
        `"${r.competencyCode}"`,
        `"${r.competencyName.replace(/"/g, '""')}"`,
        r.totalRequiredActivities,
        r.totalSubmissions,
        r.approvedCount,
        r.correctionCount,
        r.notApprovedCount,
        r.pendingCount,
        `"${r.approvalRate}%"`,
      ].join(','));

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
      triggerDownload(csvContent, `Desempeno_Competencias_SENA_${nowStr}.csv`);
    } else if (activeTab === 'risk_learners') {
      if (riskLearnersReport.length === 0) return;
      const headers = [
        'Aprendiz',
        'Documento',
        'Correo',
        'Ficha',
        'Programa',
        'Clasificación Interna de Seguimiento',
        'Motivo / Alerta',
        'Restricciones Activas',
        'Bloqueo Evidencias',
        'Llamados de Atención',
        'Evidencias Reprobadas (N)',
      ];
      const rows = riskLearnersReport.map((r) => [
        `"${r.learnerName}"`,
        `"${r.learnerDocument}"`,
        `"${r.learnerEmail}"`,
        `"${r.fichaNumber}"`,
        `"${r.programName}"`,
        `"${r.riskLevel}"`,
        `"${r.reason.replace(/"/g, '""')}"`,
        r.activeRestrictionsCount,
        r.hasSubmissionBlock ? 'SÍ' : 'NO',
        r.attentionCallsCount,
        r.reprovedSubmissionsCount,
      ].join(','));

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
      triggerDownload(csvContent, `Seguimiento_Alertas_Aprendices_${nowStr}.csv`);
    } else if (activeTab === 'submissions_matrix') {
      if (submissionsMatrix.rows.length === 0) return;
      const headers = [
        'Aprendiz',
        'Documento',
        'Actividad',
        'Estado de Entrega',
        'Calificación SENA',
        'Fecha Radicación',
        'Retroalimentación',
      ];
      const rows = submissionsMatrix.rows.map((r) => [
        `"${r.learnerName}"`,
        `"${r.learnerDocument}"`,
        `"${submissionsMatrix.activity?.title || 'Actividad'}"`,
        `"${r.deliveryLabel}"`,
        `"${r.grade || 'PENDIENTE'}"`,
        `"${r.submission?.submittedAt || 'SIN RADICAR'}"`,
        `"${(r.feedback || '').replace(/"/g, '""')}"`,
      ].join(','));

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
      triggerDownload(csvContent, `Matriz_Cumplimiento_${nowStr}.csv`);
    }
  };

  const triggerDownload = (csvContent: string, fileName: string) => {
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const resetFilters = () => {
    setSelectedProgram('all');
    setSelectedFicha('all');
    setSelectedCourse('all');
    setSelectedCompetency('all');
    setSelectedOutcome('all');
    setSelectedActivity('all');
    setSelectedGradeFilter('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado Oficial Institucional SENA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Reportes Oficiales SENA
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Centro de Comercio y Servicios · Regional Tolima
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#00324D] mt-1">
            Centro de Reportes y Trazabilidad Pedagógica
          </h1>
          <p className="text-xs text-slate-500">
            Consultas multidimensionales con datos reales de Firestore y escala oficial A / N / C
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#00324D] rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#39A900]" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#8CE665]" />
            <span>Exportar CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Selector de Pestañas de Reporte */}
      <div className="flex border-b border-slate-200 text-xs font-bold print:hidden overflow-x-auto">
        <button
          onClick={() => setActiveTab('evaluations')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'evaluations'
              ? 'border-[#39A900] text-[#00324D] bg-[#EBF8E7]/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-[#39A900]" />
          <span>Sábana Consolidada A / N / C ({filteredSubmissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('competencies_summary')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'competencies_summary'
              ? 'border-[#39A900] text-[#00324D] bg-[#EBF8E7]/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target className="w-4 h-4 text-blue-600" />
          <span>Desempeño por Ficha y Competencia</span>
        </button>

        <button
          onClick={() => setActiveTab('risk_learners')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'risk_learners'
              ? 'border-[#39A900] text-[#00324D] bg-[#EBF8E7]/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>Aprendices en Riesgo ({riskLearnersReport.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions_matrix')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'submissions_matrix'
              ? 'border-[#39A900] text-[#00324D] bg-[#EBF8E7]/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4 text-indigo-600" />
          <span>Matriz de Cumplimiento por Actividad</span>
        </button>
      </div>

      {/* 3. Panel de Filtros Multidimensionales (Prompt 9 - Sección 3.D) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#39A900]" />
            Criterios de Filtrado Multidimensional
          </h3>
          <button
            onClick={resetFilters}
            className="text-xs text-[#2E8500] hover:underline font-semibold cursor-pointer"
          >
            Restablecer todos los filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* Ficha */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Ficha de Formación:</label>
            <select
              value={selectedFicha}
              onChange={(e) => setSelectedFicha(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#39A900]"
            >
              <option value="all">Todas mis fichas ({myFichas.length})</option>
              {myFichas.map((f) => (
                <option key={f.id} value={f.id}>
                  Ficha #{f.number} — {f.programName || f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Programa de Formación */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Programa de Formación:</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#39A900]"
            >
              <option value="all">Todos los programas</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Curso */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Curso / Asignatura:</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#39A900]"
            >
              <option value="all">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Competencia */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Competencia:</label>
            <select
              value={selectedCompetency}
              onChange={(e) => setSelectedCompetency(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#39A900]"
            >
              <option value="all">Todas las competencias</option>
              {competencies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.code} - {comp.description.slice(0, 35)}...
                </option>
              ))}
            </select>
          </div>

          {/* RAP */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Resultado de Aprendizaje (RAP):</label>
            <select
              value={selectedOutcome}
              onChange={(e) => setSelectedOutcome(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#39A900]"
            >
              <option value="all">Todos los resultados</option>
              {learningOutcomes.map((out) => (
                <option key={out.id} value={out.id}>
                  {out.code} - {out.description.slice(0, 35)}...
                </option>
              ))}
            </select>
          </div>

          {/* Actividad */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Actividad de Evidencia:</label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#39A900]"
            >
              <option value="all">Todas las actividades</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          {/* Calificación / Estado */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Dictamen A / N / C:</label>
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#39A900]"
            >
              <option value="all">Todos los resultados</option>
              <option value="A">A · Aprobado</option>
              <option value="C">C · Por Corregir</option>
              <option value="N">N · No Aprobado</option>
              <option value="pending">Pendientes de Calificar</option>
            </select>
          </div>

          {/* Rango de Fechas */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#39A900]"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#39A900]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tarjetas de Resumen Numérico (Para la pestaña de evaluaciones) */}
      {activeTab === 'evaluations' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Registros</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {evaluationStats.total}
            </div>
          </div>

          <div className="p-3 bg-[#EBF8E7] rounded-xl border border-[#39A900]/30 shadow-2xs">
            <div className="flex items-center justify-between text-[#2E8500]">
              <span className="text-[11px] font-bold">A · Aprobadas</span>
              <CheckCircle2 className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-xl font-black text-[#2E8500] mt-0.5">
              {evaluationStats.approved}
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[11px] font-bold">C · Por Corregir</span>
              <RotateCcw className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-xl font-black text-amber-800 mt-0.5">
              {evaluationStats.correction}
            </div>
          </div>

          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 shadow-2xs">
            <div className="flex items-center justify-between text-rose-800">
              <span className="text-[11px] font-bold">N · No Aprobadas</span>
              <AlertCircle className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-xl font-black text-rose-800 mt-0.5">
              {evaluationStats.notApproved}
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-blue-900 block">% Cumplimiento</span>
            <div className="text-xl font-black text-blue-900 mt-0.5">
              {evaluationStats.complianceRate}%
            </div>
          </div>
        </div>
      )}

      {/* 5. Contenido Dinámico según la Pestaña Activa */}

      {/* PESTAÑA 1: SÁBANA CONSOLIDADA DE EVALUACIÓN */}
      {activeTab === 'evaluations' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#39A900]" />
              <h3 className="text-xs font-bold text-[#00324D] uppercase tracking-wider">
                Sábana Consolidada de Evaluación ({filteredSubmissions.length} registros reales)
              </h3>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#39A900] mb-2" />
              Consultando entregas en Cloud Firestore...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700">Sin datos disponibles</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                No hay evidencias registradas en Firestore que coincidan con la combinación de filtros seleccionada.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#00324D] text-white">
                    <th className="p-3 font-bold">Aprendiz</th>
                    <th className="p-3 font-bold">Ficha</th>
                    <th className="p-3 font-bold">Actividad</th>
                    <th className="p-3 font-bold">Evidencia</th>
                    <th className="p-3 font-bold text-center">Resultado</th>
                    <th className="p-3 font-bold">Retroalimentación Formativa</th>
                    <th className="p-3 font-bold">Instructor</th>
                    <th className="p-3 font-bold">Fecha Entrega</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSubmissions.map((row) => {
                    const act = activityMap.get(row.activityId);
                    const isApproved = row.status === 'approved' || row.grade === 'A';
                    const isNotApproved = row.status === 'not_approved' || row.grade === 'N';
                    const isCorrection = row.status === 'correction_required' || row.grade === 'C';
                    const isPending = !isApproved && !isNotApproved && !isCorrection;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{row.learnerName || 'Aprendiz'}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {row.learnerEmail || row.userId}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {row.fichaId ? row.fichaId.replace('ficha_', '') : '—'}
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="font-semibold text-slate-800 line-clamp-1">
                            {act?.title || row.activityId}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {act?.submissionType || row.submissionType}
                          </div>
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="font-mono text-[11px] text-slate-700 truncate">
                            {row.fileName || row.externalUrl || 'Evidencia'}
                          </div>
                          {row.driveUrl && (
                            <a
                              href={row.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#39A900] hover:underline text-[10px] font-semibold flex items-center gap-1 mt-0.5"
                            >
                              <HardDrive className="w-3 h-3" /> Drive
                            </a>
                          )}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {isApproved && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30">
                              A · APROBADO
                            </span>
                          )}
                          {isNotApproved && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                              N · NO APROBADO
                            </span>
                          )}
                          {isCorrection && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              C · CORREGIR
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              PENDIENTE
                            </span>
                          )}
                        </td>
                        <td className="p-3 max-w-xs">
                          {row.feedback ? (
                            <div className="text-xs text-slate-700 italic line-clamp-2">
                              "{row.feedback}"
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin comentarios</span>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 whitespace-nowrap">
                          {row.gradedBy || '—'}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {row.submittedAt ? row.submittedAt.split('T')[0] : '—'}
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

      {/* PESTAÑA 2: REPORTE DE DESEMPEÑO POR FICHA Y COMPETENCIA */}
      {activeTab === 'competencies_summary' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-[#00324D] uppercase tracking-wider">
                Desempeño Curricular Agrupado por Ficha y Competencia
              </h3>
            </div>
          </div>

          {competencyPerformanceReport.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700">Sin datos de competencias</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                No se encontraron actividades vinculadas a las competencias para las fichas seleccionadas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#00324D] text-white">
                    <th className="p-3 font-bold">Ficha</th>
                    <th className="p-3 font-bold">Código</th>
                    <th className="p-3 font-bold">Competencia</th>
                    <th className="p-3 font-bold text-center">Actividades</th>
                    <th className="p-3 font-bold text-center">Entregas</th>
                    <th className="p-3 font-bold text-center">Aprobadas (A)</th>
                    <th className="p-3 font-bold text-center">Por Corregir (C)</th>
                    <th className="p-3 font-bold text-center">No Aprobadas (N)</th>
                    <th className="p-3 font-bold text-center">% Aprobación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {competencyPerformanceReport.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        #{row.fichaNumber}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {row.competencyCode}
                      </td>
                      <td className="p-3 max-w-sm font-medium text-slate-800">
                        {row.competencyName}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">
                        {row.totalRequiredActivities}
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-700">
                        {row.totalSubmissions}
                      </td>
                      <td className="p-3 text-center font-bold text-[#2E8500]">
                        {row.approvedCount}
                      </td>
                      <td className="p-3 text-center font-bold text-amber-700">
                        {row.correctionCount}
                      </td>
                      <td className="p-3 text-center font-bold text-rose-700">
                        {row.notApprovedCount}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            row.approvalRate >= 70
                              ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30'
                              : row.approvalRate >= 50
                              ? 'bg-amber-50 text-amber-800 border border-amber-300'
                              : 'bg-rose-50 text-rose-700 border border-rose-300'
                          }`}
                        >
                          {row.approvalRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: APRENDICES EN RIESGO Y ALERTAS ACADÉMICAS */}
      {activeTab === 'risk_learners' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-[#00324D] uppercase tracking-wider">
                Matriz de Aprendices con Alertas Pedagógicas ({riskLearnersReport.length} aprendices)
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded self-start sm:self-center">
              Clasificación interna de seguimiento académico
            </span>
          </div>

          {riskLearnersReport.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-[#EBF8E7]/30">
              <CheckCircle2 className="w-8 h-8 text-[#39A900] mx-auto" />
              <h4 className="text-xs font-bold text-slate-800">¡Sin aprendices en alerta!</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                No se detectaron aprendices con novedades académicas de seguimiento en los grupos seleccionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#00324D] text-white">
                    <th className="p-3 font-bold">Aprendiz</th>
                    <th className="p-3 font-bold">Ficha</th>
                    <th className="p-3 font-bold text-center">Nivel Interno de Seguimiento</th>
                    <th className="p-3 font-bold">Motivo / Novedad</th>
                    <th className="p-3 font-bold text-center">Restricciones</th>
                    <th className="p-3 font-bold text-center">Llamados</th>
                    <th className="p-3 font-bold text-center">No Aprobadas (N)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {riskLearnersReport.map((row) => (
                    <tr key={row.learnerId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{row.learnerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Doc: {row.learnerDocument}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-700 font-semibold">
                        #{row.fichaNumber}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.riskLevel === 'ALTO'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : row.riskLevel === 'MEDIO'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {row.riskLevel}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="font-medium text-slate-800">{row.reason}</div>
                        {row.hasSubmissionBlock && (
                          <div className="text-[10px] font-bold text-rose-700 mt-0.5">
                            • Bloqueo activo para entrega de evidencias
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">
                        {row.activeRestrictionsCount}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">
                        {row.attentionCallsCount}
                      </td>
                      <td className="p-3 text-center font-bold text-rose-700">
                        {row.reprovedSubmissionsCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: MATRIZ DE CUMPLIMIENTO DE ENTREGAS POR ACTIVIDAD */}
      {activeTab === 'submissions_matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-[#00324D] uppercase tracking-wider">
                  Matriz Individual de Entrega por Actividad
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Actividad evaluada:{' '}
                <span className="font-bold text-slate-800">
                  {submissionsMatrix.activity?.title || 'Selecciona una actividad en el filtro'}
                </span>
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-600">
              Total aprendices: <span className="font-bold">{submissionsMatrix.rows.length}</span>
            </div>
          </div>

          {submissionsMatrix.rows.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700">Sin aprendices registrados</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                No se encontraron aprendices matriculados para la ficha asignada a esta actividad.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#00324D] text-white">
                    <th className="p-3 font-bold">Aprendiz</th>
                    <th className="p-3 font-bold">Documento</th>
                    <th className="p-3 font-bold text-center">Estado de Entrega</th>
                    <th className="p-3 font-bold text-center">Dictamen SENA</th>
                    <th className="p-3 font-bold">Fecha de Radicación</th>
                    <th className="p-3 font-bold">Retroalimentación Formativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {submissionsMatrix.rows.map((row) => (
                    <tr key={row.learnerId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{row.learnerName}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        {row.learnerDocument}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {row.deliveryStatus === 'ENTREGADO_A_TIEMPO' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30">
                            A tiempo
                          </span>
                        )}
                        {row.deliveryStatus === 'ENTREGADO_TARDIO' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            Fuera de plazo
                          </span>
                        )}
                        {row.deliveryStatus === 'NO_ENTREGADO' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Sin entregar
                          </span>
                        )}
                        {row.deliveryStatus === 'SIN_FECHA_LIMITE' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Sin fecha límite
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {row.grade === 'A' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF8E7] text-[#2E8500]">
                            A · Aprobado
                          </span>
                        ) : row.grade === 'N' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                            N · No Aprobado
                          </span>
                        ) : row.grade === 'C' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800">
                            C · Por Corregir
                          </span>
                        ) : row.submission ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Pendiente
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {row.submission?.submittedAt
                          ? row.submission.submittedAt.split('T')[0]
                          : 'No registrada'}
                      </td>
                      <td className="p-3 max-w-xs">
                        {row.feedback ? (
                          <div className="text-xs text-slate-700 italic line-clamp-1">
                            "{row.feedback}"
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Sin dictamen</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
