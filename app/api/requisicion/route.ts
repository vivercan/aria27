import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// SI YA TIENES LA API KEY EN .ENV, ESTO FUNCIONARÁ AUTOMÁTICAMENTE
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usuario, obra, materiales } = body;

    // A. Generar Folio Único (REQ-AÑO-MES-DIA-RANDOM)
    const folio = 'REQ-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random() * 1000);

    // B. Crear lista de materiales para el correo
    const listaHtml = materials => materials.map(m => <li>  - </li>).join('');

    // C. Enviar Correo a RH y al Usuario
    await resend.emails.send({
      from: 'onboarding@resend.dev', // Cambia esto si ya verificaste tu dominio
      to: ['recursos.humanos@gcuavante.com', usuario.email], 
      subject: 'Confirmación Requisición - Folio: ' + folio,
      html: \
        <h1>Nueva Requisición Generada</h1>
        <p><strong>Folio:</strong> \</p>
        <p><strong>Usuario:</strong> \</p>
        <p><strong>Obra:</strong> \</p>
        <h3>Materiales:</h3>
        <ul>\</ul>
      \
    });

    return NextResponse.json({ success: true, folio });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Error al enviar' }, { status: 500 });
  }
}
