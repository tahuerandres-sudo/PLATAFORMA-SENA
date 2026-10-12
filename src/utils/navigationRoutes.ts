/**
 * @license
 * SENA Learning Hub - Utilidad de Enrutamiento y Persistencia de Navegación
 * PROMPT 41 — Conservar la ruta y la sección actual al actualizar la página (F5)
 * Soporta navegación en barra de direcciones, recarga sin pérdida de contexto y compatibilidad con Netlify.
 */

export type UserRole = 'instructor' | 'apprentice';

export type InstructorFichaTab =
  | 'summary'
  | 'sheet'
  | 'activities'
  | 'apprentices'
  | 'submissions'
  | 'grades'
  | 'attendance'
  | 'tracking'
  | 'announcements';

export type ApprenticeFichaTab =
  | 'announcements'
  | 'activities'
  | 'grades'
  | 'resources';

export interface ParsedRoute {
  viewId: string;
  targetRole?: UserRole | 'common';
  fichaId?: string | null;
  tab?: string | null;
  relatedId?: string | null;
  isAuthorized: boolean;
  unauthorizedReason?: string;
}

// Vistas exclusivas del rol Instructor
export const INSTRUCTOR_ONLY_VIEWS = new Set([
  'apprentices',
  'competencies',
  'learning_outcomes',
  'attendance',
  'tracking',
  'attention_calls',
  'reports',
  'stats',
  'blueprint',
]);

// Vistas exclusivas del rol Aprendiz
export const APPRENTICE_ONLY_VIEWS = new Set([
  'attendance_tracking',
  'progress',
  'achievements',
  'ranking',
  'profile',
]);

// Mapa canónico de rutas para Instructor
const INSTRUCTOR_PATH_TO_VIEW: Record<string, string> = {
  '': 'dashboard',
  'inicio': 'dashboard',
  'dashboard': 'dashboard',
  'fichas': 'fichas',
  'mis-fichas': 'fichas',
  'aprendices': 'apprentices',
  'apprentices': 'apprentices',
  'expedientes': 'apprentices',
  'competencias': 'competencies',
  'competencies': 'competencies',
  'resultados-aprendizaje': 'learning_outcomes',
  'learning-outcomes': 'learning_outcomes',
  'learning_outcomes': 'learning_outcomes',
  'actividades': 'activities',
  'activities': 'activities',
  'calendario': 'calendar',
  'calendar': 'calendar',
  'evidencias': 'submissions',
  'submissions': 'submissions',
  'calificaciones': 'grades',
  'grades': 'grades',
  'asistencia': 'attendance',
  'attendance': 'attendance',
  'seguimiento': 'tracking',
  'tracking': 'tracking',
  'llamados-atencion': 'attention_calls',
  'attention-calls': 'attention_calls',
  'attention_calls': 'attention_calls',
  'reportes': 'reports',
  'reports': 'reports',
  'estadisticas': 'stats',
  'stats': 'stats',
  'anuncios': 'announcements',
  'announcements': 'announcements',
  'gamificacion': 'gamification',
  'gamification': 'gamification',
  'herramientas-ia': 'ai_tools',
  'ai-tools': 'ai_tools',
  'ai_tools': 'ai_tools',
  'notificaciones': 'notifications',
  'notifications': 'notifications',
  'configuracion': 'settings',
  'settings': 'settings',
};

// Mapa canónico de rutas para Aprendiz
const APPRENTICE_PATH_TO_VIEW: Record<string, string> = {
  '': 'dashboard',
  'inicio': 'dashboard',
  'dashboard': 'dashboard',
  'fichas': 'fichas',
  'mis-fichas': 'fichas',
  'actividades': 'activities',
  'activities': 'activities',
  'calendario': 'calendar',
  'calendar': 'calendar',
  'evidencias': 'submissions',
  'submissions': 'submissions',
  'calificaciones': 'grades',
  'grades': 'grades',
  'anuncios': 'announcements',
  'announcements': 'announcements',
  'asistencia': 'attendance_tracking',
  'attendance': 'attendance_tracking',
  'attendance-tracking': 'attendance_tracking',
  'attendance_tracking': 'attendance_tracking',
  'progreso': 'progress',
  'progress': 'progress',
  'logros': 'achievements',
  'achievements': 'achievements',
  'ranking': 'ranking',
  'herramientas-ia': 'ai_tools',
  'ai-tools': 'ai_tools',
  'ai_tools': 'ai_tools',
  'perfil': 'profile',
  'profile': 'profile',
  'notificaciones': 'notifications',
  'notifications': 'notifications',
  'configuracion': 'settings',
  'settings': 'settings',
};

