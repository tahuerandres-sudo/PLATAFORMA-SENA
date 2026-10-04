/**
 * @license
 * SENA Learning Hub - Modal de Creación y Edición de Recursos Didácticos
 * PROMPT 20: Conexión Real con Firestore y Google Drive
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Upload,
  HardDrive,
  ExternalLink,
  Youtube,
  Image as ImageIcon,
  Video,
  Music,
  FileSpreadsheet,
  Presentation,
  X,
  Eye,
  FolderOpen,
  Tag,
  BookOpen,
  Layers,
  Sparkles,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';
import {
  Resource,
  ResourceType,
  ResourceVisibility,
  ResourceStatus,
  Ficha,
  Course,
  Competency,
  LearningOutcome,
  EvidenceActivity,
  TrainingCenter,
  TrainingProgram,
} from '../../types/academic';
import { resourceService } from '../../services/academic/resourceService';
import { fichaService } from '../../services/academic/fichaService';
import { courseService } from '../../services/academic/courseService';
import { competencyService } from '../../services/academic/competencyService';
import { learningOutcomeService } from '../../services/academic/learningOutcomeService';
import { activityService } from '../../services/academic/activityService';
import { centerService } from '../../services/academic/centerService';
import { programService } from '../../services/academic/programService';
import { driveService, DriveUploadResult } from '../../services/drive/driveService';
import { driveAuthService } from '../../services/drive/driveAuthService';
import { useAuth } from '../../hooks/useAuth';

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResourceSaved: (res: Resource) => void;
  initialResource?: Resource | null;
  preselectedFichaId?: string;
  preselectedCourseId?: string;
  preselectedActivityId?: string;
}

const RESOURCE_TYPES: Array<{
  type: ResourceType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  { type: 'PDF', label: 'Documento PDF', icon: FileText, description: 'Guías, lecturas y manuales' },
  { type: 'DOCUMENT', label: 'Documento (Word / Docs)', icon: FileText, description: 'Formatos editables y talleres' },
  { type: 'PRESENTATION', label: 'Presentación (PPTX / Slides)', icon: Presentation, description: 'Diapositivas de clase' },
  { type: 'SPREADSHEET', label: 'Hoja de Cálculo (Excel / Sheets)', icon: FileSpreadsheet, description: 'Matrices y tablas' },
  { type: 'IMAGE', label: 'Infografía o Imagen', icon: ImageIcon, description: 'Esquemas, diagramas y fotos' },
  { type: 'VIDEO', label: 'Video Didáctico', icon: Video, description: 'Grabaciones y cápsulas de video' },
  { type: 'AUDIO', label: 'Audio / Podcast', icon: Music, description: 'Listening, audiolibros o podcasts' },
  { type: 'YOUTUBE', label: 'Video de YouTube', icon: Youtube, description: 'Enlace a video externo en YouTube' },
  { type: 'CANVA', label: 'Diseño en Canva', icon: Sparkles, description: 'Presentaciones o pósteres en Canva' },
  { type: 'EXTERNAL_LINK', label: 'Enlace Web Externo', icon: ExternalLink, description: 'Artículos, blogs y sitios web' },
  { type: 'DRIVE_FILE', label: 'Archivo de Google Drive', icon: HardDrive, description: 'Archivo existente en Google Drive' },
];

export const ResourceFormModal: React.FC<ResourceFormModalProps> = ({
  isOpen,
  onClose,
  onResourceSaved,
  initialResource,
  preselectedFichaId,
  preselectedCourseId,
  preselectedActivityId,
}) => {
  const { currentUser, userProfile } = useAuth();
  const instructorUid = currentUser?.uid || userProfile?.uid || '';
  const instructorName = userProfile?.displayName || currentUser?.displayName || 'Instructor SENA';
  const instructorEmail = userProfile?.email || currentUser?.email || 'instructor@sena.edu.co';

  // Datos de catálogo académico
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [activities, setActivities] = useState<EvidenceActivity[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [centers, setCenters] = useState<TrainingCenter[]>([]);

  // Estados del Formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('PDF');
  const [visibility, setVisibility] = useState<ResourceVisibility>('ALL');

  // Ámbito Académico Jerárquico
  const [centerId, setCenterId] = useState('');
  const [programId, setProgramId] = useState('');
  const [fichaId, setFichaId] = useState(preselectedFichaId || '');
  const [courseId, setCourseId] = useState(preselectedCourseId || '');
  const [competencyId, setCompetencyId] = useState('');
  const [learningOutcomeId, setLearningOutcomeId] = useState('');
  const [activityId, setActivityId] = useState(preselectedActivityId || '');

  // Archivo y enlaces
  const [externalUrl, setExternalUrl] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [driveFileId, setDriveFileId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Subida a Google Drive
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);

  // Guardado
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar catálogo inicial
  useEffect(() => {
    async function loadCatalog() {
      if (!instructorUid) return;
      try {
        const [fichasRes, coursesRes, compRes, rapsRes, actsRes, progRes, centersRes] =
          await Promise.all([
            fichaService.getFichas(instructorUid),
            courseService.getCourses(),
            competencyService.getCompetencies(),
            learningOutcomeService.getLearningOutcomes(),
            activityService.getActivities(),
            programService.getPrograms(),
            centerService.getCenters(),
          ]);

        setFichas(fichasRes.data || []);
        setCourses(coursesRes.data || []);
        setCompetencies(compRes.data || []);
        setLearningOutcomes(rapsRes.data || []);
        setActivities(actsRes.data || []);
        setPrograms(progRes.data || []);
        setCenters(centersRes.data || []);

        setIsDriveConnected(driveAuthService.isConnected());
      } catch (err) {
        console.warn('[ResourceFormModal] Error cargando catálogo:', err);
      }
    }
    loadCatalog();
  }, [instructorUid, isOpen]);

  // Inicializar o restablecer formulario
  useEffect(() => {
    if (initialResource) {
      setTitle(initialResource.title || '');
      setDescription(initialResource.description || '');
      setResourceType(initialResource.resourceType || 'PDF');
      setVisibility(initialResource.visibility || 'ALL');
      setCenterId(initialResource.centerId || '');
      setProgramId(initialResource.programId || '');
      setFichaId(initialResource.fichaId || preselectedFichaId || '');
      setCourseId(initialResource.courseId || preselectedCourseId || '');
      setCompetencyId(initialResource.competencyId || '');
      setLearningOutcomeId(initialResource.learningOutcomeId || '');
      setActivityId(initialResource.activityId || preselectedActivityId || '');
      setExternalUrl(initialResource.externalUrl || '');
      setDriveUrl(initialResource.driveUrl || '');
      setDriveFileId(initialResource.driveFileId || '');
      setSelectedFile(null);
    } else {
      setTitle('');
      setDescription('');
      setResourceType('PDF');
      setVisibility(preselectedFichaId ? 'FICHA' : 'ALL');
      setCenterId('');
      setProgramId('');
      setFichaId(preselectedFichaId || '');
      setCourseId(preselectedCourseId || '');
      setCompetencyId('');
      setLearningOutcomeId('');
      setActivityId(preselectedActivityId || '');
      setExternalUrl('');
      setDriveUrl('');
      setDriveFileId('');
      setSelectedFile(null);
    }
    setUploadProgress(null);
    setErrorMessage(null);
  }, [initialResource, preselectedFichaId, preselectedCourseId, preselectedActivityId, isOpen]);

  // Si cambia la ficha seleccionada, ajustar visibilidad y filtrar actividades
  const handleFichaChange = (selectedFId: string) => {
    setFichaId(selectedFId);
    if (selectedFId && visibility === 'ALL') {
      setVisibility('FICHA');
    }
    const currentFicha = fichas.find((f) => f.id === selectedFId);
    if (currentFicha?.programId) {
      setProgramId(currentFicha.programId);
    }
  };

  // Subir archivo a Google Drive
  const handleFileUpload = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);

    if (!isDriveConnected) {
      // Si Drive no está conectado, el archivo queda en cola o se solicita conexión
      return;
    }

    try {
      setIsUploadingDrive(true);
      setUploadProgress(10);

      const selFicha = fichas.find((f) => f.id === fichaId);
      const selCourse = courses.find((c) => c.id === courseId);
      const selProgram = programs.find((p) => p.id === programId);

      const uploadRes: DriveUploadResult = await driveService.uploadResourceFile({
        file,
        programName: selProgram?.name,
        fichaNumber: selFicha?.number || '',
        courseName: selCourse?.name,
        resourceTitle: title.trim() || file.name,
        onProgress: (pct) => setUploadProgress(pct),
      });

      setDriveFileId(uploadRes.driveFileId);
      setDriveUrl(uploadRes.driveUrl);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      console.warn('[ResourceFormModal] Error subiendo archivo a Drive:', err);
      setErrorMessage(err.message || 'Error al subir el archivo a Google Drive.');
    } finally {
      setIsUploadingDrive(false);
      setUploadProgress(null);
    }
  };

  // Guardar recurso (Borrador o Publicado)
  const handleSave = async (shouldPublish: boolean) => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Por favor ingresa un título representativo para el recurso didáctico.');
      return;
    }

    // Validación según tipo de recurso
    const isUrlType = ['YOUTUBE', 'CANVA', 'EXTERNAL_LINK'].includes(resourceType);
    if (isUrlType && !externalUrl.trim()) {
      setErrorMessage(`Debes proporcionar la URL o enlace web para el recurso tipo ${resourceType}.`);
      return;
    }

    const isFileType = ['PDF', 'DOCUMENT', 'PRESENTATION', 'SPREADSHEET', 'IMAGE', 'VIDEO', 'AUDIO'].includes(
      resourceType
    );

    // Si es tipo archivo y no se ha subido a Drive ni se ingresó URL
    if (isFileType && !driveUrl && !externalUrl && !selectedFile) {
      setErrorMessage('Debes adjuntar un archivo o especificar un enlace para el material pedagógico.');
      return;
    }

    setIsSaving(true);

    try {
      let finalDriveUrl = driveUrl;
      let finalDriveFileId = driveFileId;
      let finalFileName = selectedFile?.name || initialResource?.fileName;
      let finalFileSize = selectedFile?.size || initialResource?.fileSize;
      let finalMimeType = selectedFile?.type || initialResource?.mimeType;

      // Si seleccionó un archivo físico y aún no se ha subido a Drive
      if (selectedFile && !finalDriveFileId && isDriveConnected) {
        setIsUploadingDrive(true);
        const selFicha = fichas.find((f) => f.id === fichaId);
        const selCourse = courses.find((c) => c.id === courseId);
        const selProgram = programs.find((p) => p.id === programId);

        const uploadRes = await driveService.uploadResourceFile({
          file: selectedFile,
          programName: selProgram?.name,
          fichaNumber: selFicha?.number || '',
          courseName: selCourse?.name,
          resourceTitle: title.trim(),
        });

        finalDriveFileId = uploadRes.driveFileId;
        finalDriveUrl = uploadRes.driveUrl;
        finalFileName = uploadRes.fileName;
        finalFileSize = uploadRes.fileSize;
        finalMimeType = uploadRes.mimeType;
        setIsUploadingDrive(false);
      }

      const selFicha = fichas.find((f) => f.id === fichaId);
      const selCourse = courses.find((c) => c.id === courseId);
      const selProgram = programs.find((p) => p.id === programId);
      const selComp = competencies.find((c) => c.id === competencyId);
      const selRap = learningOutcomes.find((r) => r.id === learningOutcomeId);
      const selAct = activities.find((a) => a.id === activityId);
      const selCenter = centers.find((c) => c.id === centerId);

      const resourcePayload: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        description: description.trim(),
        resourceType,
        createdBy: instructorUid,
        creatorName: instructorName,
        creatorEmail: instructorEmail,
        centerId: centerId || undefined,
        centerName: selCenter?.name,
        programId: programId || undefined,
        programName: selProgram?.name,
        fichaId: fichaId || undefined,
        fichaNumber: selFicha?.number || undefined,
        courseId: courseId || undefined,
        courseName: selCourse?.name,
        competencyId: competencyId || undefined,
        competencyName: selComp?.name,
        learningOutcomeId: learningOutcomeId || undefined,
        learningOutcomeCode: selRap?.code,
        activityId: activityId || undefined,
        activityTitle: selAct?.title || selAct?.name,
        driveFileId: finalDriveFileId || undefined,
        driveUrl: finalDriveUrl || undefined,
        externalUrl: externalUrl.trim() || undefined,
        fileName: finalFileName,
        fileSize: finalFileSize,
        mimeType: finalMimeType,
        isPublished: shouldPublish,
        status: shouldPublish ? 'published' : 'draft',
        visibility: visibility || 'ALL',
      };

      let saved: Resource;
      if (initialResource?.id) {
        saved = await resourceService.updateResource(initialResource.id, resourcePayload);
      } else {
        saved = await resourceService.createResource(resourcePayload);
      }

      onResourceSaved(saved);
      onClose();
    } catch (err: any) {
      console.warn('[ResourceFormModal] Error guardando recurso:', err);
      setErrorMessage(err.message || 'Error al persistir el material didáctico en Firestore.');
    } finally {
      setIsSaving(false);
      setIsUploadingDrive(false);
    }
  };

  if (!isOpen) return null;

  const currentTypeConfig = RESOURCE_TYPES.find((t) => t.type === resourceType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Institucional */}
        <div className="bg-[#00324D] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#39A900]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <FolderOpen className="w-5 h-5 text-[#8CE665]" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Centro de Materiales Didácticos SENA
              </span>
              <h2 className="text-lg font-bold text-white">
                {initialResource ? 'Editar Recurso de Aprendizaje' : 'Nuevo Recurso Pedagógico'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario con scroll */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Título y Descripción */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Título del Recurso Didáctico *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Guía de Vocabulario en Inglés — Kitchen Utensils"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900] text-slate-900 bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción y Orientaciones Pedagógicas (Opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instrucciones para el uso del material, conceptos clave a repasar o contexto de la evidencia..."
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900] text-slate-800 bg-white"
              />
            </div>
          </div>

          {/* 2. Selector de Tipo de Recurso (11 tipos según Prompt 20 - Requisito 7) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Tipo de Material Didáctico *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {RESOURCE_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = resourceType === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setResourceType(t.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#39A900] bg-emerald-50/80 text-[#00324D] ring-2 ring-[#39A900]/30 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-[#39A900]' : 'text-slate-500'
                        }`}
                      />
                      <span className="text-[11px] font-bold line-clamp-1">{t.label}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 line-clamp-1">{t.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Archivo o Enlace según tipo */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#39A900]" />
                Contenido del Material: {currentTypeConfig?.label}
              </span>
              <span className="text-[10px] text-slate-500">
                {isDriveConnected ? '✓ Google Drive Conectado' : '⚡ Enlace directo'}
              </span>
            </div>

            {/* Si es enlace externo (YouTube, Canva, Link) */}
            {['YOUTUBE', 'CANVA', 'EXTERNAL_LINK'].includes(resourceType) && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enlace URL ({resourceType === 'YOUTUBE' ? 'https://youtube.com/...' : 'https://...'}) *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder={
                      resourceType === 'YOUTUBE'
                        ? 'https://www.youtube.com/watch?v=...'
                        : resourceType === 'CANVA'
                        ? 'https://www.canva.com/design/...'
                        : 'https://...'
                    }
                    className="w-full px-3.5 py-2 pl-9 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900] text-slate-900 bg-white font-mono"
                  />
                  <ExternalLink className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            )}

            {/* Si es archivo o Drive File */}
            {!['YOUTUBE', 'CANVA', 'EXTERNAL_LINK'].includes(resourceType) && (
              <div className="space-y-3">
                {/* Zona de Arrastrar Archivo */}
                <div className="border-2 border-dashed border-slate-300 hover:border-[#39A900] rounded-xl p-4 text-center bg-white transition-colors">
                  <input
                    type="file"
                    id="resource-file-input"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="resource-file-input"
                    className="cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <Upload className="w-6 h-6 text-[#39A900]" />
                    <span className="text-xs font-bold text-slate-800">
                      {selectedFile ? selectedFile.name : 'Haz clic para seleccionar o arrastra un archivo'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Se almacenará de forma estructurada en Google Drive (Carpeta Recursos)
                    </span>
                  </label>
                </div>

                {/* Barra de progreso de subida a Drive */}
                {isUploadingDrive && uploadProgress !== null && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#00324D]">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#39A900]" />
                        Subiendo archivo a Google Drive...
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#39A900] h-1.5 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Si ya tiene enlace o ID de Drive */}
                {driveUrl && (
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <CheckCircle2 className="w-4 h-4 text-[#39A900] shrink-0" />
                      <span className="truncate text-slate-800">
                        Drive File: <strong>{driveUrl}</strong>
                      </span>
                    </div>
                    <a
                      href={driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2E8500] hover:underline font-bold text-[11px] shrink-0"
                    >
                      Probar enlace ↗
                    </a>
                  </div>
                )}

                {/* Opción alternativa de URL Drive manual */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    O ingresa un enlace web de Google Drive existente:
                  </label>
                  <input
                    type="url"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/.../view"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#39A900] text-slate-800 bg-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Ámbito Académico Jerárquico (Prompt 20 - Requisito 2: Flexible) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#39A900]" />
                Ámbito Académico Jerárquico (Opcionales y Flexibles)
              </label>
              <span className="text-[10px] text-slate-500">
                Selecciona solo los niveles aplicables
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Centro de Formación */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Centro</label>
                <select
                  value={centerId}
                  onChange={(e) => setCenterId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-[#39A900]"
                >
                  <option value="">Cualquier Centro / General</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Programa */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Programa</label>
                <select
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-[#39A900]"
                >
                  <option value="">Cualquier Programa</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ficha */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ficha de Formación</label>
                <select
                  value={fichaId}
                  onChange={(e) => handleFichaChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-[#39A900]"
                >
                  <option value="">Cualquier Ficha / General</option>
                  {fichas.map((f) => (
                    <option key={f.id} value={f.id}>
                      Ficha {f.number} {f.name ? `· ${f.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Curso */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Curso</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-[#39A900]"
                >
                  <option value="">Cualquier Curso</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Competencia */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Competencia</label>
                <select
                  value={competencyId}
                  onChange={(e) => setCompetencyId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-[#39A900]"
                >
                  <option value="">Cualquier Competencia</option>
                  {competencies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name || comp.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actividad */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actividad Formativa</label>
                <select
                  value={activityId}
                  onChange={(e) => setActivityId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-[#39A900]"
                >
                  <option value="">Sin asociar a actividad específica</option>
                  {activities
                    .filter((a) => (fichaId ? a.fichaId === fichaId : true))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title || a.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* 5. Nivel de Visibilidad (Prompt 20 - Requisito 4) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#39A900]" />
                Nivel de Visibilidad para Aprendices *
              </label>
              <span className="text-[10px] text-slate-500">
                Regla de acceso en Cloud Firestore
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {(
                [
                  { id: 'ALL', label: 'Toda la plataforma', desc: 'Cualquier aprendiz autenticado' },
                  { id: 'PROGRAM', label: 'Por Programa', desc: 'Aprendices de este programa' },
                  { id: 'FICHA', label: 'Por Ficha', desc: 'Solo aprendices de esta ficha' },
                  { id: 'COURSE', label: 'Por Curso', desc: 'Aprendices en este curso' },
                  { id: 'ACTIVITY', label: 'Por Actividad', desc: 'En detalle de la actividad' },
                ] as Array<{ id: ResourceVisibility; label: string; desc: string }>
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisibility(v.id)}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    visibility === v.id
                      ? 'border-[#39A900] bg-emerald-50 text-[#00324D] font-bold ring-1 ring-[#39A900]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-[11px] truncate">{v.label}</div>
                  <div className="text-[9px] text-slate-500 font-normal line-clamp-1">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con Acciones */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {/* Guardar Borrador */}
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving || isUploadingDrive}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Guardar Borrador
            </button>

            {/* Publicar Inmediatamente */}
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving || isUploadingDrive}
              className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publicar Recurso</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
