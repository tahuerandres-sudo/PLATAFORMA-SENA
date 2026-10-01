/**
 * @license
 * SENA Learning Hub - Datos Iniciales Semilla del Dominio Académico
 * Cumple con el ejemplo exacto especificado en el Prompt 0
 */

import {
  TrainingCenter,
  TrainingProgram,
  GroupFicha,
  CourseCompetency,
  Activity,
  Submission,
  Grade,
  Feedback,
  InstructorProfile,
  ApprenticeProfile,
} from '../types';

export const MOCK_INSTRUCTOR: InstructorProfile = {
  id: 'inst_carlos_mendoza',
  email: 'cmendoza@sena.edu.co',
  fullName: 'Carlos Mendoza Ramos',
  documentType: 'CC',
  documentNumber: '1053789012',
  role: 'instructor',
  regional: 'Regional Distrito Capital',
  trainingCenterId: 'center_comercio_servicios',
  specialty: 'Bilingüismo - Idioma Inglés',
  assignedFichaIds: ['ficha_1234567', 'ficha_7654321'],
  isActive: true,
  createdAt: '2026-01-15T08:00:00Z',
  updatedAt: '2026-09-24T08:00:00Z',
};

export const MOCK_APPRENTICE: ApprenticeProfile = {
  id: 'appr_juan_perez',
  email: 'jperez@misena.edu.co',
  fullName: 'Juan David Pérez Gómez',
  documentType: 'CC',
  documentNumber: '1098765432',
  role: 'apprentice',
  trainingCenterId: 'center_comercio_servicios',
  programId: 'prog_gestion_contable',
  fichaId: 'ficha_1234567',
  academicStatus: 'en_formacion',
  gamificationId: 'gam_juan_perez',
  isActive: true,
  createdAt: '2026-02-01T08:00:00Z',
  updatedAt: '2026-09-24T08:00:00Z',
};

export const MOCK_CENTER: TrainingCenter = {
  id: 'center_comercio_servicios',
  code: '9218',
  name: 'Centro de Comercio y Servicios',
  regional: 'Regional Distrito Capital',
};

export const MOCK_PROGRAM: TrainingProgram = {
  id: 'prog_gestion_contable',
  code: '123112',
  name: 'Gestión Contable y de Información Financiera',
  level: 'tecnologo',
  centerId: 'center_comercio_servicios',
};

export const MOCK_FICHA: GroupFicha = {
  id: 'ficha_1234567',
  codeNumber: '1234567',
  programId: 'prog_gestion_contable',
  programName: 'Gestión Contable y de Información Financiera',
  centerId: 'center_comercio_servicios',
  startDate: '2026-02-01T00:00:00Z',
  endDate: '2027-08-31T00:00:00Z',
  leadInstructorId: 'inst_vocero_01',
  assignedInstructorIds: ['inst_carlos_mendoza'],
  totalApprenticesCount: 32,
  status: 'lectiva',
};

export const MOCK_COURSE: CourseCompetency = {
  id: 'course_ingles_1234567',
  fichaId: 'ficha_1234567',
  code: '240202501',
  name: 'Inglés - Bilingüismo',
  learningOutcomes: [
    'RAP 01: Comprender vocabulario técnico y cotidiano en contextos laborales.',
    'RAP 02: Producir textos breves y estructurados en presente simple y continuo.',
  ],
  instructorId: 'inst_carlos_mendoza',
  academicPeriod: '2026-II',
  status: 'active',
};

