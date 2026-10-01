/**
 * @license
 * SENA Learning Hub - Modelo de Dominio Académico Central
 * PROMPT 3: Estructura Académica Central y Modelo de Datos
 *
 * Jerarquía Principal:
 * Centro de Formación → Programa de Formación → Ficha → Curso → Competencia → Resultado de Aprendizaje → Actividad/Evidencia → Entrega → Calificación
 *
 * Flujo de Acompañamiento:
 * Ficha → Aprendiz → Asistencia → Puntualidad → Seguimiento → Llamado de Atención → Justificación → Restricción → Revisión → Habilitación
 */

// ==========================================
// 1. CENTRO DE FORMACIÓN (TrainingCenter)
// ==========================================
export interface TrainingCenter {
  id: string;
  name: string; // Ej: "Centro de Comercio y Servicios"
  code: string; // Ej: "CCS" o "9218"
  city: string; // Ej: "Ibagué"
  department: string; // Ej: "Tolima"
  address?: string;
  regional?: string; // Ej: "Regional Tolima"
  status: 'active' | 'inactive';
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ==========================================
// 2. PROGRAMAS DE FORMACIÓN (TrainingProgram)
// ==========================================
export type ProgramLevel =
  | 'tecnico'
  | 'tecnologo'
  | 'especializacion'
  | 'operario'
  | 'curso_corto';

export interface TrainingProgram {
  id: string;
  name: string; // Ej: "Gestión Contable y de Información Financiera"
  code: string; // Ej: "228106"
  level: ProgramLevel;
  centerId: string; // Vinculación a TrainingCenter
  status: 'active' | 'inactive';
  description: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 3. FICHAS DE FORMACIÓN (Ficha / TrainingGroup)
// ==========================================
export type FichaShift = 'morning' | 'afternoon' | 'evening';
export type FichaStage = 'induction' | 'lectiva' | 'productive' | 'completed';
export type FichaStatus = 'active' | 'inactive' | 'archived';

export interface Ficha {
  id: string;
  number: string; // Número de ficha único SENA, Ej: "3409626"
  name?: string; // Nombre descriptivo opcional
  programName?: string;
  centerName?: string;
  programId: string;
  centerId: string;
  instructorIds: string[]; // Uno o varios instructores asignados
  startDate: string; // ISO-8601
  endDate: string; // ISO-8601
  status: FichaStatus;
  shift: FichaShift; // morning | afternoon | evening
  stage: FichaStage; // induction | lectiva | productive | completed
  academicStage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedFicha extends Ficha {
  programName?: string;
  centerName?: string;
  apprenticesCount?: number;
}

// ==========================================
// 4. CURSOS (Course)
// ==========================================
export type CourseType = 'transversal' | 'technical' | 'bilingualism' | 'other';

export interface Course {
  id: string;
  name: string; // Ej: "Inglés – Bilingüismo Laboral"
  code: string; // Ej: "240202501-ING"
  description: string;
  type: CourseType;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 5. RELACIÓN FICHA + CURSO (FichaCourse / CourseAssignment)
// ==========================================
export interface FichaCourse {
  id: string;
  fichaId: string;
  courseId: string;
  instructorIds: string[];
  startDate?: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 6. COMPETENCIAS (Competency)
// ==========================================
export type CompetencyType = 'transversal' | 'technical' | 'basic' | 'other';

export interface Competency {
  id: string;
  name: string;
  code: string; // Ej: "240202501"
  description: string;
  type: CompetencyType;
  status: 'active' | 'inactive';
  programId?: string; // Asociación con el programa de formación (Sección 9)
  courseId?: string; // Opcional para vincular a un curso base
  fichaId?: string; // Opcional para competencias específicas de una ficha
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 7. RESULTADOS DE APRENDIZAJE (LearningOutcome / RAP)
// ==========================================
export interface LearningOutcome {
  id: string;
  competencyId: string;
  programId?: string; // Asociación con el programa de formación (Sección 10)
  courseId?: string;
  name?: string;
  code: string; // Ej: "RAP-240202501-01"
  description: string;
  sequence: number; // Orden pedagógico (1, 2, 3...)
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 8. RELACIÓN FICHA + COMPETENCIA (FichaCompetency)
// ==========================================
export interface FichaCompetency {
  id: string;
  fichaId: string;
  competencyId: string;
  courseId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 9. MATRÍCULAS / ENROLLMENTS (Enrollment)
// ==========================================
export type EnrollmentStatus =
  | 'active'
  | 'inactive'
  | 'completed'
  | 'withdrawn'
  | 'suspended';

export interface Enrollment {
  id: string;
  userId: string; // Ref a /users/{uid}
  learnerId?: string; // Ref canónica a aprendiz (Sección 7)
  apprenticeId?: string; // Alias para compatibilidad de queries
  fichaId: string; // Ref a /fichas/{id}
  programId: string; // Ref a /trainingPrograms/{id}
  centerId: string; // Ref a /trainingCenters/{id}
  courseId?: string; // Opcional si la matrícula es a un curso específico
  status: EnrollmentStatus;
  enrollmentDate: string; // ISO-8601
  enrolledAt?: string; // Alias para compatibilidad de fecha
  completionDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedEnrollment extends Enrollment {
  ficha?: Ficha;
  program?: TrainingProgram;
  center?: TrainingCenter;
  courses?: (Course & { fichaCourseId: string })[];
  instructors?: { uid: string; displayName: string; email: string }[];
}

export interface ApprenticeWithEnrollment {
  id?: string;
  uid: string;
  displayName: string;
  documentNumber: string;
  email: string;
  photoURL: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending' | 'blocked';
  enrollmentId: string;
  enrollmentStatus: 'active' | 'inactive' | 'completed' | 'withdrawn' | 'suspended';
  programName: string;
  fichaId?: string;
  fichaNumber: string;
  courseName: string;
  progressPercent: number;
  averageGrade: string; // 'A' | 'N' | 'C' | 'N/A'

