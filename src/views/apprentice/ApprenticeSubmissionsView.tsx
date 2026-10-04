/**
 * @license
 * SENA Learning Hub - Vista de Mis Evidencias Entregadas y Seguimiento (Aprendiz)
 * PROMPT 7: Sistema Real de Calificaciones A/N/C, Reenvío de Evidencias (C y N) e Historial
 * Colección Firestore: /submissions
 */

import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  ExternalLink,
  HardDrive,
  CheckCircle2,
  Clock,
  Youtube,
  Search,
  AlertCircle,
  FileText,
  Award,
  RotateCcw,
  History,
  AlertTriangle,
  Send,
  X,
  RefreshCw,
  Info,
  Calendar,
  Sliders,
} from 'lucide-react';
import {
  AcademicSubmission,
  EvidenceActivity,
  SubmissionHistoryItem,
  RubricEvaluation,
} from '../../types/academic';
import { submissionService } from '../../services/submissions/submissionService';
import { activityService } from '../../services/academic/activityService';
import { rubricService } from '../../services/academic/rubricService';
import { getEvidenceTypeConfig } from '../../config/fileLimits';
import { useAuth } from '../../hooks/useAuth';
import { DriveConnectionStatus } from '../../components/evidence/DriveConnectionStatus';
import { EvidenceUploader } from '../../components/evidence/EvidenceUploader';
import { DriveUploadResult } from '../../services/drive/driveService';
import { Modal } from '../../components/ui/Modal';
import { RubricEvaluationViewModal } from '../../components/rubrics/RubricEvaluationViewModal';

