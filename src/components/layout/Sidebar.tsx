/**
 * @license
 * SENA Learning Hub - Responsive Desktop & Tablet Sidebar
 */

import React from 'react';
import {
  Home,
  BookOpen,
  Users,
  UserCheck,
  Target,
  ListOrdered,
  FileText,
  FolderArchive,
  Award,
  CalendarCheck,
  Calendar,
  ClipboardList,
  AlertTriangle,
  BarChart3,
  Megaphone,
  Gamepad2,
  Sparkles,
  Bell,
  Settings,
  Trophy,
  CheckCircle2,
  Medal,
  User,
} from 'lucide-react';
import { ActiveRole } from './Header';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface SidebarProps {
  currentRole: ActiveRole;
  activeView: string;
  onNavigate: (viewId: string) => void;
  unreadNotificationsCount?: number;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeView,
  onNavigate,
  unreadNotificationsCount,
  className = '',
}) => {
  const notifBadge =
    typeof unreadNotificationsCount === 'number' && unreadNotificationsCount > 0
      ? String(unreadNotificationsCount)
      : undefined;

  // Menú oficial y ordenado para el Instructor (Prompt 3 - Requisito 22)
  const instructorNavItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'courses', label: 'Mis cursos', icon: BookOpen },
    { id: 'fichas', label: 'Mis fichas', icon: Users, badge: '4' },
    { id: 'apprentices', label: 'Aprendices y Expedientes', icon: UserCheck, badge: '128' },
    { id: 'competencies', label: 'Competencias', icon: Target },
    { id: 'learning_outcomes', label: 'Resultados de aprendizaje', icon: ListOrdered },
    { id: 'activities', label: 'Actividades', icon: FileText, badge: '4' },
    { id: 'calendar', label: 'Calendario Académico', icon: Calendar },
    { id: 'submissions', label: 'Evidencias', icon: FolderArchive, badge: '4' },
    { id: 'grades', label: 'Calificaciones', icon: Award },
    { id: 'attendance', label: 'Asistencia', icon: CalendarCheck },
    { id: 'tracking', label: 'Seguimiento', icon: ClipboardList },
    { id: 'attention_calls', label: 'Llamados de atención', icon: AlertTriangle, badge: '2' },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'announcements', label: 'Anuncios', icon: Megaphone },
    { id: 'gamification', label: 'Gamificación', icon: Gamepad2 },
    { id: 'ai_tools', label: 'Herramientas IA', icon: Sparkles },
    { id: 'notifications', label: 'Notificaciones', icon: Bell, badge: notifBadge },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const apprenticeNavItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'courses', label: 'Mis cursos', icon: BookOpen },
    { id: 'activities', label: 'Mis actividades', icon: FileText, badge: '2' },
    { id: 'calendar', label: 'Calendario Académico', icon: Calendar },
    { id: 'submissions', label: 'Mis evidencias', icon: FolderArchive },
    { id: 'grades', label: 'Mis calificaciones', icon: Award },
    { id: 'announcements', label: 'Anuncios', icon: Megaphone },
    { id: 'attendance_tracking', label: 'Asistencia y Justificaciones', icon: CalendarCheck },
    { id: 'progress', label: 'Mi progreso', icon: BarChart3 },
    { id: 'achievements', label: 'Mis logros', icon: Trophy },
    { id: 'ranking', label: 'Ranking', icon: Medal },
    { id: 'ai_tools', label: 'Herramientas IA', icon: Sparkles },
    { id: 'notifications', label: 'Notificaciones', icon: Bell, badge: notifBadge },
    { id: 'profile', label: 'Mi Perfil / Expediente', icon: User },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const items = currentRole === 'instructor' ? instructorNavItems : apprenticeNavItems;

  return (
    <aside
      className={`w-64 shrink-0 bg-white border-r border-slate-200/90 flex flex-col justify-between py-4 select-none ${className}`}
    >
      <div className="space-y-6">
        {/* Encabezado del Menú */}
        <div className="px-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {currentRole === 'instructor' ? 'Panel Instructor' : 'Panel Aprendiz'}
          </div>
          <div className="text-xs font-semibold text-[#00324D] mt-0.5 truncate">
            {currentRole === 'instructor' ? 'Gestión de Formación' : 'Mi Ruta de Aprendizaje'}
          </div>
        </div>

        {/* Lista de Enlaces */}
        <nav className="space-y-0.5 px-3">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-[#EBF8E7] text-[#00324D] border-l-4 border-[#39A900] shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-[#00324D] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#39A900]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#39A900] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Pie del Sidebar */}
      <div className="px-5 pt-4 border-t border-slate-100">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#39A900] animate-pulse" />
            <span className="text-[11px] font-bold text-[#00324D]">SENA Virtual</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Plataforma Bilingüismo v1.0
          </p>
        </div>
      </div>
    </aside>
  );
};
