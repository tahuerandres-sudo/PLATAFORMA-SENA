/**
 * @license
 * SENA Learning Hub - Gestión de Llamados de Atención, Restricciones y Justificaciones (Instructor)
 * PROMPT 6: Requisitos 7, 8, 9, 11
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  ShieldAlert,
  FileCheck,
  Clock,
  CheckCircle2,
  FileText,
  User,
  Filter,
  Printer,
  XCircle,
  Eye,
  Check,
  Search,
  ExternalLink,
  RefreshCw,
  FolderArchive,
  Lock,
  Unlock,
  Edit3,
} from 'lucide-react';
import {
  AttentionCall,
  AttentionCallType,
  AttentionCallStatus,
  AcademicRestriction,
  RestrictionType,
  RestrictionStatus,
  Justification,
  Ficha,
  ApprenticeWithEnrollment,
} from '../../types/academic';
import { trackingService } from '../../services/academic/trackingService';
import { fichaService } from '../../services/academic/fichaService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { AttentionCallDocumentModal } from '../../components/academic/AttentionCallDocumentModal';
import { EditAttentionCallModal } from '../../components/academic/EditAttentionCallModal';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';

export const InstructorAttentionCallsView: React.FC = () => {
  const { userProfile } = useAuth();
  const instructorId = userProfile?.uid || 'inst_carlos_mendoza';
  const instructorName = userProfile?.displayName || 'ANDRES HUERTAS';

  // Pestaña activa
  const [activeTab, setActiveTab] = useState<'calls' | 'restrictions' | 'justifications'>('calls');

  // Estados de fichas asignadas y aprendices reales
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [fichasLoading, setFichasLoading] = useState(true);
  const [selectedFicha, setSelectedFicha] = useState<string>('');
  const [apprentices, setApprentices] = useState<ApprenticeWithEnrollment[]>([]);

  // Estados de datos
  const [calls, setCalls] = useState<AttentionCall[]>([]);
  const [restrictions, setRestrictions] = useState<AcademicRestriction[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal para Configurar y Modificar Llamado de Atención (Nuevo o Existente)
  const [editCallModalOpen, setEditCallModalOpen] = useState(false);
  const [selectedCallForEdit, setSelectedCallForEdit] = useState<Partial<AttentionCall>>({});
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Modal para Aplicar Restricción Manual
  const [createRestrModalOpen, setCreateRestrModalOpen] = useState(false);
  const [restrUserId, setRestrUserId] = useState<string>('');
  const [restrType, setRestrType] = useState<RestrictionType>('BLOQUEO_ENTREGA_EVIDENCIA');
  const [restrReason, setRestrReason] = useState('');
  const [restrDescription, setRestrDescription] = useState('');

  // Modal para Levantar Restricción
  const [liftModalOpen, setLiftModalOpen] = useState(false);
  const [selectedRestrToLift, setSelectedRestrToLift] = useState<AcademicRestriction | null>(null);
  const [liftNotes, setLiftNotes] = useState('');

  // Modal para Revisar Justificación
  const [reviewJustModalOpen, setReviewJustModalOpen] = useState(false);
  const [selectedJustToReview, setSelectedJustToReview] = useState<Justification | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'ACEPTADA' | 'RECHAZADA'>('ACEPTADA');
  const [reviewComments, setReviewComments] = useState('');
  const [liftRestrictionOnAccept, setLiftRestrictionOnAccept] = useState(true);

  // Modal de Documento Imprimible / Acta PDF
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedCallForDoc, setSelectedCallForDoc] = useState<AttentionCall | null>(null);

  // Ficha seleccionada activa
  const activeFicha = fichas.find((f) => f.id === selectedFicha);

  // Cargar fichas asignadas al instructor
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
        console.error('[InstructorAttentionCallsView] Error cargando fichas:', err);
      } finally {
        if (isMounted) setFichasLoading(false);
      }
    };
    fetchFichas();
    return () => {
      isMounted = false;
    };
  }, [instructorId]);

  // Cargar datos reales de la ficha seleccionada
  const loadData = async () => {
    if (!selectedFicha) {
      setCalls([]);
      setRestrictions([]);
      setJustifications([]);
      setApprentices([]);
      return;
    }
    setLoading(true);
    try {
      const [callsRes, restrRes, justRes, appRes] = await Promise.all([
        trackingService.getAttentionCalls(selectedFicha),
        trackingService.getRestrictions(undefined, selectedFicha),
        trackingService.getJustifications(selectedFicha),
        enrollmentService.getApprenticesWithEnrollment(selectedFicha, instructorId),
      ]);
      setCalls(callsRes.data || []);
      setRestrictions(restrRes.data || []);
      setJustifications(justRes.data || []);
      const appList = appRes.data || [];
      setApprentices(appList);
      if (appList.length > 0) {
        setRestrUserId(appList[0].uid);
      } else {
        setRestrUserId('');
      }
    } catch (err) {
      console.error('[InstructorAttentionCallsView] Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFicha]);

  // Abrir modal para emitir un nuevo llamado
  const handleOpenNewCallModal = () => {
    if (apprentices.length === 0) {
      alert('No hay aprendices matriculados en esta ficha para emitir llamados.');
      return;
    }
    const apprentice = apprentices[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    setSelectedCallForEdit({
      learnerId: apprentice.uid,
      userId: apprentice.uid,
      learnerName: apprentice.displayName,
      learnerDocument: apprentice.documentNumber,
      fichaId: selectedFicha,
      fichaNumber: activeFicha?.number || apprentice.fichaNumber || selectedFicha,
      programId: activeFicha?.programId,
      programName: activeFicha?.programName || apprentice.programName || 'Programa de Formación SENA',
      type: 'INASISTENCIA',
      place: 'Ambiente de Formación',
      date: dateStr,
      dateTimeDetail: `${dateStr} ${timeStr}`,
      instructorName: instructorName,
      centerName: 'Centro de Formación SENA',
      regionalName: 'Regional SENA',
      callLevel: 'PRIMER_LLAMADO',
      normativeArticle:
        'Reglamento del Aprendiz SENA. Capítulo III. Deberes del aprendiz: Justificar debidamente las inasistencias a las actividades de formación.',
      improvementPlan:
        '1. Imprimir y firmar este llamado de atención.\n2. Presentar justificación formal en SENA Learning Hub dentro de los 3 días hábiles siguientes.\n3. Acordar con el instructor el plan de nivelación de evidencias.',
    });
    setIsEditingExisting(false);
    setEditCallModalOpen(true);
  };

  // Abrir modal para modificar detalles y plan de un llamado existente
  const handleOpenEditCallModal = (call: AttentionCall) => {
    setSelectedCallForEdit(call);
    setIsEditingExisting(true);
    setEditCallModalOpen(true);
  };

  // Confirmar emisión o edición de llamado con detalles y plan modificados
  const handleConfirmCall = async (
    data: Partial<AttentionCall>,
    applyRestriction?: boolean
  ) => {
    const now = new Date().toISOString();

    if (isEditingExisting && data.id) {
      const updated = await trackingService.updateAttentionCall(data.id, data);
      setCalls((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelectedCallForDoc(updated);
    } else {
      const apprentice =
        apprentices.find((a) => a.uid === data.userId) ||
        apprentices[0];
      const newCall: AttentionCall = {
        id: `call_${Date.now()}`,
        learnerId: data.userId || apprentice?.uid || '—',
        userId: data.userId || apprentice?.uid || '—',
        learnerName: data.learnerName || apprentice?.displayName || 'Aprendiz',
        learnerDocument: data.learnerDocument || apprentice?.documentNumber || '—',
        fichaId: selectedFicha,
        fichaNumber: data.fichaNumber || activeFicha?.number || apprentice?.fichaNumber || selectedFicha,
        programId: activeFicha?.programId,
        programName:
          data.programName || activeFicha?.programName || apprentice?.programName || 'Programa de Formación SENA',
        type: data.type || 'INASISTENCIA',
        place: data.place || 'Ambiente de Formación',
        dateTimeDetail: data.dateTimeDetail || `${now.split('T')[0]} 18:20`,
        normativeArticle: data.normativeArticle,
        reason: data.reason || `Llamado por ${data.type}`,
        description: data.description || '',
        improvementPlan: data.improvementPlan,
        date: data.date || now.split('T')[0],
        createdBy: instructorId,
        instructorName: data.instructorName || instructorName,
        centerName: data.centerName || 'Centro de Formación SENA',
        regionalName: data.regionalName || 'Regional SENA',
        callLevel: data.callLevel || 'PRIMER_LLAMADO',
        status: 'NOTIFICADO',
        createdAt: now,
        updatedAt: now,
      };

      const savedCall = await trackingService.createAttentionCall(newCall);
      setCalls([savedCall, ...calls]);
      setSelectedCallForDoc(savedCall);

      if (applyRestriction) {
        const newRestr: AcademicRestriction = {
          id: `restr_${Date.now()}`,
          learnerId: newCall.userId,
          userId: newCall.userId,
          learnerName: newCall.learnerName,
          learnerDocument: newCall.learnerDocument,
          fichaId: selectedFicha,
          programId: activeFicha?.programId,
          type: 'BLOQUEO_ENTREGA_EVIDENCIA',
          reason: `Bloqueo cautelar por llamado de atención: ${newCall.reason}`,
          description: newCall.description,
          relatedAttentionCallId: savedCall.id,
          status: 'ACTIVA',
          createdAt: now,
          updatedAt: now,
        };
        const savedRestr = await trackingService.createRestriction(newRestr);
        setRestrictions([savedRestr, ...restrictions]);
      }
    }

    setEditCallModalOpen(false);
  };

  // Manejar creación manual de restricción
  const handleCreateRestriction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restrReason) return;

    const apprentice = apprentices.find((a) => a.uid === restrUserId);
    const now = new Date().toISOString();

    const newRestr: AcademicRestriction = {
      id: `restr_${Date.now()}`,
      learnerId: restrUserId,
      userId: restrUserId,
      learnerName: apprentice?.displayName || 'Aprendiz',
      learnerDocument: apprentice?.documentNumber || '—',
      fichaId: selectedFicha,
      programId: activeFicha?.programId,
      type: restrType,
      reason: restrReason,
      description: restrDescription || 'Restricción preventiva de entrega de evidencias.',
      status: 'ACTIVA',
      createdAt: now,
      updatedAt: now,
    };

    const saved = await trackingService.createRestriction(newRestr);
    setRestrictions([saved, ...restrictions]);
    setCreateRestrModalOpen(false);
    setRestrReason('');
    setRestrDescription('');
  };

  // Manejar levantamiento de restricción
  const handleLiftRestriction = async () => {
    if (!selectedRestrToLift) return;
    await trackingService.resolveRestriction(
      selectedRestrToLift.id,
      instructorId,
      liftNotes || 'Restricción levantada por el instructor.'
    );
    setRestrictions((prev) =>
      prev.map((r) =>
        r.id === selectedRestrToLift.id
          ? { ...r, status: 'LEVANTADA', resolvedBy: instructorId, resolutionNotes: liftNotes }
          : r
      )
    );
    setLiftModalOpen(false);
    setSelectedRestrToLift(null);
    setLiftNotes('');
  };

  // Manejar revisión de justificación
  const handleReviewJustification = async () => {
    if (!selectedJustToReview) return;
    await trackingService.reviewJustification({
      justificationId: selectedJustToReview.id,
      status: reviewDecision,
      reviewedBy: instructorId,
      reviewedByName: instructorName,
      reviewComment: reviewComments,
      liftRestriction: liftRestrictionOnAccept && reviewDecision === 'ACEPTADA',
    });

    // Actualizar listas locales
    setJustifications((prev) =>
      prev.map((j) =>
        j.id === selectedJustToReview.id
          ? {
              ...j,
              status: reviewDecision,
              reviewedBy: instructorId,
              reviewedByName: instructorName,
              reviewComment: reviewComments,
            }
          : j
      )
    );

    // Si fue aceptada, actualizar llamados y restricciones
    if (reviewDecision === 'ACEPTADA') {
      if (selectedJustToReview.attentionCallId) {
        setCalls((prev) =>
          prev.map((c) =>
            c.id === selectedJustToReview.attentionCallId ? { ...c, status: 'JUSTIFICADO' } : c
          )
        );
      }
      if (liftRestrictionOnAccept) {
        setRestrictions((prev) =>
          prev.map((r) =>
            r.userId === selectedJustToReview.userId || r.learnerId === selectedJustToReview.userId
              ? { ...r, status: 'LEVANTADA', resolvedBy: instructorId }
              : r
          )
        );
      }
    }

    setReviewJustModalOpen(false);
    setSelectedJustToReview(null);
    setReviewComments('');
  };

  // Abrir vista de documento imprimible
  const openDocumentModal = (call: AttentionCall) => {
    setSelectedCallForDoc(call);
    setDocumentModalOpen(true);
  };

  // Filtrado de llamados
  const filteredCalls = calls.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (c.learnerName && c.learnerName.toLowerCase().includes(q)) ||
        (c.learnerDocument && c.learnerDocument.includes(q)) ||
        c.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded">
              Acompañamiento y Debido Proceso
            </span>
            <span className="text-xs text-slate-500 font-mono">
              AttentionCall · AcademicRestriction · Justification
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">
            Llamados de Atención, Restricciones y Justificaciones
          </h1>
          <p className="text-xs text-slate-500">
            Control disciplinario, radicación de descargos con soporte y levantamiento de restricciones
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'calls' && (
            <button
              onClick={handleOpenNewCallModal}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Emitir Llamado
            </button>
          )}

          {activeTab === 'restrictions' && (
            <button
              onClick={() => setCreateRestrModalOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              + Aplicar Restricción
            </button>
          )}

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

      {/* Banner de Garantía: No bloquear Firebase Auth (Requisito 9) */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold">Garantía Constitucional y Debido Proceso SENA:</strong>
          <p className="text-[11px] leading-relaxed text-amber-800">
            Una restricción académica o llamado de atención <strong>NUNCA</strong> bloquea el inicio de sesión del aprendiz en Firebase Authentication. El aprendiz siempre puede acceder a consultar sus faltas, descargar el acta y radicar formalmente su justificación con soportes.
          </p>
        </div>
      </div>

      {/* Selector de Ficha Asignada */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#39A900]" />
          <span className="font-bold text-slate-700">Ficha Asignada:</span>
          {fichasLoading ? (
            <span className="text-slate-400">Cargando fichas asignadas...</span>
          ) : fichas.length === 0 ? (
            <span className="text-amber-700 font-semibold">Sin fichas asignadas a tu cuenta</span>
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

      {/* 2. Pestañas de Navegación del Módulo */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('calls')}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'calls'
              ? 'bg-rose-50 text-rose-800 border-b-2 border-rose-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          Llamados de Atención ({calls.length})
        </button>

        <button
          onClick={() => setActiveTab('restrictions')}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'restrictions'
              ? 'bg-slate-100 text-slate-900 border-b-2 border-slate-800'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          Restricciones Académicas ({restrictions.filter((r) => r.status === 'active' || r.status === 'ACTIVA').length} activas)
        </button>

        <button
          onClick={() => setActiveTab('justifications')}
          className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'justifications'
              ? 'bg-[#EBF8E7] text-[#00324D] border-b-2 border-[#39A900]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4 text-[#39A900]" />
          Revisión de Justificaciones ({justifications.filter((j) => j.status === 'PENDIENTE' || j.status === 'pending').length} pendientes)
        </button>
      </div>

      {/* ========================================================
          PESTAÑA 1: LLAMADOS DE ATENCIÓN
         ======================================================== */}
      {activeTab === 'calls' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar aprendiz, documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900]"
                />
              </div>

              {/* Filtro Tipo */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700"
              >
                <option value="all">Todos los Tipos</option>
                <option value="INASISTENCIA">INASISTENCIA</option>
                <option value="TARDANZA">TARDANZA</option>
                <option value="NO_ENTREGA_EVIDENCIA">NO_ENTREGA_EVIDENCIA</option>
                <option value="OTRO">OTRO</option>
              </select>

              {/* Filtro Estado */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700"
              >
                <option value="all">Todos los Estados</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="NOTIFICADO">NOTIFICADO</option>
                <option value="EN_REVISION">EN_REVISION</option>
                <option value="JUSTIFICADO">JUSTIFICADO</option>
                <option value="CERRADO">CERRADO</option>
              </select>
            </div>

            <span className="text-[11px] text-slate-500 font-medium">
              Mostrando {filteredCalls.length} expedientes
            </span>
          </div>

          {/* Tabla de Llamados de Atención (Requisito 7) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#00324D] text-white border-b border-slate-700">
                    <th className="p-3 font-bold">Aprendiz</th>
                    <th className="p-3 font-bold">Documento</th>
                    <th className="p-3 font-bold">Ficha / Programa</th>
                    <th className="p-3 font-bold">Fecha</th>
                    <th className="p-3 font-bold text-center">Tipo</th>
                    <th className="p-3 font-bold">Motivo</th>
                    <th className="p-3 font-bold text-center">Estado</th>
                    <th className="p-3 font-bold">Instructor</th>
                    <th className="p-3 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCalls.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No se encontraron llamados de atención con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredCalls.map((c) => {
                      const apprentice = apprentices.find(
                        (a) => a.uid === c.userId || (c.learnerDocument && a.documentNumber === c.learnerDocument)
                      );

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Aprendiz */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <img
                                src={apprentice?.photoURL || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100'}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                              />
                              <strong className="text-slate-900 block">
                                {c.learnerName || apprentice?.displayName || 'Aprendiz'}
                              </strong>
                            </div>
                          </td>

                          {/* Documento */}
                          <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                            CC {c.learnerDocument || apprentice?.documentNumber || '1098765432'}
                          </td>

                          {/* Ficha / Programa */}
                          <td className="p-3 text-[11px] whitespace-nowrap">
                            <span className="font-bold text-[#00324D] block">
                              Ficha #{c.fichaNumber || '3409626'}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-44">
                              {c.programName || 'Gestión Contable'}
                            </span>
                          </td>

                          {/* Fecha */}
                          <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                            {c.date}
                          </td>

                          {/* Tipo */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              {c.type}
                            </span>
                          </td>

                          {/* Motivo */}
                          <td className="p-3 text-slate-800 max-w-xs">
                            <span className="font-semibold block truncate" title={c.reason}>
                              {c.reason}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate" title={c.description}>
                              {c.description}
                            </span>
                          </td>

                          {/* Estado */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                c.status === 'JUSTIFICADO'
                                  ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30'
                                  : c.status === 'EN_REVISION'
                                  ? 'bg-blue-100 text-blue-800'
                                  : c.status === 'NOTIFICADO'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>

                          {/* Instructor */}
                          <td className="p-3 text-[11px] text-slate-600 whitespace-nowrap">
                            {c.instructorName || 'Carlos Andrés Mendoza'}
                          </td>

                          {/* Acciones */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditCallModal(c)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                title="Modificar inasistencia y plan de mejoramiento"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                Editar Plan
                              </button>
                              <button
                                onClick={() => openDocumentModal(c)}
                                className="px-3 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                                title="Generar Acta Oficial con Logo SENA / PDF"
                              >
                                <Printer className="w-3.5 h-3.5 text-[#8CE665]" />
                                Acta Oficial
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 2: RESTRICCIONES ACADÉMICAS (Requisito 9)
         ======================================================== */}
      {activeTab === 'restrictions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Expedientes con Restricción Académica Activa o Histórica ({restrictions.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Tipos: BLOQUEO_ENTREGA_EVIDENCIA · ADVERTENCIA_ACADEMICA · REVISION_COMITE · CONDICIONAMIENTO_MATRICULA
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restrictions.map((r) => {
              const isActive = r.status === 'active' || r.status === 'ACTIVA';
              const apprentice = apprentices.find((a) => a.uid === r.userId || (r.learnerDocument && a.documentNumber === r.learnerDocument));

              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-colors ${
                    isActive ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded font-mono ${
                        r.type === 'BLOQUEO_ENTREGA_EVIDENCIA'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.type}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isActive ? 'RESTRICCIÓN ACTIVA' : 'LEVANTADA'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{r.reason}</h4>
                    {r.description && (
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {r.description}
                      </p>
                    )}
                  </div>

                  {apprentice && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-2">
                        <img
                          src={apprentice.photoURL}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div>
                          <strong className="text-slate-800 block">{apprentice.displayName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            CC {apprentice.documentNumber} · Ficha 3409626
                          </span>
                        </div>
                      </div>

                      {isActive && (
                        <button
                          onClick={() => {
                            setSelectedRestrToLift(r);
                            setLiftModalOpen(true);
                          }}
                          className="px-3 py-1 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Levantar
                        </button>
                      )}
                    </div>
                  )}

                  {!isActive && r.resolutionNotes && (
                    <div className="p-2 bg-emerald-50 rounded text-[10px] text-emerald-800 font-medium">
                      Levantada: {r.resolutionNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 3: REVISIÓN DE JUSTIFICACIONES (Requisito 11)
         ======================================================== */}
      {activeTab === 'justifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Justificaciones Radicadas por Aprendices ({justifications.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Garantía de debido proceso · Calificación de soporte médico, laboral o de fuerza mayor
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#00324D] text-white border-b border-slate-700">
                  <th className="p-3 font-bold">Aprendiz</th>
                  <th className="p-3 font-bold">Fecha Falta</th>
                  <th className="p-3 font-bold">Motivo & Explicación</th>
                  <th className="p-3 font-bold">Soporte Adjunto</th>
                  <th className="p-3 font-bold text-center">Estado</th>
                  <th className="p-3 font-bold text-right">Revisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {justifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No hay justificaciones radicadas en esta ficha.
                    </td>
                  </tr>
                ) : (
                  justifications.map((j) => {
                    const apprentice = apprentices.find(
                      (a) => a.uid === j.userId || (j.learnerDocument && a.documentNumber === j.learnerDocument)
                    );

                    return (
                      <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 whitespace-nowrap">
                          <strong className="text-slate-900 block">
                            {j.learnerName || apprentice?.displayName || 'Aprendiz'}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            CC {j.learnerDocument || apprentice?.documentNumber}
                          </span>
                        </td>

                        <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                          {j.date}
                        </td>

                        <td className="p-3 max-w-xs">
                          <strong className="text-slate-800 block">{j.reason}</strong>
                          <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 mt-0.5">
                            {j.description}
                          </p>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          {j.driveUrl || j.evidenceUrl ? (
                            <a
                              href={j.driveUrl || j.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {j.fileName || 'Ver Soporte Adjunto'}
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sin archivo</span>
                          )}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              j.status === 'ACEPTADA' || j.status === 'approved'
                                ? 'bg-[#EBF8E7] text-[#2E8500] border border-[#39A900]/30'
                                : j.status === 'RECHAZADA' || j.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800 font-bold animate-pulse'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>

                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedJustToReview(j);
                              setReviewDecision('ACEPTADA');
                              setReviewComments('Soporte médico/laboral verificado y admitido.');
                              setReviewJustModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-[#00324D] hover:bg-[#004A73] text-white rounded-lg text-[11px] font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-[#8CE665]" />
                            Revisar Dictamen
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALES DE ACCIÓN
         ======================================================== */}

      {/* Modal 1: Configurar y Modificar Llamado de Atención antes de Emitir */}
      <EditAttentionCallModal
        isOpen={editCallModalOpen}
        onClose={() => {
          setEditCallModalOpen(false);
          setSelectedCallForEdit({});
        }}
        initialData={selectedCallForEdit}
        isNew={!isEditingExisting}
        title={
          isEditingExisting
            ? 'Modificar Detalles de Inasistencia y Plan de Mejoramiento'
            : 'Configurar Llamado de Atención antes de Emitir'
        }
        onConfirm={handleConfirmCall}
      />

      {/* Modal 2: Crear Restricción Manual */}
      <Modal
        isOpen={createRestrModalOpen}
        onClose={() => setCreateRestrModalOpen(false)}
        title="Aplicar Restricción Académica"
        subtitle="Medida cautelar o de seguimiento disciplinario"
        footer={
          <>
            <button
              onClick={() => setCreateRestrModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateRestriction}
              className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Aplicar Restricción
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateRestriction} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Aprendiz *:</label>
            <select
              value={restrUserId}
              onChange={(e) => setRestrUserId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {apprentices.map((a) => (
                <option key={a.uid} value={a.uid}>
                  {a.displayName} (CC {a.documentNumber || '—'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Tipo de Restricción *:</label>
            <select
              value={restrType}
              onChange={(e) => setRestrType(e.target.value as RestrictionType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-bold"
            >
              <option value="BLOQUEO_ENTREGA_EVIDENCIA">BLOQUEO_ENTREGA_EVIDENCIA</option>
              <option value="ADVERTENCIA_ACADEMICA">ADVERTENCIA_ACADEMICA</option>
              <option value="REVISION_COMITE">REVISION_COMITE</option>
              <option value="CONDICIONAMIENTO_MATRICULA">CONDICIONAMIENTO_MATRICULA</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Motivo Institucional *:</label>
            <input
              type="text"
              required
              placeholder="Ej: Inasistencias reiteradas sin soporte oportuno"
              value={restrReason}
              onChange={(e) => setRestrReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Descripción y Condiciones para Levantarla:</label>
            <textarea
              rows={3}
              placeholder="Condiciones que debe cumplir el aprendiz para solicitar el levantamiento..."
              value={restrDescription}
              onChange={(e) => setRestrDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </form>
      </Modal>

      {/* Modal 3: Levantar Restricción */}
      <Modal
        isOpen={liftModalOpen}
        onClose={() => setLiftModalOpen(false)}
        title="Levantar Restricción Académica"
        subtitle={selectedRestrToLift ? `Para ${selectedRestrToLift.learnerName || 'Aprendiz'}` : ''}
        footer={
          <>
            <button
              onClick={() => setLiftModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleLiftRestriction}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Confirmar Levantamiento
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-700 leading-relaxed">
            Al levantar esta restricción, el aprendiz recuperará inmediatamente la facultad de enviar evidencias y continuar con su proceso formativo sin bloqueos.
          </p>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Observaciones / Justificación de la Habilitación:
            </label>
            <textarea
              rows={3}
              placeholder="Ej: El aprendiz radicó constancia laboral y se comprometió a ponerse al día..."
              value={liftNotes}
              onChange={(e) => setLiftNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </Modal>

      {/* Modal 4: Revisar y Dictaminar Justificación (Requisito 11) */}
      <Modal
        isOpen={reviewJustModalOpen}
        onClose={() => setReviewJustModalOpen(false)}
        title="Dictamen de Justificación Radicada"
        subtitle={selectedJustToReview ? `${selectedJustToReview.learnerName} · Fecha: ${selectedJustToReview.date}` : ''}
        footer={
          <>
            <button
              onClick={() => setReviewJustModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleReviewJustification}
              className={`px-4 py-1.5 text-white rounded-lg text-xs font-bold cursor-pointer ${
                reviewDecision === 'ACEPTADA' ? 'bg-[#39A900] hover:bg-[#2E8500]' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Emitir Dictamen ({reviewDecision})
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {selectedJustToReview && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <strong className="block text-slate-800">Causal alegada por el aprendiz:</strong>
              <p className="text-slate-700 font-medium">{selectedJustToReview.reason}</p>
              <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                "{selectedJustToReview.description}"
              </p>
              {selectedJustToReview.driveUrl && (
                <div className="pt-2 border-t border-slate-200">
                  <a
                    href={selectedJustToReview.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir soporte documental adjunto en Google Drive
                  </a>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Dictamen del Instructor *:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReviewDecision('ACEPTADA')}
                className={`p-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                  reviewDecision === 'ACEPTADA'
                    ? 'bg-[#EBF8E7] border-[#39A900] text-[#2E8500] shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                ✓ Aceptar Justificación
              </button>
              <button
                type="button"
                onClick={() => setReviewDecision('RECHAZADA')}
                className={`p-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                  reviewDecision === 'RECHAZADA'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                ✕ Rechazar Justificación
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Retroalimentación / Fundamentación de la Decisión *:
            </label>
            <textarea
              rows={3}
              required
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder="Indica las razones de la aceptación o rechazo..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {reviewDecision === 'ACEPTADA' && (
            <div className="p-3 bg-[#EBF8E7] border border-[#39A900]/30 rounded-xl flex items-start gap-2.5">
              <input
                type="checkbox"
                id="liftRestrCheck"
                checked={liftRestrictionOnAccept}
                onChange={(e) => setLiftRestrictionOnAccept(e.target.checked)}
                className="mt-0.5 rounded text-[#39A900]"
              />
              <label htmlFor="liftRestrCheck" className="text-slate-800 text-[11px] leading-relaxed cursor-pointer">
                <strong>Levantar automáticamente la restricción académica asociada:</strong>
                <span className="block text-slate-600 mt-0.5">
                  Cambia la inasistencia a <strong>EXCUSADO</strong>, el llamado de atención a <strong>JUSTIFICADO</strong> y rehabilita al aprendiz para entrega de evidencias.
                </span>
              </label>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 5: Documento Imprimible / Acta Oficial PDF (Requisito 8) */}
      <AttentionCallDocumentModal
        isOpen={documentModalOpen}
        onClose={() => {
          setDocumentModalOpen(false);
          setSelectedCallForDoc(null);
        }}
        call={selectedCallForDoc}
        onEdit={(c) => {
          setSelectedCallForEdit(c);
          setIsEditingExisting(true);
          setDocumentModalOpen(false);
          setEditCallModalOpen(true);
        }}
        onCallUpdated={(updated) => {
          setCalls((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedCallForDoc(updated);
        }}
      />
    </div>
  );
};
