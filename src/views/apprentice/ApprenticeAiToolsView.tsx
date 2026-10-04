/**
 * @license
 * SENA Learning Hub - Herramientas Pedagógicas IA para Aprendices
 * PROMPT 15: Asistente de inglés para aprendices con Gemini AI (Server-Side)
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  MessageSquare,
  FileText,
  HelpCircle,
  BookMarked,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Send,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  geminiAiService,
  CorrectionResult,
  GrammarExplanationResult,
  VocabularyTerm,
} from '../../services/ai/geminiAiService';
import { useAuth } from '../../hooks/useAuth';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { programService } from '../../services/academic/programService';

type ApprenticeToolId = 'corrector' | 'conversation' | 'script' | 'grammar' | 'vocabulary';

export const ApprenticeAiToolsView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const userId = currentUser?.uid || userProfile?.uid || '';

  const [activeTool, setActiveTool] = useState<ApprenticeToolId>('corrector');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Contexto del aprendiz cargado desde Firestore
  const [userProgramName, setUserProgramName] = useState<string>('');

  useEffect(() => {
    async function loadLearnerContext() {
      if (!userId) return;
      try {
        const enr = await enrollmentService.getEnrollmentByLearnerId(userId);
        if (enr?.programId) {
          const prog = await programService.getProgramById(enr.programId);
          if (prog?.name) {
            setUserProgramName(prog.name);
          }
        }
      } catch (e) {
        console.warn('Aviso cargando programa del aprendiz:', e);
      }
    }
    loadLearnerContext();
  }, [userId]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // =========================================================================
  // ESTADO HERRAMIENTA A: CORRECTOR DE INGLÉS
  // =========================================================================
  const [correctorInput, setCorrectorInput] = useState('');
  const [correctionResult, setCorrectionResult] = useState<CorrectionResult | null>(null);

  const handleCorrectEnglish = async () => {
    if (!correctorInput.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await geminiAiService.correctEnglish(correctorInput.trim());
      setCorrectionResult(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al comunicarse con el corrector de inglés.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // ESTADO HERRAMIENTA B: PRÁCTICA DE CONVERSACIÓN
  // =========================================================================
  const [chatContext, setChatContext] = useState('Coffee shop');
  const [chatLevel, setChatLevel] = useState('A2');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'model'; text: string }>>([]);

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || loading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setErrorMsg(null);

    const updatedHistory = [...chatHistory, { role: 'user' as const, text: userMsg }];
    setChatHistory(updatedHistory);
    setLoading(true);

    try {
      const aiReply = await geminiAiService.chatConversation({
        context: chatContext,
        level: chatLevel,
        history: updatedHistory,
        userMessage: userMsg,
      });
      setChatHistory([...updatedHistory, { role: 'model' as const, text: aiReply }]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al procesar el mensaje de conversación.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setChatHistory([]);
    setChatInput('');
    setErrorMsg(null);
  };

  // =========================================================================
  // ESTADO HERRAMIENTA C: GENERADOR DE GUIONES
  // =========================================================================
  const [scriptTopic, setScriptTopic] = useState('Presenting my daily workplace routine');
  const [scriptEvidenceType, setScriptEvidenceType] = useState('Video de presentación personal');
  const [scriptLevel, setScriptLevel] = useState('A2');
  const [scriptDuration, setScriptDuration] = useState('2 minutos');
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);

  const handleGenerateScript = async () => {
    if (!scriptTopic.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await geminiAiService.generateScript({
        topic: scriptTopic.trim(),
        evidenceType: scriptEvidenceType,
        level: scriptLevel,
        duration: scriptDuration,
        vocationalContext: userProgramName || undefined,
      });
      setGeneratedScript(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al generar el guion de práctica.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // ESTADO HERRAMIENTA D: EXPLICADOR DE GRAMÁTICA
  // =========================================================================
  const [grammarTopic, setGrammarTopic] = useState('Diferencia entre Present Perfect y Past Simple');
  const [grammarResult, setGrammarResult] = useState<GrammarExplanationResult | null>(null);
  const [showGrammarAnswers, setShowGrammarAnswers] = useState(false);

  const handleExplainGrammar = async () => {
    if (!grammarTopic.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setShowGrammarAnswers(false);
    try {
      const res = await geminiAiService.explainGrammar(grammarTopic.trim());
      setGrammarResult(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al obtener la explicación gramatical.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // ESTADO HERRAMIENTA E: GENERADOR DE VOCABULARIO
  // =========================================================================
  const [vocabProgram, setVocabProgram] = useState(userProgramName || 'Cocina');
  const [vocabTerms, setVocabTerms] = useState<VocabularyTerm[]>([]);

  const handleGenerateVocabulary = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const terms = await geminiAiService.generateVocabulary(vocabProgram);
      setVocabTerms(terms);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al generar el vocabulario técnico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="pb-3 border-b border-slate-200">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#39A900] bg-[#EBF8E7] px-2.5 py-1 rounded-md mb-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Asistente Pedagógico de Inglés SENA
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#00324D]">Herramientas de Aprendizaje con IA</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Practica pronunciación, corrige textos técnicos, genera guiones para tus evidencias y conversa en situaciones reales de trabajo.
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

      {/* 2. Barra de Navegación de Herramientas para Aprendices */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 select-none">
        <button
          onClick={() => setActiveTool('corrector')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTool === 'corrector'
              ? 'bg-[#00324D] text-white border-[#00324D] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className={`w-4 h-4 ${activeTool === 'corrector' ? 'text-amber-400' : 'text-[#39A900]'}`} />
            <span className="text-xs font-bold">📝 Corrector</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Revisa y mejora tus textos</p>
        </button>

        <button
          onClick={() => setActiveTool('conversation')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTool === 'conversation'
              ? 'bg-[#00324D] text-white border-[#00324D] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className={`w-4 h-4 ${activeTool === 'conversation' ? 'text-amber-400' : 'text-[#39A900]'}`} />
            <span className="text-xs font-bold">🗣️ Conversación</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Chat en situaciones reales</p>
        </button>

        <button
          onClick={() => setActiveTool('script')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTool === 'script'
              ? 'bg-[#00324D] text-white border-[#00324D] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className={`w-4 h-4 ${activeTool === 'script' ? 'text-amber-400' : 'text-[#39A900]'}`} />
            <span className="text-xs font-bold">🎙️ Guiones</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Para videos y audios</p>
        </button>

        <button
          onClick={() => setActiveTool('grammar')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTool === 'grammar'
              ? 'bg-[#00324D] text-white border-[#00324D] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className={`w-4 h-4 ${activeTool === 'grammar' ? 'text-amber-400' : 'text-[#39A900]'}`} />
            <span className="text-xs font-bold">📚 Gramática</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Explicaciones y ejercicios</p>
        </button>

        <button
          onClick={() => setActiveTool('vocabulary')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTool === 'vocabulary'
              ? 'bg-[#00324D] text-white border-[#00324D] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <BookMarked className={`w-4 h-4 ${activeTool === 'vocabulary' ? 'text-amber-400' : 'text-[#39A900]'}`} />
            <span className="text-xs font-bold">📖 Vocabulario</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">Por programa técnico</p>
        </button>
      </div>

      {/* 3. Panel de la Herramienta Seleccionada */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        {/* =========================================================================
            HERRAMIENTA A: CORRECTOR DE INGLÉS
           ========================================================================= */}
        {activeTool === 'corrector' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                <span>Corrector de Inglés Profesional y Técnico</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Escribe un párrafo, respuesta o descripción en inglés. La IA analizará la gramática, sugerirá una versión mejorada y explicará los cambios.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tu texto en inglés a corregir:
              </label>
              <textarea
                rows={4}
                value={correctorInput}
                onChange={(e) => setCorrectorInput(e.target.value)}
                placeholder="Ejemplo: I am cook assistant in a restaurant and I always prepare vegetables for the chef yesterday..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#39A900] leading-relaxed resize-y"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCorrectEnglish}
                  disabled={loading || !correctorInput.trim()}
                  className="px-4 py-2 bg-[#39A900] hover:bg-[#2e8500] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loading ? 'Analizando...' : 'Corregir con IA'}
                </button>
                {correctorInput && (
                  <button
                    onClick={() => {
                      setCorrectorInput('');
                      setCorrectionResult(null);
                    }}
                    className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Resultado del corrector */}
            {correctionResult && (
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#00324D] uppercase tracking-wider">
                    Dictamen Pedagógico de la Corrección
                  </h3>
                  <button
                    onClick={() => copyToClipboard(correctionResult.improved || correctionResult.corrected)}
                    className="text-xs text-slate-600 hover:text-[#39A900] flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#39A900]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar versión mejorada'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
                    <span className="font-bold text-rose-700 text-[11px] uppercase tracking-wider block">
                      Texto Original
                    </span>
                    <p className="text-slate-700 italic">{correctionResult.original}</p>
                  </div>

                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <span className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider block">
                      Corrección Gramatical
                    </span>
                    <p className="text-slate-800 font-semibold">{correctionResult.corrected}</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    Explicación Pedagógica
                  </div>
                  <p className="text-slate-700 leading-relaxed">{correctionResult.explanation}</p>
                </div>

                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1.5">
                  <span className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider block">
                    Versión Profesional Recomendada (Más natural / Fluida)
                  </span>
                  <p className="text-indigo-950 font-semibold text-sm leading-relaxed">{correctionResult.improved}</p>
                  {correctionResult.translation && (
                    <p className="text-slate-600 italic text-[11px] pt-1 border-t border-indigo-100">
                      Traducción al español: {correctionResult.translation}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            HERRAMIENTA B: PRÁCTICA DE CONVERSACIÓN
           ========================================================================= */}
        {activeTool === 'conversation' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                <span>Práctica de Conversación Interactiva (Role-Play)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Simula una conversación en inglés en un entorno de trabajo. El tutor virtual se adaptará a tu nivel para ayudarte a responder con confianza.
              </p>
            </div>

            {/* Selectores de contexto y nivel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Entorno / Contexto:</label>
                <select
                  value={chatContext}
                  onChange={(e) => setChatContext(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
                >
                  <option value="Restaurant">Restaurant (Restaurante y Servicio)</option>
                  <option value="Coffee shop">Coffee shop (Cafetería y Pedidos)</option>
                  <option value="Kitchen">Kitchen (Cocina y Preparación)</option>
                  <option value="Tourism">Tourism (Guianza y Hotelería)</option>
                  <option value="Business">Business (Reuniones y Oficina)</option>
                  <option value="Customer service">Customer service (Atención al Cliente)</option>
                  <option value="Everyday English">Everyday English (Conversación Cotidiana)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nivel MCER:</label>
                <select
                  value={chatLevel}
                  onChange={(e) => setChatLevel(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
                >
                  <option value="A1">A1 - Principiante (Frases muy sencillas y lentas)</option>
                  <option value="A2">A2 - Básico (Rutinas y situaciones cotidianas)</option>
                  <option value="B1">B1 - Intermedio (Conversación laboral más fluida)</option>
                </select>
              </div>
            </div>

            {/* Ventana de Chat */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col h-[340px]">
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#39A900] animate-pulse" />
                  <span className="font-bold text-slate-700">Tutor Virtual SENA</span>
                  <span className="text-[10px] text-slate-400">· {chatContext} ({chatLevel})</span>
                </div>
                {chatHistory.length > 0 && (
                  <button
                    onClick={handleResetChat}
                    className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reiniciar
                  </button>
                )}
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">Comienza la conversación</p>
                    <p className="text-[11px] max-w-sm">
                      Saluda en inglés para iniciar la simulación en el contexto de <strong>{chatContext}</strong>. Ejemplo: <em>"Hello! Can I order a coffee please?"</em>
                    </p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#00324D] text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                        }`}
                      >
                        <span className="font-bold text-[10px] block opacity-70 mb-0.5">
                          {msg.role === 'user' ? 'Tú (Aprendiz)' : 'SENA AI Partner'}
                        </span>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none text-xs text-slate-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#39A900] animate-bounce" />
                      <span>Escribiendo respuesta...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input del Chat */}
              <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  placeholder={`Escribe tu mensaje en inglés (Nivel ${chatLevel})...`}
                  disabled={loading}
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#39A900]"
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={loading || !chatInput.trim()}
                  className="p-2.5 bg-[#39A900] hover:bg-[#2e8500] disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
                  title="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            HERRAMIENTA C: GENERADOR DE GUIONES
           ========================================================================= */}
        {activeTool === 'script' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                <span>Generador de Guiones para Evidencias de Inglés</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea un guion estructurado para grabar tus evidencias orales (videos, audios o presentaciones) según tu programa de formación.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Tema del Guion:</label>
                <input
                  type="text"
                  value={scriptTopic}
                  onChange={(e) => setScriptTopic(e.target.value)}
                  placeholder="Ej: My professional profile, Workplace safety presentation..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Formato de la Evidencia:</label>
                <select
                  value={scriptEvidenceType}
                  onChange={(e) => setScriptEvidenceType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value="Video de presentación personal">Video de presentación personal</option>
                  <option value="Audio / Podcast técnico">Audio / Podcast técnico</option>
                  <option value="Diálogo / Role-play en pareja">Diálogo / Role-play en pareja</option>
                  <option value="Exposición de un proyecto laboral">Exposición de un proyecto laboral</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Duración aproximada:</label>
                <select
                  value={scriptDuration}
                  onChange={(e) => setScriptDuration(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value="1 minuto">1 minuto (Breve / Conciso)</option>
                  <option value="2 minutos">2 minutos (Estándar SENA)</option>
                  <option value="3 minutos">3 minutos (Extenso)</option>
                  <option value="5 minutos">5 minutos (Presentación grupal)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nivel MCER:</label>
                <select
                  value={scriptLevel}
                  onChange={(e) => setScriptLevel(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value="A1">A1 - Principiante</option>
                  <option value="A2">A2 - Básico / Pre-intermedio</option>
                  <option value="B1">B1 - Intermedio</option>
                  <option value="B2">B2 - Avanzado</option>
                </select>
              </div>

              {userProgramName && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contexto de tu Programa:</label>
                  <input
                    type="text"
                    disabled
                    value={userProgramName}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleGenerateScript}
                disabled={loading || !scriptTopic.trim()}
                className="px-4 py-2 bg-[#39A900] hover:bg-[#2e8500] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Generando Guion...' : 'Generar Guion'}
              </button>
            </div>

            {generatedScript && (
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#00324D] uppercase tracking-wider">
                    Guion Generado
                  </span>
                  <button
                    onClick={() => copyToClipboard(generatedScript)}
                    className="text-xs text-slate-600 hover:text-[#39A900] flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#39A900]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar todo el guion'}
                  </button>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {generatedScript}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            HERRAMIENTA D: EXPLICADOR DE GRAMÁTICA
           ========================================================================= */}
        {activeTool === 'grammar' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                <span>Explicador de Dudas Gramaticales</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pregunta cualquier tema de gramática en inglés. Obtén explicaciones simples en español, ejemplos prácticos y ejercicios con soluciones explicadas.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tema o duda gramatical:
              </label>
              <input
                type="text"
                value={grammarTopic}
                onChange={(e) => setGrammarTopic(e.target.value)}
                placeholder="Ej: Cuándo usar 'since' y 'for', Reglas del Present Perfect, Modales de obligación..."
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExplainGrammar}
                disabled={loading || !grammarTopic.trim()}
                className="px-4 py-2 bg-[#39A900] hover:bg-[#2e8500] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Consultando Tutor...' : 'Explicar Tema'}
              </button>
            </div>

            {grammarResult && (
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-4 animate-in fade-in">
                <div className="p-4 bg-[#EBF8E7]/50 border border-[#39A900]/30 rounded-xl space-y-2">
                  <h3 className="font-bold text-sm text-[#00324D]">{grammarResult.topic}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {grammarResult.explanation}
                  </p>
                </div>

                {grammarResult.examples?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#00324D] uppercase tracking-wider">
                      Ejemplos en Contexto:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {grammarResult.examples.map((ex, i) => (
                        <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
                          <p className="font-bold text-slate-900">{ex.en}</p>
                          <p className="text-slate-500 italic text-[11px]">{ex.es}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {grammarResult.exercises?.length > 0 && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[#00324D] uppercase tracking-wider text-xs">
                        Ejercicios de Práctica Rápida:
                      </h4>
                      <button
                        onClick={() => setShowGrammarAnswers(!showGrammarAnswers)}
                        className="text-xs text-[#2e8500] hover:underline font-bold cursor-pointer"
                      >
                        {showGrammarAnswers ? 'Ocultar Respuestas' : 'Ver Respuestas Explicadas'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {grammarResult.exercises.map((ex, i) => (
                        <div key={i} className="p-2.5 bg-white border border-slate-200 rounded-lg">
                          <p className="font-semibold text-slate-800">
                            {i + 1}. {ex.question}
                          </p>
                          {ex.options && ex.options.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] text-slate-600">
                              {ex.options.map((opt, oIdx) => (
                                <span key={oIdx} className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {showGrammarAnswers && grammarResult.answers && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5 animate-in fade-in">
                        <span className="font-bold text-[#00324D] text-[11px] block">Respuestas Correctas:</span>
                        {grammarResult.answers.map((ans, i) => (
                          <div key={i} className="text-[11px] text-slate-700">
                            <strong>Pregunta {ans.questionNumber}:</strong> <span className="font-semibold text-emerald-700">{ans.answer}</span> — {ans.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            HERRAMIENTA E: GENERADOR DE VOCABULARIO
           ========================================================================= */}
        {activeTool === 'vocabulary' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                <span>Generador de Vocabulario Técnico por Especialidad</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Obtén términos indispensables en inglés para tu área de formación con ejemplos reales de uso en el trabajo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Programa o Especialidad SENA:
                </label>
                <select
                  value={vocabProgram}
                  onChange={(e) => setVocabProgram(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                >
                  <option value="Cocina">Cocina y Gastronomía</option>
                  <option value="Mesa y Bar">Servicios de Mesa y Bar</option>
                  <option value="Gestión Empresarial">Gestión Empresarial y Administrativa</option>
                  <option value="Contabilidad">Contabilidad y Finanzas</option>
                  <option value="Cosmetología">Cosmetología y Estética Integral</option>
                  <option value="Operación Turística">Operación y Guianza Turística</option>
                  <option value="Videojuegos">Desarrollo de Software y Videojuegos</option>
                  {userProgramName && (
                    <option value={userProgramName}>Tu programa matriculado ({userProgramName})</option>
                  )}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleGenerateVocabulary}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#39A900] hover:bg-[#2e8500] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loading ? 'Generando...' : 'Obtener Vocabulario'}
                </button>
              </div>
            </div>

            {vocabTerms.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#00324D] uppercase tracking-wider">
                    Glosario Técnico: {vocabProgram}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">{vocabTerms.length} términos</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {vocabTerms.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs hover:border-[#39A900] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#00324D] text-sm">{t.term}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200/80 rounded text-slate-700">
                          {t.category}
                        </span>
                      </div>
                      <div className="text-emerald-700 font-semibold text-xs">
                        {t.translation}
                      </div>
                      <p className="text-slate-600 text-[11px]">{t.definition}</p>
                      <div className="pt-1 text-[11px] text-slate-800 bg-white p-2 rounded-lg border border-slate-200/70 italic">
                        "{t.example}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
