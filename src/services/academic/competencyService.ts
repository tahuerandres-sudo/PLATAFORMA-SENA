/**
 * @license
 * SENA Learning Hub - Servicio de Competencias
 * PROMPT 8: Estructura Académica SENA - Colección Firestore: /competencies
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
import { Competency } from '../../types/academic';
import { DEMO_COMPETENCIES } from '../../data/academicMockData';

const COLLECTION = FIRESTORE_COLLECTIONS.COMPETENCIES;

let inMemoryCompetencies: Competency[] = [...DEMO_COMPETENCIES];

export const competencyService = {
  /**
   * Obtiene competencias (opcionalmente filtradas por programa, curso o ficha)
   */
  async getCompetencies(filter?: {
    programId?: string;
    courseId?: string;
    fichaId?: string;
  }): Promise<{
    data: Competency[];
    isDemo: boolean;
  }> {
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      if (!snap.empty) {
        let results = snap.docs.map((d) => d.data() as Competency);

        // Combinar con recientes en memoria
        const merged = [
          ...inMemoryCompetencies.filter((c) => !results.some((r) => r.id === c.id)),
          ...results,
        ];

        let filtered = merged;
        if (filter?.programId && filter.programId !== 'all') {
          filtered = filtered.filter(
            (c) => c.programId === filter.programId || !c.programId
          );
        }
        if (filter?.courseId && filter.courseId !== 'all') {
          filtered = filtered.filter((c) => c.courseId === filter.courseId);
        }
        if (filter?.fichaId && filter.fichaId !== 'all') {
          filtered = filtered.filter((c) => c.fichaId === filter.fichaId || !c.fichaId);
        }

        return { data: filtered, isDemo: false };
      }
    } catch (error) {
      console.warn('[competencyService] Lectura de competencias:', error);
    }

    let demo = [...inMemoryCompetencies];
    if (filter?.programId && filter.programId !== 'all') {
      demo = demo.filter((c) => c.programId === filter.programId || !c.programId);
    }
    if (filter?.courseId && filter.courseId !== 'all') {
      demo = demo.filter((c) => c.courseId === filter.courseId);
    }
    if (filter?.fichaId && filter.fichaId !== 'all') {
      demo = demo.filter((c) => c.fichaId === filter.fichaId || !c.fichaId);
    }
    return { data: demo, isDemo: true };
  },

  /**
   * Obtiene una competencia por ID
   */
  async getCompetencyById(id: string): Promise<Competency | null> {
    const memoryFound = inMemoryCompetencies.find((c) => c.id === id);
    if (memoryFound) return memoryFound;

    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (snap.exists()) {
        return snap.data() as Competency;
      }
    } catch (error) {
      console.warn(`[competencyService] Error consultando competencia ${id}:`, error);
    }

    return null;
  },

  /**
   * Guarda o actualiza una competencia en Firestore y memoria
   */
  async saveCompetency(competency: Competency): Promise<Competency> {
    const now = new Date().toISOString();
    const updated: Competency = {
      ...competency,
      updatedAt: now,
      createdAt: competency.createdAt || now,
    };

    const idx = inMemoryCompetencies.findIndex((c) => c.id === competency.id);
    if (idx !== -1) {
      inMemoryCompetencies[idx] = updated;
    } else {
      inMemoryCompetencies = [updated, ...inMemoryCompetencies];
    }

    try {
      await setDoc(doc(db, COLLECTION, competency.id), updated, { merge: true });
    } catch (err) {
      console.warn('[competencyService] Aviso guardando en Firestore:', err);
    }

    return updated;
  },
};
