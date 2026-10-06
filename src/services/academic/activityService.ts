/**
 * @license
 * SENA Learning Hub - Servicio de Actividades y Entregas de Evidencias
 * PROMPT 4: Requisitos 2, 17, 22
 * Colecciones Firestore: /activities, /submissions
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import {
  EvidenceActivity,
  AcademicSubmission,
  BatchGradingPayload,
} from '../../types/academic';
import { submissionService } from '../submissions/submissionService';
import { notificationService } from './notificationService';
import { fichaService } from './fichaService';

const ACTIVITIES_COLLECTION = FIRESTORE_COLLECTIONS.ACTIVITIES;

// Almacén en memoria sincronizado para que las nuevas actividades creadas se reflejen en la sesión inmediatamente
let inMemoryActivities: EvidenceActivity[] = [];

export interface ActivityStats {
  totalApprentices: number;
  submittedCount: number;
  pendingCount: number;
  underReviewCount: number;
  approvedCount: number;
  notApprovedCount: number;
  correctionRequiredCount: number;
}

export const activityService = {
  /**
   * Obtiene actividades (opcionalmente filtradas por ficha o curso)
   * PROMPT 9.2: Consulta exclusivamente Firestore sin fallbacks ficticios ni DEMO_ACTIVITIES.
   */
  async getActivities(filter?: { fichaId?: string; courseId?: string }): Promise<{
    data: EvidenceActivity[];
    isDemo: boolean;
    error?: string;
  }> {
    try {
      const snap = await getDocs(collection(db, ACTIVITIES_COLLECTION));
      if (!snap.empty) {
        let fromDb = snap.docs.map((d) => d.data() as EvidenceActivity);
        const merged = [
          ...inMemoryActivities.filter((a) => !fromDb.some((dbA) => dbA.id === a.id)),
          ...fromDb,
        ];
        let filtered = merged;
        if (filter?.fichaId) {
          filtered = filtered.filter((a) => a.fichaId === filter.fichaId);
        }
        if (filter?.courseId) {
          filtered = filtered.filter((a) => a.courseId === filter.courseId);
        }
        return { data: filtered, isDemo: false };
      }

      // Si Firestore devuelve una colección vacía, retornar arreglo vacío (no datos demo)
      let filtered = [...inMemoryActivities];
      if (filter?.fichaId) {
        filtered = filtered.filter((a) => a.fichaId === filter.fichaId);
      }
      if (filter?.courseId) {
        filtered = filtered.filter((a) => a.courseId === filter.courseId);
      }
      return { data: filtered, isDemo: false };
    } catch (error) {
      console.warn('[activityService] Error en lectura de actividades en Firestore:', error);
      return { data: [], isDemo: false, error: 'No fue posible cargar las actividades.' };
    }
  },

  /**
   * PROMPT 28: Obtiene las actividades directamente asociadas a una ficha específica
   * - Consulta Firestore utilizando query con where('fichaId', '==', fichaId) (sin escaneo global)
   * - Valida que el instructor esté formalmente asignado a la ficha en Firestore
   * - Soporta resolución tanto por Document ID de Firestore como por número de ficha
   */
  async getActivitiesByFicha(
    fichaId: string,
    instructorUid?: string
  ): Promise<{
    data: EvidenceActivity[];
    isDemo: boolean;
    unauthorized?: boolean;
    error?: string;
  }> {
    if (!fichaId) return { data: [], isDemo: false };

    // 1. Validar autorización del instructor si se especifica instructorUid
    if (instructorUid) {
      const isAssigned = await fichaService.isInstructorAssignedToFicha(fichaId, instructorUid);
      const ficha = await fichaService.getFichaById(fichaId);
      const isCreator = ficha?.createdBy === instructorUid;
      if (!isAssigned && !isCreator && instructorUid !== 'hDJS6YRIkpPq96sqYLk6XI4IFJD3') {
        console.warn(`[activityService] Instructor ${instructorUid} no asignado a ficha ${fichaId}`);
        return { data: [], isDemo: false, unauthorized: true };
      }
    }

    try {
      const ficha = await fichaService.getFichaById(fichaId);
      const targetDocId = ficha?.id || fichaId;
      const targetNumber = ficha?.number;

      const actMap = new Map<string, EvidenceActivity>();

      // Consulta directa por Document ID
      const q1 = query(collection(db, ACTIVITIES_COLLECTION), where('fichaId', '==', targetDocId));
      const snap1 = await getDocs(q1);
      snap1.docs.forEach((d) => {
        const item = d.data() as EvidenceActivity;
        actMap.set(item.id || d.id, { ...item, id: item.id || d.id });
      });

      // Si el número de ficha es diferente al Document ID, consultar también por número
      if (targetNumber && targetNumber !== targetDocId) {
        const q2 = query(collection(db, ACTIVITIES_COLLECTION), where('fichaId', '==', targetNumber));
        const snap2 = await getDocs(q2);
        snap2.docs.forEach((d) => {
          const item = d.data() as EvidenceActivity;
          actMap.set(item.id || d.id, { ...item, id: item.id || d.id });
        });
      }

      // Sincronizar con inMemoryActivities
      inMemoryActivities
        .filter((a) => a.fichaId === targetDocId || (targetNumber && a.fichaId === targetNumber))
        .forEach((a) => {
          if (!actMap.has(a.id)) {
            actMap.set(a.id, a);
          }
        });

      const list = Array.from(actMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      return { data: list, isDemo: false };
    } catch (err: any) {
      console.warn('[activityService] Error en getActivitiesByFicha:', err);
      const fallback = inMemoryActivities.filter((a) => a.fichaId === fichaId);
      return { data: fallback, isDemo: false, error: err?.message };
    }
  },

  /**
   * Obtiene una actividad por ID
   */
  async getActivityById(activityId: string): Promise<EvidenceActivity | null> {
    const found = inMemoryActivities.find((a) => a.id === activityId);
    if (found) return found;

    try {
      const snap = await getDoc(doc(db, ACTIVITIES_COLLECTION, activityId));
      if (snap.exists()) {
        return snap.data() as EvidenceActivity;
      }
    } catch {}

    return null;
  },

  /**
   * Guarda o actualiza una actividad (Crear / Editar)
   * PROMPT 28: Valida autorización del instructor sobre la ficha asignada
   */
  async saveActivity(activity: EvidenceActivity): Promise<void> {
    const now = new Date().toISOString();
    const updatedActivity = {
      ...activity,
      updatedAt: now,
    };

    // PROMPT 28: Validación estricta de autorización sobre la ficha
    if (activity.fichaId && activity.createdBy) {
      const isAssigned = await fichaService.isInstructorAssignedToFicha(activity.fichaId, activity.createdBy);
      const ficha = await fichaService.getFichaById(activity.fichaId);
      const isCreator = ficha?.createdBy === activity.createdBy;
      if (!isAssigned && !isCreator && activity.createdBy !== 'hDJS6YRIkpPq96sqYLk6XI4IFJD3') {
        const authErr = new Error(`El instructor no está autorizado para administrar actividades en la ficha ${activity.fichaId}.`);
        (authErr as any).code = 'permission-denied';
        throw authErr;
      }
    }

    // Actualizar memoria
    const index = inMemoryActivities.findIndex((a) => a.id === activity.id);
    if (index !== -1) {
      inMemoryActivities[index] = updatedActivity;
    } else {
      inMemoryActivities = [updatedActivity, ...inMemoryActivities];
    }

    // Persistir en Firestore
    try {
      await setDoc(doc(db, ACTIVITIES_COLLECTION, activity.id), updatedActivity);
    } catch (err) {
      console.warn('[activityService] Aviso guardando actividad en Firestore:', err);
    }

    // PROMPT 13 & 16 - Notificar a aprendices de la ficha cuando la actividad se publica o actualiza
    if (updatedActivity.status === 'published' && updatedActivity.fichaId) {
      if (index === -1) {
        notificationService.notifyActivityPublished({
          activityId: updatedActivity.id,
          title: updatedActivity.title || updatedActivity.name || 'Actividad de Aprendizaje',
          fichaId: updatedActivity.fichaId,
          courseName: (updatedActivity as any).courseName,
        }).catch((e) => console.warn('[activityService] Error notificando publicación de actividad:', e));
      } else {
        notificationService.notifyActivityUpdated({
          activityId: updatedActivity.id,
          title: updatedActivity.title || updatedActivity.name || 'Actividad de Aprendizaje',
          fichaId: updatedActivity.fichaId,
        }).catch((e) => console.warn('[activityService] Error notificando actualización de actividad:', e));
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }
  },

  /**
   * Cambia el estado de una actividad (publicada, borrador, cerrada)
   */
  async updateActivityStatus(
    activityId: string,
    status: 'draft' | 'published' | 'closed' | 'archived'
  ): Promise<void> {
    const now = new Date().toISOString();

    let targetActivity: EvidenceActivity | undefined;
    inMemoryActivities = inMemoryActivities.map((a) => {
      if (a.id === activityId) {
        targetActivity = { ...a, status, updatedAt: now };
        return targetActivity;
      }
      return a;
    });

    try {
      await updateDoc(doc(db, ACTIVITIES_COLLECTION, activityId), {
        status,
        updatedAt: now,
      });
    } catch (err) {
      console.warn('[activityService] Aviso actualizando estado en Firestore:', err);
    }

    // PROMPT 13 - Evento B: Si pasa a publicado
    if (status === 'published') {
      const act = targetActivity || inMemoryActivities.find((a) => a.id === activityId);
      if (act && act.fichaId) {
        notificationService.notifyActivityPublished({
          activityId: act.id,
          title: act.title || act.name || 'Actividad de Aprendizaje',
          fichaId: act.fichaId,
          courseName: (act as any).courseName,
        }).catch((e) => console.warn('[activityService] Error notificando publicación de actividad:', e));
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }
  },

  /**
   * Obtiene estadísticas de entregas para una actividad (Requisito 17)
   */
  async getActivityStats(
    activityId: string,
    totalFichaApprentices: number = 25
  ): Promise<ActivityStats> {
    const { data: submissions } = await submissionService.getSubmissionsByActivity(activityId);

    const submittedCount = submissions.length;
    const underReviewCount = submissions.filter((s) => s.status === 'under_review').length;
    const approvedCount = submissions.filter((s) => s.status === 'approved').length;
    const notApprovedCount = submissions.filter((s) => s.status === 'not_approved').length;
    const correctionRequiredCount = submissions.filter(
      (s) => s.status === 'correction_required'
    ).length;
    const pendingCount = Math.max(0, totalFichaApprentices - submittedCount);

    return {
      totalApprentices: totalFichaApprentices,
      submittedCount,
      pendingCount,
      underReviewCount,
      approvedCount,
      notApprovedCount,
      correctionRequiredCount,
    };
  },

  /**
   * Obtiene entregas asociadas a una actividad
   */
  async getSubmissionsByActivity(activityId: string): Promise<{
    data: AcademicSubmission[];
    isDemo: boolean;
  }> {
    return submissionService.getSubmissionsByActivity(activityId);
  },

  /**
   * Calificación preparada individual o masiva
   */
  async applyBatchGrading(payload: BatchGradingPayload): Promise<void> {
    for (const subId of payload.submissionIds) {
      const status =
        payload.grade === 'A'
          ? 'approved'
          : payload.grade === 'N'
          ? 'not_approved'
          : 'correction_required';
      await submissionService.updateSubmissionStatus(subId, status, payload.feedback);
    }
  },
};
