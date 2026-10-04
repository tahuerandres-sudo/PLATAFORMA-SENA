/**
 * @license
 * SENA Learning Hub - Vista de Anuncios del Aprendiz
 * PROMPT 13 - Requisito 5: Tablón oficial con filtrado curricular (/enrollments) y orden (no leídos primero)
 */

import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  User,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Announcement, AnnouncementPriority, Enrollment } from '../../types/academic';
import { announcementService } from '../../services/academic/announcementService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { courseService } from '../../services/academic/courseService';
import { useAuth } from '../../hooks/useAuth';

export const ApprenticeAnnouncementsView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const userId = currentUser?.uid || userProfile?.uid || '';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<'ALL' | AnnouncementPriority>('ALL');

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Obtener matrícula real del aprendiz (/enrollments)
      const userEnrollment = await enrollmentService.getEnrollmentByLearnerId(userId);
      const userEnrollments = userEnrollment ? [userEnrollment] : [];
      setEnrollments(userEnrollments);

      const activeFichaId = userEnrollments[0]?.fichaId || userProfile?.fichaId || '';
      const activeProgramId = userEnrollments[0]?.programId || userProfile?.programId || '';

      // 2. Obtener cursos de la ficha si existen
      let courseIds: string[] = [];
      if (activeFichaId) {
        const coursesRes = await courseService.getCoursesByFicha(activeFichaId);
        courseIds = (coursesRes.data || []).map((c) => c.id);
      }

      // 3. Consultar anuncios reales en Firestore correspondientes a sus relaciones
      const data = await announcementService.getAnnouncementsForLearner({
        userId,
        fichaId: activeFichaId,
        programId: activeProgramId,
        courseIds,
      });

      setAnnouncements(data);
    } catch (err) {
      console.warn('[ApprenticeAnnouncementsView] Error cargando anuncios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleMarkAsRead = async (annId: string) => {
    setReadIds((prev) => new Set([...prev, annId]));
    await announcementService.markAnnouncementAsRead(annId, userId);
  };

  const getPriorityBadge = (p: AnnouncementPriority) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'IMPORTANT':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const filteredAnnouncements = announcements
    .filter((a) => {
      if (filterPriority === 'ALL') return true;
      return a.priority === filterPriority;
    })
    .filter((a) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        a.title.toLowerCase().includes(term) ||
        a.message.toLowerCase().includes(term) ||
        a.creatorName.toLowerCase().includes(term)
      );
    });

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      {/* 1. Encabezado Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Avisos y Comunicados Oficiales
            </span>
            {enrollments.length > 0 && (
              <span className="text-xs text-slate-500">
                Ficha: <strong>{enrollments[0].fichaId}</strong>
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">Tablón de Anuncios</h1>
          <p className="text-xs text-slate-500">
            Novedades académicas, enlaces a sesiones sincrónicas y avisos de tus instructores
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          title="Actualizar anuncios"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar</span>
        </button>
      </div>

      {/* 2. Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterPriority('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterPriority === 'ALL'
                ? 'bg-[#00324D] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({announcements.length})
          </button>
          <button
            onClick={() => setFilterPriority('URGENT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterPriority === 'URGENT'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Urgentes ({announcements.filter((a) => a.priority === 'URGENT').length})
          </button>
          <button
            onClick={() => setFilterPriority('IMPORTANT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterPriority === 'IMPORTANT'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Importantes ({announcements.filter((a) => a.priority === 'IMPORTANT').length})
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar avisos o instructores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
          />
        </div>
      </div>

      {/* 3. Listado de Anuncios */}
      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Consultando avisos en Firestore...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No hay anuncios publicados para tu ficha</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cuando tu instructor publique un nuevo aviso o novedad formativa, aparecerá aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => {
            const isRead = readIds.has(ann.id);

            return (
              <div
                key={ann.id}
                className={`p-5 rounded-2xl border transition-all space-y-3 ${
                  !isRead
                    ? 'bg-white border-[#39A900]/40 shadow-xs ring-1 ring-[#39A900]/20'
                    : 'bg-white/80 border-slate-200 opacity-90'
                }`}
              >
                {/* Cabecera del Anuncio */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityBadge(
                        ann.priority
                      )}`}
                    >
                      {ann.priority === 'URGENT'
                        ? 'Urgente'
                        : ann.priority === 'IMPORTANT'
                        ? 'Importante'
                        : 'Informativo'}
                    </span>

                    {!isRead ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#39A900]" />
                        Nuevo
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Leído</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(ann.publishedAt || ann.createdAt).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Título y Mensaje */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{ann.title}</h3>
                  <div className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-line bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                    {ann.message}
                  </div>
                </div>

                {/* Pie: Remitente y Acción */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#00324D] text-[#8CE665] flex items-center justify-center font-bold text-[10px]">
                      {ann.creatorName.charAt(0)}
                    </div>
                    <span className="text-slate-600">
                      Instructor: <strong className="text-slate-800">{ann.creatorName}</strong>
                    </span>
                  </div>

                  {!isRead && (
                    <button
                      onClick={() => handleMarkAsRead(ann.id)}
                      className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-[#39A900]" />
                      <span>Marcar como leído</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
