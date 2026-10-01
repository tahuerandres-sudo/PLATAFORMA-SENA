/**
 * @license
 * SENA Learning Hub - Vista de Configuración (Aprendiz)
 */

import React, { useState } from 'react';
import { Settings, Bell, Globe, Smartphone, Shield, Key } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { RolePromotionModal } from '../../components/common/RolePromotionModal';

export const ApprenticeSettingsView: React.FC = () => {
  const { userProfile } = useAuth();
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in duration-150">
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-bold text-[#00324D]">Configuración del Aprendiz</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Preferencias de notificaciones push, alertas de entregas e idioma
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#39A900]" />
            Notificaciones Push y Móviles
          </h2>
          <div className="space-y-2.5 text-xs text-slate-700">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#39A900]" />
              <span>Avisarme cuando un instructor publique una nueva actividad en inglés</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#39A900]" />
              <span>Notificarme inmediatamente cuando una evidencia sea calificada</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#39A900]" />
              <span>Recordatorios de entrega 24 horas antes del vencimiento</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#39A900]" />
              <span>Alertas de logros y subidas de nivel en el ranking</span>
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#39A900]" />
            Idioma de la Plataforma
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs max-w-sm">
            <button className="p-2.5 rounded-lg border-2 border-[#39A900] bg-[#EBF8E7] text-[#2E8500] font-bold text-left">
              Español (Colombia)
            </button>
            <button className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-left">
              English (US)
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Sección de Autorización Administrativa de Rol */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#00324D] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#39A900]" />
            Rol Institucional y Permisos
          </h2>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Rol asignado en Firestore:</span>
              <span className="font-bold text-[#2E8500] uppercase bg-[#EBF8E7] px-2 py-0.5 rounded border border-[#39A900]/30">
                {userProfile?.role || 'apprentice'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Por seguridad institucional, los aprendices no pueden alterar su propio rol de forma libre. Si eres un instructor evaluador realizando pruebas de la plataforma, puedes habilitar los privilegios de instructor ingresando la clave institucional autorizada.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPromotionModal(true)}
                className="px-3 py-1.5 bg-[#00324D] hover:bg-[#002235] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-[#8CE665]" />
                <span>Autorizar Privilegios de Instructor</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <RolePromotionModal
        isOpen={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
      />
    </div>
  );
};
