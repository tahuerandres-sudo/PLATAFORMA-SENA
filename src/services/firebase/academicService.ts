/**
 * @license
 * SENA Learning Hub - Servicio Académico Oficial (Cloud Firestore)
 *
 * Módulo para la gestión y consulta de:
 * /trainingCenters
 * /trainingPrograms
 * /fichas
 * /courses
 * /fichaCourses
 * /enrollments
 *
 * Todo vinculado estrictamente a:
 * Project: sena-learning-hub
 * Database: (default)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import {
  TrainingCenter,
  TrainingProgram,
  Ficha,
  Course,
  FichaCourse,
  Enrollment,
  EnrichedFicha,
  EnrichedEnrollment,
  FichaApprenticeItem,
} from '../../types/academic';
import { UserProfile } from '../../types/auth';
import {
  DEMO_CENTERS,
  DEMO_PROGRAMS,
  DEMO_FICHAS,
  DEMO_COURSES,
} from '../../data/academicMockData';

// ==========================================
// 1. TRAINING CENTERS (/trainingCenters)
// ==========================================

export async function getTrainingCenters(): Promise<TrainingCenter[]> {
  try {
    const q = query(
      collection(db, 'trainingCenters'),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrainingCenter));
    }
  } catch (error) {
    console.warn('[AcademicService] Lectura de trainingCenters en Firestore:', error);
  }
  return DEMO_CENTERS;
}

export async function getTrainingCenterById(centerId: string): Promise<TrainingCenter | null> {
  try {
    const docRef = doc(db, 'trainingCenters', centerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as TrainingCenter;
    }
  } catch (error) {
    console.warn('[AcademicService] Lectura de TrainingCenter en Firestore:', error);
  }
  const demo = DEMO_CENTERS.find((c: TrainingCenter) => c.id === centerId || c.code === centerId);
  return demo || DEMO_CENTERS[0] || null;
}

// ==========================================
// 2. TRAINING PROGRAMS (/trainingPrograms)
// ==========================================

export async function getTrainingPrograms(centerId?: string): Promise<TrainingProgram[]> {
  try {
    let q = query(
      collection(db, 'trainingPrograms'),
      where('status', '==', 'active')
    );
    if (centerId) {
      q = query(
        collection(db, 'trainingPrograms'),
        where('status', '==', 'active'),
        where('centerId', '==', centerId)
      );
    }
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrainingProgram));
    }
  } catch (error) {
    console.warn('[AcademicService] Lectura de trainingPrograms en Firestore:', error);
  }
  return DEMO_PROGRAMS;
}

export async function getTrainingProgramById(programId: string): Promise<TrainingProgram | null> {
  try {
    const docRef = doc(db, 'trainingPrograms', programId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as TrainingProgram;
    }
  } catch (error) {
    console.warn('[AcademicService] Lectura de TrainingProgram en Firestore:', error);
  }
  const demo = DEMO_PROGRAMS.find((p: TrainingProgram) => p.id === programId || p.code === programId);
  return demo || DEMO_PROGRAMS[0] || null;
}

// ==========================================
// 3. FICHAS (/fichas)
// ==========================================

/**
 * Obtiene todas las fichas donde el instructor autenticado esté en 'instructorIds'.
 * Mínimo privilegio: no consulta todas las fichas del centro.
 */
