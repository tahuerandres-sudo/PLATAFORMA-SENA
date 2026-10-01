/**
 * @license
 * SENA Learning Hub - Mobile Navigation & Drawer
 */

import React from 'react';
import {
  Home,
  BookOpen,
  FileText,
  Bell,
  User,
  X,
  GraduationCap,
  FolderArchive,
  Award,
  Users,
} from 'lucide-react';
import { ActiveRole } from './Header';
import { Sidebar } from './Sidebar';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: ActiveRole;
  activeView: string;
  onNavigate: (viewId: string) => void;
  unreadCount?: number;
}

interface MobileShortcut {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  currentRole,
  activeView,
  onNavigate,
  unreadCount = 2,
}) => {
  // Accesos rápidos de la barra inferior según rol
  const instructorBottomShortcuts: MobileShortcut[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'courses', label: 'Cursos', icon: BookOpen },
    { id: 'activities', label: 'Actividades', icon: FileText },
    { id: 'submissions', label: 'Evidencias', icon: FolderArchive },
    { id: 'notifications', label: 'Alertas', icon: Bell, badge: unreadCount },
  ];

  const apprenticeBottomShortcuts: MobileShortcut[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'courses', label: 'Cursos', icon: BookOpen },
    { id: 'activities', label: 'Actividades', icon: FileText },
    { id: 'grades', label: 'Notas', icon: Award },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  const shortcuts = currentRole === 'instructor' ? instructorBottomShortcuts : apprenticeBottomShortcuts;

  return (
    <>
      {/* 1. Cajón Desplegable Lateral (Drawer) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop con desenfoque */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />

          {/* Menú deslizable */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Header del Drawer */}
            <div className="p-4 bg-[#00324D] text-white flex items-center justify-between border-b-2 border-[#39A900]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#39A900] flex items-center justify-center font-bold text-white">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm tracking-tight">SENA Hub</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Sidebar */}
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                currentRole={currentRole}
                activeView={activeView}
                onNavigate={(viewId) => {
                  onNavigate(viewId);
                  onClose();
                }}
                className="w-full border-r-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Barra de Navegación Inferior Fija para Móviles (Bottom Nav) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around"
        aria-label="Navegación móvil inferior"
      >
        {shortcuts.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all relative ${
                isActive ? 'text-[#39A900]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#39A900]' : 'text-slate-500'}`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] flex items-center justify-center font-black ring-1 ring-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 leading-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
