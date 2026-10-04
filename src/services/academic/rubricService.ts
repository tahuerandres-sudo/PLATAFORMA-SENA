/**
 * @license
 * SENA Learning Hub - Servicio de Rúbricas y Criterios de Evaluación Pedagógica
 * PROMPT 19: Conexión 100% Real con Firestore
 * Colecciones: /rubrics, /rubricEvaluations, /activities, /submissions
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import {
  Rubric,
  RubricCriterion,
  RubricLevel,
  RubricEvaluation,
  RubricCriterionResult,
  EvidenceActivity,
  AcademicSubmission,
} from '../../types/academic';
import { fichaService } from './fichaService';
import { activityService } from './activityService';
import { notificationService } from './notificationService';

const RUBRICS_COLLECTION = FIRESTORE_COLLECTIONS.RUBRICS || 'rubrics';
const EVALUATIONS_COLLECTION = FIRESTORE_COLLECTIONS.RUBRIC_EVALUATIONS || 'rubricEvaluations';

// Almacén en memoria de sesión para garantizar reactividad instantánea
let inMemoryRubrics: Rubric[] = [];
let inMemoryEvaluations: RubricEvaluation[] = [];

// Helper para limpiar valores undefined antes de enviar a Firestore
function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Validador estricto de estructura y coherencia matemática de una rúbrica
 * PROMPT 19.1 - Requisito 5: Validación exhaustiva de pesos y niveles
 */
export function validateRubricDefinition(rubric: {
  title: string;
  fichaId: string;
  criteria: RubricCriterion[];
  isPublished?: boolean;
}): { valid: boolean; error?: string } {
  if (!rubric.title || !rubric.title.trim()) {
    return { valid: false, error: 'El título de la rúbrica es obligatorio.' };
  }
  if (!rubric.fichaId || !rubric.fichaId.trim()) {
    return { valid: false, error: 'La rúbrica debe estar vinculada a una ficha de formación válida.' };
  }
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    return { valid: false, error: 'La rúbrica debe contener al menos un criterio formativo de evaluación.' };
  }

  let totalWeight = 0;
  for (let i = 0; i < rubric.criteria.length; i++) {
    const crit = rubric.criteria[i];
    if (!crit.title || !crit.title.trim()) {
      return { valid: false, error: `El criterio #${i + 1} no tiene un título definido.` };
    }

    const weight = Number(crit.weight);
    if (!Number.isFinite(weight) || Number.isNaN(weight)) {
      return {
        valid: false,
        error: `El peso del criterio "${crit.title}" no es un número válido (NaN o Infinito).`,
      };
    }
    if (weight <= 0) {
      return {
        valid: false,
        error: `El peso del criterio "${crit.title}" debe ser estrictamente positivo (mayor que 0%). No se admiten pesos negativos ni en cero.`,
      };
    }

    totalWeight += weight;

    if (!Array.isArray(crit.levels) || crit.levels.length < 2) {
      return {
        valid: false,
        error: `El criterio "${crit.title}" debe tener al menos 2 niveles de desempeño para permitir evaluar.`,
      };
    }

    for (let j = 0; j < crit.levels.length; j++) {
      const lvl = crit.levels[j];
      if (!lvl.name || !lvl.name.trim()) {
        return {
          valid: false,
          error: `El nivel #${j + 1} del criterio "${crit.title}" debe tener un nombre de escala válido.`,
        };
      }
      const pts = Number(lvl.points);
      if (!Number.isFinite(pts) || Number.isNaN(pts)) {
        return {
          valid: false,
          error: `El puntaje del nivel "${lvl.name}" en el criterio "${crit.title}" es inválido (NaN o Infinito).`,
        };
      }
      if (pts < 0) {
        return {
          valid: false,
          error: `El puntaje del nivel "${lvl.name}" en el criterio "${crit.title}" no puede ser negativo.`,
        };
      }
    }
  }

  if (!Number.isFinite(totalWeight) || Number.isNaN(totalWeight)) {
    return { valid: false, error: 'La suma de los pesos de la rúbrica es inválida.' };
  }

  const roundedTotal = Math.round(totalWeight * 100) / 100;

  if (rubric.isPublished && roundedTotal !== 100) {
    return {
      valid: false,
      error: `No es posible publicar la rúbrica: La suma de los pesos de los criterios debe ser exactamente 100% (suma actual: ${roundedTotal}%).`,
    };
  }

  return { valid: true };
}

