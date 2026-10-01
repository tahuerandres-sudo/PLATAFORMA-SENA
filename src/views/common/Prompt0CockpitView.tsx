/**
 * @license
 * SENA Learning Hub - Blueprint Cockpit del Prompt 0 (Preservado)
 */

import React, { useState } from 'react';
import {
  Layers,
  Database,
  HardDrive,
  ShieldCheck,
  FolderTree,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ChevronRight,
  BookOpen,
  Clock,
  Lock,
} from 'lucide-react';
import { ARCHITECTURE_ROADMAP, SENA_BRAND } from '../../config/constants';
import { ARCHITECTURE_SPEC } from '../../services/architecture/blueprint';
import { FIRESTORE_RULES_BLUEPRINT } from '../../services/security/rulesBlueprint';
import { DriveHierarchyBuilder } from '../../services/drive/driveHierarchy';
import {
  MOCK_CENTER,
  MOCK_PROGRAM,
  MOCK_FICHA,
  MOCK_COURSE,
  MOCK_ACTIVITY,
  MOCK_SUBMISSION,
  MOCK_GRADE,
  MOCK_FEEDBACK,
  MOCK_INSTRUCTOR,
  MOCK_APPRENTICE,
} from '../../data/initialAcademicMock';

export const Prompt0CockpitView: React.FC = () => {
  const [cockpitTab, setCockpitTab] = useState<'spec12' | 'hierarchy' | 'storage' | 'security' | 'roadmap'>('spec12');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('general_architecture');

  const [driveStudentName, setDriveStudentName] = useState(MOCK_APPRENTICE.fullName);
  const [driveActivityTitle, setDriveActivityTitle] = useState(MOCK_ACTIVITY.title);
  const [driveFichaCode, setDriveFichaCode] = useState(MOCK_FICHA.codeNumber);
  const [driveProgramName, setDriveProgramName] = useState(MOCK_PROGRAM.name);

  const canonicalDrivePath = DriveHierarchyBuilder.buildCanonicalPath({
    programName: driveProgramName,
    fichaCode: driveFichaCode,
    activityTitle: driveActivityTitle,
    apprenticeName: driveStudentName,
  });

  const sampleFileName = DriveHierarchyBuilder.generateFileName({
    fichaCode: driveFichaCode,
    activityTitle: driveActivityTitle,
    apprenticeName: driveStudentName,
    originalFileName: 'evidence_audio_recording.mp3',
  });

  const currentSection =
    ARCHITECTURE_SPEC.find((s) => s.id === selectedSectionId) || ARCHITECTURE_SPEC[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="bg-[#00324D] text-white p-5 rounded-xl border-l-4 border-l-amber-500 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
            PROMPT 0 — Arquitectura Maestra
          </span>
          <h1 className="text-lg font-bold text-white mt-1">
            Cockpit Técnico de Especificación y Reglas
          </h1>
          <p className="text-xs text-slate-300">
            Contratos, esquemas de Firestore, árbol de Google Drive y mapa de ruta
          </p>
        </div>

        <div className="text-xs font-semibold bg-slate-800 text-[#8CE665] px-3 py-1.5 rounded-lg border border-slate-700">
          Base Modular Verificada ✓
        </div>
      </div>

      {/* Sub-tabs del Cockpit */}
      <div className="flex overflow-x-auto no-scrollbar gap-1 border-b border-slate-200 pb-1 text-xs">
        <button
          onClick={() => setCockpitTab('spec12')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            cockpitTab === 'spec12' ? 'bg-[#00324D] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          1. Análisis Técnico (12 Puntos)
        </button>
        <button
          onClick={() => setCockpitTab('hierarchy')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            cockpitTab === 'hierarchy' ? 'bg-[#00324D] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          2. Jerarquía Académica SENA
        </button>
        <button
          onClick={() => setCockpitTab('storage')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            cockpitTab === 'storage' ? 'bg-[#00324D] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          3. Almacenamiento: Firestore vs Drive
        </button>
        <button
          onClick={() => setCockpitTab('security')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            cockpitTab === 'security' ? 'bg-[#00324D] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          4. Reglas RBAC Firestore
        </button>
        <button
          onClick={() => setCockpitTab('roadmap')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            cockpitTab === 'roadmap' ? 'bg-[#00324D] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          5. Roadmap de Prompts (0-10)
        </button>
      </div>

      {/* Contenido según la pestaña del Cockpit */}
      {cockpitTab === 'spec12' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {ARCHITECTURE_SPEC.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedSectionId(item.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-all border flex items-center justify-between ${
                  item.id === selectedSectionId
                    ? 'bg-[#EBF8E7] border-[#39A900] text-[#00324D] font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                    {item.number}
                  </span>
                  <span className="truncate">{item.title}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#00324D]">
              {currentSection.number}. {currentSection.title}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">{currentSection.summary}</p>

            {currentSection.details && (
              <ul className="space-y-2">
                {currentSection.details.map((d, i) => (
                  <li key={i} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#39A900] mt-1.5 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            )}

            {currentSection.keyDiagram && (
              <pre className="bg-[#00324D] text-[#8CE665] p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                {currentSection.keyDiagram}
              </pre>
            )}
          </div>
        </div>
      )}

      {cockpitTab === 'hierarchy' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 text-xs">
          <h3 className="font-bold text-sm text-[#00324D]">Pipeline Oficial SENA</h3>
          <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono space-y-1">
            <div>1. {MOCK_CENTER.name}</div>
            <div>&nbsp;&nbsp;└── 2. {MOCK_PROGRAM.name}</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 3. Ficha {MOCK_FICHA.codeNumber}</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 4. {MOCK_COURSE.name}</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 5. {MOCK_ACTIVITY.title}</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 6. Evidencia ({MOCK_SUBMISSION.apprenticeName})</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 7. Calificación ({MOCK_GRADE.score}/100 - Aprobado)</div>
          </div>
        </div>
      )}

      {cockpitTab === 'storage' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 text-xs">
          <h3 className="font-bold text-sm text-[#00324D]">Ruta Canónica de Google Drive:</h3>
          <div className="flex flex-wrap gap-1 font-mono text-[11px] text-[#8CE665] bg-[#00324D] p-4 rounded-lg">
            {canonicalDrivePath.join(' / ')}
          </div>
        </div>
      )}

      {cockpitTab === 'security' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 text-xs">
          <h3 className="font-bold text-sm text-[#00324D]">Blueprint de Reglas de Seguridad (firestore.rules):</h3>
          <pre className="bg-[#00324D] text-[#8CE665] p-4 rounded-lg font-mono text-[11px] max-h-80 overflow-y-auto">
            {FIRESTORE_RULES_BLUEPRINT}
          </pre>
        </div>
      )}

      {cockpitTab === 'roadmap' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {ARCHITECTURE_ROADMAP.map((step) => (
            <div
              key={step.stepNumber}
              className={`p-3.5 rounded-xl border ${
                step.stepNumber <= 1 ? 'bg-[#EBF8E7]/60 border-[#39A900]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="text-[#00324D]">{step.promptCode}: {step.title}</span>
                <span className="text-[10px] text-[#2E8500]">
                  {step.stepNumber === 0 ? '✓ Hecho' : step.stepNumber === 1 ? 'En Progreso' : 'Pendiente'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{step.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
