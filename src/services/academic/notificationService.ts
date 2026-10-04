/**
 * @license
 * SENA Learning Hub - Servicio Centralizado de Notificaciones Académicas y Firestore
 * Colección Firestore: /notifications
 * PROMPT 16: Centro de notificaciones 100% real, reactivo, paginado, seguro e idempotente.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import { enrollmentService } from './enrollmentService';
import { fichaService } from './fichaService';

// Tipos consolidados oficiales según PROMPT 16
export type NotificationType =
  // Actividades
  | 'ACTIVITY_PUBLISHED'
  | 'ACTIVITY_UPDATED'
  | 'ACTIVITY_DUE_SOON'
  // Evidencias
  | 'EVIDENCE_SUBMITTED'
  | 'EVIDENCE_APPROVED'
  | 'EVIDENCE_NOT_APPROVED'
  | 'EVIDENCE_CORRECTION_REQUIRED'
  | 'EVIDENCE_RESUBMITTED'
  | 'RUBRIC_EVALUATED'
  // Anuncios y Recursos
  | 'ANNOUNCEMENT_PUBLISHED'
  | 'RESOURCE_PUBLISHED'
  // Asistencia
  | 'ATTENDANCE_ABSENCE'
  | 'ATTENDANCE_LATE'
  // Académico
  | 'ATTENTION_CALL'
  | 'ACADEMIC_RESTRICTION'
  | 'JUSTIFICATION_RECEIVED'
  | 'JUSTIFICATION_APPROVED'
  // Gamificación
  | 'LEVEL_UP'
  | 'BADGE_EARNED'
  | 'ACHIEVEMENT_EARNED'
  // Compatibilidad con registros históricos existentes
  | 'ANNOUNCEMENT'
  | 'EVIDENCE_GRADED'
  | 'CORRECTION_REQUIRED'
  | 'ATTENDANCE_ALERT'
  | 'GENERAL'
  | 'grade'
  | 'activity'
  | 'feedback'
  | 'reminder'
  | 'announcement'
  | 'attention_call'
  | 'restriction'
  | 'justification';

export interface AppNotification {
  id: string;
  userId: string;
  recipientUserId: string; // Garantiza coherencia e interoperabilidad
  title: string;
  message: string;
  description?: string; // Alias para compatibilidad histórica
  type: NotificationType;
  isRead: boolean;
  read?: boolean; // Alias para compatibilidad histórica
  relatedId?: string;
  relatedType?:
    | 'activity'
    | 'submission'
    | 'announcement'
    | 'attendance'
    | 'attention_call'
    | 'restriction'
    | 'justification'
    | 'gamification'
    | string;
  createdAt: string; // ISO-8601
  updatedAt?: string;
  timeAgo?: string;
  metadata?: Record<string, any>;
}

export type NotificationCategoryFilter =
  | 'all'
  | 'unread'
  | 'activities'
  | 'evidence'
  | 'announcements'
  | 'academic'
  | 'gamification';

const COLLECTION = FIRESTORE_COLLECTIONS.NOTIFICATIONS || 'notifications';

// Caché en memoria para optimización en sesión y offline
let inMemoryNotifications: AppNotification[] = [];

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Calcula una etiqueta humana de tiempo transcurrido
 */
