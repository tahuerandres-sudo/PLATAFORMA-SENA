/**
 * @license
 * SENA Learning Hub - Vista de Gamificación (Instructor)
 */

import React from 'react';
import { Gamepad2, Trophy, Flame, Award, Medal, Users } from 'lucide-react';
import { DEMO_LEADERBOARD, DEMO_BADGES } from '../../data/mockData';

export const InstructorGamificationView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-bold text-[#00324D]">Supervisión de Gamificación y Bilingüismo</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitorea los puntos XP, rachas de estudio e insignias desbloqueadas por los aprendices
        </p>
      </div>

      {/* Grid: Ranking de Ficha e Insignias */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Leaderboard (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Ranking de Formación · Ficha 1234567
            </h2>
            <span className="text-xs font-semibold text-[#2E8500] bg-[#EBF8E7] px-2.5 py-1 rounded">
              Puntos XP en Inglés
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {DEMO_LEADERBOARD.map((item) => (
              <div
                key={item.rank}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      item.rank === 1
                        ? 'bg-amber-400 text-white'
                        : item.rank === 2
                        ? 'bg-slate-300 text-slate-700'
                        : item.rank === 3
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.rank}
                  </span>
                  <img
                    src={item.avatarUrl}
                    alt={item.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Nivel {item.level} · {item.badgesCount} insignias
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {item.streakDays}d
                  </span>
                  <div className="font-black text-[#00324D] text-sm">{item.xp} XP</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insignias Activas (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#39A900]" />
            Catálogo de Insignias
          </h2>

          <div className="space-y-3">
            {DEMO_BADGES.slice(0, 4).map((badge) => (
              <div
                key={badge.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{badge.title}</span>
                  <span className="text-[10px] font-bold text-[#2E8500] bg-[#EBF8E7] px-2 py-0.5 rounded">
                    +{badge.xpReward} XP
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
