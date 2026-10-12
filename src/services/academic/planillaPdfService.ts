/**
 * @license
 * SENA Learning Hub - Generador Oficial de Planilla Académica en PDF
 * PROMPT 51: Informe Completo, Matricial y Legible (A4 Horizontal / Landscape)
 * Colecciones: /fichas, /enrollments, /activities, /submissions
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Ficha,
  ApprenticeWithEnrollment,
  EvidenceActivity,
  AcademicSubmission,
} from '../../types/academic';
import { CellData } from '../../components/academic/FichaPlanillaMatriz';

export interface PlanillaPdfOptions {
  ficha: Ficha;
  instructorName?: string;
  apprentices: ApprenticeWithEnrollment[];
  sortedActivities: EvidenceActivity[];
  submissions: AcademicSubmission[];
  learnerRows: Array<{
    apprentice: ApprenticeWithEnrollment;
    cells: CellData[];
    approvedCount: number;
    pendingCount: number;
    notApprovedCount: number;
    correctionCount: number;
    excludedCount: number;
    unsubmittedCount: number;
    evaluableTotal: number;
    progressPercent: number;
    academicStatus: 'complete' | 'on_track' | 'pending' | 'at_risk';
  }>;
  globalStats: {
    totalLearners: number;
    totalActs: number;
    totalPendingReview: number;
    averageApprovalRate: number;
  };
}

/**
 * Formatea una fecha ISO a formato corto DD/MM/AAAA
 */
function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Formatea una fecha y hora ISO a formato legible DD/MM/AAAA HH:MM
 */
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return dateStr;
  }
}

/**
 * Genera y descarga el archivo PDF de la Planilla Académica Oficial
 */
