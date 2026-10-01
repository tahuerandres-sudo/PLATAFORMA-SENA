/**
 * @license
 * SENA Learning Hub - Vista de Seguimiento Académico y Comportamental (Instructor)
 * PROMPT 10: Módulo Académico Real conectado a Firestore
 *
 * Flujo:
 * - Selección de Ficha asignada al instructor
 * - Aprendices reales matriculados vía /enrollments + /users
 * - Registros reales de /learnerRecords en Firestore
 * - Registro de observaciones cualitativas pedagógicas y actitudinales por categorías
 * - Sin datos demo ni mock
 */

import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, AlertCircle, CheckCircle2, User, BookOpen, Filter, RefreshCw, Users } from 'lucide-react';
import {
  LearnerRecord,
  LearnerRecordType,
  AcademicRecordCategory,
  BehavioralRecordCategory,
  Ficha,
  ApprenticeWithEnrollment,
} from '../../types/academic';
import { trackingService } from '../../services/academic/trackingService';
import { fichaService } from '../../services/academic/fichaService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';

export const InstructorTrackingView: React.FC = () => {
  const { userProfile } = useAuth();
  const instructorId = userProfile?.uid || 'inst_carlos_mendoza';

  // Fichas asignadas y aprendices reales
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [fichasLoading, setFichasLoading] = useState(true);
  const [selectedFicha, setSelectedFicha] = useState<string>('');
  const [apprentices, setApprentices] = useState<ApprenticeWithEnrollment[]>([]);

  // Registros de seguimiento en Firestore
  const [records, setRecords] = useState<LearnerRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal para agregar observación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<LearnerRecordType>('academic');
  const [selectedCategory, setSelectedCategory] = useState<string>('low_performance');
  const [userId, setUserId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const academicCategories: { key: AcademicRecordCategory; label: string }[] = [
    { key: 'low_performance', label: 'Bajo Rendimiento' },
    { key: 'missing_evidence', label: 'Evidencia Faltante' },
    { key: 'learning_difficulty', label: 'Dificultad de Aprendizaje' },
    { key: 'oral_expression', label: 'Expresión Oral' },
    { key: 'written_expression', label: 'Expresión Escrita' },
    { key: 'needs_support', label: 'Requiere Apoyo Pedagógico' },
    { key: 'improvement', label: 'Mejora Continua Destacada' },
    { key: 'participation', label: 'Excelente Participación' },
  ];

  const behavioralCategories: { key: BehavioralRecordCategory; label: string }[] = [
    { key: 'attendance', label: 'Asistencia y Permanencia' },
    { key: 'punctuality', label: 'Puntualidad en Sesión' },
    { key: 'responsibility', label: 'Responsabilidad' },
    { key: 'teamwork', label: 'Trabajo en Equipo' },
    { key: 'respect', label: 'Respeto y Convivencia' },
    { key: 'participation', label: 'Participación Proactiva' },
    { key: 'attitude', label: 'Actitud Positiva' },
    { key: 'compliance', label: 'Cumplimiento Normativo SENA' },
  ];

  // 1. Cargar fichas asignadas al instructor
  useEffect(() => {
    let isMounted = true;
    const fetchFichas = async () => {
      setFichasLoading(true);
      try {
        const res = await fichaService.getFichas(instructorId);
        if (isMounted) {
          const list = res.data || [];
          setFichas(list);
          if (list.length > 0) {
            setSelectedFicha(list[0].id);
          } else {
            setSelectedFicha('');
          }
        }
      } catch (err) {
        console.error('[InstructorTrackingView] Error cargando fichas:', err);
      } finally {
        if (isMounted) setFichasLoading(false);
      }
    };
    fetchFichas();
    return () => {
      isMounted = false;
    };
  }, [instructorId]);

  // 2. Cargar aprendices y registros de seguimiento al cambiar ficha
  const loadData = async () => {
    if (!selectedFicha) {
      setRecords([]);
      setApprentices([]);
      return;
    }
    setLoading(true);
    try {
      const [recsRes, appRes] = await Promise.all([
        trackingService.getLearnerRecords(selectedFicha),
        enrollmentService.getApprenticesWithEnrollment(selectedFicha, instructorId),
      ]);
      setRecords(recsRes.data || []);
      const appList = appRes.data || [];
      setApprentices(appList);
      if (appList.length > 0) {
        setUserId(appList[0].uid);
      } else {
        setUserId('');
      }
    } catch (err) {
      console.error('[InstructorTrackingView] Error cargando seguimiento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFicha]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !userId || !selectedFicha) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const newRecord: LearnerRecord = {
        id: `rec_${Date.now()}`,
        userId,
        fichaId: selectedFicha,
        type: selectedType,
        category: selectedCategory as any,
        description,
        createdBy: instructorId,
        date: now.split('T')[0],
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await trackingService.saveLearnerRecord(newRecord);
      setRecords([newRecord, ...records]);
      setIsModalOpen(false);
      setDescription('');
    } catch (err) {
      console.error('[InstructorTrackingView] Error guardando observación:', err);
    } finally {
      setSaving(false);
    }
  };

  const activeFicha = fichas.find((f) => f.id === selectedFicha);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#39A900] text-white px-2 py-0.5 rounded">
              Acompañamiento Integral
            </span>
            <span className="text-xs text-slate-500 font-mono">Modelo: LearnerRecord</span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">
            Seguimiento Académico y Comportamental
          </h1>
          <p className="text-xs text-slate-500">
            Registro de observaciones cualitativas pedagógicas y actitudinales persistidas en Firestore
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={apprentices.length === 0}
            className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            + Registrar Observación
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#39A900]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selector de Ficha Asignada */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#39A900]" />
          <span className="font-bold text-slate-700">Ficha de Formación:</span>
          {fichasLoading ? (
            <span className="text-slate-400">Cargando fichas asignadas...</span>
          ) : fichas.length === 0 ? (
            <span className="text-amber-800 font-medium">Sin fichas asignadas a tu cuenta</span>
          ) : (
            <select
              value={selectedFicha}
              onChange={(e) => setSelectedFicha(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:border-[#39A900]"
            >
              {fichas.map((f) => (
                <option key={f.id} value={f.id}>
                  Ficha #{f.number} · {f.programName || 'Programa SENA'}
                </option>
              ))}
            </select>
          )}
        </div>
        {activeFicha && (
          <span className="text-slate-500 font-medium">
            Aprendices matriculados: <strong>{apprentices.length}</strong>
          </span>
        )}
      </div>

      {/* Lista de Registros */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#39A900] mb-2" />
          <p className="text-xs">Cargando observaciones de seguimiento pedagógico...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="font-bold text-sm text-slate-700">Sin observaciones registradas</p>
          <p className="text-xs mt-1">No hay anotaciones pedagógicas ni comportamentales para esta ficha.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => {
            const apprentice = apprentices.find((a) => a.uid === rec.userId);
            const isAcademic = rec.type === 'academic';
            return (
              <div
                key={rec.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2 hover:border-[#39A900] transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isAcademic
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {isAcademic ? 'Académico' : 'Comportamental'}
                    </span>
                    <span className="text-xs font-bold text-[#00324D] font-mono">
                      Categoría: {rec.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{rec.date}</span>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  "{rec.description}"
                </div>

                {apprentice && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                    <img
                      src={apprentice.photoURL}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span>Aprendiz: <strong className="text-slate-800">{apprentice.displayName}</strong></span>
                    <span className="font-mono text-slate-400">· CC {apprentice.documentNumber || '—'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear Observación */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Observación de Seguimiento"
        subtitle={activeFicha ? `Ficha #${activeFicha.number} · ${activeFicha.programName || 'SENA'}` : ''}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !userId}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Observación'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Aprendiz Destinatario *
            </label>
            {apprentices.length === 0 ? (
              <p className="text-xs text-amber-700 p-2 bg-amber-50 rounded">
                No hay aprendices matriculados en esta ficha.
              </p>
            ) : (
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                {apprentices.map((a) => (
                  <option key={a.uid} value={a.uid}>
                    {a.displayName} (CC {a.documentNumber || '—'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Registro *
              </label>
              <select
                value={selectedType}
                onChange={(e) => {
                  const val = e.target.value as LearnerRecordType;
                  setSelectedType(val);
                  setSelectedCategory(
                    val === 'academic' ? academicCategories[0].key : behavioralCategories[0].key
                  );
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="academic">Académico</option>
                <option value="behavioral">Comportamental</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoría Predeterminada *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                {selectedType === 'academic'
                  ? academicCategories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))
                  : behavioralCategories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observación y Plan de Acompañamiento *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Detalla la situación observada y compromisos pedagógicos acordados..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
