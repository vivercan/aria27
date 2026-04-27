import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";
import { logger } from "@/lib/logger";
import { getZohoCreds } from "../_zoho-creds";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
const log = logger("MAIL-INBOX");

interface EmailMessage {
  seqno?: number;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  uid?: number;
  flags?: string[];
  seen?: boolean;
}

// Helper: single IMAP fetch attempt
async function fetchOnce(creds: { email: string; password: string }, folder: string, limit: number): Promise<EmailMessage[]> {
  const { email, password } = creds;
  return new Promise<EmailMessage[]>((resolve, reject) => {
    const imap = new Imap({
      user: email,
      password: password,
      host: "imappro.zoho.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: true },
      connTimeout: 15000,
      authTimeout: 15000,
    });
    const messages: EmailMessage[] = [];
    imap.once("ready", () => {
      imap.openBox(folder, true, (err, box) => {
        if (err) { imap.end(); reject(err); return; }
        const total = box.messages.total;
        if (total === 0) { imap.end(); resolve([]); return; }
        const start = Math.max(1, total - limit + 1);
        const range = start + ":" + total;
        const fetch = imap.seq.fetch(range, {
          bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
          struct: true,
        });
        fetch.on("message", (msg, seqno) => {
          const emailData: EmailMessage = { seqno };
          msg.on("body", (stream) => {
            let buffer = "";
            stream.on("data", (chunk) => { buffer += chunk.toString("utf8"); });
            stream.on("end", () => {
              const lines = buffer.split("\r\n");
              lines.forEach((line) => {
                if (line.toLowerCase().startsWith("from:")) emailData.from = line.substring(5).trim();
                if (line.toLowerCase().startsWith("to:")) emailData.to = line.substring(3).trim();
                if (line.toLowerCase().startsWith("subject:")) emailData.subject = line.substring(8).trim();
                if (line.toLowerCase().startsWith("date:")) emailData.date = line.substring(5).trim();
              });
            });
          });
          msg.once("attributes", (attrs) => {
            emailData.uid = attrs.uid;
            emailData.flags = attrs.flags;
            emailData.seen = attrs.flags?.includes("\\Seen");
          });
          msg.once("end", () => { messages.push(emailData); });
        });
        fetch.once("error", (err) => { imap.end(); reject(err); });
        fetch.once("end", () => { imap.end(); resolve(messages.reverse()); });
      });
    });
    imap.once("error", (err) => reject(err));
    imap.connect();
  });
}

// Retry wrapper: 3 intentos con backoff exponencial (500ms, 1000ms, 2000ms)
// Evita errores transitorios de conexión IMAP (timeout, network glitch, Zoho reinicio)
async function fetchWithRetry(creds: { email: string; password: string }, folder: string, limit: number, maxAttempts = 3): Promise<EmailMessage[]> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchOnce(creds, folder, limit);
    } catch (err) {
      lastErr = err;
      log.warn(`IMAP intento ${attempt}/${maxAttempts} fallo:`, (err as {message?: string})?.message || err);
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastErr;
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "mail:inbox", ...RATE_LIMITS.WRITE });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { folder = "INBOX", limit = 25 } = await req.json().catch(() => ({}));
    const creds = await getZohoCreds(req);
    if (!creds) {
      return NextResponse.json({ error: "Sesión de correo no activa" }, { status: 401 });
    }

    const emails = await fetchWithRetry(creds, folder, limit);
    return NextResponse.json({ emails, count: emails.length });
  } catch (error: unknown) {
    log.error("IMAP Error (3 intentos agotados):", error);
    return NextResponse.json({ error: (error as {message?: string})?.message || "Error al conectar con Zoho" }, { status: 500 });
  }
}
