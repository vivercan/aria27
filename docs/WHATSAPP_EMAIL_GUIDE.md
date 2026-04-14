# ARIA27 — Guía de Mensajería WhatsApp & Email
> Última actualización: 14-Abr-2026 | Root cause 14-Abr + audit completo

---

## 🚨 ZONAS CRÍTICAS — NO TOCAR SIN LEER ESTO

### 1. Supabase Client en Webhooks

| Archivo | Variable | ¿Cuál usar? | ¿Por qué? |
|---------|----------|------------|-----------|
| `app/api/webhook/attendance/route.ts` | `db` | `getSupabaseAdmin()` | RLS bloquea `employees`, `centros_trabajo`, `asistencias` con anon key |
| `app/api/webhook/oc-foto/route.ts` | `db` | `getSupabaseAdmin()` | RLS bloquea `purchase_orders`, `entregas` con anon key |

**❌ NUNCA** cambiar `const db = getSupabaseAdmin()` a `supabase` (anon client) en estos archivos.  
**Bug real**: 14-Abr-2026 — "Teléfono no registrado" en todos los empleados por RLS bloqueando `employees`.

### 2. HMAC de WhatsApp

Meta envía `x-hub-signature-256` pero el router de Supabase NO lo reenvía.  
Por eso se requiere `DISABLE_WEBHOOK_HMAC=true` en Vercel env vars.

**Si falta `DISABLE_WEBHOOK_HMAC=true` y hay `META_APP_SECRET` → todos los webhooks retornan 403.**

Monitor automático: `/api/cron/health-monitor` (cada 15 min) alerta a JJ si detecta esta combinación.

---

## 📱 Mapa Completo — Mensajes WhatsApp

### Webhook Principal: `app/api/webhook/attendance/route.ts`
URL registrada en Meta: `https://aria.jjcrm27.com/api/webhook/attendance`  
WABA: `842930185269415` | Phone ID: `963627606824867`  
Verify Token: `aria27_webhook_token`

| Tipo mensaje entrante | Flujo | Mensaje de respuesta |
|----------------------|-------|---------------------|
| `location` | `handleAsistencia()` | ✅/⚠️ ENTRADA REGISTRADA / SALIDA REGISTRADA con 👤📍🕐⏱️ |
| `image` + folio OC en caption | `handleFotoOC()` | `*FOTO GUARDADA*` |
| `image` + caption traslado | `handleTransferenciaInventario()` | `*TRASLADO REGISTRADO*` |
| `image` + caption salida | `handleSalidaInventario()` | `*SALIDA REGISTRADA*` |
| `image` + caption entrada/material | `handleInventarioWhatsApp()` | `*INVENTARIO ACTUALIZADO*` |
| `image` (sin keyword) | `handleGasto()` vía ticket OCR | `*GASTO REGISTRADO*` |
| `text` con monto/gasto | `handleGasto()` vía texto | `*GASTO REGISTRADO*` |
| `text` sin keyword de gasto | Menú de ayuda | `*ARIA27* ASISTENCIA: ...` |

#### Formato de Asistencia (✅ correcto desde commit `3f90b00`):
```
✅ ENTRADA REGISTRADA ✅
A 45m de MIRAVALLE
👤 Juan Pérez
📍 MIRAVALLE
🕐 08:30
¡Buen día!
```
```
⚠️ ENTRADA REGISTRADA⚠️ FUERA: 1.2km de MIRAVALLE
👤 Juan Pérez
📍 MIRAVALLE
🕐 08:30
¡Buen día!
```

### Webhook OC-Foto: `app/api/webhook/oc-foto/route.ts`
URL: `https://aria.jjcrm27.com/api/webhook/oc-foto`  
Verify Token: `aria27_oc_foto_verify`

| Caso | Mensaje |
|------|---------|
| Caption sin folio OC | `⚠️ No encontré el folio...` |
| OC no existe | `❌ No encontré la orden...` |
| Foto vinculada a entrega existente | `✅ Foto vinculada a la entrega...` |
| Nueva entrega creada | `✅ Entrega ENT-XXXXX creada...` |

### Health Monitor: `app/api/cron/health-monitor/route.ts`
Cron cada 15min → llama `/api/health` → si hay errores críticos envía WA a `ADMIN_WHATSAPP_PHONE`

### Requisiciones — Templates aprobados:

| Template | Trigger | Destinatario | Parámetros |
|----------|---------|--------------|------------|
| `requisicion_creada` | POST /api/requisicion | Creador | Folio, Solicitante, Obra, Fecha |
| `requisicion_compras` | POST /api/requisicion (urgente) | Compras | Folio, Obra, Urgencia, Materiales |
| `requisicion_rechazada` | validate rechazo | Creador | Folio, Obra, Estado, Motivo |
| `compra_autorizar` | POST /api/requisicion/authorize-purchase | Autorizador | Folio, Obra, Solicitante, Urgencia, Materiales, Total |
| `oc_generada` | POST /api/requisicion/approve-purchase | Compras | Req, OC, Obra, Proveedor, Total, Forma pago |
| `entrega_material` | POST /api/requisicion/registrar-entrega | Solicitante | OC, Obra, Proveedor, Folio entrega |
| `comparativa_enviar` | POST /api/requisicion/enviar-comparativa | Dirección | Folio, Obra, Mejor precio, Num proveedores |
| `solicitar_cotizacion` | POST /api/requisicion/solicitar-cotizacion | Proveedor | Folio, Obra, Urgencia |

