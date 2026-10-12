/**
 * @license
 * SENA Learning Hub - Global Application Header con Firebase Auth
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap,
  Bell,
  ChevronDown,
  User,
  Shield,
  Layers,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { SENA_BRAND } from '../../config/constants';
import { notificationService, AppNotification } from '../../services/academic/notificationService';
import { useAuth } from '../../hooks/useAuth';
import { RolePromotionModal } from '../common/RolePromotionModal';

export type ActiveRole = 'instructor' | 'apprentice' | 'blueprint';

export type ActiveTopMenu = 'notifications' | 'profile' | null;

interface HeaderProps {
  currentRole: ActiveRole;
  onNavigateNotifications: () => void;
  onNavigateProfile: () => void;
  onNavigateSettings: () => void;
  onToggleMobileMenu: () => void;
  onNavigateBlueprint: () => void;
  unreadCount?: number;
  activeView?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onNavigateNotifications,
  onNavigateProfile,
  onNavigateSettings,
  onToggleMobileMenu,
  onNavigateBlueprint,
  unreadCount,
  activeView,
}) => {
  const { userProfile, currentUser, logout, isAuthenticated, isInstructor, isApprentice } = useAuth();
  
  // PROMPT 47: Estado único controlado para los menús desplegables de la barra superior.
  // Evita paneles múltiples desplegados en simultáneo y permite alternancia y cierre automático.
  const [activeMenu, setActiveMenu] = useState<ActiveTopMenu>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Referencias a los contenedores de los menús para detección de clics externos
  const notificationsContainerRef = useRef<HTMLDivElement>(null);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  const userId = userProfile?.uid || currentUser?.uid || '';

  // PROMPT 44: Control de visibilidad estricto según rol verificado en Firestore.
  const verifiedRole = userProfile?.role;
  const isApprenticeRole = verifiedRole === 'apprentice' || (!verifiedRole && currentRole === 'apprentice') || isApprentice;
  const isInstructorOrAdmin = !isApprenticeRole && (verifiedRole === 'instructor' || currentRole === 'instructor' || isInstructor || (verifiedRole && (verifiedRole as string) !== 'apprentice'));

  // PROMPT 47: Cierre automático al hacer clic fuera de los menús desplegables
  useEffect(() => {
    if (!activeMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (activeMenu === 'notifications') {
        if (notificationsContainerRef.current && !notificationsContainerRef.current.contains(target)) {
          // Si el usuario hace clic en el disparador del perfil, permitimos que el toggle del perfil maneje la transición
          if (profileContainerRef.current && profileContainerRef.current.contains(target)) {
            return;
          }
          setActiveMenu(null);
        }
      } else if (activeMenu === 'profile') {
        if (profileContainerRef.current && !profileContainerRef.current.contains(target)) {
          // Si el usuario hace clic en el disparador de notificaciones, permitimos que la campana maneje la transición
          if (notificationsContainerRef.current && notificationsContainerRef.current.contains(target)) {
            return;
          }
          setActiveMenu(null);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu]);

  // PROMPT 47: Cerrar menús al cambiar de vista, rol o sección
  useEffect(() => {
    setActiveMenu(null);
  }, [activeView, currentRole]);

  // PROMPT 47: Cerrar menús al navegar en el historial del navegador (Atrás / Adelante / Hash)
  useEffect(() => {
    const handleNavigation = () => {
      setActiveMenu(null);
    };

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  // Suscripción reactiva en tiempo real a las notificaciones desde Firestore
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      (liveNotifs) => {
        setNotifications(liveNotifs);
      },
      8
    );

    return () => unsubscribe();
  }, [userId]);

  const realUnreadCount = notifications.filter((n) => !n.isRead).length;
  const effectiveUnreadCount = typeof unreadCount === 'number' ? unreadCount : realUnreadCount;

  const displayName = userProfile?.displayName || currentUser?.displayName || 'Usuario SENA';
  const displayEmail = userProfile?.email || currentUser?.email || '';
  const displayPhoto =
    userProfile?.photoURL ||
    currentUser?.photoURL ||
    (userProfile?.role === 'instructor'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80');

  const roleLabel = userProfile?.role === 'instructor' ? 'Instructor SENA' : 'Aprendiz SENA';

  const markAllAsRead = async () => {
    if (!userId) return;
    await notificationService.markAllAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await notificationService.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true, read: true } : n))
      );
    }
    setActiveMenu(null);
    onNavigateNotifications();
  };

  const handleLogout = async () => {
    setActiveMenu(null);
    await logout();
  };

  const handleToggleNotifications = useCallback(() => {
    setActiveMenu((prev) => (prev === 'notifications' ? null : 'notifications'));
  }, []);

  const handleToggleProfile = useCallback(() => {
    setActiveMenu((prev) => (prev === 'profile' ? null : 'profile'));
  }, []);

  return (
    <header className="bg-[#00324D] text-white border-b-4 border-[#39A900] sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Lado Izquierdo: Botón Menú Móvil + Identidad SENA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveMenu(null);
              onToggleMobileMenu();
            }}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#39A900] flex items-center justify-center font-bold text-lg text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  {SENA_BRAND.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 hidden sm:block">
                Formación Integral y Bilingüismo · Firebase Real Auth
              </p>
            </div>
          </div>
        </div>

        {/* Centro: Indicador de Rol Autenticado Real + Acceso al Blueprint (solo para instructores/administradores) */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/80">
            <span className="w-2 h-2 rounded-full bg-[#39A900] animate-pulse" />
            <span className="text-slate-300 text-[11px]">Rol Verificado (Firestore):</span>
            <span className="font-bold text-[#8CE665] uppercase tracking-wider text-[11px]">
              {userProfile?.role || currentRole}
            </span>
            {isInstructorOrAdmin && (
              <button
                onClick={() => {
                  setActiveMenu(null);
                  setShowPromotionModal(true);
                }}
                className="ml-1 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 transition-colors cursor-pointer"
                title="Autorizar como Instructor con clave institucional"
              >
                Autorizar Instructor
              </button>
            )}
          </div>

          {isInstructorOrAdmin && (
            <button
              onClick={() => {
                setActiveMenu(null);
                onNavigateBlueprint();
              }}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                currentRole === 'blueprint'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700'
              }`}
              title="Ver especificación de arquitectura y contratos"
            >
              <Layers className="w-3.5 h-3.5 text-amber-300" />
              <span>Blueprint</span>
            </button>
          )}
        </div>

        {/* Lado Derecho: Notificaciones + Perfil */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Campanita de Notificaciones (PROMPT 16 y PROMPT 47) */}
          <div ref={notificationsContainerRef} className="relative">
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`p-2 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 relative transition-colors cursor-pointer ${
                activeMenu === 'notifications' ? 'bg-slate-800/90 text-white ring-1 ring-[#39A900]/40' : ''
              }`}
              aria-label="Ver notificaciones"
              aria-expanded={activeMenu === 'notifications'}
            >
              <Bell className="w-5 h-5" />
              {effectiveUnreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#00324D] shadow-xs">
                  {effectiveUnreadCount > 99 ? '99+' : effectiveUnreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Notificaciones Rápidas */}
            {activeMenu === 'notifications' && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#00324D]">Notificaciones</span>
                    {effectiveUnreadCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {effectiveUnreadCount} unread
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Al día</span>
                    )}
                  </div>
                  {effectiveUnreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-[#2E8500] hover:underline font-semibold cursor-pointer"
                    >
                      Marcar leídas
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      <p className="font-medium text-slate-700">You're all caught up.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">No tienes notificaciones pendientes.</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 text-xs hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-2.5 ${
                          !n.isRead ? 'bg-[#EBF8E7]/40' : ''
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: !n.isRead ? '#39A900' : 'transparent' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <span className={`font-semibold leading-snug line-clamp-1 ${!n.isRead ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {n.timeAgo}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message || n.description}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setActiveMenu(null);
                      onNavigateNotifications();
                    }}
                    className="text-xs font-semibold text-[#00324D] hover:text-[#39A900] transition-colors cursor-pointer w-full py-1"
                  >
                    Ver todas las notificaciones →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Menú de Perfil de Usuario Real (PROMPT 47) */}
          <div ref={profileContainerRef} className="relative">
            <button
              type="button"
              onClick={handleToggleProfile}
              className={`flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer ${
                activeMenu === 'profile' ? 'bg-slate-800/90 ring-1 ring-[#39A900]/40' : ''
              }`}
              aria-label="Menú de usuario"
              aria-expanded={activeMenu === 'profile'}
            >
              <img
                src={displayPhoto}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-[#39A900]"
              />
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-white max-w-[140px] truncate leading-tight">
                  {displayName}
                </div>
                <div className="text-[10px] text-[#8CE665] font-semibold">
                  {roleLabel}
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform duration-150 ${activeMenu === 'profile' ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* Dropdown del perfil */}
            {activeMenu === 'profile' && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 text-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-[#00324D] truncate">{displayName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{displayEmail}</div>
                  <div className="mt-1 text-[10px] inline-block font-semibold text-[#2E8500] bg-[#EBF8E7] px-2 py-0.5 rounded">
                    Rol: {userProfile?.role === 'instructor' ? 'Instructor' : 'Aprendiz'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onNavigateProfile();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  Ver Perfil Institucional
                </button>

                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onNavigateSettings();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  Configuración de Cuenta
                </button>

                {/* Opción administrativa de desarrollo para autorizar rol Instructor */}
                {userProfile?.role !== 'instructor' && (
                  <button
                    onClick={() => {
                      setActiveMenu(null);
                      setShowPromotionModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-[#00324D] hover:bg-slate-50 flex items-center gap-2 font-semibold cursor-pointer border-t border-slate-100"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#39A900]" />
                    <span>Habilitar Rol Instructor</span>
                  </button>
                )}

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Administrativo de Promoción de Rol */}
      <RolePromotionModal
        isOpen={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
      />
    </header>
  );
};
