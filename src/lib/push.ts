/**
 * Notificaciones del telefono (Web Push) · servidor · 10-Oct-2026
 * Requiere env: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 * Suscripciones en push_subscriptions (RLS sin politicas: solo service role).
 */
import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase-server";

let configurado = false;
function config(): boolean {
  if (configurado) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:juanviverosv@gmail.com", pub, priv);
  configurado = true; return true;
}

export type PushMsg = { title: string; body: string; url?: string; tag?: string };

/** Manda la notificacion a todos los telefonos de ese usuario. Devuelve cuantos la recibieron. */
export async function pushAEmail(email: string | null | undefined, msg: PushMsg): Promise<number> {
  const em = String(email || "").toLowerCase().trim();
  if (!em || !config()) return 0;
  const db = getSupabaseAdmin();
  const { data } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth, fallos").ilike("user_email", em);
  let ok = 0;
  for (const s of (data || []) as { id: string; endpoint: string; p256dh: string; auth: string; fallos: number | null }[]) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: msg.title.slice(0, 80), body: msg.body.slice(0, 240), url: msg.url || "/dashboard/campo", tag: msg.tag }), { TTL: 60 * 60 * 24 });
      ok++; await db.from("push_subscriptions").update({ last_ok_at: new Date().toISOString(), fallos: 0 }).eq("id", s.id);
    } catch (e: unknown) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410 || (s.fallos || 0) >= 5) await db.from("push_subscriptions").delete().eq("id", s.id);
      else await db.from("push_subscriptions").update({ fallos: (s.fallos || 0) + 1 }).eq("id", s.id);
    }
  }
  return ok;
}
