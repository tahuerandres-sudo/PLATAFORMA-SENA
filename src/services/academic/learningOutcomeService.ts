/**
 * @license
 * SENA Learning Hub - Servicio de Resultados de Aprendizaje (RAP)
 * PROMPT 8: Estructura Académica SENA - Colección Firestore: /learningOutcomes
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import { LearningOutcome } from '../../types/academic';
import { DEMO_LEARNING_OUTCOMES } from '../../data/academicMockData';

const COLLECTION = FIRESTORE_COLLECTIONS.LEARNING_OUTCOMES;

let inMemoryOutcomes: LearningOutcome[] = [...DEMO_LEARNING_OUTCOMES];

export const learningOutcomeService = {
  /**
   * Obtiene los resultados de aprendizaje (ordenados por secuencia pedagógica)
   */
  async getLearningOutcomes(filter?: {
    competencyId?: string;
    programId?: string;
    courseId?: string;
  } | string): Promise<{
    data: LearningOutcome[];
    isDemo: boolean;
  }> {
    const competencyId = typeof filter === 'string' ? filter : filter?.competencyId;
    const programId = typeof filter === 'object' ? filter?.programId : undefined;
    const courseId = typeof filter === 'object' ? filter?.courseId : undefined;

    try {
      const snap = await getDocs(collection(db, COLLECTION));
      if (!snap.empty) {
        let results = snap.docs.map((d) => d.data() as LearningOutcome);

        const merged = [
          ...inMemoryOutcomes.filter((o) => !results.some((r) => r.id === o.id)),
          ...results,
        ];

        let filtered = merged;
        if (competencyId && competencyId !== 'all') {
          filtered = filtered.filter((r) => r.competencyId === competencyId);
        }
        if (programId && programId !== 'all') {
          filtered = filtered.filter((r) => r.programId === programId || !r.programId);
        }
        if (courseId && courseId !== 'all') {
          filtered = filtered.filter((r) => r.courseId === courseId || !r.courseId);
        }

        filtered.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        return { data: filtered, isDemo: false };
      }
    } catch (error) {
      console.warn('[learningOutcomeService] Lectura de RAPs en Firestore:', error);
    }

    let demo = [...inMemoryOutcomes];
    if (competencyId && competencyId !== 'all') {
      demo = demo.filter((r) => r.competencyId === competencyId);
    }
    if (programId && programId !== 'all') {
      demo = demo.filter((r) => r.programId === programId || !r.programId);
    }
    if (courseId && courseId !== 'all') {
      demo = demo.filter((r) => r.courseId === courseId || !r.courseId);
    }
    demo.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    return { data: demo, isDemo: true };
  },

  /**
   * Obtiene un RAP por su ID
   */
  async getLearningOutcomeById(id: string): Promise<LearningOutcome | null> {
    const memoryFound = inMemoryOutcomes.find((o) => o.id === id);
    if (memoryFound) return memoryFound;

    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (snap.exists()) {
        return snap.data() as LearningOutcome;
      }
    } catch (error) {
      console.warn(`[learningOutcomeService] Error consultando RAP ${id}:`, error);
    }

    return null;
  },

  /**
   * Guarda o actualiza un resultado de aprendizaje
   */
  async saveLearningOutcome(outcome: LearningOutcome): Promise<LearningOutcome> {
    const now = new Date().toISOString();
    const updated: LearningOutcome = {
      ...outcome,
      updatedAt: now,
      createdAt: outcome.createdAt || now,
    };

    const idx = inMemoryOutcomes.findIndex((o) => o.id === outcome.id);
    if (idx !== -1) {
      inMemoryOutcomes[idx] = updated;
    } else {
      inMemoryOutcomes = [updated, ...inMemoryOutcomes];
    }

    try {
      await setDoc(doc(db, COLLECTION, outcome.id), updated, { merge: true });
    } catch (err) {
      console.warn('[learningOutcomeService] Aviso guardando RAP en Firestore:', err);
    }

    return updated;
  },
};
