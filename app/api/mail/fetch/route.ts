import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";
import { simpleParser } from "mailparser";
import { getZohoCreds } from "../_zoho-creds";

export async function POST(req: NextRequest) {
  try {
    const { uid, folder = "INBOX" } = await req.json();
    const creds = await getZohoCreds();
    if (!creds) {
      return NextResponse.json({ error: "Sesión de correo no activa" }, { status: 401 });
    }
    const { email, password } = creds;
    if (!uid) {
      return NextResponse.json({ error: "uid requerido" }, { status: 400 });
    }

    const emailContent = await new Promise<any>((resolve, reject) => {
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
        imap.openBox(folder, true, (err) => {
          if (err) { imap.end(); reject(err); return; }

          // @ts-ignore - fetch exists on imap
          const f = imap.fetch([uid], { bodies: "" });
          let buffer = Buffer.alloc(0);

          f.on("message", (msg: any) => {
            msg.on("body", (stream: any) => {
              stream.on("data", (chunk: Buffer) => {
                buffer = Buffer.concat([buffer, chunk]);
              });
            });

            msg.once("end", async () => {
              try {
                const parsed = await simpleParser(buffer);
                resolve({
                  body: parsed.text || "",
                  html: parsed.html || "",
                });
              } catch (e) {
                resolve({ body: "", html: "" });
              }
              imap.end();
            });
          });

          f.once("error", (fetchErr: Error) => { 
            imap.end(); 
            reject(fetchErr); 
          });
        });
      });

      imap.once("error", (err: Error) => reject(err));
      imap.connect();
    });

    return NextResponse.json(emailContent);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
