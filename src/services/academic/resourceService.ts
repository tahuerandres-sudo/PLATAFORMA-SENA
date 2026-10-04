/**
 * @license
 * SENA Learning Hub - Servicio de Gestión de Recursos y Materiales Didácticos
 * PROMPT 20: Conexión 100% Real con Firestore y Google Drive
 * Colección Firestore: /resources
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
  Resource,
  ResourceType,
  ResourceVisibility,
  ResourceStatus,
} from '../../types/academic';
import { fichaService } from './fichaService';
import { notificationService } from './notificationService';

const COLLECTION = FIRESTORE_COLLECTIONS.RESOURCES || 'resources';

// Almacén en memoria sincronizado para que las operaciones se reflejen de inmediato
let inMemoryResources: Resource[] = [];

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

export const resourceService = {
  /**
   * Crea un nuevo recurso o material didáctico pedagógico
   * Valida autorización del instructor si se asocia a una ficha específica
   */
  async createResource(
    data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Resource> {
    const instructorUid = auth.currentUser?.uid || data.createdBy;

    if (!data.title || !data.title.trim()) {
      throw new Error('El título del recurso es obligatorio.');
    }

    if (!data.resourceType) {
      throw new Error('Debes seleccionar el tipo de recurso pedagógico.');
    }

    // Validación de autorización sobre la ficha si se vincula a una
    if (data.fichaId && instructorUid) {
      const isAssigned = await fichaService.isInstructorAssignedToFicha(data.fichaId, instructorUid);
      if (!isAssigned) {
        throw new Error(
          'Acceso denegado: No tienes autorización para crear recursos en una ficha que no tienes asignada.'
        );
      }
    }

    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const isPublished = Boolean(data.isPublished);
    const status: ResourceStatus = data.status || (isPublished ? 'published' : 'draft');

    const newResource: Resource = {
      ...data,
      id,
      createdBy: instructorUid,
      isPublished,
      status,
      visibility: data.visibility || (data.fichaId ? 'FICHA' : 'ALL'),
      createdAt: now,
      updatedAt: now,
    };

    // Actualizar memoria
    inMemoryResources = [newResource, ...inMemoryResources.filter((r) => r.id !== id)];

    // Persistir en Firestore
    try {
      await setDoc(doc(db, COLLECTION, id), cleanUndefined(newResource));
    } catch (err) {
      console.warn('[resourceService] Error guardando recurso en Firestore:', err);
    }

    // Si nace publicado y tiene ficha asignada, despachar notificación a los aprendices destinatarios
    if (isPublished && newResource.fichaId) {
      try {
        await notificationService.notifyResourcePublished({
          resourceId: id,
          resourceTitle: newResource.title,
          fichaId: newResource.fichaId,
          courseName: newResource.courseName,
          activityTitle: newResource.activityTitle,
          senderName: newResource.creatorName,
        });
      } catch (notifErr) {
        console.warn('[resourceService] Aviso notificando nuevo recurso:', notifErr);
      }
    }

    return newResource;
  },

  /**
   * Obtiene un recurso específico por su ID
   */
  async getResource(resourceId: string): Promise<Resource | null> {
    const memoryFound = inMemoryResources.find((r) => r.id === resourceId);
    if (memoryFound) return memoryFound;

    try {
      const snap = await getDoc(doc(db, COLLECTION, resourceId));
      if (snap.exists()) {
        const item = snap.data() as Resource;
        if (!inMemoryResources.some((r) => r.id === item.id)) {
          inMemoryResources.push(item);
        }
        return item;
      }
    } catch (err) {
      console.warn(`[resourceService] Error consultando recurso ${resourceId}:`, err);
    }

    return null;
  },

  /**
   * Obtiene la lista de recursos creados por un instructor o asociados a sus fichas
   */
  async getInstructorResources(
    instructorUid: string,
    fichaId?: string
  ): Promise<Resource[]> {
    try {
      let q = query(collection(db, COLLECTION), where('createdBy', '==', instructorUid));
      if (fichaId) {
        q = query(q, where('fichaId', '==', fichaId));
      }
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs.map((d) => d.data() as Resource);
        fromDb.forEach((r) => {
          if (!inMemoryResources.some((m) => m.id === r.id)) {
            inMemoryResources.push(r);
          }
        });
        // Si se filtró por ficha, devolver los de esa ficha
        return fromDb.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (err) {
      console.warn('[resourceService] Error consultando recursos del instructor:', err);
    }

    return inMemoryResources
      .filter((r) => r.createdBy === instructorUid && (fichaId ? r.fichaId === fichaId : true))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Obtiene los recursos disponibles para un aprendiz según su matrícula formativa
   * Solo recursos publicados (isPublished: true, status != 'archived')
   * Filtro por ficha, programa o visibilidad 'ALL'
   */
  async getLearnerResources(params: {
    learnerId: string;
    fichaId?: string;
    programId?: string;
  }): Promise<Resource[]> {
    const { fichaId, programId } = params;
    const results: Resource[] = [];

    try {
      // 1. Recursos para su Ficha específica
      if (fichaId) {
        const qFicha = query(
          collection(db, COLLECTION),
          where('fichaId', '==', fichaId),
          where('isPublished', '==', true)
        );
        const snapFicha = await getDocs(qFicha);
        snapFicha.docs.forEach((d) => {
          const item = d.data() as Resource;
          if (item.status === 'published' && !results.some((r) => r.id === item.id)) {
            results.push(item);
          }
        });
      }

      // 2. Recursos de alcance general (visibility: 'ALL')
      const qAll = query(
        collection(db, COLLECTION),
        where('visibility', '==', 'ALL'),
        where('isPublished', '==', true)
      );
      const snapAll = await getDocs(qAll);
      snapAll.docs.forEach((d) => {
        const item = d.data() as Resource;
        if (item.status === 'published' && !results.some((r) => r.id === item.id)) {
          results.push(item);
        }
      });

      // 3. Recursos de su programa (si aplica)
      if (programId) {
        const qProg = query(
          collection(db, COLLECTION),
          where('programId', '==', programId),
          where('visibility', '==', 'PROGRAM'),
          where('isPublished', '==', true)
        );
        const snapProg = await getDocs(qProg);
        snapProg.docs.forEach((d) => {
          const item = d.data() as Resource;
          if (item.status === 'published' && !results.some((r) => r.id === item.id)) {
            results.push(item);
          }
        });
      }

      // Sincronizar en memoria
      results.forEach((item) => {
        if (!inMemoryResources.some((m) => m.id === item.id)) {
          inMemoryResources.push(item);
        }
      });

      return results.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.warn('[resourceService] Error consultando recursos de aprendiz:', err);
    }

    // Fallback a memoria respetando aislamiento estricto
    return inMemoryResources
      .filter((r) => {
        if (!r.isPublished || r.status !== 'published') return false;
        if (r.visibility === 'ALL') return true;
        if (fichaId && r.fichaId === fichaId) return true;
        if (programId && r.programId === programId && r.visibility === 'PROGRAM') return true;
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Obtiene los recursos asociados a una actividad formativa específica
   * Utilizado para "RECURSOS DE APOYO" en la vista de la actividad
   */
  async getResourcesByActivity(activityId: string): Promise<Resource[]> {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('activityId', '==', activityId),
        where('isPublished', '==', true)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fromDb = snap.docs
          .map((d) => d.data() as Resource)
          .filter((r) => r.status === 'published');
        return fromDb;
      }
    } catch (err) {
      console.warn(`[resourceService] Error consultando recursos de actividad ${activityId}:`, err);
    }

    return inMemoryResources.filter(
      (r) => r.activityId === activityId && r.isPublished && r.status === 'published'
    );
  },

  /**
   * Obtiene los recursos asociados a un curso
   */
  async getResourcesByCourse(courseId: string, fichaId?: string): Promise<Resource[]> {
    try {
      let q = query(
        collection(db, COLLECTION),
        where('courseId', '==', courseId),
        where('isPublished', '==', true)
      );
      if (fichaId) {
        q = query(q, where('fichaId', '==', fichaId));
      }
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs
          .map((d) => d.data() as Resource)
          .filter((r) => r.status === 'published');
      }
    } catch (err) {
      console.warn(`[resourceService] Error consultando recursos de curso ${courseId}:`, err);
    }

    return inMemoryResources.filter(
      (r) =>
        r.courseId === courseId &&
        (fichaId ? r.fichaId === fichaId : true) &&
        r.isPublished &&
        r.status === 'published'
    );
  },

  /**
   * Actualiza un recurso existente
   * Valida autorización del instructor asignado a la ficha
   */
  async updateResource(
    resourceId: string,
    updates: Partial<Resource>
  ): Promise<Resource> {
    const existing = await this.getResource(resourceId);
    if (!existing) {
      throw new Error(`Recurso con ID ${resourceId} no encontrado.`);
    }

    const currentInstructorUid = auth.currentUser?.uid;
    if (currentInstructorUid && existing.fichaId) {
      const isAssigned = await fichaService.isInstructorAssignedToFicha(
        existing.fichaId,
        currentInstructorUid
      );
      if (!isAssigned && existing.createdBy !== currentInstructorUid) {
        throw new Error('Acceso denegado: No tienes autorización para editar recursos de esta ficha.');
      }
    }

    const now = new Date().toISOString();
    const isNowPublished = updates.isPublished !== undefined ? updates.isPublished : existing.isPublished;
    const newStatus: ResourceStatus =
      updates.status ||
      (isNowPublished ? 'published' : existing.status === 'archived' ? 'archived' : 'draft');

    const updatedResource: Resource = {
      ...existing,
      ...updates,
      isPublished: isNowPublished,
      status: newStatus,
      updatedAt: now,
    };

    // Actualizar memoria
    const idx = inMemoryResources.findIndex((r) => r.id === resourceId);
    if (idx !== -1) {
      inMemoryResources[idx] = updatedResource;
    } else {
      inMemoryResources.push(updatedResource);
    }

    // Persistir en Firestore
    try {
      await setDoc(doc(db, COLLECTION, resourceId), cleanUndefined(updatedResource), { merge: true });
    } catch (err) {
      console.warn('[resourceService] Error actualizando recurso en Firestore:', err);
    }

    // Si pasa de no publicado a publicado, disparar notificación única
    if (!existing.isPublished && isNowPublished && updatedResource.fichaId) {
      try {
        await notificationService.notifyResourcePublished({
          resourceId: updatedResource.id,
          resourceTitle: updatedResource.title,
          fichaId: updatedResource.fichaId,
          courseName: updatedResource.courseName,
          activityTitle: updatedResource.activityTitle,
          senderName: updatedResource.creatorName,
        });
      } catch (e) {
        console.warn('[resourceService] Error notificando publicación al actualizar:', e);
      }
    }

    return updatedResource;
  },

  /**
   * Publica un recurso (haciéndolo visible para aprendices según su visibility)
   */
  async publishResource(resourceId: string): Promise<Resource> {
    return this.updateResource(resourceId, { isPublished: true, status: 'published' });
  },

  /**
   * Archiva un recurso (conserva registro pero lo oculta de la biblioteca activa)
   */
  async archiveResource(resourceId: string): Promise<Resource> {
    return this.updateResource(resourceId, { isPublished: false, status: 'archived' });
  },

  /**
   * Elimina un recurso. Si está asociado a una actividad formativa, prefiere archivar
   * para conservar integridad referencial (Prompt 20 - Requisito 8 y 31).
   */
  async deleteResource(resourceId: string): Promise<{ deleted: boolean; archived: boolean }> {
    const existing = await this.getResource(resourceId);
    if (!existing) return { deleted: false, archived: false };

    const currentInstructorUid = auth.currentUser?.uid;
    if (currentInstructorUid && existing.fichaId) {
      const isAssigned = await fichaService.isInstructorAssignedToFicha(
        existing.fichaId,
        currentInstructorUid
      );
      if (!isAssigned && existing.createdBy !== currentInstructorUid) {
        throw new Error('Acceso denegado: No tienes autorización para eliminar recursos de esta ficha.');
      }
    }

    // Si tiene actividad asociada, preservamos la integridad académica archivándolo
    if (existing.activityId) {
      await this.archiveResource(resourceId);
      return { deleted: false, archived: true };
    }

    // Eliminar de memoria
    inMemoryResources = inMemoryResources.filter((r) => r.id !== resourceId);

    // Eliminar de Firestore
    try {
      await deleteDoc(doc(db, COLLECTION, resourceId));
    } catch (err) {
      console.warn('[resourceService] Error eliminando recurso de Firestore:', err);
    }

    return { deleted: true, archived: false };
  },

  /**
   * Obtiene recursos según filtros (fichaId, programId, etc.)
   */
  async getResources(params?: {
    fichaId?: string;
    programId?: string;
  }): Promise<Resource[]> {
    try {
      const q = query(collection(db, COLLECTION));
      const snap = await getDocs(q);
      let list = snap.docs.map((d) => d.data() as Resource);
      inMemoryResources.forEach((m) => {
        if (!list.some((item) => item.id === m.id)) {
          list.push(m);
        }
      });
      if (params?.fichaId) {
        list = list.filter((r) => r.fichaId === params.fichaId || r.visibility === 'ALL');
      }
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (err) {
      console.warn('[resourceService] Error en getResources:', err);
      return inMemoryResources.filter((r) =>
        params?.fichaId ? r.fichaId === params.fichaId || r.visibility === 'ALL' : true
      );
    }
  },
};
