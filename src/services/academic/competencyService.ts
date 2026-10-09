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
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import { Competency } from '../../types/academic';
import { DEMO_COMPETENCIES } from '../../data/academicMockData';
import { learningOutcomeService } from './learningOutcomeService';

const COLLECTION = FIRESTORE_COLLECTIONS.COMPETENCIES;

let inMemoryCompetencies: Competency[] = [...DEMO_COMPETENCIES];

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

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
      await setDoc(doc(db, COLLECTION, competency.id), cleanUndefined(updated), { merge: true });
    } catch (err: any) {
      console.error('[competencyService] Error guardando en Firestore:', err);
      throw new Error(`Error en Firestore al guardar competencia: ${err?.message || 'Error de permisos o conexión'}`);
    }

    return updated;
  },

  /**
   * Actualiza una competencia existente en Firestore y memoria sin duplicar
   */
  async updateCompetency(
    id: string,
    updates: Partial<Omit<Competency, 'id' | 'createdAt'>>
  ): Promise<Competency> {
    const existing = await this.getCompetencyById(id);
    if (!existing) {
      throw new Error(`No se encontró la competencia con ID ${id}`);
    }

    const now = new Date().toISOString();
    const updated: Competency = {
      ...existing,
      ...updates,
      id: existing.id, // Garantizar inmutabilidad del ID
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };

    // Actualizar en Firestore
    try {
      await setDoc(doc(db, COLLECTION, id), cleanUndefined(updated), { merge: true });
    } catch (err: any) {
      console.error(`[competencyService] Error actualizando competencia ${id} en Firestore:`, err);
      throw new Error(`Error en Firestore al actualizar: ${err?.message || 'Permiso denegado'}`);
    }

    // Actualizar cache en memoria
    const idx = inMemoryCompetencies.findIndex((c) => c.id === id);
    if (idx !== -1) {
      inMemoryCompetencies[idx] = updated;
    } else {
      inMemoryCompetencies.push(updated);
    }

    return updated;
  },

  /**
   * Verifica dependencias curriculares antes de permitir la eliminación
   * (Resultados de Aprendizaje / RAPs, Actividades y Recursos)
   */
  async checkCompetencyDependencies(competencyId: string): Promise<{
    hasDependencies: boolean;
    rapsCount: number;
    activitiesCount: number;
    resourcesCount: number;
    raps: { id: string; name: string; code?: string }[];
    activities: { id: string; title: string }[];
    resources: { id: string; title: string }[];
    details: string[];
  }> {
    const raps: { id: string; name: string; code?: string }[] = [];
    const activities: { id: string; title: string }[] = [];
    const resources: { id: string; title: string }[] = [];
    const details: string[] = [];

    // 1. Consultar RAPs asociados en servicio (incluye memoria y Firestore)
    try {
      const outcomeRes = await learningOutcomeService.getLearningOutcomes(competencyId);
      const outcomes = outcomeRes?.data || [];
      outcomes.forEach((data) => {
        if (!raps.some((r) => r.id === data.id)) {
          raps.push({
            id: data.id,
            name: data.name || data.description || 'RAP sin nombre',
            code: data.code,
          });
        }
      });
    } catch (err) {
      console.warn('[competencyService] Error consultando dependencias de RAPs via service:', err);
    }

    // 2. Consultar RAPs directamente en Firestore para verificar consistencia
    try {
      const rapSnap = await getDocs(
        query(
          collection(db, FIRESTORE_COLLECTIONS.LEARNING_OUTCOMES),
          where('competencyId', '==', competencyId)
        )
      );
      rapSnap.docs.forEach((d) => {
        const data = d.data();
        if (!raps.some((r) => r.id === d.id)) {
          raps.push({
            id: d.id,
            name: data.name || data.description || 'RAP sin nombre',
            code: data.code,
          });
        }
      });
    } catch (err) {
      console.warn('[competencyService] Error consultando dependencias de RAPs en Firestore:', err);
    }

    // 2. Consultar Actividades asociadas a la competencia
    try {
      const actSnap = await getDocs(
        query(
          collection(db, FIRESTORE_COLLECTIONS.ACTIVITIES),
          where('competencyId', '==', competencyId)
        )
      );
      actSnap.docs.forEach((d) => {
        const data = d.data();
        activities.push({
          id: d.id,
          title: data.title || data.name || 'Actividad formativa',
        });
      });
    } catch (err) {
      console.warn('[competencyService] Error consultando actividades en Firestore:', err);
    }

    // 3. Consultar Recursos asociados
    try {
      const resSnap = await getDocs(
        query(
          collection(db, FIRESTORE_COLLECTIONS.RESOURCES),
          where('competencyId', '==', competencyId)
        )
      );
      resSnap.docs.forEach((d) => {
        const data = d.data();
        resources.push({
          id: d.id,
          title: data.title || data.name || 'Recurso didáctico',
        });
      });
    } catch (err) {
      console.warn('[competencyService] Error consultando recursos en Firestore:', err);
    }

    if (raps.length > 0) {
      details.push(
        `${raps.length} Resultado(s) de Aprendizaje (RAP) directamente asociado(s): ${raps
          .slice(0, 3)
          .map((r) => `"${r.name}"`)
          .join(', ')}${raps.length > 3 ? ` y ${raps.length - 3} más` : ''}.`
      );
    }

    if (activities.length > 0) {
      details.push(
        `${activities.length} Actividad(es) de aprendizaje vinculada(s): ${activities
          .slice(0, 3)
          .map((a) => `"${a.title}"`)
          .join(', ')}${activities.length > 3 ? ` y ${activities.length - 3} más` : ''}.`
      );
    }

    if (resources.length > 0) {
      details.push(
        `${resources.length} Recurso(s) de apoyo educativo vinculado(s): ${resources
          .slice(0, 2)
          .map((r) => `"${r.title}"`)
          .join(', ')}${resources.length > 2 ? ` y ${resources.length - 2} más` : ''}.`
      );
    }

    const hasDependencies = raps.length > 0 || activities.length > 0 || resources.length > 0;

    return {
      hasDependencies,
      rapsCount: raps.length,
      activitiesCount: activities.length,
      resourcesCount: resources.length,
      raps,
      activities,
      resources,
      details,
    };
  },

  /**
   * Elimina una competencia de Firestore y memoria
   */
  async deleteCompetency(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, COLLECTION, id));

      // Eliminar de memoria
      inMemoryCompetencies = inMemoryCompetencies.filter((c) => c.id !== id);
      return true;
    } catch (err: any) {
      console.error(`[competencyService] Error eliminando competencia ${id} de Firestore:`, err);
      throw new Error(`Error en Firestore al eliminar competencia: ${err?.message || 'Permiso denegado'}`);
    }
  },
};
