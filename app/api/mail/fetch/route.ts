import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";
import { simpleParser } from "mailparser";

export async function POST(req: NextRequest) {
  try {
    const { email, password, uid, folder = "INBOX" } = await req.json();
    if (!email || !password || !uid) {
      return NextResponse.json({ error: "Faltan parametros" }, { status: 400 });
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

          const f = imap.seq.fetch(uid, { bodies: "" });
          let buffer = Buffer.alloc(0);

          f.on("message", (msg) => {
            msg.on("body", (stream) => {
              stream.on("data", (chunk) => {
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

          f.once("error", (err) => { imap.end(); reject(err); });
        });
      });

      imap.once("error", (err) => reject(err));
      imap.connect();
    });

    return NextResponse.json(emailContent);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
