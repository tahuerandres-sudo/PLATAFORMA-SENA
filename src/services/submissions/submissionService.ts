/**
 * @license
 * SENA Learning Hub - Servicio de Gestión de Entregas (Submissions)
 * PROMPT 4: Requisitos 10, 18, 19, 22
 * Colección Firestore: /submissions
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import {
  AcademicSubmission,
  SubmissionAcademicStatus,
  AcademicGradeCode,
  SubmissionHistoryItem,
} from '../../types/academic';
import { trackingService } from '../academic/trackingService';
import { fichaService } from '../academic/fichaService';
import { normalizeEvaluationStatus } from '../../utils/evaluationUtils';
import { notificationService } from '../academic/notificationService';
import { gamificationService } from '../academic/gamificationService';
import { DEMO_SUBMISSIONS } from '../../data/academicMockData';

const COLLECTION = FIRESTORE_COLLECTIONS.SUBMISSIONS;

function cleanUndefined<T>(obj: T): T {
  if (obj === undefined || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        result[key] = cleanUndefined(val);
      }
    }
    return result;
  }
  return obj;
}

// Almacén en memoria sincronizado con entregas base y de sesión para acceso instantáneo
let inMemorySubmissions: AcademicSubmission[] = [...DEMO_SUBMISSIONS];

export const submissionService = {
  /**
   * Verifica si el aprendiz puede radicar evidencias (Requisito 19: Restricciones académicas)
   */
  async canSubmitEvidence(
    learnerId: string,
    activityId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const check = await trackingService.checkLearnerHasEvidenceBlock(learnerId);
      if (check.blocked) {
        return {
          allowed: false,
          reason: `Entrega bloqueada por restricción académica activa: ${check.reason || 'Restricción por inasistencias o incumplimiento'}. Debes radicar tu justificación formal o contactar a tu instructor para que levante la restricción.`,
        };
      }
    } catch (err) {
      console.warn('[submissionService] Advertencia comprobando restricciones:', err);
    }

    return { allowed: true };
  },

  /**
   * Registra una nueva entrega de evidencia en Firestore y memoria
   * PROMPT 11: Prevención estricta de duplicados y redirección a corrección si ya existe
   */
  async createSubmission(
    submission: Omit<AcademicSubmission, 'id' | 'createdAt' | 'updatedAt' | 'resubmissionCount'>
  ): Promise<AcademicSubmission> {
    const effectiveLearnerId = submission.userId || submission.learnerId;

    // Verificar si el aprendiz ya tiene una submission para esta actividad
    const existing = await this.getLearnerSubmissionForActivity(effectiveLearnerId, submission.activityId);
    if (existing) {
      if (existing.status === 'approved' || existing.grade === 'A') {
        throw new Error('Esta evidencia formativa ya fue calificada como APROBADA (A). No se permiten nuevas entregas.');
      }
      if (existing.status === 'correction_required' || existing.grade === 'C') {
        // Redirigir a ciclo de reenvío de corrección conservando el versionado e historial
        return this.resubmitEvidence(existing.id, {
          driveFileId: submission.driveFileId,
          driveUrl: submission.driveUrl,
          driveFileUrl: submission.driveFileUrl || submission.driveUrl,
          fileName: submission.fileName,
          externalUrl: submission.externalUrl,
          textContent: submission.textContent,
          comments: submission.comments,
          mimeType: submission.mimeType,
          fileSize: submission.fileSize,
        });
      }
      if (existing.status === 'submitted' || existing.status === 'under_review') {
        throw new Error('Ya tienes una entrega radicada en espera de revisión por tu instructor.');
      }
    }

    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const fullSubmission: AcademicSubmission = {
      ...submission,
      id,
      version: 1,
      resubmissionCount: 0,
      submissionHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    // 1. Guardar en memoria para reflejo instantáneo en UI
    inMemorySubmissions = [fullSubmission, ...inMemorySubmissions];

    // 2. Persistir en Cloud Firestore (/submissions/{submissionId})
    try {
      await setDoc(doc(db, COLLECTION, id), cleanUndefined(fullSubmission));
    } catch (err) {
      console.warn(
        '[submissionService] Aviso al escribir en Firestore (se conserva en memoria de sesión):',
        err
      );
    }

    // PROMPT 14 - Evento Gamificación A: Entrega inicial de evidencia (+10 XP)
    gamificationService
      .onEvidenceSubmitted({
        submissionId: fullSubmission.id,
        userId: fullSubmission.learnerId || fullSubmission.userId,
        activityTitle: fullSubmission.activityTitle,
      })
      .catch((e) => console.warn('[submissionService] Error despachando evento gamificación:', e));

    // PROMPT 16 - Evento Evidencias A: Notificar al instructor sobre la nueva entrega
    notificationService
      .notifyEvidenceSubmitted({
        submissionId: fullSubmission.id,
        activityId: fullSubmission.activityId,
        activityTitle: fullSubmission.activityTitle,
        learnerId: fullSubmission.learnerId || fullSubmission.userId,
        learnerName: fullSubmission.learnerName,
        fichaId: fullSubmission.fichaId,
        instructorId: fullSubmission.instructorId,
      })
      .catch((e) => console.warn('[submissionService] Error notificando entrega a instructor:', e));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }

    return fullSubmission;
  },

  /**
   * Obtiene todas las entregas registradas en Firestore (/submissions)
   * PROMPT 9.2: Respeta las reglas de seguridad de Firestore acotando
   * las consultas estrictamente a las fichas asignadas al instructor (Instructor -> Fichas Asignadas -> Submissions).
   */
  async getAllSubmissions(
    instructorIdOrFilter?: string | { fichaId?: string; instructorId?: string },
    assignedFichaIds?: string[]
  ): Promise<{ data: AcademicSubmission[]; isDemo: boolean; error?: string }> {
    try {
      let targetFichaIds: string[] = [];
      let instructorId: string | undefined;

      if (typeof instructorIdOrFilter === 'object' && instructorIdOrFilter !== null) {
        instructorId = instructorIdOrFilter.instructorId;
        if (instructorIdOrFilter.fichaId) {
          const rawId = instructorIdOrFilter.fichaId;
          const cleanId = rawId.replace(/^ficha_/, '');
          targetFichaIds = Array.from(new Set([rawId, cleanId, `ficha_${cleanId}`]));
        }
      } else {
        instructorId = instructorIdOrFilter;
        targetFichaIds = assignedFichaIds ? [...assignedFichaIds] : [];
      }

      const effectiveInstructorId = instructorId || auth.currentUser?.uid;

      // Si no se proporcionaron fichas específicas, obtener las asignadas al instructor
      if (targetFichaIds.length === 0 && effectiveInstructorId) {
        const fichasRes = await fichaService.getFichas(effectiveInstructorId);
        if (fichasRes.data && fichasRes.data.length > 0) {
          targetFichaIds = Array.from(
            new Set(
              fichasRes.data
                .map((f) => f.id)
                .concat(fichasRes.data.map((f) => f.number))
                .filter(Boolean)
            )
          );
        } else {
          // El instructor no tiene fichas asignadas -> retornar vacío sin error
          return { data: [], isDemo: false };
        }
      }

      // Si se tienen identificadas fichas asignadas, consultar cada ficha con Promise.all
      if (targetFichaIds.length > 0) {
        const queryPromises = targetFichaIds.map(async (fId) => {
          try {
            const q = query(collection(db, COLLECTION), where('fichaId', '==', fId));
            const snap = await getDocs(q);
            return snap.docs.map((d) => d.data() as AcademicSubmission);
          } catch (err) {
            console.warn(`[submissionService] Consulta de entregas para ficha ${fId}:`, err);
            return [];
          }
        });

        const results = await Promise.all(queryPromises);
        const subMap = new Map<string, AcademicSubmission>();
        results.flat().forEach((sub) => subMap.set(sub.id, sub));

        // Combinar con entregas en memoria de sesión que correspondan a estas fichas
        inMemorySubmissions.forEach((sub) => {
          const matchFicha =
            sub.fichaId &&
            targetFichaIds.some((tf) => {
              const cleanTf = tf.replace(/^ficha_/, '').toLowerCase();
              const cleanSubFicha = sub.fichaId.replace(/^ficha_/, '').toLowerCase();
              return tf === sub.fichaId || cleanTf === cleanSubFicha;
            });
          if (matchFicha && !subMap.has(sub.id)) {
            subMap.set(sub.id, sub);
          }
        });

        const combined = Array.from(subMap.values());
        combined.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );

        // Sincronizar en memoria para acceso inmediato en todas las vistas
        combined.forEach((s) => {
          const idx = inMemorySubmissions.findIndex((m) => m.id === s.id);
          if (idx >= 0) {
            inMemorySubmissions[idx] = { ...inMemorySubmissions[idx], ...s };
          } else {
            inMemorySubmissions.push(s);
          }
        });

        return { data: combined, isDemo: false };
      }

      // Si no hay instructor identificado pero hay usuario autenticado, consultar por userId
      const currentUserUid = auth.currentUser?.uid;
      if (currentUserUid) {
        return this.getSubmissionsByLearner(currentUserUid);
      }

      return { data: inMemorySubmissions, isDemo: false };
    } catch (err) {
      console.warn('[submissionService] Error consultando entregas en Firestore:', err);
      return { data: [], isDemo: false, error: 'No fue posible cargar las entregas.' };
    }
  },

  /**
   * Obtiene entregas filtradas por actividad
   */
  async getSubmissionsByActivity(
    activityId: string
  ): Promise<{ data: AcademicSubmission[]; isDemo: boolean }> {
    try {
      const q = query(collection(db, COLLECTION), where('activityId', '==', activityId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => d.data() as AcademicSubmission);
        fromDb.forEach((s) => {
          const idx = inMemorySubmissions.findIndex((m) => m.id === s.id);
          if (idx >= 0) {
            inMemorySubmissions[idx] = { ...inMemorySubmissions[idx], ...s };
          } else {
            inMemorySubmissions.push(s);
          }
        });
        // Combinar con recientes de memoria para reactividad
        const merged = [
          ...inMemorySubmissions.filter(
            (s) => s.activityId === activityId && !fromDb.some((dbS) => dbS.id === s.id)
          ),
          ...fromDb,
        ];
        return { data: merged, isDemo: false };
      }
    } catch (err) {
      console.warn('[submissionService] Error consultando entregas de actividad:', err);
    }

    const filtered = inMemorySubmissions.filter((s) => s.activityId === activityId);
    return { data: filtered, isDemo: true };
  },

  /**
   * Obtiene las entregas radicadas por un aprendiz
   */
  async getSubmissionsByLearner(
    learnerId: string
  ): Promise<{ data: AcademicSubmission[]; isDemo: boolean }> {
    try {
      const q = query(collection(db, COLLECTION), where('userId', '==', learnerId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => d.data() as AcademicSubmission);
        const merged = [
          ...inMemorySubmissions.filter(
            (s) => (s.learnerId === learnerId || s.userId === learnerId) && !fromDb.some((dbS) => dbS.id === s.id)
          ),
          ...fromDb,
        ];
        return { data: merged, isDemo: false };
      }
    } catch (err) {
      console.warn('[submissionService] Error consultando entregas de aprendiz:', err);
    }

    const filtered = inMemorySubmissions.filter(
      (s) => s.learnerId === learnerId || s.userId === learnerId
    );
    return { data: filtered, isDemo: true };
  },

  /**
   * Obtiene todas las entregas para una ficha (Panel Instructor)
   */
  async getSubmissionsByFicha(
    fichaId: string
  ): Promise<{ data: AcademicSubmission[]; isDemo: boolean }> {
    try {
      const q = query(collection(db, COLLECTION), where('fichaId', '==', fichaId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => d.data() as AcademicSubmission);
        fromDb.forEach((s) => {
          const idx = inMemorySubmissions.findIndex((m) => m.id === s.id);
          if (idx >= 0) {
            inMemorySubmissions[idx] = { ...inMemorySubmissions[idx], ...s };
          } else {
            inMemorySubmissions.push(s);
          }
        });
        const merged = [
          ...inMemorySubmissions.filter(
            (s) => s.fichaId === fichaId && !fromDb.some((dbS) => dbS.id === s.id)
          ),
          ...fromDb,
        ];
        return { data: merged, isDemo: false };
      }
    } catch (err) {
      console.warn('[submissionService] Error consultando entregas de ficha:', err);
    }

    const filtered = inMemorySubmissions.filter((s) => s.fichaId === fichaId);
    return { data: filtered, isDemo: true };
  },

  /**
   * Obtiene una entrega específica de un aprendiz para una actividad determinada
   */
  async getLearnerSubmissionForActivity(
    learnerId: string,
    activityId: string
  ): Promise<AcademicSubmission | null> {
    const found = inMemorySubmissions.find(
      (s) =>
        (s.learnerId === learnerId || s.userId === learnerId) && s.activityId === activityId
    );
    if (found) return found;

    try {
      const q = query(
        collection(db, COLLECTION),
        where('activityId', '==', activityId),
        where('userId', '==', learnerId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const item = snap.docs[0].data() as AcademicSubmission;
        if (!inMemorySubmissions.some((s) => s.id === item.id)) {
          inMemorySubmissions = [item, ...inMemorySubmissions];
        }
        return item;
      }

      // Probar también por learnerId si es diferente
      const q2 = query(
        collection(db, COLLECTION),
        where('activityId', '==', activityId),
        where('learnerId', '==', learnerId)
      );
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const item = snap2.docs[0].data() as AcademicSubmission;
        if (!inMemorySubmissions.some((s) => s.id === item.id)) {
          inMemorySubmissions = [item, ...inMemorySubmissions];
        }
        return item;
      }
    } catch (err) {
      console.warn('[submissionService] Error en getLearnerSubmissionForActivity:', err);
    }

    return null;
  },

  /**
   * Obtiene una entrega específica por su ID
   */
  async getSubmissionById(submissionId: string): Promise<AcademicSubmission | null> {
    const memoryFound = inMemorySubmissions.find((s) => s.id === submissionId);
    if (memoryFound) return memoryFound;

    try {
      const snap = await getDoc(doc(db, COLLECTION, submissionId));
      if (snap.exists()) {
        const item = snap.data() as AcademicSubmission;
        if (!inMemorySubmissions.some((s) => s.id === item.id)) {
          inMemorySubmissions = [item, ...inMemorySubmissions];
        }
        return item;
      }
    } catch (err) {
      console.warn(`[submissionService] Error consultando entrega ${submissionId}:`, err);
    }

    return null;
  },

  /**
   * Califica una entrega con dictamen oficial SENA (A = Aprobado, N = No aprobado, C = Corregir)
   * Registra gradedBy, instructorId, gradedAt, status, grade ('A' | 'N' | 'C') y retroalimentación.
   * Funciona idénticamente en la sección general de Evidencias y dentro de Mis Fichas.
   */
  async gradeSubmission(payload: {
    submissionId: string;
    gradeCode: AcademicGradeCode;
    score?: number;
    feedback?: string;
    instructorId: string;
    instructorName?: string;
    rubricEvaluationId?: string;
    rubricScore?: number;
    rubricMaxScore?: number;
    rubricPercentage?: number;
    submission?: AcademicSubmission;
  }): Promise<AcademicSubmission | null> {
    const {
      submissionId,
      gradeCode,
      score,
      feedback,
      instructorId,
      instructorName,
      rubricEvaluationId,
      rubricScore,
      rubricMaxScore,
      rubricPercentage,
      submission,
    } = payload;
    const now = new Date().toISOString();
    const status: SubmissionAcademicStatus =
      gradeCode === 'A' ? 'approved' : gradeCode === 'N' ? 'not_approved' : 'correction_required';

    const gradedByName = instructorName || instructorId || 'Instructor SENA';

    // 1. Obtener o resolver la entrega base para conservar toda su trazabilidad institucional
    let baseSubmission: AcademicSubmission | null =
      submission ||
      inMemorySubmissions.find((s) => s.id === submissionId) ||
      null;

    if (!baseSubmission) {
      try {
        const snap = await getDoc(doc(db, COLLECTION, submissionId));
        if (snap.exists()) {
          baseSubmission = snap.data() as AcademicSubmission;
        }
      } catch (fetchErr) {
        console.warn(`[submissionService] Error obteniendo entrega base ${submissionId}:`, fetchErr);
      }
    }

    // 2. Construir historial de versiones respetando entregas previas
    const currentHist = baseSubmission?.submissionHistory || [];
    let updatedHistory = [...currentHist];
    if (updatedHistory.length > 0) {
      const lastIdx = updatedHistory.length - 1;
      updatedHistory[lastIdx] = {
        ...updatedHistory[lastIdx],
        status,
        grade: gradeCode,
        feedback: feedback !== undefined ? feedback : updatedHistory[lastIdx].feedback,
        gradedBy: gradedByName,
        gradedAt: now,
        rubricEvaluationId: rubricEvaluationId || updatedHistory[lastIdx].rubricEvaluationId,
        rubricScore: rubricScore !== undefined ? rubricScore : updatedHistory[lastIdx].rubricScore,
        rubricMaxScore: rubricMaxScore !== undefined ? rubricMaxScore : updatedHistory[lastIdx].rubricMaxScore,
        rubricPercentage: rubricPercentage !== undefined ? rubricPercentage : updatedHistory[lastIdx].rubricPercentage,
      };
    } else if (baseSubmission) {
      updatedHistory = [
        {
          version: baseSubmission.version || 1,
          submittedAt: baseSubmission.submittedAt || now,
          driveFileId: baseSubmission.driveFileId,
          driveUrl: baseSubmission.driveUrl,
          driveFileUrl: baseSubmission.driveFileUrl,
          fileName: baseSubmission.fileName,
          externalUrl: baseSubmission.externalUrl,
          textContent: baseSubmission.textContent,
          status,
          grade: gradeCode,
          feedback: feedback || '',
          gradedBy: gradedByName,
          gradedAt: now,
          rubricEvaluationId,
          rubricScore,
          rubricMaxScore,
          rubricPercentage,
        },
      ];
    }

    // 3. Crear entrega actualizada completa
    const updatedSubmission: AcademicSubmission = {
      ...(baseSubmission || {
        id: submissionId,
        learnerId: '',
        userId: '',
        learnerName: 'Aprendiz',
        activityId: '',
        fichaId: '',
        courseId: '',
        submissionType: 'document' as const,
        resubmissionCount: 0,
        version: 1,
        submittedAt: now,
        createdAt: now,
      }),
      status,
      grade: gradeCode,
      feedback: feedback !== undefined ? feedback : (baseSubmission?.feedback || ''),
      gradedBy: gradedByName,
      instructorId: instructorId || baseSubmission?.instructorId || '',
      gradedAt: now,
      rubricEvaluationId: rubricEvaluationId || baseSubmission?.rubricEvaluationId,
      rubricScore: rubricScore !== undefined ? rubricScore : baseSubmission?.rubricScore,
      rubricMaxScore: rubricMaxScore !== undefined ? rubricMaxScore : baseSubmission?.rubricMaxScore,
      rubricPercentage: rubricPercentage !== undefined ? rubricPercentage : baseSubmission?.rubricPercentage,
      submissionHistory: updatedHistory,
      updatedAt: now,
      // PROMPT 38: Retirar la exclusión activa al asignar un dictamen oficial (A / N / C)
      isExcluded: false,
      excludedAt: undefined,
      excludedBy: undefined,
      excludedByName: undefined,
      exclusionReason: undefined,
    };

    // 4. Actualizar en memoria
    const memIdx = inMemorySubmissions.findIndex((s) => s.id === submissionId);
    if (memIdx >= 0) {
      inMemorySubmissions[memIdx] = updatedSubmission;
    } else {
      inMemorySubmissions = [updatedSubmission, ...inMemorySubmissions];
    }

    // 5. Persistir en Cloud Firestore (/submissions/{submissionId})
    try {
      const subRef = doc(db, COLLECTION, submissionId);
      const updateData: Record<string, any> = {
        status,
        grade: gradeCode,
        feedback: feedback !== undefined ? feedback : '',
        gradedBy: gradedByName,
        instructorId: instructorId || baseSubmission?.instructorId || '',
        gradedAt: now,
        updatedAt: now,
        submissionHistory: updatedHistory,
        // PROMPT 38: Retirar la exclusión activa en Firestore al calificar con A, N o C
        isExcluded: false,
        excludedAt: null,
        excludedBy: null,
        excludedByName: null,
        exclusionReason: null,
      };

      if (updatedSubmission.fichaId) updateData.fichaId = updatedSubmission.fichaId;
      if (updatedSubmission.activityId) updateData.activityId = updatedSubmission.activityId;
      if (updatedSubmission.learnerId || updatedSubmission.userId) {
        updateData.learnerId = updatedSubmission.learnerId || updatedSubmission.userId;
        updateData.userId = updatedSubmission.userId || updatedSubmission.learnerId;
      }
      if (updatedSubmission.learnerName) updateData.learnerName = updatedSubmission.learnerName;
      if (updatedSubmission.learnerEmail) updateData.learnerEmail = updatedSubmission.learnerEmail;
      if (updatedSubmission.activityTitle) updateData.activityTitle = updatedSubmission.activityTitle;
      if (rubricEvaluationId) updateData.rubricEvaluationId = rubricEvaluationId;
      if (rubricScore !== undefined) updateData.rubricScore = rubricScore;
      if (rubricMaxScore !== undefined) updateData.rubricMaxScore = rubricMaxScore;
      if (rubricPercentage !== undefined) updateData.rubricPercentage = rubricPercentage;

      await setDoc(subRef, cleanUndefined(updateData), { merge: true });

      // Retirar learnerId de excludedLearnerIds en /activities/{activityId} si existía
      const targetActId = updatedSubmission.activityId || baseSubmission?.activityId || payload.submission?.activityId;
      const targetLearnerUid = updatedSubmission.learnerId || updatedSubmission.userId || baseSubmission?.learnerId || payload.submission?.learnerId;
      if (targetActId && targetLearnerUid) {
        try {
          const actRef = doc(db, FIRESTORE_COLLECTIONS.ACTIVITIES, targetActId);
          await updateDoc(actRef, {
            excludedLearnerIds: arrayRemove(targetLearnerUid),
            updatedAt: now,
          });
        } catch (errAct) {
          console.warn('[submissionService] Aviso retirando learnerId de excludedLearnerIds en actividad al calificar:', errAct);
        }
      }
    } catch (err: any) {
      console.error(`[submissionService] Error persistiendo calificación en Firestore (/submissions/${submissionId}):`, {
        code: err?.code,
        message: err?.message,
        details: err,
      });
      throw err;
    }

    // 6. Notificaciones y Gamificación institucional
    const targetLearnerId = updatedSubmission.learnerId || updatedSubmission.userId;
    if (targetLearnerId) {
      notificationService
        .notifyEvidenceGraded({
          submissionId: updatedSubmission.id,
          activityId: updatedSubmission.activityId,
          activityTitle: updatedSubmission.activityTitle,
          learnerId: targetLearnerId,
          gradeCode,
          feedback,
          version: updatedSubmission.version || 1,
        })
        .catch((e) => console.warn('[submissionService] Error despachando notificación de calificación:', e));

      if (gradeCode === 'A') {
        gamificationService
          .onEvidenceApproved({
            submissionId: updatedSubmission.id,
            userId: targetLearnerId,
            version: updatedSubmission.version || 1,
            activityTitle: updatedSubmission.activityTitle,
          })
          .catch((e) => console.warn('[submissionService] Error en gamificación Aprobada:', e));

        gamificationService
          .onActivityCompleted({
            activityId: updatedSubmission.activityId,
            userId: targetLearnerId,
            activityTitle: updatedSubmission.activityTitle,
          })
          .catch((e) => console.warn('[submissionService] Error en gamificación Actividad Completada:', e));
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
      window.dispatchEvent(new CustomEvent('sena_submission_graded', { detail: updatedSubmission }));
    }

    return updatedSubmission;
  },

  /**
   * Evaluación Masiva: Aplica calificación A, N o C a múltiples evidencias seleccionadas
   */
  async batchGradeSubmissions(payload: {
    submissionIds: string[];
    gradeCode: AcademicGradeCode;
    feedback?: string;
    instructorId: string;
    instructorName?: string;
  }): Promise<void> {
    const { submissionIds, gradeCode, feedback, instructorId, instructorName } = payload;
    if (submissionIds.length === 0) return;

    const now = new Date().toISOString();
    const status: SubmissionAcademicStatus =
      gradeCode === 'A' ? 'approved' : gradeCode === 'N' ? 'not_approved' : 'correction_required';
    const gradedByName = instructorName || instructorId;

    // 1. Actualizar en memoria
    inMemorySubmissions = inMemorySubmissions.map((s) => {
      if (submissionIds.includes(s.id)) {
        return {
          ...s,
          status,
          grade: gradeCode,
          feedback: feedback !== undefined && feedback.trim() ? feedback : s.feedback,
          gradedBy: gradedByName,
          instructorId,
          gradedAt: now,
          updatedAt: now,
        };
      }
      return s;
    });

    // 2. Actualizar en Cloud Firestore en paralelo y despachar notificaciones
    const updatePromises = submissionIds.map(async (id) => {
      try {
        const subRef = doc(db, COLLECTION, id);
        await setDoc(
          subRef,
          {
            status,
            grade: gradeCode,
            ...(feedback !== undefined && feedback.trim() ? { feedback } : {}),
            gradedBy: gradedByName,
            instructorId,
            gradedAt: now,
            updatedAt: now,
          },
          { merge: true }
        );

        const sub = inMemorySubmissions.find((s) => s.id === id);
        if (sub) {
          const targetLearnerId = sub.learnerId || sub.userId;
          if (targetLearnerId) {
            notificationService.notifyEvidenceGraded({
              submissionId: sub.id,
              activityId: sub.activityId,
              activityTitle: sub.activityTitle,
              learnerId: targetLearnerId,
              gradeCode,
              feedback,
              version: sub.version || 1,
            }).catch((e) => console.warn('[submissionService] Error despachando notificación masiva:', e));

            if (gradeCode === 'A') {
              gamificationService.onEvidenceApproved({
                submissionId: sub.id,
                userId: targetLearnerId,
                version: sub.version || 1,
                activityTitle: sub.activityTitle,
              }).catch((e) => console.warn('[submissionService] Error en gamificación Aprobada:', e));

              gamificationService.onActivityCompleted({
                activityId: sub.activityId,
                userId: targetLearnerId,
                activityTitle: sub.activityTitle,
              }).catch((e) => console.warn('[submissionService] Error en gamificación Actividad Completada:', e));
            }
          }
        }
      } catch (err) {
        console.warn(`[submissionService] Error en calificación masiva de ${id}:`, err);
      }
    });

    await Promise.all(updatePromises);
  },

  /**
   * Reenvío de evidencia (C = Corregir o N = No aprobada)
   * Conserva el historial de la entrega anterior, aumenta resubmissionCount
   * y vincula el nuevo archivo físico de Google Drive.
   */
  async resubmitEvidence(
    submissionId: string,
    newEvidence: {
      driveFileId?: string;
      driveUrl?: string;
      driveFileUrl?: string;
      fileName?: string;
      externalUrl?: string;
      textContent?: string;
      comments?: string;
      mimeType?: string;
      fileSize?: number;
    }
  ): Promise<AcademicSubmission> {
    let existing = inMemorySubmissions.find((s) => s.id === submissionId);
    if (!existing) {
      try {
        const snap = await getDoc(doc(db, COLLECTION, submissionId));
        if (snap.exists()) {
          existing = { id: snap.id, ...snap.data() } as AcademicSubmission;
          inMemorySubmissions = [existing, ...inMemorySubmissions];
        }
      } catch (err) {
        console.warn('[submissionService] Error obteniendo entrega para reenvío:', err);
      }
    }

    const now = new Date().toISOString();

    if (!existing) {
      throw new Error('Entrega no encontrada para reenviar corrección.');
    }

    // Verificar si el aprendiz tiene restricción académica activa
    const canSubmit = await this.canSubmitEvidence(existing.userId || existing.learnerId, existing.activityId);
    if (!canSubmit.allowed) {
      throw new Error(canSubmit.reason || 'Entrega bloqueada por restricción académica activa.');
    }

    // Registrar versión anterior en el historial
    const previousHistory = existing.submissionHistory || [];
    const currentVersionNum = existing.version || (existing.resubmissionCount || 0) + 1;

    const historyItem: SubmissionHistoryItem = {
      version: currentVersionNum,
      submittedAt: existing.submittedAt,
      driveFileId: existing.driveFileId,
      driveUrl: existing.driveUrl || existing.driveFileUrl,
      driveFileUrl: existing.driveFileUrl || existing.driveUrl,
      fileName: existing.fileName,
      externalUrl: existing.externalUrl,
      textContent: existing.textContent,
      status: existing.status,
      grade: existing.grade,
      feedback: existing.feedback,
      gradedBy: existing.gradedBy,
      gradedAt: existing.gradedAt,
    };

    const newResubmissionCount = (existing.resubmissionCount || 0) + 1;
    const newVersion = currentVersionNum + 1;

    const updatedSubmission: AcademicSubmission = {
      ...existing,
      ...newEvidence,
      status: 'submitted',
      grade: undefined, // Limpiar calificación para nueva revisión del instructor
      feedback: undefined,
      gradedBy: undefined,
      gradedAt: undefined,
      comments: newEvidence.comments || existing.comments,
      submittedAt: now,
      updatedAt: now,
      version: newVersion,
      resubmissionCount: newResubmissionCount,
      submissionHistory: [...previousHistory, historyItem],
    };

    // Actualizar en memoria
    inMemorySubmissions = inMemorySubmissions.map((s) =>
      s.id === submissionId ? updatedSubmission : s
    );

    // Actualizar en Cloud Firestore
    try {
      const subRef = doc(db, COLLECTION, submissionId);
      // Payload para Firestore
      const firestorePayload: Record<string, any> = {
        ...updatedSubmission,
        grade: null,
        gradedBy: null,
        gradedAt: null,
        feedback: null,
      };
      await setDoc(subRef, firestorePayload, { merge: true });
    } catch (err) {
      console.warn('[submissionService] Aviso al actualizar corrección en Firestore:', err);
    }

    // PROMPT 13 - Evento D: Notificar al instructor que hay una nueva versión corregida radicada
    if (updatedSubmission.instructorId) {
      notificationService.notifyResubmission({
        submissionId: updatedSubmission.id,
        activityId: updatedSubmission.activityId,
        activityTitle: updatedSubmission.activityTitle,
        instructorId: updatedSubmission.instructorId,
        learnerName: updatedSubmission.learnerName,
        newVersion: updatedSubmission.version || 1,
        fichaId: updatedSubmission.fichaId,
      }).catch((e) => console.warn('[submissionService] Error despachando notificación de reenvío:', e));
    }

    // PROMPT 14 - Evento Gamificación C: Corrección completada (+10 XP)
    const targetLearnerId = updatedSubmission.learnerId || updatedSubmission.userId;
    if (targetLearnerId) {
      gamificationService
        .onCorrectionCompleted({
          submissionId: updatedSubmission.id,
          userId: targetLearnerId,
          version: updatedSubmission.version || 1,
          activityTitle: updatedSubmission.activityTitle,
        })
        .catch((e) => console.warn('[submissionService] Error en gamificación Corrección:', e));
    }

    return updatedSubmission;
  },

  /**
   * Calcula indicadores y estadísticas pedagógicas de evaluación
   * PROMPT 9.2: Normalización mutuamente excluyente de categorías A / N / C / Pendiente
   */
  calculateStats(submissions: AcademicSubmission[]) {
    const total = submissions.length;
    let approved = 0;
    let notApproved = 0;
    let correctionRequired = 0;
    let pending = 0;

    for (const s of submissions) {
      const norm = normalizeEvaluationStatus(s);
      if (norm === 'A') approved++;
      else if (norm === 'N') notApproved++;
      else if (norm === 'C') correctionRequired++;
      else pending++;
    }

    const evaluatedCount = approved + notApproved + correctionRequired;
    const compliancePercentage = total > 0 ? Math.round((approved / total) * 100) : 0;
    const approvalPercentage = evaluatedCount > 0 ? Math.round((approved / evaluatedCount) * 100) : 0;

    return {
      total,
      approved,
      notApproved,
      correctionRequired,
      pending,
      evaluatedCount,
      compliancePercentage,
      approvalPercentage,
    };
  },

  /**
   * Actualiza el estado de una entrega (Requisito 18: submitted, under_review, correction_required, approved, not_approved)
   */
  async updateSubmissionStatus(
    submissionId: string,
    status: SubmissionAcademicStatus,
    feedback?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // Actualizar en memoria
    inMemorySubmissions = inMemorySubmissions.map((s) =>
      s.id === submissionId
        ? {
            ...s,
            status,
            feedback: feedback !== undefined ? feedback : s.feedback,
            updatedAt: now,
          }
        : s
    );

    // Actualizar en Firestore
    try {
      const subRef = doc(db, COLLECTION, submissionId);
      await setDoc(
        subRef,
        {
          status,
          ...(feedback !== undefined && { feedback }),
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[submissionService] Aviso actualizando estado en Firestore:', err);
    }
  },

  /**
   * Excluye / exonera a un aprendiz de una evidencia formativa específica (Botón E - Excluir)
   * Persiste la exclusión en Firestore (/submissions y /activities) de forma explícita y trazable.
   */
  async excludeLearnerFromActivity(payload: {
    submissionId?: string;
    activityId: string;
    activityTitle?: string;
    fichaId: string;
    learnerId: string;
    learnerName: string;
    learnerEmail?: string;
    instructorId: string;
    instructorName?: string;
    reason?: string;
    submission?: AcademicSubmission;
  }): Promise<AcademicSubmission> {
    const {
      submissionId,
      activityId,
      activityTitle,
      fichaId,
      learnerId,
      learnerName,
      learnerEmail,
      instructorId,
      instructorName,
      reason,
      submission,
    } = payload;
    const now = new Date().toISOString();
    const subId =
      submissionId ||
      submission?.id ||
      `sub_${fichaId}_${activityId}_${learnerId}`;

    let baseSubmission: AcademicSubmission | null =
      submission || inMemorySubmissions.find((s) => s.id === subId) || null;

    if (!baseSubmission) {
      try {
        const snap = await getDoc(doc(db, COLLECTION, subId));
        if (snap.exists()) {
          baseSubmission = snap.data() as AcademicSubmission;
        }
      } catch (err) {
        console.warn('[submissionService] Error obteniendo entrega para exclusión:', err);
      }
    }

    const updatedSubmission: AcademicSubmission = {
      ...(baseSubmission || {
        id: subId,
        learnerId,
        userId: learnerId,
        learnerName,
        learnerEmail: learnerEmail || '',
        activityId,
        activityTitle: activityTitle || 'Actividad Formativa',
        fichaId,
        courseId: '',
        submissionType: 'document' as const,
        resubmissionCount: 0,
        version: 1,
        submittedAt: now,
        createdAt: now,
      }),
      isExcluded: true,
      status: 'exonerated',
      grade: undefined,
      previousGrade: (baseSubmission?.grade as AcademicGradeCode) || (baseSubmission as any)?.previousGrade,
      excludedAt: now,
      excludedBy: instructorId,
      excludedByName: instructorName || 'Instructor SENA',
      exclusionReason: reason || 'Exonerado de evidencia por el instructor',
      updatedAt: now,
    };

    // Actualizar en memoria
    const memIdx = inMemorySubmissions.findIndex((s) => s.id === subId);
    if (memIdx >= 0) {
      inMemorySubmissions[memIdx] = updatedSubmission;
    } else {
      inMemorySubmissions = [updatedSubmission, ...inMemorySubmissions];
    }

    // Persistir en Firestore /submissions
    try {
      const subRef = doc(db, COLLECTION, subId);
      const updateData: Record<string, any> = {
        id: subId,
        activityId,
        fichaId,
        learnerId,
        userId: learnerId,
        learnerName,
        isExcluded: true,
        status: 'exonerated',
        grade: null,
        previousGrade: (baseSubmission?.grade as AcademicGradeCode) || (baseSubmission as any)?.previousGrade || null,
        excludedAt: now,
        excludedBy: instructorId,
        excludedByName: instructorName || 'Instructor SENA',
        exclusionReason: reason || 'Exonerado de evidencia por el instructor',
        updatedAt: now,
      };
      if (activityTitle) updateData.activityTitle = activityTitle;
      if (learnerEmail) updateData.learnerEmail = learnerEmail;

      await setDoc(subRef, cleanUndefined(updateData), { merge: true });
    } catch (err) {
      console.error('[submissionService] Error persistiendo exclusión en /submissions:', err);
      throw err;
    }

    // Persistir también en Firestore /activities/{activityId} si existe
    if (activityId) {
      try {
        const actRef = doc(db, FIRESTORE_COLLECTIONS.ACTIVITIES, activityId);
        await updateDoc(actRef, {
          excludedLearnerIds: arrayUnion(learnerId),
          updatedAt: now,
        });
      } catch (errAct) {
        console.warn('[submissionService] Aviso actualizando excludedLearnerIds en actividad:', errAct);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_submission_graded', { detail: updatedSubmission }));
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }

    return updatedSubmission;
  },

  /**
   * Retira la exclusión de un aprendiz de una evidencia formativa (Rehabilitar evidencia)
   */
  async removeExclusionFromActivity(payload: {
    submissionId: string;
    activityId: string;
    fichaId: string;
    learnerId: string;
    instructorId: string;
  }): Promise<AcademicSubmission | null> {
    const { submissionId, activityId, learnerId } = payload;
    const now = new Date().toISOString();

    let baseSubmission: AcademicSubmission | null =
      inMemorySubmissions.find((s) => s.id === submissionId) || null;

    if (!baseSubmission) {
      try {
        const snap = await getDoc(doc(db, COLLECTION, submissionId));
        if (snap.exists()) {
          baseSubmission = snap.data() as AcademicSubmission;
        }
      } catch (err) {
        console.warn('[submissionService] Error obteniendo entrega al retirar exclusión:', err);
      }
    }

    // Calcular estado restaurado: si tiene dictamen previo o entrega de archivo
    let restoredStatus: SubmissionAcademicStatus = 'pending';
    if (baseSubmission?.grade) {
      restoredStatus =
        baseSubmission.grade === 'A'
          ? 'approved'
          : baseSubmission.grade === 'C'
          ? 'correction_required'
          : 'not_approved';
    } else if (
      baseSubmission?.fileName ||
      baseSubmission?.driveUrl ||
      baseSubmission?.externalUrl ||
      baseSubmission?.textContent
    ) {
      restoredStatus = 'submitted';
    }

    const updatedSubmission: AcademicSubmission = {
      ...(baseSubmission || {
        id: submissionId,
        activityId,
        learnerId,
        userId: learnerId,
        fichaId: payload.fichaId,
        courseId: '',
        submissionType: 'document' as const,
        resubmissionCount: 0,
        version: 1,
        submittedAt: now,
        createdAt: now,
      }),
      isExcluded: false,
      status: restoredStatus,
      excludedAt: undefined,
      excludedBy: undefined,
      excludedByName: undefined,
      exclusionReason: undefined,
      updatedAt: now,
    };

    // Actualizar en memoria
    const memIdx = inMemorySubmissions.findIndex((s) => s.id === submissionId);
    if (memIdx >= 0) {
      inMemorySubmissions[memIdx] = updatedSubmission;
    }

    // Persistir en Firestore /submissions
    try {
      const subRef = doc(db, COLLECTION, submissionId);
      await setDoc(
        subRef,
        {
          isExcluded: false,
          status: restoredStatus,
          excludedAt: null,
          excludedBy: null,
          excludedByName: null,
          exclusionReason: null,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (err) {
      console.error('[submissionService] Error retirando exclusión en /submissions:', err);
      throw err;
    }

    // Actualizar en Firestore /activities/{activityId}
    if (activityId) {
      try {
        const actRef = doc(db, FIRESTORE_COLLECTIONS.ACTIVITIES, activityId);
        await updateDoc(actRef, {
          excludedLearnerIds: arrayRemove(learnerId),
          updatedAt: now,
        });
      } catch (errAct) {
        console.warn('[submissionService] Aviso retirando excludedLearnerIds en actividad:', errAct);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_submission_graded', { detail: updatedSubmission }));
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }

    return updatedSubmission;
  },
};
