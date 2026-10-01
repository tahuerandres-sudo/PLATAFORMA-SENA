/**
 * @license
 * SENA Learning Hub - Progress Bar Component
 */

import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string; // Tailwind color class, default is SENA green
  trackColor?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = true,
  size = 'md',
  color = 'bg-[#39A900]',
  trackColor = 'bg-slate-100',
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold mb-1.5 text-slate-700">
          <span>Progreso</span>
          <span className="font-bold text-[#00324D]">{clampedProgress}%</span>
        </div>
      )}
      <div className={`w-full rounded-full overflow-hidden ${trackColor} ${heightClasses[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};
