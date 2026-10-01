/**
 * @license
 * SENA Learning Hub - Componente de Estado y Conexión con Google Drive
 * PROMPT 4: Requisitos 8, 23
 */

import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, AlertCircle, RefreshCw, LogOut, HardDrive, ExternalLink } from 'lucide-react';
import { driveAuthService } from '../../services/drive/driveAuthService';

interface DriveConnectionStatusProps {
  compact?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export const DriveConnectionStatus: React.FC<DriveConnectionStatusProps> = ({
  compact = false,
  onConnectionChange,
}) => {
  const [isConnected, setIsConnected] = useState(driveAuthService.isConnected());
  const [connectedEmail, setConnectedEmail] = useState<string | null>(
    driveAuthService.getConnectedEmail()
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = driveAuthService.subscribe((connected, email) => {
      setIsConnected(connected);
      setConnectedEmail(email);
      if (onConnectionChange) onConnectionChange(connected);
    });
    return () => unsubscribe();
  }, [onConnectionChange]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const result = await driveAuthService.connectDrive();
      setIsConnected(true);
      setConnectedEmail(result.email);
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo autorizar Google Drive.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    driveAuthService.disconnectDrive();
    setIsConnected(false);
    setConnectedEmail(null);
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        {isConnected ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#39A900] animate-pulse" />
            <HardDrive className="w-3.5 h-3.5 text-[#39A900]" />
            <span className="truncate max-w-[150px]">Drive: {connectedEmail || 'Conectado'}</span>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:border-[#39A900] hover:text-[#00324D] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            {isConnecting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#39A900]" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>Conectar Google Drive</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Almacenamiento en Google Drive</h4>
            <p className="text-[11px] text-slate-500">
              Estructura: <code>SENA Learning Hub / Programa / Ficha / Actividad / Aprendiz</code>
            </p>
          </div>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EBF8E7] text-[#2E8500] text-xs font-bold border border-[#39A900]/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#39A900]" />
              Conectado
            </span>
            <button
              onClick={handleDisconnect}
              title="Desconectar Google Drive de la sesión"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-3.5 py-1.5 rounded-lg bg-[#00324D] hover:bg-[#004A73] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isConnecting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8CE665]" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-[#8CE665]" />
            )}
            <span>Conectar Google Drive</span>
          </button>
        )}
      </div>

      {isConnected && (
        <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
          <span className="truncate">Cuenta vinculada: <strong className="font-mono text-slate-800">{connectedEmail}</strong></span>
          <span className="text-slate-400 text-[10px]">Scope: drive.file</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
