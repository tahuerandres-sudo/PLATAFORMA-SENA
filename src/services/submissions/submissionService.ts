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

const COLLECTION = FIRESTORE_COLLECTIONS.SUBMISSIONS;

// Almacén en memoria sincronizado para que las entregas creadas en la sesión se vean en tiempo real
let inMemorySubmissions: AcademicSubmission[] = [];

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
      await setDoc(doc(db, COLLECTION, id), fullSubmission);
    } catch (err) {
      console.warn(
        '[submissionService] Aviso al escribir en Firestore (se conserva en memoria de sesión):',
        err
      );
    }

    return fullSubmission;
  },

  /**
   * Obtiene todas las entregas registradas en Firestore (/submissions)
   * PROMPT 9.2: Respeta las reglas de seguridad de Firestore acotando
   * las consultas estrictamente a las fichas asignadas al instructor (Instructor -> Fichas Asignadas -> Submissions).
   */
  async getAllSubmissions(
    instructorId?: string,
    assignedFichaIds?: string[]
  ): Promise<{ data: AcademicSubmission[]; isDemo: boolean; error?: string }> {
    try {
      let targetFichaIds: string[] = assignedFichaIds ? [...assignedFichaIds] : [];
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
          if (sub.fichaId && targetFichaIds.includes(sub.fichaId) && !subMap.has(sub.id)) {
            subMap.set(sub.id, sub);
          }
        });

        const combined = Array.from(subMap.values());
        combined.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );

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
   * Califica una entrega con dictamen oficial SENA (A = Aprobado, N = No aprobado, C = Corregir)
   * Registra gradedBy, instructorId, gradedAt, status, grade ('A' | 'N' | 'C') y retroalimentación
   */
  async gradeSubmission(payload: {
    submissionId: string;
    gradeCode: AcademicGradeCode;
    score?: number;
    feedback?: string;
    instructorId: string;
    instructorName?: string;
  }): Promise<AcademicSubmission | null> {
    const { submissionId, gradeCode, score, feedback, instructorId, instructorName } = payload;
    const now = new Date().toISOString();
    const status: SubmissionAcademicStatus =
      gradeCode === 'A' ? 'approved' : gradeCode === 'N' ? 'not_approved' : 'correction_required';

    const gradedByName = instructorName || instructorId;
    const scoreVal = score !== undefined ? score : gradeCode === 'A' ? 100 : gradeCode === 'N' ? 0 : 50;

    let updatedSubmission: AcademicSubmission | null = null;

    // Actualizar en memoria
    inMemorySubmissions = inMemorySubmissions.map((s) => {
      if (s.id === submissionId) {
        updatedSubmission = {
          ...s,
          status,
          grade: gradeCode,
          feedback: feedback !== undefined ? feedback : s.feedback,
          gradedBy: gradedByName,
          instructorId,
          gradedAt: now,
          updatedAt: now,
        };
        return updatedSubmission;
      }
      return s;
    });

    // Actualizar en Cloud Firestore (/submissions/{submissionId})
    try {
      const subRef = doc(db, COLLECTION, submissionId);
      await setDoc(
        subRef,
        {
          status,
          grade: gradeCode,
          feedback: feedback !== undefined ? feedback : '',
          gradedBy: gradedByName,
          instructorId,
          gradedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[submissionService] Aviso guardando calificación en Firestore:', err);
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

    // 2. Actualizar en Cloud Firestore en paralelo
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
};
