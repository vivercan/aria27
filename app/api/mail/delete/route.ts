import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { getZohoCreds } from "../_zoho-creds";
const log = logger("MAIL-DELETE");

interface ImapWithSeq {
  seq: {
    addFlags(uids: number[], flags: string[], callback: (err: Error | null) => void): void;
  };
  expunge(callback: (err: Error | null) => void): void;
}

export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req);
  const rl = checkRateLimit(clientId, { key: "mail:delete", ...RATE_LIMITS.EMAIL });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { uids, folder = "INBOX" } = await req.json();
    const creds = await getZohoCreds();
    if (!creds) {
      return NextResponse.json({ error: "Sesión de correo no activa" }, { status: 401 });
    }
    const { email, password } = creds;
    if (!uids || uids.length === 0) {
      return NextResponse.json({ error: "uids requeridos" }, { status: 400 });
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
          (imap as unknown as ImapWithSeq).seq.addFlags(uids, ["\\Deleted"], (err: Error | null) => {
            if (err) { imap.end(); reject(err); return; }

            (imap as unknown as ImapWithSeq).expunge((err: Error | null) => {
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
  } catch (error: unknown) {
    log.error("Error eliminando correos:", error);
    return NextResponse.json({ error: (error as Error)?.message || "Error al eliminar" }, { status: 500 });
  }
}
