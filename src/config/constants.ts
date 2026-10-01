/**
 * @license
 * SENA Learning Hub - Constantes y Configuración de Arquitectura
 */

export const SENA_BRAND = {
  name: 'SENA Learning Hub',
  tagline: 'Plataforma de Formación y Bilingüismo',
  institution: 'Servicio Nacional de Aprendizaje (SENA)',
  colors: {
    senaGreen: '#39A900', // Verde institucional oficial
    senaGreenHover: '#2E8500',
    senaGreenLight: '#EBF8E7',
    senaNavy: '#00324D', // Azul oscuro SENA
    senaNavyLight: '#004A73',
    senaOrange: '#FF671B', // Naranja transversal
    slateDark: '#0F172A',
    slateMuted: '#64748B',
    slateBg: '#F8FAFC',
  },
  thresholds: {
    passingGrade: 70, // Criterio SENA: 70% o más = Aprobado (A)
    maxGrade: 100,
    maxFileSizeMb: 25,
  },
};

/**
 * Nombres oficiales de colecciones de Cloud Firestore
 * Diseñadas para evitar duplicaciones y mantener normalización e integridad referencial (Prompt 3).
 */
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  TRAINING_CENTERS: 'trainingCenters',
  TRAINING_PROGRAMS: 'trainingPrograms',
  FICHAS: 'fichas',
  COURSES: 'courses',
  FICHA_COURSES: 'fichaCourses',
  COMPETENCIES: 'competencies',
  LEARNING_OUTCOMES: 'learningOutcomes',
  ENROLLMENTS: 'enrollments',
  ACTIVITIES: 'activities',
  SUBMISSIONS: 'submissions',
  ATTENDANCE: 'attendance',
  ATTENTION_CALLS: 'attentionCalls',
  ACADEMIC_RESTRICTIONS: 'academicRestrictions',
  JUSTIFICATIONS: 'justifications',
  LEARNER_RECORDS: 'learnerRecords',
  GRADES: 'grades',
  FEEDBACK: 'feedback',
  ANNOUNCEMENTS: 'announcements',
  NOTIFICATIONS: 'notifications',
  QUIZZES: 'quizzes',
  GAMIFICATION: 'gamification',
  BADGES: 'badges',
  AUDIT_LOGS: 'auditLogs',
} as const;

/**
 * Escala de Calificación Institucional SENA (A / N / C)
 */
export const SENA_GRADE_DEFINITIONS = {
  APPROVED: {
    code: 'A',
    label: 'Aprobado',
    description: 'El aprendiz alcanzó los resultados de aprendizaje esperados (>= 70%).',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    shortcut: 'A',
  },
  NOT_APPROVED: {
    code: 'N',
    label: 'No Aprobado',
    description: 'El aprendiz no alcanzó las competencias mínimas (< 70%).',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    shortcut: 'N',
  },
  CORRECTION_REQUIRED: {
    code: 'C',
    label: 'Corregir',
    description: 'Evidencia devuelta para corrección o ajuste pedagógico.',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    shortcut: 'C',
  },
} as const;

/**
 * Hoja de ruta (Roadmap) de desarrollo progresivo por Prompts
 */
export interface RoadmapStage {
  stepNumber: number;
  promptCode: string;
  title: string;
  summary: string;
  status: 'current' | 'ready' | 'pending';
  modulesInvolved: string[];
}

