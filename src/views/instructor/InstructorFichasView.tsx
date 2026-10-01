/**
 * @license
 * SENA Learning Hub - Vista "Mis Fichas" (Instructor)
 * PROMPT 8: Estructura Académica SENA - Centro → Programa → Ficha → Curso → Competencia → RAP → Actividades
 * Colección Firestore: /fichas, /trainingPrograms, /trainingCenters, /courses, /competencies, /learningOutcomes
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  BookOpen,
  Target,
  ListOrdered,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import {
  Ficha,
  TrainingProgram,
  TrainingCenter,
  Course,
  Competency,
  LearningOutcome,
  EvidenceActivity,
} from '../../types/academic';
import { fichaService } from '../../services/academic/fichaService';
import { programService } from '../../services/academic/programService';
import { centerService } from '../../services/academic/centerService';
import { courseService } from '../../services/academic/courseService';
import { competencyService } from '../../services/academic/competencyService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { activityService } from '../../services/academic/activityService';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';

interface InstructorFichasViewProps {
  onSelectFicha?: (fichaId: string) => void;
  onNavigateToApprentices?: (fichaNumber: string) => void;
  onNavigateToActivities?: () => void;
}

export const InstructorFichasView: React.FC<InstructorFichasViewProps> = ({
  onSelectFicha,
  onNavigateToApprentices,
  onNavigateToActivities,
}) => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || 'inst_carlos_mendoza';

  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [selectedFichaId, setSelectedFichaId] = useState<string>('');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [centers, setCenters] = useState<TrainingCenter[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddCompetencyModalOpen, setIsAddCompetencyModalOpen] = useState(false);

  // Formulario nueva Ficha
  const [newFichaNumber, setNewFichaNumber] = useState('');
  const [newProgramId, setNewProgramId] = useState('');
  const [newCenterId, setNewCenterId] = useState('');
  const [newShift, setNewShift] = useState<'morning' | 'afternoon' | 'evening'>('evening');
  const [newStage, setNewStage] = useState<'induction' | 'lectiva' | 'productive' | 'completed'>('lectiva');

  // Formulario nueva Competencia para la Ficha
  const [newCompName, setNewCompName] = useState('');
  const [newCompCode, setNewCompCode] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [newCompType, setNewCompType] = useState<'transversal' | 'technical' | 'basic'>('transversal');
  const [newCompCourseId, setNewCompCourseId] = useState('');

  // 1. Cargar catálogo principal
  const loadMainData = async () => {
    setLoading(true);
    try {
      const [fichasRes, progsRes, centersRes] = await Promise.all([
        fichaService.getFichas(instructorUid),
        programService.getPrograms(),
        centerService.getCenters(),
      ]);

      const loadedFichas = fichasRes.data || [];
      const loadedProgs = progsRes.data || [];
      const loadedCenters = centersRes.data || [];

      setFichas(loadedFichas);
      setPrograms(loadedProgs);
      setCenters(loadedCenters);

      if (loadedFichas.length > 0 && !selectedFichaId) {
        setSelectedFichaId(loadedFichas[0].id);
      }
      if (loadedProgs.length > 0 && !newProgramId) {
        setNewProgramId(loadedProgs[0].id);
      }
      if (loadedCenters.length > 0 && !newCenterId) {
        setNewCenterId(loadedCenters[0].id);
      }
    } catch (err) {
      console.warn('[InstructorFichasView] Error cargando fichas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMainData();
  }, [instructorUid]);

  // Ficha activa
  const activeFicha = fichas.find((f) => f.id === selectedFichaId) || fichas[0];
  const activeProgram =
    programs.find((p) => p.id === activeFicha?.programId) || programs[0];
  const activeCenter =
    centers.find((c) => c.id === activeFicha?.centerId) || centers[0];

  // 2. Cargar dependencias de la Ficha Activa (Cursos, Competencias, RAPs, Actividades)
  useEffect(() => {
    if (!activeFicha) return;

    async function loadFichaHierarchy() {
      try {
        const [cRes, compRes, rapRes, actRes] = await Promise.all([
          courseService.getCoursesByFicha(activeFicha.id),
          competencyService.getCompetencies({
            programId: activeFicha.programId,
            fichaId: activeFicha.id,
          }),
          learningOutcomeService.getLearningOutcomes({
            programId: activeFicha.programId,
          }),
          activityService.getActivities({
            fichaId: activeFicha.id,
          }),
        ]);

        setCourses(cRes.data || []);
        setCompetencies(compRes.data || []);
        setLearningOutcomes(rapRes.data || []);
        setActivities(actRes.data || []);

        if (cRes.data && cRes.data.length > 0 && !newCompCourseId) {
          setNewCompCourseId(cRes.data[0].id);
        }
      } catch (err) {
        console.warn('[InstructorFichasView] Error cargando jerarquía:', err);
      }
    }

    loadFichaHierarchy();
  }, [activeFicha?.id, activeFicha?.programId]);

  // Traducción visual de jornada
  const shiftLabels: Record<string, { label: string; badge: string }> = {
    morning: { label: 'Diurna (Mañana)', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
    afternoon: { label: 'Tarde', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
    evening: { label: 'Nocturna', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  };

  // Traducción visual de etapa
  const stageLabels: Record<string, { label: string; badge: string }> = {
    induction: { label: 'Inducción', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
    lectiva: { label: 'Lectiva', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    productive: { label: 'Productiva', badge: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
    completed: { label: 'Finalizada', badge: 'bg-slate-100 text-slate-800 border-slate-300' },
  };

  // Guardar nueva Ficha (Firestore + Memoria)
  const handleCreateFicha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFichaNumber) return;

    const prog = programs.find((p) => p.id === newProgramId);
    const newFicha: Ficha = {
      id: `ficha_${newFichaNumber}`,
      number: newFichaNumber,
      name: `Ficha ${newFichaNumber} - ${prog?.name || 'Formación SENA'}`,
      programId: newProgramId || (programs[0]?.id ?? 'prog_gestion_contable'),
      programName: prog?.name || 'Gestión Contable y de Información Financiera',
      centerId: newCenterId || (centers[0]?.id ?? 'center_comercio_servicios'),
      instructorIds: [instructorUid],
      startDate: new Date().toISOString(),
      endDate: '2028-06-30T00:00:00Z',
      status: 'active',
      shift: newShift,
      stage: newStage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await fichaService.saveFicha(newFicha);
    setFichas([saved, ...fichas]);
    setSelectedFichaId(saved.id);
    setIsCreateModalOpen(false);
    setNewFichaNumber('');
  };

  // Guardar nueva Competencia en el catálogo del Programa (reutilizable, sin duplicar por ficha)
  const handleAddCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName || !newCompCode || !activeFicha) return;

    const selectedCourse = newCompCourseId || courses[0]?.id;

    // 1. Crear la competencia a nivel de PROGRAMA y CURSO (sin fichaId rígido para permitir reutilización)
    const newComp: Competency = {
      id: `comp_${Date.now()}`,
      name: newCompName,
      code: newCompCode,
      description: newCompDesc,
      type: newCompType,
      programId: activeFicha.programId,
      courseId: selectedCourse,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await competencyService.saveCompetency(newComp);

    // 2. Asegurar que el curso esté vinculado a la ficha en /fichaCourses
    if (selectedCourse) {
      try {
        await courseService.assignCourseToFicha({
          id: `fc_${activeFicha.id}_${selectedCourse}`,
          fichaId: activeFicha.id,
          courseId: selectedCourse,
          instructorIds: [instructorUid],
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[InstructorFichasView] Aviso vinculando curso a ficha:', err);
      }
    }

    setCompetencies([saved, ...competencies]);
    setIsAddCompetencyModalOpen(false);
    setNewCompName('');
    setNewCompCode('');
    setNewCompDesc('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado Institucional SENA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Estructura Académica SENA
            </span>
            <span className="text-xs text-slate-500">
              Centro:{' '}
              <strong>
                {activeCenter?.name || 'Centro de Comercio y Servicios'} (
                {activeCenter?.code || 'CCS'})
              </strong>
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">Mis Fichas de Formación</h1>
          <p className="text-xs text-slate-500">
            Jerarquía institucional: Centro → Programa → Ficha → Curso → Competencia → RAPs → Actividades
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Nueva Ficha
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Consultando estructura académica en Firestore...</p>
        </div>
      ) : (
        <>
          {/* 2. Selector de Fichas (Tabs visuales rápidos) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {fichas.map((f) => {
              const isSelected = f.id === activeFicha?.id;
              const prog = programs.find((p) => p.id === f.programId);
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFichaId(f.id);
                    onSelectFicha?.(f.id);
                  }}
                  className={`shrink-0 px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#00324D] text-white border-[#00324D] shadow-md ring-2 ring-[#39A900]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold">FICHA {f.number}</span>
                    {f.number === '3409626' && (
                      <span className="text-[10px] bg-[#39A900] text-white font-bold px-1.5 py-0.2 rounded">
                        Principal
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] truncate max-w-[200px] mt-0.5 ${
                      isSelected ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {f.programName || prog?.name || 'Programa SENA'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3. Tarjeta Maestra de la Ficha Seleccionada */}
          {activeFicha && (
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
              {/* Cabecera de la Ficha */}
              <div className="bg-gradient-to-r from-[#00324D] to-[#004A73] text-white p-6 border-b-4 border-[#39A900]">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black font-mono tracking-wider bg-white/10 text-[#8CE665] px-3 py-1 rounded-md border border-white/20">
                        FICHA {activeFicha.number}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          shiftLabels[activeFicha.shift]?.badge || 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        Jornada: {shiftLabels[activeFicha.shift]?.label || activeFicha.shift}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          stageLabels[activeFicha.stage]?.badge || 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        Etapa: {stageLabels[activeFicha.stage]?.label || activeFicha.stage}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {activeProgram?.name || activeFicha.programName || 'Programa de Formación'}
                    </h2>
                    <p className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#8CE665]" />
                      {activeCenter?.name || 'Centro de Comercio y Servicios'} · {activeCenter?.city || 'Ibagué'},{' '}
                      {activeCenter?.department || 'Tolima'}
                    </p>
                  </div>

                  {/* Estadística de Aprendices */}
                  <div className="bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/20 flex items-center gap-4 shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-[#39A900] text-white flex items-center justify-center font-bold">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white font-mono">
                        {activeFicha.number === '3409626' ? 28 : 32}
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium">aprendices matriculados</div>
                      <button
                        onClick={() => onNavigateToApprentices?.(activeFicha.number)}
                        className="text-[11px] text-[#8CE665] hover:underline font-bold mt-1 inline-flex items-center gap-1 cursor-pointer"
                      >
                        Ver lista de aprendices
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Estructura Académica Desglosada: Cursos → Competencias → RAPs → Actividades */}
              <div className="p-6 space-y-6">
                {/* A. CURSOS ASOCIADOS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#39A900]" />
                      Cursos Asociados a la Ficha ({courses.length})
                    </h3>
                    <span className="text-xs text-slate-400">Ambientes de formación transversales y técnicos</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-[#39A900] transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#00324D] bg-white px-2 py-0.5 rounded border border-slate-200">
                            {course.code}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {course.type === 'transversal' ? 'Transversal' : 'Técnico'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{course.name}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* B. COMPETENCIAS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#39A900]" />
                      Competencias del Programa ({competencies.length})
                    </h3>
                    <button
                      onClick={() => setIsAddCompetencyModalOpen(true)}
                      className="text-xs font-bold text-[#2E8500] hover:text-[#00324D] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Vincular Competencia
                    </button>
                  </div>

                  <div className="space-y-2">
                    {competencies.map((comp) => (
                      <div
                        key={comp.id}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-[#00324D] bg-white px-2 py-0.5 rounded border border-slate-200">
                              Código: {comp.code}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{comp.name}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                            {comp.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 italic bg-white p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                          "{comp.description}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* C. RESULTADOS DE APRENDIZAJE (RAPs) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-[#39A900]" />
                      Resultados de Aprendizaje (RAPs) Vinculados ({learningOutcomes.length})
                    </h3>
                    <span className="text-xs text-slate-400">Ordenados por secuencia curricular</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {learningOutcomes.map((rap) => (
                      <div
                        key={rap.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="w-6 h-6 rounded-full bg-[#00324D] text-white flex items-center justify-center font-bold text-[11px]">
                              {rap.sequence}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {rap.code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {rap.description}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Estado: Activo</span>
                          <span className="text-[#39A900] font-bold">Fase Lectiva</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* D. ACTIVIDADES Y EVIDENCIAS ASOCIADAS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#39A900]" />
                      Actividades y Evidencias de la Ficha ({activities.length})
                    </h3>
                    <button
                      onClick={onNavigateToActivities}
                      className="text-xs font-bold text-[#2E8500] hover:text-[#00324D] flex items-center gap-1 cursor-pointer"
                    >
                      Gestionar Evidencias
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {activities.length === 0 ? (
                    <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                      No hay actividades formativas publicadas para esta ficha aún.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {activities.map((act) => (
                        <div
                          key={act.id}
                          className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 hover:border-[#39A900] transition-colors flex flex-col justify-between space-y-2"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00324D] text-white font-mono uppercase">
                                {act.submissionType}
                              </span>
                              <span className="text-[10px] font-bold text-[#2E8500] bg-[#EBF8E7] px-2 py-0.5 rounded">
                                {act.points || 100} pts
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{act.title}</h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                              {act.instructions || act.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center justify-between">
                            <span>Plazo:</span>
                            <span className="font-semibold text-slate-700">
                              {act.dueDate ? act.dueDate.split('T')[0] : 'Sin fecha'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: Crear Nueva Ficha */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nueva Ficha de Formación SENA"
        subtitle="Registro oficial en /fichas con instructor y programa vinculado"
        footer={
          <>
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateFicha}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Guardar Ficha
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateFicha} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número de Ficha SENA *
            </label>
            <input
              type="text"
              placeholder="Ej: 3409626 o 2981045"
              required
              value={newFichaNumber}
              onChange={(e) => setNewFichaNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Programa de Formación Asociado *
            </label>
            <select
              value={newProgramId}
              onChange={(e) => setNewProgramId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) - {p.level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Centro de Formación *
            </label>
            <select
              value={newCenterId}
              onChange={(e) => setNewCenterId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            >
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}) - {c.city}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jornada Formativa
              </label>
              <select
                value={newShift}
                onChange={(e) => setNewShift(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="morning">Diurna (Mañana)</option>
                <option value="afternoon">Tarde</option>
                <option value="evening">Nocturna</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Etapa Formativa
              </label>
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="induction">Inducción</option>
                <option value="lectiva">Etapa Lectiva</option>
                <option value="productive">Etapa Productiva</option>
                <option value="completed">Finalizada</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: Registrar / Vincular Competencia al Programa de la Ficha */}
      <Modal
        isOpen={isAddCompetencyModalOpen}
        onClose={() => setIsAddCompetencyModalOpen(false)}
        title="Registrar Competencia en el Programa de la Ficha"
        subtitle={`Catálogo reutilizable del programa (${activeProgram?.name || ''}) · Vinculación vía /fichaCourses`}
        footer={
          <>
            <button
              onClick={() => setIsAddCompetencyModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddCompetency}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Guardar en /competencies
            </button>
          </>
        }
      >
        <form onSubmit={handleAddCompetency} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la Norma / Competencia *
            </label>
            <input
              type="text"
              placeholder="Ej: Gestionar procesos contables según normativa..."
              required
              value={newCompName}
              onChange={(e) => setNewCompName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código Laboral *
              </label>
              <input
                type="text"
                placeholder="Ej: 210301019"
                required
                value={newCompCode}
                onChange={(e) => setNewCompCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo
              </label>
              <select
                value={newCompType}
                onChange={(e) => setNewCompType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="transversal">Transversal</option>
                <option value="technical">Técnica</option>
                <option value="basic">Básica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Curso Vinculado
            </label>
            <select
              value={newCompCourseId}
              onChange={(e) => setNewCompCourseId(e.target.value)}
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
              Descripción y Criterios
            </label>
            <textarea
              rows={3}
              placeholder="Descripción de la competencia y contexto formativo..."
              value={newCompDesc}
              onChange={(e) => setNewCompDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
