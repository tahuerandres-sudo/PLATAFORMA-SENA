/**
 * @license
 * SENA Learning Hub - Componente Reutilizable de Subida de Evidencias a Google Drive
 * PROMPT 4: Requisitos 4, 11, 12, 13
 */

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  File,
  CheckCircle2,
  AlertCircle,
  X,
  HardDrive,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
} from 'lucide-react';
import { EvidenceType } from '../../types/academic';
import { getEvidenceTypeConfig } from '../../config/fileLimits';
import { evidenceValidationService } from '../../services/submissions/evidenceValidationService';
import { driveAuthService } from '../../services/drive/driveAuthService';
import { driveService, DriveUploadResult } from '../../services/drive/driveService';

interface EvidenceUploaderProps {
  expectedType: EvidenceType;
  maxFileSizeMb?: number;
  programName: string;
  fichaNumber: string;
  activityTitle: string;
  learnerName: string;
  instructorEmail?: string;
  onUploadSuccess: (result: DriveUploadResult) => void;
  disabled?: boolean;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({
  expectedType,
  maxFileSizeMb,
  programName,
  fichaNumber,
  activityTitle,
  learnerName,
  instructorEmail,
  onUploadSuccess,
  disabled = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedResult, setUploadedResult] = useState<DriveUploadResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = getEvidenceTypeConfig(expectedType);
  const effectiveMaxMb = maxFileSizeMb || config.defaultMaxFileSizeMb;

  // Manejar selección de archivo
  const handleFile = (file: File) => {
    setValidationError(null);
    setGeneralError(null);
    setUploadedResult(null);

    // Validación rigurosa según Requisitos 4 y 13
    const validation = evidenceValidationService.validateFile(
      file,
      expectedType,
      effectiveMaxMb
    );

    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'El archivo seleccionado no es válido.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUploadToDrive = async () => {
    if (!selectedFile) return;

    // Verificar si Google Drive está conectado
    if (!driveAuthService.isConnected()) {
      try {
        await driveAuthService.connectDrive();
      } catch (err: any) {
        setGeneralError(err.message || 'Se requiere autorizar Google Drive para almacenar la evidencia física.');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);
    setGeneralError(null);

    try {
      const result = await driveService.uploadEvidenceFile({
        file: selectedFile,
        programName,
        fichaNumber,
        activityTitle,
        learnerName,
        instructorEmail,
        onProgress: (pct) => setUploadProgress(pct),
      });

      setUploadedResult(result);
      onUploadSuccess(result);
    } catch (err: any) {
      console.error('[EvidenceUploader] Error subiendo evidencia a Google Drive:', err);
      setGeneralError(
        err.message ||
          'Ocurrió un error al transferir el archivo a Google Drive. Por favor verifica tu conexión y permisos.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setValidationError(null);
    setGeneralError(null);
    setUploadedResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* 1. Zona de Arrastrar y Soltar / Selección */}
      {!selectedFile && !uploadedResult && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer select-none ${
            dragActive
              ? 'border-[#39A900] bg-[#EBF8E7]/60 scale-[1.01]'
              : 'border-slate-300 hover:border-[#39A900] bg-slate-50/70 hover:bg-slate-50'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={config.allowedExtensions.join(',')}
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-[#00324D] shadow-xs flex items-center justify-center">
              <UploadCloud className="w-6 h-6 text-[#39A900]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Arrastra tu archivo aquí o <span className="text-[#2E8500] underline">selecciona desde tu dispositivo</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Tipo requerido: <strong className="text-slate-700">{config.label}</strong> ({config.allowedExtensions.join(', ')})
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Tamaño máximo permitido: <strong>{effectiveMaxMb} MB</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Mensaje de Error de Validación (Requisito 4) */}
      {validationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block">Tipo de archivo no permitido:</strong>
            <p className="text-[11px] text-rose-700 leading-relaxed mt-0.5">{validationError}</p>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-rose-500 hover:text-rose-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Archivo Seleccionado Listo para Subir (Requisito 11) */}
      {selectedFile && !uploadedResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 truncate">
              <div className="w-10 h-10 rounded-lg bg-[#EBF8E7] text-[#2E8500] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-slate-900 truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                  <span className="font-mono">{formatFileSize(selectedFile.size)}</span>
                  <span>·</span>
                  <span className="font-bold text-[#2E8500] uppercase">{config.label}</span>
                </div>
              </div>
            </div>

            {!isUploading && (
              <button
                onClick={handleClearSelection}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Quitar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Barra de Progreso durante la Subida */}
          {isUploading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#39A900]" />
                  Transfiriendo a Google Drive...
                </span>
                <span className="font-mono text-[#00324D]">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                <div
                  className="h-full bg-linear-to-r from-[#39A900] to-[#8CE665] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Botón de Confirmación de Subida a Google Drive */}
          {!isUploading && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                Destino: SENA Learning Hub / {fichaNumber}
              </span>
              <button
                onClick={handleUploadToDrive}
                className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5" />
                Subir Evidencia a Google Drive
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Resultado Exitoso de Subida (Requisito 16) */}
      {uploadedResult && (
        <div className="p-4 bg-[#EBF8E7] border border-[#39A900]/40 rounded-xl space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#39A900]" />
              <strong className="text-xs text-[#00324D]">Evidencia subida correctamente a Google Drive</strong>
            </div>
            <span className="text-[10px] font-mono text-[#2E8500] bg-white px-2 py-0.5 rounded border border-[#39A900]/30 font-bold">
              ID: {uploadedResult.driveFileId.slice(0, 8)}...
            </span>
          </div>

          <p className="text-[11px] text-slate-600">
            Archivo: <strong>{uploadedResult.fileName}</strong> ({formatFileSize(uploadedResult.fileSize)})
          </p>

          {uploadedResult.sharedWithInstructor && uploadedResult.sharedInstructorEmail && (
            <div className="text-[11px] text-[#2E8500] bg-white/80 px-2.5 py-1 rounded-md border border-[#39A900]/30 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#39A900] shrink-0" />
              <span>Acceso de lectura (reader) concedido al instructor: <strong>{uploadedResult.sharedInstructorEmail}</strong></span>
            </div>
          )}

          <div className="pt-1 flex items-center justify-between text-xs">
            <a
              href={uploadedResult.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00324D] hover:underline font-bold inline-flex items-center gap-1"
            >
              Abrir archivo en Google Drive
              <FileText className="w-3.5 h-3.5 text-[#39A900]" />
            </a>
            <button
              onClick={handleClearSelection}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Cambiar archivo
            </button>
          </div>
        </div>
      )}

      {/* 5. Mensaje de Error General */}
      {generalError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}
    </div>
  );
};