export function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0) return 'Hace un momento';
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return 'Hace un momento';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays} d`;
    const date = new Date(isoString);
    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
  } catch {
    return 'Reciente';
  }
}

/**
 * Determina la categoría del filtro a partir del tipo de notificación
 */
export function getNotificationCategory(type: NotificationType): 'activities' | 'evidence' | 'announcements' | 'academic' | 'gamification' | 'other' {
  switch (type) {
    case 'ACTIVITY_PUBLISHED':
    case 'ACTIVITY_UPDATED':
    case 'ACTIVITY_DUE_SOON':
    case 'activity':
      return 'activities';

    case 'EVIDENCE_SUBMITTED':
    case 'EVIDENCE_APPROVED':
    case 'EVIDENCE_NOT_APPROVED':
    case 'EVIDENCE_CORRECTION_REQUIRED':
    case 'EVIDENCE_RESUBMITTED':
    case 'EVIDENCE_GRADED':
    case 'CORRECTION_REQUIRED':
    case 'grade':
    case 'feedback':
      return 'evidence';

    case 'ANNOUNCEMENT_PUBLISHED':
    case 'ANNOUNCEMENT':
    case 'announcement':
      return 'announcements';

    case 'ATTENDANCE_ABSENCE':
    case 'ATTENDANCE_LATE':
    case 'ATTENTION_CALL':
    case 'ACADEMIC_RESTRICTION':
    case 'JUSTIFICATION_RECEIVED':
    case 'JUSTIFICATION_APPROVED':
    case 'ATTENDANCE_ALERT':
    case 'attention_call':
    case 'restriction':
    case 'justification':
      return 'academic';

    case 'LEVEL_UP':
    case 'BADGE_EARNED':
    case 'ACHIEVEMENT_EARNED':
      return 'gamification';

    default:
      return 'other';
  }
}

export const notificationService = {
  /**
   * Envía una notificación persistente a Firestore (/notifications) con protección contra duplicados (idempotencia)
   */
  async sendNotification(
    payload: Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'read' | 'userId' | 'recipientUserId' | 'message'> & {
      id?: string;
      userId?: string;
      recipientUserId?: string;
      message?: string;
      description?: string;
    }
  ): Promise<AppNotification> {
    const targetUserId = payload.userId || payload.recipientUserId || '';
    if (!targetUserId) {
      console.warn('[notificationService] Notificación rechazada: userId no definido.');
      throw new Error('userId requerido para emitir notificación.');
    }

    // ID determinista para prevenir duplicaciones accidentales
    const id =
      payload.id ||
      `notif_${targetUserId}_${payload.type}_${payload.relatedId || Date.now()}`;

    const now = new Date().toISOString();
    const finalMsg = payload.message || payload.description || '';

    const notif: AppNotification = {
      ...payload,
      id,
      userId: targetUserId,
      recipientUserId: targetUserId,
      title: payload.title,
      message: finalMsg,
      description: finalMsg,
      type: payload.type,
      isRead: false,
      read: false,
      relatedId: payload.relatedId,
      relatedType: payload.relatedType,
      createdAt: now,
      timeAgo: 'Hace un momento',
      metadata: payload.metadata,
    };

    // 1. Actualizar memoria inmediata
    const idx = inMemoryNotifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      inMemoryNotifications[idx] = notif;
    } else {
      inMemoryNotifications = [notif, ...inMemoryNotifications];
    }

    // 2. Persistir en Firestore
    try {
      await setDoc(doc(db, COLLECTION, id), cleanUndefined(notif), { merge: true });
    } catch (err) {
      console.warn('[notificationService] Aviso guardando notificación en Firestore:', err);
    }

    return notif;
  },

  /**
   * Obtiene las notificaciones del usuario autenticado desde Firestore con soporte para paginación
   */
  async getNotifications(
    userId: string,
    limitCount: number = 20
  ): Promise<{ data: AppNotification[]; hasMore: boolean }> {
    if (!userId) return { data: [], hasMore: false };

    try {
      const q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        limit(limitCount + 1)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb: AppNotification[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const isRead = data.isRead ?? data.read ?? false;
          const msg = data.message || data.description || '';
          return {
            id: d.id,
            userId: data.userId || userId,
            recipientUserId: data.recipientUserId || data.userId || userId,
            title: data.title || '',
            message: msg,
            description: msg,
            type: data.type || 'GENERAL',
            isRead,
            read: isRead,
            relatedId: data.relatedId,
            relatedType: data.relatedType,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
            timeAgo: formatTimeAgo(data.createdAt || new Date().toISOString()),
            metadata: data.metadata,
          };
        });

        // Ordenar más recientes primero
        fromDb.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const hasMore = fromDb.length > limitCount;
        const result = hasMore ? fromDb.slice(0, limitCount) : fromDb;

        // Actualizar caché
        result.forEach((item) => {
          const existing = inMemoryNotifications.findIndex((m) => m.id === item.id);
          if (existing !== -1) {
            inMemoryNotifications[existing] = item;
          } else {
            inMemoryNotifications.push(item);
          }
        });

        return { data: result, hasMore };
      }
    } catch (err) {
      console.warn('[notificationService] Aviso leyendo notificaciones de Firestore:', err);
    }

    // Retornar datos en memoria acotados al usuario
    const userMem = inMemoryNotifications
      .filter((n) => n.userId === userId || n.recipientUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const hasMore = userMem.length > limitCount;
    return {
      data: hasMore ? userMem.slice(0, limitCount) : userMem,
      hasMore,
    };
  },

  /**
   * Suscribe en tiempo real a las notificaciones de un usuario (onSnapshot)
   * PROMPT 16 - Requisito 7 & 8: Actualización reactiva del contador y bandeja
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: AppNotification[]) => void,
    limitCount: number = 50
  ): () => void {
    if (!userId) return () => {};

    try {
      const q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        limit(limitCount)
      );

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: AppNotification[] = snap.docs.map((d) => {
            const data = d.data() as any;
            const isRead = data.isRead ?? data.read ?? false;
            const msg = data.message || data.description || '';
            return {
              id: d.id,
              userId: data.userId || userId,
              recipientUserId: data.recipientUserId || data.userId || userId,
              title: data.title || '',
              message: msg,
              description: msg,
              type: data.type || 'GENERAL',
              isRead,
              read: isRead,
              relatedId: data.relatedId,
              relatedType: data.relatedType,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt,
              timeAgo: formatTimeAgo(data.createdAt || new Date().toISOString()),
              metadata: data.metadata,
            };
          });

          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // Mantener caché actualizado
          list.forEach((item) => {
            const idx = inMemoryNotifications.findIndex((m) => m.id === item.id);
            if (idx !== -1) inMemoryNotifications[idx] = item;
            else inMemoryNotifications.push(item);
          });

          callback(list);
        },
        (error) => {
          console.warn('[notificationService] onSnapshot aviso:', error);
          const fallback = inMemoryNotifications
            .filter((n) => n.userId === userId || n.recipientUserId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callback(fallback);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('[notificationService] Error configurando suscripción en tiempo real:', err);
      return () => {};
    }
  },

  /**
   * Marca una notificación individual como leída
   */
  async markAsRead(id: string): Promise<void> {
    const now = new Date().toISOString();
    inMemoryNotifications = inMemoryNotifications.map((n) =>
      n.id === id ? { ...n, isRead: true, read: true, updatedAt: now } : n
    );

    try {
      await setDoc(
        doc(db, COLLECTION, id),
        { isRead: true, read: true, updatedAt: now },
        { merge: true }
      );
    } catch (err) {
      console.warn('[notificationService] Aviso actualizando lectura en Firestore:', err);
    }
  },

  /**
   * Marca todas las notificaciones del usuario como leídas
   */
  async markAllAsRead(userId: string): Promise<void> {
    const now = new Date().toISOString();
    inMemoryNotifications = inMemoryNotifications.map((n) =>
      n.userId === userId || n.recipientUserId === userId
        ? { ...n, isRead: true, read: true, updatedAt: now }
        : n
    );

    try {
      const q = query(collection(db, COLLECTION), where('userId', '==', userId));
      const snap = await getDocs(q);
      const unreadDocs = snap.docs.filter((d) => !(d.data().isRead ?? d.data().read));

      const updates = unreadDocs.map((d) =>
        setDoc(d.ref, { isRead: true, read: true, updatedAt: now }, { merge: true })
      );
      await Promise.all(updates);
    } catch (err) {
      console.warn('[notificationService] Aviso marcando todas leídas en Firestore:', err);
    }
  },

  /**
   * Elimina una notificación propia de Firestore
   */
  async deleteNotification(id: string): Promise<void> {
    inMemoryNotifications = inMemoryNotifications.filter((n) => n.id !== id);

    try {
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (err) {
      console.warn('[notificationService] Aviso eliminando notificación en Firestore:', err);
    }
  },

  // =========================================================================
  // DISPATCHERS DE EVENTOS ACADÉMICOS REALES (Requisitos 4, 5, 6, 13)
  // =========================================================================

  /**
   * Evento: Actividad formativa publicada (ACTIVITY_PUBLISHED)
   * Destinatarios: Aprendices matriculados en la ficha correspondiente
   */
  async notifyActivityPublished(payload: {
    activityId?: string;
    id?: string;
    title: string;
    fichaId: string;
    courseName?: string;
  }): Promise<void> {
    const activityId = payload.activityId || payload.id || '';
    const { title, fichaId } = payload;
    try {
      const enrollmentsRes = await enrollmentService.getEnrollmentsByFicha(fichaId);
      const apprentices = enrollmentsRes.data;

      for (const enr of apprentices) {
        const uid = enr.apprenticeId || enr.userId;
        if (!uid) continue;

        await this.sendNotification({
          id: `notif_${uid}_ACTIVITY_PUBLISHED_${activityId}`,
          userId: uid,
          title: `Nueva actividad: ${title}`,
          message: `El instructor ha publicado una nueva actividad para tu ficha. Revisa las instrucciones y entrega tu evidencia a tiempo.`,
          type: 'ACTIVITY_PUBLISHED',
          relatedId: activityId,
          relatedType: 'activity',
          metadata: { fichaId },
        });
      }
    } catch (err) {
      console.warn('[notificationService] Error en notifyActivityPublished:', err);
    }
  },

  /**
   * Evento: Actividad formativa actualizada (ACTIVITY_UPDATED)
   * Destinatarios: Aprendices matriculados en la ficha correspondiente
   */
  async notifyActivityUpdated(payload: {
    activityId: string;
    title: string;
    fichaId: string;
  }): Promise<void> {
    const { activityId, title, fichaId } = payload;
    try {
      const enrollmentsRes = await enrollmentService.getEnrollmentsByFicha(fichaId);
      const apprentices = enrollmentsRes.data;

      for (const enr of apprentices) {
        const uid = enr.apprenticeId || enr.userId;
        if (!uid) continue;

        await this.sendNotification({
          id: `notif_${uid}_ACTIVITY_UPDATED_${activityId}_${Date.now()}`,
          userId: uid,
          title: `Actividad modificada: ${title}`,
          message: `El instructor actualizó las indicaciones o fechas de la actividad. Consulta los detalles actualizados.`,
          type: 'ACTIVITY_UPDATED',
          relatedId: activityId,
          relatedType: 'activity',
          metadata: { fichaId },
        });
      }
    } catch (err) {
      console.warn('[notificationService] Error en notifyActivityUpdated:', err);
    }
  },

  /**
   * Evento: Actividad próxima a vencer (ACTIVITY_DUE_SOON)
   */
  async notifyActivityDueSoon(payload: {
    activityId: string;
    title: string;
    fichaId: string;
    dueDateFormatted: string;
  }): Promise<void> {
    const { activityId, title, fichaId, dueDateFormatted } = payload;
    try {
      const enrollmentsRes = await enrollmentService.getEnrollmentsByFicha(fichaId);
      const apprentices = enrollmentsRes.data;

      for (const enr of apprentices) {
        const uid = enr.apprenticeId || enr.userId;
        if (!uid) continue;

        await this.sendNotification({
          id: `notif_${uid}_ACTIVITY_DUE_SOON_${activityId}`,
          userId: uid,
          title: `Plazo próximo a vencer: ${title}`,
          message: `Recuerda entregar tu evidencia antes de la fecha límite: ${dueDateFormatted}.`,
          type: 'ACTIVITY_DUE_SOON',
          relatedId: activityId,
          relatedType: 'activity',
          metadata: { fichaId },
        });
      }
    } catch (err) {
      console.warn('[notificationService] Error en notifyActivityDueSoon:', err);
    }
  },

  /**
   * Evento: Evidencia entregada inicialmente por aprendiz (EVIDENCE_SUBMITTED)
   * Destinatario: Instructor de la ficha
   */
  async notifyEvidenceSubmitted(payload: {
    submissionId: string;
    activityId: string;
    activityTitle?: string;
    learnerId: string;
    learnerName?: string;
    fichaId?: string;
    instructorId?: string;
  }): Promise<void> {
    const { submissionId, activityId, activityTitle, learnerId, learnerName, fichaId, instructorId } = payload;

    const instructorsToNotify = new Set<string>();
    if (instructorId) instructorsToNotify.add(instructorId);

    // Si no viene instructorId directo, consultar la ficha para identificar instructores asignados
    if (instructorsToNotify.size === 0 && fichaId) {
      try {
        const ficha = await fichaService.getFichaById(fichaId);
        if (ficha?.instructorIds && ficha.instructorIds.length > 0) {
          ficha.instructorIds.forEach((iId) => instructorsToNotify.add(iId));
        }
      } catch (e) {
        console.warn('[notificationService] Aviso obteniendo instructores de ficha:', e);
      }
    }

    for (const instId of Array.from(instructorsToNotify)) {
      await this.sendNotification({
        id: `notif_${instId}_EVIDENCE_SUBMITTED_${submissionId}`,
        userId: instId,
        title: `Nueva evidencia entregada`,
        message: `${learnerName || 'Un aprendiz'} radicó su evidencia para la actividad "${activityTitle || 'Formativa'}".`,
        type: 'EVIDENCE_SUBMITTED',
        relatedId: submissionId,
        relatedType: 'submission',
        metadata: {
          activityId,
          learnerId,
          learnerName,
          fichaId,
        },
      });
    }
  },

  /**
   * Evento: Evidencia calificada con A / N / C
   * Destinatario: Aprendiz titular de la entrega
   */
  async notifyEvidenceGraded(payload: {
    submissionId: string;
    activityId: string;
    activityTitle?: string;
    learnerId: string;
    gradeCode: 'A' | 'N' | 'C';
    feedback?: string;
    version?: number;
  }): Promise<void> {
    const { submissionId, activityId, activityTitle, learnerId, gradeCode, feedback, version = 1 } = payload;
    if (!learnerId) return;

    let title = '';
    let message = '';
    let type: NotificationType = 'EVIDENCE_APPROVED';

    if (gradeCode === 'A') {
      title = 'Tu evidencia ha sido aprobada (A)';
      message = `¡Excelente trabajo! Tu entrega para "${activityTitle || 'la actividad'}" fue evaluada con APROBADO (A).`;
      type = 'EVIDENCE_APPROVED';
    } else if (gradeCode === 'N') {
      title = 'Tu evidencia no fue aprobada (N)';
      message = `Tu entrega para "${activityTitle || 'la actividad'}" recibió calificación de NO APROBADO (N).${feedback ? ` Observaciones: ${feedback}` : ''}`;
      type = 'EVIDENCE_NOT_APPROVED';
    } else if (gradeCode === 'C') {
      title = 'Tu evidencia requiere corrección (C)';
      message = `Tu entrega para "${activityTitle || 'la actividad'}" requiere ajustes. Revisa las observaciones y radica tu reenvío.${feedback ? ` Observaciones: ${feedback}` : ''}`;
      type = 'EVIDENCE_CORRECTION_REQUIRED';
    }

    await this.sendNotification({
      id: `notif_${learnerId}_${type}_${submissionId}_v${version}`,
      userId: learnerId,
      title,
      message,
      type,
      relatedId: submissionId,
      relatedType: 'submission',
      metadata: {
        activityId,
        gradeCode,
        version,
      },
    });
  },

  /**
   * Evento: Evidencia evaluada mediante rúbrica formativa (RUBRIC_EVALUATED)
   * PROMPT 19 - Requisito 21
   */
  async notifyRubricEvaluated(payload: {
    submissionId: string;
    activityId: string;
    activityTitle?: string;
    learnerId: string;
    rubricScore: number;
    rubricMaxScore: number;
    percentage: number;
    version?: number;
  }): Promise<void> {
    const {
      submissionId,
      activityId,
      activityTitle,
      learnerId,
      rubricScore,
      rubricMaxScore,
      percentage,
      version = 1,
    } = payload;
    if (!learnerId) return;

    await this.sendNotification({
      id: `notif_${learnerId}_rubric_${submissionId}_v${version}`,
      userId: learnerId,
      title: 'Tu evidencia ha sido evaluada con una rúbrica',
      message: `Tu entrega para "${activityTitle || 'la actividad'}" ha recibido una evaluación formativa por rúbrica: ${rubricScore}/${rubricMaxScore} pts (${percentage}%). Consulta los criterios y niveles de desempeño.`,
      type: 'RUBRIC_EVALUATED',
      relatedId: submissionId,
      relatedType: 'submission',
      metadata: {
        activityId,
        rubricScore,
        rubricMaxScore,
        percentage,
        version,
      },
    });
  },

  /**
   * Evento: Nuevo recurso o material didáctico publicado (RESOURCE_PUBLISHED)
   * PROMPT 20 - Requisito 20 y 35: Idempotente, sin duplicaciones
   */
  async notifyResourcePublished(payload: {
    resourceId: string;
    resourceTitle: string;
    fichaId?: string;
    courseName?: string;
    activityTitle?: string;
    senderName?: string;
  }): Promise<void> {
    const { resourceId, resourceTitle, fichaId, courseName, activityTitle, senderName } = payload;
    if (!fichaId) return;

    try {
      const enrollmentsRes = await enrollmentService.getEnrollmentsByFicha(fichaId);
      const apprentices = enrollmentsRes.data || [];

      for (const enr of apprentices) {
        const uid = enr.apprenticeId || enr.userId;
        if (!uid) continue;

        const subDetail = activityTitle
          ? ` para la actividad "${activityTitle}"`
          : courseName
          ? ` para el curso "${courseName}"`
          : '';

        await this.sendNotification({
          id: `notif_${uid}_RESOURCE_PUBLISHED_${resourceId}`,
          userId: uid,
          title: 'Nuevo material pedagógico disponible',
          message: `${senderName ? `${senderName} ha publicado` : 'Se ha publicado'} el recurso "${resourceTitle}"${subDetail}. Consulta la biblioteca de recursos.`,
          type: 'RESOURCE_PUBLISHED',
          relatedId: resourceId,
          relatedType: 'resource',
          metadata: {
            resourceId,
            resourceTitle,
            fichaId,
            courseName,
            activityTitle,
          },
        });
      }
    } catch (err) {
      console.warn('[notificationService] Error notificando publicación de recurso:', err);
    }
  },

  /**
   * Evento: Reenvío de evidencia tras corrección (EVIDENCE_RESUBMITTED)
   * Destinatario: Instructor de la ficha
   */
  async notifyResubmission(payload: {
    submissionId: string;
    activityId: string;
    activityTitle?: string;
    instructorId?: string;
    learnerName?: string;
    learnerId?: string;
    newVersion: number;
    fichaId?: string;
  }): Promise<void> {
    const { submissionId, activityId, activityTitle, instructorId, learnerName, learnerId, newVersion, fichaId } = payload;

    const instructorsToNotify = new Set<string>();
    if (instructorId) instructorsToNotify.add(instructorId);

    if (instructorsToNotify.size === 0 && fichaId) {
      try {
        const ficha = await fichaService.getFichaById(fichaId);
        if (ficha?.instructorIds && ficha.instructorIds.length > 0) {
          ficha.instructorIds.forEach((iId) => instructorsToNotify.add(iId));
        }
      } catch (e) {
        console.warn('[notificationService] Aviso obteniendo instructores:', e);
      }
    }

    for (const instId of Array.from(instructorsToNotify)) {
      await this.sendNotification({
        id: `notif_${instId}_EVIDENCE_RESUBMITTED_${submissionId}_v${newVersion}`,
        userId: instId,
        title: `Reenvío de evidencia (v${newVersion})`,
        message: `${learnerName || 'Un aprendiz'} radicó la versión ${newVersion} corregida para "${activityTitle || 'la actividad'}".`,
        type: 'EVIDENCE_RESUBMITTED',
        relatedId: submissionId,
        relatedType: 'submission',
        metadata: {
          activityId,
          learnerId,
          newVersion,
          fichaId,
        },
      });
    }
  },

  /**
   * Evento: Anuncio institucional publicado (ANNOUNCEMENT_PUBLISHED)
   * Destinatarios: Aprendices destinatarios
   */
  async notifyAnnouncementPublished(payload: {
    announcementId: string;
    title: string;
    message: string;
    targetUserIds: string[];
    creatorName?: string;
  }): Promise<void> {
    const { announcementId, title, message, targetUserIds, creatorName } = payload;

    for (const uid of targetUserIds) {
      await this.sendNotification({
        id: `notif_${uid}_ANNOUNCEMENT_PUBLISHED_${announcementId}`,
        userId: uid,
        title: `Nuevo anuncio: ${title}`,
        message: message.length > 140 ? `${message.slice(0, 137)}...` : message,
        type: 'ANNOUNCEMENT_PUBLISHED',
        relatedId: announcementId,
        relatedType: 'announcement',
        metadata: { creatorName },
      });
    }
  },

  /**
   * Evento: Registro de inasistencia o tardanza (ATTENDANCE_ABSENCE / ATTENDANCE_LATE)
   * Destinatario: Aprendiz
   */
  async notifyAttendance(payload: {
    attendanceId: string;
    userId: string;
    status: 'INASISTENCIA' | 'TARDANZA' | 'absent' | 'late' | 'AUSENTE' | 'TARDE' | string;
    date: string;
    fichaId?: string;
  }): Promise<void> {
    const { attendanceId, userId, status, date, fichaId } = payload;
    const isAbsence = status === 'INASISTENCIA' || status === 'absent' || status === 'AUSENTE';
    const type: NotificationType = isAbsence ? 'ATTENDANCE_ABSENCE' : 'ATTENDANCE_LATE';
    const title = isAbsence ? 'Inasistencia registrada' : 'Llegada tardía registrada';
    const message = isAbsence
      ? `Se registró una inasistencia el día ${date}. Si cuentas con soporte médico o laboral, radica tu justificación.`
      : `Se registró una llegada tardía el día ${date}. Procura ingresar puntualmente a tus sesiones formativas.`;

    await this.sendNotification({
      id: `notif_${userId}_${type}_${attendanceId}`,
      userId,
      title,
      message,
      type,
      relatedId: attendanceId,
      relatedType: 'attendance',
      metadata: { date, fichaId, status },
    });
  },

  /**
   * Evento: Llamado de atención institucional (ATTENTION_CALL)
   * Destinatario: Aprendiz
   */
  async notifyAttentionCall(payload: {
    callId: string;
    userId: string;
    callType: string;
    reason: string;
  }): Promise<void> {
    const { callId, userId, callType, reason } = payload;

    await this.sendNotification({
      id: `notif_${userId}_ATTENTION_CALL_${callId}`,
      userId,
      title: `Llamado de atención: ${callType}`,
      message: `${reason}. Consulta los detalles y radica tus descargos o justificación en caso de ser necesario.`,
      type: 'ATTENTION_CALL',
      relatedId: callId,
      relatedType: 'attention_call',
      metadata: { callType },
    });
  },

  /**
   * Evento: Restricción académica aplicada (ACADEMIC_RESTRICTION)
   * Destinatario: Aprendiz
   */
  async notifyAcademicRestriction(payload: {
    restrictionId: string;
    userId: string;
    restrictionType: string;
    reason: string;
  }): Promise<void> {
    const { restrictionId, userId, restrictionType, reason } = payload;

    await this.sendNotification({
      id: `notif_${userId}_ACADEMIC_RESTRICTION_${restrictionId}`,
      userId,
      title: 'Restricción académica activa',
      message: `Se aplicó una medida de tipo ${restrictionType}: ${reason}. Revisa tu estado con el instructor.`,
      type: 'ACADEMIC_RESTRICTION',
      relatedId: restrictionId,
      relatedType: 'restriction',
      metadata: { restrictionType },
    });
  },

  /**
   * Evento: Justificación radicada por aprendiz (JUSTIFICATION_RECEIVED)
   * Destinatario: Instructor de la ficha
   */
  async notifyJustificationReceived(payload: {
    justificationId: string;
    apprenticeId: string;
    apprenticeName?: string;
    attendanceDate?: string;
    reason: string;
    instructorId?: string;
    fichaId?: string;
  }): Promise<void> {
    const { justificationId, apprenticeId, apprenticeName, attendanceDate, reason, instructorId, fichaId } = payload;

    const instructorsToNotify = new Set<string>();
    if (instructorId) instructorsToNotify.add(instructorId);

    if (instructorsToNotify.size === 0 && fichaId) {
      try {
        const ficha = await fichaService.getFichaById(fichaId);
        if (ficha?.instructorIds && ficha.instructorIds.length > 0) {
          ficha.instructorIds.forEach((iId) => instructorsToNotify.add(iId));
        }
      } catch (e) {
        console.warn('[notificationService] Aviso obteniendo instructores:', e);
      }
    }

    for (const instId of Array.from(instructorsToNotify)) {
      await this.sendNotification({
        id: `notif_${instId}_JUSTIFICATION_RECEIVED_${justificationId}`,
        userId: instId,
        title: 'Nueva justificación radicada',
        message: `${apprenticeName || 'Un aprendiz'} radicó justificación para inasistencia del ${attendanceDate || 'periodo'}: "${reason.slice(0, 100)}".`,
        type: 'JUSTIFICATION_RECEIVED',
        relatedId: justificationId,
        relatedType: 'justification',
        metadata: { apprenticeId, fichaId },
      });
    }
  },

  /**
   * Evento: Justificación revisada / aprobada (JUSTIFICATION_APPROVED)
   * Destinatario: Aprendiz
   */
  async notifyJustificationApproved(payload: {
    justificationId: string;
    apprenticeId: string;
    status: 'ACEPTADA' | 'RECHAZADA';
    reviewComment?: string;
  }): Promise<void> {
    const { justificationId, apprenticeId, status, reviewComment } = payload;
    const isApproved = status === 'ACEPTADA';

    await this.sendNotification({
      id: `notif_${apprenticeId}_JUSTIFICATION_APPROVED_${justificationId}_${status}`,
      userId: apprenticeId,
      title: isApproved ? 'Justificación aprobada' : 'Justificación no aceptada',
      message: isApproved
        ? `Tu justificación fue aceptada por el instructor.${reviewComment ? ` Comentario: ${reviewComment}` : ''}`
        : `Tu justificación no fue aceptada.${reviewComment ? ` Motivo: ${reviewComment}` : ''}`,
      type: 'JUSTIFICATION_APPROVED',
      relatedId: justificationId,
      relatedType: 'justification',
      metadata: { status },
    });
  },

  /**
   * Evento: Ascenso de nivel formativo en gamificación (LEVEL_UP)
   * Destinatario: Aprendiz
   */
  async notifyGamificationLevelUp(payload: {
    userId: string;
    newLevel: number;
    levelTitle: string;
    xp: number;
  }): Promise<void> {
    const { userId, newLevel, levelTitle, xp } = payload;

    await this.sendNotification({
      id: `notif_${userId}_LEVEL_UP_${newLevel}`,
      userId,
      title: `¡Has subido al Nivel ${newLevel}!`,
      message: `¡Felicitaciones! Alcanzaste el nivel "${levelTitle}" con ${xp} XP acumulados.`,
      type: 'LEVEL_UP',
      relatedId: `level_${newLevel}`,
      relatedType: 'gamification',
      metadata: { newLevel, xp },
    });
  },

  /**
   * Evento: Nueva insignia desbloqueada (BADGE_EARNED)
   * Destinatario: Aprendiz
   */
  async notifyGamificationBadgeEarned(payload: {
    userId: string;
    badgeId: string;
    badgeName: string;
    description: string;
    xpReward: number;
  }): Promise<void> {
    const { userId, badgeId, badgeName, description, xpReward } = payload;

    await this.sendNotification({
      id: `notif_${userId}_BADGE_EARNED_${badgeId}`,
      userId,
      title: `¡Insignia obtenida: ${badgeName}!`,
      message: `${description} (+${xpReward} XP)`,
      type: 'BADGE_EARNED',
      relatedId: badgeId,
      relatedType: 'gamification',
      metadata: { badgeId, xpReward },
    });
  },

  /**
   * Evento: Logro formativo alcanzado (ACHIEVEMENT_EARNED)
   * Destinatario: Aprendiz
   */
  async notifyGamificationAchievementEarned(payload: {
    userId: string;
    achievementId: string;
    title: string;
    description: string;
    xpReward: number;
  }): Promise<void> {
    const { userId, achievementId, title, description, xpReward } = payload;

    await this.sendNotification({
      id: `notif_${userId}_ACHIEVEMENT_EARNED_${achievementId}`,
      userId,
      title: `¡Logro completado: ${title}!`,
      message: `${description} (+${xpReward} XP)`,
      type: 'ACHIEVEMENT_EARNED',
      relatedId: achievementId,
      relatedType: 'gamification',
      metadata: { achievementId, xpReward },
    });
  },
};
