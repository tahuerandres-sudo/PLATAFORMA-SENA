/**
 * @license
 * SENA Learning Hub - Servicio de Fichas de Formación
 * PROMPT 8: Estructura Académica SENA - Colección Firestore: /fichas
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
import { Ficha } from '../../types/academic';

const COLLECTION = FIRESTORE_COLLECTIONS.FICHAS;

let inMemoryFichas: Ficha[] = [];

export const fichaService = {
  /**
   * Obtiene la lista de fichas (opcionalmente por instructor o por programa)
   * PROMPT 9.2: Consulta real sin fallbacks ficticios ni DEMO_FICHAS.
   */
  async getFichas(
    instructorId?: string
  ): Promise<{ data: Ficha[]; isDemo: boolean; error?: string }> {
    try {
      let q = collection(db, COLLECTION);
      const snap = instructorId
        ? await getDocs(query(q, where('instructorIds', 'array-contains', instructorId)))
        : await getDocs(q);

      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => d.data() as Ficha);
        const merged = [
          ...inMemoryFichas.filter((f) => !fromDb.some((df) => df.id === f.id)),
          ...fromDb,
        ];
        const filtered = instructorId
          ? merged.filter((f) => f.instructorIds?.includes(instructorId))
          : merged;
        return { data: filtered, isDemo: false };
      }

      // Colección vacía en Firestore -> Retornar [] sin inventar datos
      const filtered = instructorId
        ? inMemoryFichas.filter((f) => f.instructorIds?.includes(instructorId))
        : inMemoryFichas;
      return { data: filtered, isDemo: false };
    } catch (error) {
      console.warn('[fichaService] Error en lectura de Firestore:', error);
      // Propagar error de manera controlada para que la UI muestre: 'No fue posible cargar las fichas.'
      return { data: [], isDemo: false, error: 'No fue posible cargar las fichas.' };
    }
  },

  /**
   * Obtiene una ficha por su ID o número
   */
  async getFichaById(id: string): Promise<Ficha | null> {
    const memoryFound = inMemoryFichas.find((f) => f.id === id || f.number === id);
    if (memoryFound) return memoryFound;

    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (snap.exists()) {
        return snap.data() as Ficha;
      }
    } catch (error) {
      console.warn(`[fichaService] Ficha ${id} no encontrada en Firestore:`, error);
    }
    return null;
  },

  /**
   * Crea o actualiza una ficha en Firestore y memoria
   */
  async saveFicha(ficha: Ficha): Promise<Ficha> {
    const now = new Date().toISOString();
    const updated: Ficha = {
      ...ficha,
      createdAt: ficha.createdAt || now,
      updatedAt: now,
    };

    const idx = inMemoryFichas.findIndex((f) => f.id === ficha.id);
    if (idx !== -1) {
      inMemoryFichas[idx] = updated;
    } else {
      inMemoryFichas = [updated, ...inMemoryFichas];
    }

    try {
      await setDoc(doc(db, COLLECTION, ficha.id), updated, { merge: true });
    } catch (err) {
      console.warn('[fichaService] Aviso guardando ficha en Firestore:', err);
    }

    return updated;
  },
};