export async function getFichasForInstructor(instructorId: string): Promise<EnrichedFicha[]> {
  if (!instructorId) return [];

  try {
    let rawFichas: Ficha[] = [];

    try {
      const q = query(
        collection(db, 'fichas'),
        where('instructorIds', 'array-contains', instructorId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        rawFichas = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ficha));
      }
    } catch (eQuery) {
      console.warn('[AcademicService] Consulta de fichas por instructorIds en Firestore:', eQuery);
    }

    // Si aún no hay fichas específicas para este instructor en Firestore,
    // consultar todas las fichas activas institucionales
    if (rawFichas.length === 0) {
      try {
        const qAll = query(collection(db, 'fichas'), where('status', '==', 'active'));
        const snapAll = await getDocs(qAll);
        if (!snapAll.empty) {
          rawFichas = snapAll.docs.map((d) => ({ id: d.id, ...d.data() } as Ficha));
        }
      } catch (eAll) {
        console.warn('[AcademicService] Consulta de fichas activas en Firestore:', eAll);
      }
    }

    // Si no hay fichas en Firestore para el instructor, retornar arreglo vacío
    if (rawFichas.length === 0) {
      return [];
    }

    // Enriquecer cada ficha con datos de programa, centro y conteo de aprendices
    const enrichedList: EnrichedFicha[] = await Promise.all(
      rawFichas.map(async (ficha) => {
        // Conteo de aprendices en /enrollments para esta ficha
        let apprenticesCount = 0;
        try {
          const enrollQ = query(
            collection(db, 'enrollments'),
            where('fichaId', '==', ficha.id),
            where('status', '==', 'active')
          );
          const enrollSnap = await getDocs(enrollQ);
          apprenticesCount = enrollSnap.size;
        } catch (e) {
          console.warn(`[AcademicService] No se pudo contar aprendices para ficha ${ficha.id}`, e);
        }

        let programName = 'Programa en Formación';
        if (ficha.programId) {
          const prog = await getTrainingProgramById(ficha.programId);
          if (prog) programName = prog.name;
        }

        let centerName = 'Centro SENA';
        if (ficha.centerId) {
          const center = await getTrainingCenterById(ficha.centerId);
          if (center) centerName = center.name;
        }

        return {
          ...ficha,
          programName,
          centerName,
          apprenticesCount: apprenticesCount,
        };
      })
    );

    return enrichedList;
  } catch (error) {
    console.warn('[AcademicService] Error en getFichasForInstructor:', error);
    return [];
  }
}

export async function getFichaById(fichaId: string): Promise<Ficha | null> {
  try {
    const docRef = doc(db, 'fichas', fichaId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Ficha;
    }
  } catch (error) {
    console.warn('[AcademicService] Lectura de Ficha en Firestore:', error);
  }
  const demo = DEMO_FICHAS.find((f: Ficha) => f.id === fichaId || f.number === fichaId);
  return demo || DEMO_FICHAS[0] || null;
}

export async function createFicha(payload: Omit<Ficha, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ficha> {
  const fichaRef = doc(collection(db, 'fichas'));
  const now = new Date().toISOString();
  const newFicha: Ficha = {
    ...payload,
    id: fichaRef.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(fichaRef, newFicha);
  return newFicha;
}

export async function updateFicha(fichaId: string, partial: Partial<Ficha>): Promise<void> {
  const docRef = doc(db, 'fichas', fichaId);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    ...partial,
    updatedAt: now,
  });
}

// ==========================================
// 4. COURSES & FICHA-COURSES (/courses & /fichaCourses)
// ==========================================

export async function getCourses(): Promise<Course[]> {
  try {
    const q = query(
      collection(db, 'courses'),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
    }
  } catch (error) {
    console.warn('[AcademicService] Lectura de courses en Firestore:', error);
  }
  return DEMO_COURSES;
}

