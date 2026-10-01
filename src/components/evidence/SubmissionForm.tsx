/**
 * @license
 * SENA Learning Hub - Formulario Integral de Entrega de Evidencia (Aprendiz)
 * PROMPT 4: Requisitos 5, 6, 14, 15, 16, 19
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Youtube,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Calendar,
  Clock,
  Send,
  Eye,
  RefreshCw,
  AlignLeft,
  ShieldAlert,
} from 'lucide-react';
import { EvidenceActivity, AcademicSubmission, Enrollment } from '../../types/academic';
import { getEvidenceTypeConfig } from '../../config/fileLimits';
import { EvidenceUploader } from './EvidenceUploader';
import { evidenceValidationService } from '../../services/submissions/evidenceValidationService';
import { submissionService } from '../../services/submissions/submissionService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { DriveUploadResult } from '../../services/drive/driveService';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../ui/StatusBadge';

interface SubmissionFormProps {
  activity: EvidenceActivity;
  existingSubmission?: AcademicSubmission | null;
  onSubmissionComplete: (submission: AcademicSubmission) => void;
  onCancel?: () => void;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  activity,
  existingSubmission: initialSubmission,
  onSubmissionComplete,
  onCancel,
}) => {
  const { userProfile, currentUser } = useAuth();
  const [submission, setSubmission] = useState<AcademicSubmission | null>(
    initialSubmission || null
  );
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  // Estados de entrada según tipo
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [commentsInput, setCommentsInput] = useState('');

  // Estado de archivo subido a Google Drive
  const [driveResult, setDriveResult] = useState<DriveUploadResult | null>(null);

  // Estados de control
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [restrictionError, setRestrictionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const config = getEvidenceTypeConfig(activity.submissionType);
  const learnerId = currentUser?.uid || userProfile?.uid || '';
  const learnerName = userProfile?.displayName || currentUser?.displayName || userProfile?.email || 'Aprendiz SENA';
  const learnerEmail = userProfile?.email || currentUser?.email || '';
  const targetInstructorEmail = activity.instructorEmail || 'TAHUER.ANDRES@gmail.com';

  // Cargar matrícula activa real del aprendiz
  useEffect(() => {
    async function loadEnrollment() {
      if (!learnerId) return;
      try {
        const enr = await enrollmentService.getEnrollmentByLearnerId(learnerId);
        if (enr) setEnrollment(enr);
      } catch (err) {
        console.warn('[SubmissionForm] Error cargando matrícula:', err);
      }
    }
    loadEnrollment();
  }, [learnerId]);

  // Verificar si el aprendiz tiene restricción para subir evidencias (Requisito 19)
  useEffect(() => {
    async function checkRestriction() {
      if (!learnerId) return;
      const check = await submissionService.canSubmitEvidence(learnerId, activity.id);
      if (!check.allowed) {
        setRestrictionError(check.reason || 'Restricción académica activa.');
      } else {
        setRestrictionError(null);
      }
    }
    checkRestriction();
  }, [learnerId, activity.id]);

  // Si ya existía una entrega, precargar datos
  useEffect(() => {
    if (initialSubmission) {
      setSubmission(initialSubmission);
      if (initialSubmission.externalUrl) setUrlInput(initialSubmission.externalUrl);
      if (initialSubmission.textContent) setTextInput(initialSubmission.textContent);
      if (initialSubmission.comments) setCommentsInput(initialSubmission.comments);
    }
  }, [initialSubmission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    if (restrictionError) {
      return;
    }

    if (!learnerId) {
      setValidationError('No se identificó un usuario aprendiz autenticado.');
      return;
    }

    const now = new Date().toISOString();

    // 1. Validaciones según el tipo de evidencia
    if (activity.submissionType === 'youtube_link') {
      const validation = evidenceValidationService.validateYouTubeUrl(urlInput);
      if (!validation.isValid) {
        setValidationError(validation.errorMessage || 'URL de YouTube no válida.');
        return;
      }
    } else if (activity.submissionType === 'canva_link') {
      const validation = evidenceValidationService.validateCanvaUrl(urlInput);
      if (!validation.isValid) {
        setValidationError(validation.errorMessage || 'Enlace de Canva no válido.');
        return;
      }
    } else if (activity.submissionType === 'external_link') {
      const validation = evidenceValidationService.validateExternalUrl(urlInput);
      if (!validation.isValid) {
        setValidationError(validation.errorMessage || 'Enlace web no válido.');
        return;
      }
    } else if (activity.submissionType === 'text') {
      const validation = evidenceValidationService.validateTextSubmission(textInput);
      if (!validation.isValid) {
        setValidationError(validation.errorMessage || 'Texto insuficiente.');
        return;
      }
    } else if (config.isFile && !driveResult) {
      setValidationError('Debes seleccionar y subir el archivo físico a Google Drive antes de radicar la entrega.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalSub: AcademicSubmission;

      if (initialSubmission && (initialSubmission.status === 'correction_required' || initialSubmission.status === 'not_approved' || initialSubmission.grade === 'C' || initialSubmission.grade === 'N')) {
        finalSub = await submissionService.resubmitEvidence(initialSubmission.id, {
          driveFileId: driveResult?.driveFileId,
          driveUrl: driveResult?.driveUrl,
          driveFileUrl: driveResult?.driveUrl,
          fileName: driveResult?.fileName,
          fileSize: driveResult?.fileSize,
          mimeType: driveResult?.mimeType,
          externalUrl: urlInput ? urlInput.trim() : undefined,
          textContent: textInput ? textInput.trim() : undefined,
          comments: commentsInput ? commentsInput.trim() : undefined,
        });
        setSuccessMessage('¡Nueva versión corregida enviada exitosamente a Google Drive!');
      } else {
        finalSub = await submissionService.createSubmission({
          activityId: activity.id,
          learnerId,
          userId: learnerId,
          learnerName,
          learnerEmail,
          enrollmentId: enrollment?.id || '',
          fichaId: activity.fichaId,
          programId: activity.programId || enrollment?.programId || '',
          courseId: activity.courseId,
          competencyId: activity.competencyId,
          learningOutcomeId: activity.learningOutcomeId,
          submittedAt: now,
          status: 'submitted',
          submissionType: activity.submissionType,
          platform:
            activity.submissionType === 'youtube_link'
              ? 'youtube'
              : activity.submissionType === 'canva_link'
              ? 'canva'
              : config.isFile
              ? 'drive'
              : 'other',
          externalUrl: urlInput ? urlInput.trim() : undefined,
          textContent: textInput ? textInput.trim() : undefined,
          comments: commentsInput ? commentsInput.trim() : undefined,
          fileName: driveResult?.fileName,
          fileSize: driveResult?.fileSize,
          mimeType: driveResult?.mimeType,
          driveFileId: driveResult?.driveFileId,
          driveUrl: driveResult?.driveUrl,
          driveFileUrl: driveResult?.driveUrl,
          driveFolderId: driveResult?.folderId,
          drivePath: driveResult?.structuredPath,
          instructorEmail: targetInstructorEmail,
          instructorId: activity.instructorId || activity.createdBy || '',
        });
        setSuccessMessage('¡Evidencia entregada con éxito! Tu instructor podrá consultarla y evaluarla.');
      }

      setSubmission(finalSub);
      onSubmissionComplete(finalSub);
    } catch (err: any) {
      setValidationError(err.message || 'Error al guardar la entrega.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Tarjeta con Detalles Pedagógicos de la Actividad (Requisito 15) */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${config.badgeClass}`}>
            Evidencia Requerida: {config.label}
          </span>
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#39A900]" />
            Fecha Límite:{' '}
            <strong className="text-slate-800">
              {activity.dueDate
                ? new Date(activity.dueDate).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Sin fecha límite'}
            </strong>
          </span>
        </div>

        <div>
          <h2 className="text-base font-bold text-[#00324D]">{activity.title}</h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activity.description}</p>
        </div>

        {/* Instrucciones */}
        <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Instrucciones para la entrega:
          </span>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {activity.instructions}
          </p>
        </div>
      </div>

      {/* 2. Banner de Restricción Académica (Requisitos 9 y 13) */}
      {restrictionError && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-bold text-sm text-rose-800">
              Formulario bloqueado por Restricción Académica Activa
            </strong>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">
              {restrictionError}
            </p>
            <div className="pt-2 text-[11px] text-rose-800 border-t border-rose-200 mt-2">
              <strong>Instrucciones para levantar la restricción:</strong>
              <p className="mt-0.5">
                1. Dirígete a la sección <strong>"Asistencia y Justificaciones"</strong> en tu panel de aprendiz.
                <br />
                2. Radica una justificación formal adjuntando el soporte documental correspondiente.
                <br />
                3. Una vez tu instructor apruebe la justificación, la restricción será levantada y se habilitará de nuevo la entrega de evidencias.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Evidencia ya Entregada por el Aprendiz (Requisito 16) */}
      {submission && (
        <div className="bg-white rounded-xl border-2 border-emerald-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#39A900]" />
              <span>Evidencia Radicada</span>
            </div>
            <StatusBadge status={submission.status} size="sm" />
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs text-slate-700">
            {submission.fileName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Archivo:</span>
                <span className="font-bold text-slate-800">{submission.fileName}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tipo de entrega:</span>
              <span className="font-semibold uppercase">{config.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Fecha de entrega:</span>
              <span className="font-mono text-slate-600">{new Date(submission.submittedAt).toLocaleString()}</span>
            </div>
            {submission.drivePath && (
              <div className="pt-1 text-[10px] text-slate-400 font-mono truncate">
                Ruta Drive: {submission.drivePath}
              </div>
            )}
          </div>

          {/* Enlace Oficial "Ver Evidencia" (Requisito 16) */}
          <div className="pt-2 flex items-center justify-between">
            {submission.driveUrl ? (
              <a
                href={submission.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <HardDrive className="w-3.5 h-3.5 text-[#8CE665]" />
                Ver evidencia en Google Drive
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            ) : submission.externalUrl ? (
              <a
                href={submission.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                {submission.platform === 'youtube' ? (
                  <Youtube className="w-4 h-4 text-white" />
                ) : (
                  <ExternalLink className="w-4 h-4 text-white" />
                )}
                Ver evidencia externa
              </a>
            ) : null}

            {submission.status === 'correction_required' && (
              <div className="mt-3 p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Esta evidencia requiere corrección.</span>
                </div>
                {submission.feedback && (
                  <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-amber-950 italic">
                    <strong className="block font-bold text-amber-900 not-italic">
                      Retroalimentación del Instructor:
                    </strong>
                    "{submission.feedback}"
                    {submission.gradedAt && (
                      <span className="block text-[10px] text-amber-700 not-italic mt-1">
                        Evaluado el: {new Date(submission.gradedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-amber-800">
                    Sube la nueva versión corregida para enviar a tu instructor:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubmission(null)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Enviar Nueva Versión
                  </button>
                </div>
              </div>
            )}

            {submission.status === 'not_approved' && (
              <div className="mt-3 p-3.5 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Resultado: N — No Aprobado</span>
                </div>
                {submission.feedback && (
                  <div className="bg-white/80 p-2.5 rounded-lg border border-rose-200 text-rose-950 italic">
                    <strong className="block font-bold text-rose-900 not-italic">
                      Retroalimentación del Instructor:
                    </strong>
                    "{submission.feedback}"
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-rose-800">
                    Posibilidad de nueva entrega habilitada para nivelación:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubmission(null)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reenviar Evidencia
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Formulario de Entrega si no ha sido entregada */}
      {!submission && !restrictionError && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mensajes de Validación */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-[#EBF8E7] border border-[#39A900]/40 rounded-xl text-xs text-[#2E8500] flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Caso A: Archivos con subida a Google Drive (PDF, Imagen, Video, Audio, Documentos, etc.) */}
          {config.isFile && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Archivo Requerido ({config.label}) *
              </label>
              <EvidenceUploader
                expectedType={activity.submissionType}
                maxFileSizeMb={activity.maxFileSize}
                programName={activity.programId || 'Gestión Contable'}
                fichaNumber={activity.fichaId.replace('ficha_', '')}
                activityTitle={activity.title}
                learnerName={learnerName}
                instructorEmail={targetInstructorEmail}
                onUploadSuccess={(result) => {
                  setDriveResult(result);
                  setValidationError(null);
                }}
              />
            </div>
          )}

          {/* Caso B: YouTube Link */}
          {activity.submissionType === 'youtube_link' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-600" />
                Enlace de Video de YouTube *
              </label>
              <input
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white text-slate-800"
              />
              <p className="text-[11px] text-slate-500">
                Asegúrate de que el video esté configurado como <strong>Oculto</strong> o <strong>Público</strong> para que el instructor pueda reproducirlo.
              </p>
            </div>
          )}

          {/* Caso C: Canva Link */}
          {activity.submissionType === 'canva_link' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-cyan-600" />
                Enlace Público de Canva *
              </label>
              <input
                type="url"
                required
                placeholder="https://www.canva.com/design/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white text-slate-800"
              />
              <p className="text-[11px] text-slate-500">
                Comparte el enlace con permisos de "Cualquiera con el enlace puede ver".
              </p>
            </div>
          )}

          {/* Caso D: External Link */}
          {activity.submissionType === 'external_link' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Enlace Web Externo *
              </label>
              <input
                type="url"
                required
                placeholder="https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white text-slate-800"
              />
            </div>
          )}

          {/* Caso E: Texto en línea */}
          {activity.submissionType === 'text' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Respuesta en Línea *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Redacta aquí tu evidencia..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white text-slate-800"
              />
            </div>
          )}

          {/* Comentarios Opcionales */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Comentarios o aclaraciones para el instructor (Opcional):
            </label>
            <textarea
              rows={2}
              placeholder="Mensaje adjunto sobre tu entrega..."
              value={commentsInput}
              onChange={(e) => setCommentsInput(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white text-slate-800"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ml-auto"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Registrando entrega...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Entregar Evidencia
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
