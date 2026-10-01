/**
 * @license
 * SENA Learning Hub - Centro de Notificaciones Completo
 */

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, Award, FileText, Megaphone, AlertTriangle, ShieldAlert, FileCheck } from 'lucide-react';
import { notificationService, AppNotification } from '../../services/academic/notificationService';
import { useAuth } from '../../hooks/useAuth';

export const NotificationsCenterView: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const userId = userProfile?.uid || currentUser?.uid || 'appr_juan_perez';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(userId);
      setNotifications(data);
    } catch (err) {
      console.warn('Error cargando notificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const toggleRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.isRead : true));

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#00324D]">Centro de Notificaciones</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Avisos de calificaciones, entregas, anuncios y logros de formación
          </p>
        </div>

        <button
          onClick={markAllAsRead}
          className="text-xs font-semibold text-[#2E8500] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" />
          Marcar todas como leídas
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
            filter === 'all' ? 'bg-[#00324D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todas ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
            filter === 'unread' ? 'bg-[#39A900] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          No leídas ({notifications.filter((n) => !n.isRead).length})
        </button>
      </div>

      {/* Lista de Notificaciones (Requisito 17) */}
      <div className="space-y-3">
        {filtered.map((item) => {
          let icon = <Bell className="w-4 h-4 text-slate-500" />;
          let iconBg = 'bg-slate-100';

          if (item.type === 'grade') {
            icon = <Award className="w-4 h-4 text-[#39A900]" />;
            iconBg = 'bg-[#EBF8E7]';
          } else if (item.type === 'activity') {
            icon = <FileText className="w-4 h-4 text-blue-600" />;
            iconBg = 'bg-blue-50';
          } else if (item.type === 'reminder') {
            icon = <Clock className="w-4 h-4 text-amber-600" />;
            iconBg = 'bg-amber-50';
          } else if (item.type === 'attention_call') {
            icon = <AlertTriangle className="w-4 h-4 text-rose-600" />;
            iconBg = 'bg-rose-50';
          } else if (item.type === 'restriction') {
            icon = <ShieldAlert className="w-4 h-4 text-amber-600" />;
            iconBg = 'bg-amber-50';
          } else if (item.type === 'justification') {
            icon = <FileCheck className="w-4 h-4 text-emerald-600" />;
            iconBg = 'bg-emerald-50';
          }

          return (
            <div
              key={item.id}
              onClick={() => toggleRead(item.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                !item.isRead
                  ? 'bg-white border-[#39A900]/40 shadow-xs'
                  : 'bg-white/70 border-slate-200 opacity-80'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                {icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{item.title}</h4>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#39A900] shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                <span className="text-[10px] text-slate-400 mt-1.5 block">{item.timeAgo}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