export const ApprenticeSubmissionsView: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const learnerId = currentUser?.uid || userProfile?.uid || '';
  const learnerName = userProfile?.displayName || currentUser?.displayName || userProfile?.email || 'Aprendiz SENA';

  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [evaluationsMap, setEvaluationsMap] = useState<Record<string, RubricEvaluation>>({});
  const [selectedEvaluation, setSelectedEvaluation] = useState<RubricEvaluation | null>(null);
  const [rubricModalOpen, setRubricModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'A' | 'N' | 'C' | 'pending'>('all');

  // Modal de Historial de Entregas (Requisito 12)
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedSubForHistory, setSelectedSubForHistory] = useState<AcademicSubmission | null>(null);

  // Modal de Reenvío de Evidencia (Requisitos 13 y 14)
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [submittingTarget, setSubmittingTarget] = useState<AcademicSubmission | null>(null);
  const [resubmitFile, setResubmitFile] = useState<DriveUploadResult | null>(null);
  const [resubmitUrl, setResubmitUrl] = useState('');
  const [resubmitText, setResubmitText] = useState('');
  const [resubmitComments, setResubmitComments] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const [resubmitSuccess, setResubmitSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, actsRes] = await Promise.all([
        submissionService.getSubmissionsByLearner(learnerId),
        activityService.getActivities(),
      ]);
      const loadedSubs = subsRes.data || [];
      setSubmissions(loadedSubs);
      setActivities(actsRes.data || []);

      // Cargar evaluaciones de rúbricas correspondientes a las entregas (Prompt 19)
      const evals: Record<string, RubricEvaluation> = {};
      for (const s of loadedSubs) {
        try {
          const ev = await rubricService.getRubricEvaluation(s.id, s.version || 1);
          if (ev) evals[s.id] = ev;
        } catch (e) {
          // ignore
        }
      }
      setEvaluationsMap(evals);
    } catch (err) {
      console.error('[ApprenticeSubmissionsView] Error cargando evidencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [learnerId]);

  const activityMap = React.useMemo(() => {
    const map = new Map<string, EvidenceActivity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  const getActivityTitle = (actId: string) => {
    return activityMap.get(actId)?.title || actId;
  };

  // Abrir modal de reenvío
  const handleOpenResubmit = (sub: AcademicSubmission) => {
    setSubmittingTarget(sub);
    setResubmitFile(null);
    setResubmitUrl(sub.externalUrl || '');
    setResubmitText(sub.textContent || '');
    setResubmitComments('');
    setResubmitError(null);
    setResubmitSuccess(null);
    setResubmitModalOpen(true);
  };

  // Ejecutar el reenvío de la corrección vinculando a Google Drive
  const handleExecuteResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTarget) return;

    const act = activityMap.get(submittingTarget.activityId);
    const config = getEvidenceTypeConfig(submittingTarget.submissionType);

    if (config.isFile && !resubmitFile) {
      setResubmitError('Debes subir el nuevo archivo corregido a Google Drive antes de enviar.');
      return;
    }

    setIsResubmitting(true);
    setResubmitError(null);

    try {
      const updated = await submissionService.resubmitEvidence(submittingTarget.id, {
        driveFileId: resubmitFile?.driveFileId,
        driveUrl: resubmitFile?.driveUrl,
        driveFileUrl: resubmitFile?.driveUrl,
        fileName: resubmitFile?.fileName,
        fileSize: resubmitFile?.fileSize,
        mimeType: resubmitFile?.mimeType,
        externalUrl: resubmitUrl ? resubmitUrl.trim() : undefined,
        textContent: resubmitText ? resubmitText.trim() : undefined,
        comments: resubmitComments ? resubmitComments.trim() : undefined,
      });

      setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setResubmitSuccess('¡Nueva versión enviada exitosamente para revisión de tu instructor!');
      setTimeout(() => {
        setResubmitModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setResubmitError(err.message || 'Error al enviar la corrección.');
    } finally {
      setIsResubmitting(false);
    }
  };

  // Abrir visor de historial
  const handleOpenHistory = (sub: AcademicSubmission) => {
    setSelectedSubForHistory(sub);
    setHistoryModalOpen(true);
  };

  // Filtrado de evidencias
  const filteredSubmissions = submissions.filter((sub) => {
    const term = searchTerm.toLowerCase();
    const matchAct = getActivityTitle(sub.activityId).toLowerCase().includes(term);
    const matchFile = (sub.fileName || '').toLowerCase().includes(term);
    const matchSearch = matchAct || matchFile;

    if (!matchSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'A') return sub.status === 'approved' || sub.grade === 'A';
    if (statusFilter === 'N') return sub.status === 'not_approved' || sub.grade === 'N';
    if (statusFilter === 'C') return sub.status === 'correction_required' || sub.grade === 'C';
    if (statusFilter === 'pending') {
      return (
        sub.status === 'pending' ||
        sub.status === 'submitted' ||
        sub.status === 'under_review' ||
        (!sub.grade && sub.status !== 'approved' && sub.status !== 'not_approved' && sub.status !== 'correction_required')
      );
    }
    return true;
  });

  // Estadísticas rápidas del aprendiz
  const totalCount = submissions.length;
  const approvedCount = submissions.filter((s) => s.status === 'approved' || s.grade === 'A').length;
  const notApprovedCount = submissions.filter((s) => s.status === 'not_approved' || s.grade === 'N').length;
  const correctionCount = submissions.filter((s) => s.status === 'correction_required' || s.grade === 'C').length;
  const pendingCount = submissions.filter(
    (s) =>
      s.status === 'pending' ||
      s.status === 'submitted' ||
      s.status === 'under_review' ||
      (!s.grade && s.status !== 'approved' && s.status !== 'not_approved' && s.status !== 'correction_required')
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#00324D]">Mis Evidencias Entregadas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta el estado de evaluación (A/N/C), retroalimentación y reenvío de correcciones en Google Drive
          </p>
        </div>
        <DriveConnectionStatus compact />
      </div>

      {/* 2. Tarjetas de Resumen de Evaluación A/N/C */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-semibold block opacity-80">Total Evidencias</span>
          <div className="text-xl font-black mt-0.5">{totalCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('A')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'A'
              ? 'bg-[#2E8500] text-white border-[#2E8500] shadow-sm'
              : 'bg-[#EBF8E7] border-[#39A900]/30 text-[#2E8500] hover:border-[#39A900]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">A · Aprobadas</span>
            <CheckCircle2 className="w-4 h-4 opacity-80" />
          </div>
          <div className="text-xl font-black mt-0.5">{approvedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('C')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'C'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">C · Por Corregir</span>
            <RotateCcw className="w-4 h-4 opacity-80" />
          </div>
          <div className="text-xl font-black mt-0.5">{correctionCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('N')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'N'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-rose-50 border-rose-200 text-rose-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">N · No Aprobadas</span>
            <AlertCircle className="w-4 h-4 opacity-80" />
          </div>
          <div className="text-xl font-black mt-0.5">{notApprovedCount}</div>
        </div>
      </div>

      {/* 3. Buscador y Filtro Rápido */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre de actividad o archivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              statusFilter === 'all' ? 'bg-[#00324D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              statusFilter === 'pending' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
        </div>
      </div>

      {/* 4. Lista de Evidencias */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#39A900] mb-2" />
          Consultando evidencias en Firestore y Google Drive...
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
          <FolderArchive className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No se encontraron evidencias</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'Prueba ajustando los filtros de búsqueda.'
              : 'Ve a la sección "Mis Actividades" para radicar tu primera evidencia.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => {
            const config = getEvidenceTypeConfig(sub.submissionType);
            const driveLink =
              sub.driveUrl ||
              sub.driveFileUrl ||
              (sub.driveFileId ? `https://drive.google.com/file/d/${sub.driveFileId}/view` : null);

            const isApproved = sub.status === 'approved' || sub.grade === 'A';
            const isNotApproved = sub.status === 'not_approved' || sub.grade === 'N';
            const isCorrection = sub.status === 'correction_required' || sub.grade === 'C';
            const isPending = !isApproved && !isNotApproved && !isCorrection;

            const hasHistory = sub.submissionHistory && sub.submissionHistory.length > 0;
            const resubCount = sub.resubmissionCount || (sub.submissionHistory ? sub.submissionHistory.length : 0);

            return (
              <div
                key={sub.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all space-y-3 ${
                  isCorrection
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : isNotApproved
                    ? 'border-rose-300'
                    : isApproved
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Cabecera de la Evidencia */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#00324D]">
                        {getActivityTitle(sub.activityId)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                      {resubCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <History className="w-3 h-3 text-slate-500" />
                          Versión {sub.version || resubCount + 1} ({resubCount} reenvíos)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Radicado: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Reciente'}</span>
                      {sub.gradedAt && (
                        <span>Evaluado: {new Date(sub.gradedAt).toLocaleDateString()}</span>
                      )}
                      {sub.gradedBy && (
                        <span>Por: <strong>{sub.gradedBy}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Dictamen Oficial SENA A / N / C */}
                  <div className="flex items-center gap-2 self-start md:self-center">
                    {isApproved && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EBF8E7] border border-[#39A900]/40 text-[#2E8500]">
                        <CheckCircle2 className="w-5 h-5 text-[#39A900]" />
                        <div>
                          <span className="text-sm font-black block leading-none">A · APROBADO</span>
                          <span className="text-[10px] font-semibold opacity-80">Cumple criterio SENA</span>
                        </div>
                      </div>
                    )}
                    {isNotApproved && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                        <div>
                          <span className="text-sm font-black block leading-none">N · NO APROBADO</span>
                          <span className="text-[10px] font-semibold opacity-80">No cumple criterio</span>
                        </div>
                      </div>
                    )}
                    {isCorrection && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800">
                        <RotateCcw className="w-5 h-5 text-amber-600" />
                        <div>
                          <span className="text-sm font-black block leading-none">C · REQUIERE CORRECCIÓN</span>
                          <span className="text-[10px] font-semibold opacity-80">Debe reenviar evidencia</span>
                        </div>
                      </div>
                    )}
                    {isPending && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold">PENDIENTE DE REVISIÓN</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Banner Obligatorio de Reenvío cuando es C (Sección 13) */}
                {isCorrection && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Esta evidencia requiere corrección.</span>
                    </div>
                    {sub.feedback ? (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-950 space-y-1">
                        <strong className="block font-bold text-amber-900">
                          Retroalimentación del Instructor:
                        </strong>
                        <p className="italic">{sub.feedback}</p>
                        {sub.gradedAt && (
                          <span className="text-[10px] text-amber-700 block pt-1">
                            Fecha de evaluación: {new Date(sub.gradedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-800">
                        El instructor ha indicado que debes realizar ajustes a la entrega y volver a subir tu archivo corregido.
                      </p>
                    )}
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-amber-800">
                        La nueva versión se almacenará de forma segura en Google Drive conservando tu historial.
                      </span>
                      <button
                        onClick={() => handleOpenResubmit(sub)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Enviar Nueva Versión
                      </button>
                    </div>
                  </div>
                )}

                {/* Banner de Evidencia No Aprobada (Sección 14) */}
                {isNotApproved && (
                  <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Resultado: N — No Aprobado</span>
                    </div>
                    {sub.feedback && (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-rose-200 text-xs text-rose-950 space-y-1">
                        <strong className="block font-bold text-rose-900">
                          Retroalimentación del Instructor:
                        </strong>
                        <p className="italic">{sub.feedback}</p>
                        {sub.gradedAt && (
                          <span className="text-[10px] text-rose-700 block pt-1">
                            Fecha de evaluación: {new Date(sub.gradedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-rose-800">
                        Puedes consultar con tu instructor para acordar una nueva entrega de nivelación.
                      </span>
                      <button
                        onClick={() => handleOpenResubmit(sub)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reenviar Evidencia
                      </button>
                    </div>
                  </div>
                )}

                {/* Retroalimentación en caso de Aprobada */}
                {isApproved && sub.feedback && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1">
                    <strong className="block font-bold text-emerald-900">
                      Retroalimentación del Instructor:
                    </strong>
                    <p className="italic">{sub.feedback}</p>
                  </div>
                )}

                {/* Banner de Evaluación Formativa por Rúbrica Pedagógica (Prompt 19) */}
                {evaluationsMap[sub.id] && (
                  <div className="p-3 bg-linear-to-r from-sky-50 via-teal-50 to-emerald-50 rounded-xl border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-sky-100/80 text-sky-800 shrink-0">
                        <Sliders className="w-4 h-4 text-[#00324D]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#00324D]">
                            Evaluación por Rúbrica Pedagógica
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-[#2E8500] border border-emerald-300">
                            {evaluationsMap[sub.id].percentage}% ({evaluationsMap[sub.id].totalPoints} / {evaluationsMap[sub.id].totalPossiblePoints} pts)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                          {evaluationsMap[sub.id].rubricTitle || 'Dictamen detallado de criterios formativos'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEvaluation(evaluationsMap[sub.id]);
                        setRubricModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5 text-[#8CE665]" />
                      Ver Desglose de Rúbrica
                    </button>
                  </div>
                )}

                {/* Detalle de Archivo Físico o Enlace */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="space-y-1 flex-1 min-w-0">
                    {config.isFile ? (
                      <div className="flex items-center gap-2 font-mono text-slate-800 truncate">
                        <FolderArchive className="w-4 h-4 text-[#39A900] shrink-0" />
                        <span className="truncate">{sub.fileName || 'archivo_evidencia'}</span>
                        {sub.fileSize && (
                          <span className="text-slate-400">
                            ({(sub.fileSize / (1024 * 1024)).toFixed(1)} MB)
                          </span>
                        )}
                      </div>
                    ) : sub.submissionType === 'youtube_link' ? (
                      <div className="flex items-center gap-2 text-red-600 font-semibold truncate">
                        <Youtube className="w-4 h-4 shrink-0" />
                        <a
                          href={sub.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline truncate"
                        >
                          {sub.externalUrl}
                        </a>
                      </div>
                    ) : (
                      <div className="text-slate-700 truncate">
                        <ExternalLink className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                        {sub.externalUrl || sub.textContent || 'Evidencia digital'}
                      </div>
                    )}

                    {sub.drivePath && (
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        📁 {sub.drivePath}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Botón Ver Historial de Entregas (Requisito 12) */}
                    {(hasHistory || resubCount > 0) && (
                      <button
                        onClick={() => handleOpenHistory(sub)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        Ver Historial
                      </button>
                    )}

                    {/* Botón Google Drive */}
                    {driveLink && (
                      <a
                        href={driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-[#8CE665]" />
                        Abrir en Drive
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Reenvío de Evidencia (C y N) usando Google Drive */}
      {resubmitModalOpen && submittingTarget && (
        <Modal
          isOpen={resubmitModalOpen}
          onClose={() => setResubmitModalOpen(false)}
          title="Reenvío de Evidencia Corregida"
          subtitle={`${getActivityTitle(submittingTarget.activityId)} · Versión ${(submittingTarget.resubmissionCount || 0) + 2}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setResubmitModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteResubmit}
                disabled={isResubmitting}
                className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isResubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Enviando corrección...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Confirmar y Enviar a Google Drive
                  </>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Contexto del reenvío y retroalimentación anterior */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-950">
              <strong className="block font-bold text-amber-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-600" />
                Entrega Anterior: Versión {submittingTarget.version || 1}
              </strong>
              {submittingTarget.feedback && (
                <p className="italic">"{submittingTarget.feedback}"</p>
              )}
              <span className="text-[11px] text-amber-800 block">
                Archivo previo: <strong>{submittingTarget.fileName || submittingTarget.externalUrl || 'Evidencia previa'}</strong>
              </span>
            </div>

            {resubmitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{resubmitError}</span>
              </div>
            )}

            {resubmitSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[#2E8500] flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#39A900] shrink-0" />
                <span>{resubmitSuccess}</span>
              </div>
            )}

            {/* Carga del nuevo archivo con el Uploader oficial de Google Drive */}
            {getEvidenceTypeConfig(submittingTarget.submissionType).isFile ? (
              <div className="space-y-2">
                <label className="block font-bold text-slate-800">
                  Nuevo Archivo Corregido ({getEvidenceTypeConfig(submittingTarget.submissionType).label}) *
                </label>
                <EvidenceUploader
                  expectedType={submittingTarget.submissionType}
                  programName={submittingTarget.programId || 'Gestión Académica'}
                  fichaNumber={submittingTarget.fichaId.replace('ficha_', '')}
                  activityTitle={getActivityTitle(submittingTarget.activityId)}
                  learnerName={learnerName}
                  instructorEmail={submittingTarget.instructorEmail || 'instructor@sena.edu.co'}
                  onUploadSuccess={(res) => {
                    setResubmitFile(res);
                    setResubmitError(null);
                  }}
                />
              </div>
            ) : submittingTarget.submissionType === 'youtube_link' || submittingTarget.submissionType === 'canva_link' || submittingTarget.submissionType === 'external_link' ? (
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">
                  Nuevo Enlace Corregido *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={resubmitUrl}
                  onChange={(e) => setResubmitUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-800">
                  Texto Corregido *
                </label>
                <textarea
                  rows={4}
                  required
                  value={resubmitText}
                  onChange={(e) => setResubmitText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
                />
              </div>
            )}

            {/* Comentarios de la corrección */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">
                Aclaraciones sobre las correcciones realizadas (Opcional):
              </label>
              <textarea
                rows={2}
                placeholder="Indica al instructor qué cambios realizaste respecto a su retroalimentación..."
                value={resubmitComments}
                onChange={(e) => setResubmitComments(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Historial Completo de Entregas (Requisito 12) */}
      {historyModalOpen && selectedSubForHistory && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title="Historial de Entregas y Evaluaciones"
          subtitle={`${getActivityTitle(selectedSubForHistory.activityId)} · Total de versiones registradas`}
          footer={
            <button
              onClick={() => setHistoryModalOpen(false)}
              className="px-4 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Cerrar
            </button>
          }
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            <p className="text-slate-500">
              A continuación se detalla la trazabilidad pedagógica de cada entrega realizada para esta actividad:
            </p>

            {/* Versiones archivadas en submissionHistory */}
            {selectedSubForHistory.submissionHistory &&
              selectedSubForHistory.submissionHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                        {item.version || idx + 1}
                      </span>
                      Entrega {item.version || idx + 1}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        item.grade === 'A' || item.status === 'approved'
                          ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30'
                          : item.grade === 'C' || item.status === 'correction_required'
                          ? 'bg-amber-50 text-amber-800 border border-amber-300'
                          : 'bg-rose-50 text-rose-700 border border-rose-300'
                      }`}
                    >
                      {item.grade ? `Dictamen: ${item.grade}` : item.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex flex-wrap gap-3">
                    <span>Enviado: {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : 'Fecha previa'}</span>
                    {item.gradedAt && (
                      <span>Evaluado: {new Date(item.gradedAt).toLocaleDateString()}</span>
                    )}
                    {item.gradedBy && <span>Instructor: {item.gradedBy}</span>}
                  </div>

                  {item.fileName && (
                    <div className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                      <span className="truncate">📄 {item.fileName}</span>
                      {item.driveUrl && (
                        <a
                          href={item.driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#39A900] hover:underline font-bold text-[10px] flex items-center gap-1 shrink-0 ml-2"
                        >
                          <HardDrive className="w-3 h-3" /> Ver en Drive
                        </a>
                      )}
                    </div>
                  )}

                  {item.feedback && (
                    <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-700 italic space-y-0.5">
                      <strong className="block not-italic text-slate-900 font-semibold text-[11px]">
                        Retroalimentación recibida:
                      </strong>
                      "{item.feedback}"
                    </div>
                  )}
                </div>
              ))}

            {/* Versión actual en revisión o calificada */}
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {selectedSubForHistory.version ||
                      (selectedSubForHistory.submissionHistory?.length || 0) + 1}
                  </span>
                  Versión Actual (Entrega{' '}
                  {selectedSubForHistory.version ||
                    (selectedSubForHistory.submissionHistory?.length || 0) + 1}
                  )
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    selectedSubForHistory.grade === 'A' || selectedSubForHistory.status === 'approved'
                      ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30'
                      : selectedSubForHistory.grade === 'C' ||
                        selectedSubForHistory.status === 'correction_required'
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : selectedSubForHistory.grade === 'N' ||
                        selectedSubForHistory.status === 'not_approved'
                      ? 'bg-rose-50 text-rose-700 border border-rose-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {selectedSubForHistory.grade
                    ? `Dictamen: ${selectedSubForHistory.grade}`
                    : selectedSubForHistory.status}
                </span>
              </div>

              <div className="text-[11px] text-blue-900 flex flex-wrap gap-3">
                <span>
                  Radicado: {new Date(selectedSubForHistory.submittedAt).toLocaleString()}
                </span>
                {selectedSubForHistory.gradedAt && (
                  <span>
                    Evaluado: {new Date(selectedSubForHistory.gradedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {selectedSubForHistory.fileName && (
                <div className="font-mono text-slate-700 bg-white p-2 rounded border border-blue-200 flex items-center justify-between">
                  <span className="truncate">📄 {selectedSubForHistory.fileName}</span>
                  {(selectedSubForHistory.driveUrl || selectedSubForHistory.driveFileUrl) && (
                    <a
                      href={selectedSubForHistory.driveUrl || selectedSubForHistory.driveFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#39A900] hover:underline font-bold text-[10px] flex items-center gap-1 shrink-0 ml-2"
                    >
                      <HardDrive className="w-3 h-3" /> Ver en Drive
                    </a>
                  )}
                </div>
              )}

              {selectedSubForHistory.feedback && (
                <div className="bg-white p-2.5 rounded border border-blue-200 text-slate-700 italic space-y-0.5">
                  <strong className="block not-italic text-slate-900 font-semibold text-[11px]">
                    Retroalimentación recibida:
                  </strong>
                  "{selectedSubForHistory.feedback}"
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Visualización de Evaluación por Rúbrica Pedagógica (Prompt 19) */}
      {rubricModalOpen && selectedEvaluation && (
        <RubricEvaluationViewModal
          isOpen={rubricModalOpen}
          onClose={() => {
            setRubricModalOpen(false);
            setSelectedEvaluation(null);
          }}
          evaluation={selectedEvaluation}
          officialGrade={submissions.find((s) => s.id === selectedEvaluation.submissionId)?.grade}
        />
      )}
    </div>
  );
};
