/**
 * @license
 * SENA Learning Hub - Servicio de Anuncios Institucionales
 * Colección Firestore: /announcements
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import { Announcement, AnnouncementStatus } from '../../types/academic';
import { notificationService } from './notificationService';
import { enrollmentService } from './enrollmentService';

const COLLECTION = FIRESTORE_COLLECTIONS.ANNOUNCEMENTS || 'announcements';

// Cache en memoria
let inMemoryAnnouncements: Announcement[] = [];
// Conjunto de anuncios leídos por usuario (en memoria y Firestore)
const readAnnouncementsByUser: Record<string, Set<string>> = {};

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

export const announcementService = {
  /**
   * Guarda o actualiza un anuncio en Firestore
   * Si pasa a estado PUBLISHED, despacha notificaciones automáticas a los destinatarios reales
   */
  async saveAnnouncement(
    announcementData: Partial<Announcement> & {
      title: string;
      message: string;
      createdBy: string;
      creatorName: string;
      creatorEmail?: string;
    }
  ): Promise<Announcement> {
    const now = new Date().toISOString();
    const id = announcementData.id || `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const status: AnnouncementStatus = announcementData.status || 'PUBLISHED';
    const isNewPublish = status === 'PUBLISHED';

    const fullAnnouncement: Announcement = {
      id,
      title: announcementData.title.trim(),
      message: announcementData.message.trim(),
      createdBy: announcementData.createdBy,
      creatorName: announcementData.creatorName || 'Instructor SENA',
      creatorEmail: announcementData.creatorEmail || '',
      targetType: announcementData.targetType || 'FICHA',
      targetIds: announcementData.targetIds || [],
      programIds: announcementData.programIds || [],
      fichaIds: announcementData.fichaIds || [],
      courseIds: announcementData.courseIds || [],
      priority: announcementData.priority || 'NORMAL',
      status,
      publishedAt: announcementData.publishedAt || (status === 'PUBLISHED' ? now : ''),
      expiresAt: announcementData.expiresAt,
      createdAt: announcementData.createdAt || now,
      updatedAt: now,
    };

    // Actualizar memoria
    const idx = inMemoryAnnouncements.findIndex((a) => a.id === id);
    if (idx !== -1) {
      inMemoryAnnouncements[idx] = fullAnnouncement;
    } else {
      inMemoryAnnouncements = [fullAnnouncement, ...inMemoryAnnouncements];
    }

    // Persistir en Firestore
    try {
      await setDoc(doc(db, COLLECTION, id), cleanUndefined(fullAnnouncement), { merge: true });
    } catch (err) {
      console.warn('[announcementService] Error guardando anuncio en Firestore:', err);
    }

    // Despachar notificaciones automáticas si está publicado
    if (isNewPublish) {
      this.dispatchAnnouncementNotifications(fullAnnouncement).catch((e) =>
        console.warn('[announcementService] Error despachando notificaciones:', e)
      );
    }

    return fullAnnouncement;
  },

  /**
   * Despacha notificaciones a los destinatarios reales de un anuncio publicado
   */
  async dispatchAnnouncementNotifications(announcement: Announcement): Promise<void> {
    try {
      const recipientUserIds = new Set<string>();

      if (announcement.targetType === 'USER') {
        announcement.targetIds.forEach((uid) => recipientUserIds.add(uid));
      } else if (announcement.targetType === 'FICHA') {
        const fichasToQuery = announcement.fichaIds?.length
          ? announcement.fichaIds
          : announcement.targetIds;

        for (const fId of fichasToQuery) {
          const enrollmentsRes = await enrollmentService.getEnrollmentsByFicha(fId);
          enrollmentsRes.data.forEach((enr) => {
            if (enr.apprenticeId) recipientUserIds.add(enr.apprenticeId);
            if (enr.userId) recipientUserIds.add(enr.userId);
          });
        }
      } else if (announcement.targetType === 'PROGRAM') {
        const progsToQuery = announcement.programIds?.length
          ? announcement.programIds
          : announcement.targetIds;

        const allEnrollments = await enrollmentService.getEnrollments();
        allEnrollments.data.forEach((enr) => {
          if (progsToQuery.includes(enr.programId)) {
            if (enr.apprenticeId) recipientUserIds.add(enr.apprenticeId);
            if (enr.userId) recipientUserIds.add(enr.userId);
          }
        });
      }

      // Enviar notificación a cada usuario destinatario con ID idempotente
      for (const uid of Array.from(recipientUserIds)) {
        await notificationService.sendNotification({
          id: `notif_${uid}_ann_${announcement.id}`,
          userId: uid,
          recipientUserId: uid,
          title: `Aviso institucional: ${announcement.title}`,
          message:
            announcement.message.length > 140
              ? `${announcement.message.slice(0, 137)}...`
              : announcement.message,
          description: announcement.message,
          type: 'ANNOUNCEMENT',
          relatedId: announcement.id,
          relatedType: 'announcement',
          metadata: {
            priority: announcement.priority,
            creatorName: announcement.creatorName,
          },
        });
      }
    } catch (err) {
      console.warn('[announcementService] Error en dispatchAnnouncementNotifications:', err);
    }
  },

  /**
   * Obtiene todos los anuncios creados por un instructor
   */
  async getAnnouncementsForInstructor(instructorUid: string): Promise<Announcement[]> {
    try {
      const q = query(collection(db, COLLECTION), where('createdBy', '==', instructorUid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => d.data() as Announcement);
        fromDb.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Mezclar con memoria
        fromDb.forEach((a) => {
          if (!inMemoryAnnouncements.some((m) => m.id === a.id)) {
            inMemoryAnnouncements.push(a);
          }
        });
        return fromDb;
      }
    } catch (err) {
      console.warn('[announcementService] Error consultando anuncios del instructor:', err);
    }

    return inMemoryAnnouncements
      .filter((a) => a.createdBy === instructorUid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Obtiene los anuncios públicos dirigidos a un aprendiz según sus relaciones curriculares reales
   */
  async getAnnouncementsForLearner(params: {
    userId: string;
    fichaId?: string;
    programId?: string;
    courseIds?: string[];
  }): Promise<Announcement[]> {
    const { userId, fichaId, programId, courseIds = [] } = params;

    let allPublished: Announcement[] = [];
    try {
      const q = query(collection(db, COLLECTION), where('status', '==', 'PUBLISHED'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        allPublished = snap.docs.map((d) => d.data() as Announcement);
      }
    } catch (err) {
      console.warn('[announcementService] Error consultando anuncios publicados en Firestore:', err);
    }

    // Combinar con memoria
    inMemoryAnnouncements.forEach((m) => {
      if (m.status === 'PUBLISHED' && !allPublished.some((a) => a.id === m.id)) {
        allPublished.push(m);
      }
    });

    // Filtrar estrictamente por destinatarios correspondientes al aprendiz
    const targeted = allPublished.filter((ann) => {
      if (ann.targetType === 'ALL') return true;
      if (ann.targetType === 'USER' && ann.targetIds.includes(userId)) return true;
      if (fichaId) {
        if (
          ann.targetType === 'FICHA' &&
          (ann.targetIds.includes(fichaId) || ann.fichaIds?.includes(fichaId))
        ) {
          return true;
        }
      }
      if (programId) {
        if (
          ann.targetType === 'PROGRAM' &&
          (ann.targetIds.includes(programId) || ann.programIds?.includes(programId))
        ) {
          return true;
        }
      }
      if (courseIds.length > 0 && ann.targetType === 'COURSE') {
        const matches = ann.courseIds?.some((c) => courseIds.includes(c)) ||
                        ann.targetIds.some((c) => courseIds.includes(c));
        if (matches) return true;
      }
      return false;
    });

    // Ordenar: primero no leídos, luego los más recientes
    const readSet = readAnnouncementsByUser[userId] || new Set<string>();
    return targeted.sort((a, b) => {
      const aRead = readSet.has(a.id);
      const bRead = readSet.has(b.id);
      if (aRead !== bRead) {
        return aRead ? 1 : -1; // No leídos primero
      }
      return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
    });
  },

  /**
   * Marca un anuncio como leído por el usuario actual
   */
  async markAnnouncementAsRead(announcementId: string, userId: string): Promise<void> {
    if (!readAnnouncementsByUser[userId]) {
      readAnnouncementsByUser[userId] = new Set<string>();
    }
    readAnnouncementsByUser[userId].add(announcementId);

    // También marcar la notificación asociada como leída
    await notificationService.markAsRead(`notif_${userId}_ann_${announcementId}`);
  },

  /**
   * Archiva un anuncio
   */
  async archiveAnnouncement(announcementId: string): Promise<void> {
    const ann = inMemoryAnnouncements.find((a) => a.id === announcementId);
    if (ann) ann.status = 'ARCHIVED';

    try {
      await setDoc(doc(db, COLLECTION, announcementId), { status: 'ARCHIVED', updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('[announcementService] Error archivando anuncio:', err);
    }
  },

  /**
   * Elimina un anuncio
   */
  async deleteAnnouncement(announcementId: string): Promise<void> {
    inMemoryAnnouncements = inMemoryAnnouncements.filter((a) => a.id !== announcementId);
    try {
      await deleteDoc(doc(db, COLLECTION, announcementId));
    } catch (err) {
      console.warn('[announcementService] Error eliminando anuncio:', err);
    }
  },
};
