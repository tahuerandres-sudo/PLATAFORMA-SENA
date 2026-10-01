/**
 * @license
 * SENA Learning Hub - Vista de Asistencia, Llamados y Justificaciones (Aprendiz)
 * PROMPT 6: Requisito 10 - Justificación por parte del aprendiz
 */

import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  FileCheck,
  Plus,
  ExternalLink,
  Printer,
  FileText,
  RefreshCw,
  Info,
  Calendar,
  Send,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  AttendanceRecord,
  AttentionCall,
  AcademicRestriction,
  Justification,
} from '../../types/academic';
import { trackingService } from '../../services/academic/trackingService';
import { AttentionCallDocumentModal } from '../../components/academic/AttentionCallDocumentModal';
import { Modal } from '../../components/ui/Modal';

export const ApprenticeTrackingView: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const learnerId = userProfile?.uid || currentUser?.uid || 'appr_juan_perez';
  const learnerName = userProfile?.displayName || 'Juan David Pérez Gómez';
  const learnerDoc = userProfile?.documentNumber || '1098765432';
  const fichaId = userProfile?.fichaId || 'ficha_3409626';

  // Pestañas
  const [activeTab, setActiveTab] = useState<'attendance' | 'calls' | 'justifications'>('attendance');

  // Datos
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [calls, setCalls] = useState<AttentionCall[]>([]);
  const [restrictions, setRestrictions] = useState<AcademicRestriction[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(false);

  // Alerta
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal para Radicar Justificación
  const [justModalOpen, setJustModalOpen] = useState(false);
  const [justReason, setJustReason] = useState('Incapacidad médica EPS');
  const [justDate, setJustDate] = useState(new Date().toISOString().split('T')[0]);
  const [justDescription, setJustDescription] = useState('');
  const [justSupportUrl, setJustSupportUrl] = useState('');
  const [selectedCallToJustify, setSelectedCallToJustify] = useState<AttentionCall | null>(null);
  const [selectedAttendanceToJustify, setSelectedAttendanceToJustify] = useState<AttendanceRecord | null>(null);

  // Modal para Acta PDF
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedCallForDoc, setSelectedCallForDoc] = useState<AttentionCall | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const fullRecord = await trackingService.getLearnerFullRecord(learnerId, fichaId);
      setAttendances(fullRecord.attendances);
      setCalls(fullRecord.attentionCalls);
      setRestrictions(fullRecord.restrictions);
      setJustifications(fullRecord.justifications);
    } catch (err) {
      console.error('[ApprenticeTrackingView] Error cargando expediente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [learnerId]);

  // Radicar Justificación
  const handleSubmitJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justDescription) return;

    try {
      const newJust: Justification = {
        id: `just_${Date.now()}`,
        learnerId,
        userId: learnerId,
        learnerName,
        learnerDocument: learnerDoc,
        fichaId,
        fichaNumber: '3409626',
        attendanceId: selectedAttendanceToJustify?.id,
        attentionCallId: selectedCallToJustify?.id,
        date: justDate,
        reason: justReason,
        description: justDescription,
        evidenceUrl: justSupportUrl,
        driveUrl: justSupportUrl,
        fileName: justSupportUrl ? 'Soporte_Documental.pdf' : undefined,
        submittedAt: new Date().toISOString(),
        status: 'PENDIENTE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await trackingService.submitJustification(newJust);
      setJustifications([newJust, ...justifications]);

      setSuccessToast(
        'Justificación radicada con éxito. El instructor ha sido notificado para su revisión.'
      );
      setTimeout(() => setSuccessToast(null), 5000);

      setJustModalOpen(false);
      setJustDescription('');
      setJustSupportUrl('');
      setSelectedCallToJustify(null);
      setSelectedAttendanceToJustify(null);
    } catch (err) {
      console.error('[ApprenticeTrackingView] Error radicando justificación:', err);
    }
  };

  const openJustifyForCall = (call: AttentionCall) => {
    setSelectedCallToJustify(call);
    setJustDate(call.date);
    setJustReason(`Descargo formal para llamado: ${call.reason}`);
    setJustModalOpen(true);
  };

  const openJustifyForAttendance = (att: AttendanceRecord) => {
    setSelectedAttendanceToJustify(att);
    setJustDate(att.date);
    setJustReason('Justificación de inasistencia a sesión de formación');
    setJustModalOpen(true);
  };

  const activeRestrictions = restrictions.filter((r) => r.status === 'active' || r.status === 'ACTIVA');
  const hasBlock = activeRestrictions.some(
    (r) => r.type === 'BLOQUEO_ENTREGA_EVIDENCIA' || r.type === 'evidence_submission'
  );

  // Estadísticas
  const totalSessions = attendances.length;
  const presentCount = attendances.filter((a) => a.status === 'present' || a.status === 'PRESENTE').length;
  const absentCount = attendances.filter((a) => a.status === 'absent' || a.status === 'AUSENTE').length;
  const lateCount = attendances.filter((a) => a.status === 'late' || a.status === 'TARDE').length;
  const excusedCount = attendances.filter((a) => a.status === 'excused' || a.status === 'EXCUSADO').length;

  const attendanceRate = totalSessions > 0
    ? Math.round(((presentCount + excusedCount + lateCount * 0.8) / totalSessions) * 100)
    : 92;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Expediente Académico
            </span>
            <span className="text-xs text-slate-500 font-mono">Ficha #3409626</span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">
            Mi Asistencia, Llamados de Atención y Justificaciones
          </h1>
          <p className="text-xs text-slate-500">
            Consulta tus asistencias, revisa actas oficiales y radica justificaciones con soporte
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedCallToJustify(null);
              setSelectedAttendanceToJustify(null);
              setJustDate(new Date().toISOString().split('T')[0]);
              setJustModalOpen(true);
            }}
            className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Radicar Justificación
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#39A900]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerta de confirmación */}
      {successToast && (
        <div className="p-3.5 bg-[#EBF8E7] border border-[#39A900]/40 rounded-xl text-xs text-[#2E8500] font-semibold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#39A900]" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs text-[#2E8500] hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Banner de Restricción Activa si existe (Requisito 9 y 13) */}
      {hasBlock && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-900 flex items-start gap-3.5 shadow-xs">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <strong className="block font-bold text-sm text-rose-800">
              Restricción Académica Activa: Entrega de Evidencias Bloqueada
            </strong>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">
              Tienes una medida preventiva de tipo <strong>BLOQUEO_ENTREGA_EVIDENCIA</strong> registrada por inasistencias o compromisos pendientes.
            </p>
            <div className="p-2.5 bg-white/80 rounded-lg border border-rose-200 text-[11px] text-rose-800">
              <strong>Pasos para habilitar tus entregas:</strong>
              <p className="mt-0.5">
                Haz clic en el botón <strong>"+ Radicar Justificación"</strong> de esta vista, anexa el soporte documental (constancia EPS, laboral o calamidad) y espera la revisión de tu instructor. Una vez aprobada, el sistema rehabilitará inmediatamente la entrega de tus evidencias.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas de Métricas de Asistencia */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Índice Asistencia</span>
          <div className="text-2xl font-bold text-[#2E8500] font-mono mt-1">{attendanceRate}%</div>
          <span className="text-[10px] text-slate-400">Objetivo institucional: 80%</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Presentes</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">{presentCount}</div>
          <span className="text-[10px] text-slate-400">Sesiones asistidas</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Llegadas Tarde</span>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1">{lateCount}</div>
          <span className="text-[10px] text-slate-400">Retardos registrados</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Inasistencias</span>
          <div className="text-2xl font-bold text-rose-600 font-mono mt-1">{absentCount}</div>
          <span className="text-[10px] text-slate-400">{excusedCount} excusadas</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Llamados Activos</span>
          <div className="text-2xl font-bold text-purple-600 font-mono mt-1">
            {calls.filter((c) => c.status !== 'JUSTIFICADO' && c.status !== 'CERRADO').length}
          </div>
          <span className="text-[10px] text-slate-400">{justifications.length} justificaciones</span>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-[#39A900]" />
          Mis Asistencias ({attendances.length})
        </button>

        <button
          onClick={() => setActiveTab('calls')}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'calls'
              ? 'bg-rose-50 text-rose-800 border-b-2 border-rose-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          Llamados de Atención ({calls.length})
        </button>

        <button
          onClick={() => setActiveTab('justifications')}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'justifications'
              ? 'bg-blue-50 text-blue-900 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4 text-blue-600" />
          Mis Justificaciones Radicadas ({justifications.length})
        </button>
      </div>

      {/* ========================================================
          PESTAÑA 1: MIS ASISTENCIAS
         ======================================================== */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#00324D] text-white border-b border-slate-700">
                  <th className="p-3 font-bold">Fecha</th>
                  <th className="p-3 font-bold text-center">Estado</th>
                  <th className="p-3 font-bold">Hora / Retraso</th>
                  <th className="p-3 font-bold">Observación del Instructor</th>
                  <th className="p-3 font-bold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No hay registros de asistencia en esta ficha.
                    </td>
                  </tr>
                ) : (
                  attendances.map((att) => {
                    const isAbsent = att.status === 'absent' || att.status === 'AUSENTE';
                    const isLate = att.status === 'late' || att.status === 'TARDE';
                    const isExcused = att.status === 'excused' || att.status === 'EXCUSADO';

                    return (
                      <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono font-semibold text-slate-800">
                          {att.date}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          {isAbsent ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              AUSENTE
                            </span>
                          ) : isLate ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              TARDE {att.minutesLate ? `(${att.minutesLate}m)` : ''}
                            </span>
                          ) : isExcused ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              EXCUSADO
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30">
                              PRESENTE
                            </span>
                          )}
                        </td>

                        <td className="p-3 font-mono text-slate-600">
                          {att.arrivalTime ? `Llegada: ${att.arrivalTime}` : 'A tiempo'}
                          {att.minutesLate ? ` (+${att.minutesLate} min)` : ''}
                        </td>

                        <td className="p-3 text-slate-600">
                          {att.observation || att.notes || 'Registro regular sin novedades'}
                        </td>

                        <td className="p-3 text-right whitespace-nowrap">
                          {isAbsent && (
                            <button
                              onClick={() => openJustifyForAttendance(att)}
                              className="px-2.5 py-1 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            >
                              <FileCheck className="w-3 h-3" />
                              Justificar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 2: LLAMADOS DE ATENCIÓN
         ======================================================== */}
      {activeTab === 'calls' && (
        <div className="space-y-4">
          {calls.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-[#39A900] mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">¡Felicidades! No tienes llamados de atención</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tu historial disciplinario y de asistencia se encuentra al día.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calls.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-rose-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      Tipo: {c.type}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        c.status === 'JUSTIFICADO'
                          ? 'bg-[#EBF8E7] text-[#2E8500]'
                          : c.status === 'EN_REVISION'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Estado: {c.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{c.reason}</h3>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                      {c.description}
                    </p>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Fecha: <strong>{c.date}</strong></span>
                    <span>Instructor: <strong>{c.instructorName || 'Carlos Mendoza'}</strong></span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedCallForDoc(c);
                        setDocModalOpen(true);
                      }}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      Ver Acta Imprimible / PDF
                    </button>

                    {c.status !== 'JUSTIFICADO' && (
                      <button
                        onClick={() => openJustifyForCall(c)}
                        className="px-3 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Radicar Justificación
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          PESTAÑA 3: MIS JUSTIFICACIONES
         ======================================================== */}
      {activeTab === 'justifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#00324D] text-white border-b border-slate-700">
                <th className="p-3 font-bold">Fecha Radicación</th>
                <th className="p-3 font-bold">Fecha del Hecho</th>
                <th className="p-3 font-bold">Motivo & Explicación</th>
                <th className="p-3 font-bold">Soporte Adjunto</th>
                <th className="p-3 font-bold text-center">Estado</th>
                <th className="p-3 font-bold">Dictamen del Instructor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {justifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No has radicado justificaciones.
                  </td>
                </tr>
              ) : (
                justifications.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(j.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {j.date}
                    </td>
                    <td className="p-3 max-w-xs">
                      <strong className="text-slate-800 block">{j.reason}</strong>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{j.description}</p>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {j.driveUrl || j.evidenceUrl ? (
                        <a
                          href={j.driveUrl || j.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver Soporte
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sin soporte digital</span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          j.status === 'ACEPTADA' || j.status === 'approved'
                            ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30'
                            : j.status === 'RECHAZADA' || j.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800 font-semibold'
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs">
                      {j.reviewComment ? (
                        <div>
                          <p className="text-xs font-medium text-slate-800">{j.reviewComment}</p>
                          <span className="text-[10px] text-slate-400">Revisado por: {j.reviewedByName || 'Instructor'}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Pendiente de revisión pedagógica</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para Radicar Justificación */}
      <Modal
        isOpen={justModalOpen}
        onClose={() => setJustModalOpen(false)}
        title="Radicación Formal de Justificación y Descargos"
        subtitle={`SENA Centro de Comercio y Servicios · Ficha #3409626`}
        footer={
          <>
            <button
              onClick={() => setJustModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitJustification}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Radicar Justificación
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitJustification} className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
            <Info className="w-4 h-4 text-blue-600 inline mr-1.5 -mt-0.5" />
            Recuerda que conforme al Reglamento del Aprendiz SENA, cuentas con <strong>3 días hábiles</strong> posteriores al hecho para presentar tus descargos con soporte válido (certificado médico EPS, constancia laboral o carta de calamidad).
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Fecha de la Inasistencia o Hecho *:
            </label>
            <input
              type="date"
              required
              value={justDate}
              onChange={(e) => setJustDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Motivo Institucional / Causal *:
            </label>
            <select
              value={justReason}
              onChange={(e) => setJustReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] bg-white font-medium"
            >
              <option value="Incapacidad médica EPS">Incapacidad médica expedida por EPS o SISBÉN</option>
              <option value="Constancia de turno laboral">Cruce o requerimiento de turno laboral impostergable</option>
              <option value="Calamidad doméstica comprobada">Calamidad doméstica o emergencia familiar</option>
              <option value="Fuerza mayor / Problemas de transporte">Fuerza mayor o alteración del orden público / transporte</option>
              <option value="Diligencia judicial o gubernamental">Citación de entidad judicial, militar o estatal</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Explicación Detallada de los Hechos *:
            </label>
            <textarea
              rows={3}
              required
              placeholder="Explica detalladamente las circunstancias que impidieron tu asistencia o entrega a tiempo..."
              value={justDescription}
              onChange={(e) => setJustDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Enlace de Soporte Documental (Google Drive / URL) *:
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/file/d/... o enlace público al soporte"
              value={justSupportUrl}
              onChange={(e) => setJustSupportUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Pega aquí el enlace de tu certificado o archivo en Google Drive con acceso de lectura.
            </span>
          </div>
        </form>
      </Modal>

      {/* Modal de Acta PDF / Imprimible */}
      <AttentionCallDocumentModal
        isOpen={docModalOpen}
        onClose={() => {
          setDocModalOpen(false);
          setSelectedCallForDoc(null);
        }}
        call={selectedCallForDoc}
        onCallUpdated={(updated) => {
          setCalls((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedCallForDoc(updated);
        }}
      />
    </div>
  );
};
