/**
 * GET /api/mail/unread-count
 * Retorna { count: number } — emails no leídos en INBOX.
 * Usa credenciales del sistema (ZOHO_EMAIL / ZOHO_PASSWORD).
 * Diseñado para polling ligero desde el sidebar (timeout 10s).
 */
import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";
import { logger } from "@/lib/logger";
import { getZohoCreds } from "../_zoho-creds";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("MAIL-UNREAD");

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getClientIdentifier(req), { key: "mail:unread", ...RATE_LIMITS.PUBLIC });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const creds = await getZohoCreds(req);
    if (!creds) {
      return NextResponse.json({ count: 0 });
    }

    const count = await new Promise<number>((resolve) => {
      const imap = new Imap({
        user: creds.email,
        password: creds.password,
        host: "imappro.zoho.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: true },
        connTimeout: 10000,
        authTimeout: 10000,
      });

      imap.once("ready", () => {
        imap.openBox("INBOX", true, (err, box) => {
          if (err) { imap.end(); resolve(0); return; }
          // box.messages.unseen puede ser undefined en algunos servidores IMAP
          // alternativa: buscar mensajes no leídos
          imap.search(["UNSEEN"], (searchErr, results) => {
            imap.end();
            if (searchErr || !results) { resolve(0); return; }
            resolve(results.length);
          });
        });
      });

      imap.once("error", () => resolve(0));
      imap.connect();
    });

    log.info("unread count", { count, email: creds.email });
    return NextResponse.json({ count }, {
      headers: {
        // Cache corto para no saturar Zoho IMAP
        "Cache-Control": "s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (e: unknown) {
    log.error("unread count error", { err: (e as { message?: string })?.message });
    return NextResponse.json({ count: 0 });
  }
}
