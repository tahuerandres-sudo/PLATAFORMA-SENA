/**
 * @license
 * SENA Learning Hub - Validador de Archivos Adjuntos a Anuncios
 * PROMPT 48: Tipos permitidos, validación cliente/servidor y firmas mágicas (Magic Numbers)
 */

export interface AttachmentValidationResult {
  isValid: boolean;
  errorMessage?: string;
  detectedMimeType?: string;
  detectedExtension?: string;
}

export const ANNOUNCEMENT_FILE_LIMITS = {
  maxFileSizeMb: 10, // 10 MB por archivo
  maxFilesPerAnnouncement: 5, // Máximo 5 archivos por anuncio
  allowedExtensions: [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.jpg',
    '.jpeg',
    '.png',
    '.mp3',
    '.wav',
    '.mp4',
    '.txt',
  ],
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'video/mp4',
    'text/plain',
  ],
};

/**
 * Valida un archivo contra extensiones, límites de peso y tipo MIME
 */
export function validateAnnouncementFile(file: File): AttachmentValidationResult {
  // 1. Tamaño
  if (!file || file.size === 0) {
    return {
      isValid: false,
      errorMessage: 'El archivo está vacío (0 bytes).',
    };
  }

  const maxBytes = ANNOUNCEMENT_FILE_LIMITS.maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      errorMessage: `El archivo "${file.name}" (${sizeMb} MB) supera el límite máximo de ${ANNOUNCEMENT_FILE_LIMITS.maxFileSizeMb} MB.`,
    };
  }

  // 2. Extensión
  const lowerName = file.name.toLowerCase();
  const matchedExt = ANNOUNCEMENT_FILE_LIMITS.allowedExtensions.find((ext) =>
    lowerName.endsWith(ext)
  );

  if (!matchedExt) {
    return {
      isValid: false,
      errorMessage: `El archivo "${file.name}" no tiene un formato permitido. Formatos aceptados: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Imágenes (.jpg, .jpeg, .png), Audio (.mp3, .wav), Video (.mp4) y Texto (.txt).`,
    };
  }

  // 3. MIME type si el navegador lo reporta (ignorar application/octet-stream genérico)
  if (file.type && file.type !== 'application/octet-stream') {
    const isMimeAllowed = ANNOUNCEMENT_FILE_LIMITS.allowedMimeTypes.includes(file.type.toLowerCase());
    if (!isMimeAllowed) {
      // Advertir solo si difiere ostensiblemente
      console.warn(`[validateAnnouncementFile] MIME type no común reportado: ${file.type}`);
    }
  }

  return {
    isValid: true,
    detectedExtension: matchedExt,
  };
}

/**
 * Inspecciona los primeros bytes del archivo (magic numbers) para verificación profunda de seguridad
 */
export async function verifyFileMagicBytes(file: File): Promise<AttachmentValidationResult> {
  const basic = validateAnnouncementFile(file);
  if (!basic.isValid) return basic;

  try {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const lowerName = file.name.toLowerCase();

    // PDF: %PDF (25 50 44 46)
    if (lowerName.endsWith('.pdf')) {
      if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        return { isValid: true, detectedMimeType: 'application/pdf' };
      }
      return { isValid: false, errorMessage: `El archivo "${file.name}" no es un documento PDF auténtico.` };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (lowerName.endsWith('.png')) {
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return { isValid: true, detectedMimeType: 'image/png' };
      }
      return { isValid: false, errorMessage: `El archivo "${file.name}" no es una imagen PNG válida.` };
    }

    // JPEG: FF D8 FF
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return { isValid: true, detectedMimeType: 'image/jpeg' };
      }
      return { isValid: false, errorMessage: `El archivo "${file.name}" no es una imagen JPEG válida.` };
    }

    // ZIP based (DOCX, XLSX, PPTX): PK.. (50 4B 03 04)
    if (
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.pptx')
    ) {
      if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
        return { isValid: true };
      }
      return { isValid: false, errorMessage: `El archivo "${file.name}" de Office parece estar dañado o no es auténtico.` };
    }

    // MP4: ftyp (bytes 4-7: 66 74 79 70)
    if (lowerName.endsWith('.mp4')) {
      if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
        return { isValid: true, detectedMimeType: 'video/mp4' };
      }
      // Algunos MP4 tienen encabezados compatibles
      return { isValid: true };
    }

    // MP3: ID3 (49 44 33) o sync word FF FB/F3
    if (lowerName.endsWith('.mp3')) {
      if (
        (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
        (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)
      ) {
        return { isValid: true, detectedMimeType: 'audio/mpeg' };
      }
      return { isValid: true };
    }

    // WAV: RIFF...WAVE (52 49 46 46)
    if (lowerName.endsWith('.wav')) {
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        return { isValid: true, detectedMimeType: 'audio/wav' };
      }
      return { isValid: true };
    }

    // TXT u otros formatos
    return { isValid: true };
  } catch (err) {
    // Si la lectura de bytes falla por seguridad del navegador, fallback a validación básica
    return basic;
  }
}

/**
 * Convierte un File a data URL base64 para persistencia de respaldo
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Error leyendo archivo a base64'));
    reader.readAsDataURL(file);
  });
}

/**
 * Formatea bytes a cadena legible (KB / MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
