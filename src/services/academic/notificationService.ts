/**
 * @license
 * SENA Learning Hub - Servicio de Notificaciones en Tiempo Real y Firestore
 * Colección: /notifications
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import { DEMO_NOTIFICATIONS, DemoNotification } from '../../data/mockData';

export interface AppNotification {
  id: string;
  recipientUserId: string; // Ref al aprendiz o instructor
  userId?: string; // Alias
  title: string;
  description: string;
  type: 'grade' | 'activity' | 'feedback' | 'reminder' | 'announcement' | 'attention_call' | 'restriction' | 'justification';
  isRead: boolean;
  relatedId?: string; // ID del llamado de atención, entrega, etc.
  createdAt: string; // ISO-8601
  timeAgo?: string;
}

const COLLECTION = FIRESTORE_COLLECTIONS.NOTIFICATIONS;

// Cache en memoria para soporte offline
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

export const notificationService = {
  /**
   * Envía una notificación persistente a Firestore y la cachea
   */
  async sendNotification(payload: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string }): Promise<AppNotification> {
    const id = payload.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const notif: AppNotification = {
      ...payload,
      id,
      userId: payload.recipientUserId,
      isRead: false,
      createdAt: now,
      timeAgo: 'Hace un momento',
    };

    inMemoryNotifications = [notif, ...inMemoryNotifications];

    try {
      await setDoc(doc(db, COLLECTION, id), cleanUndefined(notif));
    } catch (err) {
      console.warn('[notificationService] Aviso guardando notificación en Firestore:', err);
    }

    return notif;
  },

  /**
   * Obtiene las notificaciones dirigidas a un usuario específico
   */
  async getNotifications(userId: string): Promise<AppNotification[]> {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('recipientUserId', '==', userId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => d.data() as AppNotification);
        // Ordenar por fecha descendente
        fromDb.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return fromDb;
      }
    } catch (err) {
      console.warn('[notificationService] Aviso leyendo notificaciones de Firestore:', err);
    }

    const localForUser = inMemoryNotifications.filter(
      (n) => n.recipientUserId === userId || n.userId === userId
    );

    if (localForUser.length > 0) {
      return localForUser;
    }

    // Fallback con demo enriquecido
    return DEMO_NOTIFICATIONS.map((dn) => ({
      id: dn.id,
      recipientUserId: userId,
      userId,
      title: dn.title,
      description: dn.description,
      type: dn.type,
      isRead: dn.isRead,
      createdAt: new Date().toISOString(),
      timeAgo: dn.timeAgo,
    }));
  },

  /**
   * Marca una notificación como leída
   */
  async markAsRead(id: string): Promise<void> {
    inMemoryNotifications = inMemoryNotifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    try {
      await setDoc(doc(db, COLLECTION, id), { isRead: true }, { merge: true });
    } catch (err) {
      console.warn('[notificationService] Aviso actualizando lectura en Firestore:', err);
    }
  },

  /**
   * Marca todas como leídas para un usuario
   */
  async markAllAsRead(userId: string): Promise<void> {
    inMemoryNotifications = inMemoryNotifications.map((n) =>
      n.recipientUserId === userId || n.userId === userId ? { ...n, isRead: true } : n
    );
    try {
      const q = query(collection(db, COLLECTION), where('recipientUserId', '==', userId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await setDoc(d.ref, { isRead: true }, { merge: true });
      }
    } catch (err) {
      console.warn('[notificationService] Aviso marcando todas leídas en Firestore:', err);
    }
  },
};
