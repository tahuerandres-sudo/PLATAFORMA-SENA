/**
 * @license
 * SENA Learning Hub - Status Badge Component
 */

import React from 'react';

export type StatusType =
  | 'aprobada'
  | 'no_aprobada'
  | 'pendiente'
  | 'en_revision'
  | 'publicada'
  | 'borrador'
  | 'cerrada'
  | 'lectiva'
  | 'productiva'
  | 'en_formacion'
  | 'condicionado';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md';
  customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  customLabel,
}) => {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');

  let dotColor = 'bg-slate-400';
  let textColor = 'text-slate-700';
  let bgColor = 'bg-slate-100';
  let defaultLabel = status;

  switch (normalized) {
    case 'aprobada':
    case 'aprobado':
      dotColor = 'bg-[#39A900]';
      textColor = 'text-[#236a00]';
      bgColor = 'bg-[#EBF8E7]';
      defaultLabel = 'Aprobada';
      break;
    case 'no_aprobada':
    case 'no_aprobado':
      dotColor = 'bg-rose-500';
      textColor = 'text-rose-700';
      bgColor = 'bg-rose-50';
      defaultLabel = 'No Aprobada';
      break;
    case 'pendiente':
      dotColor = 'bg-amber-500';
      textColor = 'text-amber-800';
      bgColor = 'bg-amber-50';
      defaultLabel = 'Pendiente';
      break;
    case 'en_revision':
    case 'under_review':
      dotColor = 'bg-blue-500';
      textColor = 'text-blue-800';
      bgColor = 'bg-blue-50';
      defaultLabel = 'En revisión';
      break;
    case 'publicada':
      dotColor = 'bg-emerald-500';
      textColor = 'text-emerald-800';
      bgColor = 'bg-emerald-50';
      defaultLabel = 'Publicada';
      break;
    case 'borrador':
      dotColor = 'bg-slate-400';
      textColor = 'text-slate-600';
      bgColor = 'bg-slate-100';
      defaultLabel = 'Borrador';
      break;
    case 'cerrada':
      dotColor = 'bg-slate-500';
      textColor = 'text-slate-700';
      bgColor = 'bg-slate-100';
      defaultLabel = 'Cerrada';
      break;
    case 'lectiva':
      dotColor = 'bg-[#39A900]';
      textColor = 'text-[#236a00]';
      bgColor = 'bg-[#EBF8E7]';
      defaultLabel = 'Etapa Lectiva';
      break;
    case 'productiva':
      dotColor = 'bg-indigo-500';
      textColor = 'text-indigo-800';
      bgColor = 'bg-indigo-50';
      defaultLabel = 'Etapa Productiva';
      break;
    case 'en_formacion':
      dotColor = 'bg-[#39A900]';
      textColor = 'text-[#236a00]';
      bgColor = 'bg-[#EBF8E7]';
      defaultLabel = 'En Formación';
      break;
    case 'condicionado':
      dotColor = 'bg-amber-500';
      textColor = 'text-amber-800';
      bgColor = 'bg-amber-50';
      defaultLabel = 'Condicionado';
      break;
    default:
      dotColor = 'bg-slate-400';
      textColor = 'text-slate-700';
      bgColor = 'bg-slate-100';
      defaultLabel = status;
  }

  const label = customLabel || defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md transition-colors ${bgColor} ${textColor} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      {label}
    </span>
  );
};
