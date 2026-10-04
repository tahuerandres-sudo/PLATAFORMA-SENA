/**
 * @license
 * SENA Learning Hub - Vista de Ranking de la Ficha (Aprendiz)
 * PROMPT 14: Ranking por Ficha utilizando datos reales de /enrollments y /gamificationProfiles
 */

import React, { useState, useEffect } from 'react';
import { Medal, Trophy, Flame, Star, RefreshCw, Users, ShieldAlert } from 'lucide-react';
import { LeaderboardEntry, Enrollment } from '../../types/academic';
import { gamificationService } from '../../services/academic/gamificationService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { useAuth } from '../../hooks/useAuth';

export const ApprenticeRankingView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const userId = currentUser?.uid || userProfile?.uid || '';

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeFichaId, setActiveFichaId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Obtener ficha activa del aprendiz desde su matrícula formal
      const enr = await enrollmentService.getEnrollmentByLearnerId(userId);
      const fichaId = enr?.fichaId || userProfile?.fichaId || '';
      setActiveFichaId(fichaId);

      if (fichaId) {
        // 2. Consultar leaderboard real de la ficha
        const data = await gamificationService.getFichaLeaderboard(fichaId, userId);
        setLeaderboard(data);
      }
    } catch (err) {
      console.warn('[ApprenticeRankingView] Error cargando ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Reconocimiento por Ficha
            </span>
            {activeFichaId && (
              <span className="text-xs text-slate-500">
                Ficha: <strong>{activeFichaId}</strong>
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">Ranking de Formación</h1>
          <p className="text-xs text-slate-500">
            Competencia sana y colaborativa basada en actividades y práctica continua
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

      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Calculando posiciones de la ficha en Firestore...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-2">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Aún no hay compañeros en el ranking</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            A medida que los aprendices de tu ficha entreguen evidencias y participen, sus posiciones aparecerán aquí.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Podio Top 3 */}
          {leaderboard.length >= 2 && (
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-6 pb-2 items-end text-center">
              {/* Puesto 2 */}
              {top2 && (
                <div className="bg-white rounded-xl border-2 border-slate-300 p-3 shadow-xs space-y-1 relative order-1">
                  <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-black text-xs mx-auto flex items-center justify-center -mt-7 shadow-xs">
                    2
                  </div>
                  <div className="font-bold text-xs text-slate-900 truncate">{top2.name}</div>
                  <div className="text-[11px] font-black text-[#2E8500]">{top2.xp} XP</div>
                  <span className="text-[10px] text-slate-400 block">{top2.streakDays}d racha</span>
                </div>
              )}

              {/* Puesto 1 */}
              {top1 && (
                <div className="bg-white rounded-xl border-2 border-amber-400 p-4 shadow-sm space-y-1.5 relative order-2 -mt-4">
                  <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-black text-sm mx-auto flex items-center justify-center -mt-8 shadow-xs">
                    👑 1
                  </div>
                  <div className="font-bold text-xs text-slate-900 truncate">{top1.name}</div>
                  <div className="text-xs font-black text-[#00324D]">{top1.xp} XP</div>
                  <span className="text-[10px] text-amber-700 font-semibold block">{top1.streakDays}d racha 🔥</span>
                </div>
              )}

              {/* Puesto 3 */}
              {top3 ? (
                <div className="bg-white rounded-xl border-2 border-amber-700/60 p-3 shadow-xs space-y-1 relative order-3">
                  <div className="w-8 h-8 rounded-full bg-amber-700 text-white font-black text-xs mx-auto flex items-center justify-center -mt-7 shadow-xs">
                    3
                  </div>
                  <div className="font-bold text-xs text-slate-900 truncate">{top3.name}</div>
                  <div className="text-[11px] font-black text-slate-700">{top3.xp} XP</div>
                  <span className="text-[10px] text-slate-400 block">{top3.streakDays}d racha</span>
                </div>
              ) : (
                <div className="order-3" />
              )}
            </div>
          )}

          {/* 3. Tabla Completa de Posiciones */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-[#00324D]">Posiciones en la Ficha</span>
              <span className="text-slate-500 font-medium">{leaderboard.length} aprendices registrados</span>
            </div>

            <div className="divide-y divide-slate-100">
              {leaderboard.map((item) => (
                <div
                  key={item.userId}
                  className={`p-4 flex items-center justify-between gap-3 text-xs transition-colors ${
                    item.isCurrentUser ? 'bg-[#EBF8E7]/60 font-bold border-l-4 border-[#39A900]' : 'hover:bg-slate-50'
                  }`}
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
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <div className="text-slate-900 font-semibold flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.isCurrentUser && (
                          <span className="text-[10px] bg-[#39A900] text-white px-2 py-0.2 rounded-full font-bold">
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
        </>
      )}
    </div>
  );
};
