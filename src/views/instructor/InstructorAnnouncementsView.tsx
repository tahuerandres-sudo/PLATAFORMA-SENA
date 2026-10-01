/**
 * @license
 * SENA Learning Hub - Vista de Anuncios (Instructor)
 */

import React, { useState } from 'react';
import { Megaphone, Plus, MessageSquare, Calendar, Send } from 'lucide-react';
import { DEMO_ANNOUNCEMENTS, DemoAnnouncement } from '../../data/mockData';

export const InstructorAnnouncementsView: React.FC = () => {
  const [announcements, setAnnouncements] = useState<DemoAnnouncement[]>(DEMO_ANNOUNCEMENTS);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [selectedFicha, setSelectedFicha] = useState('1234567');

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput || !contentInput) return;

    const newAnn: DemoAnnouncement = {
      id: `ann_${Date.now()}`,
      fichaCode: selectedFicha,
      instructorName: 'Carlos Mendoza Ramos',
      title: titleInput,
      content: contentInput,
      date: 'Hoy',
      commentsCount: 0,
    };

    setAnnouncements([newAnn, ...announcements]);
    setTitleInput('');
    setContentInput('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-bold text-[#00324D]">Tablón de Anuncios</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Comunica avisos, enlaces a sesiones sincrónicas y novedades a tus aprendices
        </p>
      </div>

      {/* Formulario para publicar anuncio */}
      <form
        onSubmit={handlePublish}
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[#00324D]">
          <Megaphone className="w-4 h-4 text-[#39A900]" />
          <span>Publicar Aviso a la Ficha</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="Título del anuncio..."
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            />
          </div>
          <div>
            <select
              value={selectedFicha}
              onChange={(e) => setSelectedFicha(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
            >
              <option value="1234567">Ficha 1234567</option>
              <option value="7654321">Ficha 7654321</option>
              <option value="3349102">Ficha 3349102</option>
            </select>
          </div>
        </div>

        <textarea
          rows={3}
          placeholder="Escribe el mensaje o instrucciones para los aprendices..."
          value={contentInput}
          onChange={(e) => setContentInput(e.target.value)}
          required
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#39A900]"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-[#39A900] hover:bg-[#2E8500] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Publicar Anuncio
          </button>
        </div>
      </form>

      {/* Lista de Anuncios */}
      <div className="space-y-4">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#00324D] bg-slate-100 px-2 py-0.5 rounded">
                Ficha {ann.fichaCode}
              </span>
              <span className="text-slate-400">{ann.date}</span>
            </div>

            <h3 className="text-sm font-bold text-slate-800">{ann.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Publicado por: <strong>{ann.instructorName}</strong></span>
              <span className="flex items-center gap-1 text-slate-400">
                <MessageSquare className="w-3.5 h-3.5" />
                {ann.commentsCount} comentarios
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