export const rubricService = {
  /**
   * Crea una nueva rúbrica pedagógica para una ficha y actividad
   * Valida autorización del instructor sobre la ficha asignada y consistencia de pesos
   */
  async createRubric(
    data: Omit<Rubric, 'id' | 'createdAt' | 'updatedAt' | 'evaluationCount'>
  ): Promise<Rubric> {
    const instructorUid = auth.currentUser?.uid || data.createdBy;

    // Validación estricta de estructura y coherencia
    const validation = validateRubricDefinition({
      title: data.title,
      fichaId: data.fichaId,
      criteria: data.criteria,
      isPublished: data.isPublished,
    });
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Validación de autorización: el instructor debe estar asignado a la ficha
    if (instructorUid && data.fichaId) {
      const isAssigned = await fichaService.isInstructorAssignedToFicha(data.fichaId, instructorUid);
      if (!isAssigned) {
        throw new Error(
          'Acceso denegado: No tienes autorización para crear rúbricas en una ficha que no tienes asignada.'
        );
      }
    }

    const id = `rub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    // Normalizar criterios asegurando IDs y relaciones
    const normalizedCriteria: RubricCriterion[] = data.criteria.map((crit, cIdx) => {
      const critId = crit.id || `crit_${Date.now()}_${cIdx}_${Math.random().toString(36).slice(2, 5)}`;
      return {
        ...crit,
        id: critId,
        rubricId: id,
        order: crit.order ?? cIdx + 1,
        levels: (crit.levels || []).map((lvl, lIdx) => ({
          ...lvl,
          id: lvl.id || `lvl_${Date.now()}_${cIdx}_${lIdx}`,
          order: lvl.order ?? lIdx + 1,
        })),
        createdAt: crit.createdAt || now,
        updatedAt: now,
      };
    });

    const newRubric: Rubric = {
      ...data,
      id,
      createdBy: instructorUid,
      criteria: normalizedCriteria,
      totalPoints: data.totalPoints || 100,
      evaluationCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Actualizar memoria
    inMemoryRubrics = [newRubric, ...inMemoryRubrics];

    // Persistir en Firestore
    try {
      await setDoc(doc(db, RUBRICS_COLLECTION, id), cleanUndefined(newRubric));
    } catch (err) {
      console.warn('[rubricService] Error guardando rúbrica en Firestore:', err);
    }

    // Si está vinculada a una actividad, actualizar la actividad con rubricId
    if (newRubric.activityId) {
      try {
        const act = await activityService.getActivityById(newRubric.activityId);
        if (act) {
          await activityService.saveActivity({
            ...act,
            rubricId: id,
            rubricTitle: newRubric.title,
          });
        }
      } catch (e) {
        console.warn('[rubricService] Error vinculando rúbrica a la actividad:', e);
      }
    }

    return newRubric;
  },

  /**
   * Obtiene una rúbrica por su ID
   */
  async getRubric(rubricId: string): Promise<Rubric | null> {
    const memoryFound = inMemoryRubrics.find((r) => r.id === rubricId);
    if (memoryFound) return memoryFound;

    try {
      const snap = await getDoc(doc(db, RUBRICS_COLLECTION, rubricId));
      if (snap.exists()) {
        const item = snap.data() as Rubric;
        if (!inMemoryRubrics.some((r) => r.id === item.id)) {
          inMemoryRubrics.push(item);
        }
        return item;
      }
    } catch (err) {
      console.warn(`[rubricService] Error consultando rúbrica ${rubricId}:`, err);
    }

    return null;
  },

  /**
   * Obtiene la rúbrica asociada a una actividad
   */
  async getRubricByActivity(activityId: string): Promise<Rubric | null> {
    const memoryFound = inMemoryRubrics.find((r) => r.activityId === activityId);
    if (memoryFound) return memoryFound;

    try {
      const q = query(collection(db, RUBRICS_COLLECTION), where('activityId', '==', activityId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const item = snap.docs[0].data() as Rubric;
        if (!inMemoryRubrics.some((r) => r.id === item.id)) {
          inMemoryRubrics.push(item);
        }
        return item;
      }
    } catch (err) {
      console.warn(`[rubricService] Error consultando rúbrica por actividad ${activityId}:`, err);
    }

    return null;
  },

  /**
   * Obtiene todas las rúbricas de una ficha
   */
  async getRubricsByFicha(fichaId: string): Promise<Rubric[]> {
    try {
      const q = query(collection(db, RUBRICS_COLLECTION), where('fichaId', '==', fichaId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => d.data() as Rubric);
        fromDb.forEach((r) => {
          if (!inMemoryRubrics.some((m) => m.id === r.id)) {
            inMemoryRubrics.push(r);
          }
        });
        return fromDb;
      }
    } catch (err) {
      console.warn(`[rubricService] Error consultando rúbricas de ficha ${fichaId}:`, err);
    }

    return inMemoryRubrics.filter((r) => r.fichaId === fichaId);
  },

  /**
   * Obtiene todas las rúbricas creadas por un instructor o asociadas a sus fichas
   */
  async getRubricsByInstructor(instructorUid: string): Promise<Rubric[]> {
    try {
      const q = query(collection(db, RUBRICS_COLLECTION), where('createdBy', '==', instructorUid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => d.data() as Rubric);
        fromDb.forEach((r) => {
          if (!inMemoryRubrics.some((m) => m.id === r.id)) {
            inMemoryRubrics.push(r);
          }
        });
        return fromDb;
      }
    } catch (err) {
      console.warn('[rubricService] Error consultando rúbricas del instructor:', err);
    }

    return inMemoryRubrics.filter((r) => r.createdBy === instructorUid);
  },

  /**
   * Actualiza una rúbrica existente
   * Impide modificar criterios si ya existen evaluaciones definitivas
   */
  async updateRubric(rubricId: string, updates: Partial<Rubric>): Promise<Rubric> {
    const existing = await this.getRubric(rubricId);
    if (!existing) {
      throw new Error(`Rúbrica con ID ${rubricId} no encontrada.`);
    }

    const currentInstructorUid = auth.currentUser?.uid;
    if (currentInstructorUid) {
      // Verificar autorización sobre la ficha actual
      const isAssigned = await fichaService.isInstructorAssignedToFicha(
        existing.fichaId,
        currentInstructorUid
      );
      if (!isAssigned) {
        throw new Error('Acceso denegado: No tienes autorización para editar rúbricas de una ficha que no tienes asignada.');
      }

      // Si intenta cambiar a otra ficha, verificar que también la tenga asignada
      if (updates.fichaId && updates.fichaId !== existing.fichaId) {
        const isAssignedNew = await fichaService.isInstructorAssignedToFicha(
          updates.fichaId,
          currentInstructorUid
        );
        if (!isAssignedNew) {
          throw new Error('Acceso denegado: No puedes reasignar la rúbrica a una ficha que no tienes asignada.');
        }
      }
    }

    const newCriteria = updates.criteria || existing.criteria;
    const willBePublished = updates.isPublished !== undefined ? updates.isPublished : existing.isPublished;

    // Validación estricta de estructura y coherencia matemática
    const validation = validateRubricDefinition({
      title: updates.title || existing.title,
      fichaId: updates.fichaId || existing.fichaId,
      criteria: newCriteria,
      isPublished: willBePublished,
    });
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const now = new Date().toISOString();
    const updatedRubric: Rubric = {
      ...existing,
      ...updates,
      criteria: newCriteria,
      updatedAt: now,
    };

    // Actualizar memoria
    const idx = inMemoryRubrics.findIndex((r) => r.id === rubricId);
    if (idx !== -1) {
      inMemoryRubrics[idx] = updatedRubric;
    } else {
      inMemoryRubrics.push(updatedRubric);
    }

    // Persistir en Firestore
    try {
      await setDoc(doc(db, RUBRICS_COLLECTION, rubricId), cleanUndefined(updatedRubric), { merge: true });
    } catch (err) {
      console.warn('[rubricService] Error actualizando rúbrica en Firestore:', err);
    }

    return updatedRubric;
  },

  /**
   * Publica una rúbrica validando que el porcentaje total sea exactamente 100%
   */
  async publishRubric(rubricId: string): Promise<Rubric> {
    const existing = await this.getRubric(rubricId);
    if (!existing) {
      throw new Error(`Rúbrica ${rubricId} no encontrada.`);
    }

    const validation = validateRubricDefinition({
      title: existing.title,
      fichaId: existing.fichaId,
      criteria: existing.criteria,
      isPublished: true,
    });
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return this.updateRubric(rubricId, { isPublished: true });
  },

  /**
   * Despublica una rúbrica (la devuelve a borrador)
   */
  async unpublishRubric(rubricId: string): Promise<Rubric> {
    return this.updateRubric(rubricId, { isPublished: false });
  },

  /**
   * Elimina una rúbrica si no tiene evaluaciones registradas
   */
  async deleteRubric(rubricId: string): Promise<void> {
    const existing = await this.getRubric(rubricId);
    if (!existing) return;

    if (existing.evaluationCount && existing.evaluationCount > 0) {
      throw new Error(
        'No se puede eliminar la rúbrica porque ya cuenta con evaluaciones asociadas a evidencias entregadas.'
      );
    }

    // Eliminar de memoria
    inMemoryRubrics = inMemoryRubrics.filter((r) => r.id !== rubricId);

    // Desvincular de la actividad si aplica
    if (existing.activityId) {
      try {
        const act = await activityService.getActivityById(existing.activityId);
        if (act && act.rubricId === rubricId) {
          await activityService.saveActivity({
            ...act,
            rubricId: null,
            rubricTitle: undefined,
          });
        }
      } catch (e) {
        console.warn('[rubricService] Error desvinculando rúbrica al eliminar:', e);
      }
    }

    // Eliminar de Firestore
    try {
      await deleteDoc(doc(db, RUBRICS_COLLECTION, rubricId));
    } catch (err) {
      console.warn('[rubricService] Error eliminando rúbrica de Firestore:', err);
    }
  },

  /**
   * Evalúa una entrega de evidencia utilizando una rúbrica pedagógica
   * Guarda el desglose de criterios y retroalimentación formativa sin reemplazar el dictamen A/N/C
   * PROMPT 19.1 - Requisitos 2 y 3: Cadena académica completa y separación A/N/C
   */
  async evaluateSubmissionWithRubric(payload: {
    rubricId: string;
    activityId: string;
    submissionId: string;
    learnerId: string;
    learnerName?: string;
    fichaId: string;
    evaluatorId: string;
    evaluatorName?: string;
    version?: number;
    criteriaResults: RubricCriterionResult[];
    generalFeedback?: string;
  }): Promise<RubricEvaluation> {
    // 1. Verificación obligatoria de referencias académicas
    if (
      !payload.rubricId?.trim() ||
      !payload.activityId?.trim() ||
      !payload.submissionId?.trim() ||
      !payload.learnerId?.trim() ||
      !payload.fichaId?.trim() ||
      !payload.evaluatorId?.trim()
    ) {
      throw new Error(
        'Referencias académicas inconsistentes: La evaluación de rúbrica requiere obligatoriamente rubricId, activityId, submissionId, learnerId, fichaId y evaluatorId.'
      );
    }

    const rubric = await this.getRubric(payload.rubricId);
    if (!rubric) {
      throw new Error(`Rúbrica con ID ${payload.rubricId} no encontrada.`);
    }

    // 2. Validar autorización del evaluador sobre la ficha
    const isAssigned = await fichaService.isInstructorAssignedToFicha(
      payload.fichaId,
      payload.evaluatorId
    );
    if (!isAssigned) {
      throw new Error(
        'Acceso denegado: El instructor evaluador no tiene asignada la ficha de esta entrega.'
      );
    }

    // 3. Validar resultados de criterios
    if (!Array.isArray(payload.criteriaResults) || payload.criteriaResults.length === 0) {
      throw new Error('La evaluación de la rúbrica debe calificar al menos un criterio.');
    }

    for (const cr of payload.criteriaResults) {
      const pts = Number(cr.points);
      if (!Number.isFinite(pts) || Number.isNaN(pts) || pts < 0) {
        throw new Error(
          `Puntaje inválido en criterio "${cr.criterionTitle || cr.criterionId}". Debe ser un número finito no negativo.`
        );
      }
    }

    // 4. Calcular puntos y porcentaje estrictamente acotado [0, 100]
    const totalPoints = payload.criteriaResults.reduce((sum, cr) => sum + (Number(cr.points) || 0), 0);
    const totalPossiblePoints =
      payload.criteriaResults.reduce((sum, cr) => sum + (Number(cr.maxPoints) || 0), 0) ||
      rubric.totalPoints ||
      100;

    const percentage =
      totalPossiblePoints > 0
        ? Math.min(100, Math.max(0, Math.round((totalPoints / totalPossiblePoints) * 100)))
        : 0;

    const evaluationId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const evaluation: RubricEvaluation = {
      id: evaluationId,
      rubricId: rubric.id,
      rubricTitle: rubric.title,
      activityId: payload.activityId,
      submissionId: payload.submissionId,
      learnerId: payload.learnerId,
      learnerName: payload.learnerName,
      fichaId: payload.fichaId,
      evaluatorId: payload.evaluatorId,
      evaluatorName: payload.evaluatorName,
      version: payload.version || 1,
      criteriaResults: payload.criteriaResults,
      totalPoints,
      totalPossiblePoints,
      percentage,
      generalFeedback: payload.generalFeedback || '',
      createdAt: now,
      updatedAt: now,
    };

    // Actualizar memoria
    inMemoryEvaluations = [evaluation, ...inMemoryEvaluations.filter((e) => e.id !== evaluationId)];

    // Persistir en Firestore (/rubricEvaluations)
    try {
      await setDoc(doc(db, EVALUATIONS_COLLECTION, evaluationId), cleanUndefined(evaluation));
    } catch (err) {
      console.warn('[rubricService] Error guardando evaluación de rúbrica en Firestore:', err);
    }

    // Incrementar contador de evaluaciones de la rúbrica
    try {
      const newCount = (rubric.evaluationCount || 0) + 1;
      await this.updateRubric(rubric.id, { evaluationCount: newCount });
    } catch (err) {
      console.warn('[rubricService] Error actualizando evaluationCount en rúbrica:', err);
    }

    // Despachar notificación pedagógica al aprendiz
    try {
      await notificationService.notifyRubricEvaluated({
        submissionId: payload.submissionId,
        activityId: payload.activityId,
        activityTitle: rubric.activityTitle || rubric.title,
        learnerId: payload.learnerId,
        rubricScore: totalPoints,
        rubricMaxScore: totalPossiblePoints,
        percentage,
      });
    } catch (err) {
      console.warn('[rubricService] Error notificando evaluación de rúbrica:', err);
    }

    return evaluation;
  },

  /**
   * Obtiene la evaluación de rúbrica para una entrega (opcionalmente filtrada por versión)
   */
  async getRubricEvaluation(
    submissionId: string,
    version?: number
  ): Promise<RubricEvaluation | null> {
    const memoryFound = inMemoryEvaluations.find(
      (e) => e.submissionId === submissionId && (version ? e.version === version : true)
    );
    if (memoryFound) return memoryFound;

    try {
      let q = query(
        collection(db, EVALUATIONS_COLLECTION),
        where('submissionId', '==', submissionId)
      );
      if (version) {
        q = query(q, where('version', '==', version));
      }
      const snap = await getDocs(q);
      if (!snap.empty) {
        const sorted = snap.docs.map((d) => d.data() as RubricEvaluation);
        sorted.sort((a, b) => b.version - a.version);
        const item = sorted[0];
        if (!inMemoryEvaluations.some((e) => e.id === item.id)) {
          inMemoryEvaluations.push(item);
        }
        return item;
      }
    } catch (err) {
      console.warn(`[rubricService] Error consultando evaluación de rúbrica para entrega ${submissionId}:`, err);
    }

    return null;
  },

  /**
   * Obtiene el historial completo de evaluaciones de rúbrica para una entrega (todas las versiones)
   */
  async getRubricEvaluationHistory(submissionId: string): Promise<RubricEvaluation[]> {
    try {
      const q = query(
        collection(db, EVALUATIONS_COLLECTION),
        where('submissionId', '==', submissionId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as RubricEvaluation);
        items.sort((a, b) => a.version - b.version);
        items.forEach((item) => {
          if (!inMemoryEvaluations.some((e) => e.id === item.id)) {
            inMemoryEvaluations.push(item);
          }
        });
        return items;
      }
    } catch (err) {
      console.warn('[rubricService] Error consultando historial de evaluaciones:', err);
    }

    return inMemoryEvaluations
      .filter((e) => e.submissionId === submissionId)
      .sort((a, b) => a.version - b.version);
  },
};
