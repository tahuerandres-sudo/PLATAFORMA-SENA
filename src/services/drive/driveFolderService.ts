/**
 * @license
 * SENA Learning Hub - Servicio de Gestión de Estructura de Carpetas en Google Drive
 * PROMPT 4: Requisito 9, 22
 *
 * Jerarquía Institucional:
 * SENA Learning Hub
 *  └── [Programa de Formación]
 *       └── Ficha [Número]
 *            └── [Nombre Actividad]
 *                 └── [Nombre Aprendiz]
 *                      └── Evidencias
 */

import { driveAuthService } from './driveAuthService';

const ROOT_FOLDER_NAME = 'SENA Learning Hub';

// Caché en memoria de IDs de carpetas para evitar peticiones repetidas a la API de Drive
const folderIdCache = new Map<string, string>();

export interface FolderPathInfo {
  folderId: string;
  structuredPath: string;
}

export const driveFolderService = {
  /**
   * Busca una carpeta por nombre dentro de una carpeta padre específica
   */
  async findFolder(name: string, parentId?: string): Promise<string | null> {
    const token = driveAuthService.getAccessToken();
    if (!token) throw new Error('Google Drive no está conectado. Por favor autoriza el acceso primero.');

    // Sanitizar nombre para consulta query de Google Drive API
    const escapedName = name.replace(/'/g, "\\'");
    let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and trashed = false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }

    try {
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        q
      )}&fields=files(id, name)&spaces=drive`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[driveFolderService] Error consultando carpeta:', errJson);
        return null;
      }

      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
      return null;
    } catch (err) {
      console.warn('[driveFolderService] Excepción en findFolder:', err);
      return null;
    }
  },

  /**
   * Crea una nueva carpeta en Google Drive bajo un padre opcional
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    const token = driveAuthService.getAccessToken();
    if (!token) throw new Error('Google Drive no está conectado.');

    const body: Record<string, any> = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId) {
      body.parents = [parentId];
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `Error al crear carpeta "${name}" en Google Drive: ${err?.error?.message || res.statusText}`
      );
    }

    const data = await res.json();
    return data.id;
  },

  /**
   * Obtiene o crea una carpeta de forma idempotente (reutiliza si existe)
   */
  async getOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const cacheKey = `${parentId || 'root'}::${name}`;
    if (folderIdCache.has(cacheKey)) {
      return folderIdCache.get(cacheKey)!;
    }

    const existingId = await this.findFolder(name, parentId);
    if (existingId) {
      folderIdCache.set(cacheKey, existingId);
      return existingId;
    }

    const newId = await this.createFolder(name, parentId);
    folderIdCache.set(cacheKey, newId);
    return newId;
  },

  /**
   * Construye o resuelve la jerarquía completa para depositar una evidencia:
   * SENA Learning Hub / [Programa] / Ficha [Num] / [Actividad] / [Aprendiz] / Evidencias
   */
  async getOrCreateEvidenceFolderHierarchy(params: {
    programName: string;
    fichaNumber: string;
    activityTitle: string;
    learnerName: string;
  }): Promise<FolderPathInfo> {
    const { programName, fichaNumber, activityTitle, learnerName } = params;

    // 1. Carpeta Raíz: "SENA Learning Hub"
    const rootId = await this.getOrCreateFolder(ROOT_FOLDER_NAME);

    // 2. Carpeta de Programa (ej: "Gestión Contable y de Información Financiera")
    const cleanProgram = programName.trim() || 'Programa General';
    const programFolderId = await this.getOrCreateFolder(cleanProgram, rootId);

    // 3. Carpeta de Ficha (ej: "Ficha 3409626")
    const fichaFolderName = `Ficha ${fichaNumber.trim()}`;
    const fichaFolderId = await this.getOrCreateFolder(fichaFolderName, programFolderId);

    // 4. Carpeta de Actividad (ej: "Family Tree Presentation")
    const cleanActivity = activityTitle.trim() || 'Actividad Formativa';
    const activityFolderId = await this.getOrCreateFolder(cleanActivity, fichaFolderId);

    // 5. Carpeta de Aprendiz (ej: "Andrés Pérez")
    const cleanLearner = learnerName.trim() || 'Aprendiz SENA';
    const learnerFolderId = await this.getOrCreateFolder(cleanLearner, activityFolderId);

    // 6. Subcarpeta final: "Evidencias"
    const evidencesFolderId = await this.getOrCreateFolder('Evidencias', learnerFolderId);

    const structuredPath = `${ROOT_FOLDER_NAME} / ${cleanProgram} / ${fichaFolderName} / ${cleanActivity} / ${cleanLearner} / Evidencias`;

    return {
      folderId: evidencesFolderId,
      structuredPath,
    };
  },

  /**
   * Jerarquía para Recursos y Materiales Pedagógicos (Prompt 20 - Requisito 6):
   * SENA Learning Hub / Recursos / [Programa] / Ficha [Num] / [Curso]
   */
  async getOrCreateResourceFolderHierarchy(params: {
    programName?: string;
    fichaNumber?: string;
    courseName?: string;
  }): Promise<FolderPathInfo> {
    const { programName, fichaNumber, courseName } = params;

    // 1. Carpeta Raíz: "SENA Learning Hub"
    const rootId = await this.getOrCreateFolder(ROOT_FOLDER_NAME);

    // 2. Carpeta General "Recursos"
    const recursosFolderId = await this.getOrCreateFolder('Recursos', rootId);

    let currentFolderId = recursosFolderId;
    let structuredPath = `${ROOT_FOLDER_NAME} / Recursos`;

    // 3. Carpeta de Programa (si aplica)
    if (programName && programName.trim()) {
      const cleanProgram = programName.trim();
      currentFolderId = await this.getOrCreateFolder(cleanProgram, currentFolderId);
      structuredPath += ` / ${cleanProgram}`;
    }

    // 4. Carpeta de Ficha (si aplica)
    if (fichaNumber && fichaNumber.trim()) {
      const fichaFolderName = `Ficha ${fichaNumber.trim()}`;
      currentFolderId = await this.getOrCreateFolder(fichaFolderName, currentFolderId);
      structuredPath += ` / ${fichaFolderName}`;
    }

    // 5. Carpeta de Curso (si aplica)
    if (courseName && courseName.trim()) {
      const cleanCourse = courseName.trim();
      currentFolderId = await this.getOrCreateFolder(cleanCourse, currentFolderId);
      structuredPath += ` / ${cleanCourse}`;
    }

    return {
      folderId: currentFolderId,
      structuredPath,
    };
  },

  /**
   * Limpia la memoria caché de carpetas
   */
  clearCache(): void {
    folderIdCache.clear();
  },
};
