/**
 * @license
 * SENA Learning Hub - Vista de Herramientas Pedagógicas IA (Instructor)
 */

import React, { useState } from 'react';
import { Sparkles, BookOpen, CheckCircle2, Copy, RefreshCw } from 'lucide-react';

export const InstructorAiToolsView: React.FC = () => {
  const [topic, setTopic] = useState('Present Simple & Adverbs of Frequency');
  const [targetLevel, setTargetLevel] = useState('A2');
  const [generatedQuiz, setGeneratedQuiz] = useState<any[]>([
    {
      q: 'Which sentence correctly describes a daily accounting routine?',
      options: [
        'He always reconciles the bank statements on Mondays.',
        'He always reconcile the bank statements on Mondays.',
        'He is always reconcile the bank statements.',
        'He reconciles always the bank statements on Mondays.',
      ],
      correct: 0,
      explanation: 'Adverbs of frequency (always) go before the main verb, and third person singular takes -s.',
    },
    {
      q: 'Choose the correct question form:',
      options: [
        'Does the auditor review the receipts every morning?',
        'Do the auditor reviews the receipts every morning?',
        'Is the auditor review the receipts every morning?',
        'Does the auditor reviews the receipts every morning?',
      ],
      correct: 0,
      explanation: 'Auxiliary "Does" is used with singular subjects, and the main verb remains in base form.',
    },
  ]);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleSimulateGeneration = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert('Preguntas generadas simuladas mediante plantilla pedagógica. La integración en vivo con Gemini API se activará en el PROMPT 9.');
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#39A900] bg-[#EBF8E7] px-2.5 py-1 rounded-md mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Módulo de Apoyo Docente con IA
        </div>
        <h1 className="text-xl font-bold text-[#00324D]">Generador Pedagógico de Inglés (Gemini AI)</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Asistencia para crear cuestionarios técnicos, ejercicios de vocabulario y rúbricas contextualizadas al SENA
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel de Configuración (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#00324D]">Parámetros de la Actividad</h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tema / Competencia Gramatical:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nivel MCER:
              </label>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
              >
                <option value="A1">A1 - Principiante</option>
                <option value="A2">A2 - Básico / Pre-intermedio</option>
                <option value="B1">B1 - Intermedio Laboral</option>
                <option value="B2">B2 - Intermedio Avanzado</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contexto Ocupacional:
              </label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]">
                <option>Gestión Contable y Financiera</option>
                <option>Desarrollo de Software y Videojuegos</option>
                <option>Gastronomía y Hotelería</option>
                <option>Atención al Cliente</option>
              </select>
            </div>

            <button
              onClick={handleSimulateGeneration}
              disabled={isGenerating}
              className="w-full py-2.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#8CE665]" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#8CE665]" />
              )}
              {isGenerating ? 'Generando...' : 'Generar Preguntas (Mock)'}
            </button>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            💡 <strong>Regla Arquitectónica:</strong> La IA propone ejercicios y sugerencias formativas; la aprobación final y la calificación oficial siempre corresponden al instructor SENA.
          </div>
        </div>

        {/* Vista Previa de Preguntas Generadas (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#00324D]">
              Preguntas Sugeridas para el Quiz
            </h2>
            <button
              onClick={() => alert('Copiado al portapapeles (simulado)')}
              className="text-xs font-semibold text-[#2E8500] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar preguntas
            </button>
          </div>

          <div className="space-y-4">
            {generatedQuiz.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-xs"
              >
                <div className="font-bold text-slate-800">
                  {idx + 1}. {item.q}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                  {item.options.map((opt: string, optIdx: number) => (
                    <div
                      key={optIdx}
                      className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 ${
                        optIdx === item.correct
                          ? 'border-[#39A900] bg-[#EBF8E7] text-[#2E8500] font-semibold'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <span className="font-mono">{String.fromCharCode(65 + optIdx)})</span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-[11px] text-slate-500 italic border-t border-slate-200/60">
                  ✓ <strong>Explicación gramatical:</strong> {item.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
