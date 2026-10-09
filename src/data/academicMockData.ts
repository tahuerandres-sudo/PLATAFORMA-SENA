/**
 * @license
 * SENA Learning Hub - Datos Mock Realistas de Estructura Académica (Prompt 3)
 *
 * Jerarquía Institucional:
 * Centro de Formación (CCS)
 *  └── Programas de Formación (Gestión Contable, Mesa y Bar, Cocina, etc.)
 *       └── Fichas (Ficha 3409626, etc.)
 *            └── Cursos (Inglés – Bilingüismo Laboral, etc.)
 *                 └── Competencias (Interactuar en lengua inglesa...)
 *                      └── Resultados de Aprendizaje (RAP 1, RAP 2, RAP 3...)
 *                           └── Actividades / Evidencias (Canva, YouTube, PDF, Image)
 *                                └── Entregas (Submissions)
 *                                     └── Calificaciones (A / N / C)
 *
 * Flujo de Acompañamiento Preparado:
 * Asistencia, Llamados de atención, Justificaciones, Restricciones y Seguimiento.
 */

import {
  TrainingCenter,
  TrainingProgram,
  Ficha,
  Course,
  FichaCourse,
  Competency,
  LearningOutcome,
  Enrollment,
  EvidenceActivity,
  AcademicSubmission,
  AttendanceRecord,
  AttentionCall,
  AcademicRestriction,
  Justification,
  LearnerRecord,
} from '../types/academic';

