/**
 * @license
 * SENA Learning Hub - Servicio de Cursos y Asignaciones Ficha-Curso
 * PROMPT 8: Estructura Académica SENA - Colecciones Firestore: /courses, /fichaCourses
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
import { Course, FichaCourse } from '../../types/academic';
import { DEMO_COURSES, DEMO_FICHA_COURSES } from '../../data/academicMockData';

const COURSES_COLLECTION = FIRESTORE_COLLECTIONS.COURSES;
const FICHA_COURSES_COLLECTION = FIRESTORE_COLLECTIONS.FICHA_COURSES;

let inMemoryCourses: Course[] = [...DEMO_COURSES];
let inMemoryFichaCourses: FichaCourse[] = [...DEMO_FICHA_COURSES];

export const courseService = {
  /**
   * Obtiene todos los cursos registrados
   */
  async getCourses(): Promise<{ data: Course[]; isDemo: boolean }> {
    try {
      const snap = await getDocs(collection(db, COURSES_COLLECTION));
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => d.data() as Course);
        const merged = [
          ...inMemoryCourses.filter((c) => !fromDb.some((dc) => dc.id === c.id)),
          ...fromDb,
        ];
        return { data: merged, isDemo: false };
      }
    } catch (error) {
      console.warn('[courseService] Lectura de cursos en Firestore:', error);
    }
    return { data: inMemoryCourses, isDemo: true };
  },

  /**
   * Obtiene un curso por ID o código
   */
  async getCourseById(id: string): Promise<Course | null> {
    const memoryFound = inMemoryCourses.find((c) => c.id === id || c.code === id);
    if (memoryFound) return memoryFound;

    try {
      const snap = await getDoc(doc(db, COURSES_COLLECTION, id));
      if (snap.exists()) {
        return snap.data() as Course;
      }
    } catch (error) {
      console.warn(`[courseService] Curso ${id} no encontrado:`, error);
    }
    return null;
  },

  /**
   * Obtiene las asignaciones de cursos para una ficha
   */
  async getCoursesByFicha(fichaId: string): Promise<{ data: Course[]; isDemo: boolean }> {
    try {
      const q = query(collection(db, FICHA_COURSES_COLLECTION), where('fichaId', '==', fichaId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const assignments = snap.docs.map((d) => d.data() as FichaCourse);
        const courseIds = assignments.map((a) => a.courseId);
        const coursesResult = await this.getCourses();
        const matched = coursesResult.data.filter((c) => courseIds.includes(c.id));
        return { data: matched, isDemo: false };
      }
    } catch (error) {
      console.warn('[courseService] Error consultando cursos de ficha:', error);
    }

    const demoAssignments = inMemoryFichaCourses.filter((a) => a.fichaId === fichaId);
    const demoCourseIds = demoAssignments.map((a) => a.courseId);
    const matched = inMemoryCourses.filter((c) => demoCourseIds.includes(c.id));
    return { data: matched.length > 0 ? matched : inMemoryCourses, isDemo: true };
  },

  /**
   * Obtiene las asignaciones FichaCourse para una ficha o un curso
   */
  async getFichaCourses(filter?: { fichaId?: string; courseId?: string }): Promise<FichaCourse[]> {
    try {
      const snap = await getDocs(collection(db, FICHA_COURSES_COLLECTION));
      if (!snap.empty) {
        let results = snap.docs.map((d) => d.data() as FichaCourse);
        if (filter?.fichaId) results = results.filter((fc) => fc.fichaId === filter.fichaId);
        if (filter?.courseId) results = results.filter((fc) => fc.courseId === filter.courseId);
        return results;
      }
    } catch (error) {
      console.warn('[courseService] Error consultando fichaCourses:', error);
    }

    let demo = [...inMemoryFichaCourses];
    if (filter?.fichaId) demo = demo.filter((fc) => fc.fichaId === filter.fichaId);
    if (filter?.courseId) demo = demo.filter((fc) => fc.courseId === filter.courseId);
    return demo;
  },

  /**
   * Guarda o actualiza un curso
   */
  async saveCourse(course: Course): Promise<Course> {
    const now = new Date().toISOString();
    const updated: Course = {
      ...course,
      createdAt: course.createdAt || now,
      updatedAt: now,
    };

    const idx = inMemoryCourses.findIndex((c) => c.id === course.id);
    if (idx !== -1) {
      inMemoryCourses[idx] = updated;
    } else {
      inMemoryCourses = [updated, ...inMemoryCourses];
    }

    try {
      await setDoc(doc(db, COURSES_COLLECTION, course.id), updated, { merge: true });
    } catch (err) {
      console.warn('[courseService] Aviso guardando curso en Firestore:', err);
    }

    return updated;
  },

  /**
   * Asigna un curso a una ficha con instructores vinculados
   */
  async assignCourseToFicha(assignment: FichaCourse): Promise<FichaCourse> {
    const now = new Date().toISOString();
    const updated: FichaCourse = {
      ...assignment,
      createdAt: assignment.createdAt || now,
      updatedAt: now,
    };

    const idx = inMemoryFichaCourses.findIndex((fc) => fc.id === assignment.id);
    if (idx !== -1) {
      inMemoryFichaCourses[idx] = updated;
    } else {
      inMemoryFichaCourses = [updated, ...inMemoryFichaCourses];
    }

    try {
      await setDoc(doc(db, FICHA_COURSES_COLLECTION, assignment.id), updated, { merge: true });
    } catch (err) {
      console.warn('[courseService] Aviso asignando curso a ficha en Firestore:', err);
    }

    return updated;
  },
};
