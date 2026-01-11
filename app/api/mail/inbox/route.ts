import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";
import { simpleParser } from "mailparser";

export async function POST(req: NextRequest) {
  try {
    const { email, password, folder = "INBOX", limit = 30 } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y password requeridos" }, { status: 400 });
    }

    const emails = await new Promise<any[]>((resolve, reject) => {
      const imapConfig = {
        user: email,
        password: password,
        host: "imappro.zoho.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 20000,
        authTimeout: 15000,
      };

      const imap: any = new Imap(imapConfig);
      const results: any[] = [];

      imap.once("ready", () => {
        imap.openBox(folder, true, (err: any) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          imap.search(["ALL"], (err: any, uids: number[]) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            if (!uids || uids.length === 0) {
              imap.end();
              return resolve([]);
            }

            const latest = uids.slice(-limit).reverse();
            const f = imap.fetch(latest, { bodies: "", struct: true });

            f.on("message", (msg: any, seqno: number) => {
              const emailData: any = { seqno };
              
              msg.on("body", (stream: any) => {
                let buffer = "";
                stream.on("data", (chunk: any) => buffer += chunk.toString("utf8"));
                stream.on("end", async () => {
                  try {
                    const parsed: any = await simpleParser(buffer);
                    emailData.from = parsed.from?.text || "";
                    emailData.to = Array.isArray(parsed.to) ? parsed.to.map((t: any) => t.text).join(", ") : parsed.to?.text || "";
                    emailData.subject = parsed.subject || "(Sin asunto)";
                    emailData.date = parsed.date?.toISOString() || "";
                    emailData.body = parsed.text || "";
                    emailData.html = parsed.html || "";
                    emailData.hasAttachment = (parsed.attachments?.length || 0) > 0;
                  } catch (e) {
                    console.error("Parse error:", e);
                  }
                });
              });

              msg.once("attributes", (attrs: any) => {
                emailData.uid = attrs.uid;
                emailData.flags = attrs.flags || [];
                emailData.seen = attrs.flags?.includes("\\Seen") || false;
              });

              msg.once("end", () => {
                if (emailData.from || emailData.uid) results.push(emailData);
              });
            });

            f.once("error", (err: any) => {
              imap.end();
              reject(err);
            });

            f.once("end", () => {
              imap.end();
              results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              resolve(results);
            });
          });
        });
      });

      imap.once("error", (err: any) => reject(err));
      imap.connect();
    });

    return NextResponse.json({ emails, count: emails.length });
  } catch (error: any) {
    console.error("IMAP Error:", error);
    return NextResponse.json({ error: error.message || "Error de conexión" }, { status: 500 });
  }
}
