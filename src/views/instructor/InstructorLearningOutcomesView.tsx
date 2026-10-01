/**
 * @license
 * SENA Learning Hub - Vista de Resultados de Aprendizaje (RAP) (Instructor)
 * PROMPT 8: Estructura Académica SENA - Colección Firestore: /learningOutcomes
 */

import React, { useState, useEffect } from 'react';
import {
  ListOrdered,
  Plus,
  Target,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
} from 'lucide-react';
import {
  LearningOutcome,
  Competency,
  Course,
  TrainingProgram,
} from '../../types/academic';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { competencyService } from '../../services/academic/competencyService';
import { courseService } from '../../services/academic/courseService';
import { programService } from '../../services/academic/programService';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';

export const InstructorLearningOutcomesView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || 'inst_carlos_mendoza';

  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetency, setSelectedCompetency] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [sequence, setSequence] = useState(1);
  const [description, setDescription] = useState('');
  const [competencyId, setCompetencyId] = useState('');
  const [programId, setProgramId] = useState('');
  const [courseId, setCourseId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [rapsRes, compsRes, coursesRes, progsRes] = await Promise.all([
        learningOutcomeService.getLearningOutcomes(),
        competencyService.getCompetencies(),
        courseService.getCourses(),
        programService.getPrograms(),
      ]);

      const loadedRaps = rapsRes.data || [];
      const loadedComps = compsRes.data || [];
      const loadedCourses = coursesRes.data || [];
      const loadedProgs = progsRes.data || [];

      setOutcomes(loadedRaps);
      setCompetencies(loadedComps);
      setCourses(loadedCourses);
      setPrograms(loadedProgs);

      setSequence(loadedRaps.length + 1);
      if (loadedComps.length > 0 && !competencyId) setCompetencyId(loadedComps[0].id);
      if (loadedProgs.length > 0 && !programId) setProgramId(loadedProgs[0].id);
      if (loadedCourses.length > 0 && !courseId) setCourseId(loadedCourses[0].id);
    } catch (err) {
      console.warn('[InstructorLearningOutcomesView] Error cargando RAPs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instructorUid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !description) return;

    const parentComp = competencies.find((c) => c.id === competencyId);

    const newOutcome: LearningOutcome = {
      id: `rap_${Date.now()}`,
      competencyId: competencyId || (competencies[0]?.id ?? 'comp_ingles_01'),
      programId: programId || parentComp?.programId || (programs[0]?.id ?? 'prog_gestion_contable'),
      courseId: courseId || parentComp?.courseId || (courses[0]?.id ?? 'course_ingles_laboral'),
      code,
      sequence: Number(sequence),
      description,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await learningOutcomeService.saveLearningOutcome(newOutcome);
    const updated = [...outcomes, saved].sort((a, b) => a.sequence - b.sequence);
    setOutcomes(updated);
    setIsModalOpen(false);
    setCode('');
    setDescription('');
    setSequence(updated.length + 1);
  };

  const filteredOutcomes = outcomes.filter((rap) => {
    if (selectedCompetency !== 'all' && rap.competencyId !== selectedCompetency) {
      return false;
    }
    if (selectedProgram !== 'all' && rap.programId && rap.programId !== selectedProgram) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCode = rap.code.toLowerCase().includes(q);
      const matchDesc = rap.description.toLowerCase().includes(q);
      return matchCode || matchDesc;
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
              Resultados de Aprendizaje (RAP)
            </span>
            <span className="text-[11px] font-bold bg-[#EBF8E7] text-[#2E8500] px-2 py-0.5 rounded border border-[#39A900]/30">
              Firestore /learningOutcomes
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">Resultados de Aprendizaje (RAP)</h1>
          <p className="text-xs text-slate-500">
            Logros de aprendizaje observables vinculados a competencias, evaluables mediante actividades y evidencias
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Nuevo RAP
        </button>
      </div>

      {/* Filtros multicriterio */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código RAP o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
            />
          </div>

          <div>
            <select
              value={selectedCompetency}
              onChange={(e) => setSelectedCompetency(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
            >
              <option value="all">Todas las competencias</option>
              {competencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
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
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Consultando RAPs en Firestore...</p>
        </div>
      ) : filteredOutcomes.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 p-6">
          <p className="text-xs text-slate-500">No se encontraron RAPs con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOutcomes.map((rap) => {
            const comp = competencies.find((c) => c.id === rap.competencyId);
            const course = courses.find((c) => c.id === rap.courseId || c.id === comp?.courseId);

            return (
              <div
                key={rap.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-start gap-4 hover:border-[#39A900] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#00324D] text-[#8CE665] flex items-center justify-center font-bold text-sm shrink-0 font-mono shadow-2xs">
                  {rap.sequence}
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#00324D] bg-[#EBF8E7] px-2 py-0.5 rounded border border-[#39A900]/20">
                        {rap.code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Secuencia #{rap.sequence}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#2E8500] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Vigente
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                    {rap.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    {comp && (
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-[#39A900]" />
                        <span>
                          Competencia: <strong>{comp.name}</strong> ({comp.code})
                        </span>
                      </div>
                    )}
                    {course && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>Curso: {course.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Nuevo RAP */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Resultado de Aprendizaje (RAP)"
        subtitle="Registro oficial en /learningOutcomes según secuencia pedagógica"
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
              Guardar RAP en Firestore
            </button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código del RAP *
              </label>
              <input
                type="text"
                placeholder="Ej: RAP-240202501-05"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Secuencia Pedagógica *
              </label>
              <input
                type="number"
                min="1"
                required
                value={sequence}
                onChange={(e) => setSequence(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Competencia Asociada *
            </label>
            <select
              value={competencyId}
              onChange={(e) => setCompetencyId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            >
              {competencies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.code} - {comp.name}
                </option>
              ))}
            </select>
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
              Descripción Pedagógica Observable *
            </label>
            <textarea
              rows={3}
              placeholder="Describir el logro de aprendizaje en términos de conocimientos, habilidades y actitudes..."
              required
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
