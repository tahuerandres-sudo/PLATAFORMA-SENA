/**
 * @license
 * SENA Learning Hub - Stat Card Component
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  hint,
  iconColor = 'text-[#00324D]',
  iconBg = 'bg-slate-100',
  trend,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all ${
        onClick
          ? 'cursor-pointer hover:border-[#39A900] hover:shadow-md hover:-translate-y-0.5'
          : 'hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#00324D]">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-bold ${
              trend.positive ? 'text-[#2E8500]' : 'text-rose-600'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
};