---

## 📧 Mapa Completo — Emails (Resend)

**Remitente siempre:** `ARIA27 <noreply@mail.jjcrm27.com>`  
**Singleton:** `getResend()` en `lib/resend.ts` — TODOS los archivos deben usar este, NO raw fetch.

| Ruta | Trigger | Destinatario | Asunto |
|------|---------|--------------|--------|
| `requisicion/route.ts` | Nueva requisición | Creador + Compras + Dirección + Admin | Notificación creación |
| `requisicion/validate/route.ts` | Aprobación/rechazo | Creador (si rechazada) | Estado de requisición |
| `requisicion/authorize-purchase/route.ts` | Requiere autorización | Autorizador | Solicitud autorización |
| `requisicion/approve-purchase/route.ts` | OC generada | Solicitante | OC creada |
| `requisicion/enviar-comparativa/route.ts` | Comparativa lista | Director | Comparativa proveedores |
| `requisicion/solicitar-cotizacion/route.ts` | Solicitud cotización | Proveedor | Solicitud cotización |
| `requisicion/registrar-entrega/route.ts` | Material recibido | Solicitante | ✅ Material Recibido |
| `alertas/digest/route.ts` | Cron digest | Admin | 🔔 ARIA27 Digest |
| `mail/test/route.ts` | Test manual | Admin | ✅ ARIA27 — Email de prueba |

**Nota:** `mail/send/route.ts` usa **Zoho SMTP** vía nodemailer (no Resend) — para emails usuario-a-usuario.

---

## 🔧 Phone Formatting

### Empleados (webhook attendance)
- WhatsApp envía: `5218112392266` (13 dígitos con 521 prefix)
- `employees.whatsapp` guarda: `8112392266` (10 dígitos)
- Normalización: `from.replace(/\\D/g, "").slice(-10)` → últimos 10 dígitos

### Usuarios (requisiciones)
- `Users.phone` formato esperado: 10 dígitos
- `sendWhatsAppTemplate` formatea: 10 → `52` + 10 | 13 con `521` prefix → `52` + 10

---

## ✅ Checklist Post-Cambio (obligatorio antes de push)

- [ ] `db = getSupabaseAdmin()` permanece en webhooks (NUNCA anon client)
- [ ] Emojis ✅/⚠️ + 👤📍🕐⏱️ en mensajes de asistencia
- [ ] Todos los sendWhatsApp en webhooks usan el helper local `sendWhatsApp()`
- [ ] Todos los emails usan `getResend()` (no raw fetch a resend.com)
- [ ] `DISABLE_WEBHOOK_HMAC=true` documentado en Vercel env vars
- [ ] Smoke test: `curl https://aria.jjcrm27.com/api/health` → status ok
- [ ] wa_log en Supabase muestra registros recientes tras prueba E2E

---

## 📊 Variables de Entorno Requeridas

| Variable | Uso | Dónde configurar |
|----------|-----|-----------------|
| `WHATSAPP_ACCESS_TOKEN` | Envío de mensajes WA | Vercel env vars |
| `WHATSAPP_PHONE_ID` | `963627606824867` Phone ID JJCRM27 | Vercel env vars |
| `ADMIN_WHATSAPP_PHONE` | Alertas sistema a JJ | Vercel env vars |
| `DISABLE_WEBHOOK_HMAC` | `true` — bypass HMAC (Supabase router) | Vercel env vars |
| `META_APP_SECRET` | Verificación HMAC (sin esto, grace mode) | Vercel env vars |
| `ANTHROPIC_API_KEY` | OCR tickets, inventario, traslados | Vercel env vars |
| `RESEND_API_KEY` | Emails transaccionales | Vercel env vars |

---

## 🐛 Bugs Resueltos (histórico)

| Fecha | Bug | Root Cause | Fix |
|-------|-----|-----------|-----|
| 14-Abr-2026 | "Teléfono no registrado" todos los empleados | `supabase` anon bloqueado por RLS en `employees` | `db = getSupabaseAdmin()` en attendance + oc-foto |
| 14-Abr-2026 | Mensajes sin emojis, sin "¡Hasta mañana!" | sendWhatsApp usaba texto plano | 6 mensajes handleAsistencia reescritos con formato correcto |
| 14-Abr-2026 | oc-foto no guardaba fotos de OC | anon bloqueado en `purchase_orders` + `entregas` | `db = getSupabaseAdmin()` en oc-foto |
| 13-Abr-2026 | Webhook retornaba 403 | `DISABLE_WEBHOOK_HMAC=true` faltaba en Vercel | Env var configurada + boot-check implementado |