// Aliases de pestañas de Ficha para Instructor
const INSTRUCTOR_TAB_ALIASES: Record<string, InstructorFichaTab> = {
  summary: 'summary',
  resumen: 'summary',
  general: 'summary',
  inicio: 'summary',
  sheet: 'sheet',
  planilla: 'sheet',
  activities: 'activities',
  actividades: 'activities',
  aprendices: 'apprentices',
  apprentices: 'apprentices',
  submissions: 'submissions',
  evidencias: 'submissions',
  entregas: 'submissions',
  grades: 'grades',
  calificaciones: 'grades',
  notas: 'grades',
  attendance: 'attendance',
  asistencia: 'attendance',
  tracking: 'tracking',
  seguimiento: 'tracking',
  announcements: 'announcements',
  anuncios: 'announcements',
  novedades: 'announcements',
  muro: 'announcements',
};

// Aliases de pestañas de Ficha para Aprendiz
const APPRENTICE_TAB_ALIASES: Record<string, ApprenticeFichaTab> = {
  announcements: 'announcements',
  anuncios: 'announcements',
  novedades: 'announcements',
  muro: 'announcements',
  activities: 'activities',
  actividades: 'activities',
  grades: 'grades',
  calificaciones: 'grades',
  notas: 'grades',
  resources: 'resources',
  recursos: 'resources',
  materiales: 'resources',
};

/**
 * Normaliza y valida una pestaña de ficha para Instructor
 */
export function normalizeInstructorFichaTab(tab?: string | null): InstructorFichaTab {
  if (!tab) return 'summary';
  const clean = tab.trim().toLowerCase();
  return INSTRUCTOR_TAB_ALIASES[clean] || 'summary';
}

/**
 * Normaliza y valida una pestaña de ficha para Aprendiz
 */
export function normalizeApprenticeFichaTab(tab?: string | null): ApprenticeFichaTab {
  if (!tab) return 'activities';
  const clean = tab.trim().toLowerCase();
  return APPRENTICE_TAB_ALIASES[clean] || 'activities';
}

/**
 * Construye la URL canónica institucional para una vista y rol dados
 */
export function buildCanonicalUrl(
  role: UserRole | 'blueprint',
  viewId: string,
  options?: {
    fichaId?: string | null;
    fichaNumber?: string | null;
    tab?: string | null;
    relatedId?: string | null;
  }
): string {
  if (role === 'blueprint' || viewId === 'blueprint') {
    return '/blueprint';
  }

  const prefix = role === 'instructor' ? '/instructor' : '/aprendiz';

  // Caso especial: dentro de Fichas
  if (viewId === 'fichas') {
    const fichaIdentifier = options?.fichaNumber || options?.fichaId;
    if (fichaIdentifier) {
      const base = `${prefix}/fichas/${encodeURIComponent(fichaIdentifier)}`;
      if (options?.tab && options.tab !== 'summary' && options.tab !== 'activities') {
        return `${base}?tab=${encodeURIComponent(options.tab)}`;
      }
      if (options?.tab) {
        return `${base}?tab=${encodeURIComponent(options.tab)}`;
      }
      return base;
    }
    return `${prefix}/fichas`;
  }

  // Mapeos a slugs amigables en español
  const instructorSlugs: Record<string, string> = {
    dashboard: 'inicio',
    apprentices: 'aprendices',
    competencies: 'competencias',
    learning_outcomes: 'resultados-aprendizaje',
    activities: 'actividades',
    calendar: 'calendario',
    submissions: 'evidencias',
    grades: 'calificaciones',
    attendance: 'asistencia',
    tracking: 'seguimiento',
    attention_calls: 'llamados-atencion',
    reports: 'reportes',
    stats: 'estadisticas',
    announcements: 'anuncios',
    gamification: 'gamificacion',
    ai_tools: 'herramientas-ia',
    notifications: 'notificaciones',
    settings: 'configuracion',
  };

  const apprenticeSlugs: Record<string, string> = {
    dashboard: 'inicio',
    activities: 'actividades',
    calendar: 'calendario',
    submissions: 'evidencias',
    grades: 'calificaciones',
    announcements: 'anuncios',
    attendance_tracking: 'asistencia',
    progress: 'progreso',
    achievements: 'logros',
    ranking: 'ranking',
    ai_tools: 'herramientas-ia',
    profile: 'perfil',
    notifications: 'notificaciones',
    settings: 'configuracion',
  };

  const slug =
    role === 'instructor'
      ? instructorSlugs[viewId] || viewId
      : apprenticeSlugs[viewId] || viewId;

  let url = `${prefix}/${slug}`;
  if (options?.relatedId) {
    url += `?id=${encodeURIComponent(options.relatedId)}`;
  }
  return url;
}

