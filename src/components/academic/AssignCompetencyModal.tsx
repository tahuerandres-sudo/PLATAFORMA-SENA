/**
 * @license
 * SENA Learning Hub - Modal Dedicado para Asignar Competencia a una Ficha de Formación
 * PROMPT 42 — Habilitar el botón "Asignar competencia ahora"
 */

import React, { useState, useMemo } from 'react';
import { Award, Search, CheckCircle2, AlertCircle, RefreshCw, BookOpen, Layers } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Ficha, Competency } from '../../types/academic';
import { fichaService } from '../../services/academic/fichaService';

interface AssignCompetencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  ficha: Ficha | null;
  allCompetencies: Competency[];
  onCompetencyAssigned: (updatedFicha: Ficha) => void;
  showToast: (msg: string) => void;
}

export const AssignCompetencyModal: React.FC<AssignCompetencyModalProps> = ({
  isOpen,
  onClose,
  ficha,
  allCompetencies,
  onCompetencyAssigned,
  showToast,
}) => {
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string>(ficha?.competencyId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'technical' | 'transversal'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronizar selección inicial cuando se abre el modal
  React.useEffect(() => {
    if (isOpen && ficha) {
      setSelectedCompetencyId(ficha.competencyId || '');
      setSearchTerm('');
      setFilterType('all');
      setErrorMessage(null);
    }
  }, [isOpen, ficha]);

  // Filtrar competencias disponibles
  const availableCompetencies = useMemo(() => {
    if (!ficha) return [];

    return allCompetencies.filter((c) => {
      // Si la competencia está asociada a un programa específico, debe coincidir con el de la ficha
      if (ficha.programId && c.programId && c.programId !== ficha.programId) {
        return false;
      }

      // Filtro por tipo
      if (filterType !== 'all' && c.type !== filterType) {
        return false;
      }

      // Filtro por término de búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesCode = c.code.toLowerCase().includes(term);
        const matchesName = c.name.toLowerCase().includes(term);
        const matchesDesc = c.description ? c.description.toLowerCase().includes(term) : false;
        return matchesCode || matchesName || matchesDesc;
      }

      return true;
    });
  }, [allCompetencies, ficha, filterType, searchTerm]);

  const selectedCompetency = useMemo(() => {
    return allCompetencies.find((c) => c.id === selectedCompetencyId) || null;
  }, [allCompetencies, selectedCompetencyId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ficha) return;

    if (!selectedCompetencyId) {
      setErrorMessage('Por favor selecciona una competencia para asociar a la ficha.');
      return;
    }

    const chosen = allCompetencies.find((c) => c.id === selectedCompetencyId);
    if (!chosen) {
      setErrorMessage('La competencia seleccionada no es válida.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updatedFicha: Ficha = {
        ...ficha,
        competencyId: chosen.id,
        competencyCode: chosen.code,
        competencyName: chosen.name,
        updatedAt: new Date().toISOString(),
      };

      const saved = await fichaService.saveFicha(updatedFicha);

      showToast(`Competencia [${chosen.code}] asignada exitosamente a la Ficha #${ficha.number}`);
      onCompetencyAssigned(saved);
      onClose();
    } catch (err: any) {
      console.error('[AssignCompetencyModal] Error asignando competencia a la ficha:', err);
      setErrorMessage(err.message || 'No fue posible guardar la asignación de la competencia.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!ficha) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSaving && onClose()}
      title="Asignar Competencia Formativa a la Ficha"
      subtitle={`Ficha #${ficha.number} · ${ficha.name || ficha.programName || 'Programa SENA'}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
            <Layers className="w-4 h-4 text-[#39A900]" />
            <span>Cadena Curricular SENA:</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Al vincular una competencia a esta ficha, todas las nuevas actividades pedagógicas filtrarán automáticamente los <strong>Resultados de Aprendizaje (RAP)</strong> correspondientes a esta norma de competencia.
          </p>
        </div>

        {/* Buscador y Filtro por Tipo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por código (ej: 240201501) o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white"
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900] bg-white font-medium"
            >
              <option value="all">Todos los tipos</option>
              <option value="technical">Técnicas</option>
              <option value="transversal">Transversales</option>
            </select>
          </div>
        </div>

        {/* Lista de Competencias Seleccionables */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span>Competencias Disponibles ({availableCompetencies.length})</span>
            {selectedCompetency && (
              <span className="text-[11px] text-[#2E8500] font-bold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Seleccionada: [{selectedCompetency.code}]
              </span>
            )}
          </label>

          {availableCompetencies.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
              <Award className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-semibold">No se encontraron competencias disponibles con los filtros actuales.</p>
              <p className="text-[11px] text-slate-400">Verifica el término de búsqueda o registra competencias en la sección de Competencias.</p>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50 divide-y divide-slate-100">
              {availableCompetencies.map((comp) => {
                const isSelected = selectedCompetencyId === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedCompetencyId(comp.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/80 border-[#39A900] shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-[#00324D] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {comp.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            comp.type === 'transversal'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {comp.type === 'transversal' ? 'Transversal' : 'Técnica'}
                        </span>
                        {comp.programId && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            · Programa específico
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {comp.name}
                      </h4>
                      {comp.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {comp.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 pt-1">
                      <input
                        type="radio"
                        name="selectedCompetency"
                        checked={isSelected}
                        onChange={() => setSelectedCompetencyId(comp.id)}
                        className="w-4 h-4 text-[#39A900] focus:ring-[#39A900] cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vista previa de la competencia seleccionada */}
        {selectedCompetency && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E8500] block">
              Confirmación de asociación:
            </span>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#39A900] shrink-0" />
              <div className="text-xs text-[#00324D] font-bold">
                [{selectedCompetency.code}] {selectedCompetency.name}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || !selectedCompetencyId}
            className="px-5 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Asignando competencia...</span>
              </>
            ) : (
              <>
                <Award className="w-4 h-4" />
                <span>Confirmar y asociar competencia</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
