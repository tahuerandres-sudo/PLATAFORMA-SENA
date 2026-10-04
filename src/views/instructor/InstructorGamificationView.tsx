/**
 * @license
 * SENA Learning Hub - Vista de Supervisión de Gamificación (Instructor)
 * PROMPT 14: Gestión y seguimiento real por ficha asignada en Firestore
 */

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Trophy,
  Flame,
  Award,
  Users,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { LeaderboardEntry, Ficha, BadgeDefinition } from '../../types/academic';
import {
  gamificationService,
  DEFAULT_BADGES,
} from '../../services/academic/gamificationService';
import { fichaService } from '../../services/academic/fichaService';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../../components/ui/Modal';

export const InstructorGamificationView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';

  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [selectedFichaId, setSelectedFichaId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Ajuste Manual (Sección 15)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetUser, setAdjustTargetUser] = useState<LeaderboardEntry | null>(null);
  const [adjustPoints, setAdjustPoints] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!instructorUid) return;
    setLoading(true);
    try {
      // 1. Obtener fichas asignadas al instructor
      const res = await fichaService.getFichas(instructorUid);
      const loadedFichas = res.data || [];
      setFichas(loadedFichas);

      const fichaId = selectedFichaId || (loadedFichas.length > 0 ? loadedFichas[0].id : '');
      if (fichaId && fichaId !== selectedFichaId) {
        setSelectedFichaId(fichaId);
      }

      if (fichaId) {
        // 2. Obtener ranking real de la ficha
        const data = await gamificationService.getFichaLeaderboard(fichaId);
        setLeaderboard(data);
      }
    } catch (err) {
      console.warn('[InstructorGamificationView] Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instructorUid]);

  const handleFichaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fId = e.target.value;
    setSelectedFichaId(fId);
    setLoading(true);
    try {
      const data = await gamificationService.getFichaLeaderboard(fId);
      setLeaderboard(data);
    } catch (err) {
      console.warn('Error cambiando ficha:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjust = (item: LeaderboardEntry) => {
    setAdjustTargetUser(item);
    setAdjustPoints(10);
    setAdjustReason('');
    setFeedbackMsg(null);
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetUser || !adjustReason.trim()) return;
    setIsSubmitting(true);
    try {
      await gamificationService.manualAdjustPoints({
        userId: adjustTargetUser.userId,
        points: Number(adjustPoints),
        reason: adjustReason.trim(),
        instructorUid,
        fichaId: selectedFichaId,
      });

      setFeedbackMsg({
        type: 'success',
        text: `Se aplicó el ajuste de ${adjustPoints} XP a ${adjustTargetUser.name}.`,
      });

      // Recargar datos
      const data = await gamificationService.getFichaLeaderboard(selectedFichaId);
      setLeaderboard(data);

      setTimeout(() => {
        setIsAdjustModalOpen(false);
      }, 1200);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: 'Error registrando el ajuste en Firestore.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado y Selector de Ficha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#00324D]">Supervisión de Gamificación</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitorea los puntos XP, niveles, rachas e insignias de los aprendices de tus fichas asignadas
          </p>
        </div>

        <div className="flex items-center gap-3">
          {fichas.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Ficha:</label>
              <select
                value={selectedFichaId}
                onChange={handleFichaChange}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-[#39A900] focus:outline-hidden"
              >
                {fichas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.number} - {f.programName || 'Programa'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Actualizar
          </button>
        </div>
      </div>

      {/* 2. Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabla de Ranking de la Ficha (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Progreso y Ranking de la Ficha
            </h2>
            <span className="text-xs font-semibold text-[#2E8500] bg-[#EBF8E7] px-2.5 py-1 rounded">
              Puntos XP Acumulados
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
              <p className="text-xs text-slate-500">Cargando aprendices de la ficha...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Users className="w-8 h-8 mx-auto" />
              <p className="text-xs">No hay aprendices matriculados en esta ficha aún.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {leaderboard.map((item) => (
                <div
                  key={item.userId}
                  className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50 transition-colors px-2 rounded-lg"
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
                    <button
                      onClick={() => handleOpenAdjust(item)}
                      title="Otorgar reconocimiento o ajuste formativo"
                      className="p-1 text-slate-400 hover:text-[#39A900] transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catálogo de Insignias Oficiales (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
            <Award className="w-4 h-4 text-[#39A900]" />
            Insignias Configuradas
          </h2>

          <div className="space-y-3">
            {DEFAULT_BADGES.map((badge) => (
              <div
                key={badge.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{badge.name}</span>
                  <span className="text-[10px] font-bold text-[#2E8500] bg-[#EBF8E7] px-2 py-0.5 rounded">
                    +{badge.xpReward} XP
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{badge.description}</p>
                <span className="text-[10px] text-slate-400 font-mono block">Criterio: {badge.criteria}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Reconocimiento / Ajuste Manual (Sección 15) */}
      {isAdjustModalOpen && adjustTargetUser && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title={`Reconocimiento Formativo · ${adjustTargetUser.name}`}
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4">
            <p className="text-xs text-slate-500">
              Registra una bonificación formativa o ajuste de puntos en el historial del aprendiz. Quedará guardado en{' '}
              <strong className="text-slate-700">/gamificationEvents</strong> con tu firma de instructor.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Puntos a Otorgar (XP)
              </label>
              <select
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#39A900] focus:outline-hidden"
              >
                <option value={5}>+5 XP (Participación destacada)</option>
                <option value={10}>+10 XP (Aporte colaborativo / Liderazgo)</option>
                <option value={20}>+20 XP (Proyecto complementario destacado)</option>
                <option value={50}>+50 XP (Mérito institucional especial)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo Pedagógico *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Participación activa en el debate técnico sobre bases de datos"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-[#39A900] focus:outline-hidden"
              />
            </div>

            {feedbackMsg && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !adjustReason.trim()}
                className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isSubmitting ? 'Registrando...' : 'Registrar Bonificación'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
