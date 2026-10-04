/**
 * @license
 * SENA Learning Hub - Perfil y Expediente Académico Digital del Aprendiz
 * PROMPT 17: Módulo 100% Real conectado a Firebase Firestore
 * Colecciones: /users, /enrollments, /fichas, /trainingPrograms, /courses,
 * /competencies, /learningOutcomes, /activities, /submissions, /attendance,
 * /attentionCalls, /academicRestrictions, /justifications, /learnerRecords,
 * /gamificationProfiles, /userBadges, /achievements.
 *
 * Sin datos ficticios, sin duplicar sistemas, respetando RBAC y privacidad.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  BookOpen,
  Edit3,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Layers,
  Target,
  FileText,
  BarChart3,
  RefreshCw,
  Printer,
  CalendarCheck,
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  HardDrive,
  Trophy,
  Medal,
  Sparkles,
  Users,
  GraduationCap,
  Info,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { academicRecordService } from '../../services/academic/academicRecordService';
import { ApprenticeAcademicExpediente } from '../../types/academic';

export const ApprenticeProfileView: React.FC = () => {
  const { userProfile, currentUser, updateProfile } = useAuth();
  const learnerId = currentUser?.uid || userProfile?.uid || '';

  // Pestañas principales
  const [activeTab, setActiveTab] = useState<
    'summary' | 'curriculum' | 'evidences' | 'attendance' | 'gamification' | 'institutional'
  >('summary');

  // Expediente digital
  const [expediente, setExpediente] = useState<ApprenticeAcademicExpediente | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados del modal de edición de datos de contacto
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(userProfile?.displayName || '');
  const [editPhone, setEditPhone] = useState(userProfile?.phone || '');
  const [editDoc, setEditDoc] = useState(userProfile?.documentNumber || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Filtro de evidencias
  const [evidenceFilter, setEvidenceFilter] = useState<
    'all' | 'approved' | 'correction_required' | 'not_approved' | 'submitted' | 'pending'
  >('all');

  // Cargar expediente digital real
  const loadExpediente = async () => {
    if (!learnerId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await academicRecordService.getApprenticeExpediente(learnerId);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setExpediente(res.data);
      }
    } catch (err: any) {
      console.error('[ApprenticeProfileView] Error:', err);
      setErrorMsg(err.message || 'Error al cargar el expediente académico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpediente();
  }, [learnerId]);

  // Manejar edición de contacto
  const handleOpenEdit = () => {
    setEditName(userProfile?.displayName || expediente?.personalInfo.displayName || '');
    setEditPhone(userProfile?.phone || expediente?.personalInfo.phone || '');
    setEditDoc(userProfile?.documentNumber || expediente?.personalInfo.documentNumber || '');
    setEditError(null);
    setUpdateSuccess(false);
    setIsEditModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setEditError(null);

    try {
      await updateProfile({
        displayName: editName.trim(),
        phone: editPhone.trim(),
        documentNumber: editDoc.trim(),
      });
      setUpdateSuccess(true);
      await loadExpediente();
      setTimeout(() => {
        setIsEditModalOpen(false);
        setUpdateSuccess(false);
      }, 900);
    } catch (err: any) {
      setEditError(err.message || 'No se pudo actualizar los datos de contacto.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtrar evidencias
  const filteredEvidences = useMemo(() => {
    if (!expediente) return [];
    if (evidenceFilter === 'all') return expediente.evidences;
    return expediente.evidences.filter((item) => item.status === evidenceFilter);
  }, [expediente, evidenceFilter]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto">
        <RefreshCw className="w-8 h-8 animate-spin text-[#39A900] mx-auto" />
        <h2 className="text-sm font-bold text-slate-800">Cargando Expediente Académico Digital...</h2>
        <p className="text-xs text-slate-500">
          Sincronizando información curricular, evidencias y asistencia desde Firestore
        </p>
      </div>
    );
  }

  if (errorMsg || !expediente) {
    return (
      <div className="py-16 text-center space-y-4 bg-white rounded-2xl border border-rose-200 p-8 max-w-xl mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <div>
          <h2 className="text-base font-bold text-slate-900">No se pudo cargar el expediente</h2>
          <p className="text-xs text-rose-600 mt-1">{errorMsg || 'Expediente no encontrado.'}</p>
        </div>
        <button
          onClick={loadExpediente}
          className="px-4 py-2 bg-[#00324D] hover:bg-[#004A73] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      </div>
    );
  }

  const { personalInfo, academicInfo, summary, curricularProgress, attendances, justifications, attentionCalls, badges, achievements } =
    expediente;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150 pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* ========================================================================= */}
      {/* 1. ENCABEZADO Y CARNET INSTITUCIONAL DIGITAL */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        {/* Barra Superior con Identidad SENA */}
        <div className="bg-[#00324D] text-white p-6 border-b-4 border-[#39A900] flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <img
              src={personalInfo.photoURL}
              alt={personalInfo.displayName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-[#39A900] shadow-md shrink-0 bg-slate-800"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-wider bg-[#39A900] px-2 py-0.5 rounded text-white shadow-xs">
                  Aprendiz SENA
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-200 px-2 py-0.5 rounded font-mono">
                  Ficha #{academicInfo.fichaNumber}
                </span>
                {summary.activeRestrictionsCount > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Restricción Activa
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-white mt-1.5">
                {personalInfo.displayName}
              </h1>

              <div className="text-xs text-slate-300 flex items-center gap-3 flex-wrap mt-0.5">
                <span className="font-mono">
                  {personalInfo.documentNumber && personalInfo.documentNumber !== 'Información no disponible'
                    ? `${personalInfo.documentType || 'CC'} ${personalInfo.documentNumber}`
                    : 'Documento no registrado'}
                </span>
                <span>•</span>
                <span className="truncate max-w-xs">{personalInfo.email}</span>
                <span>•</span>
                <span>{academicInfo.programName}</span>
              </div>
            </div>
          </div>

          {/* Acciones de la Cabecera */}
          <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Imprimir o guardar como PDF"
              >
                <Printer className="w-3.5 h-3.5 text-[#8CE665]" />
                <span className="hidden sm:inline">Imprimir Expediente</span>
              </button>
              <button
                onClick={handleOpenEdit}
                className="px-3 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Contacto</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-300 font-mono self-start md:self-end">
              Matrícula: {academicInfo.enrollmentStatus}
            </span>
          </div>
        </div>

        {/* Barra de Datos Clave Académicos */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 text-[11px] block font-medium">Centro de Formación:</span>
            <span className="font-bold text-slate-800 truncate block" title={academicInfo.centerName}>
              {academicInfo.centerName}
            </span>
            <span className="text-[10px] text-slate-500">{academicInfo.regional}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block font-medium">Jornada & Vinculación:</span>
            <span className="font-bold text-slate-800 block">Jornada {academicInfo.jornada}</span>
            <span className="text-[10px] text-slate-500">
              {academicInfo.enrollmentDate ? `Inicio: ${new Date(academicInfo.enrollmentDate).toLocaleDateString()}` : 'Información no disponible'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block font-medium">Curso Actual:</span>
            <span className="font-bold text-slate-800 truncate block" title={academicInfo.currentCourse}>
              {academicInfo.currentCourse}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block font-medium">Instructor(es) Asignado(s):</span>
            {academicInfo.assignedInstructors.length > 0 ? (
              <span className="font-bold text-slate-800 truncate block" title={academicInfo.assignedInstructors.map(i => i.displayName).join(', ')}>
                {academicInfo.assignedInstructors[0].displayName}
                {academicInfo.assignedInstructors.length > 1 && ` (+${academicInfo.assignedInstructors.length - 1})`}
              </span>
            ) : (
              <span className="text-slate-400 italic">Información no disponible</span>
            )}
          </div>
        </div>

        {/* Pestañas de Navegación del Expediente */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 overflow-x-auto text-xs font-bold bg-white select-none print:hidden">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'summary'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>📊 Resumen Académico</span>
          </button>

          <button
            onClick={() => setActiveTab('curriculum')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'curriculum'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>📚 Progreso Curricular</span>
          </button>

          <button
            onClick={() => setActiveTab('evidences')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'evidences'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>📝 Estado de Evidencias</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'evidences' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {summary.submittedEvidencesCount}/{summary.assignedActivitiesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>📅 Asistencia & Seguimiento</span>
          </button>

          <button
            onClick={() => setActiveTab('gamification')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'gamification'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>🏆 Gamificación & Logros</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'gamification' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              Nvl {summary.gamificationLevel}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('institutional')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === 'institutional'
                ? 'bg-[#00324D] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>🏛️ Matrícula & Ficha</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA */}
      {/* ========================================================================= */}

      {/* PESTAÑA 1: RESUMEN ACADÉMICO REAL (PROMPT 17 - REQUISITO 4) */}
      {(activeTab === 'summary' || window.matchMedia?.('print')?.matches) && (
        <div className="space-y-5">
          {/* Alerta de Restricción si existe */}
          {summary.activeRestrictionsCount > 0 && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-xs text-rose-900 flex items-start gap-3 shadow-xs">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-sm font-bold text-rose-900 block">
                  Restricción Académica Activa ({summary.activeRestrictionsCount})
                </strong>
                <p className="text-rose-700">
                  El aprendiz registra restricciones académicas o disciplinarias vigentes en la plataforma.
                </p>
                <div className="pt-1 flex flex-wrap gap-2">
                  {summary.activeRestrictions.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 bg-white border border-rose-300 px-2 py-0.5 rounded font-medium text-[11px] text-rose-800"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      {r.type}: {r.reason || 'Sin motivo detallado'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cuadrícula de Métricas Principales */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#39A900]" />
                  Resumen Académico Cuantitativo
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidación de evidencias, asistencia, cumplimiento curricular e indicadores internos
                </p>
              </div>

              {/* Indicador de % de Cumplimiento Interno */}
              <div className="flex items-center gap-3 bg-[#EBF8E7] px-4 py-2.5 rounded-xl border border-[#39A900]/30 shadow-xs">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#2E8500] uppercase block">
                    Cumplimiento Interno
                  </span>
                  <span className="text-2xl font-black text-[#2E8500]">
                    {summary.complianceRate}%
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#39A900] text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Barra Visual de Cumplimiento de Evidencias */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Estado de Evidencias Evaluadas:</span>
                <span>
                  {summary.approvedEvidencesCount} Aprobadas · {summary.correctionEvidencesCount} Por Corregir · {summary.notApprovedEvidencesCount} No Aprobadas
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex shadow-inner">
                <div
                  className="bg-[#39A900] h-full transition-all duration-300"
                  style={{
                    width: `${
                      summary.approvedEvidencesCount + summary.correctionEvidencesCount + summary.notApprovedEvidencesCount > 0
                        ? (summary.approvedEvidencesCount /
                            (summary.approvedEvidencesCount + summary.correctionEvidencesCount + summary.notApprovedEvidencesCount)) *
                          100
                        : 0
                    }%`,
                  }}
                  title="A · Aprobadas"
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{
                    width: `${
                      summary.approvedEvidencesCount + summary.correctionEvidencesCount + summary.notApprovedEvidencesCount > 0
                        ? (summary.correctionEvidencesCount /
                            (summary.approvedEvidencesCount + summary.correctionEvidencesCount + summary.notApprovedEvidencesCount)) *
                          100
                        : 0
                    }%`,
                  }}
                  title="C · Por Corregir"
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      summary.approvedEvidencesCount + summary.correctionEvidencesCount + summary.notApprovedEvidencesCount > 0
                        ? (summary.notApprovedEvidencesCount /
                            (summary.approvedEvidencesCount + summary.correctionEvidencesCount + summary.notApprovedEvidencesCount)) *
                          100
                        : 0
                    }%`,
                  }}
                  title="N · No Aprobadas"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>
                  * Indicador interno de plataforma: calculado sobre evidencias evaluadas (las pendientes no se contabilizan como aprobadas).
                </span>
                <span className="font-semibold text-slate-700">
                  {summary.completedActivitiesCount} de {summary.assignedActivitiesCount} actividades entregadas ({summary.submissionRate}%)
                </span>
              </div>
            </div>

            {/* Cuadrículas de Métricas 100% Reales */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block">Actividades Asignadas</span>
                <span className="text-xl font-black text-slate-800 mt-1 block">{summary.assignedActivitiesCount}</span>
                <span className="text-[10px] text-slate-400">Publicadas para la ficha</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block">Evidencias Entregadas</span>
                <span className="text-xl font-black text-[#00324D] mt-1 block">{summary.submittedEvidencesCount}</span>
                <span className="text-[10px] text-slate-400">{summary.completedActivitiesCount} actividades con entrega</span>
              </div>

              <div className="p-3.5 bg-[#EBF8E7] rounded-xl border border-[#39A900]/30 text-[#2E8500]">
                <span className="text-[11px] font-bold block">A · Aprobadas</span>
                <span className="text-xl font-black mt-1 block">{summary.approvedEvidencesCount}</span>
                <span className="text-[10px] text-emerald-700">Dictamen aprobatorio</span>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                <span className="text-[11px] font-bold block">C · Por Corregir</span>
                <span className="text-xl font-black mt-1 block">{summary.correctionEvidencesCount}</span>
                <span className="text-[10px] text-amber-700">Requiere reenvío</span>
              </div>

              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
                <span className="text-[11px] font-bold block">N · No Aprobadas</span>
                <span className="text-xl font-black mt-1 block">{summary.notApprovedEvidencesCount}</span>
                <span className="text-[10px] text-rose-700">No alcanzó criterios</span>
              </div>

              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900">
                <span className="text-[11px] font-bold block">En Revisión</span>
                <span className="text-xl font-black mt-1 block">{summary.pendingEvidencesCount}</span>
                <span className="text-[10px] text-blue-700">Pendiente calificar</span>
              </div>
            </div>

            {/* Segunda Fila de Métricas: Asistencia, Justificaciones y Gamificación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Tarjeta Asistencia */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-[#39A900]" />
                    <h3 className="text-xs font-bold text-slate-800">Asistencia & Puntualidad</h3>
                  </div>
                  <span className="text-xs font-black text-[#2E8500] font-mono">
                    {summary.attendanceRate}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Asistencias</span>
                    <strong className="text-emerald-700 font-bold">{summary.attendedSessions}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Inasistencias</span>
                    <strong className="text-rose-700 font-bold">{summary.absenceCount}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Llegadas Tarde</span>
                    <strong className="text-amber-700 font-bold">{summary.lateCount}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Total de sesiones registradas: {summary.totalAttendanceSessions}
                </p>
              </div>

              {/* Tarjeta Justificaciones & Restricciones */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-800">Justificaciones & Disciplinario</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-600">
                    {summary.approvedJustifications}/{summary.totalJustifications} Aprobadas
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Radicadas</span>
                    <strong className="text-slate-800 font-bold">{summary.totalJustifications}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Pendientes</span>
                    <strong className="text-amber-600 font-bold">{summary.pendingJustifications}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Llamados</span>
                    <strong className="text-rose-600 font-bold">{attentionCalls.length}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Restricciones activas: {summary.activeRestrictionsCount}
                </p>
              </div>

              {/* Tarjeta Gamificación */}
              <div className="p-4 bg-gradient-to-br from-slate-900 to-[#00324D] text-white rounded-xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-white">Gamificación SENA</h3>
                  </div>
                  <span className="text-xs font-bold text-amber-300">
                    Nivel {summary.gamificationLevel}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>{summary.levelTitle}</span>
                    <span className="font-mono font-bold text-white">{summary.experiencePoints} XP</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all"
                      style={{ width: `${summary.progressToNextLevel}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1 border-t border-white/10">
                  <span>Insignias: {summary.badgesCount}</span>
                  <span>Logros: {summary.achievementsCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: PROGRESO CURRICULAR JERÁRQUICO (PROMPT 17 - REQUISITO 5) */}
      {(activeTab === 'curriculum' || window.matchMedia?.('print')?.matches) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#39A900]" />
                Progreso Curricular Institucional
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Relación pedagógica: Programa → Ficha → Curso → Competencia → RAP → Actividades → Evidencias
              </p>
            </div>
            <div className="text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-700">
              {curricularProgress.length} Competencia(s) Registrada(s)
            </div>
          </div>

          {/* Relación Jerárquica Visual */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex items-center gap-2 text-slate-700 overflow-x-auto font-semibold">
            <span className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs shrink-0 font-bold text-[#00324D]">
              {academicInfo.programName}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs shrink-0 font-mono">
              Ficha {academicInfo.fichaNumber}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs shrink-0 text-[#2E8500]">
              {academicInfo.currentCourse}
            </span>
          </div>

          {/* Lista de Competencias */}
          <div className="space-y-4">
            {curricularProgress.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-6 text-center bg-slate-50 rounded-xl">
                No hay competencias asociadas a esta ficha o programa actualmente.
              </p>
            ) : (
              curricularProgress.map((item) => (
                <div
                  key={item.competency.id}
                  className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#00324D] text-white px-2 py-0.5 rounded font-mono">
                          {item.competency.code || 'COMPETENCIA'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase">
                          {item.competency.type || 'Transversal'}
                        </span>
                        {item.course && (
                          <span className="text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Curso: {item.course.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.competency.description || item.competency.name}
                      </h3>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {item.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cumplida
                        </span>
                      ) : item.status === 'in_progress' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <Clock className="w-3.5 h-3.5" /> En Proceso ({item.approvedCount}/{item.totalActivities})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resultados de Aprendizaje de esta Competencia */}
                  <div className="space-y-2.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Resultados de Aprendizaje Vinculados (RAP):
                    </span>

                    {item.learningOutcomes.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No hay resultados de aprendizaje indexados aún.</p>
                    ) : (
                      item.learningOutcomes.map((outItem) => (
                        <div
                          key={outItem.outcome.id}
                          className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="font-mono font-bold text-[#39A900] mr-2">
                                {outItem.outcome.code}:
                              </span>
                              <span className="text-slate-800 font-medium leading-relaxed">
                                {outItem.outcome.description}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                outItem.status === 'completed'
                                  ? 'bg-[#EBF8E7] text-[#2E8500]'
                                  : outItem.status === 'in_progress'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {outItem.status === 'completed'
                                ? 'Alcanzado'
                                : outItem.status === 'in_progress'
                                ? 'En Desarrollo'
                                : 'Sin Iniciar'}
                            </span>
                          </div>

                          {/* Actividades vinculadas a este RAP */}
                          {outItem.activities.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                Actividades y Evidencias Asociadas:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {outItem.activities.map((act) => {
                                  const sub = outItem.submissions.find((s) => s.activityId === act.id);
                                  const isApproved = sub && (sub.status === 'approved' || sub.grade === 'A');
                                  const isCorrection = sub && (sub.status === 'correction_required' || sub.grade === 'C');
                                  const isNotApproved = sub && (sub.status === 'not_approved' || sub.grade === 'N');
                                  const isSubmitted = sub && !isApproved && !isCorrection && !isNotApproved;

                                  return (
                                    <div
                                      key={act.id}
                                      className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]"
                                    >
                                      <span className="truncate font-medium text-slate-800 max-w-[200px]" title={act.title}>
                                        {act.title}
                                      </span>
                                      {isApproved ? (
                                        <span className="text-[10px] font-bold text-[#2E8500] bg-[#EBF8E7] px-1.5 py-0.2 rounded">
                                          A · Aprobado
                                        </span>
                                      ) : isCorrection ? (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                                          C · Corregir
                                        </span>
                                      ) : isNotApproved ? (
                                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                                          N · No Aprobado
                                        </span>
                                      ) : isSubmitted ? (
                                        <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.2 rounded">
                                          Entregada
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">Sin entregar</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: ESTADO DE EVIDENCIAS DETALLADO (PROMPT 17 - REQUISITO 6) */}
      {(activeTab === 'evidences' || window.matchMedia?.('print')?.matches) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#39A900]" />
                Estado de Evidencias Académicas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento de tareas, dictámenes oficiales (A/N/C), retroalimentación y enlaces de entrega
              </p>
            </div>

            {/* Filtros de Evidencia */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto print:hidden">
              <button
                onClick={() => setEvidenceFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                  evidenceFilter === 'all' ? 'bg-white text-[#00324D] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({expediente.evidences.length})
              </button>
              <button
                onClick={() => setEvidenceFilter('approved')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                  evidenceFilter === 'approved' ? 'bg-[#39A900] text-white shadow-2xs' : 'text-[#2E8500] hover:bg-emerald-50'
                }`}
              >
                Aprobadas ({summary.approvedEvidencesCount})
              </button>
              <button
                onClick={() => setEvidenceFilter('correction_required')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                  evidenceFilter === 'correction_required' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                Por Corregir ({summary.correctionEvidencesCount})
              </button>
              <button
                onClick={() => setEvidenceFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                  evidenceFilter === 'pending' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sin Entregar
              </button>
            </div>
          </div>

          {/* Tabla de Evidencias */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 select-none">
                  <th className="p-3 font-bold">Actividad & Descripción</th>
                  <th className="p-3 font-bold">Tipo</th>
                  <th className="p-3 font-bold">Fecha Límite / Entrega</th>
                  <th className="p-3 font-bold text-center">Estado Oficial</th>
                  <th className="p-3 font-bold">Retroalimentación del Instructor</th>
                  <th className="p-3 font-bold text-right print:hidden">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEvidences.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      No hay evidencias registradas en este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredEvidences.map((item) => (
                    <tr key={item.activity.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 max-w-xs">
                        <div className="font-bold text-slate-900">{item.activity.title}</div>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                          {item.activity.description}
                        </p>
                      </td>

                      <td className="p-3 uppercase font-semibold text-[10px] text-slate-600 font-mono">
                        {item.activity.submissionType || 'ARCHIVO'}
                      </td>

                      <td className="p-3 text-[11px] text-slate-600">
                        {item.submission?.submittedAt ? (
                          <div>
                            <span className="font-medium text-emerald-800 block">
                              Entregada: {new Date(item.submission.submittedAt).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Límite: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Sin límite'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-amber-800 font-medium block">
                              Límite: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Sin límite'}
                            </span>
                            <span className="text-[10px] text-slate-400">Sin radicar</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {item.status === 'approved' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30">
                            A · Aprobado
                          </span>
                        ) : item.status === 'correction_required' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            C · Requiere Corrección
                          </span>
                        ) : item.status === 'not_approved' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                            N · No Aprobado
                          </span>
                        ) : item.status === 'submitted' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Entregada (En revisión)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
                            Pendiente
                          </span>
                        )}
                      </td>

                      <td className="p-3 max-w-xs text-[11px]">
                        {item.feedback ? (
                          <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 italic">
                            "{item.feedback}"
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sin observaciones</span>
                        )}
                      </td>

                      <td className="p-3 text-right print:hidden">
                        {item.fileUrl ? (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-[#EBF8E7] text-[#00324D] hover:text-[#2E8500] rounded text-[11px] font-bold transition-colors"
                          >
                            <HardDrive className="w-3 h-3" />
                            <span>Ver archivo</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: ASISTENCIA Y SEGUIMIENTO DETALLADO */}
      {(activeTab === 'attendance' || window.matchMedia?.('print')?.matches) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#39A900]" />
              Registro de Asistencia y Justificaciones
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control de sesiones, puntualidad, justificaciones radicadas y llamados de atención institucionales
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Historial de Sesiones */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Sesiones Registradas ({attendances.length})
              </h3>
              {attendances.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-lg">
                  No hay sesiones de asistencia registradas para este aprendiz.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {attendances.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{att.date}</span>
                        <span className="text-[10px] text-slate-500">
                          {att.observation || (att as any).observations || 'Sin observaciones'}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          att.status === 'present' || (att.status as string) === 'PRESENTE'
                            ? 'bg-[#EBF8E7] text-[#2E8500]'
                            : att.status === 'late' || (att.status as string) === 'TARDE'
                            ? 'bg-amber-100 text-amber-800'
                            : att.status === 'excused' || (att.status as string) === 'EXCUSADO'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {att.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Justificaciones y Llamados */}
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Excusas / Justificaciones Radicadas ({justifications.length})
                </h3>
                {justifications.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-lg">
                    No registra justificaciones radicadas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {justifications.map((j) => (
                      <div
                        key={j.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 font-semibold">{j.reason}</strong>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              j.status === 'approved' || (j.status as string) === 'APROBADA'
                                ? 'bg-[#EBF8E7] text-[#2E8500]'
                                : j.status === 'rejected' || (j.status as string) === 'RECHAZADA'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {j.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">{j.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Llamados de Atención */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Llamados de Atención Institucionales ({attentionCalls.length})
                </h3>
                {attentionCalls.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 text-emerald-800">
                    ✓ Sin llamados de atención en su expediente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attentionCalls.map((call) => (
                      <div
                        key={call.id}
                        className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1 text-xs text-rose-900"
                      >
                        <div className="flex items-center justify-between">
                          <strong>{(call as any).title || call.reason || call.type}</strong>
                          <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                            {call.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-700">{call.reason || call.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: GAMIFICACIÓN Y LOGROS */}
      {(activeTab === 'gamification' || window.matchMedia?.('print')?.matches) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Gamificación, Insignias y Logros Formativos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Reconocimientos obtenidos por entregas a tiempo, calidad pedagógica y compromiso
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Experiencia Total</span>
              <span className="text-lg font-black text-[#00324D] font-mono">
                {summary.experiencePoints} XP
              </span>
            </div>
          </div>

          {/* Insignias */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Insignias Oficiales Desbloqueadas ({badges.filter((b) => b.unlocked).length} de {badges.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${
                    b.unlocked
                      ? 'bg-amber-50/60 border-amber-200 text-slate-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                      b.unlocked ? 'bg-amber-400 text-white shadow-xs' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {b.icon || '🏅'}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold">{b.name}</h4>
                    <p className="text-[11px] leading-tight text-slate-600">{b.description}</p>
                    {b.unlocked && b.unlockedAt && (
                      <span className="text-[10px] text-amber-700 font-mono block pt-1">
                        Obtenida: {new Date(b.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 6: INFORMACIÓN INSTITUCIONAL COMPLETA */}
      {(activeTab === 'institutional' || window.matchMedia?.('print')?.matches) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#00324D] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#39A900]" />
              Ficha Técnica de Matrícula Institucional
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Datos registrados en el catálogo formativo y vinculación oficial SENA
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-slate-400 font-semibold block text-[11px]">Programa de Formación:</span>
              <strong className="text-sm text-slate-900 block">{academicInfo.programName}</strong>
              <div className="text-[11px] text-slate-500">
                Ficha: <span className="font-mono font-bold text-[#00324D]">#{academicInfo.fichaNumber}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-slate-400 font-semibold block text-[11px]">Centro de Formación:</span>
              <strong className="text-sm text-slate-900 block">{academicInfo.centerName}</strong>
              <div className="text-[11px] text-slate-500">{academicInfo.regional}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-slate-400 font-semibold block text-[11px]">Jornada & Estado:</span>
              <div className="font-semibold text-slate-800">Jornada {academicInfo.jornada}</div>
              <div className="text-[11px] text-slate-500">Estado de matrícula: {academicInfo.enrollmentStatus}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-slate-400 font-semibold block text-[11px]">Instructores Asignados:</span>
              {academicInfo.assignedInstructors.length > 0 ? (
                <div className="space-y-1">
                  {academicInfo.assignedInstructors.map((inst) => (
                    <div key={inst.uid} className="font-semibold text-slate-800">
                      {inst.displayName} · <span className="font-mono text-slate-500">{inst.email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 italic">Información no disponible</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Contacto */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Datos de Contacto"
        subtitle="Actualización en Firestore /users/{uid}"
        footer={
          <>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveContact}
              disabled={isUpdating}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveContact} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{editError}</span>
            </div>
          )}

          {updateSuccess && (
            <div className="p-3 rounded-lg bg-[#EBF8E7] border border-[#39A900]/40 text-[#2E8500] text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>¡Datos actualizados con éxito en Firestore!</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Completo:
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número de Documento (Cédula / TI):
            </label>
            <input
              type="text"
              value={editDoc}
              onChange={(e) => setEditDoc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teléfono de Contacto:
            </label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700 block">Auditoría SENA:</span>
            <p>
              El rol, estado de matrícula y programa son gestionados institucionalmente y no pueden ser alterados directamente.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
};
