/**
 * @license
 * SENA Learning Hub - Vista de Ranking de la Ficha (Aprendiz)
 */

import React from 'react';
import { Medal, Trophy, Flame, Star } from 'lucide-react';
import { DEMO_LEADERBOARD } from '../../data/mockData';

export const ApprenticeRankingView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-bold text-[#00324D]">Ranking de la Ficha 1234567</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Competencia sana y colaborativa basada en actividades y práctica de inglés
        </p>
      </div>

      {/* Podio Top 3 */}
      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-4 pb-2 items-end text-center">
        {/* Puesto 2: Juan */}
        <div className="bg-white rounded-xl border-2 border-slate-300 p-3 shadow-xs space-y-1 relative order-1">
          <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-black text-xs mx-auto flex items-center justify-center -mt-7 shadow-xs">
            2
          </div>
          <div className="font-bold text-xs text-slate-900 truncate">Juan Pérez</div>
          <div className="text-[11px] font-black text-[#2E8500]">2.450 XP</div>
          <span className="text-[10px] text-slate-400 block">7d racha</span>
        </div>

        {/* Puesto 1: María */}
        <div className="bg-white rounded-xl border-2 border-amber-400 p-4 shadow-sm space-y-1.5 relative order-2 -mt-4">
          <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-black text-sm mx-auto flex items-center justify-center -mt-8 shadow-xs">
            👑 1
          </div>
          <div className="font-bold text-xs text-slate-900 truncate">María Gómez</div>
          <div className="text-xs font-black text-[#00324D]">2.890 XP</div>
          <span className="text-[10px] text-amber-700 font-semibold block">14d racha 🔥</span>
        </div>

        {/* Puesto 3: Carlos */}
        <div className="bg-white rounded-xl border-2 border-amber-700/60 p-3 shadow-xs space-y-1 relative order-3">
          <div className="w-8 h-8 rounded-full bg-amber-700 text-white font-black text-xs mx-auto flex items-center justify-center -mt-7 shadow-xs">
            3
          </div>
          <div className="font-bold text-xs text-slate-900 truncate">Carlos Duque</div>
          <div className="text-[11px] font-black text-slate-700">2.180 XP</div>
          <span className="text-[10px] text-slate-400 block">5d racha</span>
        </div>
      </div>

      {/* Tabla Completa de Posiciones */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="font-bold text-[#00324D]">Posición en la Ficha</span>
          <span className="text-slate-500">Actualizado hoy</span>
        </div>

        <div className="divide-y divide-slate-100">
          {DEMO_LEADERBOARD.map((item) => (
            <div
              key={item.rank}
              className={`p-4 flex items-center justify-between gap-3 text-xs transition-colors ${
                item.isCurrentUser ? 'bg-[#EBF8E7]/60 font-bold border-l-4 border-[#39A900]' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-slate-500">#{item.rank}</span>
                <img
                  src={item.avatarUrl}
                  alt={item.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <div className="text-slate-900 font-semibold flex items-center gap-1.5">
                    <span>{item.name}</span>
                    {item.isCurrentUser && (
                      <span className="text-[10px] bg-[#39A900] text-white px-2 py-0.5 rounded-full font-bold">
                        Tú
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal">
                    Nivel {item.level} · {item.badgesCount} insignias
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {item.streakDays}d
                </span>
                <div className="font-black text-sm text-[#00324D]">{item.xp} XP</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
