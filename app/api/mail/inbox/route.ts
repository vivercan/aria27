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
        connTimeout: 30000,
        authTimeout: 20000,
        debug: console.log,
      };

      const imap: any = new Imap(imapConfig);
      const results: any[] = [];

      imap.once("ready", () => {
        console.log("IMAP conectado correctamente");
        imap.openBox(folder, true, (err: any) => {
          if (err) {
            console.error("Error abriendo carpeta:", err);
            imap.end();
            return reject(new Error(`Error abriendo carpeta: ${err.message}`));
          }

          imap.search(["ALL"], (err: any, uids: number[]) => {
            if (err) {
              console.error("Error en búsqueda:", err);
              imap.end();
              return reject(new Error(`Error en búsqueda: ${err.message}`));
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
              console.error("Fetch error:", err);
              imap.end();
              reject(new Error(`Error obteniendo correos: ${err.message}`));
            });

            f.once("end", () => {
              imap.end();
              results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              resolve(results);
            });
          });
        });
      });

      imap.once("error", (err: any) => {
        console.error("IMAP Error completo:", err);
        const errorMsg = err.textCode || err.message || "Error de conexión IMAP";
        
        // Mensajes específicos para errores comunes de Zoho
        if (errorMsg.includes("AUTHENTICATIONFAILED") || errorMsg.includes("Invalid credentials")) {
          reject(new Error("Credenciales inválidas. Verifica que IMAP esté habilitado en Zoho: Settings → Mail → IMAP Access"));
        } else if (errorMsg.includes("UNAVAILABLE")) {
          reject(new Error("Servidor no disponible. Intenta de nuevo en unos minutos."));
        } else {
          reject(new Error(errorMsg));
        }
      });

      imap.once("close", (hadError: boolean) => {
        if (hadError) {
          console.log("Conexión cerrada con error");
        }
      });

      imap.connect();
    });

    return NextResponse.json({ emails, count: emails.length });
  } catch (error: any) {
    console.error("Error final:", error);
    return NextResponse.json({ error: error.message || "Error de conexión" }, { status: 500 });
  }
}
