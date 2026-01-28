import { NextRequest, NextResponse } from "next/server";
import Imap from "imap";
import { simpleParser } from "mailparser";

export async function POST(req: NextRequest) {
  try {
    const { email, password, folder = "INBOX", limit = 20 } = await req.json();
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
      let pending = 0;

      imap.once("ready", () => {
        imap.openBox(folder, true, (err, box) => {
          if (err) { imap.end(); reject(err); return; }
          
          const total = box.messages.total;
          if (total === 0) { imap.end(); resolve([]); return; }
          
          const start = Math.max(1, total - limit + 1);
          const fetch = imap.seq.fetch(`${start}:${total}`, {
            bodies: "",
            struct: true,
          });

          fetch.on("message", (msg, seqno) => {
            pending++;
            const emailData: any = { seqno };
            let buffer = Buffer.alloc(0);

            msg.on("body", (stream) => {
              stream.on("data", (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
              });
            });

            msg.once("attributes", (attrs) => {
              emailData.uid = attrs.uid;
              emailData.flags = attrs.flags || [];
              emailData.seen = attrs.flags?.includes("\\Seen") || false;
              emailData.hasAttachment = false;
              
              // Check for attachments in structure
              const checkAttachment = (struct: any) => {
                if (!struct) return;
                if (Array.isArray(struct)) {
                  struct.forEach(checkAttachment);
                } else if (struct.disposition?.type?.toLowerCase() === "attachment") {
                  emailData.hasAttachment = true;
                }
              };
              checkAttachment(attrs.struct);
            });

            msg.once("end", async () => {
              try {
                const parsed = await simpleParser(buffer);
                emailData.from = parsed.from?.text || "";
                emailData.to = Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(", ") : (parsed.to?.text || "");
                emailData.subject = parsed.subject || "";
                emailData.date = parsed.date?.toISOString() || "";
                emailData.body = parsed.text || "";
                emailData.html = parsed.html || "";
                
                if (parsed.attachments && parsed.attachments.length > 0) {
                  emailData.hasAttachment = true;
                }
                
                messages.push(emailData);
              } catch (parseErr) {
                console.error("Parse error:", parseErr);
                messages.push(emailData);
              }
              
              pending--;
              if (pending === 0) {
                imap.end();
              }
            });
          });

          fetch.once("error", (err) => { 
            imap.end(); 
            reject(err); 
          });
          
          fetch.once("end", () => {
            if (pending === 0) {
              imap.end();
            }
          });
        });
      });

      imap.once("end", () => {
        // Sort by date descending (newest first)
        messages.sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateB - dateA;
        });
        resolve(messages);
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


