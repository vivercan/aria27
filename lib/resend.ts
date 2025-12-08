import { Resend } from 'resend';

// Inicializamos el cliente de correo con tu llave
export const resend = new Resend(process.env.RESEND_API_KEY);