export const MOCK_ACTIVITY: Activity = {
  id: 'act_present_simple_01',
  courseId: 'course_ingles_1234567',
  fichaId: 'ficha_1234567',
  instructorId: 'inst_carlos_mendoza',
  title: 'Present Simple - Actividad 01',
  description: 'Descripción de la rutina diaria laboral en una empresa contable utilizando Present Simple y adverbios de frecuencia.',
  instructions: 'Elaborar un documento o audio en inglés donde describa al menos 6 actividades habituales de su jornada en el área de contabilidad. Incluir verbos en tercera persona singular (he/she).',
  objective: 'Aplicar las reglas gramaticales del presente simple en descripciones laborales contextualizadas.',
  learningOutcomeCode: 'RAP 02',
  type: 'document',
  allowedFileExtensions: ['pdf', 'docx', 'mp3'],
  maxFileSizeMb: 25,
  publishedAt: '2026-09-18T10:00:00Z',
  dueDate: '2026-09-28T23:59:59Z',
  allowLateSubmissions: true,
  maxScore: 100,
  passingScore: 70,
  rubricCriteria: [
    { id: 'crit_1', description: 'Uso correcto de la estructura afirmativa y negativa en presente simple', weightPercentage: 40 },
    { id: 'crit_2', description: 'Vocabulario contable y de oficina en inglés pertinente', weightPercentage: 30 },
    { id: 'crit_3', description: 'Ortografía, puntuación y coherencia sintáctica', weightPercentage: 30 },
  ],
  attachments: [
    {
      id: 'att_grammar_guide',
      name: 'Present_Simple_Reference_Guide.pdf',
      fileUrl: 'https://storage.googleapis.com/sena-learning-hub/guides/guide_01.pdf',
      fileType: 'application/pdf',
      sizeBytes: 420000,
    },
  ],
  externalLinks: [
    { title: 'BBC Learning English - Present Simple', url: 'https://www.bbc.co.uk/learningenglish' },
  ],
  status: 'published',
  createdAt: '2026-09-18T10:00:00Z',
  updatedAt: '2026-09-18T10:00:00Z',
};

export const MOCK_SUBMISSION: Submission = {
  id: 'sub_juan_perez_01',
  activityId: 'act_present_simple_01',
  fichaId: 'ficha_1234567',
  apprenticeId: 'appr_juan_perez',
  apprenticeName: 'Juan David Pérez Gómez',
  apprenticeEmail: 'jperez@misena.edu.co',
  attemptNumber: 1,
  submittedAt: '2026-09-22T16:45:00Z',
  status: 'graded',
  notesFromApprentice: 'Instructor Carlos, adjunto mi evidencia con las rutinas del departamento financiero.',
  driveRef: {
    driveFileId: 'drive_doc_99182374',
    driveFolderId: 'drive_fld_juan_perez',
    webViewLink: 'https://drive.google.com/file/d/drive_doc_99182374/view',
    structuredPath: 'SENA Learning Hub / Gestión Contable / Ficha 1234567 / Present Simple / Juan Pérez',
    mimeType: 'application/pdf',
    sizeBytes: 1542000,
    originalFileName: 'Evidencia_Present_Simple_JuanPerez.pdf',
  },
  gradeId: 'grd_juan_perez_01',
  createdAt: '2026-09-22T16:45:00Z',
  updatedAt: '2026-09-23T11:20:00Z',
};

export const MOCK_GRADE: Grade = {
  id: 'grd_juan_perez_01',
  submissionId: 'sub_juan_perez_01',
  activityId: 'act_present_simple_01',
  apprenticeId: 'appr_juan_perez',
  instructorId: 'inst_carlos_mendoza',
  score: 95,
  isApproved: true,
  officialSenaStatus: 'Aprobado',
  rubricScores: [
    { criteriaId: 'crit_1', scoreObtained: 38 },
    { criteriaId: 'crit_2', scoreObtained: 29 },
    { criteriaId: 'crit_3', scoreObtained: 28 },
  ],
  gradedAt: '2026-09-23T11:20:00Z',
  updatedAt: '2026-09-23T11:20:00Z',
};

export const MOCK_FEEDBACK: Feedback = {
  id: 'fb_juan_perez_01',
  gradeId: 'grd_juan_perez_01',
  submissionId: 'sub_juan_perez_01',
  instructorId: 'inst_carlos_mendoza',
  comments: 'Excellent work! You showed a solid command of third-person singular rules and very accurate accounting vocabulary. Keep practicing frequency adverbs in negative sentences.',
  strengths: [
    'Precisión gramatical en verbos regulares e irregulares de tercera persona',
    'Excelente contextualización en el rol de asistente contable',
    'Presentación limpia y entrega puntual',
  ],
  areasForImprovement: [
    'Recordar colocar el adverbio de frecuencia antes del verbo principal (e.g. "He always reconciles the accounts")',
  ],
  createdAt: '2026-09-23T11:20:00Z',
};
