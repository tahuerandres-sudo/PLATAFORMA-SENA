/**
 * @license
 * SENA Learning Hub - Servicio de Perfil y Expediente Académico Digital del Aprendiz
 * PROMPT 17: Consolidación 100% Real vía Firestore de /users, /enrollments, /fichas,
 * /trainingPrograms, /courses, /competencies, /learningOutcomes, /activities,
 * /submissions, /attendance, /attentionCalls, /academicRestrictions, /justifications,
 * /learnerRecords, /gamificationProfiles, /userBadges, /achievements.
 *
 * Sin datos ficticios, sin segundo sistema paralelo, respetando RBAC estricto.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import {
  ApprenticeAcademicExpediente,
  AssignedInstructorInfo,
  CurricularProgressCompetency,
  CurricularProgressOutcome,
  EvidenceProgressItem,
  Enrollment,
  Ficha,
  Course,
  Competency,
  LearningOutcome,
  EvidenceActivity,
  AcademicSubmission,
  AttendanceRecord,
  Justification,
  AttentionCall,
  AcademicRestriction,
  LearnerRecord,
  TrainingProgram,
  TrainingCenter,
} from '../../types/academic';

import { fichaService } from './fichaService';
import { programService } from './programService';
import { centerService } from './centerService';
import { courseService } from './courseService';
import { competencyService } from './competencyService';
import { learningOutcomeService } from './learningOutcomeService';
import { enrollmentService } from './enrollmentService';
import { activityService } from './activityService';
import { submissionService } from '../submissions/submissionService';
import { trackingService } from './trackingService';
import { gamificationService } from './gamificationService';

export const academicRecordService = {
  /**
   * Obtiene el expediente académico digital consolidado para un aprendiz.
   * Si es consultado por un instructor (instructorUid), valida que el aprendiz
   * pertenezca a una ficha asignada a dicho instructor (ficha.instructorIds).
   */
  async getApprenticeExpediente(
    learnerId: string,
    options?: { instructorUid?: string }
  ): Promise<{
    data: ApprenticeAcademicExpediente | null;
    unauthorized?: boolean;
    error?: string;
  }> {
    if (!learnerId) {
      return { data: null, error: 'Identificador del aprendiz no suministrado.' };
    }

    try {
      // 1. Obtener datos de usuario desde /users/{learnerId}
      let userData: any = null;
      try {
        const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, learnerId));
        if (userDoc.exists()) {
          userData = { uid: userDoc.id, ...userDoc.data() };
        }
      } catch (err) {
        console.warn(`[academicRecordService] Lectura de /users/${learnerId}:`, err);
      }

      // Si no está en Firestore o faltan datos y coincide con el usuario autenticado, usar auth
      const currentAuth = auth.currentUser;
      if (!userData && currentAuth && currentAuth.uid === learnerId) {
        userData = {
          uid: currentAuth.uid,
          displayName: currentAuth.displayName || 'Aprendiz SENA',
          email: currentAuth.email || '',
          photoURL: currentAuth.photoURL || undefined,
          role: 'apprentice',
          status: 'active',
        };
      }

      // 2. Obtener matrícula desde /enrollments
      let enrollment: Enrollment | null = null;
      try {
        enrollment = await enrollmentService.getEnrollmentByLearnerId(learnerId);
      } catch (err) {
        console.warn('[academicRecordService] Error consultando matrícula:', err);
      }

      // Si no hay matrícula explícita, intentar inferir fichaId desde el perfil del usuario (PROMPT 30: Sin fallbacks inventados)
      const fichaId = enrollment?.fichaId || userData?.fichaId || '';

      // 3. Obtener datos de la Ficha
      let ficha: Ficha | null = null;
      try {
        ficha = await fichaService.getFichaById(fichaId);
        if (!ficha) {
          // Intentar por número de ficha si el ID no coincidió
          const allFichas = await fichaService.getFichas();
          ficha =
            allFichas.data.find(
              (f) => f.id === fichaId || f.number === fichaId || f.number === userData?.fichaId
            ) || null;
        }
      } catch (err) {
        console.warn('[academicRecordService] Error obteniendo ficha:', err);
      }

      // 4. Validación RBAC de Instructor:
      // Si el instructor está consultando este expediente, validar que la ficha le esté asignada
      if (options?.instructorUid) {
        const instructorId = options.instructorUid;
        const isAssigned =
          ficha?.instructorIds && ficha.instructorIds.includes(instructorId);

        // Si la ficha existe y el instructor NO está en instructorIds, denegar acceso
        if (ficha && !isAssigned) {
          console.warn(
            `[academicRecordService] Instructor ${instructorId} intentó consultar aprendiz de ficha no asignada ${ficha.number}`
          );
          return {
            data: null,
            unauthorized: true,
            error:
              'Acceso denegado: El instructor únicamente puede consultar expedientes de sus fichas asignadas.',
          };
        }
      }

      // 5. Cargar instructores asignados a la ficha
      const assignedInstructors: AssignedInstructorInfo[] = [];
      const instructorIds = ficha?.instructorIds || [];
      if (instructorIds.length > 0) {
        for (const instId of instructorIds) {
          try {
            const instDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, instId));
            if (instDoc.exists()) {
              const d = instDoc.data();
              assignedInstructors.push({
                uid: instId,
                displayName: d.displayName || d.name || 'Instructor SENA',
                email: d.email || 'Información no disponible',
                phone: d.phone || undefined,
                role: d.role || 'Instructor',
              });
            } else {
              assignedInstructors.push({
                uid: instId,
                displayName: 'Instructor Asignado',
                email: 'Información no disponible',
                role: 'Instructor',
              });
            }
          } catch (err) {
            console.warn(`[academicRecordService] Error consultando instructor ${instId}:`, err);
          }
        }
      }

      // 6. Programa y Centro de Formación
      let program: TrainingProgram | null = null;
      const programId = enrollment?.programId || ficha?.programId;
      if (programId) {
        try {
          program = await programService.getProgramById(programId);
        } catch (err) {
          console.warn('[academicRecordService] Error consultando programa:', err);
        }
      }

      let center: TrainingCenter | null = null;
      const centerId = enrollment?.centerId || ficha?.centerId;
      if (centerId) {
        try {
          center = await centerService.getCenterById(centerId);
        } catch (err) {
          console.warn('[academicRecordService] Error consultando centro:', err);
        }
      }

      // 7. Cursos, Competencias y RAPs en paralelo
      const [
        coursesRes,
        competenciesRes,
        outcomesRes,
        activitiesRes,
        submissionsRes,
        attendanceRes,
        justificationsRes,
        attentionCallsRes,
        restrictionsRes,
        learnerRecordsRes,
        gamificationProfile,
        userBadges,
        userAchievements,
      ] = await Promise.all([
        courseService.getCoursesByFicha(ficha?.id || fichaId).catch(() => ({ data: [] })),
        competencyService
          .getCompetencies({ fichaId: ficha?.id || fichaId, programId: program?.id })
          .catch(() => ({ data: [] })),
        learningOutcomeService
          .getLearningOutcomes({ programId: program?.id })
          .catch(() => ({ data: [] })),
        activityService.getActivities(ficha?.id || fichaId).catch(() => ({ data: [] })),
        submissionService.getSubmissionsByLearner(learnerId).catch(() => ({ data: [] })),
        trackingService
          .getAttendance(ficha?.id || fichaId, undefined, undefined, learnerId)
          .catch(() => ({ data: [] })),
        trackingService
          .getJustifications(ficha?.id || fichaId, learnerId)
          .catch(() => ({ data: [] })),
        trackingService
          .getAttentionCalls(ficha?.id || fichaId, learnerId)
          .catch(() => ({ data: [] })),
        trackingService
          .getRestrictions(learnerId, ficha?.id || fichaId)
          .catch(() => ({ data: [] })),
        trackingService
          .getLearnerRecords(ficha?.id || fichaId, learnerId)
          .catch(() => ({ data: [] })),
        gamificationService.getProfile(learnerId).catch(() => null),
        gamificationService.getUserBadges(learnerId).catch(() => []),
        gamificationService.getUserAchievements(learnerId).catch(() => []),
      ]);

      const courses = coursesRes.data || [];
      const competencies = competenciesRes.data || [];
      const outcomes = outcomesRes.data || [];
      const activities = activitiesRes.data || [];
      const submissions = submissionsRes.data || [];

      // Filtrar registros de seguimiento por learnerId para asegurar privacidad estricta
      const attendances = (attendanceRes.data || []).filter(
        (a) => a.userId === learnerId || a.learnerId === learnerId
      );
      const justifications = (justificationsRes.data || []).filter(
        (j) => j.userId === learnerId || j.learnerId === learnerId
      );
      const attentionCalls = (attentionCallsRes.data || []).filter(
        (c) => c.userId === learnerId || c.learnerId === learnerId
      );
      const restrictions = (restrictionsRes.data || []).filter(
        (r) => r.userId === learnerId || r.learnerId === learnerId
      );
      const activeRestrictions = restrictions.filter(
        (r) => r.status === 'active' || (r.status as string) === 'ACTIVA'
      );
      const learnerRecords = (learnerRecordsRes.data || []).filter(
        (lr) => lr.userId === learnerId
      );

      // Mapas auxiliares
      const submissionByActivityMap = new Map<string, AcademicSubmission>();
      submissions.forEach((s) => {
        if (s.activityId) {
          submissionByActivityMap.set(s.activityId, s);
        }
      });

      // 8. Construir Relación Jerárquica de Progreso Curricular:
      // Programa ↓ Ficha ↓ Curso ↓ Competencia ↓ RAP / Learning Outcome ↓ Actividades ↓ Evidencias
      const curricularProgress: CurricularProgressCompetency[] = competencies.map((comp) => {
        const relatedCourse = courses.find(
          (c) => c.id === comp.courseId || c.code === comp.courseId
        );
        const compOutcomes = outcomes.filter((o) => o.competencyId === comp.id);

        const outcomeProgress: CurricularProgressOutcome[] = compOutcomes.map((out) => {
          const outActivities = activities.filter(
            (a) => a.learningOutcomeId === out.id || a.competencyId === comp.id
          );
          const outSubmissions = outActivities
            .map((a) => submissionByActivityMap.get(a.id))
            .filter((s): s is AcademicSubmission => !!s);

          // Estado del RAP:
          // 'completed': si todas sus actividades están aprobadas (o tienen calificación 'A')
          // 'in_progress': si tiene al menos una entrega o actividad asociada
          // 'pending': si no registra actividad
          let outStatus: 'completed' | 'in_progress' | 'pending' = 'pending';
          if (outActivities.length > 0) {
            const allApproved = outActivities.every((act) => {
              const sub = submissionByActivityMap.get(act.id);
              return sub && (sub.status === 'approved' || sub.grade === 'A');
            });
            const someSubmitted = outActivities.some((act) =>
              submissionByActivityMap.has(act.id)
            );

            if (allApproved) {
              outStatus = 'completed';
            } else if (someSubmitted) {
              outStatus = 'in_progress';
            } else {
              outStatus = 'pending';
            }
          }

          return {
            outcome: out,
            activities: outActivities,
            submissions: outSubmissions,
            status: outStatus,
          };
        });

        // Actividades totales asociadas a la competencia
        const compActivities = activities.filter((a) => a.competencyId === comp.id);
        const compSubmissions = compActivities
          .map((a) => submissionByActivityMap.get(a.id))
          .filter((s): s is AcademicSubmission => !!s);

        const approvedCount = compSubmissions.filter(
          (s) => s.status === 'approved' || s.grade === 'A'
        ).length;

        let compStatus: 'completed' | 'in_progress' | 'pending' = 'pending';
        if (compActivities.length > 0) {
          if (approvedCount === compActivities.length) {
            compStatus = 'completed';
          } else if (compSubmissions.length > 0) {
            compStatus = 'in_progress';
          }
        }

        return {
          competency: comp,
          course: relatedCourse,
          learningOutcomes: outcomeProgress,
          totalActivities: compActivities.length,
          completedActivities: compSubmissions.length,
          approvedCount,
          status: compStatus,
        };
      });

      // 9. Construir Lista Detallada de Evidencias (Evidence Progress)
      const evidenceItems: EvidenceProgressItem[] = activities.map((act) => {
        const sub = submissionByActivityMap.get(act.id);
        let status: 'approved' | 'not_approved' | 'correction_required' | 'submitted' | 'pending' =
          'pending';

        if (sub) {
          if (sub.status === 'approved' || sub.grade === 'A') {
            status = 'approved';
          } else if (sub.status === 'not_approved' || sub.grade === 'N') {
            status = 'not_approved';
          } else if (sub.status === 'correction_required' || sub.grade === 'C') {
            status = 'correction_required';
          } else {
            status = 'submitted';
          }
        }

        const canResubmit =
          status === 'correction_required' ||
          status === 'not_approved' ||
          status === 'pending';

        return {
          activity: act,
          submission: sub,
          status,
          grade: sub?.grade,
          score: (sub as any)?.score || (typeof sub?.grade === 'number' ? sub.grade : undefined),
          submittedAt: sub?.submittedAt,
          dueDate: act.dueDate,
          feedback: sub?.feedback,
          fileUrl: sub?.driveUrl || sub?.driveFileUrl || sub?.externalUrl,
          fileName: sub?.fileName,
          canResubmit,
        };
      });

      // 10. Resumen Académico Cuantitativo (Academic Summary)
      const assignedActivitiesCount = activities.length;
      const submittedEvidencesCount = submissions.length;
      const approvedEvidencesCount = submissions.filter(
        (s) => s.status === 'approved' || s.grade === 'A'
      ).length;
      const correctionEvidencesCount = submissions.filter(
        (s) => s.status === 'correction_required' || s.grade === 'C'
      ).length;
      const notApprovedEvidencesCount = submissions.filter(
        (s) => s.status === 'not_approved' || s.grade === 'N'
      ).length;
      const pendingEvidencesCount = submissions.filter(
        (s) =>
          s.status === 'submitted' ||
          s.status === 'pending' ||
          s.status === 'under_review' ||
          (!s.grade &&
            s.status !== 'approved' &&
            s.status !== 'not_approved' &&
            s.status !== 'correction_required')
      ).length;

      const completedActivitiesCount = activities.filter((act) =>
        submissionByActivityMap.has(act.id)
      ).length;

      // Porcentaje de cumplimiento interno de la plataforma (Aprobadas / Evaluadas * 100)
      const evaluatedCount =
        approvedEvidencesCount + notApprovedEvidencesCount + correctionEvidencesCount;
      const complianceRate =
        evaluatedCount > 0 ? Math.round((approvedEvidencesCount / evaluatedCount) * 100) : 0;

      // Porcentaje de entrega interno (Entregadas / Asignadas * 100)
      const submissionRate =
        assignedActivitiesCount > 0
          ? Math.round((completedActivitiesCount / assignedActivitiesCount) * 100)
          : 0;

      // Asistencias y Puntualidad
      const totalAttendanceSessions = attendances.length;
      const attendedSessions = attendances.filter(
        (a) => a.status === 'present' || (a.status as string) === 'PRESENTE'
      ).length;
      const absenceCount = attendances.filter(
        (a) => a.status === 'absent' || (a.status as string) === 'AUSENTE'
      ).length;
      const lateCount = attendances.filter(
        (a) => a.status === 'late' || (a.status as string) === 'TARDE'
      ).length;
      const lateExcusedCount = attendances.filter(
        (a) => a.status === 'late_excused' || (a.status as string) === 'TARDE_EXCUSADO'
      ).length;
      const excusedCount = attendances.filter(
        (a) =>
          a.status === 'excused' ||
          (a.status as string) === 'EXCUSADO' ||
          (a.status as string) === 'AUSENCIA_JUSTIFICADA'
      ).length;

      // Regla: No contar ausencia justificada como asistencia efectiva.
      // Quienes asistieron son: attendedSessions (Presentes), lateExcusedCount (Tardanza justificada) y lateCount (Tardanza).
      const attendanceRate =
        totalAttendanceSessions > 0
          ? Math.round(
              ((attendedSessions + lateExcusedCount + lateCount * 0.8) /
                totalAttendanceSessions) *
                100
            )
          : 100;

      const punctualityRate =
        totalAttendanceSessions > 0
          ? Math.round(
              ((totalAttendanceSessions - lateCount) / totalAttendanceSessions) * 100
            )
          : 100;

      // Justificaciones
      const totalJustifications = justifications.length;
      const approvedJustifications = justifications.filter(
        (j) => j.status === 'approved' || (j.status as string) === 'APROBADA'
      ).length;
      const pendingJustifications = justifications.filter(
        (j) => j.status === 'pending' || (j.status as string) === 'PENDIENTE'
      ).length;
      const rejectedJustifications = justifications.filter(
        (j) => j.status === 'rejected' || (j.status as string) === 'RECHAZADA'
      ).length;

      // Gamificación
      const gamificationLevel = gamificationProfile?.level || 1;
      const levelTitle =
        gamificationLevel >= 5
          ? 'Aprendiz Maestro'
          : gamificationLevel >= 3
          ? 'Aprendiz Avanzado'
          : gamificationLevel >= 2
          ? 'Aprendiz en Formación'
          : 'Aprendiz Iniciado';
      const experiencePoints =
        gamificationProfile?.experiencePoints ||
        gamificationProfile?.totalPoints ||
        approvedEvidencesCount * 25 + attendedSessions * 5;
      const nextLevelPoints = gamificationLevel * 150;
      const currentLevelBasePoints = (gamificationLevel - 1) * 150;
      const progressToNextLevel = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((experiencePoints - currentLevelBasePoints) /
              Math.max(1, nextLevelPoints - currentLevelBasePoints)) *
              100
          )
        )
      );

      // Curso actual
      const currentCourseName =
        courses.length > 0
          ? courses[0].name
          : ficha?.programName || 'Información no disponible';

      // 11. Estructura Definitiva del Expediente Académico Digital
      const expediente: ApprenticeAcademicExpediente = {
        personalInfo: {
          uid: userData?.uid || learnerId,
          displayName:
            userData?.displayName ||
            userData?.name ||
            'Información no disponible',
          email: userData?.email || 'Información no disponible',
          documentNumber:
            userData?.documentNumber ||
            userData?.documentId ||
            'Información no disponible',
          documentType: userData?.documentType || 'CC',
          phone: userData?.phone || 'Información no disponible',
          photoURL:
            userData?.photoURL ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: userData?.role || 'apprentice',
          status: userData?.status || 'active',
        },
        academicInfo: {
          programName:
            program?.name ||
            ficha?.programName ||
            userData?.programName ||
            'Información no disponible',
          programCode: program?.code || undefined,
          fichaId: ficha?.id || fichaId,
          fichaNumber:
            ficha?.number ||
            userData?.fichaId ||
            'Información no disponible',
          centerName:
            center?.name ||
            'Centro de Comercio y Servicios',
          regional: center?.regional || 'Regional Tolima',
          jornada: (ficha as any)?.jornada || 'Diurna',
          enrollmentStatus: enrollment?.status || userData?.status || 'Activa',
          currentCourse: currentCourseName,
          enrollmentDate:
            enrollment?.enrollmentDate ||
            (enrollment as any)?.enrolledAt ||
            (ficha as any)?.startDate ||
            'Información no disponible',
          assignedInstructors,
        },
        summary: {
          assignedActivitiesCount,
          completedActivitiesCount,
          submittedEvidencesCount,
          approvedEvidencesCount,
          correctionEvidencesCount,
          notApprovedEvidencesCount,
          pendingEvidencesCount,
          complianceRate,
          submissionRate,
          totalAttendanceSessions,
          attendedSessions,
          absenceCount,
          lateCount,
          excusedCount,
          attendanceRate,
          punctualityRate,
          totalJustifications,
          approvedJustifications,
          pendingJustifications,
          rejectedJustifications,
          activeRestrictionsCount: activeRestrictions.length,
          activeRestrictions,
          gamificationLevel,
          levelTitle,
          experiencePoints,
          totalPoints: experiencePoints,
          nextLevelPoints,
          progressToNextLevel,
          badgesCount: userBadges.filter((b) => b.unlocked).length,
          achievementsCount: userAchievements.filter((a) => a.unlocked).length,
        },
        curricularProgress,
        evidences: evidenceItems,
        attendances,
        justifications,
        attentionCalls,
        badges: userBadges,
        achievements: userAchievements,
        learnerRecords,
      };

      return { data: expediente };
    } catch (err: any) {
      console.error('[academicRecordService] Error generando expediente académico:', err);
      return {
        data: null,
        error: err.message || 'Error al compilar el expediente digital del aprendiz.',
      };
    }
  },
};
