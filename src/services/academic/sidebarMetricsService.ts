/**
 * @license
 * SENA Learning Hub - Servicio de Métricas y Contadores Reales del Menú Lateral
 * PROMPT 20.1: Contadores 100% reales basados exclusivamente en Firestore y en el usuario autenticado
 *
 * REGLAS FUNDAMENTALES:
 * 1. UN CONTADOR SOLO SE MUESTRA SI REPRESENTA UN REGISTRO REAL VISIBLE PARA EL USUARIO ACTUAL.
 * 2. Si el contador es 0 o está cargando (null) -> OCULTAR BADGE (no mostrar 0 ni badges vacíos).
 * 3. Aislamiento total: Solo contar registros de las fichas asignadas al instructor.
 * 4. Evitar duplicados de aprendices mediante conteo de identificadores únicos de matrícula.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_COLLECTIONS } from '../../config/constants';
import { fichaService } from './fichaService';
import { activityService } from './activityService';
import { submissionService } from '../submissions/submissionService';
import { trackingService } from './trackingService';
import { enrollmentService } from './enrollmentService';

export interface InstructorSidebarMetrics {
  fichasCount: number | null;
  apprenticesCount: number | null;
  activitiesCount: number | null;
  submissionsCount: number | null;
  attentionCallsCount: number | null;
}

export interface ApprenticeSidebarMetrics {
  activitiesCount: number | null;
  hasActiveEnrollment: boolean;
}

type MetricsListener = () => void;

class SidebarMetricsService {
  private listeners: Set<MetricsListener> = new Set();
  private instructorCache: Map<string, { metrics: InstructorSidebarMetrics; timestamp: number }> = new Map();
  private apprenticeCache: Map<string, { metrics: ApprenticeSidebarMetrics; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 15000; // 15 segundos para evitar llamadas excesivas a Firestore

  /**
   * Suscribe un listener a cambios en los contadores del sidebar
   */
  subscribe(listener: MetricsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifica a los observadores que las métricas han cambiado (e.g. tras crear actividad, evidencia o llamado)
   */
  notifyMetricsUpdated(): void {
    this.instructorCache.clear();
    this.apprenticeCache.clear();
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn('[SidebarMetricsService] Error en listener de métricas:', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sena_sidebar_metrics_updated'));
    }
  }

  /**
   * Obtiene los contadores reales para un instructor
   * Colecciones consultadas con aislamiento estricto:
   * - /fichas (donde instructorIds contiene instructorUid)
   * - /enrollments (solo aprendices únicos de las fichas asignadas al instructor)
   * - /activities (mismo criterio que InstructorActivitiesView)
   * - /submissions (mismo criterio que InstructorSubmissionsView)
   * - /attentionCalls (llamados de las fichas asignadas al instructor)
   */
  async getInstructorMetrics(instructorUid: string, forceRefresh = false): Promise<InstructorSidebarMetrics> {
    if (!instructorUid) {
      return {
        fichasCount: 0,
        apprenticesCount: 0,
        activitiesCount: 0,
        submissionsCount: 0,
        attentionCallsCount: 0,
      };
    }

    const cached = this.instructorCache.get(instructorUid);
    const now = Date.now();
    if (!forceRefresh && cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.metrics;
    }

    try {
      // 1. Obtener FICHAS asignadas al instructor
      const fichasRes = await fichaService.getFichas(instructorUid);
      const activeFichas = (fichasRes.data || []).filter((f) => f.status !== 'archived');
      const assignedFichaIds = activeFichas.map((f) => f.id);
      const fichasCount = activeFichas.length;

      // Si el instructor no tiene fichas asignadas:
      if (assignedFichaIds.length === 0) {
        // Solo contar actividades que el propio instructor haya creado directamente
        const actsRes = await activityService.getActivities();
        const myActs = (actsRes.data || []).filter((a) => a.createdBy === instructorUid);

        const emptyMetrics: InstructorSidebarMetrics = {
          fichasCount: 0,
          apprenticesCount: 0,
          activitiesCount: myActs.length,
          submissionsCount: 0,
          attentionCallsCount: 0,
        };

        this.instructorCache.set(instructorUid, { metrics: emptyMetrics, timestamp: now });
        return emptyMetrics;
      }

      // 2. Ejecutar consultas paralelas con aislamiento estricto por ficha
      const [actsRes, subsRes, callsRes, enrollmentsResults] = await Promise.all([
        activityService.getActivities(),
        submissionService.getAllSubmissions(instructorUid, assignedFichaIds),
        trackingService.getAttentionCalls(),
        // Consultar matrículas de las fichas asignadas para contar aprendices únicos
        Promise.all(
          assignedFichaIds.map(async (fId) => {
            try {
              const q = query(
                collection(db, FIRESTORE_COLLECTIONS.ENROLLMENTS),
                where('fichaId', '==', fId)
              );
              const snap = await getDocs(q);
              return snap.docs.map((d) => d.data());
            } catch (err) {
              console.warn(`[SidebarMetricsService] Error consultando enrollments para ficha ${fId}:`, err);
              return [];
            }
          })
        ),
      ]);

      // 3. APRENDICES: Extraer aprendices únicos (desduplicados y pertenecientes a fichas del instructor)
      const uniqueLearnerIds = new Set<string>();
      enrollmentsResults.flat().forEach((enr) => {
        const learnerId = (enr.userId || enr.learnerId || enr.apprenticeId) as string | undefined;
        const status = enr.status as string | undefined;
        // Solo contar matrículas válidas (no canceladas)
        if (learnerId && status !== 'cancelled' && status !== 'retirado') {
          uniqueLearnerIds.add(learnerId);
        }
      });
      const apprenticesCount = uniqueLearnerIds.size;

      // 4. ACTIVIDADES: Mismo criterio estricto que InstructorActivitiesView
      const relevantActs = (actsRes.data || []).filter(
        (a) => assignedFichaIds.includes(a.fichaId) || a.createdBy === instructorUid
      );
      const activitiesCount = relevantActs.length;

      // 5. EVIDENCIAS / SUBMISSIONS: Mismo criterio estricto que InstructorSubmissionsView
      const submissionsCount = (subsRes.data || []).length;

      // 6. LLAMADOS DE ATENCIÓN: Solo los que pertenezcan a las fichas asignadas al instructor
      const relevantCalls = (callsRes.data || []).filter((c) =>
        c.fichaId ? assignedFichaIds.includes(c.fichaId) : c.createdBy === instructorUid
      );
      const attentionCallsCount = relevantCalls.length;

      const finalMetrics: InstructorSidebarMetrics = {
        fichasCount,
        apprenticesCount,
        activitiesCount,
        submissionsCount,
        attentionCallsCount,
      };

      this.instructorCache.set(instructorUid, { metrics: finalMetrics, timestamp: now });
      return finalMetrics;
    } catch (error) {
      console.warn('[SidebarMetricsService] Error calculando métricas del instructor:', error);
      return {
        fichasCount: 0,
        apprenticesCount: 0,
        activitiesCount: 0,
        submissionsCount: 0,
        attentionCallsCount: 0,
      };
    }
  }

  /**
   * Obtiene los contadores reales para un aprendiz
   * - Actividades formativas visibles para la ficha del aprendiz (status !== 'draft')
   */
  async getApprenticeMetrics(learnerId: string, forceRefresh = false): Promise<ApprenticeSidebarMetrics> {
    if (!learnerId) {
      return { activitiesCount: 0, hasActiveEnrollment: false };
    }

    const cached = this.apprenticeCache.get(learnerId);
    const now = Date.now();
    if (!forceRefresh && cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.metrics;
    }

    try {
      const [actRes, enrollments] = await Promise.all([
        activityService.getActivities(),
        enrollmentService.getLearnerEnrollments(learnerId),
      ]);

      const hasActiveEnrollment = enrollments.length > 0;
      let activitiesCount = 0;
      if (hasActiveEnrollment) {
        const allowedFichaIds = enrollments.map((e) => e.fichaId);
        const visibleActivities = (actRes.data || []).filter(
          (a) => a.status !== 'draft' && allowedFichaIds.includes(a.fichaId)
        );
        activitiesCount = visibleActivities.length;
      }

      const metrics: ApprenticeSidebarMetrics = {
        activitiesCount,
        hasActiveEnrollment,
      };
      this.apprenticeCache.set(learnerId, { metrics, timestamp: now });
      return metrics;
    } catch (error) {
      console.warn('[SidebarMetricsService] Error calculando métricas de aprendiz:', error);
      return { activitiesCount: 0, hasActiveEnrollment: false };
    }
  }
}

export const sidebarMetricsService = new SidebarMetricsService();