/**
 * Parsea la ruta y query string actual de la ventana del navegador
 * y valida los permisos según el rol activo obtenido de Firestore.
 */
export function parseCurrentUrl(
  pathname: string,
  search: string,
  userRole: UserRole
): ParsedRoute {
  // Limpiar pathname (remover trailing slashes)
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);
  const tabParam = searchParams.get('tab');
  const idParam = searchParams.get('id');

  // Ruta especial: Blueprint (Exclusiva de instructores y administradores)
  if (cleanPath === '/blueprint') {
    if (userRole === 'apprentice') {
      return {
        viewId: 'dashboard',
        targetRole: 'apprentice',
        isAuthorized: false,
        unauthorizedReason:
          'Acceso denegado: La sección "Blueprint" está restringida únicamente a Instructores autorizados.',
      };
    }
    return {
      viewId: 'blueprint',
      targetRole: 'instructor',
      isAuthorized: true,
    };
  }

  // Detectar fichas de instructor con ID: /instructor/(?:mis-)?fichas/:fichaId
  const instructorFichaMatch = cleanPath.match(/^\/instructor\/(?:mis-)?fichas\/(.+)$/);
  if (instructorFichaMatch) {
    const rawFichaId = decodeURIComponent(instructorFichaMatch[1]);
    const normalizedTab = normalizeInstructorFichaTab(tabParam);
    if (userRole !== 'instructor') {
      return {
        viewId: 'fichas',
        fichaId: rawFichaId,
        tab: normalizedTab,
        isAuthorized: false,
        unauthorizedReason:
          'Acceso denegado: Esta sección de gestión de fichas está reservada a Instructores.',
      };
    }
    return {
      viewId: 'fichas',
      targetRole: 'instructor',
      fichaId: rawFichaId,
      tab: normalizedTab,
      isAuthorized: true,
    };
  }

  // Detectar fichas de aprendiz con ID: /aprendiz/(?:mis-)?fichas/:fichaId
  const apprenticeFichaMatch = cleanPath.match(/^\/aprendiz\/(?:mis-)?fichas\/(.+)$/);
  if (apprenticeFichaMatch) {
    const rawFichaId = decodeURIComponent(apprenticeFichaMatch[1]);
    const normalizedTab = normalizeApprenticeFichaTab(tabParam);
    return {
      viewId: 'fichas',
      targetRole: 'apprentice',
      fichaId: rawFichaId,
      tab: normalizedTab,
      isAuthorized: true,
    };
  }

  // Detectar ruta genérica de ficha: /fichas/:fichaId
  const genericFichaMatch = cleanPath.match(/^\/fichas\/(.+)$/);
  if (genericFichaMatch) {
    const rawFichaId = decodeURIComponent(genericFichaMatch[1]);
    const normalizedTab =
      userRole === 'instructor'
        ? normalizeInstructorFichaTab(tabParam)
        : normalizeApprenticeFichaTab(tabParam);
    return {
      viewId: 'fichas',
      targetRole: userRole,
      fichaId: rawFichaId,
      tab: normalizedTab,
      isAuthorized: true,
    };
  }

  // Dividir segmentos de URL
  const segments = cleanPath.split('/').filter(Boolean);

  // Si está en la raíz "/"
  if (segments.length === 0) {
    return {
      viewId: 'dashboard',
      targetRole: userRole,
      isAuthorized: true,
    };
  }

  const firstSeg = segments[0];
  const secondSeg = segments[1] || '';

  // Prefijo explícito de instructor: /instructor/...
  if (firstSeg === 'instructor') {
    const mappedView = INSTRUCTOR_PATH_TO_VIEW[secondSeg] || 'dashboard';

    // Verificar si el rol actual tiene permisos
    if (userRole !== 'instructor' && INSTRUCTOR_ONLY_VIEWS.has(mappedView)) {
      return {
        viewId: 'dashboard',
        targetRole: 'instructor',
        isAuthorized: false,
        unauthorizedReason: `Acceso denegado: La sección "${mappedView}" está restringida únicamente a Instructores autorizados.`,
      };
    }

    return {
      viewId: mappedView,
      targetRole: 'instructor',
      relatedId: idParam,
      isAuthorized: true,
    };
  }

  // Prefijo explícito de aprendiz: /aprendiz/...
  if (firstSeg === 'aprendiz') {
    const mappedView = APPRENTICE_PATH_TO_VIEW[secondSeg] || 'dashboard';

    // Si un instructor entra a una ruta exclusiva de aprendiz, redirigir a dashboard
    if (userRole === 'instructor' && APPRENTICE_ONLY_VIEWS.has(mappedView)) {
      return {
        viewId: 'dashboard',
        targetRole: 'apprentice',
        isAuthorized: true,
      };
    }

    return {
      viewId: mappedView,
      targetRole: 'apprentice',
      relatedId: idParam,
      isAuthorized: true,
    };
  }

  // Rutas sin prefijo (ej: /actividades, /calificaciones, /perfil, /competencias)
  if (userRole === 'instructor') {
    const mappedView = INSTRUCTOR_PATH_TO_VIEW[firstSeg];
    if (mappedView) {
      return {
        viewId: mappedView,
        targetRole: 'instructor',
        relatedId: idParam,
        isAuthorized: true,
      };
    }
  } else {
    const mappedView = APPRENTICE_PATH_TO_VIEW[firstSeg];
    if (mappedView) {
      return {
        viewId: mappedView,
        targetRole: 'apprentice',
        relatedId: idParam,
        isAuthorized: true,
      };
    }
  }

  // Fallback por defecto: Dashboard del rol actual
  return {
    viewId: 'dashboard',
    targetRole: userRole,
    isAuthorized: true,
  };
}

/**
 * Guarda de forma segura la última ruta del rol en sessionStorage
 * (sin guardar tokens, contraseñas ni datos sensibles)
 */
export function saveRoleNavigation(role: UserRole, fullPath: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `sena_last_path_${role}`;
    window.sessionStorage.setItem(key, fullPath);
  } catch {
    // Ignore storage quota/security errors
  }
}

/**
 * Obtiene la última ruta guardada para un rol en sessionStorage
 */
export function getSavedRoleNavigation(role: UserRole): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = `sena_last_path_${role}`;
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Guarda la pestaña activa de una ficha específica en sessionStorage
 */
export function saveFichaTab(role: UserRole, fichaIdentifier: string, tab: string): void {
  if (typeof window === 'undefined' || !fichaIdentifier) return;
  try {
    const key = `sena_tab_${role}_ficha_${fichaIdentifier}`;
    window.sessionStorage.setItem(key, tab);
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Obtiene la pestaña activa guardada de una ficha específica en sessionStorage
 */
export function getSavedFichaTab(role: UserRole, fichaIdentifier: string): string | null {
  if (typeof window === 'undefined' || !fichaIdentifier) return null;
  try {
    const key = `sena_tab_${role}_ficha_${fichaIdentifier}`;
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
