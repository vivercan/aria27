import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { getZohoCreds } from "../_zoho-creds";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

interface ParsedEmailContent {
  body: string;
  html: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ImapFetchable extends Record<string, any> {
  bodies: string;
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "mail:fetch", ...RATE_LIMITS.WRITE });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { uid, folder = "INBOX" } = await req.json();
    const creds = await getZohoCreds();
    if (!creds) {
      return NextResponse.json({ error: "Sesión de correo no activa" }, { status: 401 });
    }
    const { email, password } = creds;
    if (!uid) {
      return NextResponse.json({ error: "uid requerido" }, { status: 400 });
    }

    const emailContent = await new Promise<ParsedEmailContent>((resolve, reject) => {
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

      (imap as any).once("ready", () => {
        (imap as any).openBox(folder, true, (err: unknown) => {
          if (err) { (imap as any).end(); reject(err); return; }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const f: any = ((imap as any) as Record<string, any>).fetch([uid], { bodies: "" } as ImapFetchable);
          let buffer = Buffer.alloc(0);

          (f as any).on("message", (msg: unknown) => {
            const message = msg as any;
            (message.on as (event: string, callback: (stream: unknown) => void) => void)("body", (stream: unknown) => {
              (stream as any).on("data", (chunk: Buffer) => {
                buffer = Buffer.concat([buffer, chunk]);
              });
            });

            (message.once as (event: string, callback: () => Promise<void>) => void)("end", async () => {
              try {
                const parsed = await simpleParser(buffer);
                resolve({
                  body: parsed.text || "",
                  html: parsed.html || "",
                });
              } catch (e: unknown) {
                resolve({ body: "", html: "" });
              }
              (imap as any).end();
            });
          });

          (f as any).once("error", (fetchErr: Error) => {
            (imap as any).end();
            reject(fetchErr);
          });
        });
      });

      (imap as any).once("error", (err: Error) => reject(err));
      (imap as any).connect();
    });

    return NextResponse.json(emailContent);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  }
}
