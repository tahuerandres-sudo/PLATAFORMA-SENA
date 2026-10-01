/**
 * @license
 * SENA Learning Hub - Vista de Perfil del Aprendiz
 * PROMPT 7: Requisito 11 - Sección de Evaluación, Resumen, Porcentaje de Cumplimiento, Competencias y Actividades
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
  RotateCcw,
  Clock,
  Award,
  Layers,
  Target,
  FileText,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import {
  AcademicSubmission,
  EvidenceActivity,
  Competency,
  LearningOutcome,
} from '../../types/academic';
import { submissionService } from '../../services/submissions/submissionService';
import { activityService } from '../../services/academic/activityService';
import { competencyService } from '../../services/academic/competencyService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';

export const ApprenticeProfileView: React.FC = () => {
  const { userProfile, currentUser, updateProfile } = useAuth();
  const learnerId = currentUser?.uid || userProfile?.uid || 'appr_juan_perez';

  const [activeTab, setActiveTab] = useState<'profile' | 'evaluation'>('profile');

  // Estados del modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(userProfile?.displayName || '');
  const [editPhone, setEditPhone] = useState(userProfile?.phone || '');
  const [editDoc, setEditDoc] = useState(userProfile?.documentNumber || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Datos para la pestaña de Evaluación (Requisito 11)
  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [outcomes, setOutcomes] = useState<LearningOutcome[]>([]);
  const [loadingEval, setLoadingEval] = useState(true);

  useEffect(() => {
    async function loadEvalData() {
      setLoadingEval(true);
      try {
        const [subsRes, actsRes, compsRes, outsRes] = await Promise.all([
          submissionService.getSubmissionsByLearner(learnerId),
          activityService.getActivities(),
          competencyService.getCompetencies(),
          learningOutcomeService.getLearningOutcomes(),
        ]);
        setSubmissions(subsRes.data || []);
        setActivities(actsRes.data || []);
        setCompetencies(compsRes.data || []);
        setOutcomes(outsRes.data || []);
      } catch (err) {
        console.warn('[ApprenticeProfileView] Error cargando evaluación:', err);
      } finally {
        setLoadingEval(false);
      }
    }
    loadEvalData();
  }, [learnerId]);

  // Mapas auxiliares
  const activityMap = useMemo(() => {
    const map = new Map<string, EvidenceActivity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  const submissionByActMap = useMemo(() => {
    const map = new Map<string, AcademicSubmission>();
    submissions.forEach((s) => map.set(s.activityId, s));
    return map;
  }, [submissions]);

  // Métricas del Requisito 11
  const evalMetrics = useMemo(() => {
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

    // Porcentaje de cumplimiento: evidencias aprobadas / evidencias evaluadas * 100
    // No considerar evidencias pendientes como aprobadas.
    const evaluatedCount = approved + notApproved + correction;
    const complianceRate = evaluatedCount > 0 ? Math.round((approved / evaluatedCount) * 100) : 0;

    return { total, approved, notApproved, correction, pending, evaluatedCount, complianceRate };
  }, [submissions]);

  const handleOpenEdit = () => {
    setEditName(userProfile?.displayName || '');
    setEditPhone(userProfile?.phone || '');
    setEditDoc(userProfile?.documentNumber || '');
    setErrorMsg(null);
    setUpdateSuccess(false);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setErrorMsg(null);

    try {
      await updateProfile({
        displayName: editName.trim(),
        phone: editPhone.trim(),
        documentNumber: editDoc.trim(),
      });
      setUpdateSuccess(true);
      setTimeout(() => {
        setIsEditModalOpen(false);
        setUpdateSuccess(false);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo actualizar el perfil.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#00324D]">Perfil Institucional del Aprendiz</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Identificación digital, datos de matrícula y seguimiento del aprendizaje SENA
          </p>
        </div>

        {/* Pestañas de Navegación del Perfil */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-[#00324D] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Datos Personales
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'evaluation'
                ? 'bg-[#39A900] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Evaluación</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
              {evalMetrics.complianceRate}%
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        /* ================= VISTA 1: CARNET Y DATOS PERSONALES ================= */
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
          {/* Cabecera del Carnet */}
          <div className="bg-[#00324D] text-white p-6 border-b-4 border-[#39A900] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={
                  userProfile?.photoURL ||
                  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
                }
                alt={userProfile?.displayName || 'Aprendiz'}
                className="w-16 h-16 rounded-full object-cover ring-4 ring-[#39A900]"
              />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-[#39A900] px-2 py-0.5 rounded text-white">
                  Aprendiz SENA
                </span>
                <h2 className="text-lg font-bold text-white mt-1">
                  {userProfile?.displayName || 'Aprendiz'}
                </h2>
                <p className="text-xs text-slate-300 font-mono">
                  {userProfile?.documentNumber ? `CC ${userProfile.documentNumber}` : 'Documento pendiente'}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
              <StatusBadge status={userProfile?.status || 'active'} size="sm" />
              <span className="text-[11px] text-slate-300 font-mono">
                UID: {userProfile?.uid ? userProfile.uid.slice(0, 8) + '...' : '—'}
              </span>
            </div>
          </div>

          {/* Datos Académicos y Personales */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#39A900]" />
                  Programa de Formación:
                </span>
                <div className="font-bold text-slate-800 text-sm">
                  {userProfile?.programName || 'Gestión Contable y de Información Financiera'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Ficha: {userProfile?.fichaId || '1234567'}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#39A900]" />
                  Centro de Formación:
                </span>
                <div className="font-bold text-slate-800">Centro de Comercio y Servicios</div>
                <div className="text-[11px] text-slate-500">Regional Tolima</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#39A900]" />
                  Correo Electrónico:
                </span>
                <div className="font-mono text-slate-800 font-semibold truncate">
                  {userProfile?.email}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#39A900]" />
                  Teléfono de Contacto:
                </span>
                <div className="font-semibold text-slate-800">
                  {userProfile?.phone || <span className="text-slate-400 italic">No registrado</span>}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-[#39A900]" />
                <span>Rol verificado en base de datos: <strong>{userProfile?.role}</strong></span>
              </div>

              <button
                onClick={handleOpenEdit}
                className="px-4 py-2 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#8CE665]" />
                Editar Perfil
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= VISTA 2: SECCIÓN DE EVALUACIÓN (PROMPT 7 - REQUISITO 11) ================= */
        <div className="space-y-6">
          {/* 1. Resumen y Porcentaje de Cumplimiento */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-[#00324D]">Resumen de Evaluación</h3>
                <p className="text-xs text-slate-500">
                  Escala institucional SENA: A (Aprobado), N (No aprobado), C (Requiere corrección)
                </p>
              </div>

              {/* Indicador destacado de % de cumplimiento */}
              <div className="flex items-center gap-3 bg-[#EBF8E7] px-4 py-2 rounded-xl border border-[#39A900]/30">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#2E8500] uppercase block">
                    Porcentaje de Cumplimiento
                  </span>
                  <span className="text-2xl font-black text-[#2E8500]">
                    {evalMetrics.complianceRate}%
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#39A900] text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Barra de progreso visual */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Progreso de Evidencias Evaluadas:</span>
                <span>
                  {evalMetrics.approved} aprobadas de {evalMetrics.evaluatedCount} evaluadas ({evalMetrics.total} total)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                <div
                  className="bg-[#39A900] h-full transition-all duration-300"
                  style={{ width: `${evalMetrics.complianceRate}%` }}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{
                    width: `${
                      evalMetrics.evaluatedCount > 0
                        ? (evalMetrics.correction / evalMetrics.evaluatedCount) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      evalMetrics.evaluatedCount > 0
                        ? (evalMetrics.notApproved / evalMetrics.evaluatedCount) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                * Las evidencias pendientes no se contabilizan como aprobadas en el cálculo.
              </p>
            </div>

            {/* Cuadrícula de Resumen Numérico (Requisito 11) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block">Total Evidencias</span>
                <span className="text-xl font-black text-slate-800">{evalMetrics.total}</span>
              </div>

              <div className="p-3 bg-[#EBF8E7] rounded-xl border border-[#39A900]/30 text-[#2E8500]">
                <span className="text-[11px] font-bold block">A · Aprobadas</span>
                <span className="text-xl font-black">{evalMetrics.approved}</span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                <span className="text-[11px] font-bold block">C · Por Corregir</span>
                <span className="text-xl font-black">{evalMetrics.correction}</span>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
                <span className="text-[11px] font-bold block">N · No Aprobadas</span>
                <span className="text-xl font-black">{evalMetrics.notApproved}</span>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold block">Pendientes</span>
                <span className="text-xl font-black">{evalMetrics.pending}</span>
              </div>
            </div>
          </div>

          {/* 2. Por Competencia y Resultados de Aprendizaje (Requisito 11) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#39A900]" />
              <h3 className="text-base font-bold text-[#00324D]">
                Evaluación por Competencia y Resultados de Aprendizaje
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Desglose de competencias asociadas al programa y estado de cumplimiento curricular
            </p>

            <div className="space-y-4 pt-2">
              {competencies.map((comp) => {
                const compOutcomes = outcomes.filter((o) => o.competencyId === comp.id);
                return (
                  <div
                    key={comp.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#00324D] text-white px-2 py-0.5 rounded font-mono">
                          {comp.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">
                          {comp.description}
                        </h4>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Competencia {comp.type || 'Transversal'}
                      </span>
                    </div>

                    {/* Resultados de Aprendizaje de esta Competencia */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Resultados de Aprendizaje Asociados (RAPs):
                      </span>
                      {compOutcomes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No hay resultados indexados aún.</p>
                      ) : (
                        compOutcomes.map((out) => {
                          // Actividades vinculadas a este RAP
                          const outActivities = activities.filter(
                            (a) => a.learningOutcomeId === out.id || a.competencyId === comp.id
                          );
                          return (
                            <div
                              key={out.id}
                              className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-mono font-bold text-[#39A900] mr-2">
                                    {out.code}:
                                  </span>
                                  <span className="text-slate-800 font-medium">
                                    {out.description}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                                  {outActivities.length} actividad(es)
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Por Actividad y su Estado (Requisito 11) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#39A900]" />
              <h3 className="text-base font-bold text-[#00324D]">
                Estado de Evaluación por Actividad
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Listado de tareas publicadas y estado de calificación individual del aprendiz
            </p>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="p-3 font-bold">Actividad</th>
                    <th className="p-3 font-bold">Tipo Evidencia</th>
                    <th className="p-3 font-bold text-center">Estado Evaluación</th>
                    <th className="p-3 font-bold">Retroalimentación del Instructor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activities.map((act) => {
                    const sub = submissionByActMap.get(act.id);
                    const isApproved = sub && (sub.status === 'approved' || sub.grade === 'A');
                    const isNotApproved = sub && (sub.status === 'not_approved' || sub.grade === 'N');
                    const isCorrection = sub && (sub.status === 'correction_required' || sub.grade === 'C');
                    const isSubmitted = sub && !isApproved && !isNotApproved && !isCorrection;

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 max-w-xs">
                          <div className="font-bold text-slate-900">{act.title}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{act.description}</div>
                        </td>
                        <td className="p-3 uppercase font-semibold text-[10px] text-slate-600">
                          {act.submissionType}
                        </td>
                        <td className="p-3 text-center">
                          {isApproved ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30">
                              A · Aprobado
                            </span>
                          ) : isCorrection ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              C · Corregir
                            </span>
                          ) : isNotApproved ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                              N · No Aprobado
                            </span>
                          ) : isSubmitted ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Entregada (En revisión)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-400 border border-slate-200">
                              Sin Entregar
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 italic">
                          {sub?.feedback ? (
                            <span>"{sub.feedback}"</span>
                          ) : (
                            <span className="text-slate-400 not-italic text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Perfil */}
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
              onClick={handleSaveProfile}
              disabled={isUpdating}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {updateSuccess && (
            <div className="p-3 rounded-lg bg-[#EBF8E7] border border-[#39A900]/40 text-[#2E8500] text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>¡Perfil actualizado con éxito en Firestore!</span>
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
              Teléfono Celular:
            </label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <span className="font-semibold text-slate-700">Reglas de Seguridad:</span>
            <p>
              Por políticas de auditoría institucional del SENA, el UID ({userProfile?.uid}), el Rol ({userProfile?.role}) y el Estado ({userProfile?.status}) están protegidos contra modificaciones no autorizadas.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
};
