/**
 * @license
 * SENA Learning Hub - Breadcrumbs Component
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
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
