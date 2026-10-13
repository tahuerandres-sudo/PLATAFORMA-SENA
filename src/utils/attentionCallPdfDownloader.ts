/**
 * @license
 * SENA Learning Hub - Utilidad para Generar y Descargar PDF de Llamados de Atención
 * Compatible con la especificación oficial del formato SENA y descarga directa desde cualquier vista.
 */

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { AttentionCall } from '../types/academic';
import { getCustomSenaLogo } from './senaLogoStorage';

/**
 * Genera y descarga el archivo PDF de un llamado de atención oficial del SENA.
 * Nombre del archivo: Llamado_Atencion_NombreAprendiz_Fecha.pdf
 */
export async function downloadAttentionCallPdf(
  call: AttentionCall,
  sourceElement?: HTMLElement | null
): Promise<void> {
  let elementToCapture: HTMLElement | null = sourceElement || null;
  let tempContainer: HTMLElement | null = null;

  // Si no se suministra un elemento rendered, crear un contenedor temporal oculto
  if (!elementToCapture) {
    tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '800px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.zIndex = '-1000';
    tempContainer.innerHTML = buildAttentionCallPrintHtml(call);
    document.body.appendChild(tempContainer);
    elementToCapture = tempContainer;
  }

  try {
    const canvas = await html2canvas(elementToCapture, {
      scale: 3, // 300 DPI nítido para impresión A4 / carta
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 0,
      onclone: (clonedDoc) => {
        const printable = clonedDoc.getElementById('printable-attention-call') || clonedDoc.body;
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
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210; // A4 ancho en mm
    const pageHeight = 297; // A4 alto en mm
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    const cleanDate = (call.date || new Date().toISOString().split('T')[0]).replace(/-/g, '_');
    const cleanName = (call.learnerName || 'Aprendiz')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_');
    const fileName = `Llamado_Atencion_${cleanName}_${cleanDate}.pdf`;

    pdf.save(fileName);
  } finally {
    if (tempContainer && tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
  }
}

/**
 * Plantilla HTML institucional para generar la captura de impresión idéntica al formato oficial SENA
 */
function buildAttentionCallPrintHtml(call: AttentionCall): string {
  const customLogo = getCustomSenaLogo();
  const centerName = call.centerName || 'Centro de Formación SENA';
  const regionalName = call.regionalName || 'Regional SENA';
  const fichaNumber = call.fichaNumber || call.fichaId?.replace('ficha_', '') || '—';
  const programName = call.programName || call.courseName || 'Programa de Formación SENA';
  const place = call.place || 'Ambiente de Aprendizaje';
  const dateStr = call.date || new Date().toISOString().split('T')[0];
  const learnerName = (call.learnerName || 'Aprendiz').toUpperCase();
  const learnerDocument = call.learnerDocument || '—';
  const instructorName = (call.instructorName || 'Instructor SENA').toUpperCase();

  const normativeArticle =
    call.normativeArticle ||
    (call.type === 'TARDANZA'
      ? 'No cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n5. Asistir con puntualidad a todas las actividades propias del proceso de formación.'
      : 'No cumplimiento del CAPÍTULO III. Artículo 8o. Deberes del aprendiz SENA\n7. Justificar debidamente las inasistencias o incumplimientos a las actividades de la formación.');

  const improvementPlan =
    call.improvementPlan ||
    'El aprendiz deberá presentar soporte de justificación formal o acordar un plan pedagógico de nivelación con el instructor.';

  return `
    <div id="printable-attention-call" style="font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 25px; line-height: 1.4; background: #fff; max-width: 760px; margin: 0 auto; border: 1px solid #ddd;">
      <!-- Encabezado Institucional -->
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 15px;">
        <tr>
          <td style="width: 120px; text-align: center; border-right: 1.5px solid #000; padding: 10px;">
            ${
              customLogo
                ? `<img src="${customLogo}" alt="Logo SENA" style="max-height: 60px; max-width: 90px; object-fit: contain;" />`
                : `<div style="font-weight: bold; font-size: 18px; color: #39A900; letter-spacing: 2px;">SENA</div>`
            }
          </td>
          <td style="text-align: center; padding: 8px; font-weight: bold;">
            <div style="font-size: 11px; text-transform: uppercase;">SERVICIO NACIONAL DE APRENDIZAJE SENA</div>
            <div style="font-size: 13px; text-transform: uppercase; margin-top: 3px; color: #00324D;">LLAMADO DE ATENCIÓN</div>
            <div style="font-size: 10px; font-weight: normal; color: #444; margin-top: 2px;">GESTIÓN DE FORMACIÓN PROFESIONAL INTEGRAL · ACOMPAÑAMIENTO Y DEBIDO PROCESO</div>
          </td>
          <td style="width: 130px; border-left: 1.5px solid #000; padding: 6px; font-size: 9px;">
            <div><strong>Código:</strong> F004-P006-GFPI</div>
            <div><strong>Versión:</strong> 02</div>
            <div><strong>ID Reg:</strong> ${call.id}</div>
          </td>
        </tr>
      </table>

      <!-- Datos de la Formación -->
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 15px; font-size: 10.5px;">
        <tr style="background: #f3f4f6;">
          <th colspan="4" style="text-align: left; padding: 5px 8px; border-bottom: 1.5px solid #000; text-transform: uppercase; font-size: 10px;">1. Información General del Proceso Formativo</th>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border-bottom: 1px solid #ccc; width: 22%;"><strong>Regional:</strong></td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #ccc; width: 28%;">${regionalName}</td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #ccc; width: 22%;"><strong>Centro de Formación:</strong></td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #ccc; width: 28%;">${centerName}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border-bottom: 1px solid #ccc;"><strong>Programa de Formación:</strong></td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #ccc;">${programName}</td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #ccc;"><strong>Número de Ficha:</strong></td>
          <td style="padding: 5px 8px; border-bottom: 1px solid #ccc;"><strong>${fichaNumber}</strong></td>
        </tr>
        <tr>
          <td style="padding: 5px 8px;"><strong>Lugar / Ambiente:</strong></td>
          <td style="padding: 5px 8px;">${place}</td>
          <td style="padding: 5px 8px;"><strong>Fecha del Hecho:</strong></td>
          <td style="padding: 5px 8px;">${dateStr}</td>
        </tr>
      </table>

      <!-- Identificación del Aprendiz -->
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 15px; font-size: 10.5px;">
        <tr style="background: #f3f4f6;">
          <th colspan="4" style="text-align: left; padding: 5px 8px; border-bottom: 1.5px solid #000; text-transform: uppercase; font-size: 10px;">2. Identificación del Aprendiz</th>
        </tr>
        <tr>
          <td style="padding: 5px 8px; width: 22%;"><strong>Nombre del Aprendiz:</strong></td>
          <td style="padding: 5px 8px; width: 45%;"><strong>${learnerName}</strong></td>
          <td style="padding: 5px 8px; width: 15%;"><strong>Documento:</strong></td>
          <td style="padding: 5px 8px; width: 18%;">${learnerDocument}</td>
        </tr>
      </table>

      <!-- Hecho y Motivo del Llamado -->
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 15px; font-size: 10.5px;">
        <tr style="background: #f3f4f6;">
          <th style="text-align: left; padding: 5px 8px; border-bottom: 1.5px solid #000; text-transform: uppercase; font-size: 10px;">3. Motivo y Fundamento Reglamentario</th>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ccc;">
            <div style="font-weight: bold; margin-bottom: 4px;">Tipo de Novedad: <span style="color: #b91c1c;">${call.type}</span></div>
            <div style="font-weight: bold; margin-bottom: 4px;">Motivo:</div>
            <div style="margin-bottom: 8px;">${call.reason}</div>
            <div style="font-weight: bold; margin-bottom: 4px;">Artículo Reglamentario Infringido:</div>
            <div style="white-space: pre-wrap; font-style: italic; background: #fafafa; padding: 6px; border: 1px solid #e5e7eb;">${normativeArticle}</div>
          </td>
        </tr>
        ${
          call.description
            ? `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ccc;">
            <div style="font-weight: bold; margin-bottom: 4px;">Descripción de la Situación y Observaciones del Instructor:</div>
            <div style="white-space: pre-wrap;">${call.description}</div>
          </td>
        </tr>
        `
            : ''
        }
      </table>

      <!-- Acciones de Acompañamiento y Plan de Mejoramiento -->
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 25px; font-size: 10.5px;">
        <tr style="background: #f3f4f6;">
          <th style="text-align: left; padding: 5px 8px; border-bottom: 1.5px solid #000; text-transform: uppercase; font-size: 10px;">4. Acciones de Acompañamiento y Plan de Mejoramiento</th>
        </tr>
        <tr>
          <td style="padding: 8px;">
            <div style="white-space: pre-wrap; margin-bottom: 6px;">${improvementPlan}</div>
            <div style="font-size: 9.5px; color: #555; border-top: 1px dashed #ccc; padding-top: 6px; margin-top: 6px;">
              <strong>Garantía de Debido Proceso:</strong> El aprendiz dispone de tres (3) días hábiles para radicar descargos, justificaciones o soportes a través de la plataforma SENA Learning Hub.
            </div>
          </td>
        </tr>
      </table>

      <!-- Firmas Institucionales (Espacios Limpios para Firma) -->
      <div style="margin-top: 40px;">
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 10.5px;">
          <tr>
            <td style="width: 45%; vertical-align: top; padding: 0 15px;">
              <div style="border-top: 1.5px solid #000; padding-top: 6px; margin-top: 45px;">
                <div style="font-weight: bold; text-transform: uppercase;">INSTRUCTOR RESPONSABLE</div>
                <div style="margin-top: 2px;">${instructorName}</div>
              </div>
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%; vertical-align: top; padding: 0 15px;">
              <div style="border-top: 1.5px solid #000; padding-top: 6px; margin-top: 45px;">
                <div style="font-weight: bold; text-transform: uppercase;">APRENDIZ</div>
                <div style="margin-top: 2px;">${learnerName}</div>
                <div style="font-size: 9.5px; color: #555;">Documento: ${learnerDocument}</div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Pie de Página Institucional -->
      <div style="margin-top: 35px; border-top: 1px solid #999; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9px; color: #666;">
        <div>SENA Learning Hub · Sistema Integrado Académico</div>
        <div>Registro Oficial ID: ${call.id} · Fecha de Emisión: ${call.createdAt ? call.createdAt.split('T')[0] : dateStr}</div>
      </div>
    </div>
  `;
}
