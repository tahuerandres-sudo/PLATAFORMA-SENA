/**
 * @license
 * SENA Learning Hub - Vista de Cursos y Asignaciones (Instructor)
 * PROMPT 8: Estructura Académica SENA - Colecciones Firestore: /courses, /fichaCourses
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Users,
  FileText,
  CheckCircle,
  Search,
  ArrowRight,
  Award,
  RefreshCw,
  AlertCircle,
  Plus,
  Link,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { courseService } from '../../services/academic/courseService';
import { fichaService } from '../../services/academic/fichaService';
import { Course, Ficha, FichaCourse, CourseType } from '../../types/academic';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';

interface InstructorCoursesViewProps {
  onNavigateToActivities: (courseId: string) => void;
}

export const InstructorCoursesView: React.FC<InstructorCoursesViewProps> = ({
  onNavigateToActivities,
}) => {
  const { currentUser } = useAuth();
  const instructorUid = currentUser?.uid || 'inst_carlos_mendoza';

  const [courses, setCourses] = useState<Course[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [assignments, setAssignments] = useState<FichaCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modales
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Formulario nuevo curso
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseType, setNewCourseType] = useState<CourseType>('transversal');

  // Formulario asignación a ficha
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignFichaId, setAssignFichaId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [coursesRes, fichasRes, assignsRes] = await Promise.all([
        courseService.getCourses(),
        fichaService.getFichas(instructorUid),
        courseService.getFichaCourses(),
      ]);

      const cList = coursesRes.data || [];
      const fList = fichasRes.data || [];

      setCourses(cList);
      setFichas(fList);
      setAssignments(assignsRes || []);

      if (cList.length > 0 && !assignCourseId) setAssignCourseId(cList[0].id);
      if (fList.length > 0 && !assignFichaId) setAssignFichaId(fList[0].id);
    } catch (err: any) {
      console.warn('[InstructorCoursesView] Aviso al cargar cursos:', err);
      setErrorMsg('No se pudieron consultar los cursos en tiempo real.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instructorUid]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName || !newCourseCode) return;

    const newCourse: Course = {
      id: `course_${Date.now()}`,
      name: newCourseName,
      code: newCourseCode,
      description: newCourseDesc,
      type: newCourseType,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await courseService.saveCourse(newCourse);
    setCourses([saved, ...courses]);
    setIsCreateCourseModalOpen(false);
    setNewCourseName('');
    setNewCourseCode('');
    setNewCourseDesc('');
  };

  const handleAssignToFicha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCourseId || !assignFichaId) return;

    const newAssignment: FichaCourse = {
      id: `fc_${Date.now()}`,
      fichaId: assignFichaId,
      courseId: assignCourseId,
      instructorIds: [instructorUid],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await courseService.assignCourseToFicha(newAssignment);
    setAssignments([saved, ...assignments]);
    setIsAssignModalOpen(false);
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || course.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#00324D]">Catálogo de Cursos y Ambientes</h1>
            <span className="text-[11px] font-bold bg-[#EBF8E7] text-[#2E8500] px-2 py-0.5 rounded border border-[#39A900]/30">
              Firestore /courses
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ambientes formativos y asignaturas transversales/técnicas vinculadas a fichas (/fichaCourses)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Link className="w-3.5 h-3.5 text-[#39A900]" />
            Asignar Curso a Ficha
          </button>
          <button
            onClick={() => setIsCreateCourseModalOpen(true)}
            className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            + Nuevo Curso
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#39A900] bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {['all', 'transversal', 'technical'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedType === type
                  ? 'bg-[#00324D] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'all' ? 'Todos' : type === 'transversal' ? 'Transversales' : 'Técnicos'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#39A900] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Consultando /courses en Firestore...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-dashed border-slate-300 p-8 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No hay cursos encontrados</h3>
            <p className="text-xs text-slate-500 mt-1">
              Crea uno nuevo utilizando el botón "+ Nuevo Curso".
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const linkedAssignments = assignments.filter((a) => a.courseId === course.id);
            const assignedFichaCount = linkedAssignments.length;

            return (
              <div
                key={course.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-[#39A900] transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase bg-[#39A900] text-white px-2 py-0.5 rounded font-bold">
                      {course.type === 'transversal' ? 'Transversal' : 'Técnico'}
                    </span>
                    <StatusBadge status={course.status} size="sm" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{course.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Código: {course.code}</p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fichas Vinculadas (/fichaCourses):</span>
                      <strong className="text-[#00324D]">{assignedFichaCount || fichas.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">ID: {course.id}</span>
                  <button
                    onClick={() => onNavigateToActivities(course.id)}
                    className="text-xs font-bold text-[#2E8500] hover:text-[#00324D] flex items-center gap-1 cursor-pointer"
                  >
                    Ver Actividades
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Curso */}
      <Modal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        title="Crear Nuevo Curso / Asignatura"
        subtitle="Registro oficial en la colección Firestore /courses"
        footer={
          <>
            <button
              onClick={() => setIsCreateCourseModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateCourse}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Guardar Curso
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Curso *
            </label>
            <input
              type="text"
              placeholder="Ej: Bilingüismo y Comunicación en Inglés"
              required
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código del Curso *
              </label>
              <input
                type="text"
                placeholder="Ej: 240202501-ING"
                required
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo
              </label>
              <select
                value={newCourseType}
                onChange={(e) => setNewCourseType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
              >
                <option value="transversal">Transversal</option>
                <option value="technical">Técnico</option>
                <option value="bilingualism">Bilingüismo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción del Contenido
            </label>
            <textarea
              rows={3}
              placeholder="Descripción temática y objetivos del curso..."
              value={newCourseDesc}
              onChange={(e) => setNewCourseDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Asignar Curso a Ficha */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Asignar Curso a Ficha de Formación"
        subtitle="Registro oficial en /fichaCourses (Ficha + Curso + Instructor)"
        footer={
          <>
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleAssignToFicha}
              className="px-4 py-1.5 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Guardar Asignación
            </button>
          </>
        }
      >
        <form onSubmit={handleAssignToFicha} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Seleccionar Curso *
            </label>
            <select
              value={assignCourseId}
              onChange={(e) => setAssignCourseId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Seleccionar Ficha de Formación *
            </label>
            <select
              value={assignFichaId}
              onChange={(e) => setAssignFichaId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            >
              {fichas.map((f) => (
                <option key={f.id} value={f.id}>
                  Ficha {f.number} - {f.programName || 'Programa SENA'}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};
