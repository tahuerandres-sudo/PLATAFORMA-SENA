/**
 * @license
 * SENA Learning Hub - Logo Institucional Oficial del SENA
 * Soporta renderizado vectorial auténtico o imagen personalizada cargada por el usuario.
 */

import React, { useState, useEffect } from 'react';
import { getCustomSenaLogo } from '../../utils/senaLogoStorage';

interface SenaLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
  showText?: boolean;
  customImageUrl?: string;
}

export const SenaLogo: React.FC<SenaLogoProps> = ({
  className = '',
  width = 64,
  height = 64,
  color = '#39A900',
  showText = true,
  customImageUrl,
}) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(() => {
    return customImageUrl || getCustomSenaLogo();
  });

  useEffect(() => {
    if (customImageUrl !== undefined) {
      setLogoSrc(customImageUrl);
      return;
    }

    const updateLogo = (e?: Event) => {
      const customEvent = e as CustomEvent<string | null> | undefined;
      if (customEvent && customEvent.detail !== undefined) {
        setLogoSrc(customEvent.detail);
      } else {
        setLogoSrc(getCustomSenaLogo());
      }
    };

    window.addEventListener('sena_logo_updated', updateLogo);
    return () => {
      window.removeEventListener('sena_logo_updated', updateLogo);
    };
  }, [customImageUrl]);

  // Si el usuario cargó una imagen personalizada del logo
  if (logoSrc) {
    return (
      <div className={`inline-flex items-center justify-center select-none ${className}`}>
        <img
          src={logoSrc}
          alt="Logo SENA Oficial"
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            maxHeight: typeof height === 'number' ? `${height}px` : height,
            objectFit: 'contain',
            imageRendering: 'crisp-edges',
          }}
          className="shrink-0"
        />
      </div>
    );
  }

  // Renderizado vectorial oficial si no hay imagen personalizada
  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 300 270"
        width={width}
        height={height}
        fill={color}
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* 1. Cabeza circular oficial */}
        <circle cx="150" cy="38" r="26" />

        {/* 2. Tipografía oficial SENA */}
        {showText && (
          <text
            x="150"
            y="90"
            textAnchor="middle"
            fontSize="38"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
            letterSpacing="2"
            fill={color}
          >
            SENA
          </text>
        )}

        {/* 3. Brazos horizontales y silueta exterior de las piernas */}
        <path
          d="
            M 18,98 
            L 282,98 
            L 282,118 
            L 204,118 
            L 268,236 
            L 236,252 
            L 182,150 
            L 182,118 
            L 118,118 
            L 118,150 
            L 64,252 
            L 32,236 
            L 96,118 
            L 18,118 
            Z
          "
        />

        {/* 4. Silueta interior en chevron de las piernas */}
        <path
          d="
            M 150,146 
            L 210,256 
            L 182,270 
            L 150,210 
            L 118,270 
            L 90,256 
            Z
          "
        />
      </svg>
    </div>
  );
};
