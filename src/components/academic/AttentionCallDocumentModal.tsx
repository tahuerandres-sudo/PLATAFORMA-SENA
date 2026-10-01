/**
 * @license
 * SENA Learning Hub - Documento Imprimible Oficial de Llamado de Atención
 * Estructura idéntica al formato institucional oficial SENA (Regional Tolima - Centro Comercio y Servicios)
 * Alta fidelidad tipográfica, soporte para imagen personalizada del Logo SENA,
 * exportación a PDF de ultra alta resolución (300 DPI) y líneas de firmas completas.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Printer,
  Download,
  X,
  Edit3,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { AttentionCall } from '../../types/academic';
import { SenaLogo } from '../common/SenaLogo';
import { trackingService } from '../../services/academic/trackingService';
import {
  getCustomSenaLogo,
  setCustomSenaLogo,
  clearCustomSenaLogo,
} from '../../utils/senaLogoStorage';

interface AttentionCallDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: AttentionCall | null;
  onEdit?: (call: AttentionCall) => void;
  onCallUpdated?: (updatedCall: AttentionCall) => void;
}

export const AttentionCallDocumentModal: React.FC<AttentionCallDocumentModalProps> = ({
  isOpen,
  onClose,
  call,
  onEdit,
  onCallUpdated,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [apprenticeObservations, setApprenticeObservations] = useState(
    call?.apprenticeObservations || ''
  );
  const [isSavingObservations, setIsSavingObservations] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(() => getCustomSenaLogo());

  useEffect(() => {
    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      setCustomLogo(customEvent.detail !== undefined ? customEvent.detail : getCustomSenaLogo());
    };
    window.addEventListener('sena_logo_updated', handleLogoUpdate);
    return () => {
      window.removeEventListener('sena_logo_updated', handleLogoUpdate);
    };
  }, []);

  if (!isOpen || !call) return null;

  const handlePrint = () => {
    window.print();
  };

  // Carga de imagen del logo SENA
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomSenaLogo(dataUrl);
        setCustomLogo(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Restablecer al logo vectorial oficial
  const handleResetLogo = () => {
    clearCustomSenaLogo();
    setCustomLogo(null);
  };

  // Descarga directa del documento como archivo PDF con calidad de imprenta (300 DPI)
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloadingPdf(true);

    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 3, // 300 DPI ultra-nítido
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          const printable = clonedDoc.getElementById('printable-attention-call');
          if (printable) {
            printable.style.backgroundColor = '#ffffff';
            printable.style.color = '#000000';
            const allElements = printable.querySelectorAll('*');
            allElements.forEach((node) => {
              const el = node as HTMLElement;
              if (el && el.style) {
                const comp = window.getComputedStyle(el);
                if (comp.color && comp.color.includes('oklch')) {
                  el.style.color = '#000000';
                }
                if (comp.backgroundColor && comp.backgroundColor.includes('oklch')) {
                  el.style.backgroundColor = 'transparent';
                }
                if (comp.borderColor && comp.borderColor.includes('oklch')) {
                  el.style.borderColor = '#000000';
                }
              }
            });
          }
        },
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
        compress: true,
      });

      const imgWidth = 215.9; // Ancho carta estándar en mm
      const pageHeight = 279.4; // Alto carta estándar en mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');

      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const cleanDate = (call.date || '20260928').replace(/-/g, '');
      const cleanFicha = call.fichaNumber || call.fichaId?.replace('ficha_', '') || '3405298';
      const cleanName = (call.learnerName || 'APRENDIZ').toUpperCase().replace(/\s+/g, '_');
      const fileName = `LLA_${cleanDate}_${cleanFicha}_${cleanName}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('Error generando archivo PDF:', error);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Formato de fecha en texto largo en español (ej: "lunes, 28 de septiembre de 2026")
  const formatLongDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [year, month, day] = cleanDate.split('-');
      if (!year || !month || !day) return dateStr;
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return d.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleSaveObservations = async () => {
    setIsSavingObservations(true);
    try {
      const updated = await trackingService.updateAttentionCall(call.id, {
        apprenticeObservations,
      });
      if (onCallUpdated) {
        onCallUpdated(updated);
      }
    } catch (e) {
      console.error('Error guardando observaciones:', e);
    } finally {
      setIsSavingObservations(false);
    }
  };

  // Datos normalizados del llamado
  const centerName = call.centerName || 'Centro Comercio y Servicios';
  const regionalName = call.regionalName || 'Regional Tolima';
  const fichaNumber = call.fichaNumber || call.fichaId?.replace('ficha_', '') || '3405298';
  const programName = call.programName || call.courseName || 'GESTION CONTABLE Y DE INFORMACION FINANCIERA';
  const place = call.place || '2070D';
  const dateFormatted = formatLongDate(call.date);
  const learnerName = (call.learnerName || 'JUAN SEBASTIAN FERNANDEZ PRADA').toUpperCase();
  const learnerDocument = call.learnerDocument || '1030281506';
  const instructorName = (call.instructorName || 'ANDRES HUERTAS').toUpperCase();

  // Texto reglamentario del motivo
  const normativeArticle =
    call.normativeArticle ||
    (call.type === 'TARDANZA'
      ? 'Llegadas tarde\nNo cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n5. Asistir con puntualidad a todas las actividades propias del proceso de formación.\nDía y hora: 28/09/2026 17:50'
      : 'Inasistencias\nNo cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n7. Justificar debidamente las inasistencias o incumplimientos a las actividades de la formación, en los términos establecidos en el presente reglamento.');

  const improvementPlan =
    call.improvementPlan ||
    'El aprendiz deberá\n1. Imprimir, firmar y entregar este llamado de atención al instructor.\n2. Realizar orientaciones académicas: CARTELERA SOBRE la puntualidad (INGLES Y ESPAÑOL). presentar en dos ambientes de formación subir fotos (evidencias) a Google classroom (sección de anuncios)\n3. Presentar por escrito una propuesta y para mejorar su puntualidad. (evidencias) a Google classroom (sección de anuncios)';

  // Código de referencia institucional
  const dateClean = (call.date || '20260928').replace(/-/g, '');
  const refCode = `LLA_${dateClean}_${fichaNumber}_${learnerName.replace(/\s+/g, '_')}`;

  const nowPrintTime =
    new Date().toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'numeric',
      year: '2-digit',
    }) +
    ', ' +
    new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[96vh]">
        {/* Barra superior de herramientas (no se imprime) */}
        <div className="bg-[#00324D] text-white p-3.5 px-6 flex items-center justify-between shrink-0 print:hidden flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#8CE665]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Acta Oficial de Llamado de Atención
              </h3>
              <p className="text-[11px] text-slate-300">
                Formato Institucional SENA · Documento Oficial en Alta Resolución
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Opción para cargar imagen personalizada del Logo SENA */}
            <label
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Cargar imagen personalizada del Logo SENA (PNG, JPG, SVG)"
            >
              <Upload className="w-3.5 h-3.5 text-[#8CE665]" />
              <span>{customLogo ? 'Cambiar Logo' : 'Cargar Logo SENA'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>

            {customLogo && (
              <button
                type="button"
                onClick={handleResetLogo}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                title="Restablecer logo vectorial oficial del SENA"
              >
                <RotateCcw className="w-3 h-3" />
                Original
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(call);
                }}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                Editar Plan
              </button>
            )}

            {/* Botón Descargar PDF directo */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Guardar y Descargar archivo PDF en su equipo"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isDownloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </button>

            {/* Botón Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Imprimir documento"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer ml-1"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Documento Imprimible (Tipografía y calidad institucional oficial) */}
        <div className="overflow-y-auto grow p-4 sm:p-8 print:p-0" style={{ backgroundColor: '#f1f5f9' }}>
          <div
            ref={printRef}
            id="printable-attention-call"
            className="max-w-[780px] mx-auto p-10 sm:p-14 leading-normal print:shadow-none print:border-none print:p-8 print:max-w-none print:w-full"
            style={{
              fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
              fontSize: '11px',
              color: '#000000',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '2px',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.08)',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textRendering: 'optimizeLegibility',
            }}
          >
            {/* Cabecera técnica de impresión */}
            <div
              className="flex justify-between items-center pb-4 font-mono"
              style={{ fontSize: '9.5px', color: '#374151' }}
            >
              <span>{nowPrintTime}</span>
              <span className="font-bold tracking-tight">{refCode}</span>
            </div>

            {/* Logo SENA Oficial / Personalizado y Encabezado Institucional Centrado */}
            <div className="text-center pt-1 pb-3 space-y-1">
              <div className="flex justify-center mb-1.5">
                <SenaLogo width={52} height={52} showText={true} />
              </div>
              <h2
                className="font-bold tracking-tight leading-tight uppercase"
                style={{ fontSize: '13px', color: '#111827', letterSpacing: '0.03em' }}
              >
                {centerName}
              </h2>
              <h3
                className="font-bold leading-tight uppercase"
                style={{ fontSize: '12px', color: '#1f2937', letterSpacing: '0.02em' }}
              >
                {regionalName}
              </h3>
              <h1
                className="font-black uppercase tracking-wider pt-1.5"
                style={{ fontSize: '13.5px', color: '#000000', letterSpacing: '0.05em' }}
              >
                LLAMADO DE ATENCION
              </h1>
            </div>

            {/* Metadatos: GRUPO, FICHA, LUGAR, FECHA, NOMBRES, DOCUMENTO */}
            <div
              className="pt-3 pb-3 space-y-1.5"
              style={{
                fontSize: '11px',
                color: '#000000',
                borderTop: '1px solid #9ca3af',
                borderBottom: '1px solid #9ca3af',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div>
                  <strong style={{ fontWeight: 700 }}>GRUPO:</strong> {programName.toUpperCase()}
                </div>
                <div>
                  <strong style={{ fontWeight: 700 }}>FICHA:</strong> {fichaNumber}
                </div>
                <div>
                  <strong style={{ fontWeight: 700 }}>LUGAR:</strong> {place}
                </div>
                <div>
                  <strong style={{ fontWeight: 700 }}>FECHA:</strong> {dateFormatted}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-0.5">
                <div>
                  <strong style={{ fontWeight: 700 }}>NOMBRES Y APELLIDOS:</strong> {learnerName}
                </div>
                <div>
                  <strong style={{ fontWeight: 700 }}>DOCUMENTO:</strong> {learnerDocument}
                </div>
              </div>
            </div>

            {/* MOTIVO con artículos seleccionados */}
            <div className="pt-4 space-y-1.5" style={{ fontSize: '11px', color: '#000000' }}>
              <div
                className="font-bold uppercase tracking-tight"
                style={{ fontSize: '11.5px', color: '#000000' }}
              >
                MOTIVO:
              </div>
              <div
                className="whitespace-pre-wrap font-normal"
                style={{ color: '#000000', lineHeight: 1.6 }}
              >
                {normativeArticle}
              </div>
              <div className="pt-2" style={{ color: '#000000' }}>
                <strong style={{ fontWeight: 700 }}>INSTRUCTOR QUE HACE EL LLAMADO:</strong>{' '}
                {instructorName}
              </div>
            </div>

            {/* PLAN DE MEJORAMIENTO */}
            <div className="pt-5 space-y-1.5" style={{ fontSize: '11px', color: '#000000' }}>
              <div
                className="font-bold uppercase tracking-tight"
                style={{ fontSize: '11.5px', color: '#000000' }}
              >
                PLAN DE MEJORAMIENTO:
              </div>
              <div
                className="whitespace-pre-wrap font-normal"
                style={{ color: '#000000', lineHeight: 1.6 }}
              >
                {improvementPlan}
              </div>
            </div>

            {/* OBSERVACIONES QUE HACE EL APRENDIZ */}
            <div className="pt-5 space-y-1.5" style={{ fontSize: '11px', color: '#000000' }}>
              <div
                className="font-bold uppercase tracking-tight"
                style={{ fontSize: '11.5px', color: '#000000' }}
              >
                OBSERVACIONES QUE HACE EL APRENDIZ
              </div>
              <div
                className="rounded-xs h-28 p-2.5 relative"
                style={{
                  border: '1.5px solid #000000',
                  backgroundColor: '#ffffff',
                  fontSize: '11px',
                }}
              >
                <textarea
                  value={apprenticeObservations}
                  onChange={(e) => setApprenticeObservations(e.target.value)}
                  onBlur={handleSaveObservations}
                  placeholder="Espacio reservado para observaciones o descargos del aprendiz (escribir digitalmente o diligenciar a mano)..."
                  className="w-full h-full resize-none border-none outline-hidden bg-transparent font-sans leading-relaxed"
                  style={{ fontSize: '11px', color: '#000000', lineHeight: 1.5 }}
                />
              </div>
            </div>

            {/* FIRMAS INSTITUCIONALES (Conforme a formato oficial con líneas completas) */}
            <div className="pt-16 space-y-16" style={{ color: '#000000' }}>
              {/* Fila 1: Instructor y Aprendiz */}
              <div className="grid grid-cols-2 gap-10 text-center">
                {/* Columna Primer Llamado Instructor */}
                <div>
                  <div
                    style={{
                      borderTop: '1.5px solid #000000',
                      width: '100%',
                      marginBottom: '8px',
                    }}
                  ></div>
                  <div
                    className="font-bold uppercase tracking-wide"
                    style={{ fontSize: '11px', color: '#000000' }}
                  >
                    PRIMER LLAMADO INSTRUCTOR
                  </div>
                  <div
                    className="font-bold uppercase tracking-wide pt-0.5"
                    style={{ fontSize: '11px', color: '#000000' }}
                  >
                    {instructorName}
                  </div>
                </div>

                {/* Columna Aprendiz */}
                <div>
                  <div
                    style={{
                      borderTop: '1.5px solid #000000',
                      width: '100%',
                      marginBottom: '8px',
                    }}
                  ></div>
                  <div
                    className="font-bold uppercase tracking-wide"
                    style={{ fontSize: '11px', color: '#000000' }}
                  >
                    APRENDIZ
                  </div>
                  <div
                    className="font-bold uppercase tracking-wide pt-0.5"
                    style={{ fontSize: '11px', color: '#000000' }}
                  >
                    {learnerName} {learnerDocument}
                  </div>
                </div>
              </div>

              {/* Fila 2: Coordinador Académico y Comité de Evaluación con sus líneas de firma */}
              <div className="grid grid-cols-2 gap-10 text-center">
                {/* Columna Segundo Llamado Coordinador Académico */}
                <div>
                  <div
                    style={{
                      borderTop: '1.5px solid #000000',
                      width: '100%',
                      marginBottom: '8px',
                    }}
                  ></div>
                  <div
                    className="font-bold uppercase tracking-wide"
                    style={{ fontSize: '10.5px', color: '#000000' }}
                  >
                    SEGUNDO LLAMADO COORDINADOR ACADÉMICO
                  </div>
                </div>

                {/* Columna Tercer Llamado Subdirector - Comité de Evaluación */}
                <div>
                  <div
                    style={{
                      borderTop: '1.5px solid #000000',
                      width: '100%',
                      marginBottom: '8px',
                    }}
                  ></div>
                  <div
                    className="font-bold uppercase tracking-wide"
                    style={{ fontSize: '10.5px', color: '#000000' }}
                  >
                    TERCER LLAMADO SUBDIRECTOR – COMITÉ EVALUACIÓN
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de página sutil tipo impresión de navegador */}
            <div
              className="flex justify-between items-center pt-10 font-mono"
              style={{ fontSize: '9px', color: '#6b7280' }}
            >
              <span>about:blank</span>
              <span>1/1</span>
            </div>
          </div>
        </div>

        {/* Footer modal (no se imprime) */}
        <div className="p-3.5 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Estado: <strong className="text-slate-800">{call.status}</strong>
            </span>
            {isSavingObservations && (
              <span className="text-[11px] text-[#39A900] font-semibold animate-pulse">
                Guardando observaciones...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-5 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isDownloadingPdf ? 'Generando PDF (300 DPI)...' : 'Guardar y Descargar PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
