/**
 * @license
 * SENA Learning Hub - Utilidades de Normalización y Evaluación Académica
 * PROMPT 9.2:
 * 1. Normalización mutuamente excluyente de escala SENA (A / N / C / PENDING)
 * 2. Evaluación segura de cumplimiento de entregas contra fechas límite
 */

import { AcademicSubmission } from '../types/academic';

export type NormalizedEvaluationStatus = 'A' | 'N' | 'C' | 'PENDING';

/**
 * Normaliza la evaluación de una evidencia de forma mutuamente excluyente.
 * Prioridad obligatoria:
 * 1. si grade === 'A' → A
 * 2. si grade === 'N' → N
 * 3. si grade === 'C' → C
 * 4. si status === 'approved' → A
 * 5. si status === 'not_approved' → N
 * 6. si status === 'correction_required' → C
 * 7. cualquier otro caso → PENDING
 */
export function normalizeEvaluationStatus(
  submission: Pick<AcademicSubmission, 'grade' | 'status'> | null | undefined
): NormalizedEvaluationStatus {
  if (!submission) return 'PENDING';

  const grade = submission.grade;
  const status = submission.status;

  if (grade === 'A') return 'A';
  if (grade === 'N') return 'N';
  if (grade === 'C') return 'C';
  if (status === 'approved') return 'A';
  if (status === 'not_approved') return 'N';
  if (status === 'correction_required') return 'C';

  return 'PENDING';
}

export type DeliveryComplianceStatus =
  | 'ENTREGADO_A_TIEMPO'
  | 'ENTREGADO_TARDIO'
  | 'NO_ENTREGADO'
  | 'SIN_FECHA_LIMITE';

/**
 * Evalúa con precisión temporal si una evidencia fue radicada a tiempo, tardía o sin entregar.
 * Maneja cadenas ISO de fecha simple YYYY-MM-DD interpretándolas como el final del día (23:59:59.999).
 */
export function evaluateDeliveryCompliance(
  submittedAt?: string | null,
  dueDate?: string | null
): { status: DeliveryComplianceStatus; label: string } {
  if (!submittedAt) {
    return { status: 'NO_ENTREGADO', label: 'Sin entregar' };
  }

  if (!dueDate || !dueDate.trim()) {
    return { status: 'SIN_FECHA_LIMITE', label: 'Sin fecha límite' };
  }

  const trimmedDue = dueDate.trim();
  let normalizedDueTimestamp: number;

  // Si contiene únicamente fecha YYYY-MM-DD (longitud 10), interpretar como final del día local
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDue)) {
    const endOfDay = new Date(`${trimmedDue}T23:59:59.999`);
    normalizedDueTimestamp = endOfDay.getTime();
  } else {
    normalizedDueTimestamp = new Date(trimmedDue).getTime();
  }

  const subTimestamp = new Date(submittedAt).getTime();

  if (isNaN(normalizedDueTimestamp) || isNaN(subTimestamp)) {
    return { status: 'SIN_FECHA_LIMITE', label: 'Sin fecha límite' };
  }

  if (subTimestamp <= normalizedDueTimestamp) {
    return { status: 'ENTREGADO_A_TIEMPO', label: 'A tiempo' };
  } else {
    return { status: 'ENTREGADO_TARDIO', label: 'Fuera de plazo' };
  }
}
