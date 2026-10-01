/**
 * @license
 * SENA Learning Hub - Servicio de Validación de Tipos de Evidencia
 * PROMPT 4: Requisitos 4, 5, 6
 */

import { EvidenceType } from '../../types/academic';
import { getEvidenceTypeConfig } from '../../config/fileLimits';

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  sanitizedValue?: string;
}

export const evidenceValidationService = {
  /**
   * Valida un archivo antes de iniciar la subida
   */
  validateFile(
    file: File,
    expectedType: EvidenceType,
    maxFileSizeMb?: number
  ): ValidationResult {
    const config = getEvidenceTypeConfig(expectedType);

    if (!config.isFile) {
      return {
        isValid: false,
        errorMessage: `Esta actividad requiere una entrega de tipo "${config.label}", no un archivo digital.`,
      };
    }

    // 1. Validar extensión de archivo
    const fileName = file.name.toLowerCase();
    const hasValidExtension = config.allowedExtensions.some((ext) =>
      fileName.endsWith(ext.toLowerCase())
    );

    if (config.allowedExtensions.length > 0 && !hasValidExtension) {
      const allowedStr = config.allowedExtensions.join(', ');
      return {
        isValid: false,
        errorMessage: `Esta actividad requiere un archivo de tipo ${config.label} (${allowedStr}). El archivo seleccionado "${file.name}" no cumple con el tipo de evidencia solicitado.`,
      };
    }

    // 2. Validar MIME type (si está disponible y registrado en config)
    if (file.type && config.allowedMimeTypes.length > 0) {
      const isMimeValid = config.allowedMimeTypes.includes(file.type.toLowerCase());
      // Algunas plataformas o navegadores reportan tipos MIME genéricos como application/octet-stream;
      // solo rechazamos si no coincide y no es genérico.
      if (!isMimeValid && file.type !== 'application/octet-stream') {
        const allowedStr = config.allowedExtensions.join(', ');
        return {
          isValid: false,
          errorMessage: `El formato del archivo (${file.type}) no corresponde al tipo solicitado (${config.label} - ${allowedStr}).`,
        };
      }
    }

    // 3. Validar tamaño máximo de archivo
    const effectiveLimitMb = maxFileSizeMb || config.defaultMaxFileSizeMb;
    const maxSizeBytes = effectiveLimitMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        isValid: false,
        errorMessage: `El archivo supera el tamaño máximo permitido. Tamaño: ${fileSizeMb} MB. Límite máximo: ${effectiveLimitMb} MB.`,
      };
    }

    // 4. Validar que no esté vacío
    if (file.size === 0) {
      return {
        isValid: false,
        errorMessage: 'El archivo seleccionado está vacío (0 bytes).',
      };
    }

    return { isValid: true };
  },

  /**
   * Valida un enlace de YouTube según formatos oficiales
   */
  validateYouTubeUrl(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        errorMessage: 'Por favor ingresa la URL de tu video de YouTube.',
      };
    }

    const trimmed = url.trim();

    // Aceptar https://www.youtube.com/watch?v=..., https://youtu.be/..., https://youtube.com/shorts/...
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{11}(\S*)?$/i;

    if (!youtubeRegex.test(trimmed)) {
      return {
        isValid: false,
        errorMessage:
          'La URL ingresada no es válida para YouTube. Asegúrate de que use el formato https://www.youtube.com/watch?v=... o https://youtu.be/...',
      };
    }

    return {
      isValid: true,
      sanitizedValue: trimmed,
    };
  },

  /**
   * Valida un enlace de Canva
   */
  validateCanvaUrl(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        errorMessage: 'Por favor ingresa el enlace de tu diseño de Canva.',
      };
    }

    const trimmed = url.trim();

    // Aceptar https://www.canva.com/design/... o https://canva.com/design/...
    const canvaRegex = /^https?:\/\/(www\.)?canva\.com\/design\/[a-zA-Z0-9_\-\/]+.*$/i;

    if (!canvaRegex.test(trimmed)) {
      return {
        isValid: false,
        errorMessage:
          'La URL ingresada no pertenece a Canva. El enlace debe tener el formato https://www.canva.com/design/... con permisos de lectura.',
      };
    }

    return {
      isValid: true,
      sanitizedValue: trimmed,
    };
  },

  /**
   * Valida un enlace web externo general
   */
  validateExternalUrl(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        errorMessage: 'Por favor ingresa un enlace web válido.',
      };
    }

    const trimmed = url.trim();

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          isValid: false,
          errorMessage: 'El enlace debe iniciar con http:// o https://',
        };
      }
      return { isValid: true, sanitizedValue: trimmed };
    } catch {
      return {
        isValid: false,
        errorMessage: 'El texto ingresado no es una URL web válida.',
      };
    }
  },

  /**
   * Valida texto en línea
   */
  validateTextSubmission(text: string, minChars = 10): ValidationResult {
    const trimmed = (text || '').trim();
    if (trimmed.length < minChars) {
      return {
        isValid: false,
        errorMessage: `El texto ingresado es demasiado corto. Mínimo ${minChars} caracteres requeridos.`,
      };
    }
    return { isValid: true, sanitizedValue: trimmed };
  },
};
