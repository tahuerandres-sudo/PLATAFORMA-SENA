/**
 * @license
 * SENA Learning Hub - Calendario Académico y Agenda de Actividades del Aprendiz
 * PROMPT 18: 100% Real conectado a Firebase Firestore
 * Colecciones: /activities, /announcements, /fichas, /courses, /enrollments, /submissions, /attendance
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Megaphone,
  CalendarCheck,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Users,
  Award,
  ChevronDown,
  List,
  Grid,
  CalendarDays,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { calendarService } from '../../services/academic/calendarService';
import {
  CalendarEventItem,
  CalendarEventType,
  CalendarActivityStatus,
  Ficha,
} from '../../types/academic';
import { CalendarEventDetailModal } from '../../components/calendar/CalendarEventDetailModal';

type CalendarViewMode = 'month' | 'week' | 'list';

interface ApprenticeCalendarViewProps {
  onNavigateToActivities?: (activityId?: string) => void;
  onNavigateToSubmissions?: (activityId?: string) => void;
}

export const ApprenticeCalendarView: React.FC<ApprenticeCalendarViewProps> = ({
  onNavigateToActivities,
  onNavigateToSubmissions,
}) => {
  const { currentUser, userProfile } = useAuth();
  const userId = currentUser?.uid || userProfile?.uid || '';

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<CalendarEventItem[]>([]);

  // Navegación temporal
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Filtros
  const [selectedFichaId, setSelectedFichaId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal de detalle
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Carga de datos reales
  const loadCalendarData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await calendarService.getLearnerCalendarEvents({
        userId,
        fichaId: selectedFichaId !== 'all' ? selectedFichaId : undefined,
      });
      setEvents(res.events);
      setFichas(res.fichas);
      setUpcomingActivities(res.upcomingActivities);
    } catch (err) {
      console.warn('[ApprenticeCalendarView] Error cargando calendario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [userId, selectedFichaId]);

  // Manejo de cambio de mes / semana
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() - 7);
      setCurrentDate(newD);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() + 7);
      setCurrentDate(newD);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtrado de eventos
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Filtro por tipo
      if (selectedType !== 'all' && ev.type !== selectedType) {
        return false;
      }
      // Filtro por estado
      if (selectedStatus !== 'all' && ev.status !== selectedStatus) {
        return false;
      }
      // Búsqueda por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchDesc = ev.description?.toLowerCase().includes(q);
        const matchFicha = ev.fichaNumber?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchFicha) return false;
      }
      return true;
    });
  }, [events, selectedType, selectedStatus, searchQuery]);

  // Construcción de la cuadrícula de días para el mes actual
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Ajuste para comenzar en Lunes (0 = Domingo -> 6, 1 = Lunes -> 0, etc.)
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayNumber: number;
    }> = [];

    // Días del mes anterior para rellenar
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        dayNumber: d.getDate(),
      });
    }

    // Días del mes actual
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();

      days.push({
        date: d,
        isCurrentMonth: true,
        isToday,
        dayNumber: day,
      });
    }

    // Días del mes siguiente para completar múltiplos de 7 (mínimo 35 o 42 celdas)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        dayNumber: day,
      });
    }

    return days;
  }, [currentDate]);

  // Construcción de días para la vista de Semana
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = (curr.getDay() + 6) % 7; // Lunes = 0
    const monday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayOfWeek);

    const days: Array<{ date: Date; isToday: boolean; dayName: string }> = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();

      const dayName = d.toLocaleDateString('es-CO', { weekday: 'short' });
      days.push({ date: d, isToday, dayName });
    }

    return days;
  }, [currentDate]);

  // Helper para eventos de un día específico
  const getEventsForDay = (targetDate: Date) => {
    return filteredEvents.filter((ev) => {
      const d = ev.startDate;
      return (
        d.getDate() === targetDate.getDate() &&
        d.getMonth() === targetDate.getMonth() &&
        d.getFullYear() === targetDate.getFullYear()
      );
    });
  };

  // Color de punto según estado oficial (Requisito 7)
  const getStatusColor = (status?: string, type?: CalendarEventType) => {
    if (type === 'ANNOUNCEMENT') return 'bg-purple-500 text-purple-700 border-purple-200';
    if (type === 'ATTENDANCE') return 'bg-sky-500 text-sky-700 border-sky-200';

    switch (status) {
      case 'completed':
        return 'bg-emerald-500 text-emerald-800 border-emerald-200 bg-emerald-50'; // 🟢
      case 'pending':
        return 'bg-amber-500 text-amber-800 border-amber-200 bg-amber-50'; // 🟡
      case 'overdue':
        return 'bg-rose-500 text-rose-800 border-rose-200 bg-rose-50'; // 🔴
      case 'correction':
        return 'bg-blue-500 text-blue-800 border-blue-200 bg-blue-50'; // 🔵
      case 'no_date':
      default:
        return 'bg-slate-400 text-slate-700 border-slate-200 bg-slate-50'; // ⚪
    }
  };

  const getStatusDot = (status?: string, type?: CalendarEventType) => {
    if (type === 'ANNOUNCEMENT') return 'bg-purple-500';
    if (type === 'ATTENDANCE') return 'bg-sky-500';

    switch (status) {
      case 'completed':
        return 'bg-emerald-500';
      case 'pending':
        return 'bg-amber-500';
      case 'overdue':
        return 'bg-rose-500';
      case 'correction':
        return 'bg-blue-500';
      default:
        return 'bg-slate-400';
    }
  };

  const openEventDetail = (event: CalendarEventItem) => {
    setSelectedEvent(event);
    setDetailModalOpen(true);
  };

  const monthTitle = currentDate.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. Header con Identidad SENA */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00324D] text-[#39A900] flex items-center justify-center font-bold shadow-xs shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                Calendario Académico y Agenda
              </h1>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-[#39A900] border border-emerald-200">
                100% Real
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Consulta tus actividades formativas, fechas de entrega, anuncios y sesiones de formación
            </p>
          </div>
        </div>

        {/* Selector de Vistas + Botón de Actualizar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lista / Agenda
            </button>
          </div>

          <button
            onClick={loadCalendarData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            title="Actualizar calendario"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#39A900]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Barra de Navegación del Período y Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Navegación Mes / Anterior / Siguiente */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 capitalize min-w-[160px]">
              {monthTitle}
            </h2>
            <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                title="Período anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                title="Período siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Buscador de Eventos */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar actividad o aviso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#39A900] text-slate-800"
            />
          </div>
        </div>

        {/* Filtros de Tipo y Estado */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Filtro Ficha */}
          {fichas.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Ficha:</span>
              <select
                value={selectedFichaId}
                onChange={(e) => setSelectedFichaId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#39A900]"
              >
                <option value="all">Todas mis fichas</option>
                {fichas.map((f) => (
                  <option key={f.id} value={f.id}>
                    Ficha #{f.number}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro Tipo de Evento */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Tipo:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#39A900]"
            >
              <option value="all">Todos los tipos</option>
              <option value="DUE_DATE">Fechas de Entrega</option>
              <option value="ACTIVITY">Actividades de Formación</option>
              <option value="ANNOUNCEMENT">Avisos Institucionales</option>
              <option value="ATTENDANCE">Sesiones de Formación</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Estado:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#39A900]"
            >
              <option value="all">Todos los estados</option>
              <option value="completed">🟢 Completadas</option>
              <option value="pending">🟡 Pendientes</option>
              <option value="overdue">🔴 Vencidas</option>
              <option value="correction">🔵 En corrección</option>
              <option value="no_date">⚪ Sin fecha límite</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Leyenda Oficial de Estados (Requisito 7) */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="font-semibold text-slate-600 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#39A900]" />
          <span>Convención de Estados:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>🟢 Completada</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>🟡 Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>🔴 Vencida</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>🔵 En corrección</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            <span>⚪ Sin fecha</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 border-l border-slate-300 pl-3">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>Aviso</span>
          </div>
        </div>
      </div>

      {/* 4. Contenido Principal: Cuadrícula del Calendario o Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lado Izquierdo (3 columnas): El Calendario según vista seleccionada */}
        <div className="lg:col-span-3 space-y-4">
          {viewMode === 'month' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              {/* Días de la semana */}
              <div className="grid grid-cols-7 bg-[#00324D] text-white text-center py-2.5 text-xs font-bold uppercase tracking-wider">
                <div>Lun</div>
                <div>Mar</div>
                <div>Mié</div>
                <div>Jue</div>
                <div>Vie</div>
                <div>Sáb</div>
                <div>Dom</div>
              </div>

              {/* Cuadrícula de Días */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-50">
                {monthGridDays.map((cell, idx) => {
                  const dayEvents = getEventsForDay(cell.date);

                  return (
                    <div
                      key={idx}
                      className={`min-h-[110px] p-1.5 flex flex-col justify-between transition-colors ${
                        cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                      } ${cell.isToday ? 'ring-2 ring-[#39A900] ring-inset' : ''}`}
                    >
                      {/* Cabecera del día */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                            cell.isToday
                              ? 'bg-[#39A900] text-white shadow-xs'
                              : cell.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Lista de eventos del día */}
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const dotClass = getStatusDot(ev.status, ev.type);

                          return (
                            <button
                              key={ev.id}
                              onClick={() => openEventDetail(ev)}
                              className="w-full text-left p-1 rounded-md text-[11px] font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer truncate shadow-2xs group"
                              title={`${ev.title} (${ev.dueLabel || ev.status || 'Evento'})`}
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`}></span>
                              <span className="truncate text-slate-700 group-hover:text-slate-900">
                                {ev.title}
                              </span>
                            </button>
                          );
                        })}

                        {dayEvents.length > 3 && (
                          <button
                            onClick={() => openEventDetail(dayEvents[3])}
                            className="text-[10px] font-semibold text-[#39A900] hover:underline pl-1 cursor-pointer block"
                          >
                            +{dayEvents.length - 3} más...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vista de Semana */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
              {weekDays.map((dayItem, idx) => {
                const dayEvents = getEventsForDay(dayItem.date);

                return (
                  <div
                    key={idx}
                    className={`bg-white rounded-2xl border p-3 flex flex-col gap-2 min-h-[350px] shadow-xs ${
                      dayItem.isToday
                        ? 'border-[#39A900] ring-1 ring-[#39A900]'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Header del día de la semana */}
                    <div
                      className={`text-center pb-2 border-b ${
                        dayItem.isToday ? 'border-emerald-200' : 'border-slate-100'
                      }`}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {dayItem.dayName}
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          dayItem.isToday ? 'text-[#39A900]' : 'text-slate-800'
                        }`}
                      >
                        {dayItem.date.getDate()}
                      </div>
                    </div>

                    {/* Eventos del día */}
                    <div className="space-y-2 flex-1 overflow-y-auto">
                      {dayEvents.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center text-slate-300 text-[11px] italic py-6">
                          Sin actividades
                        </div>
                      ) : (
                        dayEvents.map((ev) => {
                          const dotClass = getStatusDot(ev.status, ev.type);

                          return (
                            <div
                              key={ev.id}
                              onClick={() => openEventDetail(ev)}
                              className="p-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`}></span>
                                <span className="text-xs font-semibold text-slate-800 line-clamp-2">
                                  {ev.title}
                                </span>
                              </div>
                              {ev.dueLabel && (
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{ev.dueLabel}</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Vista de Lista / Agenda */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-3">
                  <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-medium">
                    No hay eventos ni actividades programadas con los filtros seleccionados.
                  </p>
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const dotClass = getStatusDot(ev.status, ev.type);

                  return (
                    <div
                      key={ev.id}
                      onClick={() => openEventDetail(ev)}
                      className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                          {ev.type === 'ANNOUNCEMENT' ? (
                            <Megaphone className="w-4 h-4 text-purple-600" />
                          ) : ev.type === 'ATTENDANCE' ? (
                            <CalendarCheck className="w-4 h-4 text-sky-600" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
                            <h3 className="text-sm font-bold text-slate-800 hover:text-[#00324D] transition-colors">
                              {ev.title}
                            </h3>
                            {ev.fichaNumber && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                Ficha #{ev.fichaNumber}
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 sm:self-center">
                        {ev.dueLabel && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {ev.dueLabel}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium">
                          {ev.startDate.toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Lado Derecho (1 columna): Agenda del Aprendiz (Requisito 9) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#39A900]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Próximos Vencimientos
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {upcomingActivities.length}
              </span>
            </div>

            {/* Lista ordenada de próximas actividades */}
            <div className="mt-4 space-y-3">
              {upcomingActivities.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p>¡Estás al día! No tienes actividades pendientes con fecha límite cercana.</p>
                </div>
              ) : (
                upcomingActivities.slice(0, 6).map((item) => {
                  let dueBg = 'bg-slate-100 text-slate-700';
                  if (item.dueLabel === 'Due today') dueBg = 'bg-amber-100 text-amber-800 font-bold';
                  if (item.dueLabel === 'Due tomorrow') dueBg = 'bg-orange-100 text-orange-800 font-bold';
                  if (item.dueLabel === 'Overdue') dueBg = 'bg-rose-100 text-rose-800 font-bold';

                  return (
                    <div
                      key={item.id}
                      onClick={() => openEventDetail(item)}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="text-base">📚</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#00324D] transition-colors line-clamp-1">
                              {item.title}
                            </h4>
                            {item.fichaNumber && (
                              <p className="text-[10px] text-slate-500">
                                Ficha: {item.fichaNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        {item.dueLabel ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md ${dueBg}`}>
                            {item.dueLabel}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sin fecha límite</span>
                        )}

                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.startDate.toLocaleDateString('es-CO', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Botón hacia Mis Actividades */}
            {onNavigateToActivities && (
              <button
                onClick={() => onNavigateToActivities()}
                className="mt-4 w-full py-2 px-3 text-xs font-semibold text-center text-[#00324D] hover:text-[#39A900] bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                Ver Todas Mis Actividades →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalle */}
      <CalendarEventDetailModal
        event={selectedEvent}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        userRole="apprentice"
        onNavigateToActivity={(actId) => {
          if (onNavigateToActivities) onNavigateToActivities(actId);
        }}
        onNavigateToSubmissions={(actId) => {
          if (onNavigateToSubmissions) onNavigateToSubmissions(actId);
        }}
      />
    </div>
  );
};
