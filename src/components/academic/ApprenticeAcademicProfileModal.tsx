/**
 * @license
 * SENA Learning Hub - Modal de Expediente Académico Digital del Aprendiz (Vista Instructor)
 * PROMPT 17: Consulta autorizada y 100% real vía academicRecordService
 * Estricta validación RBAC: solo para aprendices de fichas asignadas al instructor.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Building2,
  BookOpen,
  Target,
  FileText,
  Award,
  CalendarCheck,
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  ChevronRight,
  HardDrive,
  RefreshCw,
  Trophy,
  BarChart3,
  Layers,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { ApprenticeWithEnrollment, ApprenticeAcademicExpediente } from '../../types/academic';
import { academicRecordService } from '../../services/academic/academicRecordService';
import { useAuth } from '../../hooks/useAuth';

interface ApprenticeAcademicProfileModalProps {
  apprentice: ApprenticeWithEnrollment | null;
  onClose: () => void;
}

export const ApprenticeAcademicProfileModal: React.FC<ApprenticeAcademicProfileModalProps> = ({
  apprentice,
  onClose,
}) => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid;

  const [expediente, setExpediente] = useState<ApprenticeAcademicExpediente | null>(null);
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'summary' | 'curriculum' | 'evidences' | 'attendance' | 'gamification' | 'institutional'
  >('summary');

  const [evidenceFilter, setEvidenceFilter] = useState<
    'all' | 'approved' | 'correction_required' | 'not_approved' | 'submitted' | 'pending'
  >('all');

  useEffect(() => {
    async function loadData() {
      if (!apprentice) {
        setExpediente(null);
        return;
      }
      setLoading(true);
      setErrorMsg(null);
      setUnauthorized(false);

      const learnerId =
        apprentice.uid || (apprentice as any).learnerId || (apprentice as any).apprenticeId;

      try {
        const res = await academicRecordService.getApprenticeExpediente(learnerId, {
          instructorUid,
        });

        if (res.unauthorized) {
          setUnauthorized(true);
          setExpediente(null);
        } else if (res.error) {
          setErrorMsg(res.error);
        } else {
          setExpediente(res.data);
        }
      } catch (err: any) {
        console.error('[ApprenticeAcademicProfileModal] Error:', err);
        setErrorMsg('Error al consultar el expediente académico.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [apprentice, instructorUid]);

  const handlePrint = () => {
    window.print();
  };

  // Filtrar evidencias
  const filteredEvidences = useMemo(() => {
    if (!expediente) return [];
    if (evidenceFilter === 'all') return expediente.evidences;
    return expediente.evidences.filter((item) => item.status === evidenceFilter);
  }, [expediente, evidenceFilter]);

  if (!apprentice) return null;

  return (
    <Modal
      isOpen={!!apprentice}
      onClose={onClose}
      title="Expediente Académico Digital del Aprendiz"
      subtitle={`SENA Centro de Comercio y Servicios · Ficha #${apprentice.fichaNumber || (expediente?.academicInfo.fichaNumber ?? '')}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#39A900]" />
            Imprimir Expediente
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Expediente
          </button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin text-[#39A900] mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              Consultando expediente digital y registros académicos en Firestore...
            </p>
          </div>
        ) : unauthorized ? (
          <div className="py-12 text-center space-y-3 bg-rose-50 rounded-xl p-6 border border-rose-200 text-rose-800">
            <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="text-sm font-bold">Acceso Denegado por RBAC</h3>
            <p className="text-xs max-w-md mx-auto text-rose-700">
              Usted no está registrado como instructor asignado de la ficha a la cual pertenece este aprendiz.
            </p>
          </div>
        ) : errorMsg || !expediente ? (
          <div className="py-12 text-center space-y-3 bg-slate-50 rounded-xl p-6 border border-slate-200">
            <AlertCircle className="w-7 h-7 text-amber-500 mx-auto" />
            <p className="text-xs text-slate-700">{errorMsg || 'No se pudo cargar el expediente.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. Carnet del Aprendiz */}
            <div className="bg-gradient-to-r from-[#00324D] to-[#004A73] text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3.5">
                <img
                  src={expediente.personalInfo.photoURL}
                  alt={expediente.personalInfo.displayName}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-[#39A900] shrink-0 bg-slate-800"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] uppercase font-bold tracking-wider bg-[#39A900] px-2 py-0.5 rounded text-white">
                      Aprendiz SENA
                    </span>
                    <span className="text-[10px] text-slate-200 font-mono">
                      Ficha #{expediente.academicInfo.fichaNumber}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {expediente.personalInfo.displayName}
                  </h3>
                  <p className="text-xs text-slate-300 font-mono">
                    {expediente.personalInfo.documentNumber && expediente.personalInfo.documentNumber !== 'Información no disponible'
                      ? `CC ${expediente.personalInfo.documentNumber}`
                      : 'Sin documento'} · {expediente.personalInfo.email}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-start sm:items-end justify-between gap-1 shrink-0">
                <StatusBadge status={expediente.personalInfo.status} size="sm" />
                <span className="text-[10px] text-slate-300 font-mono">
                  UID: {expediente.personalInfo.uid.slice(0, 10)}...
                </span>
              </div>
            </div>

            {/* 2. Pestañas de Navegación del Expediente */}
            <div className="flex items-center gap-1 border-b border-slate-200 pb-1 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  activeTab === 'summary'
                    ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Resumen Académico
              </button>

              <button
                onClick={() => setActiveTab('curriculum')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  activeTab === 'curriculum'
                    ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Progreso Curricular
              </button>

              <button
                onClick={() => setActiveTab('evidences')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  activeTab === 'evidences'
                    ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Evidencias ({expediente.summary.complianceRate}%)
              </button>

              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  activeTab === 'attendance'
                    ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                Asistencia ({expediente.summary.attendanceRate}%)
              </button>

              <button
                onClick={() => setActiveTab('gamification')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  activeTab === 'gamification'
                    ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Gamificación
              </button>

              <button
                onClick={() => setActiveTab('institutional')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  activeTab === 'institutional'
                    ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Matrícula
              </button>
            </div>

            {/* 3. Contenido de las Pestañas */}

            {/* TAB: RESUMEN ACADÉMICO */}
            {activeTab === 'summary' && (
              <div className="space-y-3 text-xs">
                {/* Alerta de Restricción */}
                {expediente.summary.activeRestrictionsCount > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Restricción Académica Activa:</strong>
                      <span>
                        {expediente.summary.activeRestrictions[0]?.reason ||
                          'Bloqueo temporal de entrega de evidencias.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Métricas Principales */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-[#EBF8E7] p-2.5 rounded-lg border border-[#39A900]/30">
                    <div className="text-lg font-bold text-[#2E8500] font-mono">
                      {expediente.summary.complianceRate}%
                    </div>
                    <div className="text-[10px] text-emerald-800">% Cumplimiento</div>
                  </div>
                  <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                    <div className="text-lg font-bold text-blue-700 font-mono">
                      {expediente.summary.attendanceRate}%
                    </div>
                    <div className="text-[10px] text-blue-800">% Asistencia</div>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <div className="text-lg font-bold text-amber-700 font-mono">
                      {expediente.summary.completedActivitiesCount} / {expediente.summary.assignedActivitiesCount}
                    </div>
                    <div className="text-[10px] text-amber-800">Actividades Entregadas</div>
                  </div>
                  <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                    <div className="text-lg font-bold text-purple-700 font-mono">
                      Nivel {expediente.summary.gamificationLevel}
                    </div>
                    <div className="text-[10px] text-purple-800">{expediente.summary.experiencePoints} XP</div>
                  </div>
                </div>

                {/* Desglose de Calificaciones */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Dictámenes de Evaluación Registrados:
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Total</span>
                      <strong className="text-slate-800 font-bold">{expediente.summary.submittedEvidencesCount}</strong>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[#2E8500]">
                      <span className="text-[10px] block">A · Aprobadas</span>
                      <strong className="font-bold">{expediente.summary.approvedEvidencesCount}</strong>
                    </div>
                    <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-800">
                      <span className="text-[10px] block">C · Corregir</span>
                      <strong className="font-bold">{expediente.summary.correctionEvidencesCount}</strong>
                    </div>
                    <div className="p-2 bg-rose-50 rounded border border-rose-200 text-rose-800">
                      <span className="text-[10px] block">N · No Aprobadas</span>
                      <strong className="font-bold">{expediente.summary.notApprovedEvidencesCount}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROGRESO CURRICULAR */}
            {activeTab === 'curriculum' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Curso Activo</span>
                  <h4 className="font-bold text-slate-900">{expediente.academicInfo.currentCourse}</h4>
                  <p className="text-[11px] text-slate-600">
                    Programa: {expediente.academicInfo.programName} · Ficha #{expediente.academicInfo.fichaNumber}
                  </p>
                </div>

                <div className="space-y-2">
                  {expediente.curricularProgress.map((cp) => (
                    <div key={cp.competency.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 text-xs">
                          {cp.competency.code}: {cp.competency.description}
                        </strong>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            cp.status === 'completed'
                              ? 'bg-[#EBF8E7] text-[#2E8500]'
                              : cp.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cp.status === 'completed' ? 'Cumplida' : cp.status === 'in_progress' ? 'En Desarrollo' : 'Pendiente'}
                        </span>
                      </div>

                      <div className="space-y-1 pl-2 border-l-2 border-slate-200">
                        {cp.learningOutcomes.map((lo) => (
                          <div key={lo.outcome.id} className="text-[11px] text-slate-600 flex justify-between gap-2">
                            <span>
                              <strong>{lo.outcome.code}:</strong> {lo.outcome.description}
                            </span>
                            <span className="font-bold text-[10px] shrink-0">
                              {lo.activities.length} act.
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: EVIDENCIAS */}
            {activeTab === 'evidences' && (
              <div className="space-y-3 text-xs">
                {/* Filtros */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  <button
                    onClick={() => setEvidenceFilter('all')}
                    className={`px-2 py-1 rounded text-[11px] font-bold ${
                      evidenceFilter === 'all' ? 'bg-[#00324D] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Todas ({expediente.evidences.length})
                  </button>
                  <button
                    onClick={() => setEvidenceFilter('approved')}
                    className={`px-2 py-1 rounded text-[11px] font-bold ${
                      evidenceFilter === 'approved' ? 'bg-[#39A900] text-white' : 'bg-slate-100 text-emerald-800'
                    }`}
                  >
                    Aprobadas ({expediente.summary.approvedEvidencesCount})
                  </button>
                  <button
                    onClick={() => setEvidenceFilter('correction_required')}
                    className={`px-2 py-1 rounded text-[11px] font-bold ${
                      evidenceFilter === 'correction_required' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-amber-800'
                    }`}
                  >
                    Por Corregir ({expediente.summary.correctionEvidencesCount})
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filteredEvidences.length === 0 ? (
                    <p className="text-slate-400 italic p-4 text-center bg-slate-50 rounded-lg">
                      No hay evidencias registradas en este filtro.
                    </p>
                  ) : (
                    filteredEvidences.map((item) => (
                      <div
                        key={item.activity.id}
                        className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900">{item.activity.title}</strong>
                          {item.status === 'approved' ? (
                            <span className="bg-[#EBF8E7] text-[#2E8500] px-2 py-0.5 rounded text-[10px] font-bold border border-[#39A900]/30">
                              A · APROBADO
                            </span>
                          ) : item.status === 'correction_required' ? (
                            <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-300">
                              C · CORREGIR
                            </span>
                          ) : item.status === 'not_approved' ? (
                            <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-300">
                              N · NO APROBADO
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                              {item.status.toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {item.submission?.submittedAt
                              ? `Entregada: ${new Date(item.submission.submittedAt).toLocaleDateString()}`
                              : 'Sin entregar'}
                          </span>
                          {item.fileUrl && (
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#39A900] hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <HardDrive className="w-3 h-3" /> Ver archivo
                            </a>
                          )}
                        </div>

                        {item.feedback && (
                          <div className="p-2 bg-slate-50 rounded text-[11px] text-slate-700 italic border border-slate-100">
                            <strong>Retroalimentación:</strong> "{item.feedback}"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: ASISTENCIA Y SEGUIMIENTO */}
            {activeTab === 'attendance' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[11px]">Índice de Asistencia</span>
                    <div className="text-xl font-bold text-[#2E8500] font-mono mt-1">
                      {expediente.summary.attendanceRate}%
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {expediente.summary.attendedSessions} de {expediente.summary.totalAttendanceSessions} sesiones asistidas
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[11px]">Inasistencias y Retardos</span>
                    <div className="text-xl font-bold text-amber-700 font-mono mt-1">
                      {expediente.summary.absenceCount} / {expediente.summary.lateCount}
                    </div>
                    <span className="text-[10px] text-slate-500">Ausencias / Retardos</span>
                  </div>
                </div>

                {/* Justificaciones y Llamados */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">Llamados de Atención:</span>
                  {expediente.attentionCalls.length === 0 ? (
                    <p className="text-slate-400 italic p-2.5 bg-slate-50 rounded">
                      Sin llamados de atención registrados.
                    </p>
                  ) : (
                    expediente.attentionCalls.map((c) => (
                      <div key={c.id} className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800">
                        <strong>{c.type}:</strong> {c.reason}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: GAMIFICACIÓN */}
            {activeTab === 'gamification' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 bg-gradient-to-r from-slate-900 to-[#00324D] text-white rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase">Nivel Oficial</span>
                    <h4 className="text-base font-bold">{expediente.summary.levelTitle}</h4>
                    <p className="text-[11px] text-slate-300">
                      {expediente.summary.experiencePoints} XP Acumulados
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center font-bold text-amber-300 text-lg">
                    {expediente.summary.gamificationLevel}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">
                    Insignias Desbloqueadas ({expediente.badges.filter((b) => b.unlocked).length}):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {expediente.badges.map((b) => (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                          b.unlocked ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-50'
                        }`}
                      >
                        <span className="text-lg">{b.icon || '🏅'}</span>
                        <div className="truncate">
                          <strong className="block truncate">{b.name}</strong>
                          <span className="text-[10px] text-slate-500">{b.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MATRÍCULA E INSTITUCIONAL */}
            {activeTab === 'institutional' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-400 block text-[10px]">Centro de Formación:</span>
                  <strong className="text-slate-800">{expediente.academicInfo.centerName}</strong>
                  <div className="text-[10px] text-slate-500">{expediente.academicInfo.regional}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-slate-400 block text-[10px]">Instructores Asignados a la Ficha:</span>
                  {expediente.academicInfo.assignedInstructors.length > 0 ? (
                    expediente.academicInfo.assignedInstructors.map((inst) => (
                      <div key={inst.uid} className="font-semibold text-slate-800">
                        {inst.displayName} · <span className="font-mono text-slate-500">{inst.email}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">Información no disponible</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
