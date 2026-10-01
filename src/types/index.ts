/**
 * @license
 * SENA Learning Hub - Arquitectura Maestra
 * Definiciones de Tipos del Dominio Académico y Técnico
 */

// Exportar modelo de dominio académico central (Prompt 3)
export * from './academic';

// ==========================================
// 1. ROLES Y USUARIOS
// ==========================================

export type UserRole = 'instructor' | 'apprentice' | 'coordinator' | 'admin' | 'monitor';

export interface BaseUser {
  id: string; // Firebase Auth UID
  email: string;
  fullName: string;
  documentType: 'CC' | 'TI' | 'CE' | 'PEP' | 'PPT';
  documentNumber: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export interface InstructorProfile extends BaseUser {
  role: 'instructor';
  regional: string;
  trainingCenterId: string;
  specialty: string; // Ej: 'Bilingüismo - Idioma Inglés'
  assignedFichaIds: string[];
}

export interface ApprenticeProfile extends BaseUser {
  role: 'apprentice';
  trainingCenterId: string;
  programId: string;
  fichaId: string; // Ficha principal activa
  academicStatus: 'en_formacion' | 'condicionado' | 'cancelado' | 'egresado';
  gamificationId: string;
}

export type AppUser = InstructorProfile | ApprenticeProfile;

// ==========================================
// 2. ESTRUCTURA ACADÉMICA SENA
// ==========================================

export interface TrainingCenter {
  id: string;
  code: string; // Ej: '9218'
  name: string; // Ej: 'Centro de Comercio y Servicios'
  regional: string; // Ej: 'Regional Cauca' / 'Regional Distrito Capital'
}

export interface TrainingProgram {
  id: string;
  code: string; // Ej: '228106'
  name: string; // Ej: 'Gestión Contable y de Información Financiera'
  level: 'tecnico' | 'tecnologo' | 'especializacion' | 'operario' | 'curso_corto';
  centerId: string;
}

export interface GroupFicha {
  id: string;
  codeNumber: string; // Código de ficha, ej: '2698745'
  programId: string;
  programName: string;
  centerId: string;
  startDate: string; // ISO-8601
  endDate: string; // ISO-8601
  leadInstructorId: string; // Instructor vocero / titular
  assignedInstructorIds: string[]; // Incluyendo instructores transversales (ej. inglés)
  totalApprenticesCount: number;
  status: 'lectiva' | 'productiva' | 'finalizada';
}

export interface CourseCompetency {
  id: string;
  fichaId: string;
  code: string; // Ej: '240202501'
  name: string; // Ej: 'Interactuar en lengua inglesa de forma oral y escrita'
  learningOutcomes: string[]; // Resultados de Aprendizaje (RAP)
  instructorId: string;
  academicPeriod: string; // Ej: '2026-1'
  status: 'active' | 'archived';
}

// ==========================================
// 3. ACTIVIDADES Y TIPOS DE APRENDIZAJE
// ==========================================

export type ActivityType =
  | 'file'
  | 'document'
  | 'image'
  | 'video'
  | 'audio_recording'
  | 'quiz'
  | 'presentation'
  | 'written'
  | 'interactive'
  | 'oral_exam';

export type ActivityStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface ActivityCriteria {
  id: string;
  description: string;
  weightPercentage: number;
}

export interface ActivityAttachment {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  sizeBytes: number;
}

export interface Activity {
  id: string;
  courseId: string;
  fichaId: string;
  instructorId: string;
  title: string;
  description: string;
  instructions: string;
  objective: string;
  learningOutcomeCode: string; // RAP correspondiente
  type: ActivityType;
  allowedFileExtensions: string[]; // Ej: ['pdf', 'docx', 'mp3']
  maxFileSizeMb: number;
  publishedAt: string;
  dueDate: string; // Fecha límite de entrega
  allowLateSubmissions: boolean;
  maxScore: number; // Por defecto 100
  passingScore: number; // Por defecto 70 (Aprobado SENA)
  rubricCriteria: ActivityCriteria[];
  attachments: ActivityAttachment[];
  externalLinks: { title: string; url: string }[];
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. EVIDENCIAS Y ALMACENAMIENTO DRIVE
// ==========================================

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'late'
  | 'under_review'
  | 'graded'
  | 'resubmission_requested';

export interface DriveStorageReference {
  driveFileId: string; // ID único del archivo en Google Drive
  driveFolderId: string; // ID de la carpeta contenedor en Google Drive
  webViewLink: string; // Enlace oficial para previsualización
  webContentLink?: string; // Enlace de descarga directa
  structuredPath: string; // "SENA Learning Hub / [Programa] / Ficha [Num] / [Actividad] / [Aprendiz]"
  mimeType: string;
  sizeBytes: number;
  originalFileName: string;
}

export interface Submission {
  id: string;
  activityId: string;
  fichaId: string;
  apprenticeId: string;
  apprenticeName: string;
  apprenticeEmail: string;
  attemptNumber: number;
  submittedAt: string;
  status: SubmissionStatus;
  notesFromApprentice?: string;
  driveRef: DriveStorageReference;
  gradeId?: string; // Referencia a la calificación
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 5. CALIFICACIONES Y RETROALIMENTACIÓN
// ==========================================

export interface Grade {
  id: string;
  submissionId: string;
  activityId: string;
  apprenticeId: string;
  instructorId: string;
  score: number; // 0 - 100
  isApproved: boolean; // SENA: Aprobado (>= 70) o No Aprobado (< 70)
  officialSenaStatus: 'Aprobado' | 'No Aprobado';
  rubricScores: { criteriaId: string; scoreObtained: number }[];
  gradedAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  gradeId: string;
  submissionId: string;
  instructorId: string;
  comments: string;
  audioFeedbackUrl?: string; // Audio opcional del instructor
  strengths: string[];
  areasForImprovement: string[];
  aiAssistedSuggestions?: string;
  createdAt: string;
}

// ==========================================
// 6. NOTIFICACIONES Y CORREOS
// ==========================================

export type NotificationType =
  | 'activity_published'
  | 'submission_graded'
  | 'feedback_received'
  | 'deadline_reminder'
  | 'announcement'
  | 'achievement_unlocked'
  | 'course_update';

export interface AppNotification {
  id: string;
  recipientUserId: string;
  senderUserId?: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl: string;
  isRead: boolean;
  createdAt: string;
}

export interface EmailDispatchLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  templateType: 'grade_published' | 'activity_due_reminder' | 'announcement';
  status: 'queued' | 'sent' | 'failed';
  errorDetails?: string;
  dispatchedAt: string;
}

// ==========================================
// 7. GAMIFICACIÓN (BILINGÜISMO & PARTICIPACIÓN)
// ==========================================

export interface Badge {
  id: string;
  code: string; // Ej: 'ENGLISH_EXPLORER_LVL1'
  title: string;
  description: string;
  iconName: string;
  category: 'english' | 'punctuality' | 'mastery' | 'consistency';
  xpReward: number;
}

export interface GamificationProfile {
  id: string;
  apprenticeId: string;
  totalXp: number;
  currentLevel: number;
  streakDays: number;
  lastActiveDate: string;
  unlockedBadgeIds: string[];
  rankingPosition?: number;
}

// ==========================================
// 8. INTELIGENCIA ARTIFICIAL (GEMINI)
// ==========================================

export interface AiTaskSuggestion {
  quizQuestions?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  grammarAnalysis?: {
    originalText: string;
    correctedText: string;
    ruleExplained: string;
  };
  englishLevelEvaluated?: 'A1' | 'A2' | 'B1' | 'B2';
}
