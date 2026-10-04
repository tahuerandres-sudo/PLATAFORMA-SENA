/**
 * @license
 * SENA Learning Hub - Vista de Mis Cursos (Aprendiz)
 * Conectado en tiempo real a Firestore: /enrollments & /fichaCourses
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, User, CheckCircle2, ArrowRight, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getEnrollmentsForApprentice } from '../../services/firebase/academicService';
import { EnrichedEnrollment, Course } from '../../types/academic';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface ApprenticeCoursesViewProps {
  onNavigateToActivities: () => void;
}

export const ApprenticeCoursesView: React.FC<ApprenticeCoursesViewProps> = ({
  onNavigateToActivities,
}) => {
  const { currentUser } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrichedEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourses() {
      if (!currentUser) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const list = await getEnrollmentsForApprentice(currentUser.uid, currentUser.email || undefined);
        setEnrollments(list);
      } catch (err: any) {
        console.warn('[ApprenticeCoursesView] Aviso al cargar cursos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, [currentUser]);

  // Extraer todos los cursos asociados a las fichas en las que el aprendiz está matriculado
  const allCourses = enrollments.flatMap((enrollment) =>
    (enrollment.courses || []).map((c: Course & { fichaCourseId: string }) => ({
      ...c,
      fichaNumber: enrollment.ficha?.number || '—',
      programName: enrollment.program?.name || 'Programa de Formación',
      instructorName:
        enrollment.instructors && enrollment.instructors.length > 0
          ? enrollment.instructors[0].displayName
          : 'Instructor Asignado',
    }))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#00324D]">Mis Cursos y Competencias</h1>
            <span className="text-[11px] font-bold bg-[#EBF8E7] text-[#2E8500] px-2 py-0.5 rounded border border-[#39A900]/30">
              Firestore Real
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Competencias académicas activas obtenidas de tu ficha a través de <code className="bg-slate-100 px-1 py-0.5 rounded">/fichaCourses</code>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Consultando competencias en Firestore...</p>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-dashed border-slate-300 p-8 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No tienes una ficha asignada actualmente.</h3>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Solicita a tu instructor que registre tu correo Gmail para darte acceso.
            </p>
          </div>
        </div>
      ) : allCourses.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-dashed border-slate-300 p-8 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No hay competencias configuradas en tu ficha</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tu ficha aún no tiene competencias registradas en el catálogo académico.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {allCourses.map((course) => (
            <div
              key={course.fichaCourseId || course.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-[#39A900] transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="bg-[#00324D] text-white p-5">
                <span className="text-[10px] uppercase font-bold tracking-wider bg-[#39A900] px-2 py-0.5 rounded text-white">
                  {course.type === 'transversal' ? 'Transversal' : 'Técnico'}
                </span>
                <h2 className="text-base font-bold text-white mt-2">{course.name}</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Ficha #{course.fichaNumber} · {course.programName}
                </p>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {course.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600">
                  <div>
                    <span className="text-slate-400">Código:</span>{' '}
                    <strong className="text-slate-800 font-mono">{course.code}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Instructor:</span>{' '}
                    <strong className="text-[#2E8500] truncate block">{course.instructorName}</strong>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Estado: <strong className="text-emerald-700 capitalize">{course.status}</strong>
                  </span>
                  <button
                    onClick={onNavigateToActivities}
                    className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    Ver Actividades
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
