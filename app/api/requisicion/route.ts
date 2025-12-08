import { NextResponse } from 'next/server';
import { Resend } from 'resend';

type Material = {
  name: string;
  unit: string;
  qty: number;
  comments?: string;
};

type Usuario = {
  nombre: string;
  email: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usuario, obra, comentarios, materiales } = body as {
      usuario: Usuario;
      obra: string;
      comentarios?: string;
      materiales: Material[];
    };

    const folio =
      'REQ-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      Math.floor(Math.random() * 1000);

    const listaHtml = (materiales || [])
      .map(
        (m) =>
          <li><strong> </strong> - </li>
      )
      .join('');

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY no está configurada');
      return NextResponse.json(
        { success: false, error: 'Servicio de correo no configurado' },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['recursos.humanos@gcuavante.com', usuario?.email].filter(Boolean) as string[],
      subject: Confirmación Requisición - Folio: ,
      html: 
        <div style="font-family: sans-serif; color: #333;">
          <h1>✅ Nueva Requisición</h1>
          <p><strong>Folio:</strong> </p>
          <p><strong>Usuario:</strong> </p>
          <p><strong>Obra / Centro de Costos:</strong> </p>
          <p><strong>Notas:</strong> </p>
          <h2>Materiales solicitados</h2>
          <ul>
            
          </ul>
        </div>
      ,
    });

    return NextResponse.json({ success: true, folio });
  } catch (error) {
    console.error('Error en API /api/requisicion', error);
    return NextResponse.json(
      { success: false, error: 'Error procesando la requisición' },
      { status: 500 }
    );
  }
}