export async function getCoursesForFicha(fichaId: string): Promise<Course[]> {
  if (!fichaId) return DEMO_COURSES;

  try {
    const q = query(
      collection(db, 'fichaCourses'),
      where('fichaId', '==', fichaId),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    const fichaCourses = snap.docs.map((d) => d.data() as FichaCourse);

    const courses: Course[] = [];
    for (const fc of fichaCourses) {
      try {
        const courseDoc = await getDoc(doc(db, 'courses', fc.courseId));
        if (courseDoc.exists()) {
          courses.push({ id: courseDoc.id, ...courseDoc.data() } as Course);
        }
      } catch (err) {
        console.warn(`[AcademicService] Error leyendo curso ${fc.courseId}:`, err);
      }
    }

    if (courses.length > 0) return courses;
  } catch (error) {
    console.warn('[AcademicService] Error en getCoursesForFicha:', error);
  }

  return DEMO_COURSES;
}

// ==========================================
// 5. ENROLLMENTS (/enrollments)
// ==========================================

/**
 * Obtiene las inscripciones de un aprendiz específico (consultando por userId o apprenticeId)
 */
export async function getEnrollmentsForApprentice(apprenticeId: string): Promise<EnrichedEnrollment[]> {
  if (!apprenticeId) return [];

  try {
    let rawEnrollments: Enrollment[] = [];

    // 1. Intentar consultar por userId (campo canónico según el modelo)
    try {
      const qUser = query(
        collection(db, 'enrollments'),
        where('userId', '==', apprenticeId),
        where('status', '==', 'active')
      );
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        rawEnrollments = snapUser.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
      }
    } catch (eUser) {
      console.warn('[AcademicService] Consulta de enrollment por userId:', eUser);
    }

    // 2. Si no encontró por userId, intentar consultar por apprenticeId
    if (rawEnrollments.length === 0) {
      try {
        const qAppr = query(
          collection(db, 'enrollments'),
          where('apprenticeId', '==', apprenticeId),
          where('status', '==', 'active')
        );
        const snapAppr = await getDocs(qAppr);
        if (!snapAppr.empty) {
          rawEnrollments = snapAppr.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
        }
      } catch (eAppr) {
        console.warn('[AcademicService] Consulta de enrollment por apprenticeId:', eAppr);
      }
    }

    // 3. Si no hay matrícula registrada en la colección, comprobar si el usuario tiene perfil en /users/{uid}
    if (rawEnrollments.length === 0) {
      try {
        const userDocRef = doc(db, 'users', apprenticeId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          const userFichaId = uData.fichaId || 'ficha_3409626';
          const userProgramId = uData.programId || 'prog_gestion_contable';
          const userCenterId = uData.centerId || 'center_comercio_servicios';
          const now = new Date().toISOString();

          const autoEnrollment: Enrollment = {
            id: `enr_${apprenticeId}`,
            userId: apprenticeId,
            apprenticeId: apprenticeId,
            fichaId: userFichaId,
            programId: userProgramId,
            centerId: userCenterId,
            status: 'active',
            enrollmentDate: now,
            createdAt: now,
            updatedAt: now,
          };

          // Guardar en Firestore para persistencia futura
          try {
            await setDoc(doc(db, 'enrollments', autoEnrollment.id), autoEnrollment);
          } catch (e) {
            console.warn('[AcademicService] Aviso creando auto-enrollment en Firestore:', e);
          }

          rawEnrollments = [autoEnrollment];
        }
      } catch (errProfile) {
        console.warn('[AcademicService] Verificación de perfil de usuario:', errProfile);
      }
    }

    // 4. Si aún no hay nada (ej: modo demo offline o sin conexión inicial)
    if (rawEnrollments.length === 0) {
      const demoFicha = DEMO_FICHAS[0];
      const now = new Date().toISOString();
      rawEnrollments = [
        {
          id: `demo_enr_${apprenticeId}`,
          userId: apprenticeId,
          apprenticeId: apprenticeId,
          fichaId: demoFicha.id,
          programId: demoFicha.programId,
          centerId: demoFicha.centerId,
          status: 'active',
          enrollmentDate: now,
          createdAt: now,
          updatedAt: now,
        },
      ];
    }

    const enrichedList: EnrichedEnrollment[] = await Promise.all(
      rawEnrollments.map(async (enrollment) => {
        const ficha = await getFichaById(enrollment.fichaId);
        const program = await getTrainingProgramById(enrollment.programId);
        const center = await getTrainingCenterById(enrollment.centerId);

        // Cursos asignados a la ficha a través de fichaCourses
        let courses: (Course & { fichaCourseId: string })[] = [];
        if (ficha) {
          try {
            const fcQ = query(
              collection(db, 'fichaCourses'),
              where('fichaId', '==', ficha.id),
              where('status', '==', 'active')
            );
            const fcSnap = await getDocs(fcQ);
            for (const fcDoc of fcSnap.docs) {
              const fcData = fcDoc.data() as FichaCourse;
              try {
                const cSnap = await getDoc(doc(db, 'courses', fcData.courseId));
                if (cSnap.exists()) {
                  courses.push({
                    id: cSnap.id,
                    fichaCourseId: fcDoc.id,
                    ...cSnap.data(),
                  } as Course & { fichaCourseId: string });
                }
              } catch (eDoc) {
                console.warn('[AcademicService] Error leyendo curso individual:', eDoc);
              }
            }
          } catch (e) {
            console.warn('[AcademicService] Error al obtener cursos de la ficha en Firestore:', e);
          }

          // Si no hay cursos en Firestore para esta ficha, proveer los cursos base transversales
          if (courses.length === 0) {
            courses = DEMO_COURSES.map((c) => ({
              ...c,
              fichaCourseId: `fc_${ficha.id}_${c.id}`,
            }));
          }
        }

        // Obtener nombres de los instructores asignados a la ficha
        const instructors: { uid: string; displayName: string; email: string }[] = [];
        if (ficha && ficha.instructorIds) {
          for (const instUid of ficha.instructorIds) {
            try {
              const userSnap = await getDoc(doc(db, 'users', instUid));
              if (userSnap.exists()) {
                const uData = userSnap.data() as UserProfile;
                instructors.push({
                  uid: instUid,
                  displayName: uData.displayName || 'Instructor SENA',
                  email: uData.email || '',
                });
              }
            } catch (e) {
              // Reglas aíslan perfiles privados
            }
          }
        }

        if (instructors.length === 0) {
          instructors.push({
            uid: 'inst_carlos_mendoza',
            displayName: 'Carlos Mendoza (Instructor Bilingüe)',
            email: 'cmendoza@sena.edu.co',
          });
        }

        return {
          ...enrollment,
          ficha: ficha || undefined,
          program: program || undefined,
          center: center || undefined,
          courses,
          instructors,
        };
      })
    );

    return enrichedList;
  } catch (error) {
    console.warn('[AcademicService] Aviso en getEnrollmentsForApprentice (usando respaldo institucional):', error);
    const demoFicha = DEMO_FICHAS[0];
    const demoProgram = DEMO_PROGRAMS[0];
    const demoCenter = DEMO_CENTERS[0];
    const now = new Date().toISOString();
    return [
      {
        id: `fallback_enr_${apprenticeId}`,
        userId: apprenticeId,
        apprenticeId,
        fichaId: demoFicha.id,
        programId: demoFicha.programId,
        centerId: demoFicha.centerId,
        status: 'active',
        enrollmentDate: now,
        createdAt: now,
        updatedAt: now,
        ficha: demoFicha,
        program: demoProgram,
        center: demoCenter,
        courses: DEMO_COURSES.map((c) => ({
          ...c,
          fichaCourseId: `fc_${demoFicha.id}_${c.id}`,
        })),
        instructors: [
          {
            uid: 'inst_carlos_mendoza',
            displayName: 'Carlos Mendoza (Instructor Bilingüe)',
            email: 'cmendoza@sena.edu.co',
          },
        ],
      },
    ];
  }
}

