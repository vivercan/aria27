import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usuario, obra, comentarios, materiales } = body;

    // Generar Folio
    const folio = 'REQ-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random() * 1000);

    // Generar lista HTML (Sin errores de sintaxis)
    const listaHtml = materiales.map((m: any) => 
      `<li><strong>${m.qty} ${m.unit}</strong> - ${m.name} ${m.comments ? '(' + m.comments + ')' : ''}</li>`
    ).join('');

    // Enviar correo
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['recursos.humanos@gcuavante.com', usuario.email],
      subject: 'Confirmación Requisición - Folio: ' + folio,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h1>✅ Nueva Requisición</h1>
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Usuario:</strong> ${usuario.nombre}</p>
          <p><strong>Obra:</strong> ${obra}</p>
          <p><strong>Notas:</strong> ${comentarios || 'Sin comentarios'}</p>
          <hr/>
          <h3>Lista de Materiales:</h3>
          <ul>${listaHtml}</ul>
        </div>
      `
    });

    return NextResponse.json({ success: true, folio });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
