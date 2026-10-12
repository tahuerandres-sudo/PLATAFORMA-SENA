/**
 * @license
 * SENA Learning Hub - Componente para Visualizar y Descargar Adjuntos de Anuncios
 * PROMPT 48: Lista de adjuntos en tarjetas de anuncios con descarga segura y vista previa
 */

import React from 'react';
import { Download, ExternalLink, Paperclip } from 'lucide-react';
import { AnnouncementAttachment } from '../../types/academic';
import { formatFileSize } from '../../services/announcements/announcementAttachmentService';
import { getFileIcon } from './AnnouncementAttachmentField';

interface AnnouncementAttachmentsListProps {
  attachments?: AnnouncementAttachment[];
  className?: string;
}

export const AnnouncementAttachmentsList: React.FC<AnnouncementAttachmentsListProps> = ({
  attachments,
  className = '',
}) => {
  if (!attachments || attachments.length === 0) return null;

  const handleDownload = (att: AnnouncementAttachment) => {
    // Si tiene downloadUrl (ej: data: o enlace de descarga)
    if (att.downloadUrl) {
      const a = document.createElement('a');
      a.href = att.downloadUrl;
      a.download = att.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Si tiene vista previa en Drive
    if (att.viewUrl) {
      window.open(att.viewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`mt-3 pt-3 border-t border-slate-100 space-y-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
        <Paperclip className="w-3.5 h-3.5 text-[#39A900]" />
        <span>Archivos adjuntos ({attachments.length}):</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((att) => {
          const directUrl = att.viewUrl || att.downloadUrl;

          return (
            <div
              key={att.id}
              className="group bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition-all text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-1.5 bg-white rounded-lg shadow-2xs border border-slate-200/60 shrink-0">
                  {getFileIcon(att.fileName, att.mimeType)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-semibold text-slate-800 truncate text-xs group-hover:text-[#00324D]"
                    title={att.fileName}
                  >
                    {att.fileName}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>{formatFileSize(att.fileSize)}</span>
                    {att.storageProvider === 'drive' && (
                      <span className="text-blue-600 font-medium">Google Drive</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de acción: Descargar y/o Abrir */}
              <div className="flex items-center gap-1 shrink-0">
                {directUrl && (
                  <a
                    href={directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-white hover:bg-[#39A900] text-slate-600 hover:text-white rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                    title={`Abrir ${att.fileName}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => handleDownload(att)}
                  className="p-1.5 bg-white hover:bg-[#00324D] text-slate-600 hover:text-white rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                  title={`Descargar ${att.fileName}`}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
