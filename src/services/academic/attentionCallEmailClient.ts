/**
 * @license
 * SENA Learning Hub - Cliente Frontend para Envío de Correos de Llamados de Atención
 * PROMPT 50: Comunicación segura con /api/attention-calls/send-email
 */

import { auth } from '../firebase/config';
import { AttentionCallEmailPayload } from '../../server/attentionCallEmailService';

export interface SendAttentionCallEmailResult {
  success: boolean;
  delivered: boolean;
  message: string;
  error?: string;
  provider?: string;
  recipient?: string;
  sentAt?: string;
}

export const attentionCallEmailClient = {
  /**
   * Envía un correo de llamado de atención al aprendiz a través del backend seguro
   */
  async sendEmail(payload: AttentionCallEmailPayload): Promise<SendAttentionCallEmailResult> {
    try {
      // 1. Obtener Firebase ID Token del instructor autenticado
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return {
          success: false,
          delivered: false,
          message: 'No hay una sesión activa de instructor.',
          error: 'NO_AUTH_SESSION',
        };
      }

      const idToken = await currentUser.getIdToken();

      // 2. Ejecutar petición al endpoint server-side
      const response = await fetch('/api/attention-calls/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          delivered: false,
          message: data.error || 'No se pudo enviar el correo al aprendiz.',
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        delivered: Boolean(data.delivered),
        message: data.message || 'Correo de llamado de atención enviado con éxito.',
        provider: data.provider,
        recipient: data.recipient,
        sentAt: data.sentAt,
      };
    } catch (err: any) {
      console.warn('[attentionCallEmailClient] Error conectando con el servidor de correo:', err);
      return {
        success: false,
        delivered: false,
        message: 'Fallo de conexión al enviar el correo. El llamado quedó guardado.',
        error: err?.message || 'NETWORK_ERROR',
      };
    }
  },
};
