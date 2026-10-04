/**
 * @license
 * SENA Learning Hub - Centro de Notificaciones Académicas Integral
 * PROMPT 16: Conexión 100% real con Firestore, filtros por categoría, paginación, acciones y navegación
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Award,
  FileText,
  Megaphone,
  AlertTriangle,
  ShieldAlert,
  FileCheck,
  Calendar,
  Sparkles,
  Trophy,
  Trash2,
  ExternalLink,
  RefreshCw,
  Filter,
  Check,
  Clock,
  ChevronRight,
  AlertCircle,
  Inbox,
  Flame,
} from 'lucide-react';
import {
  notificationService,
  AppNotification,
  NotificationCategoryFilter,
  getNotificationCategory,
  formatTimeAgo,
} from '../../services/academic/notificationService';
import { useAuth } from '../../hooks/useAuth';

export interface NotificationsCenterViewProps {
  onNavigate?: (view: string, relatedId?: string) => void;
}

export const NotificationsCenterView: React.FC<NotificationsCenterViewProps> = ({ onNavigate }) => {
  const { userProfile, currentUser } = useAuth();
  const userId = userProfile?.uid || currentUser?.uid || '';
  const isInstructor = userProfile?.role === 'instructor';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<NotificationCategoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Suscripción reactiva en tiempo real (onSnapshot)
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      (liveNotifs) => {
        setNotifications(liveNotifs);
        setHasMore(liveNotifs.length >= pageSize);
        setLoading(false);
      },
      pageSize
    );

    return () => unsubscribe();
  }, [userId, pageSize]);

  const showFeedback = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n))
      );
    } catch (err) {
      console.warn('Error marcando como leída:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    try {
      await notificationService.markAllAsRead(userId);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, read: true }))
      );
      showFeedback('Todas las notificaciones fueron marcadas como leídas.');
    } catch (err) {
      console.warn('Error marcando todas como leídas:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showFeedback('Notificación eliminada.');
    } catch (err) {
      console.warn('Error eliminando notificación:', err);
    }
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    setPageSize((prev) => prev + 20);
    setTimeout(() => setLoadingMore(false), 400);
  };

  const handleOpenRelated = (item: AppNotification) => {
    // Si aún no está leída, marcarla automáticamente al interactuar
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }

    if (!onNavigate) return;

    const cat = getNotificationCategory(item.type);

    switch (cat) {
      case 'activities':
        onNavigate('activities', item.relatedId);
        break;

      case 'evidence':
        onNavigate('submissions', item.relatedId);
        break;

      case 'announcements':
        onNavigate(isInstructor ? 'announcements' : 'dashboard', item.relatedId);
        break;

      case 'academic':
        onNavigate(isInstructor ? 'tracking' : 'attendance_tracking', item.relatedId);
        break;

      case 'gamification':
        onNavigate(isInstructor ? 'gamification' : 'achievements', item.relatedId);
        break;

      default:
        break;
    }
  };

  // Filtrado de notificaciones en cliente acotado al usuario
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !n.isRead;
      return getNotificationCategory(n.type) === filter;
    });
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Renderizado del icono según tipo de notificación
  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'ACTIVITY_PUBLISHED':
      case 'ACTIVITY_UPDATED':
      case 'ACTIVITY_DUE_SOON':
      case 'activity':
        return {
          icon: <FileText className="w-4 h-4 text-blue-600" />,
          bg: 'bg-blue-50 border-blue-200',
          badgeText: 'Actividad',
          badgeColor: 'text-blue-700 bg-blue-100',
        };

      case 'EVIDENCE_APPROVED':
        return {
          icon: <Award className="w-4 h-4 text-[#39A900]" />,
          bg: 'bg-[#EBF8E7] border-[#8CE665]/50',
          badgeText: 'Aprobada (A)',
          badgeColor: 'text-[#2E8500] bg-[#EBF8E7]',
        };

      case 'EVIDENCE_NOT_APPROVED':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
          bg: 'bg-rose-50 border-rose-200',
          badgeText: 'No Aprobada (N)',
          badgeColor: 'text-rose-700 bg-rose-100',
        };

      case 'EVIDENCE_CORRECTION_REQUIRED':
      case 'CORRECTION_REQUIRED':
        return {
          icon: <Clock className="w-4 h-4 text-amber-600" />,
          bg: 'bg-amber-50 border-amber-200',
          badgeText: 'Por Corregir (C)',
          badgeColor: 'text-amber-800 bg-amber-100',
        };

      case 'EVIDENCE_SUBMITTED':
      case 'EVIDENCE_RESUBMITTED':
      case 'grade':
      case 'feedback':
        return {
          icon: <FileCheck className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200',
          badgeText: 'Evidencia',
          badgeColor: 'text-emerald-700 bg-emerald-100',
        };

      case 'ANNOUNCEMENT_PUBLISHED':
      case 'ANNOUNCEMENT':
      case 'announcement':
        return {
          icon: <Megaphone className="w-4 h-4 text-purple-600" />,
          bg: 'bg-purple-50 border-purple-200',
          badgeText: 'Anuncio',
          badgeColor: 'text-purple-700 bg-purple-100',
        };

      case 'ATTENDANCE_ABSENCE':
      case 'ATTENDANCE_LATE':
      case 'ATTENDANCE_ALERT':
        return {
          icon: <Calendar className="w-4 h-4 text-orange-600" />,
          bg: 'bg-orange-50 border-orange-200',
          badgeText: 'Asistencia',
          badgeColor: 'text-orange-700 bg-orange-100',
        };

      case 'ATTENTION_CALL':
      case 'attention_call':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          bg: 'bg-rose-50 border-rose-200',
          badgeText: 'Llamado Atención',
          badgeColor: 'text-rose-800 bg-rose-100',
        };

      case 'ACADEMIC_RESTRICTION':
      case 'restriction':
        return {
          icon: <ShieldAlert className="w-4 h-4 text-red-600" />,
          bg: 'bg-red-50 border-red-200',
          badgeText: 'Restricción',
          badgeColor: 'text-red-800 bg-red-100',
        };

      case 'JUSTIFICATION_RECEIVED':
      case 'JUSTIFICATION_APPROVED':
      case 'justification':
        return {
          icon: <FileCheck className="w-4 h-4 text-teal-600" />,
          bg: 'bg-teal-50 border-teal-200',
          badgeText: 'Justificación',
          badgeColor: 'text-teal-700 bg-teal-100',
        };

      case 'LEVEL_UP':
        return {
          icon: <Flame className="w-4 h-4 text-amber-500" />,
          bg: 'bg-amber-50 border-amber-300',
          badgeText: 'Subida de Nivel',
          badgeColor: 'text-amber-800 bg-amber-100',
        };

      case 'BADGE_EARNED':
        return {
          icon: <Sparkles className="w-4 h-4 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-200',
          badgeText: 'Insignia',
          badgeColor: 'text-indigo-700 bg-indigo-100',
        };

      case 'ACHIEVEMENT_EARNED':
        return {
          icon: <Trophy className="w-4 h-4 text-yellow-600" />,
          bg: 'bg-yellow-50 border-yellow-200',
          badgeText: 'Logro',
          badgeColor: 'text-yellow-800 bg-yellow-100',
        };

      default:
        return {
          icon: <Bell className="w-4 h-4 text-slate-500" />,
          bg: 'bg-slate-100 border-slate-200',
          badgeText: 'Aviso',
          badgeColor: 'text-slate-700 bg-slate-100',
        };
    }
  };

  const filterTabs: Array<{ id: NotificationCategoryFilter; label: string; count?: number }> = [
    { id: 'all', label: 'Todas', count: notifications.length },
    { id: 'unread', label: 'No leídas', count: unreadCount },
    { id: 'activities', label: 'Actividades' },
    { id: 'evidence', label: 'Evidencias' },
    { id: 'announcements', label: 'Anuncios' },
    { id: 'academic', label: 'Académico' },
    { id: 'gamification', label: 'Gamificación' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Encabezado Principal */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#00324D] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#00324D] tracking-tight">
                Centro de Notificaciones
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                  {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Registro académico de actividades, entregas evaluadas, novedades y logros institucionales en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#EBF8E7] text-[#2E8500] hover:bg-[#d8f3cf] transition-colors cursor-pointer border border-[#8CE665]/40"
              title="Marcar todas como leídas"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Marcar todas como leídas</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Feedback Transitorio */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Barra de Filtros con Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {filterTabs.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#00324D] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Listado de Notificaciones */}
      <div className="space-y-3">
        {loading && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
            <p className="text-xs text-slate-500">Cargando notificaciones institucionales...</p>
          </div>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {filter === 'unread' ? "You're all caught up." : 'You have no notifications.'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {filter === 'unread'
                  ? 'No tienes notificaciones pendientes de lectura en este momento.'
                  : 'No se encontraron notificaciones en esta categoría para tu usuario.'}
              </p>
            </div>
          </div>
        )}

        {!loading &&
          filteredNotifications.map((item) => {
            const visual = renderNotificationIcon(item.type);

            return (
              <div
                key={item.id}
                onClick={() => handleOpenRelated(item)}
                className={`group p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 sm:gap-4 relative ${
                  !item.isRead
                    ? 'bg-white border-[#39A900]/50 shadow-xs hover:border-[#39A900]'
                    : 'bg-white/80 border-slate-200 hover:border-slate-300 opacity-90'
                }`}
              >
                {/* Indicador visual de no leído */}
                {!item.isRead && (
                  <span
                    className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[#39A900] ring-4 ring-emerald-50 shrink-0"
                    title="No leída"
                  />
                )}

                {/* Icono de la Categoría */}
                <div
                  className={`w-10 h-10 rounded-xl ${visual.bg} border flex items-center justify-center shrink-0 mt-0.5`}
                >
                  {visual.icon}
                </div>

                {/* Contenido de la Notificación */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${visual.badgeColor}`}
                    >
                      {visual.badgeText}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.timeAgo || formatTimeAgo(item.createdAt)}
                    </span>
                  </div>

                  <h3
                    className={`text-sm mt-1.5 leading-snug font-bold ${
                      !item.isRead ? 'text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                    {item.message || item.description}
                  </p>

                  {/* Acciones Rápidas en la Fila */}
                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100/80">
                    {item.relatedId && (
                      <span className="text-xs font-bold text-[#2E8500] hover:underline flex items-center gap-1">
                        <span>Ver detalle</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}

                    {!item.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        Marcar como leída
                      </button>
                    )}

                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors ml-auto flex items-center gap-1 cursor-pointer"
                      title="Eliminar notificación"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

        {/* Botón Paginación / Cargar Más */}
        {!loading && hasMore && filter === 'all' && (
          <div className="text-center pt-2">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#00324D] hover:bg-slate-50 transition-colors cursor-pointer shadow-xs inline-flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#39A900]" />
                  <span>Cargando más notificaciones...</span>
                </>
              ) : (
                <>
                  <span>Cargar más notificaciones</span>
                  <span className="text-slate-400">({notifications.length} cargadas)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
