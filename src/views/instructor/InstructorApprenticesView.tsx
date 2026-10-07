/**
 * @license
 * SENA Learning Hub - Vista de Lista de Aprendices por Ficha (Instructor)
 * PROMPT 8.1: Consulta Real de Aprendices vía /enrollments + /users (Sin Datos Mock)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CalendarCheck,
  ClipboardList,
  Building2,
  BookOpen,
  RefreshCw,
  UserX,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { Ficha, ApprenticeWithEnrollment } from '../../types/academic';
import { fichaService } from '../../services/academic/fichaService';
import { enrollmentService } from '../../services/academic/enrollmentService';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ApprenticeAcademicProfileModal } from '../../components/academic/ApprenticeAcademicProfileModal';
import { AddLearnerModal } from '../../components/academic/AddLearnerModal';
import { Modal } from '../../components/ui/Modal';

interface InstructorApprenticesViewProps {
  initialFichaNumber?: string;
}

export const InstructorApprenticesView: React.FC<InstructorApprenticesViewProps> = ({
  initialFichaNumber = 'all',
}) => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid;

  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [selectedFicha, setSelectedFicha] = useState<string>(initialFichaNumber);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [apprentices, setApprentices] = useState<ApprenticeWithEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [selectedApprentice, setSelectedApprentice] = useState<ApprenticeWithEnrollment | null>(
    null
  );
  const [isAddLearnerModalOpen, setIsAddLearnerModalOpen] = useState(false);

  // PROMPT 27: Estado y funciones para Quitar Aprendiz de la Ficha
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [learnerToRemove, setLearnerToRemove] = useState<ApprenticeWithEnrollment | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleConfirmRemove = async () => {
    if (!learnerToRemove || !instructorUid) return;
    setIsRemoving(true);
    setRemoveError(null);
    try {
      await enrollmentService.removeLearnerFromFicha(learnerToRemove.enrollmentId, instructorUid);
      setIsRemoveModalOpen(false);
      setLearnerToRemove(null);
      await loadRealApprentices();
    } catch (err: any) {
      console.error('[InstructorApprenticesView] Error desvinculando aprendiz:', err);
      setRemoveError(err?.message || 'Error al desvincular el aprendiz de la ficha.');
    } finally {
      setIsRemoving(false);
    }
  };

  // 1. Cargar las fichas asignadas a este instructor
  useEffect(() => {
    async function loadFichas() {
      try {
        const res = await fichaService.getFichas(instructorUid);
        if (res.data) {
          setFichas(res.data);
          // Si initialFichaNumber es '3409626' o similar y existe en las fichas, seleccionarla
          if (initialFichaNumber !== 'all' && res.data.some((f) => f.number === initialFichaNumber || f.id === initialFichaNumber)) {
            setSelectedFicha(initialFichaNumber);
          } else if (selectedFicha !== 'all' && !res.data.some((f) => f.number === selectedFicha || f.id === selectedFicha)) {
            setSelectedFicha('all');
          }
        }
      } catch (err) {
        console.warn('[InstructorApprenticesView] Error cargando fichas:', err);
      }
    }
    loadFichas();
  }, [instructorUid, initialFichaNumber]);

  // 2. Cargar aprendices reales desde /enrollments + /users
  const loadRealApprentices = useCallback(async () => {
    setLoading(true);
    setIsUnauthorized(false);
    try {
      const res = await enrollmentService.getApprenticesWithEnrollment(
        selectedFicha,
        instructorUid
      );

      if (res.unauthorized) {
        setIsUnauthorized(true);
        setApprentices([]);
      } else {
        setApprentices(res.data || []);
      }
    } catch (err) {
      console.warn('[InstructorApprenticesView] Error consultando aprendices reales:', err);
      setApprentices([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFicha, instructorUid]);

  useEffect(() => {
    loadRealApprentices();
  }, [loadRealApprentices]);

  // 3. Filtrar por búsqueda y estado
  const filteredApprentices = useMemo(() => {
    return apprentices.filter((apprentice) => {
      const matchesSearch =
        searchTerm === '' ||
        apprentice.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apprentice.documentNumber.includes(searchTerm) ||
        apprentice.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'all' ||
        apprentice.status === selectedStatus ||
        apprentice.enrollmentStatus === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [apprentices, searchTerm, selectedStatus]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#00324D] text-[#8CE665] px-2 py-0.5 rounded font-mono">
              FICHA {selectedFicha === 'all' ? 'TODAS LAS ASIGNADAS' : selectedFicha}
            </span>
            <span className="text-[11px] font-bold bg-[#EBF8E7] text-[#2E8500] px-2 py-0.5 rounded border border-[#39A900]/30">
              Firestore Real: /enrollments + /users
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#00324D] mt-1">Aprendices Matriculados</h1>
          <p className="text-xs text-slate-500">
            Consulta de aprendices con matrícula activa en fichas asignadas al instructor
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-xs font-semibold bg-[#EBF8E7] text-[#2E8500] px-3 py-1.5 rounded-lg border border-[#39A900]/30 inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {filteredApprentices.length} aprendices
          </div>
          <button
            onClick={() => setIsAddLearnerModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Agregar aprendiz mediante su correo Gmail"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Agregar aprendiz
          </button>
        </div>
      </div>

      {/* Alerta de no autorización si intenta ver ficha ajena */}
      {isUnauthorized && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <strong className="font-bold block">Acceso Restringido</strong>
            <span>No estás asignado como instructor a esta ficha en la colección <code>/fichas</code>.</span>
          </div>
        </div>
      )}

      {/* 2. Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="🔎 Buscar aprendiz por nombre, cédula o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedFicha}
            onChange={(e) => setSelectedFicha(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50 text-slate-700"
          >
            <option value="all">Todas mis Fichas Asignadas</option>
            {fichas.map((f) => (
              <option key={f.id} value={f.id}>
                Ficha {f.number} - {f.programName || 'Formación SENA'}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50 text-slate-700"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="completed">Culminado</option>
            <option value="withdrawn">Retirado</option>
          </select>
        </div>
      </div>

      {/* 3. Estado de Carga */}
      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Consultando /enrollments y /users en Firestore...</p>
        </div>
      ) : filteredApprentices.length === 0 ? (
        /* Requisito 11: Mensaje obligatorio cuando no hay aprendices reales */
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-dashed border-slate-300 p-8 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No hay aprendices matriculados en esta ficha.</h3>
            <p className="text-xs text-slate-500 mt-1">
              No se encontraron registros de matrícula activa en la colección <code>/enrollments</code> para la ficha seleccionada.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 4. Tabla Desktop: Datos Académicos Reales */}
          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#00324D] text-white border-b border-slate-700 select-none">
                  <th className="p-3 font-bold">Foto & Aprendiz</th>
                  <th className="p-3 font-bold">Documento / Correo</th>
                  <th className="p-3 font-bold">Teléfono</th>
                  <th className="p-3 font-bold">Programa & Ficha</th>
                  <th className="p-3 font-bold text-center">Estado</th>
                  <th className="p-3 font-bold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredApprentices.map((apprentice) => (
                  <tr key={apprentice.uid} className="hover:bg-slate-50/80 transition-colors">
                    {/* 1. Foto y Nombre */}
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={apprentice.photoURL}
                          alt={apprentice.displayName}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{apprentice.displayName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            UID: {apprentice.uid}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Documento y Correo */}
                    <td className="p-3">
                      <div className="font-mono text-slate-900 font-semibold">
                        {apprentice.documentNumber !== 'No registrado' ? `CC ${apprentice.documentNumber}` : 'No registrado'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate max-w-[170px]">
                        {apprentice.email}
                      </div>
                    </td>

                    {/* 3. Teléfono */}
                    <td className="p-3 font-mono text-slate-600">
                      {apprentice.phone || 'No registrado'}
                    </td>

                    {/* 4. Programa y Ficha */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-800 truncate max-w-[200px]" title={apprentice.programName}>
                        {apprentice.programName}
                      </div>
                      <span className="font-mono text-[11px] text-[#00324D] font-bold">
                        Ficha #{apprentice.fichaNumber}
                      </span>
                    </td>

                    {/* 5. Estado */}
                    <td className="p-3 text-center">
                      {apprentice.status === 'pending' || apprentice.enrollmentStatus === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pendiente primer login
                        </span>
                      ) : (
                        <StatusBadge status={apprentice.status} size="sm" />
                      )}
                    </td>

                    {/* Botón Ver Expediente Digital y Quitar */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedApprentice(apprentice)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#EBF8E7] text-[#00324D] hover:text-[#2E8500] rounded-lg font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          title="Consultar Expediente Académico Digital"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Expediente
                        </button>
                        {apprentice.enrollmentStatus !== 'withdrawn' ? (
                          <button
                            onClick={() => {
                              setLearnerToRemove(apprentice);
                              setRemoveError(null);
                              setIsRemoveModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold transition-colors inline-flex items-center gap-1 cursor-pointer text-xs"
                            title="Quitar aprendiz de esta ficha"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            Quitar
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">Retirado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. Versión Móvil: Tarjetas */}
          <div className="lg:hidden space-y-3">
            {filteredApprentices.map((apprentice) => (
              <div
                key={apprentice.uid}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={apprentice.photoURL}
                      alt={apprentice.displayName}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{apprentice.displayName}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {apprentice.documentNumber !== 'No registrado' ? `CC ${apprentice.documentNumber}` : 'No registrado'}
                      </p>
                    </div>
                  </div>
                  {apprentice.status === 'pending' || apprentice.enrollmentStatus === 'pending' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Pendiente primer login
                    </span>
                  ) : (
                    <StatusBadge status={apprentice.status} size="sm" />
                  )}
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg space-y-1">
                  <div>
                    <span className="text-slate-400">Correo:</span>{' '}
                    <span className="font-mono text-slate-800">{apprentice.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Teléfono:</span>{' '}
                    <span className="font-mono text-slate-800">{apprentice.phone || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Ficha:</span>{' '}
                    <strong className="font-mono text-[#00324D]">#{apprentice.fichaNumber}</strong>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400">Programa:</span> {apprentice.programName}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedApprentice(apprentice)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-[#EBF8E7] text-[#00324D] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Expediente
                  </button>
                  {apprentice.enrollmentStatus !== 'withdrawn' && (
                    <button
                      onClick={() => {
                        setLearnerToRemove(apprentice);
                        setRemoveError(null);
                        setIsRemoveModalOpen(true);
                      }}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="Quitar de la ficha"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Perfil Académico Integral */}
      <ApprenticeAcademicProfileModal
        apprentice={selectedApprentice}
        onClose={() => setSelectedApprentice(null)}
      />

      {/* Modal Agregar Aprendiz (PROMPT 21) */}
      <AddLearnerModal
        isOpen={isAddLearnerModalOpen}
        onClose={() => setIsAddLearnerModalOpen(false)}
        fichas={fichas}
        preselectedFichaId={selectedFicha !== 'all' ? selectedFicha : undefined}
        instructorUid={instructorUid || ''}
        instructorName={userProfile?.displayName}
        onLearnerAdded={() => {
          loadRealApprentices();
        }}
      />

      {/* =========================================================================
          MODAL: QUITAR APRENDIZ DE LA FICHA (PROMPT 27)
         ========================================================================= */}
      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => !isRemoving && setIsRemoveModalOpen(false)}
        title="¿Quitar aprendiz de la ficha?"
      >
        {learnerToRemove && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="text-xs text-slate-600">
                Estás a punto de desvincular al siguiente aprendiz:
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={learnerToRemove.photoURL}
                  alt={learnerToRemove.displayName}
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {learnerToRemove.displayName}
                  </div>
                  <div className="text-xs font-mono text-slate-600">
                    {learnerToRemove.email}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {learnerToRemove.documentNumber !== 'No registrado' ? `CC ${learnerToRemove.documentNumber}` : 'Sin CC'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Ficha de Formación: <strong className="font-mono text-[#00324D]">#{learnerToRemove.fichaNumber}</strong>
              </p>
            </div>

            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-1.5 text-xs text-sky-950">
              <strong className="font-bold flex items-center gap-1 text-sky-900">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                Garantía de Integridad de Cuenta:
              </strong>
              <p className="text-[11px] text-sky-800 leading-relaxed">
                • La cuenta de usuario del aprendiz en <code className="font-mono font-semibold">/users</code> y su acceso de Google NO serán eliminados.
                <br />
                • Su matrícula pasará al estado de <strong>retirado (withdrawn)</strong> para salvaguardar su historial de evidencias y notas.
                <br />
                • Podrás volver a matricularlo en esta u otra ficha en cualquier momento.
              </p>
            </div>

            {removeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{removeError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => setIsRemoveModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRemoving}
                onClick={handleConfirmRemove}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isRemoving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Desvinculando...</span>
                  </>
                ) : (
                  <>
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Quitar aprendiz de la ficha</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