export const ARCHITECTURE_ROADMAP: RoadmapStage[] = [
  {
    stepNumber: 0,
    promptCode: 'PROMPT 0',
    title: 'Arquitectura Maestra',
    summary: 'Análisis integral, esquemas de datos Firestore, arquitectura Google Drive, RBAC, riesgos y base inicial modular.',
    status: 'ready',
    modulesInvolved: ['Arquitectura', 'Types', 'Config', 'Contratos de Servicio'],
  },
  {
    stepNumber: 1,
    promptCode: 'PROMPT 1',
    title: 'Interfaz y Estructura Visual',
    summary: 'Diseño responsive estilo Google Classroom, dashboards para Instructor y Aprendiz, diseño institucional SENA.',
    status: 'ready',
    modulesInvolved: ['UI System', 'App Shell', 'Sidebar', 'Course Cards', 'Theme'],
  },
  {
    stepNumber: 2,
    promptCode: 'PROMPT 2',
    title: 'Usuarios, Autenticación y Roles',
    summary: 'Integración de Firebase Auth, perfiles con rol (Instructor/Aprendiz), guardias de ruta y reglas de seguridad.',
    status: 'ready',
    modulesInvolved: ['Firebase Auth', 'User Repository', 'Role Guards', 'RBAC'],
  },
  {
    stepNumber: 3,
    promptCode: 'PROMPT 3',
    title: 'Estructura Académica Central y Modelo de Datos',
    summary: 'Centro → Programa → Ficha → Curso → Competencia → RAP → Actividades/Evidencias → Submissions y arquitectura de seguimiento.',
    status: 'current',
    modulesInvolved: ['TrainingCenters', 'Programs', 'Fichas', 'Courses', 'Competencies', 'LearningOutcomes', 'Enrollments', 'Tracking'],
  },
  {
    stepNumber: 4,
    promptCode: 'PROMPT 4',
    title: 'Actividades y Entrega de Evidencias',
    summary: 'Gestión de actividades (inglés/técnicas), fechas límite, tipos de evidencia y panel de entrega.',
    status: 'pending',
    modulesInvolved: ['Activity Editor', 'Submission Flow', 'File Validation'],
  },
  {
    stepNumber: 5,
    promptCode: 'PROMPT 5',
    title: 'Integración con Google Drive',
    summary: 'Organización automatizada de carpetas: Programa/Ficha/Actividad/Aprendiz. Evidencias seguras.',
    status: 'pending',
    modulesInvolved: ['Google Drive API', 'Folder Hierarchy', 'Storage Proxy'],
  },
  {
    stepNumber: 6,
    promptCode: 'PROMPT 6',
    title: 'Calificaciones y Retroalimentación',
    summary: 'Evaluación cualitativa/cuantitativa SENA (Aprobado/No Aprobado), rúbricas, feedback y estado de evidencias.',
    status: 'pending',
    modulesInvolved: ['Grading Console', 'Rubrics System', 'Feedback Engine'],
  },
  {
    stepNumber: 7,
    promptCode: 'PROMPT 7',
    title: 'Correos Electrónicos y Notificaciones',
    summary: 'Notificaciones push (FCM) y disparador de emails transaccionales desacoplado con plantillas institucionales.',
    status: 'pending',
    modulesInvolved: ['FCM Push', 'Email Dispatcher', 'Notification Center'],
  },
  {
    stepNumber: 8,
    promptCode: 'PROMPT 8',
    title: 'Gamificación para Bilingüismo',
    summary: 'Puntos XP, rachas de estudio, insignias de inglés, niveles y ranking motivacional sin alterar nota académica.',
    status: 'pending',
    modulesInvolved: ['Gamification Engine', 'Leaderboards', 'Badges Vault'],
  },
  {
    stepNumber: 9,
    promptCode: 'PROMPT 9',
    title: 'Funciones de Inteligencia Artificial (Gemini)',
    summary: 'Generación de quizzes de inglés, tutoría gramatical, análisis de pronunciación y sugerencias pedagógicas.',
    status: 'pending',
    modulesInvolved: ['Gemini API SDK', 'English Tutor', 'Quiz Generator'],
  },
  {
    stepNumber: 10,
    promptCode: 'PROMPT 10',
    title: 'Seguridad, Pruebas, Optimización y Despliegue',
    summary: 'Reglas de seguridad Firestore finales, auditoría de permisos, manifiesto PWA para móviles y pruebas E2E.',
    status: 'pending',
    modulesInvolved: ['PWA Manifest', 'Security Audit', 'Performance & Cache'],
  },
];
