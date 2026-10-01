/**
 * @license
 * SENA Learning Hub - Servicio de Programas de Formación
 * Colección Firestore: /trainingPrograms
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
import { TrainingProgram } from '../../types/academic';
import { DEMO_PROGRAMS } from '../../data/academicMockData';

const COLLECTION = FIRESTORE_COLLECTIONS.TRAINING_PROGRAMS;

export const programService = {
  /**
   * Obtiene todos los programas de formación
   */
  async getPrograms(centerId?: string): Promise<{ data: TrainingProgram[]; isDemo: boolean }> {
    try {
      let q = collection(db, COLLECTION);
      const snap = centerId
        ? await getDocs(query(q, where('centerId', '==', centerId)))
        : await getDocs(q);

      if (!snap.empty) {
        const programs = snap.docs.map((d) => d.data() as TrainingProgram);
        return { data: programs, isDemo: false };
      }
    } catch (error) {
      console.warn('[programService] Lectura de Firestore, usando datos base:', error);
    }
    const filtered = centerId
      ? DEMO_PROGRAMS.filter((p) => p.centerId === centerId)
      : DEMO_PROGRAMS;
    return { data: filtered, isDemo: true };
  },

  /**
   * Obtiene un programa de formación por ID
   */
  async getProgramById(id: string): Promise<TrainingProgram | null> {
    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (snap.exists()) {
        return snap.data() as TrainingProgram;
      }
    } catch (error) {
      console.warn(`[programService] Programa ${id} no encontrado en Firestore:`, error);
    }
    const found = DEMO_PROGRAMS.find((p) => p.id === id);
    return found || null;
  },

  /**
   * Guarda o actualiza un programa
   */
  async saveProgram(program: TrainingProgram): Promise<void> {
    await setDoc(doc(db, COLLECTION, program.id), {
      ...program,
      updatedAt: new Date().toISOString(),
    });
  },
};