// ==========================================
// 1. CENTRO DE FORMACIÓN
// ==========================================
export const DEMO_TRAINING_CENTER: TrainingCenter = {
  id: 'center_comercio_servicios',
  name: 'Centro de Comercio y Servicios',
  code: 'CCS',
  city: 'Ibagué',
  department: 'Tolima',
  regional: 'Regional Tolima',
  address: 'Carrera 4 # 42-12, Sector Ferrocarril',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const DEMO_CENTERS: TrainingCenter[] = [DEMO_TRAINING_CENTER];

// ==========================================
// 2. PROGRAMAS DE FORMACIÓN
// ==========================================
export const DEMO_PROGRAMS: TrainingProgram[] = [
  {
    id: 'prog_gestion_contable',
    name: 'Gestión Contable y de Información Financiera',
    code: '228106',
    level: 'tecnologo',
    centerId: 'center_comercio_servicios',
    status: 'active',
    description:
      'Programa enfocado en la estructuración de información financiera, registro de operaciones bajo normas contables vigentes y soporte en auditoría.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prog_gestion_empresarial',
    name: 'Gestión Empresarial',
    code: '621201',
    level: 'tecnologo',
    centerId: 'center_comercio_servicios',
    status: 'active',
    description:
      'Formación en administración estratégica, gestión de talento humano y optimización de procesos en mipymes.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prog_mesa_bar',
    name: 'Mesa y Bar',
    code: '634122',
    level: 'tecnico',
    centerId: 'center_comercio_servicios',
    status: 'active',
    description:
      'Servicio especializado en salón de alimentos y bebidas, coctelería internacional y atención protocolaria al cliente.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prog_cocina',
    name: 'Cocina',
    code: '635503',
    level: 'tecnico',
    centerId: 'center_comercio_servicios',
    status: 'active',
    description:
      'Técnicas culinarias colombianas e internacionales, manipulación higiénica de alimentos y costeo gastronómico.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prog_cosmetologia',
    name: 'Cosmetología y Estética Integral',
    code: '526201',
    level: 'tecnico',
    centerId: 'center_comercio_servicios',
    status: 'active',
    description:
      'Cuidado facial y corporal, aparatología estética y bioseguridad en centros de bienestar.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prog_turismo',
    name: 'Operación Turística Local',
    code: '634125',
    level: 'tecnico',
    centerId: 'center_comercio_servicios',
    status: 'active',
    description:
      'Diseño y guianza de rutas ecoturísticas, patrimonio cultural y comercialización de servicios turísticos.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prog_videojuegos',
    name: 'Desarrollo de Videojuegos y Entornos Interactivos',
    code: '228109',
    level: 'tecnologo',
    centerId: 'center_comercio_servicios',
    status: 'active',
    description:
      'Programación con motores gráficos, modelado 3D, animación y narrativas interactivas.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// ==========================================
// 3. FICHAS DE FORMACIÓN
// ==========================================
export const DEMO_FICHAS: Ficha[] = [
  {
    id: 'ficha_3409626',
    number: '3409626',
    programId: 'prog_gestion_contable',
    centerId: 'center_comercio_servicios',
    instructorIds: ['inst_carlos_mendoza'],
    startDate: '2026-02-15T00:00:00Z',
    endDate: '2027-11-30T00:00:00Z',
    status: 'active',
    shift: 'evening', // Jornada Nocturna
    stage: 'lectiva', // Etapa Lectiva
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-09-24T00:00:00Z',
  },
  {
    id: 'ficha_2698745',
    number: '2698745',
    programId: 'prog_gestion_empresarial',
    centerId: 'center_comercio_servicios',
    instructorIds: ['inst_carlos_mendoza'],
    startDate: '2026-01-20T00:00:00Z',
    endDate: '2027-10-15T00:00:00Z',
    status: 'active',
    shift: 'morning', // Jornada Mañana
    stage: 'lectiva',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-24T00:00:00Z',
  },
  {
    id: 'ficha_3349102',
    number: '3349102',
    programId: 'prog_cocina',
    centerId: 'center_comercio_servicios',
    instructorIds: ['inst_carlos_mendoza'],
    startDate: '2025-08-10T00:00:00Z',
    endDate: '2027-04-15T00:00:00Z',
    status: 'active',
    shift: 'afternoon', // Jornada Tarde
    stage: 'productive', // Etapa Productiva
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2026-09-24T00:00:00Z',
  },
  {
    id: 'ficha_2901844',
    number: '2901844',
    programId: 'prog_videojuegos',
    centerId: 'center_comercio_servicios',
    instructorIds: ['inst_carlos_mendoza'],
    startDate: '2026-03-01T00:00:00Z',
    endDate: '2028-02-28T00:00:00Z',
    status: 'active',
    shift: 'morning',
    stage: 'lectiva',
    createdAt: '2026-02-20T00:00:00Z',
    updatedAt: '2026-09-24T00:00:00Z',
  },
];

// ==========================================
// 4. CURSOS
// ==========================================
export const DEMO_COURSES: Course[] = [
  {
    id: 'course_ingles_laboral',
    name: 'Inglés – Bilingüismo Laboral',
    code: '240202501-ING',
    description:
      'Formación transversal en competencias comunicativas en idioma inglés aplicadas a entornos profesionales según el MCER (Marco Común Europeo de Referencia).',
    type: 'bilingualism',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'course_contabilidad_basica',
    name: 'Contabilidad y Normas NIIF',
    code: '210301019-CON',
    description:
      'Reconocimiento, medición y presentación de hechos económicos y operaciones contables.',
    type: 'technical',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'course_etica_paz',
    name: 'Ética y Cultura de Paz',
    code: '240201526-ETI',
    description:
      'Desarrollo de habilidades socioemocionales, resolución pacífica de conflictos y ciudadanía activa.',
    type: 'transversal',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// ==========================================
// 5. ASIGNACIÓN FICHA + CURSO (FichaCourse)
// ==========================================
export const DEMO_FICHA_COURSES: FichaCourse[] = [
  {
    id: 'fc_3409626_ingles',
    fichaId: 'ficha_3409626',
    courseId: 'course_ingles_laboral',
    instructorIds: ['inst_carlos_mendoza'],
    startDate: '2026-02-15T00:00:00Z',
    endDate: '2027-06-30T00:00:00Z',
    status: 'active',
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
  },
  {
    id: 'fc_3409626_contabilidad',
    fichaId: 'ficha_3409626',
    courseId: 'course_contabilidad_basica',
    instructorIds: ['inst_carlos_mendoza'],
    startDate: '2026-02-15T00:00:00Z',
    endDate: '2027-11-30T00:00:00Z',
    status: 'active',
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
  },
  {
    id: 'fc_2698745_ingles',
    fichaId: 'ficha_2698745',
    courseId: 'course_ingles_laboral',
    instructorIds: ['inst_carlos_mendoza'],
    startDate: '2026-01-20T00:00:00Z',
    endDate: '2026-12-15T00:00:00Z',
    status: 'active',
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z',
  },
];

// ==========================================
// 6. COMPETENCIAS
// ==========================================
export const DEMO_COMPETENCIES: Competency[] = [
  {
    id: 'comp_ingles_01',
    name: 'Comprender textos en inglés en forma escrita y auditiva',
    code: '240201501',
    description:
      'Comprender textos en inglés en forma escrita y auditiva según las necesidades del contexto personal y técnico.',
    type: 'transversal',
    status: 'active',
    courseId: 'course_ingles_laboral',
    fichaId: 'ficha_3409626',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'comp_ingles_laboral',
    name: 'Interactuar en lengua inglesa de forma oral y escrita',
    code: '240202501',
    description:
      'Interactuar en lengua inglesa de forma oral y escrita dentro de contextos sociales y laborales según los criterios establecidos por el Marco Común Europeo de Referencia para las Lenguas.',
    type: 'transversal',
    status: 'active',
    courseId: 'course_ingles_laboral',
    fichaId: 'ficha_3409626',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'comp_ingles_03',
    name: 'Producir textos en inglés en forma escrita y oral',
    code: '240201502',
    description:
      'Producir textos en inglés en forma escrita y oral según los requerimientos del contexto laboral y social.',
    type: 'transversal',
    status: 'active',
    courseId: 'course_ingles_laboral',
    fichaId: 'ficha_3409626',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'comp_ingles_04',
    name: 'Interactuar en contextos laborales y productivos en inglés',
    code: '240202502',
    description:
      'Interactuar en lengua inglesa en contextos laborales y productivos según los criterios de fluidez y precisión del Marco Común Europeo de Referencia para las Lenguas.',
    type: 'transversal',
    status: 'active',
    courseId: 'course_ingles_laboral',
    fichaId: 'ficha_3409626',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'comp_contabilidad_hechos',
    name: 'Competencia técnica contable',
    code: '210301019',
    description:
      'Reconocer recursos financieros y contabilizar operaciones de acuerdo con metodología institucional y normativa NIIF.',
    type: 'technical',
    status: 'active',
    courseId: 'course_contabilidad_basica',
    fichaId: 'ficha_3409626',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// ==========================================
// 7. RESULTADOS DE APRENDIZAJE (RAPs)
// Organizados en las 4 Categorías Principales de Inglés SENA
// ==========================================
export const DEMO_LEARNING_OUTCOMES: LearningOutcome[] = [
  // CATEGORÍA 1. Comprender textos en inglés en forma escrita y auditiva (240201501)
  {
    id: 'rap_ingles_cat1_01',
    competencyId: 'comp_ingles_01',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201501-01',
    description:
      'Realizar intercambios sociales y prácticos muy breves, con un vocabulario suficiente para hacer una exposición o mantener una conversación sencilla sobre temas técnicos.',
    sequence: 1,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat1_02',
    competencyId: 'comp_ingles_01',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201501-02',
    description:
      'Comunicarse en tareas sencillas y habituales que requieren un intercambio simple y directo de información cotidiana y técnica.',
    sequence: 2,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat1_03',
    competencyId: 'comp_ingles_01',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201501-03',
    description:
      'Comprender frases y vocabulario habitual sobre temas de interés personal y temas técnicos.',
    sequence: 3,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat1_04',
    competencyId: 'comp_ingles_01',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201501-04',
    description:
      'Leer textos muy breves y sencillos en inglés general y técnico.',
    sequence: 4,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat1_05',
    competencyId: 'comp_ingles_01',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201501-05',
    description:
      'Encontrar vocabulario y expresiones de inglés técnico en anuncios, folletos, páginas web, etc.',
    sequence: 5,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat1_06',
    competencyId: 'comp_ingles_01',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201501-06',
    description:
      'Encontrar información específica y predecible en escritos sencillos y cotidianos.',
    sequence: 6,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat1_07',
    competencyId: 'comp_ingles_01',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201501-07',
    description:
      'Comprender la idea principal en avisos y mensajes breves, claros y sencillos en inglés técnico.',
    sequence: 7,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },

  // CATEGORÍA 2. Interactuar en lengua inglesa de forma oral y escrita (240202501)
  {
    id: 'rap_ingles_01',
    competencyId: 'comp_ingles_laboral',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240202501-01',
    description:
      'Comprender información sobre situaciones cotidianas y laborales actuales y futuras a través de interacciones sociales de forma oral y escrita.',
    sequence: 1,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_02',
    competencyId: 'comp_ingles_laboral',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240202501-02',
    description:
      'Intercambiar opiniones sobre situaciones cotidianas y laborales actuales, pasadas y futuras en contextos sociales orales y escritos.',
    sequence: 2,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_03',
    competencyId: 'comp_ingles_laboral',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240202501-03',
    description:
      'Discutir sobre posibles soluciones a problemas dentro de un rango de situaciones sociales y laborales.',
    sequence: 3,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat2_04',
    competencyId: 'comp_ingles_laboral',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240202501-04',
    description:
      'Implementar acciones de mejora relacionadas con el uso de expresiones, estructuras y desempeño según el programa de formación.',
    sequence: 4,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },

  // CATEGORÍA 3. Producir textos en inglés en forma escrita y oral (240201502)
  {
    id: 'rap_ingles_cat3_01',
    competencyId: 'comp_ingles_03',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201502-01',
    description:
      'Redactar textos breves y estructurados sobre temas de interés personal, profesional y técnico en inglés.',
    sequence: 1,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat3_02',
    competencyId: 'comp_ingles_03',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201502-02',
    description:
      'Describir procesos, entornos laborales y requerimientos del puesto de trabajo en lengua inglesa.',
    sequence: 2,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat3_03',
    competencyId: 'comp_ingles_03',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201502-03',
    description:
      'Elaborar resúmenes, informes sencillos y notas técnicas a partir de lecturas y audios especializados.',
    sequence: 3,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat3_04',
    competencyId: 'comp_ingles_03',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240201502-04',
    description:
      'Presentar oralmente informes o proyectos breves utilizando vocabulario técnico y estructuras acordes al nivel.',
    sequence: 4,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },

  // CATEGORÍA 4. Interactuar en contextos laborales y productivos en inglés (240202502)
  {
    id: 'rap_ingles_cat4_01',
    competencyId: 'comp_ingles_04',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240202502-01',
    description:
      'Participar en conversaciones y reuniones de trabajo en lengua inglesa con fluidez y naturalidad adecuada.',
    sequence: 1,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat4_02',
    competencyId: 'comp_ingles_04',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240202502-02',
    description:
      'Comprender instrucciones y documentación técnica especializada de su ocupación o disciplina profesional.',
    sequence: 2,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat4_03',
    competencyId: 'comp_ingles_04',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240202502-03',
    description:
      'Argumentar y justificar puntos de vista en debates o negociaciones laborales en inglés.',
    sequence: 3,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rap_ingles_cat4_04',
    competencyId: 'comp_ingles_04',
    courseId: 'course_ingles_laboral',
    code: 'RAP-240202502-04',
    description:
      'Diseñar propuestas y proyectos técnicos en lengua inglesa respondiendo a necesidades del sector productivo.',
    sequence: 4,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// ==========================================
// 8. ACTIVIDADES / EVIDENCIAS
// ==========================================
export const DEMO_ACTIVITIES: EvidenceActivity[] = [
  {
    id: 'act_family_tree',
    title: 'Family Tree Presentation',
    description:
      'Presentación digital del árbol genealógico familiar y profesional utilizando enlaces de Canva.',
    courseId: 'course_ingles_laboral',
    fichaId: 'ficha_3409626',
    competencyId: 'comp_ingles_laboral',
    learningOutcomeId: 'rap_ingles_01',
    createdBy: 'inst_carlos_mendoza',
    status: 'published',
    publishedAt: '2026-09-01T08:00:00Z',
    dueDate: '2026-10-15T23:59:00Z',
    points: 100,
    instructions:
      'Diseña en Canva tu árbol familiar y describe al menos 6 integrantes con profesiones, parentescos y adjetivos en inglés. Entrega el enlace público de previsualización.',
    submissionType: 'canva_link',
    requiresUrl: true,
    requiresFile: false,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'act_oral_interview',
    title: 'Oral Job Interview Video',
    description:
      'Simulación de entrevista de trabajo en inglés con video publicado en YouTube.',
    courseId: 'course_ingles_laboral',
    fichaId: 'ficha_3409626',
    competencyId: 'comp_ingles_laboral',
    learningOutcomeId: 'rap_ingles_02',
    createdBy: 'inst_carlos_mendoza',
    status: 'published',
    publishedAt: '2026-09-10T08:00:00Z',
    dueDate: '2026-10-25T23:59:00Z',
    points: 100,
    instructions:
      'Graba un video en YouTube (Modo Oculto o Público) de 3 a 5 minutos respondiendo a las 5 preguntas laborales solicitadas en la guía.',
    submissionType: 'youtube_link',
    requiresUrl: true,
    requiresFile: false,
    createdAt: '2026-09-10T08:00:00Z',
    updatedAt: '2026-09-10T08:00:00Z',
  },
  {
    id: 'act_technical_glossary',
    title: 'Technical Accounting Glossary',
    description:
      'Documento en formato PDF con glosario bilingüe de términos contables y financieros.',
    courseId: 'course_ingles_laboral',
    fichaId: 'ficha_3409626',
    competencyId: 'comp_ingles_laboral',
    learningOutcomeId: 'rap_ingles_01',
    createdBy: 'inst_carlos_mendoza',
    status: 'published',
    publishedAt: '2026-09-15T08:00:00Z',
    dueDate: '2026-11-05T23:59:00Z',
    points: 100,
    instructions:
      'Construye un glosario con mínimo 50 términos contables en inglés con su pronunciación fonética aproximada y ejemplo de uso en una oración.',
    submissionType: 'pdf',
    allowedExtensions: ['.pdf'],
    allowedMimeTypes: ['application/pdf'],
    maxFileSize: 25,
    requiresUrl: false,
    requiresFile: true,
    createdAt: '2026-09-15T08:00:00Z',
    updatedAt: '2026-09-15T08:00:00Z',
  },
  {
    id: 'act_org_chart',
    title: 'Company Organizational Chart',
    description:
      'Evidencia gráfica en imagen con el organigrama empresarial rotulado en idioma inglés.',
    courseId: 'course_ingles_laboral',
    fichaId: 'ficha_3409626',
    competencyId: 'comp_ingles_laboral',
    learningOutcomeId: 'rap_ingles_03',
    createdBy: 'inst_carlos_mendoza',
    status: 'published',
    publishedAt: '2026-09-20T08:00:00Z',
    dueDate: '2026-11-20T23:59:00Z',
    points: 100,
    instructions:
      'Exporta y adjunta una imagen (PNG o JPG) de alta calidad con el organigrama departamental y roles corporativos.',
    submissionType: 'image',
    allowedExtensions: ['.png', '.jpg', '.jpeg'],
    allowedMimeTypes: ['image/png', 'image/jpeg'],
    maxFileSize: 10,
    requiresUrl: false,
    requiresFile: true,
    createdAt: '2026-09-20T08:00:00Z',
    updatedAt: '2026-09-20T08:00:00Z',
  },
];

// ==========================================
// 9. APRENDICES MATRICULADOS Y MATRÍCULAS (Enrollments)
// ==========================================
export interface ApprenticeWithEnrollment {
  uid: string;
  displayName: string;
  documentNumber: string;
  email: string;
  photoURL: string;
  status: 'active' | 'inactive' | 'pending' | 'blocked';
  enrollmentId: string;
  enrollmentStatus: 'active' | 'inactive' | 'completed' | 'withdrawn' | 'suspended';
  programName: string;
  fichaNumber: string;
  courseName: string;
  progressPercent: number;
  averageGrade: string; // 'A' | 'N' | 'C'

  // Métricas preparadas para futuros prompts
  attendanceRate: number; // Ej: 94%
  punctualityRate: number; // Ej: 98%
  submittedEvidencesCount: number;
  totalEvidencesCount: number;
  activeAttentionCallsCount: number;
  hasActiveRestrictions: boolean;
  academicNotesCount: number;
  behavioralNotesCount: number;
}

export const DEMO_FICHA_3409626_APPRENTICES: ApprenticeWithEnrollment[] = [
  {
    uid: 'appr_juan_sebastian_fernandez',
    displayName: 'JUAN SEBASTIAN FERNANDEZ PRADA',
    documentNumber: '1030281506',
    email: 'jfernandez@misena.edu.co',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    enrollmentId: 'enr_000_juan_sebastian',
    enrollmentStatus: 'active',
    programName: 'Gestión Contable y de Información Financiera',
    fichaNumber: '3405298',
    courseName: 'Inglés – Bilingüismo Laboral',
    progressPercent: 88,
    averageGrade: 'A',
    attendanceRate: 94,
    punctualityRate: 90,
    submittedEvidencesCount: 3,
    totalEvidencesCount: 4,
    activeAttentionCallsCount: 1,
    hasActiveRestrictions: false,
    academicNotesCount: 2,
    behavioralNotesCount: 1,
  },
  {
    uid: 'appr_juan_perez',
    displayName: 'Juan David Pérez Gómez',
    documentNumber: '1098765432',
    email: 'jperez@misena.edu.co',
    photoURL: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    enrollmentId: 'enr_001',
    enrollmentStatus: 'active',
    programName: 'Gestión Contable y de Información Financiera',
    fichaNumber: '3409626',
    courseName: 'Inglés – Bilingüismo Laboral',
    progressPercent: 90,
    averageGrade: 'A',
    attendanceRate: 96,
    punctualityRate: 98,
    submittedEvidencesCount: 4,
    totalEvidencesCount: 4,
    activeAttentionCallsCount: 0,
    hasActiveRestrictions: false,
    academicNotesCount: 2,
    behavioralNotesCount: 1,
  },
  {
    uid: 'appr_maria_gomez',
    displayName: 'María Alejandra Gómez Ruiz',
    documentNumber: '1014238990',
    email: 'magomez@misena.edu.co',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    enrollmentId: 'enr_002',
    enrollmentStatus: 'active',
    programName: 'Gestión Contable y de Información Financiera',
    fichaNumber: '3409626',
    courseName: 'Inglés – Bilingüismo Laboral',
    progressPercent: 100,
    averageGrade: 'A',
    attendanceRate: 100,
    punctualityRate: 100,
    submittedEvidencesCount: 4,
    totalEvidencesCount: 4,
    activeAttentionCallsCount: 0,
    hasActiveRestrictions: false,
    academicNotesCount: 3,
    behavioralNotesCount: 0,
  },
  {
    uid: 'appr_andres_morales',
    displayName: 'Andrés Felipe Morales Silva',
    documentNumber: '1020495811',
    email: 'amorales@misena.edu.co',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    enrollmentId: 'enr_003',
    enrollmentStatus: 'active',
    programName: 'Gestión Contable y de Información Financiera',
    fichaNumber: '3409626',
    courseName: 'Inglés – Bilingüismo Laboral',
    progressPercent: 75,
    averageGrade: 'C',
    attendanceRate: 88,
    punctualityRate: 92,
    submittedEvidencesCount: 3,
    totalEvidencesCount: 4,
    activeAttentionCallsCount: 1,
    hasActiveRestrictions: false,
    academicNotesCount: 1,
    behavioralNotesCount: 1,
  },
  {
    uid: 'appr_valentina_castro',
    displayName: 'Valentina Castro Lozano',
    documentNumber: '1032948123',
    email: 'vcastro@misena.edu.co',
    photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    enrollmentId: 'enr_004',
    enrollmentStatus: 'active',
    programName: 'Gestión Contable y de Información Financiera',
    fichaNumber: '3409626',
    courseName: 'Inglés – Bilingüismo Laboral',
    progressPercent: 85,
    averageGrade: 'A',
    attendanceRate: 92,
    punctualityRate: 94,
    submittedEvidencesCount: 3,
    totalEvidencesCount: 4,
    activeAttentionCallsCount: 0,
    hasActiveRestrictions: false,
    academicNotesCount: 2,
    behavioralNotesCount: 0,
  },
  {
    uid: 'appr_carlos_poveda',
    displayName: 'Carlos Eduardo Poveda Ortiz',
    documentNumber: '1018273645',
    email: 'cpoveda@misena.edu.co',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    enrollmentId: 'enr_005',
    enrollmentStatus: 'active',
    programName: 'Gestión Contable y de Información Financiera',
    fichaNumber: '3409626',
    courseName: 'Inglés – Bilingüismo Laboral',
    progressPercent: 50,
    averageGrade: 'N',
    attendanceRate: 74,
    punctualityRate: 80,
    submittedEvidencesCount: 2,
    totalEvidencesCount: 4,
    activeAttentionCallsCount: 2,
    hasActiveRestrictions: true,
    academicNotesCount: 3,
    behavioralNotesCount: 2,
  },
  {
    uid: 'appr_laura_martinez',
    displayName: 'Laura Sofía Martínez Herrera',
    documentNumber: '1019283746',
    email: 'lsmartinez@misena.edu.co',
    photoURL: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    enrollmentId: 'enr_006',
    enrollmentStatus: 'active',
    programName: 'Gestión Contable y de Información Financiera',
    fichaNumber: '3409626',
    courseName: 'Inglés – Bilingüismo Laboral',
    progressPercent: 95,
    averageGrade: 'A',
    attendanceRate: 98,
    punctualityRate: 100,
    submittedEvidencesCount: 4,
    totalEvidencesCount: 4,
    activeAttentionCallsCount: 0,
    hasActiveRestrictions: false,
    academicNotesCount: 2,
    behavioralNotesCount: 0,
  },
  {
    uid: 'appr_cristian_rojas',
    displayName: 'Cristian Camilo Rojas Tovar',
    documentNumber: '1028374650',
    email: 'crojas@misena.edu.co',
    photoURL: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    enrollmentId: 'enr_007',
    enrollmentStatus: 'active',
    programName: 'Gestión Contable y de Información Financiera',
    fichaNumber: '3409626',
    courseName: 'Inglés – Bilingüismo Laboral',
    progressPercent: 80,
    averageGrade: 'A',
    attendanceRate: 90,
    punctualityRate: 88,
    submittedEvidencesCount: 3,
    totalEvidencesCount: 4,
    activeAttentionCallsCount: 0,
    hasActiveRestrictions: false,
    academicNotesCount: 1,
    behavioralNotesCount: 0,
  },
  {
    uid: 'appr_paula_torres',
    displayName: 'Paula Andrea Torres Vargas',
    documentNumber: '1038475619',
    email: 'ptorres@misena.edu.co',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    enrollmentId: 'enr_008',
    enrollmentStatus: 'active',
    programName: 'Gestión Contable y de Información Financiera',
    fichaNumber: '3409626',
    courseName: 'Inglés – Bilingüismo Laboral',
    progressPercent: 88,
    averageGrade: 'A',
    attendanceRate: 94,
    punctualityRate: 96,
    submittedEvidencesCount: 3,
    totalEvidencesCount: 4,
    activeAttentionCallsCount: 0,
    hasActiveRestrictions: false,
    academicNotesCount: 1,
    behavioralNotesCount: 0,
  },
];

// Total de aprendices de la ficha 3409626 (simulado institucionalmente: 128 aprendices)
export const FICHA_3409626_TOTAL_COUNT = 128;

// ==========================================
// 10. ENTREGAS DE EVIDENCIAS (Submissions)
// ==========================================
export const DEMO_SUBMISSIONS: AcademicSubmission[] = [
  {
    id: 'sub_001',
    activityId: 'act_family_tree',
    learnerId: 'appr_juan_perez',
    userId: 'appr_juan_perez',
    learnerName: 'Juan David Pérez Gómez',
    learnerEmail: 'jperez@misena.edu.co',
    fichaId: 'ficha_3409626',
    courseId: 'course_ingles_laboral',
    submittedAt: '2026-09-20T14:30:00Z',
    status: 'approved',
    submissionType: 'canva_link',
    externalUrl: 'https://canva.com/design/DAFexample1/view',
    feedback: 'Excelente trabajo con el vocabulario de parentesco y adjetivos descriptivos.',
    grade: 'A',
    gradedBy: 'inst_carlos_mendoza',
    gradedAt: '2026-09-22T09:15:00Z',
    resubmissionCount: 0,
    createdAt: '2026-09-20T14:30:00Z',
    updatedAt: '2026-09-22T09:15:00Z',
  },
  {
    id: 'sub_002',
    activityId: 'act_oral_interview',
    learnerId: 'appr_juan_perez',
    userId: 'appr_juan_perez',
    learnerName: 'Juan David Pérez Gómez',
    learnerEmail: 'jperez@misena.edu.co',
    fichaId: 'ficha_3409626',
    courseId: 'course_ingles_laboral',
    submittedAt: '2026-09-23T18:10:00Z',
    status: 'under_review',
    submissionType: 'youtube_link',
    externalUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    resubmissionCount: 0,
    createdAt: '2026-09-23T18:10:00Z',
    updatedAt: '2026-09-23T18:10:00Z',
  },
  {
    id: 'sub_003',
    activityId: 'act_family_tree',
    learnerId: 'appr_andres_morales',
    userId: 'appr_andres_morales',
    learnerName: 'Andrés Felipe Morales',
    learnerEmail: 'amorales@misena.edu.co',
    fichaId: 'ficha_3409626',
    courseId: 'course_ingles_laboral',
    submittedAt: '2026-09-21T10:00:00Z',
    status: 'correction_required',
    submissionType: 'canva_link',
    externalUrl: 'https://canva.com/design/DAFexample2/view',
    feedback:
      'El enlace requiere permisos públicos de lectura y faltaron 2 integrantes de la familia con ocupaciones.',
    grade: 'C',
    gradedBy: 'inst_carlos_mendoza',
    gradedAt: '2026-09-22T11:00:00Z',
    resubmissionCount: 1,
    createdAt: '2026-09-21T10:00:00Z',
    updatedAt: '2026-09-22T11:00:00Z',
  },
  {
    id: 'sub_004',
    activityId: 'act_technical_glossary',
    learnerId: 'appr_maria_gomez',
    userId: 'appr_maria_gomez',
    learnerName: 'María Fernanda Gómez',
    learnerEmail: 'mgomez@misena.edu.co',
    fichaId: 'ficha_3409626',
    courseId: 'course_ingles_laboral',
    submittedAt: '2026-09-24T16:45:00Z',
    status: 'submitted',
    submissionType: 'pdf',
    fileName: 'Glosario_Contable_MariaGomez_Ficha3409626.pdf',
    driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view',
    driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
    drivePath: 'SENA Learning Hub / Gestión Contable / Ficha 3409626 / Glosario Técnico / María Gómez',
    fileSize: 2450000,
    mimeType: 'application/pdf',
    resubmissionCount: 0,
    createdAt: '2026-09-24T16:45:00Z',
    updatedAt: '2026-09-24T16:45:00Z',
  },
];

// ==========================================
// 11. REGISTROS DE ASISTENCIA PREPARADOS
// ==========================================
export const DEMO_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'att_001',
    fichaId: 'ficha_3409626',
    courseId: 'course_ingles_laboral',
    userId: 'appr_juan_perez',
    date: '2026-09-24',
    status: 'present',
    arrivalTime: '18:00',
    recordedBy: 'inst_carlos_mendoza',
    createdAt: '2026-09-24T18:05:00Z',
    updatedAt: '2026-09-24T18:05:00Z',
  },
  {
    id: 'att_002',
    fichaId: 'ficha_3409626',
    courseId: 'course_ingles_laboral',
    userId: 'appr_carlos_poveda',
    date: '2026-09-24',
    status: 'absent',
    notes: 'No asistió a la sesión sincrónica de las 18:00',
    recordedBy: 'inst_carlos_mendoza',
    createdAt: '2026-09-24T18:30:00Z',
    updatedAt: '2026-09-24T18:30:00Z',
  },
  {
    id: 'att_003',
    fichaId: 'ficha_3409626',
    courseId: 'course_ingles_laboral',
    userId: 'appr_andres_morales',
    date: '2026-09-24',
    status: 'late',
    arrivalTime: '18:35',
    notes: 'Ingreso tardío por jornada laboral',
    recordedBy: 'inst_carlos_mendoza',
    createdAt: '2026-09-24T18:36:00Z',
    updatedAt: '2026-09-24T18:36:00Z',
  },
];

// ==========================================
// 12. LLAMADOS DE ATENCIÓN PREPARADOS
// ==========================================
export const DEMO_ATTENTION_CALLS: AttentionCall[] = [
  {
    id: 'call_20260526_juan_sebastian',
    userId: 'appr_juan_sebastian_fernandez',
    learnerId: 'appr_juan_sebastian_fernandez',
    learnerName: 'JUAN SEBASTIAN FERNANDEZ PRADA',
    learnerDocument: '1030281506',
    fichaId: 'ficha_3409626',
    fichaNumber: '3405298',
    programId: 'prog_gestion_contable',
    programName: 'GESTION CONTABLE Y DE INFORMACION...',
    courseId: 'course_ingles_laboral',
    courseName: 'Inglés – Bilingüismo Laboral',
    type: 'TARDANZA',
    centerName: 'Centro Comercio y Servicios',
    regionalName: 'Regional Tolima',
    place: '2070D',
    date: '2026-05-26',
    dateTimeDetail: '26/05/2026 18:20',
    normativeArticle:
      'No cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n5. Asistir con puntualidad a todas las actividades propias del proceso de formación.',
    reason: 'LLEGADAS TARDE: No cumplimiento del deber de puntualidad (Art. 8o num 5)',
    description:
      'El aprendiz ingresó tarde a la sesión presencial de formación en el ambiente 2070D a las 18:20 horas.',
    improvementPlan:
      'El aprendiz deberá\n1. Imprimir, firmar y entregar este llamado de atención al instructor.\n2. Realizar orientaciones académicas: CARTELERA SOBRE la puntualidad (INGLES Y ESPAÑOL). presentar en dos ambientes de formación subir fotos (evidencias) a Google classroom (sección de anuncios)\n3. Presentar por escrito una propuesta y para mejorar su puntualidad. (evidencias) a Google classroom (sección de anuncios)',
    callLevel: 'PRIMER_LLAMADO',
    createdBy: 'inst_andres_huertas',
    instructorName: 'ANDRES HUERTAS',
    status: 'NOTIFICADO',
    createdAt: '2026-05-26T18:20:00Z',
    updatedAt: '2026-05-26T18:20:00Z',
  },
  {
    id: 'call_001',
    userId: 'appr_carlos_poveda',
    fichaId: 'ficha_3409626',
    courseId: 'course_ingles_laboral',
    type: 'absence',
    reason: 'Acumulación de 3 inasistencias injustificadas consecutivas',
    description:
      'El aprendiz no se ha conectado a las sesiones programadas los días 17, 19 y 24 de septiembre sin presentar soporte médico o laboral.',
    date: '2026-09-25',
    createdBy: 'inst_carlos_mendoza',
    status: 'issued',
    createdAt: '2026-09-25T09:00:00Z',
    updatedAt: '2026-09-25T09:00:00Z',
  },
  {
    id: 'call_002',
    userId: 'appr_andres_morales',
    fichaId: 'ficha_3409626',
    courseId: 'course_ingles_laboral',
    type: 'missing_evidence',
    reason: 'Vencimiento de fecha límite de entrega de evidencia clave',
    description:
      'Pendiente entrega del video de entrevista laboral en YouTube después del plazo ampliado.',
    date: '2026-09-24',
    createdBy: 'inst_carlos_mendoza',
    status: 'reviewed',
    createdAt: '2026-09-24T11:00:00Z',
    updatedAt: '2026-09-24T11:00:00Z',
  },
];

// ==========================================
// 13. RESTRICCIONES ACADÉMICAS PREPARADAS
// ==========================================
export const DEMO_RESTRICTIONS: AcademicRestriction[] = [
  {
    id: 'restr_001',
    userId: 'appr_carlos_poveda',
    fichaId: 'ficha_3409626',
    type: 'evidence_submission',
    reason:
      'Restricción temporal preventiva para entrega de evidencias técnicas hasta sustentar inasistencias acumuladas ante el Comité de Evaluación.',
    relatedAttentionCallId: 'call_001',
    status: 'active',
    createdAt: '2026-09-25T09:30:00Z',
    updatedAt: '2026-09-25T09:30:00Z',
  },
];

// ==========================================
// 14. SEGUIMIENTO ACADÉMICO Y COMPORTAMENTAL (LearnerRecords)
// ==========================================
export const DEMO_LEARNER_RECORDS: LearnerRecord[] = [
  {
    id: 'rec_001',
    userId: 'appr_juan_perez',
    fichaId: 'ficha_3409626',
    type: 'academic',
    category: 'participation',
    subcategory: 'oral_expression',
    description:
      'Excelente fluidez en pronunciación durante la práctica guiada de presentación personal en inglés.',
    createdBy: 'inst_carlos_mendoza',
    date: '2026-09-22',
    status: 'active',
    createdAt: '2026-09-22T19:00:00Z',
    updatedAt: '2026-09-22T19:00:00Z',
  },
  {
    id: 'rec_002',
    userId: 'appr_carlos_poveda',
    fichaId: 'ficha_3409626',
    type: 'behavioral',
    category: 'punctuality',
    subcategory: 'attendance',
    description:
      'Reiteradas llegadas tarde en la jornada nocturna y falta de comunicación previa con el instructor.',
    createdBy: 'inst_carlos_mendoza',
    date: '2026-09-23',
    status: 'active',
    createdAt: '2026-09-23T20:30:00Z',
    updatedAt: '2026-09-23T20:30:00Z',
  },
  {
    id: 'rec_003',
    userId: 'appr_maria_gomez',
    fichaId: 'ficha_3409626',
    type: 'academic',
    category: 'improvement',
    subcategory: 'written_expression',
    description:
      'Destacable progreso en la formulación de oraciones complejas y uso correcto de tiempos verbales.',
    createdBy: 'inst_carlos_mendoza',
    date: '2026-09-24',
    status: 'active',
    createdAt: '2026-09-24T18:45:00Z',
    updatedAt: '2026-09-24T18:45:00Z',
  },
];