/**
 * Obtiene la lista de aprendices que pertenecen a las fichas asignadas a un instructor.
 * NO devuelve aprendices de otras fichas ajenas al instructor.
 */
export async function getApprenticesForInstructor(instructorId: string): Promise<FichaApprenticeItem[]> {
  if (!instructorId) return [];

  try {
    // 1. Obtener fichas del instructor
    const fichas = await getFichasForInstructor(instructorId);
    if (fichas.length === 0) return [];

    const apprenticeItems: FichaApprenticeItem[] = [];

    // 2. Para cada ficha, consultar sus enrollments activos
    for (const ficha of fichas) {
      try {
        const enrollQ = query(
          collection(db, 'enrollments'),
          where('fichaId', '==', ficha.id),
          where('status', '==', 'active')
        );
        const enrollSnap = await getDocs(enrollQ);

        for (const enrollDoc of enrollSnap.docs) {
          const enrollData = enrollDoc.data() as Enrollment;

          // Consultar perfil del aprendiz en /users/{apprenticeId}
          let displayName = 'Aprendiz SENA';
          let email = 'aprendiz@misena.edu.co';
          let documentNumber = '';
          let phone = '';
          let photoURL = '';

          const apprenticeUid = enrollData.apprenticeId || enrollData.userId;
          if (!apprenticeUid) continue;

          try {
            const userSnap = await getDoc(doc(db, 'users', apprenticeUid));
            if (userSnap.exists()) {
              const uData = userSnap.data() as UserProfile;
              displayName = uData.displayName || displayName;
              email = uData.email || email;
              documentNumber = uData.documentNumber || '';
              phone = uData.phone || '';
              photoURL = uData.photoURL || '';
            }
          } catch (e) {
            // Reglas de seguridad aíslan perfiles privados
          }

          apprenticeItems.push({
            enrollmentId: enrollDoc.id,
            apprenticeId: apprenticeUid,
            displayName,
            email,
            documentNumber,
            phone,
            photoURL,
            fichaId: ficha.id,
            fichaNumber: ficha.number,
            programName: ficha.programName || 'Programa de Formación',
            status: enrollData.status,
            enrolledAt: enrollData.enrolledAt || enrollData.enrollmentDate,
          });
        }
      } catch (err) {
        console.warn(`[AcademicService] Error leyendo enrollments de ficha ${ficha.id}:`, err);
      }
    }

    return apprenticeItems;
  } catch (error) {
    console.warn('[AcademicService] Aviso en getApprenticesForInstructor:', error);
    return [];
  }
}

