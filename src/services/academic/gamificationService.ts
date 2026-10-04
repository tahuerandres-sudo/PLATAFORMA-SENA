/**
 * @license
 * SENA Learning Hub - Servicio de Gamificación y Reconocimiento
 * PROMPT 14: Sistema complementario conectado a Firestore
 * Colecciones: /gamificationProfiles, /gamificationEvents, /badges, /userBadges, /achievements
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  GamificationProfile,
  GamificationEvent,
  GamificationEventType,
  BadgeDefinition,
  UserBadge,
  AchievementDefinition,
  LeaderboardEntry,
} from '../../types/academic';
import { enrollmentService } from './enrollmentService';
import { notificationService } from './notificationService';

// Nombres de colecciones
const PROFILES_COLLECTION = 'gamificationProfiles';
const EVENTS_COLLECTION = 'gamificationEvents';
const BADGES_COLLECTION = 'badges';
const USER_BADGES_COLLECTION = 'userBadges';
const ACHIEVEMENTS_COLLECTION = 'achievements';

// 1. REGLAS CENTRALIZADAS DE PUNTUACIÓN (Sección 4)
export const GAMIFICATION_POINTS = {
  EVIDENCE_SUBMITTED: 10,
  EVIDENCE_APPROVED: 20,
  CORRECTION_COMPLETED: 10,
  ATTENDANCE_PRESENT: 5,
  ACTIVITY_COMPLETED: 10,
  STREAK_BONUS: 5,
};

// 2. SISTEMA CENTRALIZADO DE NIVELES (Sección 9)
export const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0, title: 'Aprendiz Inicial' },
  { level: 2, minXp: 100, title: 'Explorador Bilingüe' },
  { level: 3, minXp: 250, title: 'Practicante Activo' },
  { level: 4, minXp: 500, title: 'Constructor de Conocimiento' },
  { level: 5, minXp: 800, title: 'Líder Técnico' },
  { level: 6, minXp: 1200, title: 'Mentor Académico' },
  { level: 7, minXp: 1700, title: 'Maestro de Evidencias' },
  { level: 8, minXp: 2300, title: 'Leyenda SENA' },
];

export function calculateLevel(xp: number): {
  level: number;
  title: string;
  currentXp: number;
  nextLevelXp: number;
  progressPercent: number;
  xpRemaining: number;
} {
  let currentTier = LEVEL_THRESHOLDS[0];
  let nextTier = LEVEL_THRESHOLDS[1];

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].minXp) {
      currentTier = LEVEL_THRESHOLDS[i];
      nextTier = LEVEL_THRESHOLDS[i + 1] || {
        level: currentTier.level + 1,
        minXp: currentTier.minXp + 600,
        title: 'Maestría Total',
      };
      break;
    }
  }

  const range = nextTier.minXp - currentTier.minXp;
  const progressInTier = Math.max(0, xp - currentTier.minXp);
  const progressPercent = Math.min(100, Math.round((progressInTier / (range || 1)) * 100));
  const xpRemaining = Math.max(0, nextTier.minXp - xp);

  return {
    level: currentTier.level,
    title: currentTier.title,
    currentXp: xp,
    nextLevelXp: nextTier.minXp,
    progressPercent,
    xpRemaining,
  };
}

// 3. CATÁLOGO INICIAL DE INSIGNIAS (Sección 10)
export const DEFAULT_BADGES: BadgeDefinition[] = [
  {
    id: 'first_evidence',
    name: 'First Evidence',
    title: 'Primera Evidencia',
    description: 'Radicaste formalmente tu primera evidencia en el SENA Learning Hub.',
    icon: 'Award',
    category: 'academic',
    xpReward: 50,
    criteria: '1 entrega registrada',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'first_a',
    name: 'First A',
    title: 'Primera Evidencia Aprobada (A)',
    description: 'Recibiste tu primer dictamen Aprobado (A) por parte de tu instructor.',
    icon: 'Trophy',
    category: 'academic',
    xpReward: 100,
    criteria: '1 evidencia con calificación A',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'correction_master',
    name: 'Correction Master',
    title: 'Maestro de la Corrección',
    description: 'Completaste una corrección y nuevo reenvío atendiendo retroalimentaciones.',
    icon: 'CheckCircle2',
    category: 'academic',
    xpReward: 60,
    criteria: '1 corrección radicada con éxito',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'perfect_attendance',
    name: 'Asistencia Ejemplar',
    title: 'Puntualidad SENA',
    description: 'Mantienes tu asistencia al día en las sesiones presenciales y sincrónicas.',
    icon: 'CalendarCheck',
    category: 'attendance',
    xpReward: 50,
    criteria: 'Asistencia registrada como PRESENTE',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bilingual_explorer',
    name: 'Explorador Bilingüe',
    title: 'Nivel 2 Alcanzado',
    description: 'Superaste los 100 XP demostrando compromiso y avance continuo.',
    icon: 'Star',
    category: 'bilingualism',
    xpReward: 100,
    criteria: 'Alcanzar Nivel 2 (100+ XP)',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'consistent_learner',
    name: 'Aprendiz Constante',
    title: 'Constancia Formativa',
    description: 'Has entregado 3 o más evidencias en tus cursos formativos.',
    icon: 'Flame',
    category: 'special',
    xpReward: 120,
    criteria: '3 entregas realizadas',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

// 4. CATÁLOGO INICIAL DE LOGROS (Sección 11)
export const DEFAULT_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'ach_first_sub',
    title: 'Primer Paso',
    description: 'Entregar tu primera evidencia de aprendizaje',
    icon: 'FileText',
    targetCount: 1,
    metric: 'submissions',
    xpReward: 30,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ach_five_subs',
    title: 'Dedicación Continua',
    description: 'Entregar 5 evidencias académicas',
    icon: 'FolderArchive',
    targetCount: 5,
    metric: 'submissions',
    xpReward: 100,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ach_first_a',
    title: 'Excelencia Inicial',
    description: 'Obtener tu primera evidencia calificada como Aprobada (A)',
    icon: 'Award',
    targetCount: 1,
    metric: 'approvals',
    xpReward: 50,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ach_five_a',
    title: 'Rendimiento Destacado',
    description: 'Acumular 5 evidencias aprobadas con A',
    icon: 'Trophy',
    targetCount: 5,
    metric: 'approvals',
    xpReward: 150,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ach_first_corr',
    title: 'Capacidad de Mejora',
    description: 'Radicar una corrección tras observaciones del instructor',
    icon: 'RefreshCw',
    targetCount: 1,
    metric: 'corrections',
    xpReward: 40,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ach_level_three',
    title: 'Ascenso Continuo',
    description: 'Alcanzar el Nivel 3 de formación (250+ XP)',
    icon: 'Medal',
    targetCount: 3,
    metric: 'level',
    xpReward: 80,
    createdAt: new Date().toISOString(),
  },
];

// Cache en memoria para soporte inmediato y offline
const inMemoryProfiles: Record<string, GamificationProfile> = {};
const inMemoryEvents: Record<string, GamificationEvent> = {};
const inMemoryUserBadges: Record<string, Set<string>> = {};

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

export const gamificationService = {
  /**
   * Obtiene o inicializa el perfil de gamificación de un usuario
   */
  async getProfile(userId: string): Promise<GamificationProfile> {
    if (!userId) {
      return this.createDefaultProfile('anonymous');
    }

    if (inMemoryProfiles[userId]) {
      return inMemoryProfiles[userId];
    }

    let profile: GamificationProfile | null = null;

    try {
      const snap = await getDoc(doc(db, PROFILES_COLLECTION, userId));
      if (snap.exists()) {
        profile = snap.data() as GamificationProfile;
      }
    } catch (err) {
      console.warn('[gamificationService] Aviso leyendo perfil en Firestore:', err);
    }

    if (!profile) {
      // Inicializar perfil vacío si no existía (todos los puntos en 0 para aprendices)
      profile = this.createDefaultProfile(userId);
      try {
        await setDoc(doc(db, PROFILES_COLLECTION, userId), cleanUndefined(profile), { merge: true });
      } catch (err) {
        console.warn('[gamificationService] Aviso creando perfil inicial en Firestore:', err);
      }
    }

    // Reconciliación con el registro inmutable de eventos auditados (/gamificationEvents)
    try {
      const q = query(
        collection(db, EVENTS_COLLECTION),
        where('userId', '==', userId),
        limit(100)
      );
      const eventsSnap = await getDocs(q);
      if (!eventsSnap.empty) {
        let eventsXp = 0;
        let eventsApprovals = 0;
        let eventsActivities = 0;

        eventsSnap.docs.forEach((d) => {
          const ev = d.data() as GamificationEvent;
          eventsXp += Number(ev.points) || 0;
          if (ev.type === 'EVIDENCE_APPROVED') eventsApprovals += 1;
          if (ev.type === 'ACTIVITY_COMPLETED') eventsActivities += 1;
        });

        if (eventsXp > (profile.experiencePoints || 0)) {
          const levelInfo = calculateLevel(eventsXp);
          profile = {
            ...profile,
            experiencePoints: eventsXp,
            totalPoints: Math.max(profile.totalPoints || 0, eventsXp),
            level: levelInfo.level,
            approvedEvidenceCount: Math.max(profile.approvedEvidenceCount || 0, eventsApprovals),
            completedActivities: Math.max(profile.completedActivities || 0, eventsActivities),
          };
        }
      }
    } catch (err) {
      console.warn('[gamificationService] Aviso reconciliando eventos de gamificación:', err);
    }

    inMemoryProfiles[userId] = profile;
    return profile;
  },

  createDefaultProfile(userId: string): GamificationProfile {
    return {
      userId,
      totalPoints: 0,
      level: 1,
      experiencePoints: 0,
      completedActivities: 0,
      approvedEvidenceCount: 0,
      achievementsCount: 0,
      badgesCount: 0,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Registra un evento de gamificación de forma estrictamente IDEMPOTENTE (Sección 5).
   * Si el eventId ya existe en Firestore o memoria, NO otorga puntos repetidos.
   */
  async recordEvent(eventData: {
    id?: string;
    userId: string;
    type: GamificationEventType;
    points: number;
    sourceId?: string;
    sourceType?: 'submission' | 'activity' | 'attendance' | 'streak' | 'achievement' | 'badge' | 'manual';
    description: string;
    createdBy?: string;
  }): Promise<{ awarded: boolean; profile: GamificationProfile; event?: GamificationEvent }> {
    const { userId, type, points, sourceId, sourceType, description, createdBy } = eventData;
    if (!userId) {
      throw new Error('userId requerido para evento de gamificación.');
    }

    // Identificador determinista para evitar duplicación
    const eventId =
      eventData.id ||
      `gamification_${userId}_${type}_${sourceId || 'gen'}`;

    // 1. Verificación de Idempotencia en memoria
    if (inMemoryEvents[eventId]) {
      const existingProfile = await this.getProfile(userId);
      return { awarded: false, profile: existingProfile, event: inMemoryEvents[eventId] };
    }

    // 2. Verificación de Idempotencia en Firestore
    try {
      const existingDoc = await getDoc(doc(db, EVENTS_COLLECTION, eventId));
      if (existingDoc.exists()) {
        const existingEvent = existingDoc.data() as GamificationEvent;
        inMemoryEvents[eventId] = existingEvent;
        const currentProfile = await this.getProfile(userId);
        return { awarded: false, profile: currentProfile, event: existingEvent };
      }
    } catch (err) {
      console.warn('[gamificationService] Aviso consultando evento existente:', err);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const todayStr = nowIso.split('T')[0];

    const newEvent: GamificationEvent = {
      id: eventId,
      userId,
      type,
      points,
      sourceId,
      sourceType,
      description,
      createdAt: nowIso,
      createdBy,
    };

    // Guardar en memoria
    inMemoryEvents[eventId] = newEvent;

    // Persistir evento en Firestore
    try {
      await setDoc(doc(db, EVENTS_COLLECTION, eventId), cleanUndefined(newEvent));
    } catch (err) {
      console.warn('[gamificationService] Error guardando evento en Firestore:', err);
    }

    // 3. Actualizar perfil del aprendiz
    const profile = await this.getProfile(userId);
    const oldLevel = profile.level;

    const newXp = (profile.experiencePoints || 0) + points;
    const newTotalPoints = (profile.totalPoints || 0) + points;

    // Gestión de racha
    let newStreak = profile.currentStreak || 1;
    let newLongest = profile.longestStreak || 1;
    if (profile.lastActiveDate) {
      const lastDate = new Date(profile.lastActiveDate);
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1 && todayStr !== profile.lastActiveDate) {
        newStreak = 1;
      }
      if (newStreak > newLongest) {
        newLongest = newStreak;
      }
    }

    // Contadores específicos
    let completedActivities = profile.completedActivities || 0;
    let approvedEvidenceCount = profile.approvedEvidenceCount || 0;

    if (type === 'ACTIVITY_COMPLETED') completedActivities += 1;
    if (type === 'EVIDENCE_APPROVED') approvedEvidenceCount += 1;

    // Calcular nuevo nivel
    const levelInfo = calculateLevel(newXp);
    const newLevel = levelInfo.level;

    const updatedProfile: GamificationProfile = {
      ...profile,
      totalPoints: newTotalPoints,
      experiencePoints: newXp,
      level: newLevel,
      completedActivities,
      approvedEvidenceCount,
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: todayStr,
      updatedAt: nowIso,
    };

    inMemoryProfiles[userId] = updatedProfile;

    // Persistir perfil actualizado
    try {
      await setDoc(doc(db, PROFILES_COLLECTION, userId), cleanUndefined(updatedProfile), { merge: true });
    } catch (err) {
      console.warn('[gamificationService] Error actualizando perfil:', err);
    }

    // 4. Notificación automática de Subida de Nivel (PROMPT 16: LEVEL_UP)
    if (newLevel > oldLevel) {
      notificationService
        .notifyGamificationLevelUp({
          userId,
          newLevel,
          levelTitle: levelInfo.title,
          xp: newXp,
        })
        .catch((e) => console.warn('[gamificationService] Error notificando subida de nivel:', e));
    }

    // 5. Evaluar Insignias automáticas
    this.checkAndAwardBadges(updatedProfile).catch((e) =>
      console.warn('[gamificationService] Error evaluando insignias:', e)
    );

    return { awarded: true, profile: updatedProfile, event: newEvent };
  },

  /**
   * Evalúa y otorga insignias automáticas si se cumplen los criterios
   */
  async checkAndAwardBadges(profile: GamificationProfile): Promise<void> {
    const { userId } = profile;
    if (!userId) return;

    if (!inMemoryUserBadges[userId]) {
      inMemoryUserBadges[userId] = new Set<string>();
    }

    // Consultar badges ya desbloqueados
    try {
      const snap = await getDocs(query(collection(db, USER_BADGES_COLLECTION), where('userId', '==', userId)));
      snap.docs.forEach((d) => {
        const ub = d.data() as UserBadge;
        inMemoryUserBadges[userId].add(ub.badgeId);
      });
    } catch (err) {
      console.warn('[gamificationService] Aviso consultando userBadges:', err);
    }

    const currentBadges = inMemoryUserBadges[userId];

    for (const badge of DEFAULT_BADGES) {
      if (currentBadges.has(badge.id)) continue;

      let eligible = false;
      if (badge.id === 'first_evidence' && (profile.experiencePoints > 0 || profile.completedActivities > 0)) {
        eligible = true;
      } else if (badge.id === 'first_a' && profile.approvedEvidenceCount >= 1) {
        eligible = true;
      } else if (badge.id === 'bilingual_explorer' && profile.level >= 2) {
        eligible = true;
      } else if (badge.id === 'consistent_learner' && profile.completedActivities >= 3) {
        eligible = true;
      }

      if (eligible) {
        const userBadgeId = `ub_${userId}_${badge.id}`;
        const userBadge: UserBadge = {
          id: userBadgeId,
          userId,
          badgeId: badge.id,
          unlockedAt: new Date().toISOString(),
        };

        currentBadges.add(badge.id);

        try {
          await setDoc(doc(db, USER_BADGES_COLLECTION, userBadgeId), userBadge);
          // Actualizar conteo de badges en perfil
          await setDoc(
            doc(db, PROFILES_COLLECTION, userId),
            { badgesCount: currentBadges.size, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        } catch (e) {
          console.warn(`[gamificationService] Error guardando userBadge ${badge.id}:`, e);
        }

        // Notificar al aprendiz (PROMPT 16: BADGE_EARNED)
        notificationService
          .notifyGamificationBadgeEarned({
            userId,
            badgeId: badge.id,
            badgeName: badge.name,
            description: badge.description,
            xpReward: badge.xpReward,
          })
          .catch((e) => console.warn('Error notificando insignia:', e));
      }
    }
  },

  /**
   * Obtiene la lista completa de insignias y el estado de desbloqueo para el usuario
   */
  async getUserBadges(userId: string): Promise<Array<BadgeDefinition & { unlocked: boolean; unlockedAt?: string }>> {
    const unlockedMap = new Map<string, string>();

    try {
      const snap = await getDocs(query(collection(db, USER_BADGES_COLLECTION), where('userId', '==', userId)));
      snap.docs.forEach((d) => {
        const ub = d.data() as UserBadge;
        unlockedMap.set(ub.badgeId, ub.unlockedAt);
      });
    } catch (err) {
      console.warn('[gamificationService] Error obteniendo userBadges:', err);
    }

    return DEFAULT_BADGES.map((b) => ({
      ...b,
      unlocked: unlockedMap.has(b.id),
      unlockedAt: unlockedMap.get(b.id),
    }));
  },

  /**
   * Obtiene la lista de logros y el porcentaje de avance
   */
  async getUserAchievements(
    userId: string
  ): Promise<Array<AchievementDefinition & { progress: number; unlocked: boolean }>> {
    const profile = await this.getProfile(userId);

    return DEFAULT_ACHIEVEMENTS.map((ach) => {
      let current = 0;
      if (ach.metric === 'submissions') current = profile.completedActivities || 0;
      if (ach.metric === 'approvals') current = profile.approvedEvidenceCount || 0;
      if (ach.metric === 'level') current = profile.level || 1;
      if (ach.metric === 'corrections') current = profile.approvedEvidenceCount >= 1 ? 1 : 0;

      const progress = Math.min(100, Math.round((current / ach.targetCount) * 100));
      return {
        ...ach,
        progress,
        unlocked: progress >= 100,
      };
    });
  },

  /**
   * Obtiene el Ranking de una Ficha (Sección 13)
   * Filtra estrictamente por los aprendices matriculados en la ficha (/enrollments)
   * NO expone calificaciones A/N/C ni información disciplinaria sensible
   */
  async getFichaLeaderboard(fichaId: string, currentUserId?: string): Promise<LeaderboardEntry[]> {
    if (!fichaId) return [];

    try {
      // 1. Obtener aprendices reales de la ficha cruzando /enrollments y /users
      const apprenticesRes = await enrollmentService.getApprenticesWithEnrollment(fichaId);
      const apprentices = apprenticesRes.data || [];

      if (apprentices.length === 0) {
        return [];
      }

      // 2. Consultar o inicializar perfil de gamificación para cada aprendiz de la ficha
      const leaderboard: LeaderboardEntry[] = [];

      for (const appr of apprentices) {
        const uid = appr.uid;
        const profile = await this.getProfile(uid);

        leaderboard.push({
          rank: 0,
          userId: uid,
          name: appr.displayName || 'Aprendiz SENA',
          displayName: appr.displayName,
          avatarUrl:
            appr.photoURL ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          level: profile.level || 1,
          xp: profile.experiencePoints || 0,
          totalPoints: profile.totalPoints || 0,
          badgesCount: profile.badgesCount || 0,
          streakDays: profile.currentStreak || 1,
          isCurrentUser: currentUserId ? uid === currentUserId : false,
        });
      }

      // 3. Ordenar por XP / totalPoints descendente
      leaderboard.sort((a, b) => b.xp - a.xp || b.totalPoints - a.totalPoints);

      // 4. Asignar posiciones 1, 2, 3...
      leaderboard.forEach((entry, idx) => {
        entry.rank = idx + 1;
      });

      return leaderboard;
    } catch (err) {
      console.warn('[gamificationService] Error calculando ranking de ficha:', err);
      return [];
    }
  },

  // =========================================================================
  // INTEGRACIONES CON EVENTOS ACADÉMICOS (Secciones 6, 7, 8)
  // =========================================================================

  /**
   * Evento: Entrega inicial de evidencia por el aprendiz
   */
  async onEvidenceSubmitted(payload: { submissionId: string; userId: string; activityTitle?: string }) {
    const { submissionId, userId, activityTitle } = payload;
    return this.recordEvent({
      id: `gamification_${userId}_EVIDENCE_SUBMITTED_${submissionId}`,
      userId,
      type: 'EVIDENCE_SUBMITTED',
      points: GAMIFICATION_POINTS.EVIDENCE_SUBMITTED,
      sourceId: submissionId,
      sourceType: 'submission',
      description: `Entrega de evidencia: ${activityTitle || 'Actividad de aprendizaje'}`,
    });
  },

  /**
   * Evento: Corrección de evidencia radicada con nueva versión
   */
  async onCorrectionCompleted(payload: {
    submissionId: string;
    userId: string;
    version: number;
    activityTitle?: string;
  }) {
    const { submissionId, userId, version, activityTitle } = payload;
    return this.recordEvent({
      id: `gamification_${userId}_CORRECTION_COMPLETED_${submissionId}_v${version}`,
      userId,
      type: 'CORRECTION_COMPLETED',
      points: GAMIFICATION_POINTS.CORRECTION_COMPLETED,
      sourceId: submissionId,
      sourceType: 'submission',
      description: `Corrección radicada (v${version}): ${activityTitle || 'Evidencia'}`,
    });
  },

  /**
   * Evento: Evidencia calificada con A (Aprobada)
   */
  async onEvidenceApproved(payload: {
    submissionId: string;
    userId: string;
    version?: number;
    activityTitle?: string;
  }) {
    const { submissionId, userId, version = 1, activityTitle } = payload;
    return this.recordEvent({
      id: `gamification_${userId}_EVIDENCE_APPROVED_${submissionId}_v${version}`,
      userId,
      type: 'EVIDENCE_APPROVED',
      points: GAMIFICATION_POINTS.EVIDENCE_APPROVED,
      sourceId: submissionId,
      sourceType: 'submission',
      description: `Evidencia aprobada (A): ${activityTitle || 'Excelente entrega'}`,
    });
  },

  /**
   * Evento: Asistencia registrada como PRESENTE
   */
  async onAttendanceRecorded(payload: {
    attendanceId: string;
    userId: string;
    status: string;
    date?: string;
  }) {
    const { attendanceId, userId, status, date } = payload;
    if (status !== 'PRESENTE') {
      return { awarded: false, profile: await this.getProfile(userId) };
    }

    return this.recordEvent({
      id: `gamification_${userId}_ATTENDANCE_${attendanceId}`,
      userId,
      type: 'ATTENDANCE_PRESENT',
      points: GAMIFICATION_POINTS.ATTENDANCE_PRESENT,
      sourceId: attendanceId,
      sourceType: 'attendance',
      description: `Asistencia puntual: ${date || 'Sesión formativa'}`,
    });
  },

  /**
   * Evento: Actividad completada
   */
  async onActivityCompleted(payload: { activityId: string; userId: string; activityTitle?: string }) {
    const { activityId, userId, activityTitle } = payload;
    return this.recordEvent({
      id: `gamification_${userId}_ACTIVITY_${activityId}`,
      userId,
      type: 'ACTIVITY_COMPLETED',
      points: GAMIFICATION_POINTS.ACTIVITY_COMPLETED,
      sourceId: activityId,
      sourceType: 'activity',
      description: `Actividad completada: ${activityTitle || 'Formación SENA'}`,
    });
  },

  /**
   * Ajuste manual por el instructor (Sección 15)
   */
  async manualAdjustPoints(payload: {
    userId: string;
    points: number;
    reason: string;
    instructorUid: string;
    fichaId?: string;
  }) {
    const { userId, points, reason, instructorUid, fichaId } = payload;
    return this.recordEvent({
      id: `gamification_${userId}_MANUAL_${Date.now()}`,
      userId,
      type: 'MANUAL_ADJUSTMENT',
      points,
      sourceId: fichaId,
      sourceType: 'manual',
      description: `Ajuste formativo por instructor: ${reason}`,
      createdBy: instructorUid,
    });
  },
};
