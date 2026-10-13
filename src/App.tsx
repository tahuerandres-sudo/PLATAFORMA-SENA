/**
 * @license
 * SENA Learning Hub
 * PROMPT 2 — USUARIOS, AUTENTICACIÓN Y ROLES (FIREBASE AUTH & FIRESTORE)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header, ActiveRole } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Breadcrumbs } from './components/ui/Breadcrumbs';
import {
  UserRole,
  buildCanonicalUrl,
  parseCurrentUrl,
  saveRoleNavigation,
  saveFichaTab,
  getSavedFichaTab,
  INSTRUCTOR_ONLY_VIEWS,
} from './utils/navigationRoutes';

// Vistas de Autenticación
import { LoginView } from './views/auth/LoginView';
import { RegisterView } from './views/auth/RegisterView';
import { CompleteProfileModal } from './views/auth/CompleteProfileModal';

// Vistas del Instructor
import { InstructorDashboard } from './views/instructor/InstructorDashboard';
import { InstructorFichasView } from './views/instructor/InstructorFichasView';
import { InstructorApprenticesView } from './views/instructor/InstructorApprenticesView';
import { InstructorCompetenciesView } from './views/instructor/InstructorCompetenciesView';
import { InstructorLearningOutcomesView } from './views/instructor/InstructorLearningOutcomesView';
import { InstructorActivitiesView } from './views/instructor/InstructorActivitiesView';
import { InstructorCalendarView } from './views/instructor/InstructorCalendarView';
import { InstructorSubmissionsView } from './views/instructor/InstructorSubmissionsView';
import { InstructorGradesView } from './views/instructor/InstructorGradesView';
import { InstructorAttendanceView } from './views/instructor/InstructorAttendanceView';
import { InstructorTrackingView } from './views/instructor/InstructorTrackingView';
import { InstructorAttentionCallsView } from './views/instructor/InstructorAttentionCallsView';
import { InstructorReportsView } from './views/instructor/InstructorReportsView';
import { InstructorStatsView } from './views/instructor/InstructorStatsView';
import { InstructorAnnouncementsView } from './views/instructor/InstructorAnnouncementsView';
import { InstructorGamificationView } from './views/instructor/InstructorGamificationView';
import { InstructorAiToolsView } from './views/instructor/InstructorAiToolsView';
import { InstructorSettingsView } from './views/instructor/InstructorSettingsView';

// Vistas del Aprendiz
import { ApprenticeDashboard } from './views/apprentice/ApprenticeDashboard';
import { ApprenticeFichasView } from './views/apprentice/ApprenticeFichasView';
import { ApprenticeActivitiesView } from './views/apprentice/ApprenticeActivitiesView';
import { ApprenticeCalendarView } from './views/apprentice/ApprenticeCalendarView';
import { ApprenticeSubmissionsView } from './views/apprentice/ApprenticeSubmissionsView';
import { ApprenticeGradesView } from './views/apprentice/ApprenticeGradesView';
import { ApprenticeProgressView } from './views/apprentice/ApprenticeProgressView';
import { ApprenticeAchievementsView } from './views/apprentice/ApprenticeAchievementsView';
import { ApprenticeRankingView } from './views/apprentice/ApprenticeRankingView';
import { ApprenticeProfileView } from './views/apprentice/ApprenticeProfileView';
import { ApprenticeSettingsView } from './views/apprentice/ApprenticeSettingsView';
import { ApprenticeTrackingView } from './views/apprentice/ApprenticeTrackingView';
import { ApprenticeAiToolsView } from './views/apprentice/ApprenticeAiToolsView';

// Vistas Comunes
import { NotificationsCenterView } from './views/common/NotificationsCenterView';
import { Prompt0CockpitView } from './views/common/Prompt0CockpitView';
import { notificationService } from './services/academic/notificationService';

import { ShieldAlert, LogOut, RefreshCw, AlertCircle } from 'lucide-react';

function AppContent() {
  const {
    currentUser,
    userProfile,
    loading,
    isAuthenticated,
    isInstructor,
    isApprentice,
    logout,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedFichaId, setSelectedFichaId] = useState<string | null>(null);
  const [selectedFichaTab, setSelectedFichaTab] = useState<string | undefined>(undefined);
  const [selectedFichaInfo, setSelectedFichaInfo] = useState<{ number: string; name: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accessDeniedWarning, setAccessDeniedWarning] = useState<string | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [selectedRelatedId, setSelectedRelatedId] = useState<string | null>(null);

  const userId = userProfile?.uid || currentUser?.uid || '';

  // PROMPT 41: Sincronización de ruta y sección institucional desde la URL actual
  const syncRouteFromCurrentUrl = useCallback(
    (role: UserRole) => {
      if (typeof window === 'undefined') return;

      let targetPath = window.location.pathname;
      let targetSearch = window.location.search;

      // Recuperar redirección pendiente de login si existía
      try {
        const pendingRedirect = window.sessionStorage.getItem('sena_pending_redirect');
        if (pendingRedirect) {
          window.sessionStorage.removeItem('sena_pending_redirect');
          const [pPath, pSearch] = pendingRedirect.split('?');
          if (pPath && pPath !== '/' && pPath !== '/login') {
            targetPath = pPath;
            targetSearch = pSearch ? `?${pSearch}` : '';
            window.history.replaceState(null, '', pendingRedirect);
          }
        }
      } catch {
        // Ignore
      }

      const parsed = parseCurrentUrl(targetPath, targetSearch, role);

      if (!parsed.isAuthorized) {
        setAccessDeniedWarning(
          parsed.unauthorizedReason ||
            'Acceso denegado: No cuentas con autorización institucional para acceder a esta sección.'
        );
        setActiveView('dashboard');
        setSelectedFichaId(null);
        setSelectedFichaInfo(null);
        setSelectedFichaTab(undefined);
        const safeUrl = buildCanonicalUrl(role, 'dashboard');
        window.history.replaceState(null, '', safeUrl);
        saveRoleNavigation(role, safeUrl);
        return;
      }

      setAccessDeniedWarning(null);
      setActiveView(parsed.viewId);
      setSelectedRelatedId(parsed.relatedId || null);

      if (parsed.viewId === 'fichas') {
        if (parsed.fichaId) {
          setSelectedFichaId(parsed.fichaId);
          const resolvedTab =
            parsed.tab ||
            getSavedFichaTab(role, parsed.fichaId) ||
            (role === 'instructor' ? 'summary' : 'activities');
          setSelectedFichaTab(resolvedTab);
        } else {
          setSelectedFichaId(null);
          setSelectedFichaInfo(null);
          setSelectedFichaTab(undefined);
        }
      } else {
        setSelectedFichaId(null);
        setSelectedFichaInfo(null);
        setSelectedFichaTab(undefined);
      }

      const canonical = buildCanonicalUrl(role, parsed.viewId, {
        fichaId: parsed.fichaId,
        tab: parsed.tab,
        relatedId: parsed.relatedId,
      });

      if (window.location.pathname !== canonical.split('?')[0]) {
        window.history.replaceState(null, '', canonical);
      }
      saveRoleNavigation(role, window.location.pathname + window.location.search);
    },
    []
  );

  // Inicialización y sincronización una vez validada la autenticación y el rol en Firestore
  useEffect(() => {
    if (!loading && isAuthenticated && userProfile) {
      const activeUserRole: UserRole = userProfile.role === 'instructor' ? 'instructor' : 'apprentice';
      syncRouteFromCurrentUrl(activeUserRole);
    }
  }, [loading, isAuthenticated, userProfile, syncRouteFromCurrentUrl]);

  // Si no está autenticado, almacenar URL solicitada en sessionStorage para preservarla post-login
  useEffect(() => {
    if (!loading && !isAuthenticated && typeof window !== 'undefined') {
      const cur = window.location.pathname + window.location.search;
      if (cur !== '/' && cur !== '/login') {
        try {
          window.sessionStorage.setItem('sena_pending_redirect', cur);
        } catch {
          // Ignore
        }
      }
    }
  }, [loading, isAuthenticated]);

  // Escuchar navegación del historial del navegador (Atrás / Adelante)
  useEffect(() => {
    const handlePopState = () => {
      if (!userProfile) return;
      const role: UserRole = userProfile.role === 'instructor' ? 'instructor' : 'apprentice';
      syncRouteFromCurrentUrl(role);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [userProfile, syncRouteFromCurrentUrl]);

  // Handlers para navegación y carga de Ficha
  const handleSelectFicha = useCallback(
    (fId: string, fObj?: { number: string; name?: string; programName?: string }, tab?: string) => {
      const role: UserRole = userProfile?.role === 'instructor' ? 'instructor' : 'apprentice';
      setSelectedFichaId(fId);

      const fichaName = fObj?.name || fObj?.programName || `Ficha ${fObj?.number || fId}`;
      const fichaNumber = fObj?.number || fId;
      setSelectedFichaInfo((prev) => {
        if (prev && prev.number === fichaNumber && prev.name === fichaName) return prev;
        return { number: fichaNumber, name: fichaName };
      });

      const rememberedTab =
        tab ||
        getSavedFichaTab(role, fId) ||
        (fObj?.number ? getSavedFichaTab(role, fObj.number) : null) ||
        (role === 'instructor' ? 'summary' : 'activities');

      setSelectedFichaTab(rememberedTab);
      saveFichaTab(role, fId, rememberedTab);
      if (fObj?.number) {
        saveFichaTab(role, fObj.number, rememberedTab);
      }

      if (typeof window !== 'undefined') {
        const url = buildCanonicalUrl(role, 'fichas', {
          fichaId: fId,
          fichaNumber: fObj?.number,
          tab: rememberedTab,
        });
        window.history.pushState(null, '', url);
        saveRoleNavigation(role, url);
      }
    },
    [userProfile]
  );

  const handleBackToList = useCallback(() => {
    const role: UserRole = userProfile?.role === 'instructor' ? 'instructor' : 'apprentice';
    setSelectedFichaId(null);
    setSelectedFichaInfo(null);
    setSelectedFichaTab(undefined);
    if (typeof window !== 'undefined') {
      const url = buildCanonicalUrl(role, 'fichas');
      window.history.pushState(null, '', url);
      saveRoleNavigation(role, url);
    }
  }, [userProfile]);

  const handleFichaTabChange = useCallback(
    (tab: string) => {
      const role: UserRole = userProfile?.role === 'instructor' ? 'instructor' : 'apprentice';
      setSelectedFichaTab(tab);
      if (selectedFichaId) {
        saveFichaTab(role, selectedFichaId, tab);
        if (selectedFichaInfo?.number) {
          saveFichaTab(role, selectedFichaInfo.number, tab);
        }
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState(null, '', url.pathname + url.search);
        saveRoleNavigation(role, url.pathname + url.search);
      }
    },
    [userProfile, selectedFichaId, selectedFichaInfo]
  );

  const handleFichaLoaded = useCallback((fObj: { number: string; name?: string; programName?: string }) => {
    const fichaName = fObj.name || fObj.programName || `Ficha ${fObj.number}`;
    setSelectedFichaInfo((prev) => {
      if (prev && prev.number === fObj.number && prev.name === fichaName) return prev;
      return { number: fObj.number, name: fichaName };
    });
  }, []);

  const handleNavigateApprentices = useCallback(() => {
    handleNavigate('apprentices');
  }, []);

  const handleNavigateActivities = useCallback(() => {
    handleNavigate('activities');
  }, []);

  // PROMPT 16: Suscripción en tiempo real al contador de notificaciones de Firestore
  useEffect(() => {
    if (!userId) {
      setUnreadNotificationsCount(0);
      return;
    }

    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      (liveNotifs) => {
        setUnreadNotificationsCount(liveNotifs.filter((n) => !n.isRead).length);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Modal para completar perfil si faltan datos en usuario de Google
  const [completeProfileOpen, setCompleteProfileOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && userProfile) {
      if (!userProfile.documentNumber || !userProfile.phone) {
        setCompleteProfileOpen(true);
      }
    }
  }, [isAuthenticated, userProfile]);

  // Manejar intento de acceso a vistas protegidas por rol
  const handleNavigate = useCallback(
    (viewId: string, relatedId?: string) => {
      setAccessDeniedWarning(null);
      const role: UserRole = userProfile?.role === 'instructor' ? 'instructor' : 'apprentice';
      const targetView = viewId === 'courses' ? 'fichas' : viewId;

      if (role === 'apprentice' && INSTRUCTOR_ONLY_VIEWS.has(targetView)) {
        setAccessDeniedWarning(
          `Acceso denegado: La sección "${targetView}" está restringida únicamente a Instructores autorizados.`
        );
        return;
      }

      if (targetView === 'fichas') {
        setSelectedFichaId(null);
        setSelectedFichaInfo(null);
        setSelectedFichaTab(undefined);
      } else {
        setSelectedFichaId(null);
        setSelectedFichaInfo(null);
        setSelectedFichaTab(undefined);
      }

      setSelectedRelatedId(relatedId || null);
      setActiveView(targetView);

      if (typeof window !== 'undefined') {
        const url = buildCanonicalUrl(role, targetView, { relatedId });
        window.history.pushState(null, '', url);
        saveRoleNavigation(role, url);
      }
    },
    [userProfile]
  );

  // 1. Estado de Carga Inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-12 h-12 rounded-2xl bg-[#00324D] border-2 border-[#39A900] flex items-center justify-center text-white shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-[#8CE665]" />
        </div>
        <div className="text-sm font-bold text-[#00324D]">Verificando sesión institucional...</div>
        <p className="text-xs text-slate-500">Firebase Authentication & Cloud Firestore</p>
      </div>
    );
  }

  // 2. Si no está autenticado, mostrar Login o Registro
  if (!isAuthenticated) {
    return authMode === 'login' ? (
      <LoginView onNavigateToRegister={() => setAuthMode('register')} />
    ) : (
      <RegisterView onNavigateToLogin={() => setAuthMode('login')} />
    );
  }

  // 3. Estado: Cuenta Bloqueada (Requisito 10)
  if (userProfile?.status === 'blocked') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-md max-w-md space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Acceso Bloqueado</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tu cuenta se encuentra bloqueada por disposición institucional. Comunícate con la coordinación de tu Centro de Formación.
          </p>
          <button
            onClick={() => logout()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Determinar rol activo real obtenido desde Firestore
  const currentRole: ActiveRole =
    activeView === 'blueprint' && isInstructor ? 'blueprint' : (userProfile?.role || 'apprentice');

  // Rutas para Breadcrumbs
  const getBreadcrumbs = () => {
    const roleLabel =
      activeView === 'blueprint'
        ? 'Blueprint'
        : isInstructor
        ? 'Panel Instructor'
        : 'Panel Aprendiz';

    // PROMPT 29: Breadcrumb jerárquico cuando el instructor está dentro de una Ficha específica
    if (activeView === 'fichas' && (selectedFichaId || selectedFichaInfo)) {
      return [
        { label: 'SENA Learning Hub', onClick: () => handleNavigate('dashboard') },
        { label: roleLabel },
        {
          label: 'Mis Fichas',
          onClick: handleBackToList,
        },
        {
          label: selectedFichaInfo
            ? `Ficha ${selectedFichaInfo.number} — ${selectedFichaInfo.name}`
            : selectedFichaId
            ? `Ficha ${selectedFichaId}`
            : 'Ficha de Formación',
          active: true,
        },
      ];
    }

    const viewLabels: Record<string, string> = {
      dashboard: 'Inicio',
      courses: 'Mis cursos',
      fichas: 'Mis fichas',
      apprentices: 'Aprendices y Expedientes',
      competencies: 'Competencias',
      learning_outcomes: 'Resultados de aprendizaje',
      activities: 'Actividades',
      submissions: 'Evidencias',
      grades: 'Calificaciones',
      attendance: 'Asistencia',
      tracking: 'Seguimiento',
      attention_calls: 'Llamados de atención',
      reports: 'Reportes',
      stats: 'Estadísticas',
      announcements: 'Anuncios',
      gamification: 'Gamificación',
      ai_tools: 'Herramientas IA',
      notifications: 'Notificaciones',
      profile: 'Mi Perfil / Expediente Académico',
      settings: 'Configuración',
      progress: 'Mi progreso',
      achievements: 'Mis logros',
      ranking: 'Ranking',
      blueprint: 'Especificación Arquitectura (Prompt 0)',
    };

    return [
      { label: 'SENA Learning Hub', onClick: () => handleNavigate('dashboard') },
      { label: roleLabel },
      { label: viewLabels[activeView] || activeView, active: true },
    ];
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Encabezado Global con Perfil Real */}
      <Header
        currentRole={currentRole}
        activeView={activeView}
        onNavigateNotifications={() => handleNavigate('notifications')}
        onNavigateProfile={() => handleNavigate(isInstructor ? 'settings' : 'profile')}
        onNavigateSettings={() => handleNavigate('settings')}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        onNavigateBlueprint={() => handleNavigate('blueprint')}
        unreadCount={unreadNotificationsCount}
      />

      {/* 2. Cuerpo Principal con Sidebar Desktop y Contenido */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar Desktop (Oculto en vista Blueprint) */}
        {activeView !== 'blueprint' && (
          <Sidebar
            currentRole={isInstructor ? 'instructor' : 'apprentice'}
            activeView={activeView}
            onNavigate={handleNavigate}
            unreadNotificationsCount={unreadNotificationsCount}
            className="hidden md:flex"
          />
        )}

        {/* Contenido Principal de las Vistas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-full overflow-x-hidden">
          {/* Breadcrumbs de Navegación */}
          <Breadcrumbs items={getBreadcrumbs()} />

          {/* Banner de Advertencia de Acceso Restringido */}
          {accessDeniedWarning && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{accessDeniedWarning}</span>
              </div>
              <button
                onClick={() => setAccessDeniedWarning(null)}
                className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Vistas según Rol y Estado */}
          {activeView === 'blueprint' && isInstructor ? (
            <Prompt0CockpitView />
          ) : isInstructor ? (
            /* ===== VISTAS PROTEGIDAS DEL INSTRUCTOR ===== */
            <>
              {activeView === 'dashboard' && (
                <InstructorDashboard
                  onNavigate={handleNavigate}
                  onOpenCreateActivity={() => handleNavigate('activities')}
                  onOpenCreateFicha={() => handleNavigate('fichas')}
                  onNavigateFicha={handleSelectFicha}
                />
              )}
              {activeView === 'fichas' && (
                <InstructorFichasView
                  selectedFichaId={selectedFichaId}
                  initialTab={selectedFichaTab}
                  onSelectFicha={handleSelectFicha}
                  onBackToList={handleBackToList}
                  onFichaLoaded={handleFichaLoaded}
                  onTabChange={handleFichaTabChange}
                  onNavigateToApprentices={handleNavigateApprentices}
                  onNavigateToActivities={handleNavigateActivities}
                />
              )}
              {activeView === 'apprentices' && <InstructorApprenticesView />}
              {activeView === 'competencies' && <InstructorCompetenciesView />}
              {activeView === 'learning_outcomes' && <InstructorLearningOutcomesView />}
              {activeView === 'activities' && (
                <InstructorActivitiesView
                  onNavigateToSubmissions={() => handleNavigate('submissions')}
                />
              )}
              {activeView === 'calendar' && (
                <InstructorCalendarView
                  onNavigateToSubmissions={(activityId) => handleNavigate('submissions')}
                  onNavigateToActivities={() => handleNavigate('activities')}
                />
              )}
              {activeView === 'submissions' && <InstructorSubmissionsView />}
              {activeView === 'grades' && <InstructorGradesView />}
              {activeView === 'attendance' && <InstructorAttendanceView />}
              {activeView === 'tracking' && <InstructorTrackingView />}
              {activeView === 'attention_calls' && <InstructorAttentionCallsView />}
              {activeView === 'reports' && <InstructorReportsView />}
              {activeView === 'stats' && <InstructorStatsView />}
              {activeView === 'announcements' && <InstructorAnnouncementsView />}
              {activeView === 'gamification' && <InstructorGamificationView />}
              {activeView === 'ai_tools' && <InstructorAiToolsView />}
              {activeView === 'notifications' && (
                <NotificationsCenterView onNavigate={handleNavigate} />
              )}
              {activeView === 'settings' && <InstructorSettingsView />}
            </>
          ) : (
            /* ===== VISTAS PROTEGIDAS DEL APRENDIZ ===== */
            <>
              {activeView === 'dashboard' && (
                <ApprenticeDashboard
                  onNavigate={handleNavigate}
                  onOpenActivity={() => handleNavigate('activities')}
                />
              )}
              {activeView === 'fichas' && (
                <ApprenticeFichasView
                  selectedFichaId={selectedFichaId}
                  initialTab={selectedFichaTab}
                  onSelectFicha={handleSelectFicha}
                  onBackToList={handleBackToList}
                  onTabChange={handleFichaTabChange}
                  onNavigateToView={handleNavigate}
                />
              )}
              {activeView === 'activities' && (
                <ApprenticeActivitiesView initialActivityId={selectedRelatedId || undefined} />
              )}
              {activeView === 'calendar' && (
                <ApprenticeCalendarView
                  onNavigateToActivities={(activityId) => handleNavigate('activities')}
                  onNavigateToSubmissions={(activityId) => handleNavigate('submissions')}
                />
              )}
              {activeView === 'submissions' && <ApprenticeSubmissionsView />}
              {activeView === 'grades' && <ApprenticeGradesView />}
              {activeView === 'attendance_tracking' && (
                <ApprenticeTrackingView initialCallId={selectedRelatedId || undefined} />
              )}
              {activeView === 'progress' && <ApprenticeProgressView />}
              {activeView === 'achievements' && <ApprenticeAchievementsView />}
              {activeView === 'ranking' && <ApprenticeRankingView />}
              {activeView === 'ai_tools' && <ApprenticeAiToolsView />}
              {activeView === 'profile' && <ApprenticeProfileView />}
              {activeView === 'notifications' && (
                <NotificationsCenterView onNavigate={handleNavigate} />
              )}
              {activeView === 'settings' && <ApprenticeSettingsView />}
            </>
          )}
        </main>
      </div>

      {/* 3. Navegación Móvil (Drawer deslizable + Barra Inferior Táctil) */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentRole={isInstructor ? 'instructor' : 'apprentice'}
        activeView={activeView}
        onNavigate={handleNavigate}
        unreadCount={unreadNotificationsCount}
      />

      {/* Modal para completar datos de perfil */}
      <CompleteProfileModal
        isOpen={completeProfileOpen}
        onClose={() => setCompleteProfileOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