export async function generatePlanillaPdf(options: PlanillaPdfOptions): Promise<string> {
  const {
    ficha,
    instructorName = 'Instructor SENA',
    apprentices,
    sortedActivities,
    submissions,
    learnerRows,
    globalStats,
  } = options;

  if (apprentices.length === 0) {
    throw new Error('No hay aprendices matriculados en la ficha seleccionada.');
  }

  if (sortedActivities.length === 0) {
    throw new Error('No hay actividades publicadas en la ficha seleccionada.');
  }

  // Inicializar documento A4 horizontal (landscape)
  // Ancho: 297 mm, Alto: 210 mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 269 mm

  const now = new Date();
  const generationDateStr = now.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const generationTimeStr = now.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateFormattedFull = `${generationDateStr} ${generationTimeStr}`;

  const fichaNum = ficha.number || (ficha as any).code || '—';
  const fichaProgram = ficha.programName || ficha.name || 'Programa de Formación Profesional Integral';
  const fichaCenter = ficha.centerName || (ficha as any).regionalName || 'Centro de Formación SENA';
  const fichaCompetency = (ficha as any).courseName || (ficha as any).competencyName || 'Competencias del Programa';

  // =========================================================================
  // 1. ENCABEZADO INSTITUCIONAL (Sección A)
  // =========================================================================
  // Barra superior verde institucional
  doc.setFillColor(57, 169, 0); // #39A900
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Franja azul marino del encabezado
  doc.setFillColor(0, 50, 77); // #00324D
  doc.rect(marginX, 7, contentWidth, 23, 'F');

  // Título institucional
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SERVICIO NACIONAL DE APRENDIZAJE · SENA LEARNING HUB', marginX + 6, 13);

  doc.setFontSize(13);
  doc.text('Planilla de Calificaciones y Evidencias de Aprendizaje', marginX + 6, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 240, 220);
  doc.text(
    `Ficha #${fichaNum} · ${fichaProgram.length > 70 ? fichaProgram.substring(0, 67) + '...' : fichaProgram}`,
    marginX + 6,
    26
  );

  // Fecha y hora en esquina derecha del encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('INFORME OFICIAL', pageWidth - marginX - 6, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 240, 220);
  doc.text(`Generado: ${dateFormattedFull}`, pageWidth - marginX - 6, 19, { align: 'right' });
  doc.text(`Instructor: ${instructorName}`, pageWidth - marginX - 6, 25, { align: 'right' });

  // Tabla de metadatos de la ficha
  let currentY = 32;

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    head: [
      [
        { content: 'Número de Ficha', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [71, 85, 105], halign: 'center' } },
        { content: 'Programa de Formación', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [71, 85, 105] } },
        { content: 'Centro de Formación', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [71, 85, 105] } },
        { content: 'Competencia / Asignación', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [71, 85, 105] } },
        { content: 'Instructor Titular', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [71, 85, 105] } },
      ],
    ],
    body: [
      [
        { content: `#${fichaNum}`, styles: { fontStyle: 'bold', halign: 'center', textColor: [0, 50, 77] } },
        fichaProgram,
        fichaCenter,
        fichaCompetency,
        instructorName,
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // =========================================================================
  // 2. RESUMEN ACADÉMICO (Sección B)
  // =========================================================================
  // Calcular indicadores precisos basados en los datos reales
  let totalSubmissionsCount = 0;
  let approvedCount = 0;
  let notApprovedCount = 0;
  let correctionCount = 0;
  let excludedCount = 0;
  let pendingReviewCount = 0;
  let unsubmittedCount = 0;

  learnerRows.forEach((row) => {
    approvedCount += row.approvedCount;
    notApprovedCount += row.notApprovedCount;
    correctionCount += row.correctionCount;
    excludedCount += row.excludedCount;
    pendingReviewCount += row.pendingCount;
    unsubmittedCount += row.unsubmittedCount;
    totalSubmissionsCount += row.approvedCount + row.notApprovedCount + row.correctionCount + row.pendingCount;
  });

  // Título del bloque de resumen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 50, 77);
  doc.text('Resumen Académico de la Ficha', marginX, currentY);

  autoTable(doc, {
    startY: currentY + 1.5,
    margin: { left: marginX, right: marginX },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      halign: 'center',
    },
    head: [
      [
        { content: 'Aprendices', styles: { fillColor: [0, 50, 77], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: 'Actividades', styles: { fillColor: [0, 50, 77], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: 'Evidencias Recibidas', styles: { fillColor: [0, 50, 77], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: 'Por Calificar', styles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: 'Aprobadas (A)', styles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: 'No Aprobadas (N)', styles: { fillColor: [159, 18, 57], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: 'Por Corregir (C)', styles: { fillColor: [107, 33, 168], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: 'Excluidas (E)', styles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: '% Aprobación General', styles: { fillColor: [57, 169, 0], textColor: [255, 255, 255], fontStyle: 'bold' } },
      ],
    ],
    body: [
      [
        { content: String(globalStats.totalLearners), styles: { fontStyle: 'bold', fontSize: 9 } },
        { content: String(globalStats.totalActs), styles: { fontStyle: 'bold', fontSize: 9 } },
        { content: String(totalSubmissionsCount), styles: { fontStyle: 'bold', fontSize: 9 } },
        { content: String(globalStats.totalPendingReview), styles: { fontStyle: 'bold', textColor: [180, 83, 9], fontSize: 9 } },
        { content: String(approvedCount), styles: { fontStyle: 'bold', textColor: [22, 101, 52], fontSize: 9 } },
        { content: String(notApprovedCount), styles: { fontStyle: 'bold', textColor: [159, 18, 57], fontSize: 9 } },
        { content: String(correctionCount), styles: { fontStyle: 'bold', textColor: [107, 33, 168], fontSize: 9 } },
        { content: String(excludedCount), styles: { fontStyle: 'bold', textColor: [71, 85, 105], fontSize: 9 } },
        { content: `${globalStats.averageApprovalRate}%`, styles: { fontStyle: 'bold', textColor: [36, 107, 0], fontSize: 9.5 } },
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // Banner explicativo de convenciones
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, currentY, contentWidth, 7, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(marginX, currentY, contentWidth, 7, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'CONVENCIONES OFICIALES SENA:   A: Aprobado (Verde)   |   N: No Aprobado (Rojo)   |   C: Corregir (Púrpura)   |   E: Excluido (Gris)   |   Pendiente: Entregada sin dictamen (Ámbar)   |   Sin entrega: No presentada',
    marginX + 3,
    currentY + 4.5
  );

  currentY += 9;

  // =========================================================================
  // 3. PLANILLA GENERAL MATRICIAL (Sección C)
  // =========================================================================
  // Para evitar columnas excesivamente estrechas que truncan títulos,
  // particionamos las actividades en bloques de hasta 6 actividades por tabla.
  const CHUNK_SIZE = 6;
  const activityChunks: EvidenceActivity[][] = [];
  for (let i = 0; i < sortedActivities.length; i += CHUNK_SIZE) {
    activityChunks.push(sortedActivities.slice(i, i + CHUNK_SIZE));
  }

  for (let chunkIdx = 0; chunkIdx < activityChunks.length; chunkIdx++) {
    const chunk = activityChunks[chunkIdx];
    const isFirstChunk = chunkIdx === 0;

    // Si no es el primer chunk, o si queda poco espacio en la página actual, agregar página
    if (!isFirstChunk || currentY > 140) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 50, 77);
    const chunkLabel =
      activityChunks.length > 1
        ? `Planilla de Calificaciones — Bloque ${chunkIdx + 1} de ${activityChunks.length} (Actividades ${chunkIdx * CHUNK_SIZE + 1} a ${Math.min((chunkIdx + 1) * CHUNK_SIZE, sortedActivities.length)})`
        : 'Planilla General de Aprendices y Actividades';
    doc.text(chunkLabel, marginX, currentY);

    // Definición de columnas de la tabla matricial
    const headRow = [
      {
        content: 'Aprendiz / Documento',
        styles: { halign: 'left' as const, cellWidth: 50 },
      },
      ...chunk.map((act, actIdx) => {
        const actNumber = chunkIdx * CHUNK_SIZE + actIdx + 1;
        const dueText = act.dueDate ? `Vence: ${formatShortDate(act.dueDate)}` : 'Sin fecha límite';
        const titleClean = act.title.length > 32 ? act.title.substring(0, 30) + '...' : act.title;
        return {
          content: `Act. ${actNumber}\n${titleClean}\n(${dueText})`,
          styles: { halign: 'center' as const },
        };
      }),
      {
        content: 'Resumen\nA / Eval',
        styles: { halign: 'center' as const, cellWidth: 20 },
      },
      {
        content: '% Cumpl.\nEstado',
        styles: { halign: 'center' as const, cellWidth: 22 },
      },
    ];

    const bodyRows = learnerRows.map((row) => {
      const apprenticeCell = `${row.apprentice.displayName}\nCC: ${row.apprentice.documentNumber || '—'}`;

      const actCells = chunk.map((act) => {
        const cellData = row.cells.find((c) => c.activity.id === act.id);
        if (!cellData) return '—';

        const submitDate = cellData.submittedAt ? `\n(${formatShortDate(cellData.submittedAt)})` : '';

        switch (cellData.state) {
          case 'approved':
            return `A${submitDate}`;
          case 'not_approved':
            return `N${submitDate}`;
          case 'correction':
            return `C${submitDate}`;
          case 'excluded':
            return 'E';
          case 'submitted':
          case 'under_review':
            return `Pendiente${submitDate}`;
          case 'unsubmitted':
          default:
            return 'Sin entrega';
        }
      });

      const summaryCell = `${row.approvedCount} / ${row.evaluableTotal}`;
      const statusLabel =
        row.academicStatus === 'complete'
          ? 'Completo'
          : row.academicStatus === 'on_track'
          ? 'Al día'
          : row.academicStatus === 'at_risk'
          ? 'En riesgo'
          : 'Pendiente';
      const progressCell = `${row.progressPercent}%\n${statusLabel}`;

      return [apprenticeCell, ...actCells, summaryCell, progressCell];
    });

    autoTable(doc, {
      startY: currentY + 2,
      margin: { left: marginX, right: marginX },
      tableWidth: contentWidth,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [0, 50, 77],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.8,
      },
      head: [headRow],
      body: bodyRows,
      didParseCell: (data) => {
        // Estilo condicional para las celdas de actividades
        if (data.section === 'body' && data.column.index > 0 && data.column.index <= chunk.length) {
          const text = String(data.cell.raw || '');
          if (text.startsWith('A')) {
            data.cell.styles.fillColor = [220, 252, 231]; // light green
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.halign = 'center';
          } else if (text.startsWith('N')) {
            data.cell.styles.fillColor = [255, 228, 230]; // light rose
            data.cell.styles.textColor = [159, 18, 57];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.halign = 'center';
          } else if (text.startsWith('C')) {
            data.cell.styles.fillColor = [243, 232, 255]; // light purple
            data.cell.styles.textColor = [107, 33, 168];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.halign = 'center';
          } else if (text.startsWith('E')) {
            data.cell.styles.fillColor = [241, 245, 249]; // light slate
            data.cell.styles.textColor = [71, 85, 105];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.halign = 'center';
          } else if (text.startsWith('Pendiente')) {
            data.cell.styles.fillColor = [254, 243, 199]; // light amber
            data.cell.styles.textColor = [146, 64, 14];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.halign = 'center';
          } else if (text === 'Sin entrega') {
            data.cell.styles.textColor = [148, 163, 184];
            data.cell.styles.fontStyle = 'normal';
            data.cell.styles.halign = 'center';
          }
        }

        // Columna de progreso / estado
        if (data.section === 'body' && data.column.index === chunk.length + 2) {
          const text = String(data.cell.raw || '');
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
          if (text.includes('En riesgo')) {
            data.cell.styles.textColor = [159, 18, 57];
          } else if (text.includes('Completo') || text.includes('Al día')) {
            data.cell.styles.textColor = [22, 101, 52];
          }
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // =========================================================================
  // 4. DETALLE DE EVIDENCIAS Y RETROALIMENTACIÓN (Sección D)
  // =========================================================================
  // Iniciar siempre en una nueva página para dar amplitud y claridad
  doc.addPage();
  currentY = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 50, 77);
  doc.text('Detalle de Evidencias y Retroalimentación Pedagógica', marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Registro pormenorizado de entregas recibidas, dictamen oficial asignado, archivos adjuntos y observaciones registradas.',
    marginX,
    currentY + 4
  );

  currentY += 7;

  // Construir filas de detalle con todas las evidencias de la ficha
  const detailRows: any[][] = [];

  // Mapeo ordenado de entregas por aprendiz y por actividad
  learnerRows.forEach((row) => {
    row.cells.forEach((cell) => {
      // Si la evidencia fue entregada o tiene dictamen/exclusión registrada
      if (cell.submission || cell.state !== 'unsubmitted') {
        const sub = cell.submission;
        const submittedDateStr = cell.submittedAt ? formatDateTime(cell.submittedAt) : 'Sin fecha';
        const statusDelivery =
          cell.state === 'excluded'
            ? 'Excluido'
            : sub?.status === 'submitted'
            ? 'Entregado a tiempo'
            : sub?.status === 'under_review'
            ? 'En revisión'
            : sub?.status === 'approved'
            ? 'Calificado (A)'
            : sub?.status === 'not_approved'
            ? 'Calificado (N)'
            : sub?.status === 'correction_required'
            ? 'Requiere corrección (C)'
            : 'Entregado';

        const gradeOfficial =
          cell.gradeCode === 'A'
            ? 'A — Aprobado'
            : cell.gradeCode === 'N'
            ? 'N — No Aprobado'
            : cell.gradeCode === 'C'
            ? 'C — Corregir'
            : cell.isExcluded
            ? 'E — Excluido'
            : 'Pendiente de Calificar';

        const feedbackText = sub?.feedback || 'Sin observaciones registradas por el instructor.';
        const fileName =
          sub?.fileName ||
          (sub as any)?.driveFileName ||
          ((sub as any)?.fileUrl || (sub as any)?.evidenceUrl ? 'Archivo adjunto' : '—');

        detailRows.push([
          `${row.apprentice.displayName}\nCC: ${row.apprentice.documentNumber || '—'}`,
          cell.activity.title,
          submittedDateStr,
          statusDelivery,
          gradeOfficial,
          fileName,
          feedbackText,
        ]);
      }
    });
  });

  if (detailRows.length === 0) {
    detailRows.push([
      'No se registran entregas individuales en esta ficha.',
      '—',
      '—',
      '—',
      '—',
      '—',
      '—',
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [0, 50, 77],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'left',
    },
    head: [
      [
        { content: 'Aprendiz', styles: { cellWidth: 42 } },
        { content: 'Actividad Formativa', styles: { cellWidth: 45 } },
        { content: 'Fecha Entrega', styles: { cellWidth: 26, halign: 'center' } },
        { content: 'Estado Entrega', styles: { cellWidth: 26, halign: 'center' } },
        { content: 'Dictamen Oficial', styles: { cellWidth: 30, halign: 'center' } },
        { content: 'Archivo Adjunto', styles: { cellWidth: 32 } },
        { content: 'Retroalimentación Pedagógica del Instructor' },
      ],
    ],
    body: detailRows,
    didParseCell: (data) => {
      // Estilo de columna de Dictamen
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw || '');
        if (text.startsWith('A')) {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.startsWith('N')) {
          data.cell.styles.textColor = [159, 18, 57];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.startsWith('C')) {
          data.cell.styles.textColor = [107, 33, 168];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.startsWith('Pendiente')) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // =========================================================================
  // 5. PIE DE PÁGINA Y NUMERACIÓN EN TODAS LAS PÁGINAS
  // =========================================================================
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Línea divisoria superior del pie de página
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);

    // Izquierda: Entidad
    doc.text(
      `Servicio Nacional de Aprendizaje SENA · Dirección de Formación Profesional Integral`,
      marginX,
      pageHeight - 5
    );

    // Centro: Identificador de la ficha
    doc.text(
      `Planilla Oficial Ficha #${fichaNum} · ${generationDateStr}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );

    // Derecha: Número de página
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 5, {
      align: 'right',
    });
  }

  // Generar nombre de archivo estándar: Planilla_Ficha_12345_2026-10-12.pdf
  const dateIso = now.toISOString().split('T')[0];
  const cleanFichaNum = String(fichaNum).replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `Planilla_Ficha_${cleanFichaNum}_${dateIso}.pdf`;

  // Descarga directa en el navegador
  doc.save(fileName);

  return fileName;
}
