/**
 * @license
 * SENA Learning Hub - Vista de Mis Calificaciones y Retroalimentación (Aprendiz)
 * PROMPT 7: Calificaciones reales escala A / N / C, retroalimentación formativa y trazabilidad
 * Colección Firestore: /submissions
 */

import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  MessageSquare,
  Sparkles,
  ExternalLink,
  HardDrive,
  RefreshCw,
  FolderArchive,
} from 'lucide-react';
import { AcademicSubmission, EvidenceActivity } from '../../types/academic';
import { submissionService } from '../../services/submissions/submissionService';
import { activityService } from '../../services/academic/activityService';
import { useAuth } from '../../hooks/useAuth';

export const ApprenticeGradesView: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const learnerId = currentUser?.uid || userProfile?.uid || 'appr_juan_perez';

  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, actsRes] = await Promise.all([
        submissionService.getSubmissionsByLearner(learnerId),
        activityService.getActivities(),
      ]);
      setSubmissions(subsRes.data || []);
      setActivities(actsRes.data || []);
    } catch (err) {
      console.warn('[ApprenticeGradesView] Error cargando calificaciones:', err);
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

  const gradedSubmissions = submissions.filter(
    (s) => s.grade || s.status === 'approved' || s.status === 'not_approved' || s.status === 'correction_required'
  );

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-bold text-[#00324D]">Mis Calificaciones y Retroalimentación</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Evaluaciones oficiales emitidas por tus instructores bajo los criterios del SENA: A (Aprobado), N (No aprobado), C (Requiere corrección)
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#39A900] mb-2" />
          Cargando tus calificaciones registradas...
        </div>
      ) : gradedSubmissions.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
          <Award className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Aún no tienes calificaciones registradas</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tus evidencias entregadas están siendo revisadas por tu instructor. Cuando emita una evaluación A, N o C, aparecerá aquí junto con sus observaciones formativas.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {gradedSubmissions.map((sub) => {
            const act = activityMap.get(sub.activityId);
            const isApproved = sub.status === 'approved' || sub.grade === 'A';
            const isNotApproved = sub.status === 'not_approved' || sub.grade === 'N';
            const isCorrection = sub.status === 'correction_required' || sub.grade === 'C';

            return (
              <div
                key={sub.id}
                className={`bg-white rounded-2xl border p-6 space-y-5 shadow-xs ${
                  isApproved
                    ? 'border-emerald-200'
                    : isCorrection
                    ? 'border-amber-300 ring-2 ring-amber-50'
                    : 'border-rose-300'
                }`}
              >
                {/* Cabecera de la Calificación */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#00324D] bg-slate-100 px-2.5 py-0.5 rounded">
                      Ficha {sub.fichaId ? sub.fichaId.replace('ficha_', '') : '1234567'}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-1">
                      {act?.title || sub.activityId}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Evaluado por: <strong>{sub.gradedBy || 'Instructor'}</strong>
                      {sub.gradedAt && ` · ${new Date(sub.gradedAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  {/* Dictamen Visual SENA */}
                  <div className="text-left sm:text-right">
                    {isApproved && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30">
                        <CheckCircle2 className="w-5 h-5 text-[#39A900]" />
                        <div>
                          <span className="text-base font-black block leading-none">A · APROBADO</span>
                          <span className="text-[10px] font-semibold opacity-85">Criterio SENA alcanzado</span>
                        </div>
                      </div>
                    )}
                    {isNotApproved && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-300">
                        <AlertCircle className="w-5 h-5 text-rose-600" />
                        <div>
                          <span className="text-base font-black block leading-none">N · NO APROBADO</span>
                          <span className="text-[10px] font-semibold opacity-85">Requiere plan de nivelación</span>
                        </div>
                      </div>
                    )}
                    {isCorrection && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-300">
                        <RotateCcw className="w-5 h-5 text-amber-600" />
                        <div>
                          <span className="text-base font-black block leading-none">C · REQUIERE CORRECCIÓN</span>
                          <span className="text-[10px] font-semibold opacity-85">Debe reenviar evidencia</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Retroalimentación Formativa */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00324D]">
                    <MessageSquare className="w-4 h-4 text-[#39A900]" />
                    <span>Retroalimentación del Instructor:</span>
                  </div>

                  {sub.feedback ? (
                    <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed bg-white p-3 rounded-lg border border-slate-200/60">
                      "{sub.feedback}"
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Sin observaciones escritas adjuntas a esta evaluación.
                    </p>
                  )}
                </div>

                {/* Detalle de la entrega evaluada */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-500 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-slate-400" />
                    <span>Evidencia entregada: <strong>{sub.fileName || sub.externalUrl || 'Archivo digital'}</strong></span>
                  </div>
                  {(sub.driveUrl || sub.driveFileUrl) && (
                    <a
                      href={sub.driveUrl || sub.driveFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#39A900] hover:underline font-bold text-xs flex items-center gap-1"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      Ver en Google Drive
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
