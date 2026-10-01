/**
 * @license
 * SENA Learning Hub - Datos Mock Realistas para Interfaz y Experiencia Visual
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
  AppNotification,
  Badge,
} from '../types';

// ==========================================
// 1. USUARIOS DEMO (INSTRUCTOR Y APRENDICES)
// ==========================================

export const DEMO_INSTRUCTOR: InstructorProfile = {
  id: 'inst_carlos_mendoza',
  email: 'cmendoza@sena.edu.co',
  fullName: 'Carlos Mendoza Ramos',
  documentType: 'CC',
  documentNumber: '1053789012',
  phone: '315 889 4521',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'instructor',
  regional: 'Regional Distrito Capital',
  trainingCenterId: 'center_comercio_servicios',
  specialty: 'Bilingüismo - Idioma Inglés',
  assignedFichaIds: ['ficha_1234567', 'ficha_7654321', 'ficha_3349102', 'ficha_2901844', 'ficha_4482910'],
  isActive: true,
  createdAt: '2026-01-15T08:00:00Z',
  updatedAt: '2026-09-24T08:00:00Z',
};

export const DEMO_APPRENTICE: ApprenticeProfile = {
  id: 'appr_juan_perez',
  email: 'jperez@misena.edu.co',
  fullName: 'Juan David Pérez Gómez',
  documentType: 'CC',
  documentNumber: '1098765432',
  phone: '320 445 9812',
  avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
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

export interface ApprenticeListItem {
  id: string;
  fullName: string;
  documentNumber: string;
  email: string;
  fichaCode: string;
  programName: string;
  status: 'en_formacion' | 'condicionado' | 'cancelado' | 'egresado';
  activitiesSubmittedCount: number;
  totalActivitiesCount: number;
  progressPercent: number;
  averageScore: number;
}

export const DEMO_APPRENTICES_LIST: ApprenticeListItem[] = [
  {
    id: 'appr_juan_perez',
    fullName: 'Juan David Pérez Gómez',
    documentNumber: '1098765432',
    email: 'jperez@misena.edu.co',
    fichaCode: '1234567',
    programName: 'Gestión Contable y de Información Financiera',
    status: 'en_formacion',
    activitiesSubmittedCount: 8,
    totalActivitiesCount: 10,
    progressPercent: 82,
    averageScore: 92,
  },
  {
    id: 'appr_maria_gomez',
    fullName: 'María Alejandra Gómez Ruiz',
    documentNumber: '1014238990',
    email: 'magomez@misena.edu.co',
    fichaCode: '1234567',
    programName: 'Gestión Contable y de Información Financiera',
    status: 'en_formacion',
    activitiesSubmittedCount: 10,
    totalActivitiesCount: 10,
    progressPercent: 96,
    averageScore: 97,
  },
  {
    id: 'appr_carlos_duque',
    fullName: 'Carlos Alberto Duque Castro',
    documentNumber: '1032481029',
    email: 'caduque@misena.edu.co',
    fichaCode: '1234567',
    programName: 'Gestión Contable y de Información Financiera',
    status: 'en_formacion',
    activitiesSubmittedCount: 7,
    totalActivitiesCount: 10,
    progressPercent: 70,
    averageScore: 78,
  },
  {
    id: 'appr_laura_morales',
    fullName: 'Laura Sofía Morales Torres',
    documentNumber: '1029384756',
    email: 'lsmorales@misena.edu.co',
    fichaCode: '1234567',
    programName: 'Gestión Contable y de Información Financiera',
    status: 'en_formacion',
    activitiesSubmittedCount: 9,
    totalActivitiesCount: 10,
    progressPercent: 88,
    averageScore: 89,
  },
  {
    id: 'appr_felipe_ospina',
    fullName: 'Felipe Andrés Ospina Restrepo',
    documentNumber: '1074839201',
    email: 'faospina@misena.edu.co',
    fichaCode: '7654321',
    programName: 'Desarrollo de Videojuegos y Entornos Interactivos',
    status: 'en_formacion',
    activitiesSubmittedCount: 6,
    totalActivitiesCount: 8,
    progressPercent: 75,
    averageScore: 84,
  },
  {
    id: 'appr_valeria_herrera',
    fullName: 'Valeria Herrera Quintero',
    documentNumber: '1088493021',
    email: 'vherrera@misena.edu.co',
    fichaCode: '3349102',
    programName: 'Cocina y Gastronomía Colombiana',
    status: 'condicionado',
    activitiesSubmittedCount: 4,
    totalActivitiesCount: 9,
    progressPercent: 44,
    averageScore: 64,
  },
];

// ==========================================
// 2. FICHAS Y PROGRAMAS SENA
// ==========================================

export interface DemoFichaCard {
  id: string;
  codeNumber: string;
  programName: string;
  centerName: string;
  competencyName: string;
  apprenticesCount: number;
  activitiesCount: number;
  pendingSubmissionsCount: number;
  status: 'lectiva' | 'productiva' | 'finalizada';
  startDate: string;
  endDate: string;
}

export const DEMO_FICHAS: DemoFichaCard[] = [
  {
    id: 'ficha_1234567',
    codeNumber: '1234567',
    programName: 'Gestión Contable y de Información Financiera',
    centerName: 'Centro de Comercio y Servicios',
    competencyName: 'Inglés - Bilingüismo Laboral',
    apprenticesCount: 32,
    activitiesCount: 8,
    pendingSubmissionsCount: 6,
    status: 'lectiva',
    startDate: 'Feb 2026',
    endDate: 'Ago 2027',
  },
  {
    id: 'ficha_7654321',
    codeNumber: '7654321',
    programName: 'Desarrollo de Videojuegos y Entornos Interactivos',
    centerName: 'Centro de Electricidad y Teleinformática',
    competencyName: 'Technical English for Software Developers',
    apprenticesCount: 28,
    activitiesCount: 6,
    pendingSubmissionsCount: 4,
    status: 'lectiva',
    startDate: 'Abr 2026',
    endDate: 'Oct 2027',
  },
  {
    id: 'ficha_3349102',
    codeNumber: '3349102',
    programName: 'Cocina y Gastronomía',
    centerName: 'Centro Nacional de Hotelería y Turismo',
    competencyName: 'Culinary English & Kitchen Vocabulary',
    apprenticesCount: 24,
    activitiesCount: 5,
    pendingSubmissionsCount: 3,
    status: 'lectiva',
    startDate: 'Ene 2026',
    endDate: 'Jul 2027',
  },
  {
    id: 'ficha_2901844',
    codeNumber: '2901844',
    programName: 'Gestión Empresarial',
    centerName: 'Centro de Gestión de Mercados',
    competencyName: 'Business English & Negotiations',
    apprenticesCount: 30,
    activitiesCount: 7,
    pendingSubmissionsCount: 2,
    status: 'lectiva',
    startDate: 'Mar 2026',
    endDate: 'Sep 2027',
  },
  {
    id: 'ficha_4482910',
    codeNumber: '4482910',
    programName: 'Mesa y Bar',
    centerName: 'Centro Nacional de Hotelería',
    competencyName: 'Hospitality & Customer Service English',
    apprenticesCount: 22,
    activitiesCount: 4,
    pendingSubmissionsCount: 2,
    status: 'lectiva',
    startDate: 'May 2026',
    endDate: 'Nov 2027',
  },
];

// ==========================================
// 3. CURSOS / COMPETENCIAS
// ==========================================

export interface DemoCourseItem {
  id: string;
  code: string;
  name: string;
  programName: string;
  fichaCode: string;
  instructorName: string;
  progressPercent: number;
  totalActivities: number;
  approvedActivities: number;
  pendingActivities: number;
  tag: string;
  description: string;
}

export const DEMO_COURSES: DemoCourseItem[] = [
  {
    id: 'course_ingles_contable',
    code: '240202501',
    name: 'Inglés Bilingüismo',
    programName: 'Gestión Contable y de Información Financiera',
    fichaCode: '1234567',
    instructorName: 'Carlos Mendoza Ramos',
    progressPercent: 82,
    totalActivities: 8,
    approvedActivities: 6,
    pendingActivities: 2,
    tag: 'Bilingüismo',
    description: 'Interacción en lengua inglesa de forma oral y escrita en contextos laborales y sociales.',
  },
  {
    id: 'course_ingles_tech',
    code: '240202502',
    name: 'Technical English for Devs',
    programName: 'Desarrollo de Videojuegos y Entornos Interactivos',
    fichaCode: '7654321',
    instructorName: 'Carlos Mendoza Ramos',
    progressPercent: 68,
    totalActivities: 6,
    approvedActivities: 4,
    pendingActivities: 2,
    tag: 'Técnico',
    description: 'Documentación de código, sprints en inglés y terminología de motores gráficos (Unity/Unreal).',
  },
  {
    id: 'course_ingles_culinary',
    code: '240202503',
    name: 'Culinary English',
    programName: 'Cocina y Gastronomía',
    fichaCode: '3349102',
    instructorName: 'Carlos Mendoza Ramos',
    progressPercent: 74,
    totalActivities: 5,
    approvedActivities: 4,
    pendingActivities: 1,
    tag: 'Gastronomía',
    description: 'Técnicas de preparación, glosario gastronómico internacional y servicio al comensal.',
  },
  {
    id: 'course_ingles_business',
    code: '240202504',
    name: 'Business English & Negotiations',
    programName: 'Gestión Empresarial',
    fichaCode: '2901844',
    instructorName: 'Carlos Mendoza Ramos',
    progressPercent: 90,
    totalActivities: 7,
    approvedActivities: 6,
    pendingActivities: 1,
    tag: 'Negocios',
    description: 'Presentaciones ejecutivas, correspondencia formal y análisis de balances en inglés.',
  },
];

// ==========================================
// 4. ACTIVIDADES (INGLÉS / TÉCNICAS)
// ==========================================

export interface DemoActivityCard {
  id: string;
  title: string;
  courseName: string;
  programName: string;
  fichaCode: string;
  dueDate: string;
  publishedDate: string;
  submissionsCount: number;
  totalTarget: number;
  status: 'publicada' | 'borrador' | 'cerrada';
  urgency: 'high' | 'medium' | 'completed';
  type: string;
  points: number;
  instructions: string;
  apprenticeSubmissionStatus?: 'submitted' | 'pending' | 'graded';
  apprenticeGrade?: number;
}

export const DEMO_ACTIVITIES: DemoActivityCard[] = [
  {
    id: 'act_present_simple_01',
    title: 'Present Simple - Daily Work Routine',
    courseName: 'Inglés Bilingüismo',
    programName: 'Gestión Contable y de Información Financiera',
    fichaCode: '1234567',
    dueDate: '28 Sep 2026',
    publishedDate: '18 Sep 2026',
    submissionsCount: 25,
    totalTarget: 32,
    status: 'publicada',
    urgency: 'high',
    type: 'Documento / Audio',
    points: 100,
    instructions: 'Describir en inglés al menos 6 actividades habituales de su jornada contable empleando Present Simple y adverbios de frecuencia.',
    apprenticeSubmissionStatus: 'graded',
    apprenticeGrade: 95,
  },
  {
    id: 'act_food_vocab_02',
    title: 'Food Vocabulary & Ordering Dialogues',
    courseName: 'Inglés Bilingüismo',
    programName: 'Gestión Contable y de Información Financiera',
    fichaCode: '1234567',
    dueDate: '30 Sep 2026',
    publishedDate: '20 Sep 2026',
    submissionsCount: 14,
    totalTarget: 32,
    status: 'publicada',
    urgency: 'medium',
    type: 'Grabación de Audio / Speaking',
    points: 100,
    instructions: 'Grabar un audio de 2 minutos simulando una conversación de negocios en un restaurante internacional haciendo pedidos.',
    apprenticeSubmissionStatus: 'pending',
  },
  {
    id: 'act_family_tree_03',
    title: 'Family Tree & Relatives Description',
    courseName: 'Inglés Bilingüismo',
    programName: 'Gestión Contable y de Información Financiera',
    fichaCode: '1234567',
    dueDate: '15 Sep 2026',
    publishedDate: '01 Sep 2026',
    submissionsCount: 30,
    totalTarget: 32,
    status: 'cerrada',
    urgency: 'completed',
    type: 'Infografía / PDF',
    points: 100,
    instructions: 'Presentación visual con árbol genealógico empleando adjetivos posesivos y vocabulario familiar.',
    apprenticeSubmissionStatus: 'graded',
    apprenticeGrade: 90,
  },
  {
    id: 'act_customer_service_04',
    title: 'Workplace & Customer Service English',
    courseName: 'Inglés Bilingüismo',
    programName: 'Gestión Contable y de Información Financiera',
    fichaCode: '1234567',
    dueDate: '05 Oct 2026',
    publishedDate: '22 Sep 2026',
    submissionsCount: 6,
    totalTarget: 32,
    status: 'publicada',
    urgency: 'medium',
    type: 'Quiz Interactivo',
    points: 100,
    instructions: 'Resolver el cuestionario de situaciones laborales con clientes de habla inglesa y resolución de quejas.',
    apprenticeSubmissionStatus: 'pending',
  },
];

// ==========================================
// 5. EVIDENCIAS Y CALIFICACIONES (MOCK)
// ==========================================

export interface DemoSubmissionItem {
  id: string;
  apprenticeName: string;
  apprenticeAvatar?: string;
  activityTitle: string;
  fichaCode: string;
  submittedAt: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  status: 'pending' | 'graded' | 'under_review';
  score?: number;
  feedback?: string;
  drivePath: string;
}

export const DEMO_SUBMISSIONS: DemoSubmissionItem[] = [
  {
    id: 'sub_001',
    apprenticeName: 'Juan David Pérez Gómez',
    activityTitle: 'Present Simple - Daily Work Routine',
    fichaCode: '1234567',
    submittedAt: '24 Sep 2026, 10:15 AM',
    fileName: 'Evidencia_Present_Simple_JuanPerez.pdf',
    fileType: 'PDF',
    fileSize: '1.4 MB',
    status: 'graded',
    score: 95,
    feedback: 'Excellent work! You showed a solid command of third-person singular rules and very accurate accounting vocabulary.',
    drivePath: 'SENA Learning Hub / Gestión Contable / Ficha 1234567 / Present Simple / Juan Pérez',
  },
  {
    id: 'sub_002',
    apprenticeName: 'María Alejandra Gómez Ruiz',
    activityTitle: 'Present Simple - Daily Work Routine',
    fichaCode: '1234567',
    submittedAt: '24 Sep 2026, 09:30 AM',
    fileName: 'Speaking_Video_MariaGomez.mp4',
    fileType: 'MP4',
    fileSize: '14.8 MB',
    status: 'graded',
    score: 98,
    feedback: 'Outstanding pronunciation and fluency! Very natural transitions.',
    drivePath: 'SENA Learning Hub / Gestión Contable / Ficha 1234567 / Present Simple / María Gómez',
  },
  {
    id: 'sub_003',
    apprenticeName: 'Carlos Alberto Duque Castro',
    activityTitle: 'Present Simple - Daily Work Routine',
    fichaCode: '1234567',
    submittedAt: '24 Sep 2026, 08:10 AM',
    fileName: 'Evidencia_CarlosDuque.pdf',
    fileType: 'PDF',
    fileSize: '890 KB',
    status: 'pending',
    drivePath: 'SENA Learning Hub / Gestión Contable / Ficha 1234567 / Present Simple / Carlos Duque',
  },
  {
    id: 'sub_004',
    apprenticeName: 'Laura Sofía Morales Torres',
    activityTitle: 'Food Vocabulary & Ordering Dialogues',
    fichaCode: '1234567',
    submittedAt: '23 Sep 2026, 06:40 PM',
    fileName: 'Audio_Dialogue_LauraMorales.mp3',
    fileType: 'MP3',
    fileSize: '3.2 MB',
    status: 'pending',
    drivePath: 'SENA Learning Hub / Gestión Contable / Ficha 1234567 / Food Vocabulary / Laura Morales',
  },
  {
    id: 'sub_005',
    apprenticeName: 'Felipe Andrés Ospina Restrepo',
    activityTitle: 'Technical English for Devs - Sprint 1',
    fichaCode: '7654321',
    submittedAt: '23 Sep 2026, 02:15 PM',
    fileName: 'Sprint_Standup_FelipeOspina.docx',
    fileType: 'DOCX',
    fileSize: '450 KB',
    status: 'pending',
    drivePath: 'SENA Learning Hub / Videojuegos / Ficha 7654321 / Sprint 1 / Felipe Ospina',
  },
];

// ==========================================
// 6. GAMIFICACIÓN (BILINGÜISMO)
// ==========================================

export interface DemoLeaderboardItem {
  rank: number;
  name: string;
  fichaCode: string;
  avatarUrl: string;
  level: number;
  xp: number;
  streakDays: number;
  badgesCount: number;
  isCurrentUser?: boolean;
}

export const DEMO_LEADERBOARD: DemoLeaderboardItem[] = [
  {
    rank: 1,
    name: 'María Alejandra Gómez Ruiz',
    fichaCode: '1234567',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    level: 9,
    xp: 2890,
    streakDays: 14,
    badgesCount: 8,
  },
  {
    rank: 2,
    name: 'Juan David Pérez Gómez',
    fichaCode: '1234567',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
    level: 8,
    xp: 2450,
    streakDays: 7,
    badgesCount: 6,
    isCurrentUser: true,
  },
  {
    rank: 3,
    name: 'Carlos Alberto Duque Castro',
    fichaCode: '1234567',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    level: 7,
    xp: 2180,
    streakDays: 5,
    badgesCount: 5,
  },
  {
    rank: 4,
    name: 'Laura Sofía Morales Torres',
    fichaCode: '1234567',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80',
    level: 7,
    xp: 2040,
    streakDays: 4,
    badgesCount: 4,
  },
  {
    rank: 5,
    name: 'Andrés Felipe Gómez',
    fichaCode: '1234567',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    level: 6,
    xp: 1820,
    streakDays: 3,
    badgesCount: 3,
  },
];

export interface DemoBadgeItem {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: 'english' | 'punctuality' | 'mastery';
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export const DEMO_BADGES: DemoBadgeItem[] = [
  {
    id: 'badge_1',
    code: 'ENGLISH_EXPLORER',
    title: 'English Explorer',
    description: 'Completaste tu primera evidencia de bilingüismo con nota Aprobado.',
    icon: 'Compass',
    category: 'english',
    xpReward: 150,
    isUnlocked: true,
    unlockedAt: '12 Sep 2026',
  },
  {
    id: 'badge_2',
    code: 'PERFECT_PUNCTUALITY',
    title: 'Puntualidad SENA',
    description: 'Entregaste 5 evidencias seguidas antes de la fecha límite.',
    icon: 'Clock',
    category: 'punctuality',
    xpReward: 250,
    isUnlocked: true,
    unlockedAt: '19 Sep 2026',
  },
  {
    id: 'badge_3',
    code: 'SPEAKING_CHAMPION',
    title: 'Speaking Champion',
    description: 'Grabación de audio en inglés con calificación de 95% o superior.',
    icon: 'Mic',
    category: 'mastery',
    xpReward: 300,
    isUnlocked: true,
    unlockedAt: '23 Sep 2026',
  },
  {
    id: 'badge_4',
    code: 'STREAK_FIRE_7',
    title: 'Racha de 7 Días',
    description: 'Ingresaste y practicaste en la plataforma durante 7 días continuos.',
    icon: 'Flame',
    category: 'punctuality',
    xpReward: 200,
    isUnlocked: true,
    unlockedAt: '24 Sep 2026',
  },
  {
    id: 'badge_5',
    code: 'VOCABULARY_MASTER',
    title: 'Vocabulary Master',
    description: 'Aprobaste 3 cuestionarios técnicos de vocabulario contable en inglés.',
    icon: 'BookOpen',
    category: 'mastery',
    xpReward: 400,
    isUnlocked: false,
  },
  {
    id: 'badge_6',
    code: 'COMMUNITY_COLLABORATOR',
    title: 'Monitor Bilingüe',
    description: 'Participaste en el foro ayudando a compañeros con pronunciación.',
    icon: 'Users',
    category: 'english',
    xpReward: 500,
    isUnlocked: false,
  },
];

// ==========================================
// 7. NOTIFICACIONES MOCK
// ==========================================

export interface DemoNotification {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  isRead: boolean;
  type: 'grade' | 'activity' | 'feedback' | 'reminder' | 'announcement';
}

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: 'notif_1',
    title: 'Tu actividad Present Simple fue calificada',
    description: 'El instructor Carlos Mendoza asignó 95/100 (Aprobada) con retroalimentación.',
    timeAgo: 'Hace 15 minutos',
    isRead: false,
    type: 'grade',
  },
  {
    id: 'notif_2',
    title: 'Nueva actividad publicada: Food Vocabulary',
    description: 'Fecha límite de entrega: 30 de septiembre a las 23:59.',
    timeAgo: 'Hace 2 horas',
    isRead: false,
    type: 'activity',
  },
  {
    id: 'notif_3',
    title: 'Recordatorio de entrega de evidencia',
    description: 'La actividad Workplace English vence en 48 horas.',
    timeAgo: 'Hace 1 día',
    isRead: true,
    type: 'reminder',
  },
  {
    id: 'notif_4',
    title: '¡Desbloqueaste el logro Racha de 7 Días! 🔥',
    description: 'Ganaste +200 XP por tu constancia en la formación de inglés.',
    timeAgo: 'Hace 2 días',
    isRead: true,
    type: 'feedback',
  },
];

// ==========================================
// 8. ACTIVIDAD RECIENTE DEL INSTRUCTOR
// ==========================================

export interface RecentActivityFeedItem {
  id: string;
  apprenticeName: string;
  action: string;
  detail: string;
  timeAgo: string;
  type: 'submission' | 'graded' | 'published';
}

export const DEMO_RECENT_FEED: RecentActivityFeedItem[] = [
  {
    id: 'feed_1',
    apprenticeName: 'Juan David Pérez',
    action: 'entregó una evidencia',
    detail: 'Present Simple - Daily Work Routine',
    timeAgo: 'hace 10 minutos',
    type: 'submission',
  },
  {
    id: 'feed_2',
    apprenticeName: 'María Alejandra Gómez',
    action: 'entregó una evidencia',
    detail: 'Present Simple - Daily Work Routine',
    timeAgo: 'hace 25 minutos',
    type: 'submission',
  },
  {
    id: 'feed_3',
    apprenticeName: 'Instructor Carlos Mendoza',
    action: 'publicó una nueva actividad',
    detail: 'Food Vocabulary & Ordering Dialogues',
    timeAgo: 'hace 1 hora',
    type: 'published',
  },
  {
    id: 'feed_4',
    apprenticeName: 'Carlos Alberto Duque',
    action: 'entregó una evidencia',
    detail: 'Present Simple - Daily Work Routine',
    timeAgo: 'hace 2 horas',
    type: 'submission',
  },
];

// ==========================================
// 9. ANUNCIOS DE FICHAS
// ==========================================

export interface DemoAnnouncement {
  id: string;
  fichaCode: string;
  instructorName: string;
  title: string;
  content: string;
  date: string;
  commentsCount: number;
}

export const DEMO_ANNOUNCEMENTS: DemoAnnouncement[] = [
  {
    id: 'ann_1',
    fichaCode: '1234567',
    instructorName: 'Carlos Mendoza Ramos',
    title: 'Sesión sincrónica de refuerzo en Speaking - Miércoles 10:00 AM',
    content: 'Estimados aprendices, este miércoles tendremos una sesión práctica enfocada en pronunciación del Present Simple y simulación de entrevistas de trabajo en inglés. Por favor tener micrófono listo.',
    date: '23 Sep 2026',
    commentsCount: 8,
  },
  {
    id: 'ann_2',
    fichaCode: '1234567',
    instructorName: 'Carlos Mendoza Ramos',
    title: 'Guía complementaria de vocabulario financiero y contable en inglés',
    content: 'Se encuentra disponible en la carpeta de recursos el glosario de términos contables (Assets, Liabilities, Equity, Balance Sheet). Les servirá como apoyo para la evidencia de la próxima semana.',
    date: '20 Sep 2026',
    commentsCount: 3,
  },
];
