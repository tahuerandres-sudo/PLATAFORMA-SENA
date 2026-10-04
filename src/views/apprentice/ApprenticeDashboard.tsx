/**
 * @license
 * SENA Learning Hub - Dashboard del Aprendiz
 * Conectado a Firestore: /enrollments, /fichas, /trainingPrograms, /trainingCenters, /courses
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ArrowRight,
  Flame,
  Trophy,
  Sparkles,
  Building2,
  Users,
  GraduationCap,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  CalendarCheck,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getEnrollmentsForApprentice } from '../../services/firebase/academicService';
import { EnrichedEnrollment, GamificationProfile } from '../../types/academic';
import { gamificationService, calculateLevel } from '../../services/academic/gamificationService';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface ApprenticeDashboardProps {
  onNavigate: (viewId: string) => void;
  onOpenActivity: (activityId: string) => void;
}

export const ApprenticeDashboard: React.FC<ApprenticeDashboardProps> = ({
  onNavigate,
  onOpenActivity,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrichedEnrollment[]>([]);
  const [gamProfile, setGamProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadApprenticeData() {
      if (!currentUser) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const [list, prof] = await Promise.all([
          getEnrollmentsForApprentice(currentUser.uid),
          gamificationService.getProfile(currentUser.uid),
        ]);
        setEnrollments(list);
        setGamProfile(prof);
      } catch (err: any) {
        console.warn('[ApprenticeDashboard] Aviso al cargar enrollments:', err);
      } finally {
        setLoading(false);
      }
    }
    loadApprenticeData();
  }, [currentUser]);

  // Tomar la primera inscripción activa del aprendiz si existe
  const activeEnrollment = enrollments.length > 0 ? enrollments[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Banner de Bienvenida del Aprendiz */}
      <div className="bg-gradient-to-r from-[#00324D] to-[#004A73] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xs border border-slate-700/50">
        <div className="max-w-2xl space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-[#39A900]/25 text-[#8CE665] border border-[#39A900]/40 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            {activeEnrollment ? (
              <span>Ficha #{activeEnrollment.ficha?.number || 'Sin número'} · {activeEnrollment.program?.name || 'Formación SENA'}</span>
            ) : (
              <span>SENA Learning Hub · Formación Profesional Integral</span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ¡Hola, {userProfile?.displayName ? userProfile.displayName.split(' ')[0] : 'Aprendiz'}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {activeEnrollment
              ? 'Consulta el estado de tu ficha, programa de formación, competencias y procesos pedagógicos.'
              : 'Bienvenido al ecosistema institucional de aprendizaje del SENA.'}
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-bold text-amber-300">
                Racha: {gamProfile?.currentStreak || 1} {gamProfile?.currentStreak === 1 ? 'día' : 'días'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">
                Nivel {calculateLevel(gamProfile?.experiencePoints || 0).level} · {calculateLevel(gamProfile?.experiencePoints || 0).title}
              </span>
            </div>
          </div>
        </div>

        <div className="absolute -right-8 -bottom-8 w-60 h-60 rounded-full bg-[#39A900]/15 blur-2xl pointer-events-none" />
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Sección Principal: Consulta de Matrícula Real en Firestore */}
      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Consultando tu matrícula académica en Firestore...</p>
        </div>
      ) : !activeEnrollment ? (
        /* Estado vacío amigable especificado estrictamente en Requisito 13 */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#00324D]">
              No tienes una ficha asignada actualmente.
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tu usuario está autenticado con rol de <strong>Aprendiz</strong>, pero aún no tiene una matrícula registrada en la colección <code className="bg-slate-100 px-1 py-0.5 rounded">/enrollments</code> vinculada a tu UID ({currentUser?.uid}).
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-left text-xs text-slate-600 border border-slate-200">
            <p className="font-semibold text-slate-700 mb-1">Información de tu Perfil Institucional:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500 text-[11px]">
              <li>Correo: {userProfile?.email}</li>
              <li>UID: {userProfile?.uid}</li>
              <li>Estado: {userProfile?.status}</li>
            </ul>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            El instructor o coordinador de tu centro de formación te asignará a tu ficha correspondiente.
          </p>
        </div>
      ) : (
        /* Datos Académicos Reales del Aprendiz desde Firestore */
        <div className="space-y-6">
          {/* Accesos Rápidos: Asistencia y Calendario Académico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#39A900] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#00324D]">Control de Asistencia y Justificaciones</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-1">
                    Consulta asistencias diarias, llamados y justifica inasistencias.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('attendance_tracking')}
                className="px-3 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Ver Asistencia →
              </button>
            </div>

            <div className="bg-linear-to-r from-sky-50 via-indigo-50 to-emerald-50 border border-sky-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00324D] text-[#39A900] flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#00324D]">Calendario Académico y Agenda</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-1">
                    Actividades asignadas, fechas límite y avisos en un solo lugar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="px-3 py-1.5 bg-[#39A900] hover:bg-[#2d8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Ver Calendario →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mi Ficha */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Mi Ficha</span>
              <div className="text-lg font-bold font-mono text-[#00324D]">
                #{activeEnrollment.ficha?.number || '—'}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {activeEnrollment.ficha?.academicStage || 'Etapa Lectiva'}
              </p>
            </div>

            {/* Mi Programa */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Mi Programa</span>
              <div className="text-sm font-bold text-slate-800 line-clamp-1" title={activeEnrollment.program?.name}>
                {activeEnrollment.program?.name || 'Programa de Formación'}
              </div>
              <p className="text-[11px] text-slate-500">
                Nivel: {activeEnrollment.program?.level || 'Tecnólogo'}
              </p>
            </div>

            {/* Mi Centro */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Mi Centro</span>
              <div className="text-sm font-bold text-slate-800 line-clamp-1" title={activeEnrollment.center?.name}>
                {activeEnrollment.center?.name || 'Centro de Comercio y Servicios'}
              </div>
              <p className="text-[11px] text-slate-500">
                {activeEnrollment.center?.city || 'Ibagué'}, {activeEnrollment.center?.regional || 'Tolima'}
              </p>
            </div>

            {/* Instructor */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Instructor Asignado</span>
              <div className="text-sm font-bold text-[#2E8500] line-clamp-1">
                {activeEnrollment.instructors && activeEnrollment.instructors.length > 0
                  ? activeEnrollment.instructors[0].displayName
                  : 'Instructor Titular'}
              </div>
              <p className="text-[11px] text-slate-500">
                {activeEnrollment.instructors && activeEnrollment.instructors.length > 0
                  ? activeEnrollment.instructors[0].email
                  : 'SENA Formación'}
              </p>
            </div>
          </div>

          {/* Mis Cursos y Competencias Reales */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-[#00324D]">Mis Cursos y Competencias (Firestore)</h3>
                <p className="text-xs text-slate-500">Competencias asignadas a tu ficha a través de <code className="bg-slate-100 px-1 py-0.5 rounded">/fichaCourses</code></p>
              </div>
              <span className="text-xs font-semibold bg-[#EBF8E7] text-[#2E8500] px-2.5 py-1 rounded">
                {activeEnrollment.courses?.length || 0} cursos activos
              </span>
            </div>

            {activeEnrollment.courses && activeEnrollment.courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeEnrollment.courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-[#39A900] transition-all bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🇬🇧</span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{course.name}</h4>
                          <span className="text-[10px] font-mono uppercase bg-[#39A900] text-white px-2 py-0.5 rounded font-bold">
                            {course.type === 'transversal' ? 'Transversal' : 'Técnico'}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={course.status} size="sm" />
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                      <span className="text-[11px] text-slate-500 font-mono">Código: {course.code}</span>
                      <button
                        onClick={() => onNavigate('courses')}
                        className="text-xs font-bold text-[#2E8500] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Ver Detalles
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                No hay cursos vinculados en <code className="bg-white px-1 py-0.5 rounded border border-slate-200">/fichaCourses</code> para esta ficha aún.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
