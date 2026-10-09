/**
 * @license
 * SENA Learning Hub - Planilla General de Asistencia de la Ficha
 * Formato Matricial de Listado de Aprendices y Sesiones de Clase
 * Conectado a Cloud Firestore (/attendance) vía trackingService
 *
 * Estados Oficiales SENA:
 * - P: Presente (Asistió)
 * - F: Falla / Inasistencia sin excusa (No asistió)
 * - J: No asistió con excusa (Ausencia justificada)
 * - T: Llegó tarde (Tardanza sin excusa)
 * - T/J: Llegó tarde con excusa (Tardanza justificada)
 * - —: Sin registrar
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  CalendarCheck,
  Check,
  X,
  Clock,
  FileCheck2,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  User,
  Edit3,
  RefreshCw,
  CheckCircle2,
  ArrowUpDown,
  ShieldAlert,
} from 'lucide-react';
import {
  Ficha,
  ApprenticeWithEnrollment,
  AttendanceRecord,
  AttendanceStatus,
} from '../../types/academic';
import { trackingService } from '../../services/academic/trackingService';
import { ApprenticeAcademicProfileModal } from './ApprenticeAcademicProfileModal';
import { EditAttentionCallModal } from './EditAttentionCallModal';
import { Modal } from '../ui/Modal';

interface FichaAsistenciaPlanillaProps {
  ficha: Ficha;
  apprentices: ApprenticeWithEnrollment[];
  initialAttendance?: AttendanceRecord[];
  instructorUid: string;
  instructorName?: string;
  onRefreshData?: () => Promise<void> | void;
  onAttendanceUpdated?: (records: AttendanceRecord[]) => void;
}

// Mapeo canónico de los 5 estados oficiales SENA
export type StandardStatus =
  | 'PRESENTE'        // P: Presente
  | 'AUSENTE'         // F: Falla / Inasistencia sin excusa
  | 'EXCUSADO'        // J: No asistió con excusa (Ausencia justificada)
  | 'TARDE'           // T: Llegó tarde (Tardanza sin excusa)
  | 'TARDE_EXCUSADO'; // T/J: Llegó tarde con excusa (Tardanza justificada)

interface CellDetailState {
  apprentice: ApprenticeWithEnrollment;
  date: string;
  status: StandardStatus;
  observation: string;
  arrivalTime: string;
}

interface CellSelectorState {
  apprentice: ApprenticeWithEnrollment;
  date: string;
}

export const FichaAsistenciaPlanilla: React.FC<FichaAsistenciaPlanillaProps> = ({
  ficha,
  apprentices,
  initialAttendance = [],
  instructorUid,
  instructorName = 'Instructor SENA',
  onRefreshData,
  onAttendanceUpdated,
}) => {
  // 1. Estado de registros de asistencia
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>(initialAttendance);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estado del modal selector de estado rápido por celda
  const [cellSelector, setCellSelector] = useState<CellSelectorState | null>(null);
  const [isSavingSelectorOption, setIsSavingSelectorOption] = useState<string | null>(null);

  // Sincronizar si cambia initialAttendance
  useEffect(() => {
    if (initialAttendance && initialAttendance.length > 0) {
      setAttendanceList(initialAttendance);
    }
  }, [initialAttendance]);

  // Recarga directa desde Firestore para toda la ficha
  const reloadAllAttendance = useCallback(async () => {
    if (!ficha?.id) return;
    setLoading(true);
    try {
      const res = await trackingService.getAttendance(ficha.id);
      if (res.data) {
        setAttendanceList(res.data);
      }
    } catch (e) {
      console.warn('[FichaAsistenciaPlanilla] Error recargando asistencia:', e);
    } finally {
      setLoading(false);
    }
  }, [ficha?.id]);

  useEffect(() => {
    reloadAllAttendance();
  }, [reloadAllAttendance]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 2. Extraer fechas únicas de sesiones registradas
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('asc'); // 'asc' = más antiguas primero

  const uniqueSessionDates = useMemo(() => {
    const datesSet = new Set<string>();
    attendanceList.forEach((r) => {
      if (r.date && r.fichaId === ficha.id) {
        datesSet.add(r.date);
      }
    });

    const datesArray = Array.from(datesSet);
    datesArray.sort((a, b) => {
      const cmp = new Date(a).getTime() - new Date(b).getTime();
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return datesArray;
  }, [attendanceList, ficha.id, sortOrder]);

  // Mapa rápido [apprenticeId_date] -> AttendanceRecord
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceList.forEach((rec) => {
      const learnerId = rec.learnerId || rec.userId;
      if (learnerId && rec.date) {
        map.set(`${learnerId}_${rec.date}`, rec);
      }
    });
    return map;
  }, [attendanceList]);

  // 3. Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'at_risk' | 'with_absences' | 'with_excuses' | 'perfect'
  >('all');

  // 4. Modal para agregar nueva sesión
  const [newSessionModalOpen, setNewSessionModalOpen] = useState(false);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [newSessionDate, setNewSessionDate] = useState(todayStr);
  const [newSessionPreset, setNewSessionPreset] = useState<'PRESENTE' | 'NONE'>('PRESENTE');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // 5. Modal para editar detalle de celda
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<CellDetailState | null>(null);
  const [isSavingCell, setIsSavingCell] = useState(false);

  // 6. Modal para ver perfil del aprendiz
  const [profileModalApprentice, setProfileModalApprentice] =
    useState<ApprenticeWithEnrollment | null>(null);

  // 7. Modal para radicar llamado de atención
  const [attentionCallModalOpen, setAttentionCallModalOpen] = useState(false);
  const [selectedApprenticeForCall, setSelectedApprenticeForCall] =
    useState<ApprenticeWithEnrollment | null>(null);

  // 8. Modal de confirmación para eliminar sesión
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  // Normalizador estricto de estado para compatibilidad total con registros históricos
  const normalizeStatus = (st?: string): StandardStatus | '-' => {
    if (!st) return '-';
    const upper = st.toUpperCase().trim();
    if (upper === 'PRESENTE' || upper === 'PRESENT') return 'PRESENTE';
    if (upper === 'AUSENTE' || upper === 'ABSENT') return 'AUSENTE';
    if (
      upper === 'TARDE_EXCUSADO' ||
      upper === 'LATE_EXCUSED' ||
      upper === 'T/J' ||
      upper === 'TARDE_JUSTIFICADA' ||
      upper === 'RETARDO_EXCUSADO'
    ) {
      return 'TARDE_EXCUSADO';
    }
    if (upper === 'TARDE' || upper === 'LATE') return 'TARDE';
    if (
      upper === 'EXCUSADO' ||
      upper === 'EXCUSED' ||
      upper === 'AUSENCIA_JUSTIFICADA' ||
      upper === 'JUSTIFICADO' ||
      upper === 'NO_ASISTIO_CON_EXCUSA'
    ) {
      return 'EXCUSADO';
    }
    return '-';
  };

  // Estadísticas calculadas por aprendiz
  const learnerStats = useMemo(() => {
    const stats: Record<
      string,
      {
        present: number;
        absent: number;
        excusedAbsent: number;
        late: number;
        lateExcused: number;
        totalRecorded: number;
        rate: number;
        isAtRisk: boolean;
      }
    > = {};

    apprentices.forEach((app) => {
      let p = 0;   // Presentes
      let a = 0;   // Ausencias sin excusa
      let j = 0;   // No asistió con excusa (Ausencias justificadas)
      let t = 0;   // Llegó tarde (Tardanzas sin excusa)
      let tj = 0;  // Llegó tarde con excusa (Tardanzas justificadas)

      uniqueSessionDates.forEach((d) => {
        const rec = attendanceMap.get(`${app.uid}_${d}`);
        if (rec) {
          const norm = normalizeStatus(rec.status);
          if (norm === 'PRESENTE') p++;
          else if (norm === 'AUSENTE') a++;
          else if (norm === 'EXCUSADO') j++;
          else if (norm === 'TARDE') t++;
          else if (norm === 'TARDE_EXCUSADO') tj++;
        }
      });

      const totalRecorded = p + a + j + t + tj;

      // REGLA SOLICITADA:
      // No contar una ausencia justificada (j) como asistencia efectiva.
      // Quienes asistieron físicamente son: p (a tiempo), tj (tardanza con excusa) y t (tardanza sin excusa con ponderación 0.8).
      const effectiveAttended = p + tj + (t * 0.8);
      const rate = totalRecorded > 0 ? Math.round((effectiveAttended / totalRecorded) * 100) : 100;

      // Normativa SENA: 3 o más fallas injustificadas (a) ameritan llamado de atención o comité
      const isAtRisk = a >= 3;

      stats[app.uid] = {
        present: p,
        absent: a,
        excusedAbsent: j,
        late: t,
        lateExcused: tj,
        totalRecorded,
        rate,
        isAtRisk,
      };
    });

    return stats;
  }, [apprentices, uniqueSessionDates, attendanceMap]);

  // Filtrado de aprendices
  const filteredApprentices = useMemo(() => {
    return apprentices.filter((app) => {
      // Filtro de texto
      const matchesSearch =
        !searchQuery.trim() ||
        app.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filtro de estado
      const st = learnerStats[app.uid];
      if (!st) return true;

      if (statusFilter === 'at_risk') {
        return st.isAtRisk;
      }
      if (statusFilter === 'with_absences') {
        return st.absent > 0;
      }
      if (statusFilter === 'with_excuses') {
        return st.excusedAbsent > 0 || st.lateExcused > 0;
      }
      if (statusFilter === 'perfect') {
        return (
          st.absent === 0 &&
          st.excusedAbsent === 0 &&
          st.late === 0 &&
          st.totalRecorded > 0
        );
      }

      return true;
    });
  }, [apprentices, searchQuery, statusFilter, learnerStats]);

  // Estadísticas globales consolidadas de la Ficha
  const fichaKpis = useMemo(() => {
    const totalApps = apprentices.length;
    const totalSessions = uniqueSessionDates.length;
    let sumRate = 0;
    let atRiskCount = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalExcusedAbsent = 0;
    let totalLate = 0;
    let totalLateExcused = 0;

    apprentices.forEach((app) => {
      const st = learnerStats[app.uid];
      if (st) {
        sumRate += st.rate;
        if (st.isAtRisk) atRiskCount++;
        totalPresent += st.present;
        totalAbsent += st.absent;
        totalExcusedAbsent += st.excusedAbsent;
        totalLate += st.late;
        totalLateExcused += st.lateExcused;
      }
    });

    const avgRate = totalApps > 0 ? Math.round(sumRate / totalApps) : 100;

    return {
      totalApps,
      totalSessions,
      avgRate,
      atRiskCount,
      totalPresent,
      totalAbsent,
      totalExcusedAbsent,
      totalLate,
      totalLateExcused,
    };
  }, [apprentices, uniqueSessionDates, learnerStats]);

  // Formateador de fechas de columna (ej. "13 ago.")
  const formatColumnDate = (dateStr: string): { short: string; full: string } => {
    try {
      const [year, month, day] = dateStr.split('-');
      if (!year || !month || !day) return { short: dateStr, full: dateStr };
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const dayNum = d.getDate();
      const monthShort = d
        .toLocaleDateString('es-CO', { month: 'short' })
        .replace('.', '');
      return {
        short: `${dayNum} ${monthShort}`,
        full: d.toLocaleDateString('es-CO', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      };
    } catch {
      return { short: dateStr, full: dateStr };
    }
  };

  // Nombres descriptivos para feedback
  const statusLabels: Record<StandardStatus, string> = {
    PRESENTE: 'Presente (P)',
    AUSENTE: 'Falla / Inasistencia sin excusa (F)',
    EXCUSADO: 'No asistió con excusa (J)',
    TARDE: 'Llegó tarde (T)',
    TARDE_EXCUSADO: 'Llegó tarde con excusa (T/J)',
  };

  // Seleccionar y guardar directamente cualquiera de los estados oficiales o Sin registrar
  const handleSelectStatus = async (
    apprentice: ApprenticeWithEnrollment,
    date: string,
    targetStatus: StandardStatus | '-'
  ) => {
    const cellKey = `${apprentice.uid}_${date}`;
    const currentRec = attendanceMap.get(cellKey);
    const recordId = currentRec?.id || `att_${ficha.id}_${apprentice.uid}_${date}`;

    setIsSavingSelectorOption(targetStatus);
    setSavingKey(cellKey);

    try {
      if (targetStatus === '-') {
        // 1. Sin registrar: borrar documento en Firestore si existía
        if (currentRec || recordId) {
          await trackingService.deleteAttendanceRecord(recordId);
        }

        const updatedList = attendanceList.filter(
          (r) => !((r.learnerId === apprentice.uid || r.userId === apprentice.uid) && r.date === date)
        );
        setAttendanceList(updatedList);
        if (onAttendanceUpdated) {
          onAttendanceUpdated(updatedList);
        }
        showToast(`${apprentice.displayName.split(' ')[0]}: Desmarcado (Sin registrar)`);
      } else {
        // 2. Estados oficiales SENA (P, F, J, T, T/J)
        const res = await trackingService.recordAttendance({
          id: currentRec?.id,
          fichaId: ficha.id,
          learnerId: apprentice.uid,
          userId: apprentice.uid,
          learnerName: apprentice.displayName,
          learnerDocument: apprentice.documentNumber,
          enrollmentId: apprentice.enrollmentId,
          date,
          status: targetStatus,
          observation: currentRec?.observation || '',
          arrivalTime: currentRec?.arrivalTime,
          instructorId: instructorUid,
          instructorName,
          createdAt: currentRec?.createdAt,
          recordedBy: currentRec?.recordedBy || instructorUid,
        });

        const updatedRecord = res.attendance;
        let updatedList: AttendanceRecord[] = [];
        setAttendanceList((prev) => {
          const idx = prev.findIndex(
            (r) => (r.learnerId === apprentice.uid || r.userId === apprentice.uid) && r.date === date
          );
          if (idx >= 0) {
            updatedList = [...prev];
            updatedList[idx] = updatedRecord;
          } else {
            updatedList = [...prev, updatedRecord];
          }
          return updatedList;
        });

        if (onAttendanceUpdated) {
          onAttendanceUpdated(updatedList);
        }
        showToast(`${apprentice.displayName.split(' ')[0]}: ${statusLabels[targetStatus]}`);
      }

      // Cerrar modal selector y liberar bloqueo
      setCellSelector(null);
    } catch (err: any) {
      console.error('[FichaAsistenciaPlanilla] Error persistiendo asistencia en Firestore:', err);
      showToast(`Error al guardar en Firestore: ${err?.message || 'Permiso denegado o falla de red'}`);
      // NO modificamos el estado visual si Firestore rechazó la escritura
    } finally {
      setIsSavingSelectorOption(null);
      setSavingKey(null);
    }
  };

  // Abrir modal de edición detallada de celda
  const handleOpenCellDetail = (apprentice: ApprenticeWithEnrollment, date: string) => {
    const rec = attendanceMap.get(`${apprentice.uid}_${date}`);
    const norm = normalizeStatus(rec?.status);
    setEditingCell({
      apprentice,
      date,
      status: (norm === '-' ? 'PRESENTE' : norm) as StandardStatus,
      observation: rec?.observation || '',
      arrivalTime: rec?.arrivalTime || '',
    });
    setCellModalOpen(true);
  };

  // Guardar detalle de celda desde modal
  const handleSaveCellDetail = async () => {
    if (!editingCell) return;
    setIsSavingCell(true);
    const { apprentice, date, status, observation, arrivalTime } = editingCell;
    const cellKey = `${apprentice.uid}_${date}`;
    const currentRec = attendanceMap.get(cellKey);

    try {
      const res = await trackingService.recordAttendance({
        id: currentRec?.id,
        fichaId: ficha.id,
        learnerId: apprentice.uid,
        userId: apprentice.uid,
        learnerName: apprentice.displayName,
        learnerDocument: apprentice.documentNumber,
        enrollmentId: apprentice.enrollmentId,
        date,
        status,
        observation: observation.trim(),
        arrivalTime: arrivalTime || undefined,
        instructorId: instructorUid,
        instructorName,
        createdAt: currentRec?.createdAt,
        recordedBy: currentRec?.recordedBy || instructorUid,
      });

      const updatedRecord = res.attendance;
      let updatedList: AttendanceRecord[] = [];
      setAttendanceList((prev) => {
        const idx = prev.findIndex(
          (r) => (r.learnerId === apprentice.uid || r.userId === apprentice.uid) && r.date === date
        );
        if (idx >= 0) {
          updatedList = [...prev];
          updatedList[idx] = updatedRecord;
        } else {
          updatedList = [...prev, updatedRecord];
        }
        return updatedList;
      });

      if (onAttendanceUpdated) {
        onAttendanceUpdated(updatedList);
      }
      showToast(`Guardado: ${statusLabels[status]}`);
      setCellModalOpen(false);
      setEditingCell(null);
    } catch (err: any) {
      console.error('[FichaAsistenciaPlanilla] Error guardando detalle de celda en Firestore:', err);
      showToast(`Error al guardar en Firestore: ${err?.message || 'Error de red o permisos'}`);
    } finally {
      setIsSavingCell(false);
    }
  };

  // Crear una nueva sesión / columna de fecha
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionDate) return;

    if (uniqueSessionDates.includes(newSessionDate)) {
      showToast(`La sesión del ${newSessionDate} ya existe en esta ficha.`);
      setNewSessionModalOpen(false);
      return;
    }

    setIsCreatingSession(true);
    try {
      if (newSessionPreset === 'PRESENTE') {
        // Registrar masivamente a todos como Presentes
        const payloads = apprentices.map((app) => ({
          fichaId: ficha.id,
          learnerId: app.uid,
          userId: app.uid,
          learnerName: app.displayName,
          learnerDocument: app.documentNumber,
          enrollmentId: app.enrollmentId,
          date: newSessionDate,
          status: 'PRESENTE' as StandardStatus,
          instructorId: instructorUid,
          instructorName,
        }));
        await trackingService.batchRecordAttendance(payloads);
        showToast(`Sesión del ${newSessionDate} creada con todos presentes.`);
      } else {
        if (apprentices.length > 0) {
          const firstApp = apprentices[0];
          await trackingService.recordAttendance({
            fichaId: ficha.id,
            learnerId: firstApp.uid,
            userId: firstApp.uid,
            learnerName: firstApp.displayName,
            learnerDocument: firstApp.documentNumber,
            date: newSessionDate,
            status: 'PRESENTE',
            instructorId: instructorUid,
            instructorName,
          });
        }
        showToast(`Sesión del ${newSessionDate} habilitada.`);
      }

      setNewSessionModalOpen(false);
      await reloadAllAttendance();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.warn('[FichaAsistenciaPlanilla] Error creando sesión:', err);
      showToast('Error al registrar la nueva sesión');
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Marcar a todos en una columna específica como Presentes
  const handleMarkAllColumn = async (date: string, status: StandardStatus) => {
    setLoading(true);
    try {
      const payloads = apprentices.map((app) => {
        const currentRec = attendanceMap.get(`${app.uid}_${date}`);
        return {
          fichaId: ficha.id,
          learnerId: app.uid,
          userId: app.uid,
          learnerName: app.displayName,
          learnerDocument: app.documentNumber,
          enrollmentId: app.enrollmentId,
          date,
          status,
          observation: currentRec?.observation || '',
          instructorId: instructorUid,
          instructorName,
        };
      });

      await trackingService.batchRecordAttendance(payloads);
      showToast(`Sesión ${date}: todos marcados como ${statusLabels[status]}`);
      await reloadAllAttendance();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.warn('[FichaAsistenciaPlanilla] Error en acción masiva de columna:', err);
      showToast('Error en la operación masiva');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar y eliminar sesión completa
  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeletingSession(true);
    try {
      await trackingService.deleteAttendanceSession(ficha.id, sessionToDelete);
      showToast(`Sesión del ${sessionToDelete} eliminada correctamente.`);
      setSessionToDelete(null);
      await reloadAllAttendance();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.warn('[FichaAsistenciaPlanilla] Error eliminando sesión:', err);
      showToast('Error al eliminar la sesión');
    } finally {
      setIsDeletingSession(false);
    }
  };

  // Exportar a CSV oficial con las 5 convenciones y porcentajes
  const handleExportCSV = () => {
    if (apprentices.length === 0) {
      showToast('No hay aprendices para exportar.');
      return;
    }

    const headers = [
      '#',
      'Documento',
      'Nombre del Aprendiz',
      'Correo Institucional',
      ...uniqueSessionDates.map((d) => formatColumnDate(d).short),
      'Presentes (P)',
      'Ausencias sin excusa (F)',
      'No asistió con excusa (J)',
      'Llegó tarde (T)',
      'Llegó tarde con excusa (T/J)',
      '% Asistencia',
      'Situación Académica',
    ];

    const rows = apprentices.map((app, idx) => {
      const st = learnerStats[app.uid] || {
        present: 0,
        absent: 0,
        excusedAbsent: 0,
        late: 0,
        lateExcused: 0,
        rate: 100,
        isAtRisk: false,
      };

      const dateCells = uniqueSessionDates.map((d) => {
        const rec = attendanceMap.get(`${app.uid}_${d}`);
        const norm = normalizeStatus(rec?.status);
        if (norm === 'PRESENTE') return 'P';
        if (norm === 'AUSENTE') return 'F';
        if (norm === 'EXCUSADO') return 'J';
        if (norm === 'TARDE') return 'T';
        if (norm === 'TARDE_EXCUSADO') return 'T/J';
        return '—';
      });

      return [
        idx + 1,
        `"${app.documentNumber}"`,
        `"${app.displayName}"`,
        `"${app.email}"`,
        ...dateCells.map((c) => `"${c}"`),
        st.present,
        st.absent,
        st.excusedAbsent,
        st.late,
        st.lateExcused,
        `"${st.rate}%"`,
        st.isAtRisk ? '"EN RIESGO (3+ Fallas sin excusa)"' : '"NORMAL"',
      ];
    });

    const csvContent =
      '\uFEFF' +
      [
        `"SENA LEARNING HUB - PLANILLA OFICIAL DE ASISTENCIA"`,
        `"Ficha: #${ficha.number} - ${ficha.programName || ficha.name}"`,
        `"Instructor: ${instructorName}"`,
        `"Fecha de Generación: ${new Date().toLocaleDateString('es-CO')}"`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Planilla_Asistencia_Ficha_${ficha.number}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Planilla de asistencia descargada en CSV.');
  };

  // Renderizar celda con iniciales y estilo visual institucional diferenciado
  const renderStatusCellBadge = (status: StandardStatus | '-', hasObservation: boolean) => {
    switch (status) {
      case 'PRESENTE':
        return (
          <span
            className="relative inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-300 shadow-2xs hover:scale-105 transition-transform"
            title="Presente (P)"
          >
            P
            {hasObservation && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white ring-1 ring-blue-200" />
            )}
          </span>
        );
      case 'AUSENTE':
        return (
          <span
            className="relative inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-100 text-rose-800 font-extrabold text-xs border border-rose-300 shadow-2xs hover:scale-105 transition-transform"
            title="Falla / Inasistencia sin excusa (F)"
          >
            F
            {hasObservation && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white ring-1 ring-blue-200" />
            )}
          </span>
        );
      case 'EXCUSADO':
        return (
          <span
            className="relative inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-extrabold text-xs border border-blue-300 shadow-2xs hover:scale-105 transition-transform"
            title="No asistió con excusa (J)"
          >
            J
            {hasObservation && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white ring-1 ring-amber-200" />
            )}
          </span>
        );
      case 'TARDE':
        return (
          <span
            className="relative inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-extrabold text-xs border border-amber-300 shadow-2xs hover:scale-105 transition-transform"
            title="Llegó tarde (T)"
          >
            T
            {hasObservation && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white ring-1 ring-blue-200" />
            )}
          </span>
        );
      case 'TARDE_EXCUSADO':
        return (
          <span
            className="relative inline-flex items-center justify-center min-w-7 h-7 px-1 rounded-lg bg-purple-100 text-purple-800 font-extrabold text-[10px] border border-purple-300 shadow-2xs hover:scale-105 transition-transform"
            title="Llegó tarde con excusa (T/J)"
          >
            T/J
            {hasObservation && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white ring-1 ring-blue-200" />
            )}
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-400 font-bold text-xs border border-slate-200 hover:bg-slate-200 transition-colors"
            title="Sin registrar (—)"
          >
            —
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Barra de notificación Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-[#00324D] text-white rounded-xl shadow-lg border border-[#39A900] text-xs font-semibold animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#8CE665] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Tarjetas de KPIs Generales de Asistencia */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Aprendices
            </span>
            <span className="text-xl font-bold font-mono text-[#00324D]">
              {fichaKpis.totalApps}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Sesiones Registradas
            </span>
            <span className="text-xl font-bold font-mono text-[#00324D]">
              {fichaKpis.totalSessions}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Asistencia Promedio
            </span>
            <span
              className={`text-xl font-bold font-mono ${
                fichaKpis.avgRate >= 85
                  ? 'text-emerald-700'
                  : fichaKpis.avgRate >= 75
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {fichaKpis.avgRate}%
            </span>
          </div>
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              fichaKpis.avgRate >= 85
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            <Check className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              En Riesgo (3+ Fallas)
            </span>
            <span
              className={`text-xl font-bold font-mono ${
                fichaKpis.atRiskCount > 0 ? 'text-rose-700' : 'text-slate-700'
              }`}
            >
              {fichaKpis.atRiskCount}
            </span>
          </div>
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              fichaKpis.atRiskCount > 0
                ? 'bg-rose-100 text-rose-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2.1 Desglose General Consolidado de Estados */}
      {fichaKpis.totalSessions > 0 && (
        <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-700 text-[11px]">Totales de la Ficha:</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
              <span className="w-4 h-4 rounded bg-emerald-600 text-white font-extrabold text-[9px] flex items-center justify-center">P</span>
              <span>Presentes:</span>
              <strong className="font-mono font-bold">{fichaKpis.totalPresent}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-semibold text-[11px]">
              <span className="w-4 h-4 rounded bg-rose-600 text-white font-extrabold text-[9px] flex items-center justify-center">F</span>
              <span>Sin excusa:</span>
              <strong className="font-mono font-bold">{fichaKpis.totalAbsent}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[11px]">
              <span className="w-4 h-4 rounded bg-blue-600 text-white font-extrabold text-[9px] flex items-center justify-center">J</span>
              <span>No asistió con excusa:</span>
              <strong className="font-mono font-bold">{fichaKpis.totalExcusedAbsent}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
              <span className="w-4 h-4 rounded bg-amber-600 text-white font-extrabold text-[9px] flex items-center justify-center">T</span>
              <span>Tarde:</span>
              <strong className="font-mono font-bold">{fichaKpis.totalLate}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-semibold text-[11px]">
              <span className="min-w-5 h-4 px-0.5 rounded bg-purple-600 text-white font-extrabold text-[8px] flex items-center justify-center">T/J</span>
              <span>Tarde con excusa:</span>
              <strong className="font-mono font-bold">{fichaKpis.totalLateExcused}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 3. Barra de Control y Herramientas */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#39A900]" />
              Planilla Matricial de Asistencia — Ficha #{ficha.number}
            </h3>
            <p className="text-xs text-slate-500">
              Registros consolidados de sesiones formativas en Cloud Firestore (/attendance). Haz clic en una celda para alternar estado o doble clic para editar hora y observación pedagógica.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Botón Nueva Sesión */}
            <button
              type="button"
              onClick={() => {
                setNewSessionDate(todayStr);
                setNewSessionModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nueva Sesión</span>
            </button>

            {/* Orden Cronológico */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              title="Cambiar orden de fechas"
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortOrder === 'asc' ? 'Antiguas primero' : 'Recientes primero'}</span>
            </button>

            {/* Recargar */}
            <button
              type="button"
              onClick={reloadAllAttendance}
              disabled={loading}
              title="Sincronizar con Firestore"
              className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Exportar a CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar aprendiz por nombre o documento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              Filtrar:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-[#00324D] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({apprentices.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('at_risk')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'at_risk'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                En riesgo ({fichaKpis.atRiskCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('with_absences')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'with_absences'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                Con fallas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('with_excuses')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'with_excuses'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-blue-800 hover:bg-blue-50'
                }`}
              >
                Con excusa
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('perfect')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'perfect'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                100% Asist.
              </button>
            </div>
          </div>
        </div>

        {/* 1. LEYENDA DE CONVENCIONES OFICIALES SENA (ACTUALIZADA) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-700 font-medium border-t border-slate-100">
          <span className="font-bold text-slate-900">Convenciones:</span>

          {/* P: Presente */}
          <span className="inline-flex items-center gap-1.5" title="Presente">
            <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px] flex items-center justify-center border border-emerald-300">
              P
            </span>
            <span className="font-semibold text-slate-800">P:</span>
            <span>Presente.</span>
          </span>

          {/* F: Falla / Inasistencia sin excusa */}
          <span className="inline-flex items-center gap-1.5" title="Falla / Inasistencia sin excusa">
            <span className="w-5 h-5 rounded bg-rose-100 text-rose-800 font-extrabold text-[10px] flex items-center justify-center border border-rose-300">
              F
            </span>
            <span className="font-semibold text-slate-800">F:</span>
            <span>Falla / Inasistencia sin excusa.</span>
          </span>

          {/* J: No asistió con excusa */}
          <span className="inline-flex items-center gap-1.5 bg-blue-50/70 px-1.5 py-0.5 rounded-md border border-blue-200" title="No asistió con excusa (Ausencia justificada)">
            <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 font-extrabold text-[10px] flex items-center justify-center border border-blue-300">
              J
            </span>
            <span className="font-bold text-blue-900">J:</span>
            <span className="font-semibold text-blue-900">No asistió con excusa.</span>
          </span>

          {/* T: Llegó tarde */}
          <span className="inline-flex items-center gap-1.5" title="Llegó tarde (Tardanza sin excusa)">
            <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 font-extrabold text-[10px] flex items-center justify-center border border-amber-300">
              T
            </span>
            <span className="font-semibold text-slate-800">T:</span>
            <span>Llegó tarde.</span>
          </span>

          {/* T/J: Llegó tarde con excusa */}
          <span className="inline-flex items-center gap-1.5 bg-purple-50/70 px-1.5 py-0.5 rounded-md border border-purple-200" title="Llegó tarde con excusa (Tardanza justificada)">
            <span className="min-w-6 h-5 px-1 rounded bg-purple-100 text-purple-800 font-extrabold text-[9px] flex items-center justify-center border border-purple-300">
              T/J
            </span>
            <span className="font-bold text-purple-900">T/J:</span>
            <span className="font-semibold text-purple-900">Llegó tarde con excusa.</span>
          </span>

          {/* —: Sin registrar */}
          <span className="inline-flex items-center gap-1.5" title="Sin registrar">
            <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 font-bold text-[10px] flex items-center justify-center border border-slate-200">
              —
            </span>
            <span className="font-semibold text-slate-500">—:</span>
            <span className="text-slate-500">Sin registrar.</span>
          </span>

          <span className="inline-flex items-center gap-1 text-slate-400 ml-auto sm:ml-0 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            <span>Punto azul = tiene observación pedagógica</span>
          </span>
        </div>
      </div>

      {/* 4. Tabla Matricial */}
      {apprentices.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
          <User className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">No hay aprendices matriculados</h4>
          <p className="text-xs text-slate-500">
            Esta ficha aún no cuenta con aprendices vinculados en /enrollments.
          </p>
        </div>
      ) : uniqueSessionDates.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="max-w-md mx-auto">
            <h4 className="text-sm font-bold text-slate-800">
              Aún no hay sesiones de asistencia registradas para la Ficha #{ficha.number}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Comienza registrando la primera sesión de clase para habilitar la planilla matricial.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewSessionDate(todayStr);
              setNewSessionModalOpen(true);
            }}
            className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Asistencia de Hoy</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#00324D] text-white select-none sticky top-0 z-20 shadow-xs">
                  {/* Columna Sticky: Aprendiz */}
                  <th className="p-3 font-bold sticky left-0 z-30 bg-[#00324D] min-w-[240px] max-w-[280px] border-r border-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Aprendiz ({filteredApprentices.length})</span>
                      <span className="text-[10px] text-slate-300 font-mono font-normal">CC / TI</span>
                    </div>
                  </th>

                  {/* Columnas Dinámicas: Fechas de Sesión */}
                  {uniqueSessionDates.map((dateStr) => {
                    const formatted = formatColumnDate(dateStr);
                    return (
                      <th
                        key={dateStr}
                        className="p-2.5 font-bold text-center border-r border-slate-700/80 min-w-[76px] whitespace-nowrap group hover:bg-[#00283E] transition-colors"
                        title={formatted.full}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-white">{formatted.short}</span>
                          <span className="text-[9px] text-slate-300 font-normal">
                            {dateStr.split('-')[0]}
                          </span>

                          {/* Acciones de la columna en hover / dropdown */}
                          <div className="flex items-center gap-1 mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleMarkAllColumn(dateStr, 'PRESENTE')}
                              title="Marcar todos Presentes (P)"
                              className="p-1 hover:bg-emerald-600/40 rounded text-[9px] text-emerald-300 hover:text-white cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSessionToDelete(dateStr)}
                              title="Eliminar esta sesión"
                              className="p-1 hover:bg-rose-600/40 rounded text-[9px] text-rose-300 hover:text-white cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  {/* Columnas de Resumen Oficiales */}
                  <th className="p-2.5 font-bold text-center bg-[#00273c] min-w-[38px] border-r border-slate-700/80" title="Presentes (P)">
                    P
                  </th>
                  <th className="p-2.5 font-bold text-center bg-[#00273c] min-w-[38px] border-r border-slate-700/80 text-rose-300" title="Falla / Inasistencia sin excusa (F)">
                    F
                  </th>
                  <th className="p-2.5 font-bold text-center bg-[#00273c] min-w-[38px] border-r border-slate-700/80 text-blue-300" title="No asistió con excusa (J)">
                    J
                  </th>
                  <th className="p-2.5 font-bold text-center bg-[#00273c] min-w-[38px] border-r border-slate-700/80 text-amber-300" title="Llegó tarde (T)">
                    T
                  </th>
                  <th className="p-2.5 font-bold text-center bg-[#00273c] min-w-[42px] border-r border-slate-700/80 text-purple-300" title="Llegó tarde con excusa (T/J)">
                    T/J
                  </th>
                  <th className="p-2.5 font-bold text-center bg-[#00273c] min-w-[70px] border-r border-slate-700/80" title="Porcentaje de Asistencia Efectiva">
                    % Asist.
                  </th>
                  <th className="p-2.5 font-bold text-center bg-[#00273c] min-w-[90px]" title="Acciones y alertas">
                    Situación
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredApprentices.map((app) => {
                  const st = learnerStats[app.uid] || {
                    present: 0,
                    absent: 0,
                    excusedAbsent: 0,
                    late: 0,
                    lateExcused: 0,
                    totalRecorded: 0,
                    rate: 100,
                    isAtRisk: false,
                  };

                  return (
                    <tr
                      key={app.uid}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        st.isAtRisk ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Columna Sticky: Aprendiz */}
                      <td className="p-3 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-[#00324D] font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                            {app.photoURL ? (
                              <img
                                src={app.photoURL}
                                alt={app.displayName}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              app.displayName.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setProfileModalApprentice(app)}
                                className="font-bold text-slate-900 hover:text-[#39A900] truncate text-left cursor-pointer transition-colors"
                                title={`Ver expediente de ${app.displayName}`}
                              >
                                {app.displayName}
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                              <span>CC {app.documentNumber !== 'No registrado' ? app.documentNumber : '—'}</span>
                              {st.isAtRisk && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold font-sans">
                                  3+ Fallas sin excusa
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Celdas de Fecha de Sesión */}
                      {uniqueSessionDates.map((dateStr) => {
                        const cellKey = `${app.uid}_${dateStr}`;
                        const rec = attendanceMap.get(cellKey);
                        const status = normalizeStatus(rec?.status);
                        const isSaving = savingKey === cellKey;
                        const hasObservation = Boolean(rec?.observation && rec.observation.trim().length > 0);

                        return (
                          <td
                            key={dateStr}
                            className="p-2 text-center border-r border-slate-100/90 align-middle"
                          >
                            <div className="inline-flex items-center justify-center relative group/cell">
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCellSelector({ apprentice: app, date: dateStr });
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCellDetail(app, dateStr);
                                }}
                                className="cursor-pointer transition-transform active:scale-95 focus:outline-none"
                                title={`Sesión ${dateStr} - ${app.displayName}\nEstado: ${
                                  status !== '-' ? statusLabels[status] : 'Sin registrar'
                                }\n${
                                  hasObservation ? `Obs: ${rec?.observation}\n` : ''
                                }Clic: Seleccionar estado (P, F, J, T, T/J, —) | Doble clic: Detalle y observación`}
                              >
                                {isSaving ? (
                                  <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                                  </span>
                                ) : (
                                  renderStatusCellBadge(status, hasObservation)
                                )}
                              </button>

                              {/* Botón flotante para editar observación al hacer hover */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCellDetail(app, dateStr);
                                }}
                                title="Editar hora y observación pedagógica"
                                className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-white border border-slate-300 text-slate-600 shadow-2xs opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center hover:bg-slate-50 cursor-pointer"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Totales y Métricas por Aprendiz */}
                      <td className="p-2.5 text-center font-bold text-slate-700 bg-slate-50/50 border-r border-slate-100" title="Presentes">
                        {st.present}
                      </td>
                      <td
                        className={`p-2.5 text-center font-bold border-r border-slate-100 ${
                          st.absent > 0 ? 'text-rose-700 bg-rose-50/40' : 'text-slate-500'
                        }`}
                        title="Ausencias sin excusa"
                      >
                        {st.absent}
                      </td>
                      <td
                        className={`p-2.5 text-center font-bold border-r border-slate-100 ${
                          st.excusedAbsent > 0 ? 'text-blue-700 bg-blue-50/40' : 'text-slate-500'
                        }`}
                        title="No asistió con excusa"
                      >
                        {st.excusedAbsent}
                      </td>
                      <td
                        className={`p-2.5 text-center font-bold border-r border-slate-100 ${
                          st.late > 0 ? 'text-amber-700 bg-amber-50/40' : 'text-slate-500'
                        }`}
                        title="Llegó tarde"
                      >
                        {st.late}
                      </td>
                      <td
                        className={`p-2.5 text-center font-bold border-r border-slate-100 ${
                          st.lateExcused > 0 ? 'text-purple-700 bg-purple-50/40' : 'text-slate-500'
                        }`}
                        title="Llegó tarde con excusa"
                      >
                        {st.lateExcused}
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-100">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                            st.rate >= 85
                              ? 'bg-emerald-100 text-emerald-800'
                              : st.rate >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                          title={`Asistencia calculada: ${st.rate}% (Las ausencias con excusa no suman asistencia efectiva)`}
                        >
                          {st.rate}%
                        </span>
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {st.isAtRisk ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApprenticeForCall(app);
                              setAttentionCallModalOpen(true);
                            }}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 mx-auto shadow-2xs"
                            title="3 o más fallas sin excusa detectadas: Radicar llamado de atención formal SENA"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Llamado</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            Al día
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal: Nueva Sesión de Asistencia */}
      <Modal
        isOpen={newSessionModalOpen}
        onClose={() => setNewSessionModalOpen(false)}
        title="Crear Nueva Sesión de Asistencia"
        subtitle={`Ficha #${ficha.number} — ${ficha.programName || ficha.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateSession} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Fecha de la Sesión formativa *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-white font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Se creará una nueva columna en la planilla para esta fecha.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Carga inicial de aprendices
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="preset"
                  checked={newSessionPreset === 'PRESENTE'}
                  onChange={() => setNewSessionPreset('PRESENTE')}
                  className="text-[#39A900] focus:ring-[#39A900]"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Pre-llenar todos como Presentes (P)
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Recomendado para clases ordinarias (solo cambiarás a quienes falten o lleguen tarde).
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="preset"
                  checked={newSessionPreset === 'NONE'}
                  onChange={() => setNewSessionPreset('NONE')}
                  className="text-[#39A900] focus:ring-[#39A900]"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Sin registros previos (—)
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Tomar asistencia uno a uno manualmente.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setNewSessionModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreatingSession}
              className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isCreatingSession ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creando sesión...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Crear Sesión</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Modal: Detalle y Modificación de Celda con los 5 Estados Oficiales */}
      <Modal
        isOpen={cellModalOpen}
        onClose={() => {
          setCellModalOpen(false);
          setEditingCell(null);
        }}
        title="Registro Individual de Asistencia"
        subtitle={
          editingCell
            ? `${editingCell.apprentice.displayName} — Sesión ${editingCell.date}`
            : ''
        }
        maxWidth="md"
      >
        {editingCell && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Estado de Asistencia *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1. Asistió (Presente - P) */}
                <button
                  type="button"
                  onClick={() => setEditingCell((p) => p && { ...p, status: 'PRESENTE' })}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    editingCell.status === 'PRESENTE'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                      : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center font-extrabold text-[10px]">
                      P
                    </span>
                    <div className="text-left">
                      <div className="font-bold">Asistió</div>
                      <div className={`text-[10px] font-normal ${editingCell.status === 'PRESENTE' ? 'text-emerald-100' : 'text-emerald-600'}`}>
                        Presente
                      </div>
                    </div>
                  </div>
                  <Check className="w-4 h-4 shrink-0" />
                </button>

                {/* 2. No asistió (Falla sin excusa - F) */}
                <button
                  type="button"
                  onClick={() => setEditingCell((p) => p && { ...p, status: 'AUSENTE' })}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    editingCell.status === 'AUSENTE'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-300'
                      : 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-rose-500 text-white flex items-center justify-center font-extrabold text-[10px]">
                      F
                    </span>
                    <div className="text-left">
                      <div className="font-bold">No asistió</div>
                      <div className={`text-[10px] font-normal ${editingCell.status === 'AUSENTE' ? 'text-rose-100' : 'text-rose-600'}`}>
                        Falla sin excusa
                      </div>
                    </div>
                  </div>
                  <X className="w-4 h-4 shrink-0" />
                </button>

                {/* 3. No asistió con excusa (Ausencia justificada - J) */}
                <button
                  type="button"
                  onClick={() => setEditingCell((p) => p && { ...p, status: 'EXCUSADO' })}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    editingCell.status === 'EXCUSADO'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-300'
                      : 'bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-blue-500 text-white flex items-center justify-center font-extrabold text-[10px]">
                      J
                    </span>
                    <div className="text-left">
                      <div className="font-bold">No asistió con excusa</div>
                      <div className={`text-[10px] font-normal ${editingCell.status === 'EXCUSADO' ? 'text-blue-100' : 'text-blue-600'}`}>
                        Ausencia justificada
                      </div>
                    </div>
                  </div>
                  <FileCheck2 className="w-4 h-4 shrink-0" />
                </button>

                {/* 4. Llegó tarde (Tardanza sin excusa - T) */}
                <button
                  type="button"
                  onClick={() => setEditingCell((p) => p && { ...p, status: 'TARDE' })}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    editingCell.status === 'TARDE'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-300'
                      : 'bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-amber-500 text-white flex items-center justify-center font-extrabold text-[10px]">
                      T
                    </span>
                    <div className="text-left">
                      <div className="font-bold">Llegó tarde</div>
                      <div className={`text-[10px] font-normal ${editingCell.status === 'TARDE' ? 'text-amber-100' : 'text-amber-600'}`}>
                        Tardanza sin excusa
                      </div>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 shrink-0" />
                </button>

                {/* 5. Llegó tarde con excusa (Tardanza justificada - T/J) */}
                <button
                  type="button"
                  onClick={() => setEditingCell((p) => p && { ...p, status: 'TARDE_EXCUSADO' })}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer sm:col-span-2 ${
                    editingCell.status === 'TARDE_EXCUSADO'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-300'
                      : 'bg-purple-50/70 text-purple-800 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-6 h-5 px-1 rounded bg-purple-500 text-white flex items-center justify-center font-extrabold text-[9px]">
                      T/J
                    </span>
                    <div className="text-left">
                      <div className="font-bold">Llegó tarde con excusa</div>
                      <div className={`text-[10px] font-normal ${editingCell.status === 'TARDE_EXCUSADO' ? 'text-purple-100' : 'text-purple-600'}`}>
                        Tardanza con justificación médica, laboral o de transporte
                      </div>
                    </div>
                  </div>
                  <Check className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hora de llegada (Opcional)
              </label>
              <input
                type="time"
                value={editingCell.arrivalTime}
                onChange={(e) =>
                  setEditingCell((p) => p && { ...p, arrivalTime: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observación Pedagógica / Motivo de la Excusa
              </label>
              <textarea
                rows={3}
                placeholder="Ejemplo: Justificación radicada con incapacidad médica EPS, permiso laboral formal, calamidad doméstica..."
                value={editingCell.observation}
                onChange={(e) =>
                  setEditingCell((p) => p && { ...p, observation: e.target.value })
                }
                className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-white resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Esta observación quedará guardada en el historial del aprendiz en Firestore.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCellModalOpen(false);
                  setEditingCell(null);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={isSavingCell}
                onClick={handleSaveCellDetail}
                className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingCell ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Registro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 7. Modal Confirmación de Eliminación de Sesión */}
      <Modal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        title="¿Eliminar Sesión de Asistencia?"
        subtitle={sessionToDelete ? `Sesión del ${sessionToDelete}` : ''}
        maxWidth="sm"
      >
        <div className="space-y-3 pt-2 text-xs text-slate-600">
          <p>
            Esta acción eliminará todos los registros de asistencia correspondientes al{' '}
            <strong className="text-slate-900">{sessionToDelete}</strong> para la ficha #{ficha.number}.
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
            ⚠️ Los registros se borrarán permanentemente de Cloud Firestore.
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeletingSession}
              onClick={() => setSessionToDelete(null)}
              className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeletingSession}
              onClick={handleConfirmDeleteSession}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isDeletingSession ? 'Eliminando...' : 'Sí, Eliminar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 8. Modal Expediente Académico del Aprendiz */}
      {profileModalApprentice && (
        <ApprenticeAcademicProfileModal
          apprentice={profileModalApprentice}
          onClose={() => setProfileModalApprentice(null)}
        />
      )}

      {/* 9. Modal Radicar Llamado de Atención por Inasistencia */}
      {attentionCallModalOpen && selectedApprenticeForCall && (
        <EditAttentionCallModal
          isOpen={attentionCallModalOpen}
          onClose={() => {
            setAttentionCallModalOpen(false);
            setSelectedApprenticeForCall(null);
          }}
          onConfirm={async (data) => {
            try {
              await trackingService.createAttentionCall({
                id: `call_abs_${Date.now()}`,
                userId: selectedApprenticeForCall.uid,
                learnerId: selectedApprenticeForCall.uid,
                learnerName: selectedApprenticeForCall.displayName,
                learnerDocument: selectedApprenticeForCall.documentNumber,
                fichaId: ficha.id,
                fichaNumber: ficha.number,
                programName: ficha.programName || ficha.name,
                type: 'absence',
                reason: data.reason || 'Acumulación de inasistencias injustificadas (Reglamento SENA)',
                normativeArticle:
                  data.normativeArticle ||
                  'Capítulo IV, Artículo 9 del Reglamento del Aprendiz SENA: Incumplimiento reiterado de las actividades de aprendizaje presenciales o virtuales sin causa justificada comprobada.',
                improvementPlan:
                  data.improvementPlan ||
                  'El aprendiz debe justificar sus fallas o presentarse a comité de evaluación académica.',
                description:
                  data.description ||
                  `Acumulación de inasistencias injustificadas en la ficha #${ficha.number}`,
                status: 'issued',
                place: 'Ambiente de Formación SENA',
                date: todayStr,
                time: '12:00',
                createdBy: instructorUid,
                instructorName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              showToast(`Llamado de atención radicado para ${selectedApprenticeForCall.displayName}`);
              setAttentionCallModalOpen(false);
              setSelectedApprenticeForCall(null);
            } catch (err) {
              console.warn('[FichaAsistenciaPlanilla] Error radicando llamado:', err);
              showToast('Error radicando llamado de atención');
            }
          }}
          initialData={{
            learnerName: selectedApprenticeForCall.displayName,
            learnerDocument: selectedApprenticeForCall.documentNumber,
            fichaNumber: ficha.number,
            programName: ficha.programName || ficha.name,
            reason: `Acumulación de ${learnerStats[selectedApprenticeForCall.uid]?.absent || 3} inasistencias injustificadas en la ficha #${ficha.number}`,
            type: 'absence',
            date: todayStr,
          }}
          title="Radicar Llamado de Atención por Inasistencias (Reglamento SENA)"
        />
      )}

      {/* 10. Modal Selector Rápido de Estado de Asistencia (6 Opciones Oficiales SENA) */}
      <Modal
        isOpen={Boolean(cellSelector)}
        onClose={() => setCellSelector(null)}
        title="Registrar / Modificar Asistencia"
        subtitle={
          cellSelector
            ? `${cellSelector.apprentice.displayName} • Sesión ${formatColumnDate(cellSelector.date).full}`
            : ''
        }
        maxWidth="md"
      >
        {cellSelector && (() => {
          const cellKey = `${cellSelector.apprentice.uid}_${cellSelector.date}`;
          const currentRec = attendanceMap.get(cellKey);
          const currentStatus = normalizeStatus(currentRec?.status);
          const isSaving = savingKey === cellKey;

          return (
            <div className="space-y-4 pt-1">
              {/* Información del aprendiz y estado actual */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#00324D] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {cellSelector.apprentice.photoURL ? (
                      <img
                        src={cellSelector.apprentice.photoURL}
                        alt={cellSelector.apprentice.displayName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      cellSelector.apprentice.displayName.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      {cellSelector.apprentice.displayName}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      CC/TI: {cellSelector.apprentice.documentNumber} • Ficha #{ficha.number}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Estado actual</span>
                  <div className="mt-0.5 inline-flex items-center gap-1">
                    {renderStatusCellBadge(currentStatus, Boolean(currentRec?.observation))}
                    <span className="text-xs font-bold text-slate-700 ml-1">
                      {currentStatus !== '-' ? statusLabels[currentStatus] : 'Sin registrar'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de selección de los 6 estados oficiales */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Selecciona el estado para esta sesión:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* 1. Presente (P) */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSelectStatus(cellSelector.apprentice, cellSelector.date, 'PRESENTE')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentStatus === 'PRESENTE'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300'
                        : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center border border-emerald-300 shrink-0">
                        P
                      </span>
                      <div>
                        <div className="font-bold text-xs">Asistió</div>
                        <div className={`text-[10px] ${currentStatus === 'PRESENTE' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                          Presente a tiempo
                        </div>
                      </div>
                    </div>
                    {isSavingSelectorOption === 'PRESENTE' ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : currentStatus === 'PRESENTE' ? (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    ) : null}
                  </button>

                  {/* 2. No asistió (F) */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSelectStatus(cellSelector.apprentice, cellSelector.date, 'AUSENTE')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentStatus === 'AUSENTE'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-300'
                        : 'bg-rose-50/70 hover:bg-rose-100 text-rose-950 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center border border-rose-300 shrink-0">
                        F
                      </span>
                      <div>
                        <div className="font-bold text-xs">No asistió</div>
                        <div className={`text-[10px] ${currentStatus === 'AUSENTE' ? 'text-rose-100' : 'text-rose-700'}`}>
                          Falla sin excusa
                        </div>
                      </div>
                    </div>
                    {isSavingSelectorOption === 'AUSENTE' ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : currentStatus === 'AUSENTE' ? (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    ) : null}
                  </button>

                  {/* 3. No asistió con excusa (J) */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSelectStatus(cellSelector.apprentice, cellSelector.date, 'EXCUSADO')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentStatus === 'EXCUSADO'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-300'
                        : 'bg-blue-50/70 hover:bg-blue-100 text-blue-950 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center border border-blue-300 shrink-0">
                        J
                      </span>
                      <div>
                        <div className="font-bold text-xs">No asistió con excusa</div>
                        <div className={`text-[10px] ${currentStatus === 'EXCUSADO' ? 'text-blue-100' : 'text-blue-700'}`}>
                          Ausencia justificada
                        </div>
                      </div>
                    </div>
                    {isSavingSelectorOption === 'EXCUSADO' ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : currentStatus === 'EXCUSADO' ? (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    ) : null}
                  </button>

                  {/* 4. Llegó tarde (T) */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSelectStatus(cellSelector.apprentice, cellSelector.date, 'TARDE')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentStatus === 'TARDE'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-300'
                        : 'bg-amber-50/70 hover:bg-amber-100 text-amber-950 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center border border-amber-300 shrink-0">
                        T
                      </span>
                      <div>
                        <div className="font-bold text-xs">Llegó tarde</div>
                        <div className={`text-[10px] ${currentStatus === 'TARDE' ? 'text-amber-100' : 'text-amber-700'}`}>
                          Tardanza sin excusa
                        </div>
                      </div>
                    </div>
                    {isSavingSelectorOption === 'TARDE' ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : currentStatus === 'TARDE' ? (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    ) : null}
                  </button>

                  {/* 5. Llegó tarde con excusa (T/J) */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSelectStatus(cellSelector.apprentice, cellSelector.date, 'TARDE_EXCUSADO')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentStatus === 'TARDE_EXCUSADO'
                        ? 'bg-purple-600 text-white border-purple-700 shadow-sm ring-2 ring-purple-300'
                        : 'bg-purple-50/70 hover:bg-purple-100 text-purple-950 border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="min-w-7 h-7 px-1 rounded-lg bg-purple-500 text-white font-extrabold text-[10px] flex items-center justify-center border border-purple-300 shrink-0">
                        T/J
                      </span>
                      <div>
                        <div className="font-bold text-xs">Llegó tarde con excusa</div>
                        <div className={`text-[10px] ${currentStatus === 'TARDE_EXCUSADO' ? 'text-purple-100' : 'text-purple-700'}`}>
                          Tardanza justificada
                        </div>
                      </div>
                    </div>
                    {isSavingSelectorOption === 'TARDE_EXCUSADO' ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : currentStatus === 'TARDE_EXCUSADO' ? (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    ) : null}
                  </button>

                  {/* 6. Sin registrar (—) */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSelectStatus(cellSelector.apprentice, cellSelector.date, '-')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      currentStatus === '-'
                        ? 'bg-slate-700 text-white border-slate-800 shadow-sm ring-2 ring-slate-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center border border-slate-300 shrink-0">
                        —
                      </span>
                      <div>
                        <div className="font-bold text-xs">Sin registrar</div>
                        <div className={`text-[10px] ${currentStatus === '-' ? 'text-slate-300' : 'text-slate-500'}`}>
                          Limpiar / Borrar registro
                        </div>
                      </div>
                    </div>
                    {isSavingSelectorOption === '-' ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : currentStatus === '-' ? (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Acciones adicionales: Observación pedagógica */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const target = cellSelector;
                    setCellSelector(null);
                    handleOpenCellDetail(target.apprentice, target.date);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer py-1 px-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Agregar observación u hora de llegada...</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCellSelector(null)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
