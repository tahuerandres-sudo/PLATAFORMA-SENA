/**
 * @license
 * SENA Learning Hub - Vista de Mis Logros (Aprendiz)
 */

import React from 'react';
import { Trophy, Flame, Award, Star, Compass, Clock, Mic, CheckCircle2, Lock } from 'lucide-react';
import { DEMO_BADGES } from '../../data/mockData';
import { ProgressBar } from '../../components/ui/ProgressBar';

export const ApprenticeAchievementsView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-bold text-[#00324D]">Mis Logros y Recompensas</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gana puntos XP, insignias y mantén tu racha de práctica en inglés
        </p>
      </div>

      {/* Banner de Estado Gamificado (Requisito 16) */}
      <div className="bg-gradient-to-r from-[#00324D] to-[#004A73] rounded-2xl p-6 text-white grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-sm border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-xs">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-amber-200 font-semibold uppercase tracking-wider">Nivel Actual</div>
            <div className="text-2xl font-black">Nivel 8</div>
            <span className="text-[11px] text-slate-300">Explorador Bilingüe</span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-700/80 sm:pl-6 pt-3 sm:pt-0">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-xs">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-emerald-200 font-semibold uppercase tracking-wider">Experiencia</div>
            <div className="text-2xl font-black">2.450 XP</div>
            <span className="text-[11px] text-slate-300">Próximo nivel en 350 XP</span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-700/80 sm:pl-6 pt-3 sm:pt-0">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-xs">
            <Flame className="w-6 h-6 fill-white" />
          </div>
          <div>
            <div className="text-xs text-amber-200 font-semibold uppercase tracking-wider">Racha Activa</div>
            <div className="text-2xl font-black">7 Días 🔥</div>
            <span className="text-[11px] text-slate-300">¡Sigue practicando diario!</span>
          </div>
        </div>
      </div>

      {/* Catálogo de Insignias (Desbloqueadas y Bloqueadas) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
          <Award className="w-4 h-4 text-[#39A900]" />
          Colección de Insignias de Bilingüismo
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_BADGES.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-xl border p-4 space-y-2.5 transition-all ${
                badge.isUnlocked
                  ? 'border-[#39A900]/40 bg-[#EBF8E7]/30 shadow-2xs'
                  : 'border-slate-200 bg-slate-50/60 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                    badge.isUnlocked
                      ? 'bg-[#39A900] text-white shadow-xs'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {badge.isUnlocked ? <Award className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    badge.isUnlocked
                      ? 'bg-[#39A900]/20 text-[#2E8500]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  +{badge.xpReward} XP
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900">{badge.title}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {badge.description}
                </p>
              </div>

              <div className="pt-1 text-[10px] text-slate-400 font-medium">
                {badge.isUnlocked ? `Desbloqueada el ${badge.unlockedAt}` : 'Por desbloquear'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
