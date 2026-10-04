/**
 * @license
 * SENA Learning Hub - Vista de Tablón de Anuncios (Instructor)
 * PROMPT 13: Gestión de anuncios reales en Firestore (/announcements) con destinatarios curriculares
 */

import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Calendar,
  Send,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Archive,
  Edit2,
  Trash2,
  Users,
  BookOpen,
  User,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import {
  Announcement,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementTargetType,
  Ficha,
  Course,
  TrainingProgram,
} from '../../types/academic';
import { announcementService } from '../../services/academic/announcementService';
import { fichaService } from '../../services/academic/fichaService';
import { courseService } from '../../services/academic/courseService';
import { programService } from '../../services/academic/programService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../../components/ui/Modal';

export const InstructorAnnouncementsView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';
  const instructorName = userProfile?.displayName || currentUser?.displayName || 'Instructor SENA';
  const instructorEmail = userProfile?.email || currentUser?.email || '';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [apprenticesInFicha, setApprenticesInFicha] = useState<
    Array<{ id: string; name: string; documentNumber: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Formulario / Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [targetType, setTargetType] = useState<AnnouncementTargetType>('FICHA');
  const [selectedFichaId, setSelectedFichaId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // 1. Cargar datos reales
  const loadData = async () => {
    if (!instructorUid) return;
    setLoading(true);
    try {
      const [annRes, fichasRes, coursesRes, progsRes] = await Promise.all([
        announcementService.getAnnouncementsForInstructor(instructorUid),
        fichaService.getFichas(instructorUid),
        courseService.getCourses(),
        programService.getPrograms(),
      ]);

      setAnnouncements(annRes);
      const loadedFichas = fichasRes.data || [];
      setFichas(loadedFichas);
      setCourses(coursesRes.data || []);
      setPrograms(progsRes.data || []);

      if (loadedFichas.length > 0 && !selectedFichaId) {
        setSelectedFichaId(loadedFichas[0].id);
      }
    } catch (err) {
      console.warn('[InstructorAnnouncementsView] Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instructorUid]);

  // Cargar aprendices reales de la ficha seleccionada para opción USER
  useEffect(() => {
    if (!selectedFichaId) return;
    async function loadApprentices() {
      try {
        const res = await enrollmentService.getApprenticesWithEnrollment(selectedFichaId, instructorUid);
        const mapped = res.data.map((appr) => ({
          id: appr.uid,
          name: appr.displayName || 'Aprendiz SENA',
          documentNumber: appr.documentNumber || '',
        }));
        setApprenticesInFicha(mapped);
        if (mapped.length > 0 && !selectedUserId) {
          setSelectedUserId(mapped[0].id);
        }
      } catch (err) {
        console.warn('Error cargando aprendices de ficha:', err);
      }
    }
    loadApprentices();
  }, [selectedFichaId]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
    setPriority('NORMAL');
    setTargetType('FICHA');
    if (fichas.length > 0) setSelectedFichaId(fichas[0].id);
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setMessage(ann.message);
    setPriority(ann.priority);
    setTargetType(ann.targetType);
    if (ann.fichaIds?.length) setSelectedFichaId(ann.fichaIds[0]);
    else if (ann.targetIds.length) setSelectedFichaId(ann.targetIds[0]);
    if (ann.programIds?.length) setSelectedProgramId(ann.programIds[0]);
    if (ann.courseIds?.length) setSelectedCourseId(ann.courseIds[0]);
    setIsModalOpen(true);
  };

  // Guardar (Publicar o Borrador)
  const handleSaveAnnouncement = async (status: AnnouncementStatus) => {
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      let targetIds: string[] = [];
      let fichaIds: string[] = [];
      let programIds: string[] = [];
      let courseIds: string[] = [];

      if (targetType === 'FICHA') {
        const fId = selectedFichaId || (fichas[0]?.id ?? '');
        targetIds = [fId];
        fichaIds = [fId];
      } else if (targetType === 'PROGRAM') {
        const pId = selectedProgramId || (programs[0]?.id ?? '');
        targetIds = [pId];
        programIds = [pId];
      } else if (targetType === 'COURSE') {
        const cId = selectedCourseId || (courses[0]?.id ?? '');
        targetIds = [cId];
        courseIds = [cId];
      } else if (targetType === 'USER') {
        const uId = selectedUserId || (apprenticesInFicha[0]?.id ?? '');
        targetIds = [uId];
        if (selectedFichaId) fichaIds = [selectedFichaId];
      } else if (targetType === 'ALL') {
        targetIds = fichas.map((f) => f.id);
        fichaIds = fichas.map((f) => f.id);
      }

      const saved = await announcementService.saveAnnouncement({
        id: editingId || undefined,
        title: title.trim(),
        message: message.trim(),
        createdBy: instructorUid,
        creatorName: instructorName,
        creatorEmail: instructorEmail,
        targetType,
        targetIds,
        fichaIds,
        programIds,
        courseIds,
        priority,
        status,
      });

      setAnnouncements((prev) => {
        const idx = prev.findIndex((a) => a.id === saved.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });

      setIsModalOpen(false);
      setFeedbackMsg(
        status === 'PUBLISHED'
          ? 'Anuncio publicado exitosamente y notificado a los aprendices.'
          : 'Borrador de anuncio guardado.'
      );
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error('Error guardando anuncio:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archivar
  const handleArchive = async (id: string) => {
    await announcementService.archiveAnnouncement(id);
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'ARCHIVED' } : a))
    );
  };

  // Eliminar
  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este anuncio?')) return;
    await announcementService.deleteAnnouncement(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  // Filtrado de anuncios
  const filteredAnnouncements = announcements
    .filter((a) => {
      if (filterStatus === 'ALL') return true;
      return a.status === filterStatus;
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

  const getStatusBadge = (s: AnnouncementStatus) => {
    switch (s) {
      case 'PUBLISHED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'ARCHIVED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Comunicación Oficial SENA
            </span>
            <span className="text-xs text-slate-500">
              Colección Firestore: <strong>/announcements</strong>
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">Tablón de Anuncios y Avisos</h1>
          <p className="text-xs text-slate-500">
            Publica avisos, novedades y enlaces a sesiones formativas para tus fichas asignadas
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Crear Anuncio
        </button>
      </div>

      {/* Banner de confirmación */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#39A900]" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-[#00324D] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({announcements.length})
          </button>
          <button
            onClick={() => setFilterStatus('PUBLISHED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'PUBLISHED'
                ? 'bg-[#39A900] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Publicados ({announcements.filter((a) => a.status === 'PUBLISHED').length})
          </button>
          <button
            onClick={() => setFilterStatus('DRAFT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'DRAFT'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Borradores ({announcements.filter((a) => a.status === 'DRAFT').length})
          </button>
          <button
            onClick={() => setFilterStatus('ARCHIVED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterStatus === 'ARCHIVED'
                ? 'bg-purple-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Archivados ({announcements.filter((a) => a.status === 'ARCHIVED').length})
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar anuncios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
          />
        </div>
      </div>

      {/* Lista de Anuncios */}
      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Cargando anuncios desde Firestore...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No hay anuncios publicados</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Utiliza el botón "+ Crear Anuncio" para publicar un nuevo aviso oficial a tus aprendices.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnnouncements.map((ann) => {
            const ficha = fichas.find((f) => ann.fichaIds?.includes(f.id) || ann.targetIds.includes(f.id));
            const prog = programs.find((p) => ann.programIds?.includes(p.id) || ann.targetIds.includes(p.id));

            return (
              <div
                key={ann.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3"
              >
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
                        : 'Normal'}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(
                        ann.status
                      )}`}
                    >
                      {ann.status === 'PUBLISHED'
                        ? 'Publicado'
                        : ann.status === 'DRAFT'
                        ? 'Borrador'
                        : 'Archivado'}
                    </span>

                    <span className="text-xs font-mono font-bold text-[#00324D] bg-slate-100 px-2 py-0.5 rounded">
                      {ann.targetType === 'ALL'
                        ? 'Todos los aprendices'
                        : ann.targetType === 'FICHA'
                        ? `Ficha ${ficha?.number || ann.targetIds[0] || 'Asignada'}`
                        : ann.targetType === 'PROGRAM'
                        ? `Programa: ${prog?.name || 'Curricular'}`
                        : ann.targetType === 'COURSE'
                        ? 'Curso específico'
                        : 'Aprendiz individual'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {ann.publishedAt && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(ann.publishedAt).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}

                    <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-2">
                      <button
                        onClick={() => handleOpenEdit(ann)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-[#00324D] cursor-pointer"
                        title="Editar Anuncio"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {ann.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleArchive(ann.id)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-purple-700 cursor-pointer"
                          title="Archivar"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                    {ann.message}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Instructor: <strong className="text-slate-700">{ann.creatorName}</strong>
                  </span>
                  <span>ID: {ann.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear / Editar Anuncio */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Anuncio' : 'Crear Nuevo Anuncio Institucional'}
        subtitle="Publicación oficial vinculada a Firestore /announcements"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveAnnouncement('DRAFT')}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Guardar Borrador
              </button>
              <button
                onClick={() => handleSaveAnnouncement('PUBLISHED')}
                disabled={isSubmitting || !title.trim() || !message.trim()}
                className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? 'Guardando...' : 'Publicar Anuncio'}
              </button>
            </div>
          </div>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveAnnouncement('PUBLISHED');
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título del Anuncio *
            </label>
            <input
              type="text"
              placeholder="Ej: Sesión sincrónica de refuerzo - Speaking Miércoles 10:00 AM"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prioridad del Aviso *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="NORMAL">Normal (Informativo)</option>
                <option value="IMPORTANT">Importante (Atención requerida)</option>
                <option value="URGENT">Urgente (Cierre próximo / Inmediato)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Destinatario *
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as AnnouncementTargetType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="FICHA">Por Ficha de Formación</option>
                <option value="PROGRAM">Por Programa Curricular</option>
                <option value="COURSE">Por Curso / Asignatura</option>
                <option value="USER">Por Aprendiz Individual</option>
                <option value="ALL">Todos mis aprendices asignados</option>
              </select>
            </div>
          </div>

          {/* Selección en cascada según el tipo de destinatario */}
          {targetType === 'FICHA' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selecciona la Ficha Destinataria *
              </label>
              <select
                value={selectedFichaId}
                onChange={(e) => setSelectedFichaId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                {fichas.map((f) => (
                  <option key={f.id} value={f.id}>
                    Ficha {f.number} · {f.programName || 'Programa SENA'}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Solo se muestran fichas asignadas a tu cuenta de instructor.
              </p>
            </div>
          )}

          {targetType === 'PROGRAM' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selecciona el Programa *
              </label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'COURSE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selecciona el Curso / Asignatura *
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'USER' && (
            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Filtrar por Ficha del Aprendiz:
                </label>
                <select
                  value={selectedFichaId}
                  onChange={(e) => setSelectedFichaId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
                >
                  {fichas.map((f) => (
                    <option key={f.id} value={f.id}>
                      Ficha {f.number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Selecciona el Aprendiz Destinatario:
                </label>
                {apprenticesInFicha.length === 0 ? (
                  <div className="text-xs text-amber-700 p-2 bg-amber-50 rounded border border-amber-200">
                    No se encontraron aprendices matriculados en esta ficha.
                  </div>
                ) : (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
                  >
                    {apprenticesInFicha.map((appr) => (
                      <option key={appr.id} value={appr.id}>
                        {appr.name} {appr.documentNumber ? `(Doc: ${appr.documentNumber})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contenido del Mensaje o Instrucciones *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Escribe el mensaje claro para los aprendices, incluyendo enlaces a Google Meet / Teams si aplica..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