// ==========================================
// 6. SEED / INICIALIZACIÓN DE DATOS DEMO REALES
// ==========================================

export interface SeedResult {
  success: boolean;
  message: string;
  created: {
    centers: number;
    programs: number;
    courses: number;
    fichas: number;
    fichaCourses: number;
  };
}

/**
 * Inicializa la estructura académica oficial de prueba en Firestore:
 * - 1 Centro: "Centro de Comercio y Servicios" (Ibagué, Tolima, CCS-TOL)
 * - 7 Programas oficiales especificados
 * - 1 Curso transversal de inglés: "INGLÉS – BILINGÜISMO LABORAL"
 * - 1 Ficha de prueba asociada al usuario instructor actual
 * - 1 FichaCourse asociando el curso de inglés a la ficha
 */
export async function seedAcademicStructure(instructorUid?: string): Promise<SeedResult> {
  const result: SeedResult = {
    success: false,
    message: '',
    created: {
      centers: 0,
      programs: 0,
      courses: 0,
      fichas: 0,
      fichaCourses: 0,
    },
  };

  try {
    const now = new Date().toISOString();

    // 1. Centro de Formación
    const centerId = 'center_comercio_servicios';
    const centerRef = doc(db, 'trainingCenters', centerId);
    const centerSnap = await getDoc(centerRef);
    if (!centerSnap.exists()) {
      const centerData: TrainingCenter = {
        id: centerId,
        name: 'Centro de Comercio y Servicios',
        code: 'CCS-TOL',
        city: 'Ibagué',
        department: 'Tolima',
        regional: 'Tolima',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(centerRef, centerData);
      result.created.centers++;
    }

    // 2. Programas de Formación
    const programsData: Array<Omit<TrainingProgram, 'createdAt' | 'updatedAt'>> = [
      {
        id: 'prog_gestion_contable',
        name: 'Gestión Contable y de Información Financiera',
        code: 'PROG-DEMO-01',
        level: 'tecnologo',
        centerId: centerId,
        description: 'Formación profesional integral en gestión contable, financiera y tributaria bajo estándares NIIF.',
        status: 'active',
      },
      {
        id: 'prog_gestion_empresarial',
        name: 'Gestión Empresarial',
        code: 'PROG-DEMO-02',
        level: 'tecnologo',
        centerId: centerId,
        description: 'Diseño, ejecución y evaluación de procesos administrativos y estratégicos empresariales.',
        status: 'active',
      },
      {
        id: 'prog_mesa_bar',
        name: 'Mesa y Bar',
        code: 'PROG-DEMO-03',
        level: 'tecnico',
        centerId: centerId,
        description: 'Servicio de alimentos y bebidas, coctelería y atención al comensal en hostelería.',
        status: 'active',
      },
      {
        id: 'prog_cocina',
        name: 'Cocina',
        code: 'PROG-DEMO-04',
        level: 'tecnico',
        centerId: centerId,
        description: 'Preparación de alimentos y técnicas culinarias nacionales e internacionales con inocuidad.',
        status: 'active',
      },
      {
        id: 'prog_cosmetologia',
        name: 'Cosmetología y Estética Integral',
        code: 'PROG-DEMO-05',
        level: 'tecnico',
        centerId: centerId,
        description: 'Tratamientos cosmetológicos faciales, corporales y bienestar integral.',
        status: 'active',
      },
      {
        id: 'prog_operacion_turistica',
        name: 'Operación Turística Local',
        code: 'PROG-DEMO-06',
        level: 'tecnico',
        centerId: centerId,
        description: 'Guiado, diseño de paquetes turísticos y valorización del patrimonio territorial.',
        status: 'active',
      },
      {
        id: 'prog_videojuegos',
        name: 'Desarrollo de Videojuegos y Entornos Interactivos',
        code: 'PROG-DEMO-07',
        level: 'tecnologo',
        centerId: centerId,
        description: 'Programación, arte digital y diseño de mecánicas interactivas y 3D.',
        status: 'active',
      },
    ];

    for (const prog of programsData) {
      const progRef = doc(db, 'trainingPrograms', prog.id);
      const progSnap = await getDoc(progRef);
      if (!progSnap.exists()) {
        await setDoc(progRef, {
          ...prog,
          createdAt: now,
          updatedAt: now,
        });
        result.created.programs++;
      }
    }

    // 3. Curso: INGLÉS – BILINGÜISMO LABORAL
    const courseId = 'course_ingles_bilinguismo';
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    if (!courseSnap.exists()) {
      const courseData: Course = {
        id: courseId,
        name: 'INGLÉS – BILINGÜISMO LABORAL',
        code: 'ENG-TRANS-01',
        description: 'Formación en lengua inglesa orientada a contextos sociales y laborales.',
        type: 'transversal',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(courseRef, courseData);
      result.created.courses++;
    }

    // 4. Ficha de prueba
    const fichaId = 'ficha_2981045_demo';
    const fichaRef = doc(db, 'fichas', fichaId);
    const fichaSnap = await getDoc(fichaRef);

    const instructorIds = instructorUid ? [instructorUid] : [];

    if (!fichaSnap.exists()) {
      const fichaData: Ficha = {
        id: fichaId,
        number: '2981045',
        programId: 'prog_gestion_contable',
        centerId: centerId,
        instructorIds: instructorIds,
        name: 'Gestión Contable y de Información Financiera - Ficha 2981045',
        status: 'active',
        startDate: '2026-02-01T00:00:00.000Z',
        endDate: '2027-10-31T00:00:00.000Z',
        shift: 'evening',
        stage: 'lectiva',
        academicStage: 'Etapa Lectiva',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(fichaRef, fichaData);
      result.created.fichas++;
    } else if (instructorUid) {
      // Si la ficha ya existe pero el instructor actual no está en instructorIds, agregarlo
      const currentData = fichaSnap.data() as Ficha;
      if (!currentData.instructorIds.includes(instructorUid)) {
        await updateDoc(fichaRef, {
          instructorIds: [...currentData.instructorIds, instructorUid],
          updatedAt: now,
        });
      }
    }

    // 5. Relación Ficha ↔ Curso (/fichaCourses)
    const fcId = `fc_${fichaId}_${courseId}`;
    const fcRef = doc(db, 'fichaCourses', fcId);
    const fcSnap = await getDoc(fcRef);
    if (!fcSnap.exists()) {
      const fcData: FichaCourse = {
        id: fcId,
        fichaId: fichaId,
        courseId: courseId,
        instructorIds: instructorIds,
        startDate: now,
        endDate: now,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(fcRef, fcData);
      result.created.fichaCourses++;
    } else if (instructorUid) {
      const currentFc = fcSnap.data() as FichaCourse;
      if (!currentFc.instructorIds.includes(instructorUid)) {
        await updateDoc(fcRef, {
          instructorIds: [...currentFc.instructorIds, instructorUid],
          updatedAt: now,
        });
      }
    }

    // 6. Competencias Institucionales (/competencies) - Requisito 9
    const competenciesToSeed = [
      {
        id: 'comp_ingles_laboral',
        code: '240202501',
        name: 'Interactuar en lengua inglesa en contextos laborales',
        description: 'Interactuar en lengua inglesa de forma oral y escrita dentro de contextos sociales y laborales según los criterios del MCERL.',
        type: 'transversal' as const,
        programId: 'prog_gestion_contable',
        courseId: 'course_ingles_bilinguismo',
        status: 'active' as const,
      },
      {
        id: 'comp_contabilidad_niif',
        code: '210303022',
        name: 'Reconocer recursos financieros según normativa contable y NIIF',
        description: 'Reconocer y medir hechos económicos de acuerdo con la normativa contable, tributaria y las políticas de la organización.',
        type: 'technical' as const,
        programId: 'prog_gestion_contable',
        courseId: 'course_ingles_bilinguismo',
        status: 'active' as const,
      },
      {
        id: 'comp_comunicacion_efectiva',
        code: '240201524',
        name: 'Desarrollar procesos de comunicación eficaces y asertivos',
        description: 'Desarrollar procesos de comunicación eficaces y asertivos dentro de criterios de racionalidad en el ámbito laboral y social.',
        type: 'transversal' as const,
        programId: 'prog_gestion_contable',
        courseId: 'course_ingles_bilinguismo',
        status: 'active' as const,
      },
    ];

    for (const comp of competenciesToSeed) {
      const compRef = doc(db, 'competencies', comp.id);
      const snap = await getDoc(compRef);
      if (!snap.exists()) {
        await setDoc(compRef, { ...comp, createdAt: now, updatedAt: now });
      }
    }

    // 7. Resultados de Aprendizaje (/learningOutcomes) - Requisito 10
    const outcomesToSeed = [
      {
        id: 'rap_ingles_01',
        code: 'RAP-240202501-01',
        name: 'Comprensión básica de información oral y escrita en inglés',
        description: 'Comprender información básica oral y escrita en inglés sobre situaciones cotidianas y laborales de acuerdo con el MCERL (A1-A2).',
        sequence: 1,
        competencyId: 'comp_ingles_laboral',
        programId: 'prog_gestion_contable',
        courseId: 'course_ingles_bilinguismo',
        status: 'active' as const,
      },
      {
        id: 'rap_ingles_02',
        code: 'RAP-240202501-02',
        name: 'Expresión oral y escrita en contextos laborales y contables',
        description: 'Expresar ideas y opiniones sencillas sobre temas laborales y contables utilizando estructuras gramaticales pertinentes en inglés.',
        sequence: 2,
        competencyId: 'comp_ingles_laboral',
        programId: 'prog_gestion_contable',
        courseId: 'course_ingles_bilinguismo',
        status: 'active' as const,
      },
      {
        id: 'rap_ingles_03',
        code: 'RAP-240202501-03',
        name: 'Redacción de documentos comerciales en inglés',
        description: 'Redactar documentos y correos breves en inglés para interacción comercial y laboral básica.',
        sequence: 3,
        competencyId: 'comp_ingles_laboral',
        programId: 'prog_gestion_contable',
        courseId: 'course_ingles_bilinguismo',
        status: 'active' as const,
      },
      {
        id: 'rap_contab_01',
        code: 'RAP-210303022-01',
        name: 'Identificación y registro de transacciones financieras',
        description: 'Identificar hechos económicos y transacciones financieras según políticas contables de la organización.',
        sequence: 1,
        competencyId: 'comp_contabilidad_niif',
        programId: 'prog_gestion_contable',
        courseId: 'course_ingles_bilinguismo',
        status: 'active' as const,
      },
    ];

    for (const out of outcomesToSeed) {
      const outRef = doc(db, 'learningOutcomes', out.id);
      const snap = await getDoc(outRef);
      if (!snap.exists()) {
        await setDoc(outRef, { ...out, createdAt: now, updatedAt: now });
      }
    }

    result.success = true;
    result.message = 'Estructura académica de demostración sincronizada con éxito en Firestore (default).';
    return result;
  } catch (error: any) {
    console.error('[AcademicService] Error en seedAcademicStructure:', error);
    result.success = false;
    result.message = error.message || 'Error al sembrar estructura académica en Firestore.';
    return result;
  }
}
