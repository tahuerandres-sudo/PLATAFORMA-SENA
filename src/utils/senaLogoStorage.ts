/**
 * @license
 * SENA Learning Hub - Gestor de Almacenamiento del Logo SENA
 * Permite cargar, persistir en memoria local y compartir una imagen personalizada
 * del logo institucional en todos los documentos oficiales.
 */

export const getCustomSenaLogo = (): string | null => {
  try {
    return localStorage.getItem('sena_custom_logo_url');
  } catch {
    return null;
  }
};

export const setCustomSenaLogo = (dataUrl: string): void => {
  try {
    localStorage.setItem('sena_custom_logo_url', dataUrl);
    window.dispatchEvent(new CustomEvent('sena_logo_updated', { detail: dataUrl }));
  } catch (e) {
    console.error('Error guardando logo en localStorage:', e);
  }
};

export const clearCustomSenaLogo = (): void => {
  try {
    localStorage.removeItem('sena_custom_logo_url');
    window.dispatchEvent(new CustomEvent('sena_logo_updated', { detail: null }));
  } catch (e) {
    console.error('Error limpiando logo de localStorage:', e);
  }
};
