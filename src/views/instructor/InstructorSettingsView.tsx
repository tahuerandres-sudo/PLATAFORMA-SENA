/**
 * @license
 * SENA Learning Hub - Vista de Configuración (Instructor con Firebase)
 */

import React from 'react';
import { Settings, User, Bell, HardDrive, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const InstructorSettingsView: React.FC = () => {
  const { userProfile, currentUser } = useAuth();

  const name = userProfile?.displayName || currentUser?.displayName || 'Instructor SENA';
  const email = userProfile?.email || currentUser?.email || 'instructor@sena.edu.co';

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-bold text-[#00324D]">Configuración del Instructor</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Preferencias de cuenta, notificaciones y conexión con Google Drive
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Datos Personales */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
            <User className="w-4 h-4 text-[#39A900]" />
            Información Institucional
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Nombre Completo:</label>
              <input
                type="text"
                disabled
                value={name}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Correo Institucional:</label>
              <input
                type="text"
                disabled
                value={email}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Regional:</label>
              <input
                type="text"
                disabled
                value="Regional Distrito Capital"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Especialidad:</label>
              <input
                type="text"
                disabled
                value="Bilingüismo - Idioma Inglés"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Preferencias de Notificaciones */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#39A900]" />
            Notificaciones y Alertas
          </h2>
          <div className="space-y-2 text-xs text-slate-700">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#39A900]" />
              <span>Recibir correo cuando un aprendiz entregue una evidencia de inglés</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#39A900]" />
              <span>Resumen diario de actividades próximas a vencer</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#39A900]" />
              <span>Alertas push en navegador para dudas en foros</span>
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Conexión con Google Drive */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#39A900]" />
            Almacenamiento de Evidencias en Google Drive
          </h2>
          <p className="text-xs text-slate-600">
            Carpeta raíz configurada:{' '}
            <strong className="font-mono text-[#00324D]">/SENA Learning Hub/</strong>
          </p>
          <div className="p-3 bg-emerald-50 text-[#2E8500] rounded-lg text-xs font-semibold flex items-center gap-2">
            ✓ Cuenta vinculada en Firebase: {email}
          </div>
        </div>
      </div>
    </div>
  );
};
