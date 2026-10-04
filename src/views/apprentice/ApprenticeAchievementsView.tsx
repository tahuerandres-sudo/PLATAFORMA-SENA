/**
 * @license
 * SENA Learning Hub - Vista de Mis Logros y Gamificación (Aprendiz)
 * PROMPT 14: Datos reales en Firestore (/gamificationProfiles, /badges, /achievements)
 */

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Award,
  Star,
  CheckCircle2,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
  FileText,
  FolderArchive,
  Medal,
} from 'lucide-react';
import {
  GamificationProfile,
  BadgeDefinition,
  AchievementDefinition,
} from '../../types/academic';
import {
  gamificationService,
  calculateLevel,
} from '../../services/academic/gamificationService';
import { useAuth } from '../../hooks/useAuth';

export const ApprenticeAchievementsView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const userId = currentUser?.uid || userProfile?.uid || '';

  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [badges, setBadges] = useState<Array<BadgeDefinition & { unlocked: boolean; unlockedAt?: string }>>([]);
  const [achievements, setAchievements] = useState<Array<AchievementDefinition & { progress: number; unlocked: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [prof, userBdg, userAch] = await Promise.all([
        gamificationService.getProfile(userId),
        gamificationService.getUserBadges(userId),
        gamificationService.getUserAchievements(userId),
      ]);
      setProfile(prof);
      setBadges(userBdg);
      setAchievements(userAch);
    } catch (err) {
      console.warn('[ApprenticeAchievementsView] Error cargando gamificación:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const levelInfo = calculateLevel(profile?.experiencePoints || 0);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3 bg-white rounded-xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Consultando tus logros y puntos de gamificación...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#00324D]">Mis Logros y Recompensas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Puntos XP, rachas formativas e insignias de reconocimiento complementario
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Actualizar
        </button>
      </div>

      {/* 2. Banner de Estado Gamificado */}
      <div className="bg-gradient-to-r from-[#00324D] to-[#004A73] rounded-2xl p-6 text-white grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-sm border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-xs">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-amber-200 font-semibold uppercase tracking-wider">Nivel Actual</div>
            <div className="text-2xl font-black">Nivel {levelInfo.level}</div>
            <span className="text-[11px] text-slate-300">{levelInfo.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-700/80 sm:pl-6 pt-3 sm:pt-0">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-xs">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-emerald-200 font-semibold uppercase tracking-wider">Experiencia</div>
            <div className="text-2xl font-black">{profile?.experiencePoints || 0} XP</div>
            <span className="text-[11px] text-slate-300">
              Próximo nivel en {levelInfo.xpRemaining} XP ({levelInfo.progressPercent}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-700/80 sm:pl-6 pt-3 sm:pt-0">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-xs">
            <Flame className="w-6 h-6 fill-white" />
          </div>
          <div>
            <div className="text-xs text-amber-200 font-semibold uppercase tracking-wider">Racha Activa</div>
            <div className="text-2xl font-black">{profile?.currentStreak || 1} Días 🔥</div>
            <span className="text-[11px] text-slate-300">
              Racha máxima: {profile?.longestStreak || 1} días
            </span>
          </div>
        </div>
      </div>

      {/* 3. Barra de Progreso de Nivel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#00324D] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Progreso hacia Nivel {levelInfo.level + 1}
          </span>
          <span className="font-mono text-slate-600 font-bold">
            {profile?.experiencePoints || 0} / {levelInfo.nextLevelXp} XP
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#39A900] to-[#2E8500] transition-all duration-500 rounded-full"
            style={{ width: `${levelInfo.progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Nivel {levelInfo.level}</span>
          <span>{levelInfo.progressPercent}% completado</span>
          <span>Nivel {levelInfo.level + 1}</span>
        </div>
      </div>

      {/* 4. Resumen de Actividad Real */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-black text-[#00324D]">{profile?.totalPoints || 0}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Puntos Totales</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-black text-[#39A900]">{profile?.completedActivities || 0}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Actividades Entregadas</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-black text-amber-600">{profile?.approvedEvidenceCount || 0}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Evidencias Aprobadas (A)</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-black text-indigo-600">{badges.filter((b) => b.unlocked).length}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Insignias Desbloqueadas</div>
        </div>
      </div>

      {/* 5. Catálogo de Insignias */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#39A900]" />
            Colección Oficial de Insignias
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            {badges.filter((b) => b.unlocked).length} de {badges.length} desbloqueadas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-xl border p-4 space-y-2.5 transition-all ${
                badge.unlocked
                  ? 'border-[#39A900]/40 bg-[#EBF8E7]/30 shadow-2xs'
                  : 'border-slate-200 bg-slate-50/60 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                    badge.unlocked
                      ? 'bg-[#39A900] text-white shadow-xs'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {badge.unlocked ? <Award className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    badge.unlocked
                      ? 'bg-[#39A900]/20 text-[#2E8500]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  +{badge.xpReward} XP
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900">{badge.name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {badge.description}
                </p>
              </div>

              <div className="pt-1 text-[10px] text-slate-400 font-medium flex items-center justify-between">
                <span>Criterio: {badge.criteria}</span>
                {badge.unlocked && <span className="text-[#2E8500] font-bold">¡Desbloqueada!</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Progreso de Logros */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500" />
          Hitos y Logros de Formación
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-xl border space-y-2 ${
                ach.unlocked
                  ? 'border-amber-300 bg-amber-50/40'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{ach.title}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    ach.unlocked
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {ach.unlocked ? 'Completado ✓' : `${ach.progress}%`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{ach.description}</p>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    ach.unlocked ? 'bg-amber-500' : 'bg-slate-400'
                  }`}
                  style={{ width: `${ach.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
