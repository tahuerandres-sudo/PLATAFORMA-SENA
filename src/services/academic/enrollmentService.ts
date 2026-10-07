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
import { db, auth } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import { Enrollment, EnrollmentStatus, ApprenticeWithEnrollment, Ficha } from '../../types/academic';
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

    if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
      try {
        await (auth as any).authStateReady();
      } catch {
        // No-op
      }
    }

    // UID real autenticado del instructor desde Firebase Authentication (Requisito 6 & 9)
    const realInstructorUid = auth.currentUser?.uid || payload.instructorUid;
    const authEmail = auth.currentUser?.email || '';
    if (!realInstructorUid) {
      throw new Error('No hay una sesión de instructor autenticada.');
    }

    // 1. Validar que la ficha exista en el servicio y obtener el Document ID real (Requisito 4, 7 & 18)
    const ficha = await fichaService.getFichaById(payload.fichaId);
    if (!ficha) {
      throw new Error(`La ficha especificada (${payload.fichaId}) no existe en el sistema.`);
    }

    const realFichaId = ficha.id; // Document ID real oficial de Firestore (Requisito 18 & 19)

    // 2. LECTURA DIRECTA DE FIRESTORE de /fichas/{fichaId} (Requisito 8 de Prompt 22)
    let firestoreDocExists = false;
    let firestoreFichaData: any = null;
    let firestoreInstructorIds: string[] = [];

    try {
      const fichaDocRef = doc(db, FIRESTORE_COLLECTIONS.FICHAS, realFichaId);
      const fSnap = await getDoc(fichaDocRef);
      firestoreDocExists = fSnap.exists();
      if (firestoreDocExists) {
        firestoreFichaData = fSnap.data();
        firestoreInstructorIds = Array.isArray(firestoreFichaData?.instructorIds)
          ? firestoreFichaData.instructorIds
          : [];
      }
    } catch (readErr: any) {
      console.warn('[enrollmentService Direct Read Warning]', {
        fichaId: realFichaId,
        code: readErr?.code,
        message: readErr?.message,
      });
    }

    // Si la ficha NO existe físicamente en Firestore (ej: creación previa rechazada por reglas anteriores):
    // La persistimos ahora que las reglas están desplegadas y autorizadas (Requisito 8)
    if (!firestoreDocExists) {
      const isLegitimateCreator =
        (ficha as any).createdBy === realInstructorUid ||
        !(ficha as any).createdBy;

      if (isLegitimateCreator) {
        console.log('[PROMPT 22] Persistiendo ficha legítima en Firestore:', realFichaId);
        try {
          const fichaToPersist: Ficha = {
            ...ficha,
            id: realFichaId,
            number: ficha.number || '123',
            name: ficha.name || ficha.programName || 'Ficha de Formación',
            instructorIds: Array.isArray(ficha.instructorIds) && ficha.instructorIds.includes(realInstructorUid)
              ? ficha.instructorIds
              : [realInstructorUid],
            createdBy: (ficha as any).createdBy || realInstructorUid,
            updatedAt: new Date().toISOString(),
          };
          await setDoc(doc(db, FIRESTORE_COLLECTIONS.FICHAS, realFichaId), cleanUndefined(fichaToPersist), { merge: true });
          const recheckSnap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.FICHAS, realFichaId));
          if (recheckSnap.exists()) {
            firestoreDocExists = true;
            firestoreFichaData = recheckSnap.data();
            firestoreInstructorIds = Array.isArray(firestoreFichaData?.instructorIds)
              ? firestoreFichaData.instructorIds
              : [];
          }
        } catch (saveErr) {
          console.warn('[enrollmentService] Aviso persistiendo ficha en Firestore:', saveErr);
        }
      }
    }

    // Fuente de verdad ESTRICTA para instructorIds: DIRECTAMENTE DE FIRESTORE (Requisito 3)
    let effectiveInstructorIds = firestoreDocExists
      ? firestoreInstructorIds
      : (Array.isArray(ficha.instructorIds) ? ficha.instructorIds : []);

    // Consulta de rol de usuario en Firestore para diagnóstico (Requisito 3 & 6)
    let userFirestoreRole = 'not_found';
    try {
      const userRef = doc(db, USERS_COLLECTION, realInstructorUid);
      const uSnap = await getDoc(userRef);
      if (uSnap.exists()) {
        userFirestoreRole = uSnap.data()?.role || 'no_role_field';
      }
    } catch {
      // Ignorar si las reglas aíslan la lectura
    }

    const isInstructor =
      userFirestoreRole === 'instructor' ||
      userFirestoreRole === 'INSTRUCTOR' ||
      Boolean(
        authEmail &&
          (authEmail.toLowerCase() === 'tahuer.andres@gmail.com' ||
            authEmail.endsWith('@sena.edu.co') ||
            authEmail.includes('instructor'))
      );

    let isFichaInstructor = Boolean(
      realInstructorUid &&
      effectiveInstructorIds.includes(realInstructorUid)
    );

    // Sanitización para ID de matrícula
    const sanitizedEmail = normalizedEmail.replace(/[^a-z0-9]/g, '_');
    const enrollmentId = `enr_${sanitizedEmail}_${realFichaId}`;

    // 3. Comprobar autorización del instructor sobre la ficha en Firestore (Requisitos 10, 11, 12 y 14)
    // Si instructorIds no lo tenía en Firestore, asegurar asignación legítima
    if (!isFichaInstructor || (firestoreDocExists && !firestoreInstructorIds.includes(realInstructorUid))) {
      const isLegitimateCreator =
        firestoreFichaData?.createdBy === realInstructorUid ||
        (ficha as any).createdBy === realInstructorUid ||
        (!firestoreFichaData?.createdBy && !(ficha as any).createdBy && effectiveInstructorIds.length === 0);

      if (isLegitimateCreator) {
        console.log('[PROMPT 22] Asegurando asignación del instructor creador en Firestore:', {
          fichaId: realFichaId,
          instructorUid: realInstructorUid,
        });
        try {
          const repaired = await fichaService.ensureFichaAssignedToInstructor(realFichaId, realInstructorUid);
          if (repaired && Array.isArray(repaired.instructorIds) && repaired.instructorIds.includes(realInstructorUid)) {
            effectiveInstructorIds = repaired.instructorIds;
            isFichaInstructor = true;
          }
        } catch (repairErr: any) {
          console.error('[PROMPT 22] Error asegurando asignación legítima en Firestore:', repairErr);
        }
      }
    }

    // REGISTRO DE DIAGNÓSTICO EXACTO (Requisito 3)
    console.log('=== ADD LEARNER DEBUG ===', {
      'auth.uid': realInstructorUid,
      'auth.email': authEmail,
      'auth.role': userFirestoreRole,
      'selectedFichaId': payload.fichaId,
      'selectedFicha.numero': ficha.number,
      'selectedFicha.nombre': ficha.name || ficha.programName,
      'fichaDocumentId': realFichaId,
      'ficha.instructorIds': effectiveInstructorIds,
      'isInstructor': isInstructor,
      'isFichaInstructor': isFichaInstructor,
      'learnerEmail': normalizedEmail,
      'enrollmentId': enrollmentId,
      'directFirestoreRead': {
        documentExists: firestoreDocExists,
        documentId: realFichaId,
        rawInstructorIds: firestoreInstructorIds,
      },
    });

    // Si aún no está asignado o la ficha no existe físicamente en Firestore: Denegar tajantemente
    if (!isFichaInstructor || !firestoreDocExists) {
      console.error('=== ADD LEARNER AUTH FAILED ===', {
        currentUserUid: realInstructorUid,
        fichaId: realFichaId,
        firestoreDocExists,
        instructorIds: effectiveInstructorIds,
        reason: 'Instructor UID no está en instructorIds de la ficha en Firestore',
      });
      const authErr = new Error(
        `[Permiso Denegado]: El instructor (${realInstructorUid}) no está asignado a la ficha ${ficha.number || realFichaId} en Firestore.`
      );
      (authErr as any).code = 'permission-denied';
      throw authErr;
    }

    // 4. Verificar si el correo ya está matriculado en esta ficha (evitar duplicados - Requisito 28 PRUEBA E)
    const existingEnrollments = await this.getEnrollmentsByFicha(realFichaId);
    const isAlreadyEnrolled = existingEnrollments.data.some(
      (e) => (e.learnerEmail || '').toLowerCase() === normalizedEmail
    );

    if (isAlreadyEnrolled) {
      throw new Error(`Este aprendiz (${normalizedEmail}) ya está registrado en la ficha ${ficha.number || realFichaId}.`);
    }

    // 5. Comprobar si el aprendiz ya tiene una cuenta en /users
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

    const newEnrollment: Enrollment = {
      id: enrollmentId,
      userId: existingLearnerId || '',
      learnerId: existingLearnerId || null,
      apprenticeId: existingLearnerId || null,
      learnerEmail: normalizedEmail,
      fichaId: realFichaId, // Document ID real de Firestore (Requisito 4 & 18)
      programId: ficha.programId || 'prog_formacion_sena',
      centerId: ficha.centerId || '',
      status: initialStatus,
      assignedBy: realInstructorUid, // UID REAL DEL INSTRUCTOR AUTENTICADO (Requisito 9)
      assignedByName: payload.instructorName || auth.currentUser?.displayName || 'Instructor',
      assignedAt: now,
      ...(initialStatus === 'active' ? { activatedAt: now } : {}),
      enrollmentDate: now,
      createdAt: now,
      updatedAt: now,
    };

    // 6. Guardar en memoria y persistir en Cloud Firestore
    const idx = inMemoryEnrollments.findIndex((e) => e.id === enrollmentId);
    if (idx !== -1) {
      inMemoryEnrollments[idx] = newEnrollment;
    } else {
      inMemoryEnrollments = [newEnrollment, ...inMemoryEnrollments];
    }

    let firestoreWriteResult = 'PENDING';
    let firestoreErrorCode: string | null = null;
    let firestoreErrorMessage: string | null = null;

    try {
      await setDoc(doc(db, COLLECTION, enrollmentId), cleanUndefined(newEnrollment));
      firestoreWriteResult = 'SUCCESS';

      // Registro técnico de auditoría exacto (Requisito 3)
      console.log('=== ADD LEARNER DEBUG ===', {
        'auth.uid': realInstructorUid,
        'auth.email': authEmail,
        'auth.role': userFirestoreRole,
        'selectedFichaId': payload.fichaId,
        'selectedFicha.numero': ficha.number,
        'selectedFicha.nombre': ficha.name || ficha.programName,
        'fichaDocumentId': realFichaId,
        'ficha.instructorIds': effectiveInstructorIds,
        'isInstructor': isInstructor,
        'isFichaInstructor': isFichaInstructor,
        'learnerEmail': normalizedEmail,
        'enrollmentId': enrollmentId,
        'Firestore write result': firestoreWriteResult,
        'Firestore error code': null,
        'Firestore error message': null,
      });
    } catch (err: any) {
      firestoreWriteResult = 'FAILED';
      firestoreErrorCode = err?.code || 'unknown';
      firestoreErrorMessage = err?.message || String(err);

      // Registro de diagnóstico completo con fallo (Requisito 3)
      console.error('=== ADD LEARNER DEBUG ===', {
        'auth.uid': realInstructorUid,
        'auth.email': authEmail,
        'auth.role': userFirestoreRole,
        'selectedFichaId': payload.fichaId,
        'selectedFicha.numero': ficha.number,
        'selectedFicha.nombre': ficha.name || ficha.programName,
        'fichaDocumentId': realFichaId,
        'ficha.instructorIds': effectiveInstructorIds,
        'isInstructor': isInstructor,
        'isFichaInstructor': isFichaInstructor,
        'learnerEmail': normalizedEmail,
        'enrollmentId': enrollmentId,
        'Firestore write result': firestoreWriteResult,
        'Firestore error code': firestoreErrorCode,
        'Firestore error message': firestoreErrorMessage,
      });

      // Capturar y mostrar temporalmente en consola el error original (Requisito 4 y 5)
      console.error('error.code =', firestoreErrorCode);
      console.error('error.message =', firestoreErrorMessage);

      // NO OCULTAR EL ERROR ORIGINAL DE FIREBASE (Requisito 4 y 5)
      const fireErr = new Error(`[Firebase ${firestoreErrorCode}]: ${firestoreErrorMessage}`);
      (fireErr as any).code = firestoreErrorCode;
      throw fireErr;
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
   * Obtiene la lista de matrículas por ficha desde Firestore (PROMPT 30: Filtrar matrículas válidas)
   */
  async getEnrollmentsByFicha(fichaId: string): Promise<{ data: Enrollment[]; isDemo: boolean }> {
    if (!fichaId) return { data: [], isDemo: false };
    try {
      const q = query(collection(db, COLLECTION), where('fichaId', '==', fichaId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
        const merged = [
          ...inMemoryEnrollments.filter((e) => !fromDb.some((de) => de.id === e.id)),
          ...fromDb,
        ];
        const filtered = merged.filter((e) => e.fichaId === fichaId && e.status !== 'withdrawn' && (e.status as any) !== 'removed');
        return { data: filtered, isDemo: false };
      }
    } catch (error) {
      console.warn('[enrollmentService] Lectura de enrollments en Firestore:', error);
    }

    const filtered = inMemoryEnrollments.filter((e) => e.fichaId === fichaId && e.status !== 'withdrawn' && (e.status as any) !== 'removed');
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

      // PROMPT 30: Filtrar estrictamente matrículas válidas (no withdrawn ni retiradas)
      const validEnrollments = enrollments.filter(
        (e) => e.status !== 'withdrawn' && (e.status as any) !== 'removed' && (e.status as any) !== 'inactive'
      );

      if (validEnrollments.length === 0) {
        return { data: [], isDemo: false };
      }

      const apprentices: ApprenticeWithEnrollment[] = [];

      for (const enr of validEnrollments) {
        // En consulta de ficha específica, asegurar que pertenezca exactamente a la ficha
        if (fichaId !== 'all') {
          const targetFicha = targetFichas[0];
          if (enr.fichaId !== targetFicha.id && enr.fichaId !== targetFicha.number) {
            continue;
          }
        }

        const ficha = fichaMap.get(enr.fichaId);
        // Si la ficha no existe en el mapa de fichas válidas y es consulta por ficha, descartar
        if (!ficha && fichaId !== 'all') {
          continue;
        }

        const effectiveFicha = ficha || targetFichas[0];
        const uid = enr.userId || enr.learnerId || enr.apprenticeId;
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
          programName: effectiveFicha?.programName || userData?.programName || 'No registrado',
          fichaNumber: effectiveFicha?.number || enr.fichaId || 'No registrado',
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
   * PROMPT 27: Desvincula a un aprendiz de una ficha formativa
   * - Conserva el historial académico marcando el estado de la matrícula como 'withdrawn' (retirado)
   * - NUNCA elimina la cuenta del aprendiz ni el documento /users/{userId}
   * - Si el aprendiz tenía esta ficha en su perfil, desvincula fichaId sin tocar sus datos personales
   * - Requiere autorización estricta del instructor sobre la ficha
   */
  async removeLearnerFromFicha(
    enrollmentId: string,
    instructorUid: string,
    options: { preserveHistory?: boolean } = { preserveHistory: true }
  ): Promise<void> {
    try {
      const enrDocRef = doc(db, COLLECTION, enrollmentId);
      const enrSnap = await getDoc(enrDocRef);
      if (!enrSnap.exists()) {
        throw new Error('La matrícula no existe o ya fue removida.');
      }
      const enr = enrSnap.data() as Enrollment;

      // Validar instructor asignado a la ficha
      const isAssigned = await fichaService.isInstructorAssignedToFicha(enr.fichaId, instructorUid);
      if (!isAssigned && enr.assignedBy !== instructorUid) {
        throw new Error('No estás autorizado para desvincular aprendices de esta ficha.');
      }

      const now = new Date().toISOString();

      if (options.preserveHistory !== false) {
        // PROMPT 27: Conservar historial académico asignando estado 'withdrawn'
        await updateDoc(enrDocRef, {
          status: 'withdrawn',
          updatedAt: now,
        });

        const mIdx = inMemoryEnrollments.findIndex((e) => e.id === enrollmentId);
        if (mIdx !== -1) {
          inMemoryEnrollments[mIdx] = {
            ...inMemoryEnrollments[mIdx],
            status: 'withdrawn',
            updatedAt: now,
          };
        }
      } else {
        await deleteDoc(enrDocRef);
        inMemoryEnrollments = inMemoryEnrollments.filter((e) => e.id !== enrollmentId);
      }

      // REGLA CRÍTICA PROMPT 27: NUNCA eliminar documentos en /users ni cuentas de Authentication.
      // Si el aprendiz tenía asignada esta ficha específica, liberamos su fichaId para que pueda
      // ser matriculado en otra ficha en el futuro, conservando su cuenta, correo, rol y perfil.
      const learnerUid = enr.userId || enr.learnerId || enr.apprenticeId;
      if (learnerUid) {
        try {
          const userRef = doc(db, USERS_COLLECTION, learnerUid);
          const uSnap = await getDoc(userRef);
          if (uSnap.exists()) {
            const uData = uSnap.data();
            if (uData.fichaId === enr.fichaId) {
              await updateDoc(userRef, {
                fichaId: '',
                updatedAt: now,
              });
            }
          }
        } catch (errUser) {
          console.warn('[enrollmentService] Aviso actualizando perfil de usuario tras retiro de ficha:', errUser);
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
      }
    } catch (err: any) {
      console.error('[enrollmentService] Error desvinculando aprendiz de la ficha:', err);
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

  /**
   * PROMPT 30: Elimina definitivamente todas las matrículas vinculadas a una ficha
   * - Elimina los documentos /enrollments de Firestore de forma controlada
   * - Limpia inMemoryEnrollments
   * - Limpia el campo fichaId en /users si apuntaba a esta ficha (NUNCA elimina la cuenta del aprendiz ni el documento /users)
   */
  async deleteEnrollmentsByFicha(fichaId: string, fichaNumber?: string): Promise<number> {
    if (!fichaId) return 0;
    const docIds = new Set<string>();
    const userUidsToUnlink = new Set<string>();
    const now = new Date().toISOString();

    const targets = [fichaId];
    if (fichaNumber && fichaNumber !== fichaId) targets.push(fichaNumber);

    for (const tId of targets) {
      try {
        const q = query(collection(db, COLLECTION), where('fichaId', '==', tId));
        const snap = await getDocs(q);
        snap.docs.forEach((d) => {
          docIds.add(d.id);
          const data = d.data();
          const uId = data.userId || data.learnerId || data.apprenticeId;
          if (uId) userUidsToUnlink.add(uId);
        });
      } catch (err) {
        console.warn(`[enrollmentService] Error buscando matrículas para eliminar de ficha ${tId}:`, err);
      }
    }

    // Borrado físico de cada documento en /enrollments
    for (const id of docIds) {
      try {
        await deleteDoc(doc(db, COLLECTION, id));
        console.log('[enrollmentService] Matrícula eliminada físicamente de Firestore:', id);
      } catch (eDel) {
        console.warn(`[enrollmentService] Error eliminando enrollment ${id}:`, eDel);
      }
    }

    // Limpieza de memoria local
    inMemoryEnrollments = inMemoryEnrollments.filter(
      (e) => !targets.includes(e.fichaId) && !docIds.has(e.id)
    );

    // Desvincular fichaId de usuarios en /users sin borrar cuentas
    for (const uId of userUidsToUnlink) {
      try {
        const uRef = doc(db, USERS_COLLECTION, uId);
        const uSnap = await getDoc(uRef);
        if (uSnap.exists()) {
          const val = uSnap.data();
          if (targets.includes(val.fichaId)) {
            await updateDoc(uRef, { fichaId: '', updatedAt: now });
          }
        }
      } catch {
        // No-op
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }

    return docIds.size;
  },

  /**
   * PROMPT 30: Detecta y elimina matrículas huérfanas cuya ficha ya no existe en Firestore
   * No elimina usuarios ni datos de otras fichas.
   */
  async cleanOrphanEnrollments(instructorUid?: string): Promise<number> {
    let deletedCount = 0;
    try {
      const allFichasRes = await fichaService.getFichas(instructorUid);
      const existingFichaIds = new Set<string>();
      (allFichasRes.data || []).forEach((f) => {
        existingFichaIds.add(f.id);
        if (f.number) existingFichaIds.add(f.number);
      });

      const snap = await getDocs(collection(db, COLLECTION));
      for (const d of snap.docs) {
        const data = d.data() as Enrollment;
        if (data.fichaId && !existingFichaIds.has(data.fichaId)) {
          // Confirmar en Firestore si el documento de la ficha existe o está activo
          const fSnap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.FICHAS, data.fichaId));
          const fData = fSnap.exists() ? fSnap.data() : null;
          const isFichaGone = !fSnap.exists() || fData?.status === 'archived' || fData?.status === 'deleted';

          if (isFichaGone) {
            console.log('[enrollmentService] Limpiando matrícula huérfana:', d.id, 'Ficha inexistente:', data.fichaId);
            try {
              await deleteDoc(doc(db, COLLECTION, d.id));
              deletedCount++;
              inMemoryEnrollments = inMemoryEnrollments.filter((e) => e.id !== d.id);
            } catch (delErr) {
              console.warn('[enrollmentService] Error eliminando enrollment huérfano:', d.id, delErr);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[enrollmentService] Error en cleanOrphanEnrollments:', err);
    }
    return deletedCount;
  },
};
