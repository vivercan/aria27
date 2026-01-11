import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";

export async function POST(req: NextRequest) {
  try {
    const { email, password, uids, folder = "INBOX" } = await req.json();
    
    if (!email || !password || !uids || uids.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const result = await new Promise<{ success: boolean; deleted: number }>((resolve, reject) => {
      const imap = new Imap({
        user: email,
        password: password,
        host: "imappro.zoho.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 15000,
        authTimeout: 15000,
      });

      imap.once("ready", () => {
        imap.openBox(folder, false, (err, box) => {
          if (err) { imap.end(); reject(err); return; }
          
          // Usar seq.addFlags en lugar de addFlags
          (imap as any).seq.addFlags(uids, ["\\Deleted"], (err: any) => {
            if (err) { imap.end(); reject(err); return; }
            
            (imap as any).expunge((err: any) => {
              imap.end();
              if (err) reject(err);
              else resolve({ success: true, deleted: uids.length });
            });
          });
        });
      });

      imap.once("error", reject);
      imap.connect();
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error eliminando correos:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar" }, { status: 500 });
  }
}
