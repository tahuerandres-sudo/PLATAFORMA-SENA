/**
 * @license
 * SENA Learning Hub
 * PROMPT 2 — USUARIOS, AUTENTICACIÓN Y ROLES (FIREBASE AUTH & FIRESTORE)
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header, ActiveRole } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Breadcrumbs } from './components/ui/Breadcrumbs';

// Vistas de Autenticación
import { LoginView } from './views/auth/LoginView';
import { RegisterView } from './views/auth/RegisterView';
import { CompleteProfileModal } from './views/auth/CompleteProfileModal';

// Vistas del Instructor
import { InstructorDashboard } from './views/instructor/InstructorDashboard';
import { InstructorCoursesView } from './views/instructor/InstructorCoursesView';
import { InstructorFichasView } from './views/instructor/InstructorFichasView';
import { InstructorApprenticesView } from './views/instructor/InstructorApprenticesView';
import { InstructorCompetenciesView } from './views/instructor/InstructorCompetenciesView';
import { InstructorLearningOutcomesView } from './views/instructor/InstructorLearningOutcomesView';
import { InstructorActivitiesView } from './views/instructor/InstructorActivitiesView';
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
import { ApprenticeCoursesView } from './views/apprentice/ApprenticeCoursesView';
import { ApprenticeActivitiesView } from './views/apprentice/ApprenticeActivitiesView';
import { ApprenticeSubmissionsView } from './views/apprentice/ApprenticeSubmissionsView';
import { ApprenticeGradesView } from './views/apprentice/ApprenticeGradesView';
import { ApprenticeProgressView } from './views/apprentice/ApprenticeProgressView';
import { ApprenticeAchievementsView } from './views/apprentice/ApprenticeAchievementsView';
import { ApprenticeRankingView } from './views/apprentice/ApprenticeRankingView';
import { ApprenticeProfileView } from './views/apprentice/ApprenticeProfileView';
import { ApprenticeSettingsView } from './views/apprentice/ApprenticeSettingsView';
import { ApprenticeTrackingView } from './views/apprentice/ApprenticeTrackingView';

// Vistas Comunes
import { NotificationsCenterView } from './views/common/NotificationsCenterView';
import { Prompt0CockpitView } from './views/common/Prompt0CockpitView';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accessDeniedWarning, setAccessDeniedWarning] = useState<string | null>(null);

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
  const handleNavigate = (viewId: string) => {
    setAccessDeniedWarning(null);

    // Lista de vistas exclusivas del instructor
    const instructorOnlyViews = [
      'fichas',
      'apprentices',
      'competencies',
      'learning_outcomes',
      'attendance',
      'tracking',
      'attention_calls',
      'reports',
      'stats',
      'ai_tools',
    ];
    if (isApprentice && instructorOnlyViews.includes(viewId)) {
      setAccessDeniedWarning(
        `Acceso denegado: La sección "${viewId}" está restringida únicamente a Instructores autorizados.`
      );
      return;
    }

    setActiveView(viewId);
  };

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
  const currentRole: ActiveRole = activeView === 'blueprint' ? 'blueprint' : (userProfile?.role || 'apprentice');

  // Rutas para Breadcrumbs
  const getBreadcrumbs = () => {
    const roleLabel =
      activeView === 'blueprint'
        ? 'Blueprint'
        : isInstructor
        ? 'Panel Instructor'
        : 'Panel Aprendiz';

    const viewLabels: Record<string, string> = {
      dashboard: 'Inicio',
      courses: 'Mis cursos',
      fichas: 'Mis fichas',
      apprentices: 'Aprendices',
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
      profile: 'Perfil',
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
        onNavigateNotifications={() => handleNavigate('notifications')}
        onNavigateProfile={() => handleNavigate(isInstructor ? 'settings' : 'profile')}
        onNavigateSettings={() => handleNavigate('settings')}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        onNavigateBlueprint={() => handleNavigate('blueprint')}
        unreadCount={2}
      />

      {/* 2. Cuerpo Principal con Sidebar Desktop y Contenido */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar Desktop (Oculto en vista Blueprint) */}
        {activeView !== 'blueprint' && (
          <Sidebar
            currentRole={isInstructor ? 'instructor' : 'apprentice'}
            activeView={activeView}
            onNavigate={handleNavigate}
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
          {activeView === 'blueprint' ? (
            <Prompt0CockpitView />
          ) : isInstructor ? (
            /* ===== VISTAS PROTEGIDAS DEL INSTRUCTOR ===== */
            <>
              {activeView === 'dashboard' && (
                <InstructorDashboard
                  onNavigate={handleNavigate}
                  onOpenCreateActivity={() => handleNavigate('activities')}
                  onOpenCreateFicha={() => handleNavigate('fichas')}
                />
              )}
              {activeView === 'courses' && (
                <InstructorCoursesView
                  onNavigateToActivities={() => handleNavigate('activities')}
                />
              )}
              {activeView === 'fichas' && (
                <InstructorFichasView
                  onSelectFicha={() => handleNavigate('apprentices')}
                  onNavigateToApprentices={() => handleNavigate('apprentices')}
                  onNavigateToActivities={() => handleNavigate('activities')}
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
              {activeView === 'notifications' && <NotificationsCenterView />}
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
              {activeView === 'courses' && (
                <ApprenticeCoursesView
                  onNavigateToActivities={() => handleNavigate('activities')}
                />
              )}
              {activeView === 'activities' && <ApprenticeActivitiesView />}
              {activeView === 'submissions' && <ApprenticeSubmissionsView />}
              {activeView === 'grades' && <ApprenticeGradesView />}
              {activeView === 'attendance_tracking' && <ApprenticeTrackingView />}
              {activeView === 'progress' && <ApprenticeProgressView />}
              {activeView === 'achievements' && <ApprenticeAchievementsView />}
              {activeView === 'ranking' && <ApprenticeRankingView />}
              {activeView === 'profile' && <ApprenticeProfileView />}
              {activeView === 'notifications' && <NotificationsCenterView />}
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
        unreadCount={2}
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
