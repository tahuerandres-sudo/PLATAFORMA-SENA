/**
 * @license
 * SENA Learning Hub - Especificación del Árbol de Almacenamiento Google Drive
 * Manejador de jerarquías y rutas seguras para evidencias
 */

export interface DrivePathConfig {
  rootFolderName: string;
  programName: string;
  fichaCode: string;
  activityTitle: string;
  apprenticeName: string;
}

export class DriveHierarchyBuilder {
  private static readonly ROOT_FOLDER = 'SENA Learning Hub';

  /**
   * Limpia nombres para evitar caracteres problemáticos en Google Drive
   */
  public static sanitizeFolderName(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim();
  }

  /**
   * Genera la ruta estructurada canónica para una evidencia de un aprendiz:
   * "SENA Learning Hub / [Programa] / Ficha [Num] / [Actividad] / [Aprendiz]"
   */
  public static buildCanonicalPath(params: {
    programName: string;
    fichaCode: string;
    activityTitle: string;
    apprenticeName: string;
  }): string[] {
    return [
      this.ROOT_FOLDER,
      this.sanitizeFolderName(params.programName),
      `Ficha ${this.sanitizeFolderName(params.fichaCode)}`,
      this.sanitizeFolderName(params.activityTitle),
      this.sanitizeFolderName(params.apprenticeName),
    ];
  }

  /**
   * Genera el nombre canónico recomendado para el archivo de evidencia
   * Formato: EVIDENCIA_[FICHA]_[ACTIVIDAD]_[APRENDIZ].[EXT]
   */
  public static generateFileName(params: {
    fichaCode: string;
    activityTitle: string;
    apprenticeName: string;
    originalFileName: string;
  }): string {
    const extension = params.originalFileName.split('.').pop() || 'dat';
    const cleanStudent = params.apprenticeName.replace(/\s+/g, '_');
    const cleanActivity = params.activityTitle.substring(0, 20).replace(/\s+/g, '_');
    return `EVI_${params.fichaCode}_${cleanActivity}_${cleanStudent}.${extension}`;
  }
}
