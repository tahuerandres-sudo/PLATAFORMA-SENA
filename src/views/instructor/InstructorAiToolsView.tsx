/**
 * @license
 * SENA Learning Hub - Herramientas Pedagógicas IA para Instructores
 * PROMPT 15: Suite avanzada para diseño de actividades, evaluación y material didáctico (Gemini AI Server-Side)
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  MessageSquare,
  FileSpreadsheet,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Download,
  Edit3,
} from 'lucide-react';
import {
  geminiAiService,
  ActivityProposalResult,
  QuestionItem,
} from '../../services/ai/geminiAiService';
import { useAuth } from '../../hooks/useAuth';
import { fichaService } from '../../services/academic/fichaService';
import { programService } from '../../services/academic/programService';
import { competencyService } from '../../services/academic/competencyService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { Ficha, TrainingProgram, Competency, LearningOutcome } from '../../types/academic';

type InstructorToolId = 'activities' | 'questions' | 'feedback' | 'materials';

export const InstructorAiToolsView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';

  const [activeTool, setActiveTool] = useState<InstructorToolId>('activities');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Contexto académico real consultado de Firestore
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);

  useEffect(() => {
    async function loadAcademicContext() {
      if (!instructorUid) return;
      try {
        const [fRes, pRes, cRes, loRes] = await Promise.all([
          fichaService.getFichas(instructorUid),
          programService.getPrograms(),
          competencyService.getCompetencies(),
          learningOutcomeService.getLearningOutcomes(),
        ]);
        setFichas(fRes.data || []);
        setPrograms(pRes.data || []);
        setCompetencies(cRes.data || []);
        setLearningOutcomes(loRes.data || []);
      } catch (err) {
        console.warn('Aviso cargando contexto académico para IA:', err);
      }
    }
    loadAcademicContext();
  }, [instructorUid]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // =========================================================================
  // ESTADO HERRAMIENTA A: GENERADOR DE ACTIVIDADES
  // =========================================================================
  const [actFicha, setActFicha] = useState('');
  const [actProgram, setActProgram] = useState('');
  const [actCompetency, setActCompetency] = useState('');
  const [actLearningOutcome, setActLearningOutcome] = useState('');
  const [actLevel, setActLevel] = useState('A2');
  const [actTopic, setActTopic] = useState('Customer Service in English: Handling Inquiries');
  const [actType, setActType] = useState('Entrega de evidencia multimedia (Video/Audio)');
  const [generatedActivity, setGeneratedActivity] = useState<ActivityProposalResult | null>(null);

  const handleGenerateActivity = async () => {
    if (!actTopic.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await geminiAiService.generateActivityProposal({
        program: actProgram || (programs[0]?.name ?? 'Formación Técnica SENA'),
        ficha: actFicha || (fichas[0]?.number ? `Ficha #${fichas[0].number}` : 'Ficha Asignada'),
        competency: actCompetency || (competencies[0]?.name ?? 'Interactuar en lengua inglesa'),
        learningOutcome: actLearningOutcome || (learningOutcomes[0]?.name ?? 'RAP Bilingüismo'),
        cefrLevel: actLevel,
        topic: actTopic.trim(),
        activityType: actType,
      });
      setGeneratedActivity(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al generar la propuesta de actividad.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // ESTADO HERRAMIENTA B: GENERADOR DE PREGUNTAS
  // =========================================================================
  const [qTopic, setQTopic] = useState('Past simple irregular verbs & workplace situations');
  const [qLevel, setQLevel] = useState('A2');
  const [qType, setQType] = useState('Multiple choice');
  const [qCount, setQCount] = useState(4);
  const [qContext, setQContext] = useState('General Vocational');
  const [generatedQuestions, setGeneratedQuestions] = useState<QuestionItem[]>([]);

  const handleGenerateQuestions = async () => {
    if (!qTopic.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const questions = await geminiAiService.generateQuestions({
        topic: qTopic.trim(),
        cefrLevel: qLevel,
        questionType: qType,
        count: qCount,
        occupationalContext: qContext,
      });
      setGeneratedQuestions(questions);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al generar las preguntas de evaluación.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // ESTADO HERRAMIENTA C: GENERADOR DE RETROALIMENTACIÓN (FEEDBACK)
  // =========================================================================
  const [fbPerformance, setFbPerformance] = useState(
    'El aprendiz entregó el video a tiempo. Buena pronunciación general y uso adecuado de vocabulario técnico, pero confunde el pasado simple con el presente en dos oraciones.'
  );
  const [fbLanguage, setFbLanguage] = useState<'es' | 'en'>('es');
  const [fbStrengths, setFbStrengths] = useState('Fluidez, seguridad corporal y vocabulario técnico');
  const [fbAreasToImprove, setFbAreasToImprove] = useState('Uso correcto de verbos regulares en pasado (-ed)');
  const [fbDraft, setFbDraft] = useState<string>('');
  const [fbApproved, setFbApproved] = useState(false);

  const handleGenerateFeedback = async () => {
    if (!fbPerformance.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setFbApproved(false);
    try {
      const draft = await geminiAiService.generateFeedbackDraft({
        learnerPerformance: fbPerformance.trim(),
        language: fbLanguage,
        strengths: fbStrengths.trim(),
        areasToImprove: fbAreasToImprove.trim(),
      });
      setFbDraft(draft);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al generar el borrador de retroalimentación.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // ESTADO HERRAMIENTA D: GENERADOR DE MATERIAL DIDÁCTICO
  // =========================================================================
  const [matType, setMatType] = useState('Worksheets');
  const [matTopic, setMatTopic] = useState('Telephone Etiquette & Taking Customer Messages');
  const [matLevel, setMatLevel] = useState('B1');
  const [matContext, setMatContext] = useState('Gestión Administrativa y Contact Center');
  const [generatedMaterial, setGeneratedMaterial] = useState<string>('');

  const handleGenerateMaterial = async () => {
    if (!matTopic.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const mat = await geminiAiService.generateTeachingMaterial({
        materialType: matType,
        topic: matTopic.trim(),
        cefrLevel: matLevel,
        occupationalContext: matContext,
      });
      setGeneratedMaterial(mat);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al generar el material didáctico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="pb-3 border-b border-slate-200">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00324D] bg-sky-100 px-2.5 py-1 rounded-md mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#39A900]" />
          Panel Docente: Asistente Pedagógico IA (Gemini 3.8 Flash)
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#00324D]">
          Herramientas de Planificación y Evaluación Curricular
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Genera actividades contextualizadas a tus fichas, instrumentos de evaluación, borradores de feedback y material didáctico imprimible.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Aviso del Asistente:</span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 2. Selector de Herramientas para Instructores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 select-none">
        <button
          onClick={() => setActiveTool('activities')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTool === 'activities'
              ? 'bg-[#00324D] text-white border-[#00324D] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className={`w-4 h-4 ${activeTool === 'activities' ? 'text-amber-400' : 'text-[#39A900]'}`} />
            <span className="text-xs font-bold">🧑‍🏫 Actividades</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Guías de aprendizaje SENA</p>
        </button>

        <button
          onClick={() => setActiveTool('questions')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTool === 'questions'
              ? 'bg-[#00324D] text-white border-[#00324D] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className={`w-4 h-4 ${activeTool === 'questions' ? 'text-amber-400' : 'text-[#39A900]'}`} />
            <span className="text-xs font-bold">❓ Preguntas</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Quizzes y evaluaciones</p>
        </button>

        <button
          onClick={() => setActiveTool('feedback')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTool === 'feedback'
              ? 'bg-[#00324D] text-white border-[#00324D] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className={`w-4 h-4 ${activeTool === 'feedback' ? 'text-amber-400' : 'text-[#39A900]'}`} />
            <span className="text-xs font-bold">💬 Retroalimentación</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Borradores formativos</p>
        </button>

        <button
          onClick={() => setActiveTool('materials')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTool === 'materials'
              ? 'bg-[#00324D] text-white border-[#00324D] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className={`w-4 h-4 ${activeTool === 'materials' ? 'text-amber-400' : 'text-[#39A900]'}`} />
            <span className="text-xs font-bold">📄 Material Didáctico</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Worksheets y lecturas</p>
        </button>
      </div>

      {/* 3. Panel de la Herramienta Seleccionada */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        {/* =========================================================================
            HERRAMIENTA A: GENERADOR DE ACTIVIDADES
           ========================================================================= */}
        {activeTool === 'activities' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#00324D]">
                Generador de Propuestas de Actividad Formativa (Guía de Aprendizaje)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Utiliza los datos académicos reales de tus fichas y competencias en Firestore para estructurar actividades alineadas al modelo pedagógico SENA.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ficha Asignada:</label>
                <select
                  value={actFicha}
                  onChange={(e) => setActFicha(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  {fichas.length > 0 ? (
                    fichas.map((f) => (
                      <option key={f.id} value={`Ficha #${f.number} - ${f.name || f.programName || ''}`}>
                        Ficha #{f.number} ({f.programName || f.name || 'Formación'})
                      </option>
                    ))
                  ) : (
                    <option value="Ficha 3409626">Ficha #3409626</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Programa de Formación:</label>
                <select
                  value={actProgram}
                  onChange={(e) => setActProgram(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  {programs.length > 0 ? (
                    programs.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <option value="Gestión Contable y de Información Financiera">
                      Gestión Contable y de Información Financiera
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nivel MCER:</label>
                <select
                  value={actLevel}
                  onChange={(e) => setActLevel(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value="A1">A1 - Principiante</option>
                  <option value="A2">A2 - Básico / Pre-intermedio</option>
                  <option value="B1">B1 - Intermedio Laboral</option>
                  <option value="B2">B2 - Avanzado</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Competencia Curricular / RAP:
                </label>
                <input
                  type="text"
                  value={actCompetency}
                  onChange={(e) => setActCompetency(e.target.value)}
                  placeholder="Ej: Interactuar en lengua inglesa de forma oral y escrita en contextos laborales"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Actividad:</label>
                <select
                  value={actType}
                  onChange={(e) => setActType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value="Entrega de evidencia multimedia (Video/Audio)">
                    Entrega de evidencia multimedia (Video/Audio)
                  </option>
                  <option value="Documento escrito (Informe / Correo técnico)">
                    Documento escrito (Informe / Correo técnico)
                  </option>
                  <option value="Diálogo colaborativo en parejas">
                    Diálogo colaborativo en parejas
                  </option>
                  <option value="Presentación oral en clase sincrónica">
                    Presentación oral en clase sincrónica
                  </option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  Tema Específico de la Actividad:
                </label>
                <input
                  type="text"
                  value={actTopic}
                  onChange={(e) => setActTopic(e.target.value)}
                  placeholder="Ej: Elaboración de un informe de compras y servicio al cliente en inglés..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleGenerateActivity}
                disabled={loading || !actTopic.trim()}
                className="px-4 py-2 bg-[#39A900] hover:bg-[#2e8500] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Estructurando Propuesta...' : 'Generar Propuesta de Actividad'}
              </button>
            </div>

            {/* Resultado de la propuesta */}
            {generatedActivity && (
              <div className="mt-6 pt-5 border-t border-slate-200 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-xs text-[#00324D] uppercase tracking-wider">
                    Propuesta Generada
                  </span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(generatedActivity, null, 2))}
                    className="text-xs text-slate-600 hover:text-[#39A900] flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#39A900]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar actividad'}
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs leading-relaxed">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Título</span>
                    <h3 className="font-extrabold text-sm text-[#00324D]">{generatedActivity.title}</h3>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Objetivo Pedagógico</span>
                    <p className="text-slate-800 font-semibold">{generatedActivity.objective}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Instrucciones al Aprendiz</span>
                    <p className="text-slate-700 whitespace-pre-wrap">{generatedActivity.instructions}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="font-bold text-emerald-800 text-[11px] block mb-1">Vocabulario Clave:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedActivity.vocabulary?.map((v, i) => (
                          <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[11px] rounded border border-emerald-200 font-medium">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="font-bold text-indigo-900 text-[11px] block mb-1">Foco Gramatical:</span>
                      <p className="text-slate-700 text-[11px]">{generatedActivity.grammarFocus}</p>
                    </div>
                  </div>

                  {generatedActivity.procedure?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Fases del Procedimiento</span>
                      <ol className="list-decimal list-inside space-y-1 text-slate-700">
                        {generatedActivity.procedure.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                    <span className="font-bold text-amber-900 text-[11px] block">Evidencia Requerida:</span>
                    <p className="text-slate-700 text-[11px] mt-0.5">{generatedActivity.evidenceRequired}</p>
                  </div>

                  {generatedActivity.assessmentCriteria?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Criterios de Evaluación</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                        {generatedActivity.assessmentCriteria.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            HERRAMIENTA B: GENERADOR DE PREGUNTAS
           ========================================================================= */}
        {activeTool === 'questions' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#00324D]">
                Generador de Preguntas e Instrumentos de Evaluación
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea bancos de preguntas pedagógicamente calibradas con clave de respuestas y explicaciones técnicas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Tema / Foco de Evaluación:</label>
                <input
                  type="text"
                  value={qTopic}
                  onChange={(e) => setQTopic(e.target.value)}
                  placeholder="Ej: Comparative adjectives, Technical vocabulary for IT..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Preguntas:</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value="Multiple choice">Multiple choice (Selección múltiple)</option>
                  <option value="True/False">True/False (Verdadero / Falso)</option>
                  <option value="WH questions">WH questions (Preguntas abiertas de información)</option>
                  <option value="Yes/No questions">Yes/No questions</option>
                  <option value="Fill in the blanks">Fill in the blanks (Completar espacios)</option>
                  <option value="Speaking questions">Speaking questions (Preguntas orales para entrevista)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nivel MCER:</label>
                <select
                  value={qLevel}
                  onChange={(e) => setQLevel(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value="A1">A1 - Principiante</option>
                  <option value="A2">A2 - Básico</option>
                  <option value="B1">B1 - Intermedio</option>
                  <option value="B2">B2 - Avanzado</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cantidad:</label>
                <select
                  value={qCount}
                  onChange={(e) => setQCount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value={3}>3 preguntas</option>
                  <option value={5}>5 preguntas</option>
                  <option value={8}>8 preguntas</option>
                  <option value={10}>10 preguntas</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contexto Ocupacional:</label>
                <input
                  type="text"
                  value={qContext}
                  onChange={(e) => setQContext(e.target.value)}
                  placeholder="Ej: Gastronomía, Contabilidad, Salud..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleGenerateQuestions}
                disabled={loading || !qTopic.trim()}
                className="px-4 py-2 bg-[#39A900] hover:bg-[#2e8500] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Generando Cuestionario...' : 'Generar Preguntas'}
              </button>
            </div>

            {/* Listado de preguntas generadas */}
            {generatedQuestions.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#00324D] uppercase tracking-wider">
                    Banco de Preguntas ({generatedQuestions.length} items)
                  </span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(generatedQuestions, null, 2))}
                    className="text-xs text-slate-600 hover:text-[#39A900] flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#39A900]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar todo'}
                  </button>
                </div>

                <div className="space-y-3">
                  {generatedQuestions.map((q, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900 leading-snug">
                          {idx + 1}. {q.question}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold shrink-0">
                          {q.type}
                        </span>
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-3 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="text-slate-700 text-[11px]">
                              <span className="font-semibold text-slate-500 mr-1.5">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 text-[11px] space-y-0.5">
                        <div className="text-emerald-800 font-bold">
                          Respuesta correcta: <span className="font-mono">{q.correctAnswer}</span>
                        </div>
                        <p className="text-slate-500 italic">{q.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            HERRAMIENTA C: GENERADOR DE RETROALIMENTACIÓN FORMATIVA (FEEDBACK)
           ========================================================================= */}
        {activeTool === 'feedback' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#00324D]">
                Asistente de Retroalimentación Formativa
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa notas rápidas sobre la evidencia del aprendiz. La IA redactará una propuesta pedagógica constructiva.
                <strong className="text-amber-800 block mt-0.5">
                  Importante: La IA genera un borrador. Tienes control total para editar, aprobar o descartar antes de usarlo.
                </strong>
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Desempeño observado en la evidencia:
                </label>
                <textarea
                  rows={3}
                  value={fbPerformance}
                  onChange={(e) => setFbPerformance(e.target.value)}
                  placeholder="Describe qué realizó el aprendiz, aciertos y errores cometidos..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] leading-relaxed resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fortalezas principales:</label>
                  <input
                    type="text"
                    value={fbStrengths}
                    onChange={(e) => setFbStrengths(e.target.value)}
                    placeholder="Ej: Pronunciación, tono, puntualidad..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aspectos a mejorar:</label>
                  <input
                    type="text"
                    value={fbAreasToImprove}
                    onChange={(e) => setFbAreasToImprove(e.target.value)}
                    placeholder="Ej: Estructura del pasado, uso de conectores..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Idioma de salida:</label>
                  <select
                    value={fbLanguage}
                    onChange={(e) => setFbLanguage(e.target.value as 'es' | 'en')}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                  >
                    <option value="es">Español con refuerzo en inglés</option>
                    <option value="en">Inglés completo (Full English)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleGenerateFeedback}
                disabled={loading || !fbPerformance.trim()}
                className="px-4 py-2 bg-[#39A900] hover:bg-[#2e8500] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Redactando Borrador...' : 'Generar Borrador de Retroalimentación'}
              </button>
            </div>

            {/* Borrador con opciones de Editar, Copiar, Aprobar y Descartar */}
            {fbDraft && (
              <div className="mt-6 pt-5 border-t border-slate-200 space-y-3 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#00324D] uppercase tracking-wider">
                      Borrador Pedagógico para Revisión
                    </span>
                    {fbApproved && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aprobado por Instructor
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      onClick={() => copyToClipboard(fbDraft)}
                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#39A900]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>

                    <button
                      onClick={() => setFbApproved(true)}
                      disabled={fbApproved}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1 font-bold transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aprobar
                    </button>

                    <button
                      onClick={() => {
                        setFbDraft('');
                        setFbApproved(false);
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Descartar
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={6}
                    value={fbDraft}
                    onChange={(e) => setFbDraft(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-sans leading-relaxed focus:bg-white focus:border-[#39A900] focus:outline-none"
                    placeholder="Puedes editar este borrador directamente aquí..."
                  />
                  <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-400 font-semibold pointer-events-none">
                    Editable directamente por el instructor
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            HERRAMIENTA D: GENERADOR DE MATERIAL DIDÁCTICO
           ========================================================================= */}
        {activeTool === 'materials' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#00324D]">
                Generador de Material Didáctico Imprimible
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Diseña talleres, diálogos guiados, hojas de trabajo (worksheets) y lecturas de comprensión para sesiones sincrónicas o trabajo autónomo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Material:</label>
                <select
                  value={matType}
                  onChange={(e) => setMatType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value="Worksheets">Worksheets (Taller de trabajo guiado)</option>
                  <option value="Dialogues">Dialogues (Guion de diálogo para role-play)</option>
                  <option value="Vocabulary lists">Vocabulary lists (Glosario ilustrado de aula)</option>
                  <option value="Reading exercises">Reading exercises (Lectura con comprensión)</option>
                  <option value="Speaking activities">Speaking activities (Dinámicas de conversación)</option>
                  <option value="Quizzes">Quizzes (Prueba diagnóstica rápida)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nivel MCER:</label>
                <select
                  value={matLevel}
                  onChange={(e) => setMatLevel(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value="A1">A1 - Principiante</option>
                  <option value="A2">A2 - Básico / Pre-intermedio</option>
                  <option value="B1">B1 - Intermedio Laboral</option>
                  <option value="B2">B2 - Intermedio Avanzado</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contexto Ocupacional:</label>
                <input
                  type="text"
                  value={matContext}
                  onChange={(e) => setMatContext(e.target.value)}
                  placeholder="Ej: Logística, Hotelería, Agropecuario..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Tema del Material:</label>
                <input
                  type="text"
                  value={matTopic}
                  onChange={(e) => setMatTopic(e.target.value)}
                  placeholder="Ej: Job Interview Preparation, Technical Support Ticket Management..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleGenerateMaterial}
                disabled={loading || !matTopic.trim()}
                className="px-4 py-2 bg-[#39A900] hover:bg-[#2e8500] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Generando Material...' : 'Generar Material Didáctico'}
              </button>
            </div>

            {generatedMaterial && (
              <div className="mt-6 pt-5 border-t border-slate-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#00324D] uppercase tracking-wider">
                    Material Generado ({matType})
                  </span>
                  <button
                    onClick={() => copyToClipboard(generatedMaterial)}
                    className="text-xs text-slate-600 hover:text-[#39A900] flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#39A900]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar todo el material'}
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[450px] overflow-y-auto">
                  {generatedMaterial}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
