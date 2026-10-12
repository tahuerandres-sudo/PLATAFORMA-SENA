/**
 * @license
 * SENA Learning Hub - Componente de Gestión de Archivos Adjuntos a Anuncios
 * PROMPT 48: Botón "Adjuntar archivos", drag & drop, lista con progreso y eliminación
 */

import React, { useRef, useState } from 'react';
import {
  Paperclip,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileSpreadsheet,
  FileCode,
  File,
  X,
  AlertCircle,
  HardDrive,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import {
  ANNOUNCEMENT_FILE_LIMITS,
  validateAnnouncementFile,
  verifyFileMagicBytes,
  formatFileSize,
} from '../../services/announcements/announcementAttachmentService';

export interface PendingAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  progress: number; // 0 a 100
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
  driveFileId?: string;
  viewUrl?: string;
  downloadUrl?: string;
  storageProvider?: 'drive' | 'firestore';
}

interface AnnouncementAttachmentFieldProps {
  files: PendingAttachment[];
  onFilesChange: (files: PendingAttachment[]) => void;
  disabled?: boolean;
  isDriveConnected?: boolean;
  onConnectDrive?: () => void;
}

export const getFileIcon = (fileName: string, mimeType?: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return <FileText className="w-4 h-4 text-rose-500" />;
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return <FileText className="w-4 h-4 text-blue-500" />;
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return <FileCode className="w-4 h-4 text-orange-500" />;
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png'))
    return <ImageIcon className="w-4 h-4 text-indigo-500" />;
  if (lower.endsWith('.mp4')) return <Video className="w-4 h-4 text-purple-500" />;
  if (lower.endsWith('.mp3') || lower.endsWith('.wav')) return <Music className="w-4 h-4 text-amber-500" />;
  return <File className="w-4 h-4 text-slate-500" />;
};

export const AnnouncementAttachmentField: React.FC<AnnouncementAttachmentFieldProps> = ({
  files,
  onFilesChange,
  disabled = false,
  isDriveConnected = false,
  onConnectDrive,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFiles = async (incomingFiles: FileList | File[]) => {
    setErrorMessage(null);
    const newItems: PendingAttachment[] = [...files];

    if (newItems.length + incomingFiles.length > ANNOUNCEMENT_FILE_LIMITS.maxFilesPerAnnouncement) {
      setErrorMessage(
        `Límite excedido: Solo puedes adjuntar un máximo de ${ANNOUNCEMENT_FILE_LIMITS.maxFilesPerAnnouncement} archivos por anuncio.`
      );
      return;
    }

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];

      // Evitar duplicados por nombre y tamaño
      const isDuplicate = newItems.some((f) => f.name === file.name && f.size === file.size);
      if (isDuplicate) {
        continue;
      }

      // Validar tipo y tamaño
      const validation = await verifyFileMagicBytes(file);
      if (!validation.isValid) {
        setErrorMessage(validation.errorMessage || `El archivo ${file.name} no es válido.`);
        continue;
      }

      newItems.push({
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        name: file.name,
        size: file.size,
        mimeType: validation.detectedMimeType || file.type || 'application/octet-stream',
        progress: 0,
        status: 'pending',
      });
    }

    onFilesChange(newItems);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    if (disabled) return;
    setErrorMessage(null);
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      {/* Encabezado de la sección */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#00324D]">
          <Paperclip className="w-3.5 h-3.5 text-[#39A900]" />
          <span>Archivos adjuntos</span>
          <span className="text-[10px] font-normal text-slate-500">
            ({files.length}/{ANNOUNCEMENT_FILE_LIMITS.maxFilesPerAnnouncement} máx. · hasta 10 MB c/u)
          </span>
        </div>

        {onConnectDrive && !isDriveConnected && (
          <button
            type="button"
            onClick={onConnectDrive}
            className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
            title="Conectar Google Drive para alojar adjuntos en la jerarquía oficial SENA"
          >
            <HardDrive className="w-3 h-3 text-blue-600" />
            <span>Google Drive opcional</span>
          </button>
        )}
      </div>

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        disabled={disabled || files.length >= ANNOUNCEMENT_FILE_LIMITS.maxFilesPerAnnouncement}
        onChange={(e) => {
          if (e.target.files) {
            handleSelectFiles(e.target.files);
            e.target.value = '';
          }
        }}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.mp3,.wav,.mp4,.txt"
      />

      {/* Zona Drag & Drop / Botón de adjuntar */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border border-dashed rounded-xl p-3 text-center transition-all ${
          isDragging
            ? 'border-[#39A900] bg-emerald-50/60'
            : 'border-slate-300 bg-slate-50/40 hover:bg-slate-50'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            disabled={disabled || files.length >= ANNOUNCEMENT_FILE_LIMITS.maxFilesPerAnnouncement}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#39A900]" />
            <span>Adjuntar archivos</span>
          </button>
          <span className="text-[11px] text-slate-500">o arrastra aquí tus archivos</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          PDF, Word, Excel, PowerPoint, Imágenes JPG/PNG, Audio MP3/WAV, Video MP4 o TXT.
        </p>
      </div>

      {/* Mensaje de error / validación */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Lista de archivos seleccionados */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-1.5 rounded-md bg-slate-100 shrink-0">
                  {getFileIcon(item.name, item.mimeType)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 truncate text-xs" title={item.name}>
                      {item.name}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {formatFileSize(item.size)}
                    </span>
                  </div>

                  {/* Estado / Progreso */}
                  {item.status === 'uploading' && (
                    <div className="mt-1 space-y-0.5">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#39A900] h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Cargando adjunto...</span>
                        <span>{item.progress}%</span>
                      </div>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#39A900]" />
                      <span>Listo para publicar</span>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{item.errorMessage || 'Error al procesar archivo'}</p>
                  )}
                </div>
              </div>

              {/* Botón de eliminar antes de publicar */}
              <button
                type="button"
                disabled={disabled || item.status === 'uploading'}
                onClick={() => handleRemoveFile(item.id)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                title="Eliminar archivo adjunto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
