/**
 * @license
 * SENA Learning Hub - Vista de Mi Progreso (Aprendiz)
 */

import React from 'react';
import { BarChart3, CheckCircle2, Clock, XCircle, Award } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { ProgressBar } from '../../components/ui/ProgressBar';

export const ApprenticeProgressView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-bold text-[#00324D]">Mi Progreso de Formación</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Avance global en resultados de aprendizaje (RAP) y competencias de bilingüismo
        </p>
      </div>

      {/* Tarjetas de Resumen (Requisito 15) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Progreso General"
          value="82%"
          icon={BarChart3}
          hint="Etapa Lectiva"
          iconColor="text-[#2E8500]"
          iconBg="bg-[#EBF8E7]"
        />
        <StatCard
          label="Actividades Entregadas"
          value="8 / 10"
          icon={Clock}
          hint="80% completadas"
          iconColor="text-blue-700"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Aprobadas (SENA)"
          value="7"
          icon={CheckCircle2}
          hint="Nota >= 70 pts"
          iconColor="text-[#2E8500]"
          iconBg="bg-[#EBF8E7]"
        />
        <StatCard
          label="Por Entregar / Revisar"
          value="2"
          icon={Award}
          hint="Vencen esta semana"
          iconColor="text-amber-700"
          iconBg="bg-amber-50"
        />
      </div>

      {/* Desglose de Competencias y Barras */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <h3 className="text-sm font-bold text-[#00324D]">
          Cumplimiento por Resultados de Aprendizaje (RAP)
        </h3>

        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>RAP 01: Comprensión auditiva y vocabulario laboral en inglés</span>
              <span className="font-bold text-[#2E8500]">90% Aprobado</span>
            </div>
            <ProgressBar progress={90} showLabel={false} size="md" />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>RAP 02: Producción de textos breves y estructurados (Present Simple)</span>
              <span className="font-bold text-[#2E8500]">85% Aprobado</span>
            </div>
            <ProgressBar progress={85} showLabel={false} size="md" />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>RAP 03: Interacción oral en simulaciones de negocios (Speaking)</span>
              <span className="font-bold text-amber-700">70% En Desarrollo</span>
            </div>
            <ProgressBar progress={70} showLabel={false} size="md" color="bg-amber-500" />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total evidencias requeridas en el programa: 10</span>
          <span className="font-semibold text-[#00324D]">Estado Académico: Al día</span>
        </div>
      </div>
    </div>
  );
};
