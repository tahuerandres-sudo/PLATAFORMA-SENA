/**
 * @license
 * SENA Learning Hub - Perfil Académico Integral del Aprendiz (Prompt 7 - Evaluación A/N/C)
 *
 * Estructura de navegación pedagógica:
 * Información Personal → Programa → Ficha → Cursos → Competencias → RAPs → Actividades → Evidencias → Calificaciones → Asistencia → Seguimiento → Llamados de Atención → Restricciones
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  GraduationCap,
  Building2,
  BookOpen,
  Target,
  ListOrdered,
  FileText,
  FolderArchive,
  Award,
  CalendarCheck,
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  ExternalLink,
  ChevronRight,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { AcademicSubmission, EvidenceActivity, ApprenticeWithEnrollment } from '../../types/academic';
import { submissionService } from '../../services/submissions/submissionService';
import { activityService } from '../../services/academic/activityService';

interface ApprenticeAcademicProfileModalProps {
  apprentice: ApprenticeWithEnrollment | null;
  onClose: () => void;
}

export const ApprenticeAcademicProfileModal: React.FC<ApprenticeAcademicProfileModalProps> = ({
  apprentice,
  onClose,
}) => {
  if (!apprentice) return null;

  const [activeTab, setActiveTab] = useState<
    'overview' | 'curriculum' | 'evidences' | 'attendance' | 'tracking' | 'attention_calls'
  >('overview');

  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [loadingEvidences, setLoadingEvidences] = useState(false);

  useEffect(() => {
    async function loadApprenticeEvidences() {
      if (!apprentice) return;
      setLoadingEvidences(true);
      try {
        const apprenticeId = apprentice.uid || (apprentice as any).apprenticeId || (apprentice as any).id || '';
        const [subsRes, actsRes] = await Promise.all([
          submissionService.getSubmissionsByLearner(apprenticeId),
          activityService.getActivities(),
        ]);
        setSubmissions(subsRes.data || []);
        setActivities(actsRes.data || []);
      } catch (err) {
        console.warn('[ApprenticeAcademicProfileModal] Error cargando evidencias:', err);
      } finally {
        setLoadingEvidences(false);
      }
    }
    loadApprenticeEvidences();
  }, [apprentice]);

  const activityMap = React.useMemo(() => {
    const map = new Map<string, EvidenceActivity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  // Indicadores de Evaluación (Prompt 7 - Sección 11)
  const evalSummary = React.useMemo(() => {
    const total = submissions.length;
    const approved = submissions.filter((s) => s.status === 'approved' || s.grade === 'A').length;
    const notApproved = submissions.filter((s) => s.status === 'not_approved' || s.grade === 'N').length;
    const correction = submissions.filter((s) => s.status === 'correction_required' || s.grade === 'C').length;
    const pending = submissions.filter(
      (s) =>
        s.status === 'pending' ||
        s.status === 'submitted' ||
        s.status === 'under_review' ||
        (!s.grade && s.status !== 'approved' && s.status !== 'not_approved' && s.status !== 'correction_required')
    ).length;

    const evaluatedCount = approved + notApproved + correction;
    const complianceRate = evaluatedCount > 0 ? Math.round((approved / evaluatedCount) * 100) : 0;

    return { total, approved, notApproved, correction, pending, evaluatedCount, complianceRate };
  }, [submissions]);

  return (
    <Modal
      isOpen={!!apprentice}
      onClose={onClose}
      title="Perfil Académico del Aprendiz"
      subtitle={`SENA Centro de Comercio y Servicios · Ficha ${apprentice.fichaNumber}`}
      footer={
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold cursor-pointer"
        >
          Cerrar
        </button>
      }
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* 1. Carnet del Aprendiz */}
        <div className="bg-gradient-to-r from-[#00324D] to-[#004A73] text-white p-4 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={apprentice.photoURL}
              alt={apprentice.displayName}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-[#39A900]"
            />
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider bg-[#39A900] px-2 py-0.5 rounded text-white">
                Aprendiz SENA · Matrícula Activa
              </span>
              <h3 className="text-base font-bold text-white mt-1">{apprentice.displayName}</h3>
              <p className="text-xs text-slate-300 font-mono">
                CC {apprentice.documentNumber} · {apprentice.email}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-300 block">UID: {apprentice.uid.slice(0, 10)}...</span>
            <div className="mt-1">
              <StatusBadge status={apprentice.status} size="sm" />
            </div>
          </div>
        </div>

        {/* 2. Pestañas de Navegación del Perfil Académico */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Resumen General
          </button>
          <button
            onClick={() => setActiveTab('curriculum')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'curriculum'
                ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cursos & Competencias
          </button>
          <button
            onClick={() => setActiveTab('evidences')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'evidences'
                ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Evaluación A/N/C ({evalSummary.complianceRate}%)</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'attendance'
                ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Asistencia & Puntualidad
          </button>
          <button
            onClick={() => setActiveTab('attention_calls')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'attention_calls'
                ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Llamados & Restricciones
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeTab === 'tracking'
                ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Seguimiento
          </button>
        </div>

        {/* 3. Contenido de las Pestañas */}
        {activeTab === 'overview' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Programa de Formación:</span>
                <span className="font-bold text-slate-800 block mt-0.5">{apprentice.programName}</span>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">Ficha: {apprentice.fichaNumber}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Centro de Formación:</span>
                <span className="font-bold text-slate-800 block mt-0.5">Centro de Comercio y Servicios</span>
                <span className="text-[10px] text-slate-500 block mt-1">Regional Tolima (Ibagué)</span>
              </div>
            </div>

            {/* Fila de Métricas */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <div className="text-lg font-bold text-[#2E8500] font-mono">{evalSummary.complianceRate}%</div>
                <div className="text-[10px] text-emerald-800">% Cumplimiento</div>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                <div className="text-lg font-bold text-blue-700 font-mono">{apprentice.attendanceRate}%</div>
                <div className="text-[10px] text-blue-800">Asistencia</div>
              </div>
              <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
                <div className="text-lg font-bold text-indigo-700 font-mono">{apprentice.punctualityRate}%</div>
                <div className="text-[10px] text-indigo-800">Puntualidad</div>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <div className="text-lg font-bold text-amber-700 font-mono">{evalSummary.total}</div>
                <div className="text-[10px] text-amber-800">Evidencias Totales</div>
              </div>
            </div>

            {/* Restricciones Activas */}
            {(apprentice as any).isRestricted ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Restricción Académica Activa:</strong>
                  <span>{(apprentice as any).restrictionReason || 'Bloqueo temporal de entrega de evidencias.'}</span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-[#EBF8E7] border border-[#39A900]/30 rounded-lg text-[#2E8500] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#39A900]" />
                <span className="text-[11px] font-semibold">Estado académico regular y sin restricciones activas.</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'curriculum' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Curso Activo</span>
              <h4 className="font-bold text-slate-900">{apprentice.courseName}</h4>
              <p className="text-[11px] text-slate-600">
                Competencia transversal de bilingüismo aplicada al perfil profesional del programa {apprentice.programName}.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Resultados de Aprendizaje Vinculados (RAP):</span>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-[#00324D] bg-slate-100 px-1.5 py-0.5 rounded">
                    RAP 1
                  </span>
                  <span className="ml-2 text-slate-700 font-medium">Comprender frases y vocabulario habitual personal y laboral.</span>
                </div>
                <span className="text-emerald-600 font-bold text-[11px]">Alcanzado</span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-[#00324D] bg-slate-100 px-1.5 py-0.5 rounded">
                    RAP 2
                  </span>
                  <span className="ml-2 text-slate-700 font-medium">Comunicarse en tareas sencillas de intercambio directo.</span>
                </div>
                <span className="text-amber-600 font-bold text-[11px]">En Proceso</span>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: EVALUACIÓN Y EVIDENCIAS REALES (PROMPT 7) */}
        {activeTab === 'evidences' && (
          <div className="space-y-4 text-xs">
            {/* Cuadrícula de Resumen Numérico (Requisito 11) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 block">Total</span>
                <span className="text-base font-black text-slate-800">{evalSummary.total}</span>
              </div>
              <div className="p-2.5 bg-[#EBF8E7] rounded-lg border border-[#39A900]/30 text-[#2E8500]">
                <span className="text-[10px] font-bold block">A · Aprobadas</span>
                <span className="text-base font-black">{evalSummary.approved}</span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800">
                <span className="text-[10px] font-bold block">C · Corregir</span>
                <span className="text-base font-black">{evalSummary.correction}</span>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-800">
                <span className="text-[10px] font-bold block">N · No Aprobadas</span>
                <span className="text-base font-black">{evalSummary.notApproved}</span>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold block">% Cumplimiento</span>
                <span className="text-base font-black">{evalSummary.complianceRate}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Evidencias Registradas en Firestore:
              </span>

              {loadingEvidences ? (
                <div className="py-6 text-center text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#39A900] mb-1" />
                  Cargando evidencias del aprendiz...
                </div>
              ) : submissions.length === 0 ? (
                <p className="text-slate-400 italic p-4 text-center bg-slate-50 rounded-lg">
                  El aprendiz no registra evidencias entregadas hasta la fecha.
                </p>
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub) => {
                    const act = activityMap.get(sub.activityId);
                    const isApproved = sub.status === 'approved' || sub.grade === 'A';
                    const isNotApproved = sub.status === 'not_approved' || sub.grade === 'N';
                    const isCorrection = sub.status === 'correction_required' || sub.grade === 'C';
                    const isPending = !isApproved && !isNotApproved && !isCorrection;

                    return (
                      <div
                        key={sub.id}
                        className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-800 text-xs">
                            {act?.title || sub.activityId}
                          </strong>
                          {isApproved && (
                            <span className="bg-[#EBF8E7] text-[#2E8500] px-2 py-0.5 rounded text-[10px] font-bold border border-[#39A900]/30">
                              A · APROBADO
                            </span>
                          )}
                          {isNotApproved && (
                            <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-300">
                              N · NO APROBADO
                            </span>
                          )}
                          {isCorrection && (
                            <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-300">
                              C · CORREGIR
                            </span>
                          )}
                          {isPending && (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                              PENDIENTE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            Archivo: {sub.fileName || sub.externalUrl || 'Evidencia'}
                          </span>
                          {sub.submittedAt && (
                            <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                          )}
                        </div>

                        {sub.feedback && (
                          <div className="p-2 bg-slate-50 rounded text-[11px] text-slate-700 italic border border-slate-100">
                            <strong>Retroalimentación:</strong> "{sub.feedback}"
                          </div>
                        )}

                        {(sub.driveUrl || sub.driveFileUrl) && (
                          <div className="pt-1">
                            <a
                              href={sub.driveUrl || sub.driveFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#39A900] hover:underline font-bold text-[10px] inline-flex items-center gap-1"
                            >
                              <HardDrive className="w-3 h-3" /> Abrir en Google Drive
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px]">Índice de Asistencia</span>
                <div className="text-xl font-bold text-[#2E8500] font-mono mt-1">{apprentice.attendanceRate}%</div>
                <span className="text-[10px] text-slate-500">46 de 48 sesiones asistidas</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px]">Índice de Puntualidad</span>
                <div className="text-xl font-bold text-indigo-700 font-mono mt-1">{apprentice.punctualityRate}%</div>
                <span className="text-[10px] text-slate-500">1 retardo registrado</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded border border-slate-100">
              Módulo de asistencia en tiempo real preparado para toma de lista diaria y cálculo de alertas tempranas.
            </p>
          </div>
        )}

        {activeTab === 'attention_calls' && (
          <div className="space-y-2 text-xs">
            <span className="text-xs font-bold text-slate-700 block">Llamados de Atención Institucionales:</span>
            {apprentice.activeAttentionCallsCount > 0 ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-rose-900">Llamado por Inasistencia Reiterada</strong>
                  <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                    Emitido
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  3 inasistencias en jornada nocturna. Requiere justificación documentada para rehabilitar entrega de evidencias.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic p-3 bg-slate-50 rounded border border-slate-100">
                No registra llamados de atención activos.
              </p>
            )}
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="space-y-2 text-xs">
            <span className="text-xs font-bold text-slate-700 block">Seguimiento Pedagógico y Comportamental:</span>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Participación en clase de inglés</span>
                <span className="text-[10px] text-slate-500">22 Sep 2026</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Demuestra compromiso y excelente pronunciación en actividades de speaking.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
