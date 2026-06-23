# ARIA27 — Variables de Entorno (registro maestro)

**Última actualización:** 23-Jun-2026 (post COMB-2.0 FINAL)
**Proyecto Vercel:** `aria-jjcrm27` · Dominio: `https://aria.jjcrm27.com`
**Proyecto Supabase:** `yhylkvpynzyorqortbkk`
**WhatsApp WABA:** `842930185269415` (JJCRM27, Phone `963627606824867`)

> NO se documentan valores secretos. Solo nombre, dónde vive, para qué sirve, estado y cómo validar sin revelar.

## Variables críticas runtime Vercel (producción)

| Variable | Para qué | Configurada | Cómo validar sin revelar |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública Supabase (frontend + server) | ✅ | curl prod → debe responder 200 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key cliente browser | ✅ | Buscar en bundle JS de prod (es public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role para endpoints server-side | ✅ | `/api/employees/by-email?email=X` → 200 con data |
| `WHATSAPP_ACCESS_TOKEN` | Bearer Meta WhatsApp Cloud API | ✅ | `/api/admin/seed-meta-templates-combustibles` POST → `ok:true` |
| `WHATSAPP_PHONE_ID` | ID del número WA (JJCRM27) | ✅ | Mismo endpoint anterior |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` / `WHATSAPP_WABA_ID` | WABA `842930185269415` | ✅ | Confirmado en mensajes WA enviados |
| `WHATSAPP_VERIFY_TOKEN` | Token verify_token webhook Meta | ✅ (valor: `aria27_verify`) | `GET /api/wa/comb/inbound?hub.mode=subscribe&hub.verify_token=aria27_verify&hub.challenge=test123` → echo `test123` |
| `META_APP_SECRET` | HMAC validar webhooks Meta | ✅ | Sin método indirecto trivial |
| `ANTHROPIC_API_KEY` | Claude IA (extractor + factura combustibles) | ✅ | `/api/extract` → 200 con extracción |
| `RESEND_API_KEY` | Envío de emails | ✅ | `/api/test-email` (si existe) |
| `RESEND_FROM` | From email branded | ✅ | Mismos correos enviados muestran este from |
| `CRON_SECRET` o `BACKUP_TOKEN` | Auth de cron jobs Vercel | ✅ | Cron synthetic */2 min activo |
| `ADMIN_EMAIL` | Whitelist admin único override | ✅ | `juanviverosv@gmail.com` (en código fallback) |

## Variables pendientes de configurar

| Variable | Para qué | Estado | Acción |
|---|---|---|---|
| `WA_WEBHOOK_INTERNAL_SECRET` | Auth interno entre endpoints WA y procesador | ❌ FALTANTE | **JJ pega en Vercel env. Valor sugerido: `90ec1c95b92c24597d06b8de39f7d014cf867fbe89d5103b`** |

## Variables CI (workflow GitHub Actions)

Agregadas 23-Jun-2026 en `.github/workflows/ci.yml` para que `next build` no truene durante "Collecting page data":

- `NEXT_PUBLIC_SUPABASE_URL=https://dummy-ci-build.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy_anon_key_ci_build_only`
- `SUPABASE_SERVICE_ROLE_KEY=dummy_service_key_ci_build_only`
- `WHATSAPP_ACCESS_TOKEN=dummy_wa_ci_only`
- `WHATSAPP_PHONE_ID=000000000000000`
- `ANTHROPIC_API_KEY=dummy_anthropic_ci_only`
- `RESEND_API_KEY=dummy_resend_ci_only`
- `CRON_SECRET=dummy_cron_ci_only`

**Estos dummy NO permiten conectar a nada real.** Solo permiten que `createClient()` y otros constructores no tiren error en module-load durante build. Vercel runtime tiene las reales.

## Webhooks Meta Business → ARIA27

| Evento | URL | Verify Token | Estado |
|---|---|---|---|
| WA messages (general) | `https://aria.jjcrm27.com/api/webhook/whatsapp` o equivalente | `aria27_verify` | ⚠️ verificar suscripción en Meta UI |
| WA messages combustibles | `https://aria.jjcrm27.com/api/wa/comb/inbound` | `aria27_verify` | ❌ pendiente suscribir en Meta UI |

## Cómo aplicar nuevas env vars

1. Generarla con `openssl rand -hex 24` si es secreto
2. Pegarla en `Vercel → Settings → Environment Variables` (Production + Preview)
3. Si rompe build local: agregar valor dummy al workflow YAML
4. Push commit que la consume
5. Verificar con curl al endpoint que la usa
6. NO escribir el valor en commits ni en este archivo

## Auditoría de uso (cómo ver dónde se consume cada var)

```bash
grep -rn "process\.env\.<VARIABLE>" app/ src/ lib/ 2>/dev/null
```

## Historial cambios

- **23-Jun-2026** — Creación post Combustibles 2.0
