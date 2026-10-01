/**
 * @license
 * SENA Learning Hub - Blueprint Arquitectónico Maestro
 * Análisis Técnico y Especificación de los 12 Puntos Fundamentales
 */

export interface ArchitectureSection {
  id: string;
  number: number;
  title: string;
  summary: string;
  details: string[];
  keyDiagram?: string;
  schemaSnippet?: string;
  risksOrRecommendations?: string[];
}

export const ARCHITECTURE_SPEC: ArchitectureSection[] = [
  {
    id: 'general_architecture',
    number: 1,
    title: 'Arquitectura General Propuesta',
    summary: 'Arquitectura SPA/PWA multicapa desacoplada orientada a eventos y microservicios sin servidor (Serverless Cloud Architecture).',
    details: [
      'Capa Cliente (Frontend): React 19 + TypeScript + Vite + Tailwind CSS con capacidades PWA (Service Worker, Web App Manifest, Cache First para assets y Network First para datos académicos).',
      'Capa de Datos Estructurados: Cloud Firestore con modelo de colecciones de nivel superior y subcolecciones ligeras para queries atómicas de baja latencia.',
      'Capa de Almacenamiento No Estructurado (Evidencias): Google Drive API integrada mediante Google Workspace OAuth con proxy seguro para organizar árboles de carpetas.',
      'Capa de Autenticación & RBAC: Firebase Authentication con Custom Claims y colección users/{uid} para control de acceso estricto.',
      'Capa de Comunicaciones: Firebase Cloud Messaging (FCM) para notificaciones push en tiempo real + Proveedor Transaccional de Correo (SendGrid/Resend/Cloud Functions) desacoplado mediante cola.',
      'Capa de Inteligencia Artificial: Google Gemini 2.5/Flash mediante @google/genai SDK para generación de actividades de inglés, tutoría contextual y asistencia formativa.',
    ],
    keyDiagram: `[ Dispositivo Aprendiz / Instructor (PWA) ]
                  │                │                 │
    (Auth / RBAC) │  (Datos JSON)  │   (Evidencias)  │ (IA Pedagógica)
                  ▼                ▼                 ▼            ▼
         [ Firebase Auth ]  [ Cloud Firestore ]  [ Google Drive ] [ Gemini API ]
                  │                │                 │
                  └─────────┬──────┴─────────────────┘
                            ▼
          [ Notificaciones Push (FCM) & Emails ]`,
  },
  {
    id: 'firestore_structure',
    number: 2,
    title: 'Estructura de Firestore Recomendada',
    summary: 'Estructura híbrida normalizada para escalabilidad masiva sin duplicidad de datos innecesaria.',
    details: [
      '/users/{userId}: Documento de identidad y rol del usuario (instructor | apprentice).',
      '/trainingCenters/{centerId}: Centros de formación (código, nombre, regional).',
      '/trainingPrograms/{programId}: Programas de formación técnica y tecnológica.',
      '/fichas/{fichaId}: Grupos de formación (número de ficha, fecha inicio/fin, instructores asignados).',
      '/courses/{courseId}: Competencias o asignaturas vinculadas a una ficha (ej: Inglés - Bilingüismo).',
      '/enrollments/{enrollmentId}: Tabla de unión normalizada entre apprenticeId, fichaId y courseId.',
      '/activities/{activityId}: Actividades pedagógicas publicadas por el instructor.',
      '/submissions/{submissionId}: Evidencias enviadas por aprendices con referencias a Google Drive.',
      '/grades/{gradeId}: Calificaciones oficiales y rúbricas (Aprobado >= 70, No Aprobado < 70).',
      '/feedback/{feedbackId}: Retroalimentación pedagógica y observaciones cualitativas.',
      '/announcements/{announcementId}: Tablón de avisos por curso y ficha.',
      '/notifications/{notificationId}: Notificaciones en app para el usuario.',
      '/gamification/{apprenticeId}: Puntos XP, rachas, nivel y logros de bilingüismo.',
    ],
    schemaSnippet: `// Documento: /submissions/{submissionId}
{
  "id": "sub_883192",
  "activityId": "act_simple_present_01",
  "fichaId": "ficha_2698745",
  "apprenticeId": "usr_juan_perez",
  "submittedAt": "2026-09-24T14:30:00Z",
  "status": "submitted", // 'submitted' | 'late' | 'graded'
  "driveRef": {
    "driveFileId": "1aB2c3D4e5F6g7H8i9J0",
    "webViewLink": "https://drive.google.com/file/d/1aB2c3.../view",
    "structuredPath": "SENA Learning Hub / Gestión Contable / Ficha 2698745 / Actividad 01 / Juan Pérez",
    "mimeType": "application/pdf",
    "sizeBytes": 1420500,
    "originalFileName": "Evidencia_Grammar_JuanPerez.pdf"
  },
  "gradeId": "grd_5521"
}`,
  },
  {
    id: 'entity_relations',
    number: 3,
    title: 'Relaciones entre Entidades',
    summary: 'Relaciones 1:N y N:M modeladas explícitamente respetando la jerarquía oficial del SENA.',
    details: [
      'Centro de Formación (1) ── (N) Programas de Formación.',
      'Programa de Formación (1) ── (N) Fichas de Formación.',
      'Ficha (N) ── (M) Instructores (Un instructor vocero + instructores transversales como el de inglés).',
      'Ficha (1) ── (N) Cursos / Competencias específicas.',
      'Ficha (1) ── (N) Aprendices (a través de la colección enrollments).',
      'Curso (1) ── (N) Actividades pedagógicas.',
      'Actividad (1) ── (N) Evidencias / Submissions (una por aprendiz por intento).',
      'Evidencia (1) ── (1) Calificación (Grade).',
      'Calificación (1) ── (1) Retroalimentación cualitativa (Feedback).',
      'Aprendiz (1) ── (1) Perfil de Gamificación (XP, insignias, rachas).',
    ],
    keyDiagram: `[Centro de Formación]
         │ 1:N
[Programa de Formación]
         │ 1:N
     [Ficha] ◄─── N:M ───► [Instructor]
         │ 1:N
  [Curso / Competencia]
         │ 1:N
     [Actividad]
         │ 1:N
     [Evidencia] ── 1:1 ──► [Almacenamiento Google Drive]
         │ 1:1
   [Calificación] ── 1:1 ──► [Retroalimentación]`,
  },
  {
    id: 'auth_architecture',
    number: 4,
    title: 'Arquitectura de Autenticación',
    summary: 'Autenticación federada segura con Firebase Auth combinada con perfiles validados en Firestore.',
    details: [
      'Métodos soportados: Correo institucional/contraseña (@sena.edu.co / @misena.edu.co) y Google Sign-In.',
      'Sincronización de Identidad: Al registrarse o iniciar sesión, se consulta o crea el documento en /users/{uid}.',
      'Custom Claims / Role Guard: El rol ("instructor" o "apprentice") reside en Firestore y se replica en Custom Claims para validación sin costo en tokens JWT.',
      'Control de Sesión: Tokens de refresco automáticos, expiración segura y revocación inmediata en caso de desactivación de cuenta.',
      'Protección Cliente: Enrutamiento protegido por Higher Order Component / Router Guard que redirige aprendices e instructores a sus respectivos paneles.',
    ],
  },
  {
    id: 'drive_architecture',
    number: 5,
    title: 'Arquitectura de Almacenamiento en Google Drive',
    summary: 'Separación estricta de responsabilidades: Firestore para metadatos, Google Drive para almacenamiento binario jerarquizado.',
    details: [
      'Principio de Seguridad Cero Fugas: Los aprendices NUNCA navegan la estructura de carpetas de Drive del instructor ni tienen permisos de lectura en la raíz.',
      'Árbol Automático de Carpetas: Se genera programáticamente con la estructura: [SENA Learning Hub] / [Programa] / [Ficha] / [Actividad] / [Nombre Aprendiz].',
      'Modo de Subida Seguro: El frontend sube el archivo a través de una Service Account delegada o un endpoint seguro con OAuth que coloca el archivo en la subcarpeta exacta del aprendiz y devuelve su ID único.',
      'Permisos de Acceso: El archivo se comparte únicamente con el Instructor evaluador y el Aprendiz propietario con permiso de solo lectura una vez entregado.',
      'Metadatos en Firestore: Se almacena driveFileId, webViewLink, tamaño y hash. La app consulta el estado sin descargar el archivo completo en el cliente.',
    ],
    schemaSnippet: `SENA Learning Hub (Carpeta Raíz Drive)
└── Gestión Contable y de Información Financiera
    └── Ficha 2698745
        ├── Actividad 01 - Simple Present Daily Routine
        │   ├── Juan Pérez - Evidencia_Audio.mp3 (driveId: 1x7Z...)
        │   └── María Gómez - Documento_Escrito.pdf (driveId: 2k9Q...)
        └── Actividad 02 - Past Tense Memoirs
            └── Juan Pérez - Presentation.pptx (driveId: 3m4P...)`,
  },
  {
    id: 'notifications_architecture',
    number: 6,
    title: 'Arquitectura de Notificaciones (Push & En-App)',
    summary: 'Notificaciones híbridas en tiempo real (FCM + Firestore Snapshot Listeners).',
    details: [
      'In-App Center: Colección /notifications/{id} leída en tiempo real con snapshot listener para el usuario logueado con indicador de badge no leído.',
      'Push Notifications (FCM): Registro de Service Worker para recibir notificaciones en segundo plano incluso con la PWA cerrada en Android/Escritorio.',
      'Suscripción a Tópicos (Topics): Posibilidad de suscripción a nivel de ficha (/topics/ficha_2698745) para anuncios masivos del instructor sin múltiples escrituras.',
      'Eventos Notificables: Publicación de nueva actividad, calificación registrada, retroalimentación enviada, recordatorio 24h antes del vencimiento y nuevos logros.',
    ],
  },
  {
    id: 'email_architecture',
    number: 7,
    title: 'Arquitectura del Sistema de Correos',
    summary: 'Motor de correos desacoplado mediante cola de mensajería asíncrona y plantillas institucionales.',
    details: [
      'Diseño Desacoplado: La aplicación frontend NO invoca directamente el servidor SMTP. Escribe un evento en una colección o cola /mailQueue/{id}.',
      'Soporte Multi-Proveedor: Interfaz IEmailService que puede implementarse con SendGrid, Resend, Amazon SES, Firebase Email Extension o Google Workspace Gmail API.',
      'Plantillas HTML Institucionales SENA: Notificación formal de calificación (Aprobado/No Aprobado con nota), retroalimentación del instructor y enlaces profundos seguros.',
      'Resiliencia: Reintentos exponenciales automáticos y registro de logs de auditoría en caso de rebote o fallo de entrega.',
    ],
  },
  {
    id: 'rbac_security',
    number: 8,
    title: 'Estructura de Roles y Permisos (RBAC)',
    summary: 'Seguridad en profundidad aplicada en interfaz y forzada de manera infranqueable en Firestore Security Rules.',
    details: [
      'Rol Aprendiz: Solo lectura de actividades de su ficha asignada. Creación de sus propias evidencias. Solo lectura de sus propias calificaciones y retroalimentación. Prohibida modificación de notas o lectura de evidencias de compañeros.',
      'Rol Instructor: Control total (crear, editar, archivar) sobre actividades y cursos que tenga asignados. Lectura de todas las evidencias de sus fichas asignadas. Escritura exclusiva de calificaciones y retroalimentación.',
      'Roles Futuros contemplados: Coordinador Académico (auditoría transversal de fichas y centros) y Administrador de Sistema.',
      'Seguridad Anti-Spoofing: Reglas de Firestore verifican request.auth.uid == resource.data.apprenticeId para envíos y request.auth.uid in get(/fichas/{id}).data.assignedInstructorIds para calificar.',
    ],
  },
  {
    id: 'code_modular_structure',
    number: 9,
    title: 'Estructura Modular del Código',
    summary: 'Arquitectura hexagonal limpia (Clean Modular Architecture) con clara separación de responsabilidades.',
    details: [
      '/src/types/: Contratos de dominio independientes de la UI.',
      '/src/config/: Constantes institucionales, tokens de diseño y catálogos de datos.',
      '/src/services/: Capa de infraestructura y adaptadores (auth, firestore, drive, notifications, ai, email).',
      '/src/modules/: Módulos funcionales autocontenidos (academic, activities, submissions, grading, gamification).',
      '/src/components/ui/: Sistema de componentes base reutilizables (Botones, Modales, Badges, Tabs).',
      '/src/components/layout/: Shell de la aplicación (Sidebar, Topbar, Role Switcher de prueba, Breadcrumbs).',
    ],
  },
  {
    id: 'technical_risks',
    number: 10,
    title: 'Principales Riesgos Técnicos y Mitigaciones',
    summary: 'Análisis preventivo de cuellos de botella, cuotas de APIs y restricciones de plataforma.',
    risksOrRecommendations: [
      'Riesgo 1: Límites de cuota y permisos en Google Drive API. Mitigación: Usar Service Account institucional o permisos granulares con almacenamiento por cuota de cuenta y enlaces cacheados en Firestore.',
      'Riesgo 2: Escalabilidad de lecturas concurrentes en Firestore al consultar calificaciones de 40 aprendices. Mitigación: Consultas indexadas compuestas (fichaId + activityId) y paginación.',
      'Riesgo 3: Soporte de PWA y Push Notifications en iOS Safari. Mitigación: Configurar Web Push moderno con VAPID keys y soporte de instalación en pantalla de inicio con fallback a notificaciones in-app.',
      'Riesgo 4: Subida de archivos pesados (videos de pronunciación en inglés). Mitigación: Validación estricta de tamaño en cliente (máx 25 MB) y compresión en subida.',
    ],
    details: [],
  },
  {
    id: 'pre_development_decisions',
    number: 11,
    title: 'Decisiones Críticas Previas al Desarrollo',
    summary: 'Parámetros institucionales y de infraestructura a definir antes de escribir código de módulos avanzados.',
    details: [
      '1. Estrategia de Cuentas Google Drive: ¿Se utilizará una carpeta compartida en la cuenta del Instructor o una cuenta de servicio institucional centralizada para el centro SENA?',
      '2. Escala de Calificación SENA: La escala oficial es binaria en Sofía Plus (A = Aprobado, D = Deficiente / No Aprobado), pero pedagógicamente en aula se evalúa de 0 a 100 con corte de aprobación en 70%. Se adoptará el modelo híbrido (0-100 con equivalencia automática a A / D).',
      '3. Formato de Archivos para Bilingüismo: Permitir grabaciones directas de audio en el navegador (Web Audio API a MP3/WAV) para evidencias de speaking sin requerir herramientas externas.',
      '4. Desacoplamiento de Gamificación: Los puntos XP y badges fomentan el engagement del aprendiz pero jamás alterarán la nota oficial salvo que el instructor configure una bonificación explícita.',
    ],
  },
  {
    id: 'implementation_roadmap',
    number: 12,
    title: 'Orden Recomendado de Implementación',
    summary: 'Plan de entrega por fases progresivas sin regresión.',
    details: [
      'Prompt 0 (Actual): Arquitectura Maestra, tipos, esquemas, blueprint y estructura base modular.',
      'Prompt 1: Interfaz y estructura visual responsive (Theme SENA, Google Classroom look & feel, Vistas de Instructor y Aprendiz).',
      'Prompt 2: Módulo de Usuarios, Autenticación Firebase y control RBAC.',
      'Prompt 3: Estructura Académica (Centros, Programas, Fichas, Cursos/Competencias y Matrículas).',
      'Prompt 4: Módulo de Actividades pedagógicas y flujo de entrega de evidencias de aprendices.',
      'Prompt 5: Integración con Google Drive API para ordenamiento jerárquico de evidencias.',
      'Prompt 6: Módulo de Calificaciones oficiales (A/D), rúbricas formativas y retroalimentación pedagógica.',
      'Prompt 7: Sistema de Notificaciones (Push FCM + In-App) y pasarela transaccional de correos.',
      'Prompt 8: Sistema de Gamificación para bilingüismo (XP, rachas diarias, insignias y ranking amigable).',
      'Prompt 9: Integración de Inteligencia Artificial (Gemini) para apoyo al instructor y tutoría en inglés.',
      'Prompt 10: Auditoría de Seguridad, Reglas de Firestore, optimización PWA y puesta en producción.',
    ],
  },
];
