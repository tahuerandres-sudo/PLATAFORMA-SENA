/**
 * @license
 * SENA Learning Hub - Configuración Centralizada de Tipos de Evidencia y Límites de Archivos
 * PROMPT 4: Requisitos 3, 4, 13
 */

import { EvidenceType } from '../types/academic';

export interface EvidenceTypeConfig {
  type: EvidenceType;
  label: string;
  description: string;
  defaultMaxFileSizeMb: number; // En Megabytes
  maxAllowedFileSizeMb: number; // Límite técnico superior permitido
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  isUrl: boolean;
  isText: boolean;
  isFile: boolean;
  iconName: string;
  badgeClass: string;
  placeholderHint: string;
}

/**
 * Catálogo maestro de configuración y restricciones por tipo de evidencia
 */
export const EVIDENCE_TYPE_CONFIGS: Record<EvidenceType, EvidenceTypeConfig> = {
  pdf: {
    type: 'pdf',
    label: 'Documento PDF',
    description: 'Archivo de lectura digital en formato estándar PDF (.pdf).',
    defaultMaxFileSizeMb: 10,
    maxAllowedFileSizeMb: 25,
    allowedExtensions: ['.pdf'],
    allowedMimeTypes: ['application/pdf'],
    isUrl: false,
    isText: false,
    isFile: true,
    iconName: 'FileText',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    placeholderHint: 'Selecciona o arrastra tu archivo PDF (.pdf)',
  },
  image: {
    type: 'image',
    label: 'Imagen / Fotografía',
    description: 'Imágenes, fotografías, esquemas e infografías (.jpg, .jpeg, .png, .webp).',
    defaultMaxFileSizeMb: 10,
    maxAllowedFileSizeMb: 15,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    isUrl: false,
    isText: false,
    isFile: true,
    iconName: 'Image',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    placeholderHint: 'Selecciona o arrastra una imagen JPG, PNG o WebP',
  },
  video: {
    type: 'video',
    label: 'Archivo de Video',
    description: 'Grabaciones de video locales en formatos compatibles (.mp4, .mov, .webm).',
    defaultMaxFileSizeMb: 50,
    maxAllowedFileSizeMb: 100,
    allowedExtensions: ['.mp4', '.mov', '.webm'],
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    isUrl: false,
    isText: false,
    isFile: true,
    iconName: 'Video',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    placeholderHint: 'Selecciona o arrastra tu video MP4, MOV o WebM',
  },
  audio: {
    type: 'audio',
    label: 'Grabación de Audio',
    description: 'Audios, podcasts y grabaciones orales (.mp3, .wav, .m4a, .ogg).',
    defaultMaxFileSizeMb: 15,
    maxAllowedFileSizeMb: 30,
    allowedExtensions: ['.mp3', '.wav', '.m4a', '.ogg'],
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/x-m4a'],
    isUrl: false,
    isText: false,
    isFile: true,
    iconName: 'Mic',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    placeholderHint: 'Selecciona o arrastra tu audio MP3, WAV, M4A u OGG',
  },
  document: {
    type: 'document',
    label: 'Documento Word (.doc, .docx)',
    description: 'Documentos procesadores de texto de Microsoft Word (.doc, .docx).',
    defaultMaxFileSizeMb: 10,
    maxAllowedFileSizeMb: 25,
    allowedExtensions: ['.doc', '.docx'],
    allowedMimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    isUrl: false,
    isText: false,
    isFile: true,
    iconName: 'File',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    placeholderHint: 'Selecciona o arrastra tu documento Word (.doc, .docx)',
  },
  presentation: {
    type: 'presentation',
    label: 'Presentación PowerPoint (.ppt, .pptx)',
    description: 'Presentaciones con diapositivas de Microsoft PowerPoint (.ppt, .pptx).',
    defaultMaxFileSizeMb: 15,
    maxAllowedFileSizeMb: 20,
    allowedExtensions: ['.ppt', '.pptx'],
    allowedMimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    isUrl: false,
    isText: false,
    isFile: true,
    iconName: 'Presentation',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    placeholderHint: 'Selecciona o arrastra tu archivo PowerPoint (.ppt, .pptx)',
  },
  spreadsheet: {
    type: 'spreadsheet',
    label: 'Hoja de Cálculo Excel (.xls, .xlsx)',
    description: 'Libros y hojas de cálculo contables o estadísticas (.xls, .xlsx).',
    defaultMaxFileSizeMb: 10,
    maxAllowedFileSizeMb: 15,
    allowedExtensions: ['.xls', '.xlsx'],
    allowedMimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    isUrl: false,
    isText: false,
    isFile: true,
    iconName: 'Table',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    placeholderHint: 'Selecciona o arrastra tu libro Excel (.xls, .xlsx)',
  },
  youtube_link: {
    type: 'youtube_link',
    label: 'Enlace de YouTube',
    description: 'Enlace a video publicado en YouTube (Modo Oculto o Público).',
    defaultMaxFileSizeMb: 0,
    maxAllowedFileSizeMb: 0,
    allowedExtensions: [],
    allowedMimeTypes: [],
    isUrl: true,
    isText: false,
    isFile: false,
    iconName: 'Youtube',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    placeholderHint: 'https://www.youtube.com/watch?v=... o https://youtu.be/...',
  },
  canva_link: {
    type: 'canva_link',
    label: 'Enlace de Canva',
    description: 'Enlace público o de previsualización de diseño en Canva.',
    defaultMaxFileSizeMb: 0,
    maxAllowedFileSizeMb: 0,
    allowedExtensions: [],
    allowedMimeTypes: [],
    isUrl: true,
    isText: false,
    isFile: false,
    iconName: 'ExternalLink',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    placeholderHint: 'https://www.canva.com/design/...',
  },
  external_link: {
    type: 'external_link',
    label: 'Enlace Externo',
    description: 'URL a un recurso web externo seguro (Google Docs, sitio web, repositorio).',
    defaultMaxFileSizeMb: 0,
    maxAllowedFileSizeMb: 0,
    allowedExtensions: [],
    allowedMimeTypes: [],
    isUrl: true,
    isText: false,
    isFile: false,
    iconName: 'Link',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    placeholderHint: 'https://...',
  },
  text: {
    type: 'text',
    label: 'Texto en Línea',
    description: 'Redacción directa de texto o respuesta en la plataforma.',
    defaultMaxFileSizeMb: 0,
    maxAllowedFileSizeMb: 0,
    allowedExtensions: [],
    allowedMimeTypes: [],
    isUrl: false,
    isText: true,
    isFile: false,
    iconName: 'AlignLeft',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    placeholderHint: 'Escribe tu respuesta o síntesis aquí...',
  },
  multiple_files: {
    type: 'multiple_files',
    label: 'Múltiples Archivos',
    description: 'Entrega de un paquete con varios archivos complementarios.',
    defaultMaxFileSizeMb: 25,
    maxAllowedFileSizeMb: 50,
    allowedExtensions: ['.pdf', '.zip', '.docx', '.png', '.jpg'],
    allowedMimeTypes: [],
    isUrl: false,
    isText: false,
    isFile: true,
    iconName: 'Files',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    placeholderHint: 'Selecciona o arrastra los archivos solicitados',
  },
};

/**
 * Obtiene la configuración para un tipo de evidencia
 */
export function getEvidenceTypeConfig(type: EvidenceType): EvidenceTypeConfig {
  return (
    EVIDENCE_TYPE_CONFIGS[type] || {
      type: 'pdf',
      label: 'Documento PDF',
      description: 'Documento estándar.',
      defaultMaxFileSizeMb: 10,
      maxAllowedFileSizeMb: 25,
      allowedExtensions: ['.pdf'],
      allowedMimeTypes: ['application/pdf'],
      isUrl: false,
      isText: false,
      isFile: true,
      iconName: 'FileText',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
      placeholderHint: 'Selecciona tu archivo',
    }
  );
}
