/**
 * @license
 * SENA Learning Hub - Servicio de Operaciones de Archivos con Google Drive API
 * PROMPT 4: Requisitos 7, 8, 11, 21, 30
 *
 * Realiza subidas reales de archivos a Google Drive usando la API REST v3:
 * POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
 */

import { driveAuthService } from './driveAuthService';
import { driveFolderService } from './driveFolderService';

export interface DriveUploadResult {
  driveFileId: string;
  driveUrl: string; // webViewLink
  webContentLink?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  folderId: string;
  structuredPath: string;
  sharedWithInstructor?: boolean;
  sharedInstructorEmail?: string;
}

export interface UploadProgressCallback {
  (percentage: number, loadedBytes: number, totalBytes: number): void;
}

export const driveService = {
  /**
   * Concede permiso de lectura ('reader') al correo del instructor sobre un archivo en Google Drive.
   * Utiliza el mismo scope https://www.googleapis.com/auth/drive.file ya que el archivo fue creado por la aplicación.
   * Principio de mínimo privilegio: role: reader, type: user, emailAddress: instructorEmail
   */
  async grantInstructorReaderPermission(
    fileId: string,
    instructorEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    const token = driveAuthService.getAccessToken();
    if (!token) {
      return { success: false, error: 'Google Drive no está conectado para autorizar permisos.' };
    }
    if (!instructorEmail || !instructorEmail.includes('@')) {
      return { success: false, error: 'Correo de instructor no válido.' };
    }

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=false`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'user',
            emailAddress: instructorEmail.trim(),
          }),
        }
      );

      if (res.ok) {
        return { success: true };
      }

      const errJson = await res.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
      console.warn('[driveService] Advertencia al conceder permiso a instructor en Drive:', errMsg);
      return { success: false, error: errMsg };
    } catch (err: any) {
      console.warn('[driveService] Error de red al conceder permiso a instructor:', err);
      return { success: false, error: err.message || 'Error de red' };
    }
  },

  /**
   * Verifica la conexión activa contra la API de Google Drive
   */
  async testConnection(): Promise<boolean> {
    const token = driveAuthService.getAccessToken();
    if (!token) return false;

    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Sube un archivo real a Google Drive dentro de la estructura de carpetas oficial
   */
  async uploadEvidenceFile(params: {
    file: File;
    programName: string;
    fichaNumber: string;
    activityTitle: string;
    learnerName: string;
    instructorEmail?: string;
    onProgress?: UploadProgressCallback;
  }): Promise<DriveUploadResult> {
    const { file, programName, fichaNumber, activityTitle, learnerName, instructorEmail, onProgress } = params;

    const token = driveAuthService.getAccessToken();
    if (!token) {
      throw new Error(
        'Google Drive no está conectado. Por favor conecta tu cuenta de Google Drive para subir evidencias físicas.'
      );
    }

    // 1. Obtener o crear jerarquía de carpetas
    if (onProgress) onProgress(5, 0, file.size);
    const { folderId, structuredPath } =
      await driveFolderService.getOrCreateEvidenceFolderHierarchy({
        programName,
        fichaNumber,
        activityTitle,
        learnerName,
      });

    if (onProgress) onProgress(15, 0, file.size);

    // 2. Preparar subida multipart a Google Drive API v3
    // Nombre del archivo con prefijo limpio
    const sanitizedFileName = `${learnerName.replace(/\s+/g, '_')}_${file.name}`;
    const metadata = {
      name: sanitizedFileName,
      parents: [folderId],
      description: `Evidencia SENA Learning Hub · Ficha ${fichaNumber} · ${activityTitle}`,
      properties: {
        institution: 'SENA',
        activity: activityTitle,
        ficha: fichaNumber,
        learner: learnerName,
      },
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileReader = new FileReader();

    const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
      fileReader.onload = () => resolve(fileReader.result as ArrayBuffer);
      fileReader.onerror = () => reject(new Error('Error leyendo el archivo en el navegador'));
      fileReader.readAsArrayBuffer(file);
    });

    const fileBuffer = await fileDataPromise;
    const contentType = file.type || 'application/octet-stream';

    // Construir partes del cuerpo multipart
    const metadataHeader =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${contentType}\r\n` +
      'Content-Transfer-Encoding: binary\r\n\r\n';

    const metadataBytes = new TextEncoder().encode(metadataHeader);
    const closeDelimiterBytes = new TextEncoder().encode(closeDelimiter);

    // Combinar en un único Uint8Array para enviar
    const totalLength = metadataBytes.length + fileBuffer.byteLength + closeDelimiterBytes.length;
    const multipartBody = new Uint8Array(totalLength);

    multipartBody.set(metadataBytes, 0);
    multipartBody.set(new Uint8Array(fileBuffer), metadataBytes.length);
    multipartBody.set(closeDelimiterBytes, metadataBytes.length + fileBuffer.byteLength);

    // 3. Ejecutar subida mediante XMLHttpRequest para soporte fiel de progreso
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        'POST',
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink'
      );
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          // El progreso va del 20% al 90% durante la transmisión
          const uploadPct = Math.round(20 + (event.loaded / event.total) * 70);
          onProgress(uploadPct, event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Respuesta no válida de Google Drive'));
          }
        } else {
          let errMsg = `Error de Google Drive (${xhr.status})`;
          try {
            const errJson = JSON.parse(xhr.responseText);
            if (errJson.error?.message) {
              errMsg = errJson.error.message;
            }
          } catch {}
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Fallo de red al comunicarse con Google Drive.'));
      };

      xhr.send(multipartBody);
    });

    if (onProgress) onProgress(100, file.size, file.size);

    const driveUrl =
      uploadResult.webViewLink ||
      `https://drive.google.com/file/d/${uploadResult.id}/view?usp=sharing`;

    let sharedWithInstructor = false;
    let sharedInstructorEmail: string | undefined = undefined;

    if (instructorEmail && instructorEmail.includes('@')) {
      const shareRes = await driveService.grantInstructorReaderPermission(
        uploadResult.id,
        instructorEmail
      );
      sharedWithInstructor = shareRes.success;
      sharedInstructorEmail = instructorEmail;
    }

    return {
      driveFileId: uploadResult.id,
      driveUrl,
      webContentLink: uploadResult.webContentLink,
      fileName: uploadResult.name || file.name,
      fileSize: uploadResult.size ? Number(uploadResult.size) : file.size,
      mimeType: uploadResult.mimeType || contentType,
      folderId,
      structuredPath,
      sharedWithInstructor,
      sharedInstructorEmail,
    };
  },
};
