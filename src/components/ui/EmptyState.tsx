/**
 * @license
 * SENA Learning Hub - Empty State & Breadcrumbs Components
 */

import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6">
      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-[#00324D]">{title}</h4>
      <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-[#39A900] text-white rounded-lg text-xs font-semibold hover:bg-[#2E8500] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

interface BreadcrumbsProps {
  items: { label: string; onClick?: () => void; active?: boolean }[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {item.onClick && !isLast ? (
              <button
                onClick={item.onClick}
                className="hover:text-[#00324D] font-medium transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'font-bold text-[#00324D]' : ''}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
