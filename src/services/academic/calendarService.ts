/**
 * @license
 * SENA Learning Hub - Servicio de Calendario Académico y Agenda de Actividades
 * PROMPT 18: 100% Real conectado a Firebase Firestore
 * Colecciones: /activities, /announcements, /fichas, /courses, /enrollments, /submissions, /attendance
 */

import {
  CalendarEventItem,
  CalendarEventType,
  CalendarActivityStatus,
  InstructorCalendarStats,
  EvidenceActivity,
  Announcement,
  AcademicSubmission,
  AttendanceRecord,
  Ficha,
} from '../../types/academic';
import { activityService } from './activityService';
import { announcementService } from './announcementService';
import { submissionService } from '../submissions/submissionService';
import { trackingService } from './trackingService';
import { fichaService } from './fichaService';
import { enrollmentService } from './enrollmentService';
import { normalizeEvaluationStatus, evaluateDeliveryCompliance } from '../../utils/evaluationUtils';

/**
 * Calcula los días de diferencia respecto a hoy a medianoche (cero horas)
 */
function getDayDifference(targetDate: Date): number {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetMidnight = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  ).getTime();

  const diffMs = targetMidnight - todayMidnight;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Genera la etiqueta de cuenta regresiva oficial (Prompt 18: Requisito 8)
 * "Due today", "Due tomorrow", "Due in 2 days", "Overdue"
 */
function calculateDueLabel(dueDateStr?: string | null): {
  dueLabel?: string;
  isOverdue: boolean;
  dueDateObj?: Date;
} {
  if (!dueDateStr || !dueDateStr.trim()) {
    return { isOverdue: false };
  }

  // Parsear fecha dueDate
  let dueObj: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateStr.trim())) {
    dueObj = new Date(`${dueDateStr.trim()}T23:59:59`);
  } else {
    dueObj = new Date(dueDateStr);
  }

  if (isNaN(dueObj.getTime())) {
    return { isOverdue: false };
  }

  const now = new Date();
  const isPast = now.getTime() > dueObj.getTime();
  const diffDays = getDayDifference(dueObj);

  let dueLabel: string;
  if (isPast && diffDays < 0) {
    dueLabel = 'Overdue';
  } else if (diffDays === 0) {
    dueLabel = 'Due today';
  } else if (diffDays === 1) {
    dueLabel = 'Due tomorrow';
  } else if (diffDays > 1) {
    dueLabel = `Due in ${diffDays} days`;
  } else {
    dueLabel = 'Overdue';
  }

  return {
    dueLabel,
    isOverdue: isPast,
    dueDateObj: dueObj,
  };
}

