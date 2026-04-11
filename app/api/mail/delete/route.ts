import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";
import { logger } from "@/lib/logger";
import { getZohoCreds } from "../_zoho-creds";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
const log = logger("MAIL-DELETE");

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "mail:delete", ...RATE_LIMITS.WRITE });
    if (!rl.allowed) return rateLimitResponse(rl);

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (imap as any).seq.addFlags(uids, ["\\Deleted"], (err: unknown) => {
            if (err) { imap.end(); reject(err); return; }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (imap as any).expunge((err: unknown) => {
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
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" || "Error al eliminar" }, { status: 500 });
  }
}
