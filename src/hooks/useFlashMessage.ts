import { useState, useCallback } from 'react';

/**
 * Flash message type definition
 */
export type FlashMessageType = {
  tipo: 'success' | 'error';
  texto: string;
};

/**
 * Hook return type for useFlashMessage
 */
export type UseFlashMessageReturn = {
  mensaje: FlashMessageType | null;
  msg: (tipo: 'success' | 'error', texto: string) => void;
  clearMsg: () => void;
};

/**
 * useFlashMessage Hook
 *
 * A simple flash message hook used across the ARIA27 ERP application.
 * Displays temporary success/error messages that auto-dismiss after 3 seconds.
 *
 * @returns {UseFlashMessageReturn} Object containing:
 *   - mensaje: Current message state (null when no message)
 *   - msg: Function to set and display a message
 *   - clearMsg: Function to immediately clear the message
 */
export function useFlashMessage(): UseFlashMessageReturn {
  const [mensaje, setMensaje] = useState<FlashMessageType | null>(null);

  const msg = useCallback((tipo: 'success' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    const timer = setTimeout(() => setMensaje(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  const clearMsg = useCallback(() => {
    setMensaje(null);
  }, []);

  return { mensaje, msg, clearMsg };
}
