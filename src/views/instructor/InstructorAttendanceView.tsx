/**
 * @license
 * SENA Learning Hub - Control de Asistencia y Puntualidad (Instructor)
 * PROMPT 10: Módulo Académico Real conectado a Firestore
 *
 * Flujo Real:
 * - Selección de Ficha asignada (validada contra ficha.instructorIds)
 * - Selección de Fecha de la sesión
 * - Aprendices reales matriculados vía /enrollments + /users
 * - Estados: PRESENTE, AUSENTE, TARDE, EXCUSADO
 * - Registro en Firestore evitando duplicados (misma ficha + aprendiz + fecha)
 * - Observación pedagógica y hora de llegada por aprendiz
 * - Opciones de guardado individual y "Guardar todo" la planilla
 * - Sin datos demo ni mock
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Users,
  Filter,
  ShieldAlert,
  UserCheck,
  FileText,
  Search,
  Check,
  RefreshCw,
  Info,
  BookOpen,
  Edit3,
  Printer,
  Save,
  CheckSquare,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceStatus,
  AttentionCall,
  AcademicRestriction,
  ApprenticeWithEnrollment,
  Ficha,
} from '../../types/academic';
import { trackingService } from '../../services/academic/trackingService';
import { fichaService } from '../../services/academic/fichaService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { ApprenticeAcademicProfileModal } from '../../components/academic/ApprenticeAcademicProfileModal';
import { EditAttentionCallModal } from '../../components/academic/EditAttentionCallModal';
import { AttentionCallDocumentModal } from '../../components/academic/AttentionCallDocumentModal';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';

export const InstructorAttendanceView: React.FC = () => {
  const { userProfile } = useAuth();
  const instructorId = userProfile?.uid || 'inst_carlos_mendoza';
  const instructorName = userProfile?.displayName || 'ANDRES HUERTAS';

  // Fichas asignadas reales
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [fichasLoading, setFichasLoading] = useState(true);

  // Filtros principales
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedFicha, setSelectedFicha] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Datos de aprendices y registros de la ficha seleccionada
  const [apprentices, setApprentices] = useState<ApprenticeWithEnrollment[]>([]);
  const [unauthorizedFicha, setUnauthorizedFicha] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attentionCalls, setAttentionCalls] = useState<AttentionCall[]>([]);
  const [restrictions, setRestrictions] = useState<AcademicRestriction[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Estados locales editables en la planilla
  const [rowStatuses, setRowStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [rowObservations, setRowObservations] = useState<Record<string, string>>({});
  const [rowArrivalTimes, setRowArrivalTimes] = useState<Record<string, string>>({});

  // Modales
  const [editCallModalOpen, setEditCallModalOpen] = useState(false);
  const [selectedCallData, setSelectedCallData] = useState<Partial<AttentionCall>>({});
  const [selectedApprenticeForCall, setSelectedApprenticeForCall] = useState<ApprenticeWithEnrollment | null>(null);
  const [isEditingExistingCall, setIsEditingExistingCall] = useState(false);

  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedCallForDoc, setSelectedCallForDoc] = useState<AttentionCall | null>(null);

  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [targetApprenticeForLate, setTargetApprenticeForLate] = useState<ApprenticeWithEnrollment | null>(null);
  const [lateMinutes, setLateMinutes] = useState<number>(20);
  const [lateObservation, setLateObservation] = useState<string>('Retardo por transporte');

  const [selectedApprenticeForHistory, setSelectedApprenticeForHistory] = useState<ApprenticeWithEnrollment | null>(null);

  // Alerta de acción (Toast)
  const [actionAlert, setActionAlert] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Ficha activa seleccionada
  const activeFicha = useMemo(() => {
    return fichas.find((f) => f.id === selectedFicha);
  }, [fichas, selectedFicha]);

  // 1. Cargar fichas asignadas al instructor al iniciar
  useEffect(() => {
    let isMounted = true;
    const loadInstructorFichas = async () => {
      setFichasLoading(true);
      try {
        const res = await fichaService.getFichas(instructorId);
        if (isMounted) {
          const list = res.data || [];
          setFichas(list);
          if (list.length > 0) {
            setSelectedFicha((prev) => (prev && list.some((f) => f.id === prev) ? prev : list[0].id));
          } else {
            setSelectedFicha('');
          }
        }
      } catch (err) {
        console.error('[InstructorAttendanceView] Error cargando fichas:', err);
      } finally {
        if (isMounted) setFichasLoading(false);
      }
    };

    loadInstructorFichas();
    return () => {
      isMounted = false;
    };
  }, [instructorId]);

  // 2. Cargar datos de aprendices y asistencias cuando cambia ficha o fecha
  const loadData = async () => {
    if (!selectedFicha) {
      setApprentices([]);
      setAttendanceRecords([]);
      setAttentionCalls([]);
      setRestrictions([]);
      return;
    }

    setLoading(true);
    try {
      const [apprRes, attRes, callsRes, restrRes] = await Promise.all([
        enrollmentService.getApprenticesWithEnrollment(selectedFicha, instructorId),
        trackingService.getAttendance(selectedFicha, selectedDate),
        trackingService.getAttentionCalls(selectedFicha),
        trackingService.getRestrictions(undefined, selectedFicha),
      ]);

      if (apprRes.unauthorized) {
        setUnauthorizedFicha(true);
        setApprentices([]);
      } else {
        setUnauthorizedFicha(false);
        const appList = apprRes.data || [];
        setApprentices(appList);

        // Pre-poblar estados, horas y observaciones locales con base en registros existentes de Firestore
        const statuses: Record<string, AttendanceStatus> = {};
        const observations: Record<string, string> = {};
        const arrivalTimes: Record<string, string> = {};

        appList.forEach((a) => {
          const rec = attRes.data?.find((r) => (r.userId === a.uid || r.learnerId === a.uid) && r.date === selectedDate);
          if (rec) {
            statuses[a.uid] = rec.status;
            if (rec.observation || rec.notes) {
              observations[a.uid] = rec.observation || rec.notes || '';
            }
            if (rec.arrivalTime) {
              arrivalTimes[a.uid] = rec.arrivalTime;
            }
          } else {
            statuses[a.uid] = 'PRESENTE';
          }
        });

        setRowStatuses(statuses);
        setRowObservations(observations);
        setRowArrivalTimes(arrivalTimes);
      }

      setAttendanceRecords(attRes.data || []);
      setAttentionCalls(callsRes.data || []);
      setRestrictions(restrRes.data || []);
    } catch (err) {
      console.error('[InstructorAttendanceView] Error cargando asistencia:', err);
      setActionAlert({
        type: 'warning',
        message: 'No fue posible cargar los datos de asistencia de la ficha.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFicha, selectedDate]);

  // Manejador para cambiar estado rápido de un aprendiz
  const handleSelectStatus = (apprenticeUid: string, status: AttendanceStatus) => {
    setRowStatuses((prev) => ({ ...prev, [apprenticeUid]: status }));
  };

  // Guardar asistencia individual en Firestore
  const handleSaveIndividualAttendance = async (
    apprentice: ApprenticeWithEnrollment,
    overrideStatus?: AttendanceStatus,
    extra?: {
      minutesLate?: number;
      observation?: string;
      customAttentionCall?: Partial<AttentionCall>;
    }
  ) => {
    setSavingId(apprentice.uid);
    try {
      const nowTime = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      const statusToSave = overrideStatus || rowStatuses[apprentice.uid] || 'PRESENTE';
      const obsToSave = extra?.observation !== undefined ? extra.observation : (rowObservations[apprentice.uid] || '');
      const timeToSave = statusToSave === 'TARDE'
        ? (rowArrivalTimes[apprentice.uid] || nowTime)
        : rowArrivalTimes[apprentice.uid];

      const result = await trackingService.recordAttendance({
        learnerId: apprentice.uid,
        userId: apprentice.uid,
        learnerName: apprentice.displayName,
        learnerDocument: apprentice.documentNumber,
        enrollmentId: apprentice.enrollmentId,
        fichaId: selectedFicha,
        programId: activeFicha?.programId,
        instructorId,
        instructorName,
        date: selectedDate,
        status: statusToSave,
        arrivalTime: timeToSave,
        minutesLate: extra?.minutesLate,
        observation: obsToSave,
        notes: obsToSave,
        customAttentionCall: extra?.customAttentionCall,
      });

      // Actualizar registros de asistencia en memoria
      setAttendanceRecords((prev) => {
        const filtered = prev.filter(
          (r) => !( (r.userId === apprentice.uid || r.learnerId === apprentice.uid) && r.date === selectedDate )
        );
        return [...filtered, result.attendance];
      });

      // Actualizar estados locales de fila
      setRowStatuses((prev) => ({ ...prev, [apprentice.uid]: statusToSave }));
      if (obsToSave) setRowObservations((prev) => ({ ...prev, [apprentice.uid]: obsToSave }));
      if (timeToSave) setRowArrivalTimes((prev) => ({ ...prev, [apprentice.uid]: timeToSave }));

      if (statusToSave === 'AUSENTE') {
        if (result.attentionCall) {
          setAttentionCalls((prev) => [result.attentionCall!, ...prev.filter((c) => c.id !== result.attentionCall!.id)]);
          setSelectedCallForDoc(result.attentionCall);
        }
        setActionAlert({
          type: 'warning',
          message: `Inasistencia registrada para ${apprentice.displayName}.`,
        });
      } else if (statusToSave === 'TARDE') {
        setActionAlert({
          type: 'info',
          message: `Llegada tarde registrada para ${apprentice.displayName} (${timeToSave}).`,
        });
      } else if (statusToSave === 'EXCUSADO') {
        setActionAlert({
          type: 'info',
          message: `Asistencia marcada como Excusada para ${apprentice.displayName}.`,
        });
      } else {
        setActionAlert({
          type: 'success',
          message: `Asistencia Presente guardada para ${apprentice.displayName}.`,
        });
      }

      setTimeout(() => setActionAlert(null), 4000);
      return result;
    } catch (err) {
      console.error('[InstructorAttendanceView] Error guardando asistencia:', err);
      setActionAlert({
        type: 'warning',
        message: 'No fue posible guardar la asistencia.',
      });
    } finally {
      setSavingId(null);
    }
  };

  // Guardar toda la planilla de asistencia en Firestore ("Guardar todo")
  const handleSaveAll = async () => {
    if (apprentices.length === 0 || !selectedFicha) return;
    setIsSavingAll(true);
    try {
      const nowTime = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      const promises = apprentices.map((apprentice) => {
        const status = rowStatuses[apprentice.uid] || 'PRESENTE';
        const obs = rowObservations[apprentice.uid] || '';
        const time = status === 'TARDE' ? (rowArrivalTimes[apprentice.uid] || nowTime) : rowArrivalTimes[apprentice.uid];

        return trackingService.recordAttendance({
          learnerId: apprentice.uid,
          userId: apprentice.uid,
          learnerName: apprentice.displayName,
          learnerDocument: apprentice.documentNumber,
          enrollmentId: apprentice.enrollmentId,
          fichaId: selectedFicha,
          programId: activeFicha?.programId,
          instructorId,
          instructorName,
          date: selectedDate,
          status,
          arrivalTime: time,
          observation: obs,
          notes: obs,
        });
      });

      const results = await Promise.all(promises);
      const newRecords = results.map((r) => r.attendance);

      setAttendanceRecords((prev) => {
        const currentSavedIds = new Set(newRecords.map((r) => r.id));
        const kept = prev.filter((r) => !currentSavedIds.has(r.id));
        return [...kept, ...newRecords];
      });

      setActionAlert({
        type: 'success',
        message: `Planilla guardada exitosamente: ${results.length} registros actualizados en Firestore.`,
      });
      setTimeout(() => setActionAlert(null), 4500);
    } catch (err) {
      console.error('[InstructorAttendanceView] Error guardando toda la planilla:', err);
      setActionAlert({
        type: 'warning',
        message: 'Ocurrió un error al guardar la planilla completa.',
      });
    } finally {
      setIsSavingAll(false);
    }
  };

  // Marcar todos los aprendices como Presentes
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    apprentices.forEach((a) => {
      updated[a.uid] = 'PRESENTE';
    });
    setRowStatuses(updated);
    setActionAlert({
      type: 'info',
      message: 'Todos los aprendices seleccionados como Presente. Haz clic en "Guardar todo" para persistir en Firestore.',
    });
    setTimeout(() => setActionAlert(null), 4000);
  };

  // Abrir modal de configuración previa antes de emitir llamado por inasistencia
  const handleOpenAbsenceCallModal = (apprentice: ApprenticeWithEnrollment) => {
    const nowTime = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const existingCall = attentionCalls.find(
      (c) => (c.userId === apprentice.uid || c.learnerId === apprentice.uid) && c.date === selectedDate
    );

    setSelectedApprenticeForCall(apprentice);
    setIsEditingExistingCall(!!existingCall);

    if (existingCall) {
      setSelectedCallData(existingCall);
    } else {
      setSelectedCallData({
        learnerId: apprentice.uid,
        userId: apprentice.uid,
        learnerName: apprentice.displayName,
        learnerDocument: apprentice.documentNumber,
        fichaId: selectedFicha,
        fichaNumber: activeFicha?.number || apprentice.fichaNumber || selectedFicha,
        programId: activeFicha?.programId,
        programName: activeFicha?.programName || apprentice.programName || 'Programa de Formación SENA',
        type: 'INASISTENCIA',
        place: 'Ambiente de Formación',
        date: selectedDate,
        dateTimeDetail: `${selectedDate} ${nowTime}`,
        instructorName: instructorName,
        centerName: 'Centro de Formación SENA',
        regionalName: 'Regional SENA',
        callLevel: 'PRIMER_LLAMADO',
        normativeArticle:
          'Reglamento del Aprendiz SENA. Capítulo III. Deberes del aprendiz: Justificar debidamente las inasistencias a las actividades de formación.',
        improvementPlan:
          '1. Imprimir y firmar este llamado de atención.\n2. Presentar justificación formal en SENA Learning Hub dentro de los 3 días hábiles siguientes.\n3. Acordar con el instructor el plan de nivelación de evidencias.',
      });
    }
    setEditCallModalOpen(true);
  };

  // Abrir modal de tardanza
  const openLateModal = (apprentice: ApprenticeWithEnrollment) => {
    setTargetApprenticeForLate(apprentice);
    setLateMinutes(20);
    setLateObservation(rowObservations[apprentice.uid] || 'Retardo por transporte');
    setLateModalOpen(true);
  };

  const handleConfirmLate = () => {
    if (targetApprenticeForLate) {
      const nowTime = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      setRowStatuses((prev) => ({ ...prev, [targetApprenticeForLate.uid]: 'TARDE' }));
      setRowObservations((prev) => ({ ...prev, [targetApprenticeForLate.uid]: lateObservation }));
      setRowArrivalTimes((prev) => ({ ...prev, [targetApprenticeForLate.uid]: nowTime }));

      handleSaveIndividualAttendance(targetApprenticeForLate, 'TARDE', {
        minutesLate: lateMinutes,
        observation: lateObservation,
      });

      setLateModalOpen(false);
      setTargetApprenticeForLate(null);
    }
  };

  // Confirmar emisión o edición de llamado desde el modal
  const handleConfirmAttentionCall = async (
    data: Partial<AttentionCall>,
    applyRestriction?: boolean
  ) => {
    if (!selectedApprenticeForCall) return;

    try {
      if (isEditingExistingCall && data.id) {
        const updated = await trackingService.updateAttentionCall(data.id, data);
        setAttentionCalls((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setSelectedCallForDoc(updated);
        setActionAlert({
          type: 'success',
          message: `Llamado de atención actualizado para ${selectedApprenticeForCall.displayName}.`,
        });
      } else {
        const res = await handleSaveIndividualAttendance(
          selectedApprenticeForCall,
          data.type === 'TARDANZA' ? 'TARDE' : 'AUSENTE',
          {
            observation: data.description,
            customAttentionCall: data,
          }
        );

        if (res?.attentionCall) {
          setSelectedCallForDoc(res.attentionCall);
        }

        if (applyRestriction) {
          const newRestr = await trackingService.createRestriction({
            id: `restr_${Date.now()}`,
            learnerId: selectedApprenticeForCall.uid,
            userId: selectedApprenticeForCall.uid,
            learnerName: selectedApprenticeForCall.displayName,
            learnerDocument: selectedApprenticeForCall.documentNumber,
            fichaId: selectedFicha,
            programId: activeFicha?.programId,
            type: 'BLOQUEO_ENTREGA_EVIDENCIA',
            reason: `Restricción cautelar por llamado de atención (${data.type})`,
            description: data.description || 'Restricción preventiva de entrega de evidencias.',
            status: 'ACTIVA',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setRestrictions((prev) => [newRestr, ...prev]);
        }
      }
    } catch (err) {
      console.error('[InstructorAttendanceView] Error procesando llamado:', err);
    } finally {
      setEditCallModalOpen(false);
      setSelectedApprenticeForCall(null);
    }
  };

  // Filtrar aprendices por búsqueda
  const filteredApprentices = useMemo(() => {
    if (!searchQuery.trim()) return apprentices;
    const term = searchQuery.toLowerCase();
    return apprentices.filter(
      (a) =>
        a.displayName.toLowerCase().includes(term) ||
        (a.documentNumber && a.documentNumber.includes(term)) ||
        (a.email && a.email.toLowerCase().includes(term))
    );
  }, [apprentices, searchQuery]);

  // Contadores del día con base en rowStatuses
  const presentCount = apprentices.filter((a) => (rowStatuses[a.uid] || 'PRESENTE') === 'PRESENTE').length;
  const lateCount = apprentices.filter((a) => rowStatuses[a.uid] === 'TARDE').length;
  const absentCount = apprentices.filter((a) => rowStatuses[a.uid] === 'AUSENTE').length;
  const excusedCount = apprentices.filter((a) => rowStatuses[a.uid] === 'EXCUSADO').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Gestión Diaria Oficial
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Instructor: <strong>{instructorName}</strong>
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">
            Control de Asistencia y Puntualidad por Ficha
          </h1>
          <p className="text-xs text-slate-500">
            Registro real de aprendices presentes, retardos, inasistencias y justificaciones en Firestore
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading || fichasLoading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Recargar datos desde Firestore"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#39A900]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerta / Toast de confirmación */}
      {actionAlert && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-xs transition-all ${
            actionAlert.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : actionAlert.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-[#EBF8E7] border-[#39A900]/40 text-[#2E8500]'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {actionAlert.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : actionAlert.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#39A900] shrink-0" />
            )}
            <span>{actionAlert.message}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Parámetros de la Sesión (Ficha y Fecha) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#39A900]" />
            Parámetros de la Sesión de Formación
          </span>
          {activeFicha && (
            <span className="text-[11px] text-slate-500 font-medium">
              Programa: <strong>{activeFicha.programName || 'SENA'}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* Ficha asignada */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Ficha de Formación Asignada *:
            </label>
            {fichasLoading ? (
              <div className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400">
                Cargando fichas asignadas...
              </div>
            ) : fichas.length === 0 ? (
              <div className="px-3 py-2 border border-amber-200 rounded-lg bg-amber-50 text-amber-800 font-medium">
                Sin fichas asignadas a tu cuenta
              </div>
            ) : (
              <select
                value={selectedFicha}
                onChange={(e) => setSelectedFicha(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold focus:outline-none focus:border-[#39A900]"
              >
                {fichas.map((f) => (
                  <option key={f.id} value={f.id}>
                    Ficha #{f.number} · {f.programName || 'Programa SENA'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Fecha de la Sesión */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Fecha de la Sesión *:
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold focus:outline-none focus:border-[#39A900]"
              />
            </div>
          </div>

          {/* Jornada / Centro */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Jornada / Modalidad:
            </label>
            <div className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium truncate">
              {activeFicha?.shift === 'evening'
                ? 'Jornada Nocturna'
                : activeFicha?.shift === 'afternoon'
                ? 'Jornada Tarde'
                : 'Jornada Diurna'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Indicadores Rápidos de la Sesión */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold">Presentes</span>
            <div className="text-xl font-bold text-[#2E8500] font-mono mt-0.5">{presentCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#EBF8E7] text-[#39A900] flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold">Llegadas Tarde</span>
            <div className="text-xl font-bold text-amber-600 font-mono mt-0.5">{lateCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold">Inasistencias</span>
            <div className="text-xl font-bold text-rose-600 font-mono mt-0.5">{absentCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold">Excusados</span>
            <div className="text-xl font-bold text-blue-600 font-mono mt-0.5">{excusedCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Tabla de Asistencia Real */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Barra superior de herramientas */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-[#00324D]">
              Planilla de Asistencia {activeFicha ? `· Ficha #${activeFicha.number}` : ''}
            </span>
            <span className="text-xs text-slate-500">
              ({filteredApprentices.length} aprendices)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Buscador */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar aprendiz o CC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#39A900]"
              />
            </div>

            {/* Marcar todos presentes */}
            {apprentices.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Marcar todos en estado Presente"
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#39A900]" />
                Todos Presentes
              </button>
            )}

            {/* Guardar todo */}
            {apprentices.length > 0 && (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSavingAll || loading}
                className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="Guardar toda la planilla de asistencia en Firestore"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingAll ? 'Guardando planilla...' : 'Guardar todo'}
              </button>
            )}
          </div>
        </div>

        {/* Contenido de la Tabla */}
        {unauthorizedFicha ? (
          <div className="p-8 text-center text-rose-700 bg-rose-50/50">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-rose-600" />
            <p className="font-bold text-sm">Acceso no autorizado</p>
            <p className="text-xs text-rose-600 mt-1">
              No tienes asignada esta ficha en tu perfil de instructor.
            </p>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#39A900] mb-2" />
            <p className="text-xs">Cargando aprendices matriculados y registros de asistencia...</p>
          </div>
        ) : apprentices.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="font-bold text-sm text-slate-700">Sin aprendices</p>
            <p className="text-xs mt-1">No hay aprendices matriculados en esta ficha.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#00324D] text-white border-b border-slate-700">
                  <th className="p-3 font-bold">Aprendiz</th>
                  <th className="p-3 font-bold">Documento</th>
                  <th className="p-3 font-bold text-center">Estado</th>
                  <th className="p-3 font-bold text-center">Hora</th>
                  <th className="p-3 font-bold">Observación</th>
                  <th className="p-3 font-bold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredApprentices.map((apprentice) => {
                  const currentStatus = rowStatuses[apprentice.uid] || 'PRESENTE';
                  const currentObs = rowObservations[apprentice.uid] || '';
                  const currentTime = rowArrivalTimes[apprentice.uid] || '';
                  const isSaving = savingId === apprentice.uid;

                  // Llamado de atención para este aprendiz
                  const userCall = attentionCalls.find(
                    (c) => (c.userId === apprentice.uid || c.learnerId === apprentice.uid) && c.date === selectedDate
                  );

                  // Restricción para este aprendiz
                  const userRestriction = restrictions.find(
                    (r) =>
                      (r.userId === apprentice.uid || r.learnerId === apprentice.uid) &&
                      (r.status === 'active' || r.status === 'ACTIVA')
                  );

                  return (
                    <tr key={apprentice.uid} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Aprendiz */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={apprentice.photoURL}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">
                              {apprentice.displayName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono truncate block">
                              {apprentice.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Documento */}
                      <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                        CC {apprentice.documentNumber || '—'}
                      </td>

                      {/* 3. Estado (Selector de 4 estados) */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-1 shadow-2xs">
                          {/* PRESENTE */}
                          <button
                            type="button"
                            onClick={() => handleSelectStatus(apprentice.uid, 'PRESENTE')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              currentStatus === 'PRESENTE' || currentStatus === 'present'
                                ? 'bg-[#39A900] text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                          >
                            PRESENTE
                          </button>

                          {/* AUSENTE */}
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectStatus(apprentice.uid, 'AUSENTE');
                              handleOpenAbsenceCallModal(apprentice);
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              currentStatus === 'AUSENTE' || currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            AUSENTE
                          </button>

                          {/* TARDE */}
                          <button
                            type="button"
                            onClick={() => openLateModal(apprentice)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              currentStatus === 'TARDE' || currentStatus === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                          >
                            TARDE
                          </button>

                          {/* EXCUSADO */}
                          <button
                            type="button"
                            onClick={() => handleSelectStatus(apprentice.uid, 'EXCUSADO')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              currentStatus === 'EXCUSADO' || currentStatus === 'excused'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            EXCUSADO
                          </button>
                        </div>
                      </td>

                      {/* 4. Hora */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <input
                          type="time"
                          value={currentTime}
                          onChange={(e) =>
                            setRowArrivalTimes((prev) => ({ ...prev, [apprentice.uid]: e.target.value }))
                          }
                          className="px-2 py-1 border border-slate-200 rounded text-[11px] font-mono bg-white focus:outline-none focus:border-[#39A900] w-24 text-center"
                        />
                      </td>

                      {/* 5. Observación */}
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="Observación opcional..."
                          value={currentObs}
                          onChange={(e) =>
                            setRowObservations((prev) => ({ ...prev, [apprentice.uid]: e.target.value }))
                          }
                          className="w-full px-2.5 py-1 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#39A900]"
                        />
                      </td>

                      {/* 6. Acción */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Guardar asistencia individual */}
                          <button
                            type="button"
                            onClick={() => handleSaveIndividualAttendance(apprentice)}
                            disabled={isSaving}
                            className="px-2.5 py-1 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                            title="Guardar asistencia de este aprendiz en Firestore"
                          >
                            <Save className="w-3 h-3" />
                            {isSaving ? 'Guardando...' : 'Guardar'}
                          </button>

                          {/* Acta si tiene llamado */}
                          {userCall && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCallForDoc(userCall);
                                setDocumentModalOpen(true);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-[#00324D] hover:text-white text-[#00324D] rounded-lg text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              title="Ver Acta Oficial del llamado de atención"
                            >
                              <Printer className="w-3 h-3 text-[#39A900]" />
                              Acta
                            </button>
                          )}

                          {/* Expediente Académico */}
                          <button
                            type="button"
                            onClick={() => setSelectedApprenticeForHistory(apprentice)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title="Ver expediente e historial integral del aprendiz"
                          >
                            <FileText className="w-3 h-3" />
                            Historial
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Llegada Tarde */}
      <Modal
        isOpen={lateModalOpen}
        onClose={() => setLateModalOpen(false)}
        title="Registrar Llegada Tarde"
        subtitle={
          targetApprenticeForLate
            ? `${targetApprenticeForLate.displayName} (CC ${targetApprenticeForLate.documentNumber || '—'})`
            : ''
        }
        footer={
          <div className="flex items-center justify-end w-full gap-2">
            <button
              type="button"
              onClick={() => setLateModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmLate}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Guardar Retardo
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Minutos de Retraso *:
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={lateMinutes}
              onChange={(e) => setLateMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900] font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Tiempo transcurrido desde el inicio oficial de la sesión formativa.
            </span>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Observación pedagógica / Justificación verbal:
            </label>
            <textarea
              rows={3}
              value={lateObservation}
              onChange={(e) => setLateObservation(e.target.value)}
              placeholder="Ej: Retardo justificado por transporte..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#39A900]"
            />
          </div>
        </div>
      </Modal>

      {/* Modal para Modificar Detalles de Inasistencia y Plan de Mejoramiento antes de Emitir */}
      <EditAttentionCallModal
        isOpen={editCallModalOpen}
        onClose={() => {
          setEditCallModalOpen(false);
          setSelectedApprenticeForCall(null);
        }}
        initialData={selectedCallData}
        isNew={!isEditingExistingCall}
        title={
          isEditingExistingCall
            ? 'Modificar Detalles de Inasistencia y Plan de Mejoramiento'
            : 'Configurar Llamado de Atención antes de Emitir'
        }
        onConfirm={handleConfirmAttentionCall}
      />

      {/* Modal de Documento Oficial SENA Imprimible con Logo y Formato Oficial */}
      <AttentionCallDocumentModal
        isOpen={documentModalOpen}
        onClose={() => {
          setDocumentModalOpen(false);
          setSelectedCallForDoc(null);
        }}
        call={selectedCallForDoc}
        onEdit={(c) => {
          const appr =
            apprentices.find(
              (a) => a.uid === c.userId || a.documentNumber === c.learnerDocument
            ) || null;
          setSelectedApprenticeForCall(appr);
          setSelectedCallData(c);
          setIsEditingExistingCall(true);
          setDocumentModalOpen(false);
          setEditCallModalOpen(true);
        }}
        onCallUpdated={(updated) => {
          setAttentionCalls((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
          setSelectedCallForDoc(updated);
        }}
      />

      {/* Modal de Historial Académico del Aprendiz */}
      {selectedApprenticeForHistory && (
        <ApprenticeAcademicProfileModal
          apprentice={selectedApprenticeForHistory}
          onClose={() => setSelectedApprenticeForHistory(null)}
        />
      )}
    </div>
  );
};
