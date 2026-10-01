/**
 * @license
 * SENA Learning Hub - Servicio de Matrículas y Aprendices
 * PROMPT 8.1: Consulta Real de Aprendices vía /enrollments + /users
 * Colecciones Firestore: /enrollments, /users, /fichas
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
import { Enrollment, EnrollmentStatus, ApprenticeWithEnrollment } from '../../types/academic';
import { fichaService } from './fichaService';

const COLLECTION = FIRESTORE_COLLECTIONS.ENROLLMENTS;
const USERS_COLLECTION = FIRESTORE_COLLECTIONS.USERS;

let inMemoryEnrollments: Enrollment[] = [];

export const enrollmentService = {
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
   * Obtiene la matrícula activa de un aprendiz específico por userId o learnerId
   */
  async getEnrollmentByLearnerId(learnerId: string): Promise<Enrollment | null> {
    const memoryFound = inMemoryEnrollments.find(
      (e) => e.userId === learnerId || e.learnerId === learnerId
    );
    if (memoryFound) return memoryFound;

    try {
      const q = query(collection(db, COLLECTION), where('userId', '==', learnerId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as Enrollment;
      }
    } catch (error) {
      console.warn('[enrollmentService] Error buscando matrícula por aprendiz:', error);
    }
    return null;
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
   * PROMPT 8.1 - Obtiene los aprendices reales de una ficha cruzando:
   * FICHA → /enrollments → userId / learnerId → /users/{uid}
   *
   * Valida estrictamente que el instructor esté asignado a la ficha (ficha.instructorIds).
   * NO utiliza datos mock como fuente de aprendices.
   * Si no hay matrículas en la base de datos, retorna un arreglo vacío [].
   */
  async getApprenticesWithEnrollment(
    fichaId: string,
    instructorUid?: string
  ): Promise<{ data: ApprenticeWithEnrollment[]; isDemo: boolean; unauthorized?: boolean }> {
    try {
      // 1. Validar autorización del instructor con la ficha
      let targetFichas: Array<{ id: string; number: string; programName?: string; instructorIds?: string[] }> = [];

      if (fichaId !== 'all') {
        const ficha = await fichaService.getFichaById(fichaId);
        if (!ficha) {
          // Intentar buscar por número
          const allFichasRes = await fichaService.getFichas();
          const found = allFichasRes.data.find((f) => f.number === fichaId || f.id === fichaId);
          if (found) {
            targetFichas = [found];
          }
        } else {
          targetFichas = [ficha];
        }

        // Si se especificó instructorUid, validar que esté en ficha.instructorIds
        if (instructorUid && targetFichas.length > 0) {
          const authorized = targetFichas[0].instructorIds?.includes(instructorUid);
          if (!authorized) {
            console.warn(`[enrollmentService] Instructor ${instructorUid} no asignado a la ficha ${fichaId}`);
            return { data: [], isDemo: false, unauthorized: true };
          }
        }
      } else {
        // Todas las fichas asignadas a este instructor
        const fichasRes = await fichaService.getFichas(instructorUid);
        targetFichas = fichasRes.data || [];
      }

      if (targetFichas.length === 0 && fichaId !== 'all') {
        return { data: [], isDemo: false };
      }

      const fichaMap = new Map<string, typeof targetFichas[0]>();
      targetFichas.forEach((f) => {
        fichaMap.set(f.id, f);
        if (f.number) fichaMap.set(f.number, f);
      });

      // 2. Consultar /enrollments en Firestore
      let enrollments: Enrollment[] = [];

      if (fichaId !== 'all') {
        const targetFicha = targetFichas[0];
        const q1 = query(collection(db, COLLECTION), where('fichaId', '==', targetFicha.id));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          enrollments = snap1.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
        }

        // Si fichaId era un número de ficha y no se encontró por ID, intentar buscar por número si aplica
        if (enrollments.length === 0 && targetFicha.number && targetFicha.number !== targetFicha.id) {
          const qNum = query(collection(db, COLLECTION), where('fichaId', '==', targetFicha.number));
          const snapNum = await getDocs(qNum);
          if (!snapNum.empty) {
            enrollments = snapNum.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
          }
        }
      } else {
        // Para todas las fichas del instructor
        const allowedFichaIds = targetFichas.map((f) => f.id);
        const snapAll = await getDocs(collection(db, COLLECTION));
        if (!snapAll.empty) {
          enrollments = snapAll.docs
            .map((d) => ({ id: d.id, ...d.data() } as Enrollment))
            .filter((e) => allowedFichaIds.includes(e.fichaId));
        }
      }

      // Si no hay matrículas reales en Firestore, retornar vacío inmediatamente (NO mock)
      if (enrollments.length === 0) {
        return { data: [], isDemo: false };
      }

      // 3. Cruzar cada matrícula con /users/{uid}
      const apprentices: ApprenticeWithEnrollment[] = [];

      for (const enr of enrollments) {
        const uid = enr.userId || enr.learnerId || enr.apprenticeId;
        if (!uid) continue;

        let userData: any = null;
        try {
          const userSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
          if (userSnap.exists()) {
            userData = userSnap.data();
          }
        } catch (eUser) {
          console.warn(`[enrollmentService] Error leyendo usuario ${uid} en Firestore:`, eUser);
        }

        const ficha = fichaMap.get(enr.fichaId) || targetFichas[0];

        const item: ApprenticeWithEnrollment = {
          uid,
          displayName: userData?.displayName || 'No registrado',
          documentNumber: userData?.documentNumber || 'No registrado',
          email: userData?.email || 'No registrado',
          photoURL:
            userData?.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              userData?.displayName || 'Aprendiz'
            )}&background=00324D&color=8CE665`,
          status: (userData?.status as any) || (enr.status as any) || 'active',
          enrollmentId: enr.id,
          enrollmentStatus: enr.status || 'active',
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
   * Registra o actualiza una matrícula (Aprendiz ↓ Ficha ↓ Programa ↓ Centro)
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

    return updated;
  },
};
