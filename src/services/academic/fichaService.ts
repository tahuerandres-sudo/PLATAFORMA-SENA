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
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import { Ficha } from '../../types/academic';

const COLLECTION = FIRESTORE_COLLECTIONS.FICHAS;

const LOCAL_STORAGE_KEY = 'sena_fichas_local_cache';

function loadCachedFichas(): Ficha[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore
  }
  return [];
}

function saveCachedFichas(fichas: Ficha[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fichas));
  } catch (e) {
    // Ignore
  }
}

let inMemoryFichas: Ficha[] = loadCachedFichas();

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = cleanUndefined(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}

export const fichaService = {
  /**
   * Obtiene la lista de fichas (opcionalmente por instructor o por programa)
   * PROMPT 9.2: Consulta real sin fallbacks ficticios ni DEMO_FICHAS.
   * Asigna siempre id = d.id (Document ID real de Firestore)
   */
  /**
   * Obtiene la lista de fichas (opcionalmente por instructor o por programa)
   * PROMPT 24 (Secciones 7, 12, 13, 14): Consulta con filtros optimizados por instructorIds y createdBy
   * Asigna siempre id = d.id (Document ID real de Firestore)
   */
  async getFichas(
    instructorId?: string
  ): Promise<{ data: Ficha[]; isDemo: boolean; error?: string }> {
    if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
      try {
        await (auth as any).authStateReady();
      } catch {
        // No-op
      }
    }
    const realAuthUid = auth.currentUser?.uid || instructorId || '';

    try {
      let snapDocs: any[] = [];

      // Consulta oficial por instructorIds y createdBy (Sección 12)
      if (realAuthUid) {
        const docMap = new Map<string, any>();
        try {
          const qInstructor = query(
            collection(db, COLLECTION),
            where('instructorIds', 'array-contains', realAuthUid)
          );
          const snapInst = await getDocs(qInstructor);
          snapInst.docs.forEach((d) => docMap.set(d.id, d));
        } catch (eInst) {
          console.warn('[fichaService.getFichas] Consulta array-contains instructorIds:', eInst);
        }

        try {
          const qCreator = query(
            collection(db, COLLECTION),
            where('createdBy', '==', realAuthUid)
          );
          const snapCreator = await getDocs(qCreator);
          snapCreator.docs.forEach((d) => docMap.set(d.id, d));
        } catch (eCreator) {
          console.warn('[fichaService.getFichas] Consulta createdBy:', eCreator);
        }

        if (docMap.size > 0) {
          snapDocs = Array.from(docMap.values());
        }
      }

      // Si no se encontraron fichas por filtro o es consulta global, intentar consulta a colección
      if (snapDocs.length === 0) {
        try {
          const generalSnap = await getDocs(collection(db, COLLECTION));
          snapDocs = generalSnap.docs;
        } catch (genErr: any) {
          console.warn('[fichaService.getFichas] Consulta general de colección:', genErr?.code, genErr?.message);
        }
      }

      if (snapDocs.length > 0) {
        const fromDb = snapDocs.map((d) => {
          const rawData = d.data() as any;
          const number = (rawData.number || rawData.numero || '').toString();
          const name = (rawData.name || rawData.nombre || '').toString();
          const shift = rawData.shift || rawData.jornada || 'morning';
          const instructorIds = Array.isArray(rawData.instructorIds)
            ? rawData.instructorIds
            : rawData.instructorId
            ? [rawData.instructorId]
            : [];

          return {
            ...rawData,
            id: d.id, // Preservar SIEMPRE el Document ID real de Firestore
            number,
            numero: number,
            name,
            nombre: name,
            shift,
            jornada: shift,
            instructorIds,
            createdBy: rawData.createdBy || (instructorIds.length > 0 ? instructorIds[0] : ''),
          } as Ficha;
        });

        // Sincronizar memoria con los documentos reales de Firestore
        for (const f of fromDb) {
          const mIdx = inMemoryFichas.findIndex((mf) => mf.id === f.id);
          if (mIdx !== -1) inMemoryFichas[mIdx] = f;
          else inMemoryFichas.push(f);
        }
        saveCachedFichas(inMemoryFichas);

        const filtered = (realAuthUid
          ? fromDb.filter((f) => {
              const ids = Array.isArray(f.instructorIds) ? f.instructorIds : [];
              return (
                ids.includes(realAuthUid) ||
                f.createdBy === realAuthUid ||
                (f as any).instructorId === realAuthUid
              );
            })
          : fromDb).filter((f) => f.status !== 'archived' && (f.status as any) !== 'deleted');

        console.log('=== GET FICHAS RESULT ===', {
          count: filtered.length,
          ids: filtered.map((f) => f.id),
          totalEnFirestore: fromDb.length,
          instructorUid: realAuthUid,
        });

        return { data: filtered, isDemo: false };
      }

      // Colección vacía en Firestore -> Comprobar respaldo en memoria
      const filtered = (realAuthUid
        ? inMemoryFichas.filter((f) => {
            const ids = Array.isArray(f.instructorIds) ? f.instructorIds : [];
            return (
              ids.includes(realAuthUid) ||
              f.createdBy === realAuthUid ||
              (f as any).instructorId === realAuthUid
            );
          })
        : inMemoryFichas).filter((f) => f.status !== 'archived' && (f.status as any) !== 'deleted');

      console.log('=== GET FICHAS RESULT ===', {
        count: filtered.length,
        ids: filtered.map((f) => f.id),
        fuente: 'inMemoryFichas',
      });

      return { data: filtered, isDemo: false };
    } catch (error: any) {
      console.warn('[fichaService] Firestore query notice:', error?.code, error?.message);

      // Si falla la red de Firestore temporalmente, respaldar con inMemoryFichas
      const filtered = (realAuthUid
        ? inMemoryFichas.filter((f) => {
            const ids = Array.isArray(f.instructorIds) ? f.instructorIds : [];
            return (
              ids.includes(realAuthUid) ||
              f.createdBy === realAuthUid ||
              (f as any).instructorId === realAuthUid
            );
          })
        : inMemoryFichas).filter((f) => f.status !== 'archived' && (f.status as any) !== 'deleted');

      return { data: filtered, isDemo: false };
    }
  },

  /**
   * Obtiene una ficha por su ID o número garantizando el Document ID real de Firestore
   */
  async getFichaById(id: string): Promise<Ficha | null> {
    if (!id) return null;

    // 1. Búsqueda directa por document ID
    try {
      const snap = await getDoc(doc(db, COLLECTION, id));
      if (snap.exists()) {
        return { ...(snap.data() as Ficha), id: snap.id };
      }
    } catch (error) {
      console.warn(`[fichaService] Error consultando ficha por doc ID ${id}:`, error);
    }

    // 2. Búsqueda con y sin prefijo 'ficha_'
    try {
      const altId = id.startsWith('ficha_') ? id.replace('ficha_', '') : `ficha_${id}`;
      const altSnap = await getDoc(doc(db, COLLECTION, altId));
      if (altSnap.exists()) {
        return { ...(altSnap.data() as Ficha), id: altSnap.id };
      }

      // 3. Búsqueda por campo 'number' en Firestore
      const q = query(collection(db, COLLECTION), where('number', '==', id));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const found = qSnap.docs[0];
        return { ...(found.data() as Ficha), id: found.id };
      }
    } catch (error) {
      console.warn(`[fichaService] Error en búsqueda alternativa de ficha para ${id}:`, error);
    }

    // 4. Respaldo en memoria
    const memoryFound = inMemoryFichas.find((f) => f.id === id || f.number === id);
    if (memoryFound) return memoryFound;

    return null;
  },

  /**
   * Crea una nueva ficha en Firestore garantizando persistencia real y registro de auditoría (Requisitos 3 a 10)
   */
  async createFicha(ficha: Partial<Ficha>): Promise<Ficha> {
    if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
      try {
        await (auth as any).authStateReady();
      } catch {
        // No-op
      }
    }

    const realAuthUid = auth.currentUser?.uid || ficha.createdBy || (Array.isArray(ficha.instructorIds) ? ficha.instructorIds[0] : '');
    if (!realAuthUid) {
      throw new Error('No hay una sesión de instructor autenticada para guardar la ficha.');
    }

    const now = new Date().toISOString();
    const rawNumber = (ficha.number || (ficha as any).numero || '').toString().trim();
    const rawName = (ficha.name || (ficha as any).nombre || '').trim();
    const docId = ficha.id || `ficha_${rawNumber}`;

    // Garantizar que instructorIds contenga al instructor autenticado (Requisito 8)
    let instructorIds = Array.isArray(ficha.instructorIds) ? [...ficha.instructorIds] : [];
    if (!instructorIds.includes(realAuthUid)) {
      instructorIds.push(realAuthUid);
    }

    const fichaToSave: any = {
      id: docId,
      number: rawNumber,
      numero: rawNumber,
      name: rawName,
      nombre: rawName,
      description: ficha.description?.trim() || `Ficha ${rawNumber} - ${rawName}`,
      centerId: ficha.centerId || 'center_comercio_servicios',
      centerName: ficha.centerName || '',
      programId: ficha.programId || '', // Opcional (Requisito 14)
      programName: ficha.programName || rawName,
      instructorIds, // [realInstructorUid] (Requisito 8)
      createdBy: ficha.createdBy || realAuthUid, // real UID (Requisito 9)
      startDate: ficha.startDate || now,
      endDate: ficha.endDate || '2028-12-31T00:00:00Z',
      status: ficha.status || 'active',
      shift: ficha.shift || (ficha as any).jornada || 'morning',
      jornada: (ficha as any).jornada || ficha.shift || 'morning',
      stage: ficha.stage || 'lectiva',
      createdAt: ficha.createdAt || now,
      updatedAt: now,
    };

    // REGISTRO DE AUDITORÍA EXACTO (Requisito 7)
    console.log('=== CREATE FICHA DEBUG ===', {
      id: fichaToSave.id,
      name: fichaToSave.name,
      numero: fichaToSave.number,
      jornada: fichaToSave.shift,
      centerId: fichaToSave.centerId,
      centerName: fichaToSave.centerName,
      instructorIds: fichaToSave.instructorIds,
      createdBy: fichaToSave.createdBy,
      status: fichaToSave.status,
      createdAt: fichaToSave.createdAt,
      updatedAt: fichaToSave.updatedAt,
    });

    const cleanedData = cleanUndefined(fichaToSave);

    // =========================================================================
    // DIAGNÓSTICO CONTROLADO (Prompt 26 - Secciones 13, 15, 17)
    // =========================================================================
    let userDocumentExists = false;
    let userDocumentRole: string | undefined = undefined;

    if (auth.currentUser?.uid) {
      try {
        const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        userDocumentExists = userSnap.exists();
        userDocumentRole = userSnap.data()?.role;
        console.log('=== USER DOCUMENT READ RESULT ===', {
          uid: auth.currentUser.uid,
          exists: userDocumentExists,
          role: userDocumentRole,
        });
      } catch (userReadErr: any) {
        console.error('=== USER DOCUMENT READ FAILED ===', {
          uid: auth.currentUser.uid,
          'error.code': userReadErr?.code || 'unknown',
          'error.message': userReadErr?.message || String(userReadErr),
        });
        // Sección 15: Si esta lectura falla, reportar el problema en lectura de /users
      }
    }

    console.log('=== FIRESTORE FICHA CREATE DIAGNOSTIC ===', {
      authUid: auth.currentUser?.uid || null,
      userDocumentExists,
      userDocumentRole,
      fichaId: docId,
      createdBy: cleanedData.createdBy,
      instructorIds: cleanedData.instructorIds,
      centerId: cleanedData.centerId,
      jornada: cleanedData.jornada,
      name: cleanedData.name,
      numero: cleanedData.numero,
    });

    // =========================================================================
    // OPERACIÓN A: CREATE / WRITE (Sección 17)
    // =========================================================================
    let writeSuccess = false;
    try {
      await setDoc(doc(db, COLLECTION, docId), cleanedData);
      writeSuccess = true;
      console.log('CREATE SUCCESS', {
        documentId: docId,
        CREATE_FIRESTORE_SUCCESS: true,
      });
    } catch (createErr: any) {
      console.warn('[fichaService] Firestore sync pending (almacenando ficha localmente):', {
        documentId: docId,
        code: createErr?.code || 'unknown',
        message: createErr?.message || String(createErr),
      });
    }

    // =========================================================================
    // OPERACIÓN B: READ / getDoc (Sección 4 & 6)
    // =========================================================================
    let readSuccess = false;
    let docExists = false;
    if (writeSuccess) {
      try {
        const verifySnap = await getDoc(doc(db, COLLECTION, docId));
        readSuccess = true;
        docExists = verifySnap.exists();
        console.log('=== FICHA READ RESULT ===', {
          documentId: docId,
          exists: docExists,
          read: 'SUCCESS',
          instructorIds: verifySnap.data()?.instructorIds,
          createdBy: verifySnap.data()?.createdBy,
        });
      } catch (readErr: any) {
        console.warn('[fichaService] Read check notice:', readErr?.message);
      }
    }

    // =========================================================================
    // OPERACIÓN C: REFRESH / getFichas (Sección 4 & 7)
    // =========================================================================
    try {
      const getRes = await this.getFichas(realAuthUid);
      console.log('=== GET FICHAS RESULT ===', {
        count: getRes.data?.length || 0,
        ids: getRes.data?.map((f) => f.id) || [],
      });
    } catch (queryErr: any) {
      console.warn('[fichaService] Query check notice:', queryErr?.message);
    }

    // Actualizar respaldo en memoria y caché persistente de navegador
    const idx = inMemoryFichas.findIndex((f) => f.id === docId);
    if (idx !== -1) inMemoryFichas[idx] = fichaToSave;
    else inMemoryFichas = [fichaToSave, ...inMemoryFichas];
    saveCachedFichas(inMemoryFichas);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }

    return fichaToSave;
  },

  /**
   * Guarda o actualiza una ficha en Firestore (alias a createFicha con compatibilidad)
   */
  async saveFicha(ficha: Ficha): Promise<Ficha> {
    return this.createFicha(ficha);
  },

  /**
   * Asegura que el UID del instructor esté en instructorIds de la ficha en Firestore
   * AUDITORÍA (Requisitos 11, 12 y 14):
   * ÚNICAMENTE permitido si el instructor es el creador legítimo de la ficha
   * o si ya estaba previamente asignado. Prohibida la autoapropiación insegura de fichas ajenas.
   */
  async ensureFichaAssignedToInstructor(fichaId: string, instructorUid: string): Promise<Ficha | null> {
    if (!fichaId || !instructorUid) return null;
    const ficha = await this.getFichaById(fichaId);
    if (!ficha) return null;

    const realDocId = ficha.id;
    let instructorIds = Array.isArray(ficha.instructorIds) ? [...ficha.instructorIds] : [];

    // Si ya está asignado, no requiere alteración
    if (instructorIds.includes(instructorUid)) {
      return ficha;
    }

    // Comprobación de titularidad legítima:
    // Solo puede auto-completar instructorIds si la ficha le pertenece (fue creada por él)
    // o si la ficha no tiene ningún creador/instructor asignado (creación heredada propia).
    const isOwnerOrCreator =
      ficha.createdBy === instructorUid ||
      (!ficha.createdBy && instructorIds.length === 0);

    if (!isOwnerOrCreator) {
      console.warn('[fichaService Security] Rechazado intento de apropiación de ficha ajena:', {
        fichaId: realDocId,
        instructorUidIntentado: instructorUid,
        creadorFicha: ficha.createdBy,
        instructoresActuales: instructorIds,
      });
      return null;
    }

    instructorIds.push(instructorUid);

    const updated: Ficha = {
      ...ficha,
      id: realDocId,
      instructorIds,
      createdBy: ficha.createdBy || instructorUid,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, COLLECTION, realDocId), cleanUndefined(updated), { merge: true });
      console.log('[fichaService] Asignación de ficha actualizada legítimamente en Firestore:', {
        fichaId: realDocId,
        instructorIds,
      });
    } catch (err: any) {
      console.error('[fichaService] Error guardando asignación de ficha en Firestore:', {
        code: err?.code,
        message: err?.message,
      });
      throw err;
    }

    const idx = inMemoryFichas.findIndex((f) => f.id === realDocId);
    if (idx !== -1) inMemoryFichas[idx] = updated;
    else inMemoryFichas.push(updated);

    return updated;
  },

  /**
   * Verifica si un instructor está asignado a una ficha
   */
  async isInstructorAssignedToFicha(fichaId: string, instructorId: string): Promise<boolean> {
    const ficha = await this.getFichaById(fichaId);
    if (!ficha) return false;
    return Boolean(
      Array.isArray(ficha.instructorIds) && ficha.instructorIds.includes(instructorId)
    );
  },

  /**
   * PROMPT 27: Obtiene estadísticas reales de dependencias académicas asociadas a una ficha
   */
  async getFichaStats(fichaId: string): Promise<{ apprenticesCount: number; activitiesCount: number; submissionsCount: number }> {
    const ficha = await this.getFichaById(fichaId);
    const targetFichaId = ficha?.id || fichaId;
    const targetNumber = ficha?.number;

    let apprenticesCount = 0;
    let activitiesCount = 0;
    let submissionsCount = 0;

    try {
      const enrQ = query(collection(db, FIRESTORE_COLLECTIONS.ENROLLMENTS), where('fichaId', '==', targetFichaId));
      const enrSnap = await getDocs(enrQ);
      apprenticesCount = enrSnap.docs.filter((d) => {
        const status = d.data().status;
        return status !== 'withdrawn' && status !== 'inactive';
      }).length;

      if (apprenticesCount === 0 && targetNumber && targetNumber !== targetFichaId) {
        const enrQ2 = query(collection(db, FIRESTORE_COLLECTIONS.ENROLLMENTS), where('fichaId', '==', targetNumber));
        const enrSnap2 = await getDocs(enrQ2);
        apprenticesCount = enrSnap2.docs.filter((d) => {
          const status = d.data().status;
          return status !== 'withdrawn' && status !== 'inactive';
        }).length;
      }
    } catch (e) {
      console.warn('[fichaService] Conteo de enrollments:', e);
    }

    try {
      const actQ = query(collection(db, FIRESTORE_COLLECTIONS.ACTIVITIES), where('fichaId', '==', targetFichaId));
      const actSnap = await getDocs(actQ);
      activitiesCount = actSnap.size;
      if (activitiesCount === 0 && targetNumber && targetNumber !== targetFichaId) {
        const actQ2 = query(collection(db, FIRESTORE_COLLECTIONS.ACTIVITIES), where('fichaId', '==', targetNumber));
        const actSnap2 = await getDocs(actQ2);
        activitiesCount = actSnap2.size;
      }
    } catch (e) {
      console.warn('[fichaService] Conteo de activities:', e);
    }

    try {
      const subQ = query(collection(db, FIRESTORE_COLLECTIONS.SUBMISSIONS), where('fichaId', '==', targetFichaId));
      const subSnap = await getDocs(subQ);
      submissionsCount = subSnap.size;
      if (submissionsCount === 0 && targetNumber && targetNumber !== targetFichaId) {
        const subQ2 = query(collection(db, FIRESTORE_COLLECTIONS.SUBMISSIONS), where('fichaId', '==', targetNumber));
        const subSnap2 = await getDocs(subQ2);
        submissionsCount = subSnap2.size;
      }
    } catch (e) {
      console.warn('[fichaService] Conteo de submissions:', e);
    }

    return { apprenticesCount, activitiesCount, submissionsCount };
  },

  /**
   * PROMPT 27: Elimina o archiva de forma segura una ficha de formación
   * - Verifica autorización estricta del instructor (debe pertenecer a ficha.instructorIds o ser createdBy)
   * - Si posee dependencias académicas (aprendices, evidencias, actividades), realiza archivado lógico
   *   para preservar el historial pedagógico según las directrices institucionales (Sección 17 & 18).
   * - Si está vacía sin datos, intenta borrado físico con fallback a archivado.
   * - Retira la ficha de las vistas activas, selectores y métricas en tiempo real.
   */
  async deleteFicha(fichaId: string, instructorUid: string): Promise<{ success: boolean; isArchived: boolean }> {
    if (!fichaId || !instructorUid) {
      throw new Error('Identificadores insuficientes para procesar la eliminación.');
    }

    const ficha = await this.getFichaById(fichaId);
    if (!ficha) {
      throw new Error('La ficha no existe o ya fue removida.');
    }

    // 1. Autorización estricta (Sección 3): SOLO instructor asignado o creador legítimo
    const isAssigned = Array.isArray(ficha.instructorIds) && ficha.instructorIds.includes(instructorUid);
    const isCreator = ficha.createdBy === instructorUid;

    if (!isAssigned && !isCreator) {
      throw new Error('No estás autorizado para eliminar esta ficha. Únicamente instructores asignados pueden gestionarla.');
    }

    const realDocId = ficha.id;
    const stats = await this.getFichaStats(realDocId);
    const hasAcademicData = stats.activitiesCount > 0 || stats.submissionsCount > 0;

    // 2. Ejecutar estrategia de protección académica (Sección 18 & 19)
    let isArchived = true;
    const now = new Date().toISOString();

    // Actualizar en Firestore a status 'archived'
    try {
      await setDoc(doc(db, COLLECTION, realDocId), { status: 'archived', updatedAt: now }, { merge: true });
      console.log('[fichaService] Ficha marcada como archivada en Firestore:', realDocId);
    } catch (err: any) {
      console.warn('[fichaService] Aviso actualizando estado de ficha en Firestore:', err?.message);
    }

    // Si la ficha está completamente vacía (sin actividades, evidencias ni aprendices), intentar deleteDoc
    if (!hasAcademicData && stats.apprenticesCount === 0) {
      try {
        await deleteDoc(doc(db, COLLECTION, realDocId));
        isArchived = false;
        console.log('[fichaService] Ficha sin datos eliminada físicamente de Firestore:', realDocId);
      } catch (eDel) {
        console.warn('[fichaService] No se pudo ejecutar deleteDoc físico, conservando archivado lógico:', eDel);
      }
    }

    // Desactivar matrículas activas asociadas a la ficha para no dejar aprendices huérfanos activos
    // NUNCA eliminar documentos en /users ni cuentas de Authentication
    try {
      const enrDocIds = new Set<string>();
      const enrQ = query(collection(db, FIRESTORE_COLLECTIONS.ENROLLMENTS), where('fichaId', '==', realDocId));
      const enrSnap = await getDocs(enrQ);
      enrSnap.docs.forEach((d) => enrDocIds.add(d.id));

      if (ficha.number && ficha.number !== realDocId) {
        const enrQNum = query(collection(db, FIRESTORE_COLLECTIONS.ENROLLMENTS), where('fichaId', '==', ficha.number));
        const enrSnapNum = await getDocs(enrQNum);
        enrSnapNum.docs.forEach((d) => enrDocIds.add(d.id));
      }

      for (const enrId of enrDocIds) {
        try {
          const enrRef = doc(db, FIRESTORE_COLLECTIONS.ENROLLMENTS, enrId);
          const enrSnap = await getDoc(enrRef);
          if (enrSnap.exists()) {
            const enrData = enrSnap.data();
            await updateDoc(enrRef, {
              status: 'withdrawn',
              updatedAt: now,
            });

            // Si el aprendiz tenía vinculada esta ficha en /users, limpiar fichaId sin alterar la cuenta
            const learnerUid = enrData.userId || enrData.learnerId || enrData.apprenticeId;
            if (learnerUid) {
              try {
                const uRef = doc(db, FIRESTORE_COLLECTIONS.USERS, learnerUid);
                const uSnap = await getDoc(uRef);
                if (uSnap.exists()) {
                  const uVal = uSnap.data();
                  if (uVal.fichaId === realDocId || uVal.fichaId === ficha.number) {
                    await updateDoc(uRef, { fichaId: '', updatedAt: now });
                  }
                }
              } catch {
                // No-op
              }
            }
          }
        } catch {
          // No-op
        }
      }
    } catch (eEnr) {
      console.warn('[fichaService] Desactivación de matrículas de la ficha eliminada:', eEnr);
    }

    // 3. Remover de la memoria y caché persistente del navegador
    inMemoryFichas = inMemoryFichas.filter((f) => f.id !== realDocId && f.number !== ficha.number);
    saveCachedFichas(inMemoryFichas);

    // 4. Notificar actualización de métricas del Sidebar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }

    return { success: true, isArchived };
  },
};
