# Plantillas WhatsApp Meta — Combustibles 2.0

Idioma: `es_MX` · Categoría: `UTILITY` · WABA: 842930185269415

## 1. aria_comb_solicitud_recibida (al operador)

**Cuerpo:**
```
Tu solicitud de combustible quedó registrada.

Folio: *{{1}}*
Tipo: {{2}}
Litros: {{3}}
Unidad: {{4}}
Obra: {{5}}

Te avisamos cuando se autorice el depósito.
```

## 2. aria_comb_consolidado_jessica (recordatorio Jessica 6 PM)

**Cuerpo:**
```
Hola Jessica, hay *{{1}} solicitudes* de combustible pendientes hoy:

- Gasolina: {{2}} L
- Diésel: {{3}} L
- Estimado: ${{4}} MXN

Abre /dashboard/combustibles/consolidados para generar el consolidado y enviarlo a Dirección.
```

## 3. aria_comb_para_autorizar (a Fernando con quick reply)

**Cuerpo:**
```
*Consolidado {{1}}* requiere tu autorización:

{{2}} solicitudes · {{3}} L total · ${{4}} MXN estimado.

Si autorizas, transfiere a Caja Compras BBVA XXX-XXX-XXXX.
```

**Quick Reply Buttons:**
- `AUTORIZAR_{folio}` → texto "✅ Autorizar"
- `RECHAZAR_{folio}` → texto "❌ Rechazar"

## 4. aria_comb_transferir_a_compras (a Fernando después de autorizar)

**Cuerpo:**
```
Confirmaste autorización del consolidado *{{1}}* por ${{2}} MXN.

Por favor transfiere a:
*Caja Compras Combustibles*
Banco: BBVA
Cuenta: XXX-XXXX-XXXX

Cuando hayas transferido, responde *TRANSFERIDO {{1}}* y registramos la conciliación.
```

## 5. aria_comb_subir_factura (al operador después del depósito)

**Cuerpo:**
```
Hola {{1}}, ya se depositó el combustible de tu solicitud *{{2}}*.

Cuando cargues, envía:
1. Foto del odómetro/horómetro post-carga
2. Foto del ticket/factura

Solo responde con las fotos a este chat.
```

---

## Cómo someter a Meta

```bash
# Variables requeridas
META_ACCESS_TOKEN=<token de Meta Business>
WABA_ID=842930185269415

# Submit cada template via Graph API
curl -X POST "https://graph.facebook.com/v22.0/${WABA_ID}/message_templates" \
  -H "Authorization: Bearer ${META_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "name": "aria_comb_solicitud_recibida", "language": "es_MX", "category": "UTILITY", "components": [...] }'
```

Endpoint `/api/admin/seed-meta-templates` se puede extender para hacer batch upsert (similar al script de `aria_tarea_status`).
