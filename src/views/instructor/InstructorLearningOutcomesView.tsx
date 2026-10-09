/**
 * @license
 * SENA Learning Hub - Vista de Resultados de Aprendizaje (RAP) (Instructor)
 * PROMPT 39: Organización en 4 Categorías de Competencias de Inglés SENA
 * Persistencia oficial en Cloud Firestore: /learningOutcomes y /competencies
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Plus,
  BookOpen,
  Search,
  Filter,
  Layers,
  Edit3,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Award,
  ChevronRight,
  BookCheck,
  FolderSync,
  AlertCircle,
  FileText,
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

// Definición canónica de las 4 Categorías de Competencias de Inglés SENA
export interface EnglishRapCategory {
  id: string;
  categoryNumber: 1 | 2 | 3 | 4;
  badgeLabel: string;
  title: string;
  competencyCode: string;
  competencyName: string;
  competencyDescription: string;
  competencyIds: string[];
  colorClasses: {
    bgLight: string;
    border: string;
    textDark: string;
    badgeBg: string;
    badgeText: string;
    accent: string;
  };
}

export const ENGLISH_RAP_CATEGORIES: EnglishRapCategory[] = [
  {
    id: 'cat_comprension',
    categoryNumber: 1,
    badgeLabel: 'CATEGORÍA 1',
    title: 'Comprender textos en inglés en forma escrita y auditiva',
    competencyCode: '240201501',
    competencyName: 'Comprender textos en inglés en forma escrita y auditiva',
    competencyDescription:
      'Comprender textos en inglés en forma escrita y auditiva según las necesidades del contexto personal, social y técnico.',
    competencyIds: ['comp_ingles_01', 'comp_ingles_comprension', '240201501'],
    colorClasses: {
      bgLight: 'bg-emerald-50/70',
      border: 'border-emerald-300',
      textDark: 'text-emerald-950',
      badgeBg: 'bg-[#39A900]',
      badgeText: 'text-white',
      accent: '#39A900',
    },
  },
  {
    id: 'cat_interaccion_social',
    categoryNumber: 2,
    badgeLabel: 'CATEGORÍA 2',
    title:
      'Interactuar en lengua inglesa de forma oral y escrita dentro de contextos sociales y laborales según los criterios establecidos por el Marco Común Europeo de Referencia para las Lenguas',
    competencyCode: '240202501',
    competencyName:
      'Interactuar en lengua inglesa de forma oral y escrita dentro de contextos sociales y laborales según los criterios establecidos por el Marco Común Europeo de Referencia para las Lenguas',
    competencyDescription:
      'Interactuar en lengua inglesa de forma oral y escrita dentro de contextos sociales y laborales según los criterios del MCERL (A1 - B1).',
    competencyIds: ['comp_ingles_laboral', 'comp_ingles_02', '240202501'],
    colorClasses: {
      bgLight: 'bg-sky-50/70',
      border: 'border-sky-300',
      textDark: 'text-sky-950',
      badgeBg: 'bg-[#00324D]',
      badgeText: 'text-[#8CE665]',
      accent: '#00324D',
    },
  },
  {
    id: 'cat_produccion_escrita',
    categoryNumber: 3,
    badgeLabel: 'CATEGORÍA 3',
    title: 'Producir textos en inglés en forma escrita y oral',
    competencyCode: '240201502',
    competencyName: 'Producir textos en inglés en forma escrita y oral',
    competencyDescription:
      'Producir textos en inglés en forma escrita y oral según los requerimientos del contexto laboral y social.',
    competencyIds: ['comp_ingles_03', 'comp_ingles_produccion', '240201502'],
    colorClasses: {
      bgLight: 'bg-amber-50/70',
      border: 'border-amber-300',
      textDark: 'text-amber-950',
      badgeBg: 'bg-amber-600',
      badgeText: 'text-white',
      accent: '#D97706',
    },
  },
  {
    id: 'cat_interaccion_laboral',
    categoryNumber: 4,
    badgeLabel: 'CATEGORÍA 4',
    title: 'Interactuar en contextos laborales y productivos en inglés',
    competencyCode: '240202502',
    competencyName:
      'Interactuar en contextos laborales y productivos en inglés según el Marco Común Europeo de Referencia para las Lenguas',
    competencyDescription:
      'Interactuar en lengua inglesa en contextos laborales y productivos según los criterios de fluidez y precisión del Marco Común Europeo (B1 - B2).',
    competencyIds: ['comp_ingles_04', 'comp_ingles_avanzado', '240202502'],
    colorClasses: {
      bgLight: 'bg-purple-50/70',
      border: 'border-purple-300',
      textDark: 'text-purple-950',
      badgeBg: 'bg-purple-700',
      badgeText: 'text-white',
      accent: '#7E22CE',
    },
  },
];

export const InstructorLearningOutcomesView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';

  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Modal: Crear Nuevo RAP
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createSequence, setCreateSequence] = useState(1);
  const [createDescription, setCreateDescription] = useState('');
  const [createCompetencyId, setCreateCompetencyId] = useState('');
  const [createProgramId, setCreateProgramId] = useState('');
  const [createCourseId, setCreateCourseId] = useState('');

  // Modal: Editar RAP
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState<LearningOutcome | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editSequence, setEditSequence] = useState(1);
  const [editDescription, setEditDescription] = useState('');
  const [editCompetencyId, setEditCompetencyId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Sincronización general
  const [syncingFirestore, setSyncingFirestore] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

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

      setCreateSequence(loadedRaps.length + 1);
      if (loadedComps.length > 0 && !createCompetencyId) setCreateCompetencyId(loadedComps[0].id);
      if (loadedProgs.length > 0 && !createProgramId) setCreateProgramId(loadedProgs[0].id);
      if (loadedCourses.length > 0 && !createCourseId) setCreateCourseId(loadedCourses[0].id);
    } catch (err) {
      console.warn('[InstructorLearningOutcomesView] Error cargando RAPs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instructorUid]);

  // Asignar cada RAP a su Categoría correspondiente de las 4 oficiales
  const getCategoryForOutcome = (outcome: LearningOutcome): EnglishRapCategory => {
    // 1. Por ID directo de competencia
    for (const cat of ENGLISH_RAP_CATEGORIES) {
      if (cat.competencyIds.includes(outcome.competencyId)) {
        return cat;
      }
    }

    // 2. Por código del RAP
    const code = outcome.code || '';
    if (code.includes('240201501')) return ENGLISH_RAP_CATEGORIES[0];
    if (code.includes('240202501')) return ENGLISH_RAP_CATEGORIES[1];
    if (code.includes('240201502')) return ENGLISH_RAP_CATEGORIES[2];
    if (code.includes('240202502')) return ENGLISH_RAP_CATEGORIES[3];

    // 3. Por ID del resultado
    const outcomeId = outcome.id || '';
    if (outcomeId.includes('cat1')) return ENGLISH_RAP_CATEGORIES[0];
    if (outcomeId.includes('cat2') || outcomeId === 'rap_ingles_01' || outcomeId === 'rap_ingles_02' || outcomeId === 'rap_ingles_03')
      return ENGLISH_RAP_CATEGORIES[1];
    if (outcomeId.includes('cat3')) return ENGLISH_RAP_CATEGORIES[2];
    if (outcomeId.includes('cat4')) return ENGLISH_RAP_CATEGORIES[3];

    // 4. Por similitud textual con la descripción
    const desc = outcome.description.toLowerCase();
    if (
      desc.includes('intercambios sociales y prácticos muy breves') ||
      desc.includes('leer textos muy breves') ||
      desc.includes('encontrar vocabulario y expresiones') ||
      desc.includes('información específica y predecible')
    ) {
      return ENGLISH_RAP_CATEGORIES[0];
    }
    if (
      desc.includes('situaciones cotidianas y laborales actuales y futuras') ||
      desc.includes('intercambiar opiniones sobre situaciones') ||
      desc.includes('discutir sobre posibles soluciones a problemas') ||
      desc.includes('acciones de mejora relacionadas con el uso')
    ) {
      return ENGLISH_RAP_CATEGORIES[1];
    }
    if (
      desc.includes('redactar textos breves') ||
      desc.includes('describir procesos, entornos laborales') ||
      desc.includes('elaborar resúmenes, informes sencillos') ||
      desc.includes('presentar oralmente informes')
    ) {
      return ENGLISH_RAP_CATEGORIES[2];
    }
    if (
      desc.includes('participar en conversaciones y reuniones de trabajo') ||
      desc.includes('documentación técnica especializada') ||
      desc.includes('argumentar y justificar puntos de vista') ||
      desc.includes('diseñar propuestas y proyectos técnicos')
    ) {
      return ENGLISH_RAP_CATEGORIES[3];
    }

    // Por defecto categoría 1
    return ENGLISH_RAP_CATEGORIES[0];
  };

  // Agrupamiento estructurado de RAPs por categoría
  const outcomesByCategory = useMemo(() => {
    const groups: Record<number, LearningOutcome[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
    };

    const q = searchTerm.trim().toLowerCase();

    outcomes.forEach((rap) => {
      // Filtro de búsqueda
      if (q) {
        const matches =
          rap.code.toLowerCase().includes(q) ||
          rap.description.toLowerCase().includes(q);
        if (!matches) return;
      }

      const cat = getCategoryForOutcome(rap);
      groups[cat.categoryNumber].push(rap);
    });

    // Ordenar por secuencia
    Object.keys(groups).forEach((key) => {
      const num = Number(key);
      groups[num].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    });

    return groups;
  }, [outcomes, searchTerm]);

  // Abrir modal de edición
  const handleOpenEditModal = (outcome: LearningOutcome) => {
    setEditingOutcome(outcome);
    setEditCode(outcome.code);
    setEditSequence(outcome.sequence || 1);
    setEditDescription(outcome.description);
    setEditCompetencyId(outcome.competencyId);
    setIsEditModalOpen(true);
  };

  // Guardar edición en Firestore y en estado local
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOutcome || !editDescription.trim()) return;

    setSavingEdit(true);
    try {
      const updatedOutcome: LearningOutcome = {
        ...editingOutcome,
        code: editCode.trim() || editingOutcome.code,
        sequence: Number(editSequence) || editingOutcome.sequence,
        description: editDescription.trim(),
        competencyId: editCompetencyId || editingOutcome.competencyId,
        updatedAt: new Date().toISOString(),
      };

      const saved = await learningOutcomeService.saveLearningOutcome(updatedOutcome);

      setOutcomes((prev) =>
        prev.map((o) => (o.id === saved.id ? saved : o))
      );

      setIsEditModalOpen(false);
      setEditingOutcome(null);
      showToast(`Resultado de Aprendizaje ${saved.code} actualizado en Firestore con éxito.`, 'success');
    } catch (err) {
      console.error('[InstructorLearningOutcomesView] Error actualizando RAP:', err);
      showToast('Error al actualizar el RAP en Firestore. Por favor reintente.', 'info');
    } finally {
      setSavingEdit(false);
    }
  };

  // Guardar nuevo RAP
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCode || !createDescription) return;

    const parentComp = competencies.find((c) => c.id === createCompetencyId);

    const newOutcome: LearningOutcome = {
      id: `rap_${Date.now()}`,
      competencyId: createCompetencyId || (competencies[0]?.id ?? 'comp_ingles_01'),
      programId: createProgramId || parentComp?.programId || (programs[0]?.id ?? 'prog_gestion_contable'),
      courseId: createCourseId || parentComp?.courseId || (courses[0]?.id ?? 'course_ingles_laboral'),
      code: createCode.trim(),
      sequence: Number(createSequence),
      description: createDescription.trim(),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await learningOutcomeService.saveLearningOutcome(newOutcome);
    setOutcomes((prev) => [...prev, saved]);
    setIsCreateModalOpen(false);
    setCreateCode('');
    setCreateDescription('');
    setCreateSequence(outcomes.length + 2);
    showToast(`Nuevo RAP ${saved.code} registrado y persistido en Firestore.`, 'success');
  };

  // Sincronizar todos los RAPs con Firestore
  const handleSyncAllToFirestore = async () => {
    setSyncingFirestore(true);
    try {
      for (const rap of outcomes) {
        await learningOutcomeService.saveLearningOutcome(rap);
      }
      showToast(`Todos los ${outcomes.length} RAPs oficiales están sincronizados con Firestore.`, 'success');
    } catch (err) {
      console.warn('Error sincronizando RAPs con Firestore:', err);
      showToast('Aviso: Algunos RAPs se conservaron en caché local.', 'info');
    } finally {
      setSyncingFirestore(false);
    }
  };

  const totalRapsCount = outcomes.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-12">
      {/* Toast de confirmación discreto */}
      {feedbackToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 bg-[#00324D] text-white px-4 py-3 rounded-xl shadow-lg border border-[#39A900]/40 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-[#8CE665] shrink-0" />
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2.5 py-0.5 rounded shadow-2xs">
              Estructura Curricular SENA
            </span>
            <span className="text-[11px] font-bold bg-[#EBF8E7] text-[#2E8500] px-2.5 py-0.5 rounded border border-[#39A900]/30 font-mono">
              Firestore /learningOutcomes
            </span>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-200">
              {totalRapsCount} RAPs registrados
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#00324D] mt-1.5 flex items-center gap-2">
            <Award className="w-6 h-6 text-[#39A900]" />
            Resultados de Aprendizaje (RAP)
          </h1>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed mt-0.5">
            Organización oficial de los logros formativos observables en <strong>cuatro categorías</strong> asociadas a las cuatro competencias principales de inglés del programa de formación SENA.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSyncAllToFirestore}
            disabled={syncingFirestore}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#00324D] border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Sincronizar y persistir todos los RAPs en la base de datos Firestore"
          >
            <FolderSync className={`w-3.5 h-3.5 text-[#39A900] ${syncingFirestore ? 'animate-spin' : ''}`} />
            {syncingFirestore ? 'Sincronizando...' : 'Sincronizar Firestore'}
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Nuevo RAP
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Navegación entre Categorías */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código RAP (ej: 240201501-01) o texto pedagógico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selector de pestañas por categoría */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeCategoryFilter === 'all'
                  ? 'bg-[#00324D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas las categorías ({totalRapsCount})
            </button>
            {ENGLISH_RAP_CATEGORIES.map((cat) => {
              const count = outcomesByCategory[cat.categoryNumber]?.length || 0;
              const isActive = activeCategoryFilter === String(cat.categoryNumber);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(String(cat.categoryNumber))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#39A900] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>Cat. {cat.categoryNumber}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <RefreshCw className="w-7 h-7 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-bold text-slate-700">Consultando y estructurando RAPs en Firestore...</p>
          <p className="text-[11px] text-slate-400">Organizando las cuatro categorías de inglés SENA</p>
        </div>
      ) : (
        /* Renderizado de las 4 Categorías */
        <div className="space-y-8">
          {ENGLISH_RAP_CATEGORIES.map((category) => {
            // Filtrar si no coincide con el filtro activo
            if (activeCategoryFilter !== 'all' && activeCategoryFilter !== String(category.categoryNumber)) {
              return null;
            }

            const categoryRaps = outcomesByCategory[category.categoryNumber] || [];

            return (
              <div
                key={category.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Cabecera distintiva de la categoría */}
                <div className={`p-5 border-b ${category.colorClasses.bgLight} ${category.colorClasses.border}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded shadow-2xs ${category.colorClasses.badgeBg} ${category.colorClasses.badgeText}`}
                        >
                          {category.badgeLabel}
                        </span>
                        <span className="text-[11px] font-bold bg-white/90 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono">
                          Norma SENA: {category.competencyCode}
                        </span>
                        <span className="text-[11px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                          {categoryRaps.length} {categoryRaps.length === 1 ? 'resultado' : 'resultados'} de aprendizaje
                        </span>
                      </div>

                      <h2 className="text-lg font-black text-[#00324D] leading-snug">
                        {category.title}
                      </h2>

                      <div className="pt-1 text-xs text-slate-600 flex items-start gap-2">
                        <Target className="w-4 h-4 text-[#39A900] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-800">Competencia principal:</strong>{' '}
                          <span>{category.competencyName}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCreateCompetencyId(category.competencyIds[0]);
                        setCreateCode(`RAP-${category.competencyCode}-0${categoryRaps.length + 1}`);
                        setCreateSequence(categoryRaps.length + 1);
                        setIsCreateModalOpen(true);
                      }}
                      className="self-start px-3.5 py-1.5 bg-white hover:bg-slate-50 text-[#00324D] border border-slate-300 rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#39A900]" />
                      + Agregar RAP a esta categoría
                    </button>
                  </div>
                </div>

                {/* Lista de Resultados de Aprendizaje de esta Categoría */}
                <div className="p-5">
                  {categoryRaps.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
                      <p className="text-xs text-slate-500 font-medium">
                        {searchTerm
                          ? 'No se encontraron resultados de aprendizaje que coincidan con la búsqueda en esta categoría.'
                          : 'No hay resultados registrados en esta categoría aún.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {categoryRaps.map((rap, index) => {
                        const displaySequence = rap.sequence || index + 1;
                        return (
                          <div
                            key={rap.id}
                            className="group bg-slate-50/60 hover:bg-white rounded-xl border border-slate-200 hover:border-[#39A900] p-4 transition-all shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
                          >
                            <div className="flex items-start gap-3.5 flex-1">
                              {/* Número de secuencia pedagógica */}
                              <div className="w-9 h-9 rounded-lg bg-[#00324D] text-[#8CE665] flex items-center justify-center font-mono font-black text-sm shrink-0 shadow-2xs">
                                {displaySequence}
                              </div>

                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-xs text-[#00324D] bg-[#EBF8E7] px-2 py-0.5 rounded border border-[#39A900]/30 shadow-2xs">
                                    {rap.code}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium font-mono">
                                    Secuencia #{displaySequence}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold text-[#2E8500] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Vigente
                                  </span>
                                </div>

                                {/* Descripción pedagógica observable */}
                                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                                  {rap.description}
                                </p>
                              </div>
                            </div>

                            {/* Botón de edición del RAP */}
                            <div className="flex items-center justify-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(rap)}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-[#00324D] hover:text-[#39A900] rounded-lg border border-slate-200 hover:border-[#39A900] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                title="Editar contenido de este Resultado de Aprendizaje"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#39A900]" />
                                <span>Editar</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Editar Contenido del RAP */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!savingEdit) {
            setIsEditModalOpen(false);
            setEditingOutcome(null);
          }
        }}
        title="Editar Resultado de Aprendizaje (RAP)"
        subtitle="Actualización pedagógica y persistencia oficial en Firestore (/learningOutcomes)"
        footer={
          <>
            <button
              type="button"
              disabled={savingEdit}
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingOutcome(null);
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={savingEdit}
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {savingEdit ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Guardando en Firestore...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </>
        }
      >
        {editingOutcome && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código oficial del RAP *
                </label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] font-mono font-bold"
                  placeholder="Ej: RAP-240201501-01"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Secuencia pedagógica *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editSequence}
                  onChange={(e) => setEditSequence(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Categoría / Competencia Asociada *
              </label>
              <select
                value={editCompetencyId}
                onChange={(e) => setEditCompetencyId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white font-medium"
              >
                {ENGLISH_RAP_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.competencyIds[0]}>
                    Categoría {cat.categoryNumber}: {cat.competencyCode} — {cat.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción Pedagógica Observable *
              </label>
              <textarea
                rows={4}
                required
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describir el logro de aprendizaje en términos de conocimientos, habilidades y actitudes observables..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                El texto describe el logro formativo evaluable para los aprendices en las evidencias pedagógicas.
              </p>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Crear Nuevo RAP */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Crear Nuevo Resultado de Aprendizaje (RAP)"
        subtitle="Registro oficial en /learningOutcomes según categoría y secuencia pedagógica"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Guardar RAP en Firestore
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Código del RAP *
              </label>
              <input
                type="text"
                placeholder="Ej: RAP-240201501-08"
                required
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Secuencia Pedagógica *
              </label>
              <input
                type="number"
                min="1"
                required
                value={createSequence}
                onChange={(e) => setCreateSequence(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Categoría / Competencia de Destino *
            </label>
            <select
              value={createCompetencyId}
              onChange={(e) => setCreateCompetencyId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white"
            >
              {ENGLISH_RAP_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.competencyIds[0]}>
                  Categoría {cat.categoryNumber}: {cat.competencyCode} — {cat.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descripción Pedagógica Observable *
            </label>
            <textarea
              rows={3}
              placeholder="Describir el logro de aprendizaje en términos de conocimientos, habilidades y actitudes..."
              required
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
