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

const COLLECTION = FIRESTORE_COLLECTIONS.TRAINING_PROGRAMS;

let inMemoryPrograms: TrainingProgram[] = [];

export const programService = {
  /**
   * Obtiene todos los programas de formación desde Firestore
   */
  async getPrograms(centerId?: string): Promise<{ data: TrainingProgram[]; isDemo: boolean }> {
    try {
      let q = collection(db, COLLECTION);
      const snap = centerId
        ? await getDocs(query(q, where('centerId', '==', centerId)))
        : await getDocs(q);

      if (!snap.empty) {
        const programs = snap.docs.map((d) => d.data() as TrainingProgram);
        const map = new Map<string, TrainingProgram>();
        programs.forEach((p) => map.set(p.id, p));
        inMemoryPrograms.forEach((p) => {
          if (!map.has(p.id)) map.set(p.id, p);
        });
        const combined = Array.from(map.values());
        const filtered = centerId ? combined.filter((p) => p.centerId === centerId) : combined;
        return { data: filtered, isDemo: false };
      }
    } catch (error) {
      console.warn('[programService] Lectura de Firestore en trainingPrograms:', error);
    }

    const filtered = centerId
      ? inMemoryPrograms.filter((p) => p.centerId === centerId)
      : inMemoryPrograms;
    return { data: filtered, isDemo: false };
  },

  /**
   * Obtiene un programa de formación por ID
   */
  async getProgramById(id: string): Promise<TrainingProgram | null> {
    const memoryFound = inMemoryPrograms.find((p) => p.id === id);
    if (memoryFound) return memoryFound;

    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (snap.exists()) {
        const prog = snap.data() as TrainingProgram;
        if (!inMemoryPrograms.some((p) => p.id === prog.id)) {
          inMemoryPrograms.push(prog);
        }
        return prog;
      }
    } catch (error) {
      console.warn(`[programService] Programa ${id} no encontrado en Firestore:`, error);
    }
    return null;
  },

  /**
   * Guarda o actualiza un programa en Firestore y memoria
   */
  async saveProgram(program: TrainingProgram): Promise<TrainingProgram> {
    const now = new Date().toISOString();
    const updated: TrainingProgram = {
      ...program,
      createdAt: program.createdAt || now,
      updatedAt: now,
    };

    const idx = inMemoryPrograms.findIndex((p) => p.id === program.id);
    if (idx !== -1) {
      inMemoryPrograms[idx] = updated;
    } else {
      inMemoryPrograms = [updated, ...inMemoryPrograms];
    }

    try {
      await setDoc(doc(db, COLLECTION, program.id), updated, { merge: true });
    } catch (err) {
      console.warn('[programService] Aviso al persistir programa en Firestore:', err);
    }

    return updated;
  },
};
