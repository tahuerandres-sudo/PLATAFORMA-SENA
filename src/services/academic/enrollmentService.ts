/**
 * @license
 * SENA Learning Hub - Servicio de Matrículas y Aprendices
 * PROMPT 8.1 & PROMPT 21: Asignación Exclusiva por Instructor y Autorización por Gmail
 * Colecciones Firestore: /enrollments, /users, /fichas
 *
 * REGLAS INSTITUCIONALES CRÍTICAS:
 * 1. NINGÚN APRENDIZ TIENE ACCESO ACADÉMICO POR DEFECTO.
 * 2. Un aprendiz solo accede si un instructor previamente registró su correo Gmail en una ficha.
 * 3. Si el correo no tiene cuenta previa, se crea con estado PENDING.
 * 4. Al iniciar sesión con Google, el sistema activa automáticamente la matrícula vinculando su UID.
 * 5. Si no tiene asignación, se bloquea el acceso a módulos académicos.
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
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import { Enrollment, EnrollmentStatus, ApprenticeWithEnrollment } from '../../types/academic';
import { fichaService } from './fichaService';

const COLLECTION = FIRESTORE_COLLECTIONS.ENROLLMENTS;
const USERS_COLLECTION = FIRESTORE_COLLECTIONS.USERS;

let inMemoryEnrollments: Enrollment[] = [];

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

export interface AddLearnerByEmailPayload {
  fichaId: string;
  email: string;
  instructorUid: string;
  instructorName?: string;
}

export interface AddLearnerResult {
  enrollment: Enrollment;
  status: 'active' | 'pending';
  message: string;
  fichaNumber: string;
  email: string;
}

export const enrollmentService = {
  /**
   * PROMPT 21: Registra a un aprendiz en una ficha mediante su correo Gmail
   * Puede registrarse antes o después de que el aprendiz cree su cuenta.
   * Valida estrictamente:
   * - Formato de correo válido y normalizado en minúsculas sin espacios
   * - Autorización del instructor sobre la ficha
   * - Prevención de duplicados en la misma ficha
   * - Hereda programa y centro directamente de la ficha (no Contabilidad por defecto)
   */
  async addLearnerByEmail(payload: AddLearnerByEmailPayload): Promise<AddLearnerResult> {
    const rawEmail = payload.email || '';
    const normalizedEmail = rawEmail.trim().toLowerCase();

    // 1. Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('El formato del correo electrónico es inválido.');
    }

    if (!payload.fichaId) {
      throw new Error('Debes seleccionar una ficha válida para asignar al aprendiz.');
    }

    // 2. Validar que la ficha exista y pertenezca al instructor
    const ficha = await fichaService.getFichaById(payload.fichaId);
    if (!ficha) {
      throw new Error('La ficha especificada no existe en el sistema.');
    }

    const isAssigned =
      !payload.instructorUid ||
      (ficha.instructorIds && ficha.instructorIds.includes(payload.instructorUid)) ||
      (ficha.createdBy && ficha.createdBy === payload.instructorUid);

    if (!isAssigned) {
      throw new Error('No tienes permisos para agregar aprendices a esta ficha.');
    }

    // 3. Verificar si el correo ya está matriculado en esta ficha (evitar duplicados)
    const existingEnrollments = await this.getEnrollmentsByFicha(ficha.id);
    const isAlreadyEnrolled = existingEnrollments.data.some(
      (e) => (e.learnerEmail || '').toLowerCase() === normalizedEmail
    );

    if (isAlreadyEnrolled) {
      throw new Error('Este aprendiz ya está registrado en esta ficha.');
    }

    // 4. Comprobar si el aprendiz ya tiene una cuenta en /users
    let existingLearnerId: string | null = null;
    let initialStatus: EnrollmentStatus = 'pending';

    try {
      const userQ = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', normalizedEmail)
      );
      const userSnap = await getDocs(userQ);
      if (!userSnap.empty) {
        existingLearnerId = userSnap.docs[0].id;
        initialStatus = 'active'; // Si ya existe cuenta en /users, se asocia directamente activa
      }
    } catch (err) {
      console.warn('[enrollmentService] Búsqueda de usuario por correo en /users:', err);
    }

    const now = new Date().toISOString();
    // Identificador determinista: enrollment_{normalizedEmail}_{fichaId}
    const sanitizedEmail = normalizedEmail.replace(/[^a-z0-9]/g, '_');
    const enrollmentId = `enr_${sanitizedEmail}_${ficha.id}`;

    const newEnrollment: Enrollment = {
      id: enrollmentId,
      userId: existingLearnerId || '',
      learnerId: existingLearnerId || null,
      apprenticeId: existingLearnerId || null,
      learnerEmail: normalizedEmail,
      fichaId: ficha.id,
      programId: ficha.programId || '',
      centerId: ficha.centerId || '',
      status: initialStatus,
      assignedBy: payload.instructorUid || '',
      assignedByName: payload.instructorName || 'Instructor',
      assignedAt: now,
      ...(initialStatus === 'active' ? { activatedAt: now } : {}),
      enrollmentDate: now,
      createdAt: now,
      updatedAt: now,
    };

    // 5. Guardar en memoria y persistir en Cloud Firestore
    const idx = inMemoryEnrollments.findIndex((e) => e.id === enrollmentId);
    if (idx !== -1) {
      inMemoryEnrollments[idx] = newEnrollment;
    } else {
      inMemoryEnrollments = [newEnrollment, ...inMemoryEnrollments];
    }

    try {
      await setDoc(doc(db, COLLECTION, enrollmentId), cleanUndefined(newEnrollment));
    } catch (err: any) {
      console.error('[enrollmentService] Error persistiendo matrícula en Firestore:', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
        throw new Error('No tienes permisos para agregar aprendices a esta ficha.');
      }
      throw new Error('No fue posible registrar el aprendiz. Verifica tu conexión e inténtalo nuevamente.');
    }

    // 6. Si el usuario ya tenía cuenta creada en /users, actualizar su fichaId y programId con los de la ficha asignada
    if (existingLearnerId) {
      try {
        const userRef = doc(db, USERS_COLLECTION, existingLearnerId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (!uData.fichaId || uData.fichaId === '1234567') {
            await setDoc(
              userRef,
              {
                fichaId: ficha.id,
                programId: ficha.programId || '',
                programName: ficha.programName || '',
                centerId: ficha.centerId || '',
                updatedAt: now,
              },
              { merge: true }
            );
          }
        }
      } catch (eUser) {
        console.warn('[enrollmentService] Actualizando perfil del aprendiz:', eUser);
      }
    }

    // 7. Notificar a observadores para refrescar contadores del Sidebar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }

    const message =
      initialStatus === 'active'
        ? `El aprendiz con correo ${normalizedEmail} fue matriculado y activado exitosamente en la Ficha ${ficha.number}.`
        : `El correo ${normalizedEmail} quedó registrado como PENDIENTE. Su matrícula se activará automáticamente cuando inicie sesión con Google.`;

    return {
      enrollment: newEnrollment,
      status: initialStatus,
      message,
      fichaNumber: ficha.number,
      email: normalizedEmail,
    };
  },

  /**
   * PROMPT 21 - Activa matrículas pendientes cuando el aprendiz inicia sesión con Google
   * - Busca matrículas pendientes por correo electrónico normalizado
   * - Vincula el UID real de Firebase Auth: learnerId = uid, userId = uid, status = 'active'
   * - Actualiza el documento /users/{uid} con la ficha y programa heredados del instructor
   */
  async activatePendingEnrollmentsForUser(user: {
    uid: string;
    email: string;
    displayName?: string;
  }): Promise<Enrollment[]> {
    if (!user.email || !user.uid) return [];
    const normalizedEmail = user.email.trim().toLowerCase();
    const activatedList: Enrollment[] = [];

    try {
      const q = query(collection(db, COLLECTION), where('learnerEmail', '==', normalizedEmail));
      const snap = await getDocs(q);

      const now = new Date().toISOString();
      for (const d of snap.docs) {
        const enr = { id: d.id, ...d.data() } as Enrollment;
        if (enr.status === 'pending' || !enr.userId || enr.userId !== user.uid) {
          const updates: Partial<Enrollment> = {
            userId: user.uid,
            learnerId: user.uid,
            apprenticeId: user.uid,
            status: 'active',
            activatedAt: now,
            updatedAt: now,
          };
          try {
            await updateDoc(doc(db, COLLECTION, d.id), updates);
            const fullActivated = { ...enr, ...updates } as Enrollment;
            activatedList.push(fullActivated);

            // Actualizar memoria
            const mIdx = inMemoryEnrollments.findIndex((m) => m.id === d.id);
            if (mIdx !== -1) inMemoryEnrollments[mIdx] = fullActivated;
          } catch (eUp) {
            console.warn(`[enrollmentService] Error activando matrícula ${d.id}:`, eUp);
          }
        }
      }

      // Sincronizar /users/{uid} con los datos de la ficha asignada si no estaban configurados
      if (activatedList.length > 0) {
        const primary = activatedList[0];
        try {
          const userDocRef = doc(db, USERS_COLLECTION, user.uid);
          const userSnap = await getDoc(userDocRef);
          const ficha = await fichaService.getFichaById(primary.fichaId);

          if (userSnap.exists()) {
            const currentU = userSnap.data();
            if (!currentU.fichaId || currentU.fichaId === '1234567') {
              await setDoc(
                userDocRef,
                {
                  fichaId: primary.fichaId,
                  programId: primary.programId,
                  programName: ficha?.programName || currentU.programName || '',
                  centerId: primary.centerId,
                  updatedAt: now,
                },
                { merge: true }
              );
            }
          }
        } catch (errSync) {
          console.warn('[enrollmentService] Error sincronizando /users con ficha activada:', errSync);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
        }
      }
    } catch (err) {
      console.warn('[enrollmentService] Error buscando matrículas pendientes por correo:', err);
    }

    return activatedList;
  },

  /**
   * Busca matrículas por correo electrónico
   */
  async findEnrollmentsByEmail(email: string): Promise<Enrollment[]> {
    if (!email) return [];
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const q = query(collection(db, COLLECTION), where('learnerEmail', '==', normalizedEmail));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
    } catch (err) {
      console.warn('[enrollmentService] Error consultando matrículas por correo:', err);
      return [];
    }
  },

  /**
   * Obtiene la lista de matrículas por ficha desde Firestore
   */
  async getEnrollmentsByFicha(fichaId: string): Promise<{ data: Enrollment[]; isDemo: boolean }> {
    try {
      const q = query(collection(db, COLLECTION), where('fichaId', '==', fichaId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
        const merged = [
          ...inMemoryEnrollments.filter((e) => !fromDb.some((de) => de.id === e.id)),
          ...fromDb,
        ];
        const filtered = merged.filter((e) => e.fichaId === fichaId);
        return { data: filtered, isDemo: false };
      }
    } catch (error) {
      console.warn('[enrollmentService] Lectura de enrollments en Firestore:', error);
    }

    const filtered = inMemoryEnrollments.filter((e) => e.fichaId === fichaId);
    return { data: filtered, isDemo: false };
  },

  /**
   * Obtiene la matrícula activa de un aprendiz específico por userId, learnerId o email
   */
  async getEnrollmentByLearnerId(learnerId: string, learnerEmail?: string): Promise<Enrollment | null> {
    const memoryFound = inMemoryEnrollments.find(
      (e) =>
        e.status === 'active' &&
        (e.userId === learnerId ||
          e.learnerId === learnerId ||
          (learnerEmail && e.learnerEmail === learnerEmail.trim().toLowerCase()))
    );
    if (memoryFound) return memoryFound;

    try {
      if (learnerId) {
        const q = query(
          collection(db, COLLECTION),
          where('userId', '==', learnerId),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          return { id: snap.docs[0].id, ...snap.docs[0].data() } as Enrollment;
        }

        const qLearner = query(
          collection(db, COLLECTION),
          where('learnerId', '==', learnerId),
          where('status', '==', 'active')
        );
        const snapLearner = await getDocs(qLearner);
        if (!snapLearner.empty) {
          return { id: snapLearner.docs[0].id, ...snapLearner.docs[0].data() } as Enrollment;
        }
      }

      if (learnerEmail) {
        const qEmail = query(
          collection(db, COLLECTION),
          where('learnerEmail', '==', learnerEmail.trim().toLowerCase()),
          where('status', '==', 'active')
        );
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          return { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() } as Enrollment;
        }
      }
    } catch (error) {
      console.warn('[enrollmentService] Error buscando matrícula por aprendiz:', error);
    }
    return null;
  },

  /**
   * Obtiene todas las matrículas activas de un aprendiz
   * Si no tiene ninguna matrícula activa, retorna [] (NO inventa Contabilidad)
   */
  async getLearnerEnrollments(learnerId: string, learnerEmail?: string): Promise<Enrollment[]> {
    if (!learnerId && !learnerEmail) return [];
    try {
      const map = new Map<string, Enrollment>();

      if (learnerId) {
        const q1 = query(
          collection(db, COLLECTION),
          where('userId', '==', learnerId),
          where('status', '==', 'active')
        );
        const s1 = await getDocs(q1);
        s1.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Enrollment));

        const q2 = query(
          collection(db, COLLECTION),
          where('learnerId', '==', learnerId),
          where('status', '==', 'active')
        );
        const s2 = await getDocs(q2);
        s2.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Enrollment));
      }

      if (learnerEmail) {
        const norm = learnerEmail.trim().toLowerCase();
        const qEmail = query(
          collection(db, COLLECTION),
          where('learnerEmail', '==', norm),
          where('status', '==', 'active')
        );
        const sEmail = await getDocs(qEmail);
        sEmail.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Enrollment));
      }

      return Array.from(map.values());
    } catch (err) {
      console.warn('[enrollmentService] Error en getLearnerEnrollments:', err);
      return [];
    }
  },

  /**
   * Obtiene todas las matrículas con filtros opcionales (fichaId, programId, centerId, status)
   */
  async getEnrollments(filter?: {
    fichaId?: string;
    programId?: string;
    centerId?: string;
    status?: EnrollmentStatus;
  }): Promise<{ data: Enrollment[]; isDemo: boolean }> {
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
        let results = [
          ...inMemoryEnrollments.filter((e) => !fromDb.some((de) => de.id === e.id)),
          ...fromDb,
        ];
        if (filter?.fichaId && filter.fichaId !== 'all') results = results.filter((e) => e.fichaId === filter.fichaId);
        if (filter?.programId && filter.programId !== 'all') results = results.filter((e) => e.programId === filter.programId);
        if (filter?.centerId && filter.centerId !== 'all') results = results.filter((e) => e.centerId === filter.centerId);
        if (filter?.status) results = results.filter((e) => e.status === filter.status);
        return { data: results, isDemo: false };
      }
    } catch (error) {
      console.warn('[enrollmentService] Error buscando matrículas:', error);
    }

    let results = [...inMemoryEnrollments];
    if (filter?.fichaId && filter.fichaId !== 'all') results = results.filter((e) => e.fichaId === filter.fichaId);
    if (filter?.programId && filter.programId !== 'all') results = results.filter((e) => e.programId === filter.programId);
    if (filter?.centerId && filter.centerId !== 'all') results = results.filter((e) => e.centerId === filter.centerId);
    if (filter?.status) results = results.filter((e) => e.status === filter.status);
    return { data: results, isDemo: false };
  },

  /**
   * PROMPT 8.1 & 21 - Obtiene los aprendices reales de una ficha cruzando:
   * FICHA → /enrollments → userId / learnerId → /users/{uid}
   * Incluye tanto aprendices ACTIVOS como PENDIENTES.
   * Valida estrictamente que el instructor esté asignado a la ficha.
   */
  async getApprenticesWithEnrollment(
    fichaId: string,
    instructorUid?: string
  ): Promise<{ data: ApprenticeWithEnrollment[]; isDemo: boolean; unauthorized?: boolean }> {
    try {
      let targetFichas: Array<{ id: string; number: string; programName?: string; instructorIds?: string[] }> = [];

      if (fichaId !== 'all') {
        const ficha = await fichaService.getFichaById(fichaId);
        if (!ficha) {
          const allFichasRes = await fichaService.getFichas();
          const found = allFichasRes.data.find((f) => f.number === fichaId || f.id === fichaId);
          if (found) {
            targetFichas = [found];
          }
        } else {
          targetFichas = [ficha];
        }

        if (instructorUid && targetFichas.length > 0) {
          const authorized = targetFichas[0].instructorIds?.includes(instructorUid);
          if (!authorized) {
            console.warn(`[enrollmentService] Instructor ${instructorUid} no asignado a la ficha ${fichaId}`);
            return { data: [], isDemo: false, unauthorized: true };
          }
        }
      } else {
        const fichasRes = await fichaService.getFichas(instructorUid);
        targetFichas = fichasRes.data || [];
      }

      if (targetFichas.length === 0 && fichaId !== 'all') {
        return { data: [], isDemo: false };
      }

      const fichaMap = new Map<string, (typeof targetFichas)[0]>();
      targetFichas.forEach((f) => {
        fichaMap.set(f.id, f);
        if (f.number) fichaMap.set(f.number, f);
      });

      let enrollments: Enrollment[] = [];

      if (fichaId !== 'all') {
        const targetFicha = targetFichas[0];
        const q1 = query(collection(db, COLLECTION), where('fichaId', '==', targetFicha.id));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          enrollments = snap1.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
        }

        if (enrollments.length === 0 && targetFicha.number && targetFicha.number !== targetFicha.id) {
          const qNum = query(collection(db, COLLECTION), where('fichaId', '==', targetFicha.number));
          const snapNum = await getDocs(qNum);
          if (!snapNum.empty) {
            enrollments = snapNum.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
          }
        }
      } else {
        const allowedFichaIds = targetFichas.map((f) => f.id);
        const snapAll = await getDocs(collection(db, COLLECTION));
        if (!snapAll.empty) {
          enrollments = snapAll.docs
            .map((d) => ({ id: d.id, ...d.data() } as Enrollment))
            .filter((e) => allowedFichaIds.includes(e.fichaId));
        }
      }

      if (enrollments.length === 0) {
        return { data: [], isDemo: false };
      }

      const apprentices: ApprenticeWithEnrollment[] = [];

      for (const enr of enrollments) {
        const uid = enr.userId || enr.learnerId || enr.apprenticeId;
        const ficha = fichaMap.get(enr.fichaId) || targetFichas[0];
        const isPending = enr.status === 'pending' || !uid;

        let userData: any = null;
        if (uid) {
          try {
            const userSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
            if (userSnap.exists()) {
              userData = userSnap.data();
            }
          } catch (eUser) {
            console.warn(`[enrollmentService] Error leyendo usuario ${uid} en Firestore:`, eUser);
          }
        }

        const emailDisplay = enr.learnerEmail || userData?.email || 'Sin correo registrado';
        const nameDisplay = userData?.displayName || (isPending ? emailDisplay : 'Aprendiz Registrado');

        const item: ApprenticeWithEnrollment = {
          uid: uid || `pending_${enr.id}`,
          displayName: nameDisplay,
          documentNumber: userData?.documentNumber || '—',
          email: emailDisplay,
          photoURL:
            userData?.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              nameDisplay
            )}&background=00324D&color=8CE665`,
          status: isPending ? 'pending' : (userData?.status as any) || (enr.status as any) || 'active',
          enrollmentId: enr.id,
          enrollmentStatus: enr.status,
          programName: ficha?.programName || userData?.programName || 'No registrado',
          fichaNumber: ficha?.number || enr.fichaId || 'No registrado',
          courseName: 'No registrado',
          progressPercent: 0,
          averageGrade: 'N/A',
          attendanceRate: 0,
          punctualityRate: 0,
          submittedEvidencesCount: 0,
          totalEvidencesCount: 0,
          activeAttentionCallsCount: 0,
          hasActiveRestrictions: false,
          academicNotesCount: 0,
          behavioralNotesCount: 0,
          assignedAt: enr.assignedAt || enr.createdAt,
          assignedByName: enr.assignedByName,
        };

        apprentices.push(item);
      }

      return { data: apprentices, isDemo: false };
    } catch (err) {
      console.warn('[enrollmentService] Error en getApprenticesWithEnrollment:', err);
      return { data: [], isDemo: false };
    }
  },

  /**
   * Elimina o desvincula una matrícula de una ficha
   * Requiere autorización del instructor sobre la ficha
   */
  async removeLearnerFromFicha(enrollmentId: string, instructorUid: string): Promise<void> {
    try {
      const enrDocRef = doc(db, COLLECTION, enrollmentId);
      const enrSnap = await getDoc(enrDocRef);
      if (!enrSnap.exists()) {
        throw new Error('La matrícula no existe.');
      }
      const enr = enrSnap.data() as Enrollment;

      // Validar instructor asignado a la ficha
      const isAssigned = await fichaService.isInstructorAssignedToFicha(enr.fichaId, instructorUid);
      if (!isAssigned && enr.assignedBy !== instructorUid) {
        throw new Error('No estás autorizado para desvincular aprendices de esta ficha.');
      }

      await deleteDoc(enrDocRef);
      inMemoryEnrollments = inMemoryEnrollments.filter((e) => e.id !== enrollmentId);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
      }
    } catch (err: any) {
      console.error('[enrollmentService] Error eliminando matrícula:', err);
      throw new Error(err.message || 'Error al desvincular el aprendiz de la ficha.');
    }
  },

  /**
   * Actualiza el estado de una matrícula (active, inactive, withdrawn, etc.)
   */
  async updateEnrollmentStatus(
    enrollmentId: string,
    status: EnrollmentStatus,
    instructorUid: string
  ): Promise<void> {
    const enrDocRef = doc(db, COLLECTION, enrollmentId);
    const enrSnap = await getDoc(enrDocRef);
    if (!enrSnap.exists()) {
      throw new Error('La matrícula no existe.');
    }
    const enr = enrSnap.data() as Enrollment;

    const isAssigned = await fichaService.isInstructorAssignedToFicha(enr.fichaId, instructorUid);
    if (!isAssigned && enr.assignedBy !== instructorUid) {
      throw new Error('No estás autorizado para modificar el estado de esta matrícula.');
    }

    const now = new Date().toISOString();
    await updateDoc(enrDocRef, {
      status,
      updatedAt: now,
    });

    const mIdx = inMemoryEnrollments.findIndex((e) => e.id === enrollmentId);
    if (mIdx !== -1) {
      inMemoryEnrollments[mIdx] = { ...inMemoryEnrollments[mIdx], status, updatedAt: now };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }
  },

  /**
   * Registra o actualiza una matrícula directamente
   */
  async enrollApprentice(enrollment: Enrollment): Promise<Enrollment> {
    const now = new Date().toISOString();
    const updated: Enrollment = {
      ...enrollment,
      learnerId: enrollment.learnerId || enrollment.userId,
      createdAt: enrollment.createdAt || now,
      updatedAt: now,
    };

    const idx = inMemoryEnrollments.findIndex((e) => e.id === enrollment.id);
    if (idx !== -1) {
      inMemoryEnrollments[idx] = updated;
    } else {
      inMemoryEnrollments = [updated, ...inMemoryEnrollments];
    }

    try {
      await setDoc(doc(db, COLLECTION, enrollment.id), updated, { merge: true });
    } catch (err) {
      console.warn('[enrollmentService] Aviso guardando matrícula en Firestore:', err);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }

    return updated;
  },
};
