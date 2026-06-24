# ARIA27 — Lecciones Aprendidas (vivo)

Bitácora de bugs P0/P1 con causa raíz + patrón sistémico + prevención. Lectura obligatoria antes de tocar módulos críticos.

---

## L-001 · 24-Jun-2026 · Nueva Requisición — proveedor no busca + falta monto combustible

### Síntoma reportado
Daisy + Jessica (2 compus distintas): al crear requi modo combustible, el buscador de proveedor no devuelve nada y no hay donde meter monto.

### Causa raíz #1 — endpoint requireUser sin header en frontend
El sweep SEC del 19-Jun-2026 (T10) migró 6 endpoints (`/api/proveedores/search`, `/api/proveedores/buscar-inteligente`, `/api/proveedores/[id]/correo`, `/api/employees/by-email`, `/api/employees/by-emails`, `/api/combustible/historial`) de `requireOriginOrUser` a `requireUser` estricto. El endpoint rechaza requests sin header `x-user-email` con HTTP 401.

**El bug:** el frontend `app/dashboard/requisiciones/requisiciones/nuevo/page.tsx` llamaba 2 de esos endpoints SIN ese header → 401 silencioso → array vacío → "no busca proveedor". Reproducible con curl externo (sin header → 401, con header → 200).

### Causa raíz #2 — falta campo precio en líneas de combustible
El componente `combRows` solo tenía `{tipo, litros, unidad_destino, tipo_unidad}`. Sin `precio_unitario`. Por eso "no da opción del monto" — porque NO EXISTE el campo en la UI. Esto bloquea cálculo de subtotal/IVA/total.

### Fix aplicado (FIX 540, commit ver git log)
1. **Header `x-user-email`** agregado en los 2 fetches afectados. Patrón: tomar de `localStorage.getItem("userEmail")` (mismo patrón que ya usaban `/api/requisicion/extraer` y `/api/requisicion`).
2. **Campo `precio_unitario:number`** agregado al estado `combRows`. Grid pasa de 5 a 7 columnas: tipo / litros / $/litro / subtotal-linea / unidad destino / tipo unidad / borrar. Validación: `precio_unitario > 0` exigido al submit.
3. **Cálculo subtotal** actualizado: `subtotalComb = sum(litros × precio_unitario)`. El bloque "RESUMEN PARTIDAS" suma combustibles correctamente. Total con IVA funciona.
4. **Materiales serializados** al backend incluyen `precio_unitario` Y `price` (campo estructurado, no solo en comments) para que el endpoint de creación lo persista en la columna real de `purchase_orders_items` / `requisitions_items`.

### Patrón sistémico a NO repetir
Cuando migres un endpoint a `requireUser` estricto:
1. `grep -rn "fetch.*api/{endpoint}" app/ src/` para listar callers.
2. Auditar CADA caller. Si no manda `x-user-email`, agregarlo.
3. Smoke test curl SIN header → debe 401.
4. Smoke test curl CON header → debe 200.
5. Smoke test browser autenticado → debe funcionar (NO basta con curl).
6. NO declarar el sweep "cerrado" sin paso 5 verificado.

### Patrón de UI para inputs con monto
Cuando crees una "línea de captura" (combustible, materiales, partidas libres) que después necesita ir a pago:
1. Incluir campo de monto/precio desde el día 1.
2. Mostrar subtotal por línea (preview visual evita errores de captura).
3. Sumar al subtotal global del formulario.
4. Validar > 0 al submit (no permitir partidas con monto 0 si afecta pago).
5. Persistir el precio en columna estructurada del backend, NO solo en comments.

### Archivos modificados
- `app/dashboard/requisiciones/requisiciones/nuevo/page.tsx` (9 deltas)

### Validación E2E pendiente
- Daisy puede buscar proveedor en producción
- Daisy puede capturar monto/litro en combustible
- Subtotal/IVA/Total se calculan correctamente
- Requisición se crea con `precio_unitario` poblado
- Endpoint `/api/requisicion` recibe `materiales[].precio_unitario` y persiste en BD

### Owner cierre
JJ valida con Daisy/Jessica después del deploy.
