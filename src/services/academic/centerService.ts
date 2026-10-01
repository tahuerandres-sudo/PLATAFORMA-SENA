/**
 * @license
 * SENA Learning Hub - Servicio de Centros de Formación
 * Colección Firestore: /trainingCenters
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
import { TrainingCenter } from '../../types/academic';
import { DEMO_TRAINING_CENTER } from '../../data/academicMockData';

const COLLECTION = FIRESTORE_COLLECTIONS.TRAINING_CENTERS;

export const centerService = {
  /**
   * Obtiene todos los centros de formación activos
   */
  async getCenters(): Promise<{ data: TrainingCenter[]; isDemo: boolean }> {
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      if (!snap.empty) {
        const centers = snap.docs.map((d) => d.data() as TrainingCenter);
        return { data: centers, isDemo: false };
      }
    } catch (error) {
      console.warn('[centerService] Lectura de Firestore, usando datos base:', error);
    }
    return { data: [DEMO_TRAINING_CENTER], isDemo: true };
  },

  /**
   * Obtiene un centro de formación por ID
   */
  async getCenterById(id: string): Promise<TrainingCenter | null> {
    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (snap.exists()) {
        return snap.data() as TrainingCenter;
      }
    } catch (error) {
      console.warn(`[centerService] Centro ${id} no encontrado en Firestore:`, error);
    }
    if (id === DEMO_TRAINING_CENTER.id) {
      return DEMO_TRAINING_CENTER;
    }
    return null;
  },

  /**
   * Guarda o actualiza un centro de formación
   */
  async saveCenter(center: TrainingCenter): Promise<void> {
    await setDoc(doc(db, COLLECTION, center.id), {
      ...center,
      updatedAt: new Date().toISOString(),
    });
  },
};
