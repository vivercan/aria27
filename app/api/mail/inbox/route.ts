import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";

export async function POST(req: NextRequest) {
  try {
    const { email, password, folder = "INBOX", limit = 25 } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Credenciales requeridas" }, { status: 400 });
    }

    const emails = await new Promise<any[]>((resolve, reject) => {
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

      const messages: any[] = [];

      imap.once("ready", () => {
        imap.openBox(folder, true, (err, box) => {
          if (err) { imap.end(); reject(err); return; }
          const total = box.messages.total;
          if (total === 0) { imap.end(); resolve([]); return; }

          const start = Math.max(1, total - limit + 1);
          const fetch = imap.seq.fetch(`${start}:${total}`, {
            bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
            struct: true,
          });

          fetch.on("message", (msg, seqno) => {
            const emailData: any = { seqno };
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

    return NextResponse.json({ emails, count: emails.length });
  } catch (error: any) {
    console.error("IMAP Error:", error);
    return NextResponse.json({ error: error.message || "Error al conectar con Zoho" }, { status: 500 });
  }
}
