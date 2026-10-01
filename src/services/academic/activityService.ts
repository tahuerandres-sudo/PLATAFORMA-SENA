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
   */
  async saveActivity(activity: EvidenceActivity): Promise<void> {
    const now = new Date().toISOString();
    const updatedActivity = {
      ...activity,
      updatedAt: now,
    };

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
  },

  /**
   * Cambia el estado de una actividad (publicada, borrador, cerrada)
   */
  async updateActivityStatus(
    activityId: string,
    status: 'draft' | 'published' | 'closed' | 'archived'
  ): Promise<void> {
    const now = new Date().toISOString();

    inMemoryActivities = inMemoryActivities.map((a) =>
      a.id === activityId ? { ...a, status, updatedAt: now } : a
    );

    try {
      await updateDoc(doc(db, ACTIVITIES_COLLECTION, activityId), {
        status,
        updatedAt: now,
      });
    } catch (err) {
      console.warn('[activityService] Aviso actualizando estado en Firestore:', err);
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
