/**
 * @license
 * SENA Learning Hub - Consola Oficial de Calificaciones A / N / C (Instructor)
 * PROMPT 7: Registro de evaluaciones y retroalimentación según escala oficial SENA
 * Colección Firestore: /submissions
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  Filter,
  Download,
  Clock,
  HardDrive,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AcademicSubmission, EvidenceActivity } from '../../types/academic';
import { submissionService } from '../../services/submissions/submissionService';
import { activityService } from '../../services/academic/activityService';
import { useAuth } from '../../hooks/useAuth';

export const InstructorGradesView: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'A' | 'N' | 'C' | 'pending'>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, actsRes] = await Promise.all([
        submissionService.getAllSubmissions(currentUser?.uid || userProfile?.uid),
        activityService.getActivities(),
      ]);
      setSubmissions(subsRes.data || []);
      setActivities(actsRes.data || []);
    } catch (err) {
      console.warn('[InstructorGradesView] Error cargando calificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.uid, userProfile?.uid]);

  const activityMap = useMemo(() => {
    const map = new Map<string, EvidenceActivity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  const gradedItems = useMemo(() => {
    return submissions.filter((item) => {
      const act = activityMap.get(item.activityId);
      const actTitle = act?.title || item.activityId;
      const learner = item.learnerName || '';

      const matchesSearch =
        learner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        actTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.fileName || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === 'A') return item.status === 'approved' || item.grade === 'A';
      if (filterStatus === 'N') return item.status === 'not_approved' || item.grade === 'N';
      if (filterStatus === 'C') return item.status === 'correction_required' || item.grade === 'C';
      if (filterStatus === 'pending') {
        return (
          item.status === 'pending' ||
          item.status === 'submitted' ||
          item.status === 'under_review' ||
          (!item.grade && item.status !== 'approved' && item.status !== 'not_approved' && item.status !== 'correction_required')
        );
      }
      return true;
    });
  }, [submissions, searchTerm, filterStatus, activityMap]);

  // Exportar Sábana a CSV
  const handleExportSheet = () => {
    if (gradedItems.length === 0) return;

    const headers = [
      'Aprendiz',
      'Correo',
      'Ficha',
      'Actividad',
      'Calificación Oficial SENA',
      'Retroalimentación',
      'Evaluador',
      'Fecha',
    ];

    const rows = gradedItems.map((item) => {
      const act = activityMap.get(item.activityId);
      const gradeStr =
        item.grade === 'A' || item.status === 'approved'
          ? 'A (Aprobado)'
          : item.grade === 'N' || item.status === 'not_approved'
          ? 'N (No aprobado)'
          : item.grade === 'C' || item.status === 'correction_required'
          ? 'C (Requiere corrección)'
          : 'Pendiente';

      return [
        `"${item.learnerName || 'Aprendiz'}"`,
        `"${item.learnerEmail || ''}"`,
        `"${item.fichaId || ''}"`,
        `"${act?.title || item.activityId}"`,
        `"${gradeStr}"`,
        `"${(item.feedback || '').replace(/"/g, '""')}"`,
        `"${item.gradedBy || ''}"`,
        `"${item.gradedAt || item.submittedAt || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sabana_Calificaciones_SENA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-[#00324D]">Consola Oficial de Calificaciones</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro institucional de juicios evaluativos bajo la escala SENA: A (Aprobado), N (No aprobado), C (Corregir)
          </p>
        </div>
        <button
          onClick={handleExportSheet}
          disabled={gradedItems.length === 0}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#00324D] rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-[#39A900]" />
          Exportar Sábana CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por aprendiz, archivo o actividad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterStatus === 'all' ? 'bg-[#00324D] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Todos ({submissions.length})
          </button>
          <button
            onClick={() => setFilterStatus('A')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterStatus === 'A' ? 'bg-[#39A900] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            A · Aprobadas
          </button>
          <button
            onClick={() => setFilterStatus('C')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterStatus === 'C' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            C · Corregir
          </button>
          <button
            onClick={() => setFilterStatus('N')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterStatus === 'N' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            N · No Aprobadas
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterStatus === 'pending' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Pendientes
          </button>
        </div>
      </div>

      {/* Tabla de Calificaciones */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#39A900] mb-2" />
            Cargando calificaciones desde Firestore...
          </div>
        ) : gradedItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-1">
            <Award className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No se encontraron entregas</p>
            <p className="text-slate-400">Ajusta los filtros o realiza evaluaciones en la sección "Evidencias".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#00324D] text-white">
                  <th className="p-3.5 font-bold">Aprendiz</th>
                  <th className="p-3.5 font-bold">Actividad</th>
                  <th className="p-3.5 font-bold text-center">Dictamen SENA</th>
                  <th className="p-3.5 font-bold">Estado Oficial</th>
                  <th className="p-3.5 font-bold">Retroalimentación Formativa</th>
                  <th className="p-3.5 font-bold">Evaluador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {gradedItems.map((item) => {
                  const act = activityMap.get(item.activityId);
                  const isApproved = item.status === 'approved' || item.grade === 'A';
                  const isNotApproved = item.status === 'not_approved' || item.grade === 'N';
                  const isCorrection = item.status === 'correction_required' || item.grade === 'C';
                  const isPending = !isApproved && !isNotApproved && !isCorrection;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{item.learnerName || 'Aprendiz'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.learnerEmail || item.userId}
                        </div>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="font-semibold text-slate-800 line-clamp-1">
                          {act?.title || item.activityId}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.fileName || item.externalUrl || 'Evidencia'}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        {isApproved && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#EBF8E7] text-[#2E8500] font-black text-sm border border-[#39A900]/40">
                            A
                          </span>
                        )}
                        {isNotApproved && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-50 text-rose-700 font-black text-sm border border-rose-300">
                            N
                          </span>
                        )}
                        {isCorrection && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-800 font-black text-sm border border-amber-300">
                            C
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100 text-slate-500 font-bold text-[10px]">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2E8500]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aprobado
                          </span>
                        )}
                        {isNotApproved && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                            <AlertCircle className="w-3.5 h-3.5" />
                            No Aprobado
                          </span>
                        )}
                        {isCorrection && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800">
                            <RotateCcw className="w-3.5 h-3.5" />
                            Requiere Corrección
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            Sin Calificar
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 max-w-sm">
                        {item.feedback ? (
                          <p className="text-xs text-slate-700 italic line-clamp-2">
                            "{item.feedback}"
                          </p>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin comentarios</span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-slate-600">
                        <div>{item.gradedBy || '—'}</div>
                        {item.gradedAt && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(item.gradedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