  // Métricas preparadas
  attendanceRate: number;
  punctualityRate: number;
  submittedEvidencesCount: number;
  totalEvidencesCount: number;
  activeAttentionCallsCount: number;
  hasActiveRestrictions: boolean;
  academicNotesCount: number;
  behavioralNotesCount: number;
}

export interface FichaApprenticeItem {
  enrollmentId: string;
  apprenticeId: string;
  displayName: string;
  email: string;
  documentNumber: string;
  phone: string;
  photoURL: string;
  fichaId: string;
  fichaNumber: string;
  programName: string;
  status: string;
  enrolledAt?: string;
}

// ==========================================
// 10. TIPOS DE EVIDENCIA Y ACTIVIDADES (Activity)
// ==========================================
export type EvidenceType =
  | 'canva_link'
  | 'youtube_link'
  | 'pdf'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'presentation'
  | 'spreadsheet'
  | 'external_link'
  | 'text'
  | 'multiple_files';

export type ActivityStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface EvidenceActivity {
  id: string;
  title: string; // Ej: "Family Tree Presentation"
  name?: string; // Alias para compatibilidad
  description: string;
  programId?: string; // Ref a programa de formación
  courseId: string;
  fichaId: string;
  competencyId: string;
  learningOutcomeId: string;
  learningOutcomeIds?: string[]; // Soporte para evaluar uno o varios RAP (Sección 13)
  createdBy: string; // Ref a UID del Instructor
  instructorId?: string;
  instructorEmail?: string;
  status: ActivityStatus;
  publishedAt: string;
  dueDate: string;
  startDate?: string; // Fecha de apertura (Sección 12)
  endDate?: string; // Fecha de cierre (Sección 12)
  points: number; // Por defecto 100
  instructions: string;

  // Validación de tipo de entrega de evidencia
  submissionType: EvidenceType;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[]; // Ej: [".pdf", ".png", ".jpg"]
  maxFileSize?: number; // En MB (ej: 10, 25)
  maxFiles?: number;
  allowMultipleFiles?: boolean;
  requiresUrl?: boolean; // Para enlaces de Canva, YouTube, enlaces externos
  requiresFile?: boolean; // Para PDF, imágenes, videos directos

  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 11. ENTREGAS DE EVIDENCIAS (Submission)
// ==========================================
export type SubmissionAcademicStatus =
  | 'pending'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'not_approved'
  | 'correction_required'
  | 'late'
  | 'blocked';

export interface AcademicSubmission {
  id: string;
  activityId: string;
  learnerId: string; // UID del aprendiz
  userId: string; // Alias para compatibilidad con auth UID
  learnerName?: string;
  learnerEmail?: string;
  enrollmentId?: string;
  fichaId: string;
  programId?: string;
  courseId: string;
  learningOutcomeId?: string;
  submittedAt: string;
  status: SubmissionAcademicStatus;
  submissionType: EvidenceType;
  platform?: 'youtube' | 'canva' | 'external' | 'drive' | 'text' | 'other';
  externalUrl?: string; // Para Canva / YouTube / Enlace externo
  textContent?: string; // Para evidencias de texto libre
  fileName?: string;
  mimeType?: string;
  fileSize?: number; // Bytes

  // Integración física con Google Drive
  driveFileId?: string; // ID único del archivo físico en Google Drive
  driveUrl?: string; // Enlace oficial webViewLink para abrir en Google Drive
  driveFileUrl?: string; // Alias de enlace webViewLink
  driveFolderId?: string; // ID de la carpeta contenedora en Google Drive
  drivePath?: string; // Ruta lógica: SENA Learning Hub / Programa / Ficha / Actividad / Aprendiz
  files?: Array<{
    driveFileId: string;
    driveUrl?: string;
    driveFileUrl?: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }>;

  version?: number;
  comments?: string;
  feedback?: string;
  grade?: AcademicGradeCode | number; // 'A' | 'N' | 'C'
  gradedBy?: string; // UID o nombre del instructor
  gradedAt?: string;
  instructorId?: string; // UID del instructor a cargo
  instructorEmail?: string; // Correo del instructor para permisos Drive
  resubmissionCount: number;
  submissionHistory?: SubmissionHistoryItem[];
  competencyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionHistoryItem {
  version: number;
  submittedAt: string;
  driveFileId?: string;
  driveUrl?: string;
  driveFileUrl?: string;
  fileName?: string;
  externalUrl?: string;
  textContent?: string;
  status: SubmissionAcademicStatus;
  grade?: AcademicGradeCode | number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
}

// ==========================================
// 12. MODELO DE CALIFICACIÓN SENA
// ==========================================
export type AcademicGradeCode = 'A' | 'N' | 'C';
// A = Approved / Aprobado
// N = Not approved / No aprobado
// C = Correction required / Corregir

export interface GradeDefinition {
  code: AcademicGradeCode;
  label: string;
  description: string;
  badgeColor: string;
  keyboardShortcut: string; // 'a' | 'n' | 'c'
}

export interface BatchGradingPayload {
  submissionIds: string[];
  grade: AcademicGradeCode;
  feedback?: string;
  gradedBy: string;
}

// ==========================================
// 13. ASISTENCIA Y PUNTUALIDAD (AttendanceRecord)
// ==========================================
export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'
  | 'PRESENTE'
  | 'AUSENTE'
  | 'TARDE'
  | 'EXCUSADO';

export interface AttendanceRecord {
  id: string;
  learnerId?: string;
  userId: string; // Ref a /users/{uid}
  learnerName?: string;
  learnerDocument?: string;
  enrollmentId?: string;
  fichaId: string;
  programId?: string;
  courseId: string;
  instructorId?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  arrivalTime?: string; // HH:mm
  minutesLate?: number;
  observation?: string;
  notes?: string;
  recordedBy: string; // Ref a UID del Instructor
  recordedAt?: string; // ISO-8601
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 14. LLAMADOS DE ATENCIÓN (AttentionCall)
// ==========================================
export type AttentionCallType =
  | 'absence'
  | 'late_arrival'
  | 'missing_evidence'
  | 'academic'
  | 'behavioral'
  | 'other'
  | 'INASISTENCIA'
  | 'TARDANZA'
  | 'NO_ENTREGA_EVIDENCIA'
  | 'OTRO';

export type AttentionCallStatus =
  | 'draft'
  | 'issued'
  | 'pending_signature'
  | 'signed'
  | 'reviewed'
  | 'closed'
  | 'PENDIENTE'
  | 'NOTIFICADO'
  | 'EN_REVISION'
  | 'JUSTIFICADO'
  | 'CERRADO';

export interface AttentionCall {
  id: string;
  learnerId?: string;
  userId: string;
  learnerName?: string;
  learnerDocument?: string;
  fichaId: string;
  fichaNumber?: string;
  programId?: string;
  programName?: string;
  courseId?: string;
  courseName?: string;
  type: AttentionCallType;
  reason: string;
  description: string;
  date: string; // YYYY-MM-DD
  createdBy: string; // UID del instructor
  instructorName?: string;
  status: AttentionCallStatus;
  relatedAttendanceId?: string;
  relatedRestrictionId?: string;
  documentUrl?: string; // URL del PDF o documento
  signedDocumentUrl?: string;
  createdAt: string;
  updatedAt: string;

  // Formato oficial SENA de llamado de atención
  centerName?: string; // "Centro Comercio y Servicios"
  regionalName?: string; // "Regional Tolima"
  place?: string; // "2070D"
  dateTimeDetail?: string; // "28/09/2026 17:50"
  time?: string; // "17:50"
  selectedReasons?: string[]; // Novedades múltiples marcadas: uniform, late, absence, evidence, plagiarism, attitudinal, other
  normativeArticle?: string; // "No cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA..."
  improvementPlan?: string; // Texto del plan de mejoramiento estructurado por puntos 1, 2, 3...
  callLevel?: 'PRIMER_LLAMADO' | 'SEGUNDO_LLAMADO' | 'TERCER_LLAMADO';
  apprenticeObservations?: string;
}

// ==========================================
// 15. BLOQUEOS Y RESTRICCIONES (AcademicRestriction)
// ==========================================
export type RestrictionType =
  | 'evidence_submission'
  | 'academic_activity'
  | 'attendance'
  | 'other'
  | 'BLOQUEO_ENTREGA_EVIDENCIA'
  | 'ADVERTENCIA_ACADEMICA'
  | 'REVISION_COMITE'
  | 'CONDICIONAMIENTO_MATRICULA';

export type RestrictionStatus =
  | 'active'
  | 'pending_review'
  | 'resolved'
  | 'ACTIVA'
  | 'EN_REVISION'
  | 'LEVANTADA';

export interface AcademicRestriction {
  id: string;
  learnerId?: string;
  userId: string;
  learnerName?: string;
  learnerDocument?: string;
  fichaId: string;
  fichaNumber?: string;
  programId?: string;
  type: RestrictionType;
  reason: string;
  description?: string;
  relatedAttentionCallId?: string;
  relatedAttendanceId?: string;
  status: RestrictionStatus;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ==========================================
// 16. JUSTIFICACIONES (Justification)
// ==========================================
export type JustificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'requires_correction'
  | 'PENDIENTE'
  | 'ACEPTADA'
  | 'RECHAZADA';

export interface Justification {
  id: string;
  learnerId?: string;
  userId: string;
  learnerName?: string;
  learnerDocument?: string;
  fichaId: string;
  fichaNumber?: string;
  courseId?: string;
  attendanceId?: string;
  attentionCallId?: string;
  date: string; // Fecha de la inasistencia o hecho
  reason: string;
  description: string;
  evidenceUrl?: string;
  driveFileId?: string;
  driveUrl?: string;
  fileName?: string;
  submittedAt: string;
  status: JustificationStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 17. SEGUIMIENTO ACADÉMICO Y COMPORTAMENTAL (LearnerRecord)
// ==========================================
export type LearnerRecordType = 'academic' | 'behavioral';

export type AcademicRecordCategory =
  | 'low_performance'
  | 'missing_evidence'
  | 'learning_difficulty'
  | 'oral_expression'
  | 'written_expression'
  | 'needs_support'
  | 'improvement'
  | 'participation';

export type BehavioralRecordCategory =
  | 'attendance'
  | 'punctuality'
  | 'responsibility'
  | 'teamwork'
  | 'respect'
  | 'participation'
  | 'attitude'
  | 'compliance';

export interface LearnerRecord {
  id: string;
  userId: string;
  fichaId: string;
  type: LearnerRecordType;
  category: AcademicRecordCategory | BehavioralRecordCategory;
  subcategory?: string;
  description: string;
  createdBy: string; // UID del instructor
  date: string; // YYYY-MM-DD
  status: 'active' | 'resolved' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 18. REPORTES (Report Architecture)
// ==========================================
export type ReportType =
  | 'attendance'
  | 'punctuality'
  | 'evidence'
  | 'grades'
  | 'attention_calls'
  | 'comprehensive';

export interface ReportFilter {
  centerId?: string;
  programId?: string;
  fichaId?: string;
  courseId?: string;
  competencyId?: string;
  learningOutcomeId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  type: ReportType;
}

export interface ReportData {
  generatedAt: string;
  filter: ReportFilter;
  title: string;
  institution: string;
  centerName: string;
  programName?: string;
  fichaNumber?: string;
  recordsCount: number;
  data: any[];
}
