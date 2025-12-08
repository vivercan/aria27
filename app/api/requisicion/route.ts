import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inicializar Resend con la llave segura
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usuario, obra, comentarios, materiales } = body;

    // 1. Generar Folio
    const folio = 'REQ-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random() * 1000);

    // 2. Generar lista HTML (CORRECCIÓN: Usando comillas invertidas  )
    const listaHtml = materiales.map((m: any) => 
      <li><strong>\ \</strong> - \ \</li>
    ).join('');

    // 3. Enviar correo
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['recursos.humanos@gcuavante.com', usuario.email],
      subject: 'Confirmación Requisición - Folio: ' + folio,
      html: \
        <div style="font-family: sans-serif; color: #333;">
          <h1>✅ Nueva Requisición</h1>
          <p><strong>Folio:</strong> \</p>
          <p><strong>Usuario:</strong> \</p>
          <p><strong>Obra:</strong> \</p>
          <p><strong>Notas:</strong> \</p>
          <hr/>
          <h3>Lista de Materiales:</h3>
          <ul>\</ul>
        </div>
      \
    });

    return NextResponse.json({ success: true, folio });
  } catch (error: any) {
    console.error('Error enviando correo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