export const calendarService = {
  /**
   * Obtiene todos los eventos de calendario para un aprendiz específico
   * Conecta: /activities, /submissions (propias), /announcements, /attendance
   */
  async getLearnerCalendarEvents(params: {
    userId: string;
    fichaId?: string;
  }): Promise<{
    events: CalendarEventItem[];
    fichas: Ficha[];
    upcomingActivities: CalendarEventItem[];
  }> {
    const { userId, fichaId } = params;

    try {
      // 1. Obtener matrícula para identificar Ficha y Programa
      let effectiveFichaId = fichaId;
      let programId: string | undefined;

      const userEnrollment = await enrollmentService.getEnrollmentByLearnerId(userId);
      if (userEnrollment) {
        if (!effectiveFichaId) {
          effectiveFichaId = userEnrollment.fichaId;
        }
        programId = userEnrollment.programId;
      }

      // 2. Ejecutar consultas en paralelo contra colecciones reales
      const [activitiesRes, submissionsRes, announcements, attendanceRes, fichasRes] =
        await Promise.all([
          activityService.getActivities(effectiveFichaId ? { fichaId: effectiveFichaId } : undefined),
          submissionService.getSubmissionsByLearner(userId),
          announcementService.getAnnouncementsForLearner({
            userId,
            fichaId: effectiveFichaId,
            programId,
          }),
          trackingService.getAttendance(
            effectiveFichaId,
            undefined,
            undefined,
            userId
          ),
          fichaService.getFichas(),
        ]);

      const activities = activitiesRes.data || [];
      const submissions = submissionsRes.data || [];
      const attendances = attendanceRes.data || [];
      const allFichas = fichasRes.data || [];

      // Mapear fichas por ID para enriquecer nombres
      const fichaMap = new Map<string, Ficha>();
      allFichas.forEach((f) => fichaMap.set(f.id, f));

      // Mapear submissions por activityId para determinar estado de entrega
      const subMap = new Map<string, AcademicSubmission>();
      submissions.forEach((s) => subMap.set(s.activityId, s));

      const events: CalendarEventItem[] = [];

      // 3. Procesar Actividades y Fechas Límite (Requisito 3, 4, 7)
      activities.forEach((act) => {
        const fichaObj = fichaMap.get(act.fichaId);
        const fichaNumber = fichaObj?.number || act.fichaId;
        const submission = subMap.get(act.id);
        const evalStatus = normalizeEvaluationStatus(submission);
        const hasDueDate = Boolean(act.dueDate && act.dueDate.trim());

        const { dueLabel, isOverdue, dueDateObj } = calculateDueLabel(act.dueDate);

        // Determinar estado oficial según especificación de colores (Requisito 7):
        // 🟢 Completada
        // 🟡 Pendiente
        // 🔴 Vencida
        // 🔵 En corrección
        // ⚪ Sin fecha
        let status: CalendarActivityStatus = 'no_date';

        if (!hasDueDate || !dueDateObj) {
          status = 'no_date';
        } else if (submission) {
          if (
            evalStatus === 'A' ||
            submission.status === 'approved' ||
            submission.status === 'submitted' ||
            submission.status === 'under_review'
          ) {
            status = 'completed'; // 🟢
          } else if (evalStatus === 'C' || submission.status === 'correction_required') {
            status = 'correction'; // 🔵
          } else if (isOverdue) {
            status = 'overdue'; // 🔴
          } else {
            status = 'pending'; // 🟡
          }
        } else {
          // Sin entrega radicada
          if (isOverdue) {
            status = 'overdue'; // 🔴
          } else {
            status = 'pending'; // 🟡
          }
        }

        // Evento de FECHA LÍMITE (DUE_DATE)
        if (hasDueDate && dueDateObj) {
          events.push({
            id: `due_${act.id}`,
            title: act.title || act.name || 'Actividad de Aprendizaje',
            description: act.description || act.instructions,
            type: 'DUE_DATE',
            startDate: dueDateObj,
            endDate: dueDateObj,
            allDay: true,
            relatedId: act.id,
            relatedType: 'activity',
            fichaId: act.fichaId,
            fichaNumber,
            courseId: act.courseId,
            activityId: act.id,
            status,
            points: act.points || 100,
            submissionStatus: submission?.status,
            submissionId: submission?.id,
            isOverdue,
            dueLabel,
            rawActivity: act,
          });
        } else {
          // Actividad sin fecha límite
          const createdDate = act.createdAt ? new Date(act.createdAt) : new Date();
          events.push({
            id: `act_${act.id}`,
            title: act.title || act.name || 'Actividad de Aprendizaje',
            description: act.description || act.instructions,
            type: 'ACTIVITY',
            startDate: createdDate,
            endDate: createdDate,
            allDay: true,
            relatedId: act.id,
            relatedType: 'activity',
            fichaId: act.fichaId,
            fichaNumber,
            courseId: act.courseId,
            activityId: act.id,
            status: 'no_date',
            points: act.points || 100,
            submissionStatus: submission?.status,
            submissionId: submission?.id,
            isOverdue: false,
            dueLabel: 'Sin fecha límite',
            rawActivity: act,
          });
        }

        // Si la actividad tiene startDate explícita distinta de dueDate, agregar evento de inicio
        if (act.startDate && act.startDate.trim()) {
          const startObj = new Date(act.startDate);
          if (!isNaN(startObj.getTime()) && startObj.getTime() !== dueDateObj?.getTime()) {
            events.push({
              id: `start_${act.id}`,
              title: `Apertura: ${act.title || act.name}`,
              description: `Inicio de plazo para: ${act.title || act.name}`,
              type: 'ACTIVITY',
              startDate: startObj,
              endDate: startObj,
              allDay: true,
              relatedId: act.id,
              relatedType: 'activity',
              fichaId: act.fichaId,
              fichaNumber,
              courseId: act.courseId,
              activityId: act.id,
              status,
              rawActivity: act,
            });
          }
        }
      });

      // 4. Procesar Anuncios con Fecha (Requisito 3 & 4)
      announcements.forEach((ann) => {
        const pubDate = ann.publishedAt
          ? new Date(ann.publishedAt)
          : ann.createdAt
          ? new Date(ann.createdAt)
          : new Date();

        if (!isNaN(pubDate.getTime())) {
          events.push({
            id: `ann_${ann.id}`,
            title: `Aviso: ${ann.title}`,
            description: ann.message,
            type: 'ANNOUNCEMENT',
            startDate: pubDate,
            endDate: ann.expiresAt ? new Date(ann.expiresAt) : pubDate,
            allDay: true,
            relatedId: ann.id,
            relatedType: 'announcement',
            priority: ann.priority,
            instructorName: ann.creatorName,
            rawAnnouncement: ann,
          });
        }
      });

      // 5. Procesar Sesiones de Formación / Asistencias registradas
      attendances.forEach((att) => {
        if (att.date) {
          const [year, month, day] = att.date.split('-').map(Number);
          const attDate = new Date(year, month - 1, day, 8, 0, 0);
          if (!isNaN(attDate.getTime())) {
            const fichaObj = fichaMap.get(att.fichaId);
            events.push({
              id: `att_${att.id}`,
              title: `Sesión: Formación Técnica (${att.status})`,
              description: att.observation || att.notes || `Registro de sesión - Estado: ${att.status}`,
              type: 'ATTENDANCE',
              startDate: attDate,
              endDate: new Date(year, month - 1, day, 12, 0, 0),
              allDay: false,
              relatedId: att.id,
              relatedType: 'attendance',
              fichaId: att.fichaId,
              fichaNumber: fichaObj?.number,
              courseId: att.courseId,
              status: att.status,
              rawAttendance: att,
            });
          }
        }
      });

      // 6. Ordenar todos los eventos cronológicamente
      events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      // 7. Preparar Lista "Upcoming" (Requisito 9)
      // Actividades próximas con fecha límite futura u hoy, o vencidas recientemente
      const upcomingActivities = events
        .filter(
          (e) =>
            e.type === 'DUE_DATE' &&
            e.rawActivity &&
            e.status !== 'completed' // Mostrar pendientes, en corrección o vencidas
        )
        .sort((a, b) => {
          // Las no vencidas primero ordenadas por fecha más cercana
          const now = Date.now();
          const aFuture = a.startDate.getTime() >= now;
          const bFuture = b.startDate.getTime() >= now;

          if (aFuture && bFuture) return a.startDate.getTime() - b.startDate.getTime();
          if (aFuture && !bFuture) return -1;
          if (!aFuture && bFuture) return 1;
          return b.startDate.getTime() - a.startDate.getTime();
        });

      return {
        events,
        fichas: allFichas.filter((f) =>
          effectiveFichaId ? f.id === effectiveFichaId : true
        ),
        upcomingActivities,
      };
    } catch (error) {
      console.warn('[calendarService] Error cargando eventos del aprendiz:', error);
      return {
        events: [],
        fichas: [],
        upcomingActivities: [],
      };
    }
  },

  /**
   * Obtiene eventos y métricas de calendario para un instructor
   * Conecta: /activities, /submissions (de sus fichas), /announcements, /fichas
   */
  async getInstructorCalendarEvents(params: {
    instructorUid: string;
    selectedFichaId?: string;
  }): Promise<{
    events: CalendarEventItem[];
    fichas: Ficha[];
    stats: InstructorCalendarStats;
    submissionsByActivity: Record<string, { total: number; pendingReview: number; approved: number }>;
  }> {
    const { instructorUid, selectedFichaId } = params;

    try {
      // 1. Obtener fichas asignadas al instructor
      const fichasRes = await fichaService.getFichas(instructorUid);
      const instructorFichas = fichasRes.data || [];
      const assignedFichaIds = instructorFichas.map((f) => f.id);

      // Si se especificó una ficha, validar que pertenezca a sus fichas asignadas
      const effectiveFichaIds = selectedFichaId
        ? assignedFichaIds.includes(selectedFichaId)
          ? [selectedFichaId]
          : assignedFichaIds
        : assignedFichaIds;

      // 2. Consultar actividades de las fichas del instructor
      const activitiesRes = await activityService.getActivities();
      const allActivities = activitiesRes.data || [];
      const instructorActivities = allActivities.filter(
        (a) => effectiveFichaIds.includes(a.fichaId) || a.createdBy === instructorUid
      );

      // 3. Consultar entregas asociadas a las fichas asignadas
      const submissionsRes = await submissionService.getAllSubmissions(instructorUid, effectiveFichaIds);
      const allSubmissions: AcademicSubmission[] = submissionsRes.data || [];

      // 4. Consultar anuncios del instructor
      const announcements = await announcementService.getAnnouncementsForInstructor(instructorUid);

      // Mapear fichas por ID
      const fichaMap = new Map<string, Ficha>();
      instructorFichas.forEach((f) => fichaMap.set(f.id, f));

      // Contadores de entregas por actividad
      const subStatsByActivity: Record<
        string,
        { total: number; pendingReview: number; approved: number }
      > = {};

      allSubmissions.forEach((sub) => {
        if (!subStatsByActivity[sub.activityId]) {
          subStatsByActivity[sub.activityId] = { total: 0, pendingReview: 0, approved: 0 };
        }
        subStatsByActivity[sub.activityId].total += 1;
        if (sub.status === 'submitted' || sub.status === 'under_review') {
          subStatsByActivity[sub.activityId].pendingReview += 1;
        }
        if (sub.status === 'approved' || sub.grade === 'A') {
          subStatsByActivity[sub.activityId].approved += 1;
        }
      });

      const events: CalendarEventItem[] = [];

      // Contadores para Resumen del Instructor (Requisito 11)
      let dueTodayCount = 0;
      let thisWeekCount = 0;
      let overdueCount = 0;
      let pendingReviewCount = 0;

      // Fechas de referencia para esta semana (lunes a domingo)
      const now = new Date();
      const todayDay = now.getDay(); // 0 es domingo
      const diffToMonday = (todayDay + 6) % 7;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

      // Contar entregas pendientes de revisión en total
      allSubmissions.forEach((sub) => {
        if (effectiveFichaIds.includes(sub.fichaId)) {
          if (sub.status === 'submitted' || sub.status === 'under_review') {
            pendingReviewCount += 1;
          }
        }
      });

      // 5. Mapear actividades a eventos del instructor
      instructorActivities.forEach((act) => {
        const fichaObj = fichaMap.get(act.fichaId);
        const fichaNumber = fichaObj?.number || act.fichaId;
        const hasDueDate = Boolean(act.dueDate && act.dueDate.trim());
        const { dueLabel, isOverdue, dueDateObj } = calculateDueLabel(act.dueDate);

        const subInfo = subStatsByActivity[act.id] || { total: 0, pendingReview: 0, approved: 0 };

        if (hasDueDate && dueDateObj) {
          // Verificar Due Today
          const diffDays = getDayDifference(dueDateObj);
          if (diffDays === 0) {
            dueTodayCount += 1;
          }

          // Verificar This Week
          if (dueDateObj >= startOfWeek && dueDateObj <= endOfWeek) {
            thisWeekCount += 1;
          }

          // Verificar Overdue
          if (isOverdue) {
            overdueCount += 1;
          }

          events.push({
            id: `due_${act.id}`,
            title: act.title || act.name || 'Actividad de Aprendizaje',
            description: act.description || act.instructions,
            type: 'DUE_DATE',
            startDate: dueDateObj,
            endDate: dueDateObj,
            allDay: true,
            relatedId: act.id,
            relatedType: 'activity',
            fichaId: act.fichaId,
            fichaNumber,
            courseId: act.courseId,
            activityId: act.id,
            status: isOverdue ? 'overdue' : 'pending',
            points: act.points || 100,
            isOverdue,
            dueLabel,
            rawActivity: act,
          });
        } else {
          // Actividad sin fecha límite
          const createdDate = act.createdAt ? new Date(act.createdAt) : new Date();
          events.push({
            id: `act_${act.id}`,
            title: act.title || act.name || 'Actividad de Aprendizaje',
            description: act.description || act.instructions,
            type: 'ACTIVITY',
            startDate: createdDate,
            endDate: createdDate,
            allDay: true,
            relatedId: act.id,
            relatedType: 'activity',
            fichaId: act.fichaId,
            fichaNumber,
            courseId: act.courseId,
            activityId: act.id,
            status: 'no_date',
            points: act.points || 100,
            isOverdue: false,
            dueLabel: 'Sin fecha límite',
            rawActivity: act,
          });
        }

        // Si tiene fecha de inicio
        if (act.startDate && act.startDate.trim()) {
          const startObj = new Date(act.startDate);
          if (!isNaN(startObj.getTime()) && startObj.getTime() !== dueDateObj?.getTime()) {
            events.push({
              id: `start_${act.id}`,
              title: `Apertura: ${act.title || act.name}`,
              description: `Inicio de entregas para: ${act.title || act.name}`,
              type: 'ACTIVITY',
              startDate: startObj,
              endDate: startObj,
              allDay: true,
              relatedId: act.id,
              relatedType: 'activity',
              fichaId: act.fichaId,
              fichaNumber,
              courseId: act.courseId,
              activityId: act.id,
              rawActivity: act,
            });
          }
        }
      });

      // 6. Mapear Anuncios del Instructor
      announcements.forEach((ann) => {
        const pubDate = ann.publishedAt
          ? new Date(ann.publishedAt)
          : ann.createdAt
          ? new Date(ann.createdAt)
          : new Date();

        if (!isNaN(pubDate.getTime())) {
          events.push({
            id: `ann_${ann.id}`,
            title: `Aviso publicado: ${ann.title}`,
            description: ann.message,
            type: 'ANNOUNCEMENT',
            startDate: pubDate,
            endDate: ann.expiresAt ? new Date(ann.expiresAt) : pubDate,
            allDay: true,
            relatedId: ann.id,
            relatedType: 'announcement',
            priority: ann.priority,
            rawAnnouncement: ann,
          });
        }
      });

      events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      return {
        events,
        fichas: instructorFichas,
        stats: {
          dueTodayCount,
          thisWeekCount,
          pendingReviewCount,
          overdueCount,
          totalActivities: instructorActivities.length,
        },
        submissionsByActivity: subStatsByActivity,
      };
    } catch (error) {
      console.warn('[calendarService] Error cargando eventos del instructor:', error);
      return {
        events: [],
        fichas: [],
        stats: {
          dueTodayCount: 0,
          thisWeekCount: 0,
          pendingReviewCount: 0,
          overdueCount: 0,
          totalActivities: 0,
        },
        submissionsByActivity: {},
      };
    }
  },
};
