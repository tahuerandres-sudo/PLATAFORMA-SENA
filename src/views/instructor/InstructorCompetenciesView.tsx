/**
 * @license
 * SENA Learning Hub - Vista de Competencias de Formación (Instructor)
 * PROMPT 8: Estructura Académica SENA - Colección Firestore: /competencies
 */

import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  BookOpen,
  Users,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Edit3,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Info,
  X,
} from 'lucide-react';
import { Competency, Course, TrainingProgram, Ficha } from '../../types/academic';
import { competencyService } from '../../services/academic/competencyService';
import { courseService } from '../../services/academic/courseService';
import { programService } from '../../services/academic/programService';
import { fichaService } from '../../services/academic/fichaService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';

export const InstructorCompetenciesView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';

  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [rapCounts, setRapCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Modal: Crear
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'transversal' | 'technical' | 'basic'>('transversal');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [programId, setProgramId] = useState('');
  const [fichaId, setFichaId] = useState('all');

  // Modal: Editar
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editType, setEditType] = useState<'transversal' | 'technical' | 'basic'>('transversal');
  const [editDescription, setEditDescription] = useState('');
  const [editCourseId, setEditCourseId] = useState('');
  const [editProgramId, setEditProgramId] = useState('');
  const [editFichaId, setEditFichaId] = useState('all');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal: Eliminar con verificación de dependencias
  const [competencyToDelete, setCompetencyToDelete] = useState<Competency | null>(null);
  const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);
  const [dependenciesInfo, setDependenciesInfo] = useState<{
    hasDependencies: boolean;
    rapsCount: number;
    activitiesCount: number;
    resourcesCount: number;
    raps: { id: string; name: string; code?: string }[];
    activities: { id: string; title: string }[];
    resources: { id: string; title: string }[];
    details: string[];
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mensaje Toast de retroalimentación
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [compsRes, coursesRes, progsRes, fichasRes, rapsRes] = await Promise.all([
        competencyService.getCompetencies(),
        courseService.getCourses(),
        programService.getPrograms(),
        fichaService.getFichas(instructorUid),
        learningOutcomeService.getLearningOutcomes(),
      ]);

      const loadedComps = compsRes.data || [];
      const loadedCourses = coursesRes.data || [];
      const loadedProgs = progsRes.data || [];
      const loadedFichas = fichasRes.data || [];
      const loadedRaps = rapsRes.data || [];

      setCompetencies(loadedComps);
      setCourses(loadedCourses);
      setPrograms(loadedProgs);
      setFichas(loadedFichas);

      if (loadedCourses.length > 0 && !courseId) setCourseId(loadedCourses[0].id);
      if (loadedProgs.length > 0 && !programId) setProgramId(loadedProgs[0].id);

      // Calcular RAPs vinculados por competencia
      const counts: Record<string, number> = {};
      for (const rap of loadedRaps) {
        counts[rap.competencyId] = (counts[rap.competencyId] || 0) + 1;
      }
      setRapCounts(counts);
    } catch (err) {
      console.warn('[InstructorCompetenciesView] Error cargando competencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instructorUid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    const newComp: Competency = {
      id: `comp_${Date.now()}`,
      name: name.trim(),
      code: code.trim(),
      type,
      description: description.trim(),
      courseId: courseId || (courses[0]?.id ?? 'course_ingles_laboral'),
      programId: programId || (programs[0]?.id ?? 'prog_gestion_contable'),
      fichaId: fichaId !== 'all' ? fichaId : undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = await competencyService.saveCompetency(newComp);
      setCompetencies([saved, ...competencies]);
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      showToast(`Competencia "${saved.code}" creada exitosamente.`);
    } catch (err: any) {
      showToast(err?.message || 'Error guardando competencia en Firestore.', 'error');
    }
  };

  // 1. Abrir Modal de Edición con datos precargados
  const handleOpenEdit = (comp: Competency) => {
    setEditingCompetency(comp);
    setEditName(comp.name || '');
    setEditCode(comp.code || '');
    setEditType((comp.type as any) || 'transversal');
    setEditDescription(comp.description || '');
    setEditCourseId(comp.courseId || (courses[0]?.id ?? ''));
    setEditProgramId(comp.programId || (programs[0]?.id ?? ''));
    setEditFichaId(comp.fichaId || 'all');
  };

  // Guardar Cambios de Edición en Firestore
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompetency || !editName.trim() || !editCode.trim()) return;

    setIsSavingEdit(true);
    try {
      const updated = await competencyService.updateCompetency(editingCompetency.id, {
        name: editName.trim(),
        code: editCode.trim(),
        type: editType,
        description: editDescription.trim(),
        courseId: editCourseId || editingCompetency.courseId || undefined,
        programId: editProgramId || editingCompetency.programId || undefined,
        fichaId: editFichaId !== 'all' ? editFichaId : undefined,
      });

      // Actualizar inmediatamente la tarjeta en pantalla
      setCompetencies((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );

      showToast(`Competencia "${updated.code}" actualizada exitosamente.`);
      setEditingCompetency(null);
    } catch (err: any) {
      console.error('[InstructorCompetenciesView] Error al actualizar competencia:', err);
      showToast(err?.message || 'Error al actualizar la competencia en Firestore.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 2. Abrir Modal de Eliminación y Verificar Dependencias Curriculares
  const handleOpenDelete = async (comp: Competency) => {
    setCompetencyToDelete(comp);
    setDependenciesInfo(null);
    setIsCheckingDependencies(true);

    try {
      const depInfo = await competencyService.checkCompetencyDependencies(comp.id);
      // Sincronizar también con el conteo de RAPs cargados localmente
      const localRaps = rapCounts[comp.id] || 0;
      if (localRaps > 0 && depInfo.rapsCount === 0) {
        depInfo.rapsCount = localRaps;
        depInfo.hasDependencies = true;
        depInfo.details.push(`${localRaps} Resultado(s) de Aprendizaje (RAP) asociados.`);
      }
      setDependenciesInfo(depInfo);
    } catch (err) {
      console.warn('[InstructorCompetenciesView] Error verificando dependencias:', err);
      const localRaps = rapCounts[comp.id] || 0;
      setDependenciesInfo({
        hasDependencies: localRaps > 0,
        rapsCount: localRaps,
        activitiesCount: 0,
        resourcesCount: 0,
        raps: [],
        activities: [],
        resources: [],
        details: localRaps > 0 ? [`${localRaps} Resultado(s) de Aprendizaje (RAP) asociados.`] : [],
      });
    } finally {
      setIsCheckingDependencies(false);
    }
  };

  // Confirmar Eliminación Segura
  const handleConfirmDelete = async () => {
    if (!competencyToDelete) return;
    if (dependenciesInfo?.hasDependencies) {
      showToast('No es posible eliminar una competencia con dependencias académicas.', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      await competencyService.deleteCompetency(competencyToDelete.id);

      // Actualizar inmediatamente la lista de competencias
      setCompetencies((prev) => prev.filter((c) => c.id !== competencyToDelete.id));

      showToast(`Competencia "${competencyToDelete.code}" eliminada exitosamente.`);
      setCompetencyToDelete(null);
    } catch (err: any) {
      console.error('[InstructorCompetenciesView] Error al eliminar competencia:', err);
      showToast(err?.message || 'Error al eliminar la competencia en Firestore.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCompetencies = competencies.filter((comp) => {
    if (selectedProgram !== 'all' && comp.programId && comp.programId !== selectedProgram) {
      return false;
    }
    if (selectedCourse !== 'all' && comp.courseId !== selectedCourse) {
      return false;
    }
    if (selectedType !== 'all' && comp.type !== selectedType) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = comp.name.toLowerCase().includes(q);
      const matchCode = comp.code.toLowerCase().includes(q);
      const matchDesc = comp.description?.toLowerCase().includes(q);
      return matchName || matchCode || matchDesc;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Normas de Competencia Laboral (NCL)
            </span>
            <span className="text-[11px] font-bold bg-[#EBF8E7] text-[#2E8500] px-2 py-0.5 rounded border border-[#39A900]/30">
              Firestore /competencies
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">Competencias de Formación</h1>
          <p className="text-xs text-slate-500">
            Competencias laborales y transversales vinculadas a programas, cursos y fichas del SENA
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Nueva Competencia
        </button>
      </div>

      {/* Filtros multicriterio */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o norma..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
            />
          </div>

          <div>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
            >
              <option value="all">Todos los programas</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
            >
              <option value="all">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
            >
              <option value="all">Todos los tipos</option>
              <option value="transversal">Transversales</option>
              <option value="technical">Técnicas</option>
              <option value="basic">Básicas</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Consultando competencias en Firestore...</p>
        </div>
      ) : filteredCompetencies.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 p-6">
          <p className="text-xs text-slate-500">No se encontraron competencias con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompetencies.map((comp) => {
            const course = courses.find((c) => c.id === comp.courseId);
            const prog = programs.find((p) => p.id === comp.programId);
            const rapCount = rapCounts[comp.id] || 0;

            return (
              <div
                key={comp.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-[#39A900] transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#00324D] bg-[#EBF8E7] px-2.5 py-1 rounded border border-[#39A900]/20">
                      Código: {comp.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {comp.type}
                      </span>
                      <span className="text-[10px] font-bold text-[#2E8500] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {rapCount} RAPs
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{comp.name}</h3>
                    <p className="text-xs text-slate-600 mt-2 italic leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      "{comp.description}"
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                  {course && (
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#39A900]" />
                      <span>
                        Curso vinculado: <strong>{course.name}</strong>
                      </span>
                    </div>
                  )}
                  {prog && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">Programa: {prog.name}</span>
                    </div>
                  )}
                </div>

                {/* Acciones de Competencia: Editar y Eliminar (Visibles en todas las tarjetas de competencias) */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(comp)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#00324D] bg-slate-100 hover:bg-slate-200/80 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Editar competencia ${comp.code}`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDelete(comp)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Eliminar competencia ${comp.code}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar competencia</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Nueva Competencia */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Competencia Laboral"
        subtitle="Registro oficial en /competencies vinculado a Programa y Curso"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Guardar en Firestore
            </button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la Competencia *
            </label>
            <input
              type="text"
              placeholder="Ej: Interactuar en lengua inglesa según el marco común europeo..."
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código Norma Laboral *
              </label>
              <input
                type="text"
                placeholder="Ej: 240202501"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="transversal">Transversal (Bilingüismo / Ética)</option>
                <option value="technical">Técnica Específica</option>
                <option value="basic">Básica Institucional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Programa de Formación *
            </label>
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Curso Vinculado *
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción Oficial y Contexto
            </label>
            <textarea
              rows={3}
              placeholder="Describir los criterios de desempeño y contexto de aplicación..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Editar Competencia Existente */}
      <Modal
        isOpen={Boolean(editingCompetency)}
        onClose={() => setEditingCompetency(null)}
        title="Editar Competencia Laboral"
        subtitle={
          editingCompetency
            ? `Modificar datos de la competencia ${editingCompetency.code} en /competencies`
            : ''
        }
        footer={
          <>
            <button
              type="button"
              disabled={isSavingEdit}
              onClick={() => setEditingCompetency(null)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSavingEdit}
              onClick={handleSaveEdit}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSavingEdit ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </>
        }
      >
        {editingCompetency && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la Competencia *
              </label>
              <input
                type="text"
                required
                placeholder="Nombre o redacción de la competencia..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código Norma Laboral *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 240202501"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo *
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
                >
                  <option value="transversal">Transversal (Bilingüismo / Ética)</option>
                  <option value="technical">Técnica Específica</option>
                  <option value="basic">Básica Institucional</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Programa de Formación
              </label>
              <select
                value={editProgramId}
                onChange={(e) => setEditProgramId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="">(Sin vincular a programa específico)</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Curso Vinculado
              </label>
              <select
                value={editCourseId}
                onChange={(e) => setEditCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="">(Sin vincular a curso específico)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ficha Específica (Opcional)
              </label>
              <select
                value={editFichaId}
                onChange={(e) => setEditFichaId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="all">Catálogo general (Aplica a todas las fichas)</option>
                {fichas.map((f) => (
                  <option key={f.id} value={f.id}>
                    Ficha #{f.number} - {f.name || f.programName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descripción Oficial y Criterios
              </label>
              <textarea
                rows={3}
                placeholder="Criterios de desempeño, alcance y contexto formativo..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>
          </form>
        )}
      </Modal>

      {/* 3. Modal: Confirmar Eliminación con Validación de Dependencias Curriculares */}
      <Modal
        isOpen={Boolean(competencyToDelete)}
        onClose={() => setCompetencyToDelete(null)}
        title="Eliminar Competencia de Formación"
        subtitle={
          competencyToDelete
            ? `${competencyToDelete.name} (Código: ${competencyToDelete.code})`
            : ''
        }
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setCompetencyToDelete(null)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              {dependenciesInfo?.hasDependencies ? 'Cerrar / Entendido' : 'Cancelar'}
            </button>

            {!dependenciesInfo?.hasDependencies && !isCheckingDependencies && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, Eliminar Competencia</span>
                  </>
                )}
              </button>
            )}
          </div>
        }
      >
        {competencyToDelete && (
          <div className="space-y-4 pt-1">
            {isCheckingDependencies ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  Verificando relaciones curriculares en Firestore (RAPs, actividades, recursos)...
                </p>
              </div>
            ) : dependenciesInfo?.hasDependencies ? (
              /* CASO 1: TIENE DEPENDENCIAS -> NO PERMITIR ELIMINACIÓN */
              <div className="space-y-3">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs text-amber-900">
                    <h4 className="font-bold text-amber-950">
                      No es posible eliminar esta competencia
                    </h4>
                    <p className="text-[11px] leading-relaxed">
                      La competencia seleccionada tiene relaciones curriculares activas asociadas. Eliminarla dejaría información académica huérfana en el sistema formativo.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Dependencias detectadas ({dependenciesInfo.rapsCount + dependenciesInfo.activitiesCount + dependenciesInfo.resourcesCount}):</span>
                  </h5>
                  <ul className="text-xs space-y-1.5 pl-2">
                    {dependenciesInfo.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    ¿Cómo resolver las dependencias?
                  </p>
                  <p>
                    Para proteger los registros de evidencias y calificaciones de los aprendices, debes reasignar o desvincular los Resultados de Aprendizaje (RAP) y actividades hacia otra competencia antes de intentar eliminarla.
                  </p>
                </div>
              </div>
            ) : (
              /* CASO 2: NO TIENE DEPENDENCIAS -> CONFIRMACIÓN SEGURA */
              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs">Sin dependencias académicas</h5>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Esta competencia no tiene Resultados de Aprendizaje (RAP), actividades ni recursos vinculados. Es seguro proceder con su retiro.
                    </p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed">
                  ¿Estás seguro de que deseas eliminar permanentemente la competencia laboral{' '}
                  <strong className="text-slate-900 font-bold">"{competencyToDelete.name}"</strong> (Código: <span className="font-mono font-bold">{competencyToDelete.code}</span>)?
                </p>

                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                  ⚠️ Esta acción eliminará el documento de la colección <code className="font-mono">/competencies</code> en Cloud Firestore de manera irreversible.
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 4. Notificación Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-[#00324D] text-white border-[#39A900]'
              : 'bg-rose-900 text-white border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#8CE665] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
