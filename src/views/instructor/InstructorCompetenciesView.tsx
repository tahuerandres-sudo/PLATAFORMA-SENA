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
  const instructorUid = currentUser?.uid || userProfile?.uid || 'inst_carlos_mendoza';

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

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'transversal' | 'technical' | 'basic'>('transversal');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [programId, setProgramId] = useState('');
  const [fichaId, setFichaId] = useState('all');

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
      name,
      code,
      type,
      description,
      courseId: courseId || (courses[0]?.id ?? 'course_ingles_laboral'),
      programId: programId || (programs[0]?.id ?? 'prog_gestion_contable'),
      fichaId: fichaId !== 'all' ? fichaId : undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await competencyService.saveCompetency(newComp);
    setCompetencies([saved, ...competencies]);
    setIsModalOpen(false);
    setName('');
    setCode('');
    setDescription('');
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
    </div>
  );
};
