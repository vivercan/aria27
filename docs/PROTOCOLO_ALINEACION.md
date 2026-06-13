# PROTOCOLO DE ALINEACIÓN ARIA27 — FUENTE DE VERDAD

> Ningún cambio se considera cerrado hasta estar alineado en GitHub, Vercel, Supabase, Notion y ARIA27 en vivo validado en Chrome, o hasta documentar claramente por qué alguna fuente queda pendiente, quién la desbloquea y cómo se valida después.

## Las 6 fuentes de verdad

| Fuente | Qué controla | Cómo se valida | Acción si se desfasa |
|---|---|---|---|
| **GitHub main** | Código fuente canónico | `git rev-parse origin/main` vs `git rev-parse HEAD` | Pull / merge / push |
| **Local Claude CoWork** | Working tree y commits no pusheados | `git status --short` + `git log origin/main..HEAD` | Push / commit faltantes |
| **Vercel Production** | Bundle servido en aria.jjcrm27.com | `curl https://aria.jjcrm27.com/ \| grep dpl_` + `GET /repos/vivercan/aria27/deployments/$LATEST/statuses` | Verificar build status, si failure → arreglar y push |
| **Supabase real** | Datos en BD productivos | Supabase MCP `execute_sql` o leer via pantalla maestros/centros en Chrome | UPDATE / INSERT directo via MCP o via UI |
| **Notion ARIA27v2** | Bitácora, decisiones, canon documental | Notion MCP `notion-fetch` del doc maestro `32c9d35958f1816c882ecd6c8e0fbe8f` | `notion-create-pages` o `notion-update-page` |
| **ARIA27 en Chrome** | Funcionalidad real para usuarios | Chrome MCP `javascript_tool` + reload con cache-bust `?_v=Date.now()` | Validar persistencia tras reload |

## Cómo detectar desfase

1. **GitHub main vs Vercel production**: comparar SHA de main contra commit del bundle servido. Si `dpl_` distinto del último deploy success → desfase.
2. **Vercel: build failure vs success**: cuando aparece estado `failure` en `/repos/vivercan/aria27/deployments/$ID/statuses`, todos los commits posteriores heredarán el bundle viejo. **Buscar el commit que rompió el build y arreglarlo.**
3. **Supabase vs Chrome**: la pantalla `/dashboard/configuracion/maestros/centros` lee directo de BD. Si la pantalla muestra coord X pero BD tiene Y → schema cache stale (forzar `NOTIFY pgrst, 'reload schema'`).
4. **Notion vs realidad**: Notion documenta intención, código documenta realidad. Si contradicen → código gana, Notion se actualiza.
5. **Local vs main**: `git status --short` debe estar limpio antes de declarar cierre.

## Reglas duras

- **No cerrar fix sin ver el bundle nuevo servido**: validar `dpl_*` cambió tras push.
- **No marcar tarea completa con fix en vivo via JS injection** sin commit equivalente en código.
- **Build failure silencioso**: cuando Vercel deploy queda en `failure`, **revisar TS strict + JSX parser errors** primero. El `->` literal en JSX es trampa conocida (TS1382).
- **Antes de declarar bloqueo humano**: agotar Notion search + grep repo + git log all branches + chats Notion + auditorías históricas.
- **Coords reales solo desde fuente verificable**: pin Google Maps de equipo físico, NO inventar desde OSM/Photon.

## Matriz de validación post-cambio

```
[ ] git push → main SHA actualizado
[ ] CI verde (lint + typecheck + test)
[ ] Vercel deploy status = success (curl /repos/.../deployments/$ID/statuses)
[ ] Bundle aria.jjcrm27.com cambió (grep dpl_ en HTML)
[ ] Chrome MCP: reload pantalla + screenshot/JS check
[ ] Supabase MCP: SELECT campos críticos
[ ] Notion: página de bitácora creada/actualizada
[ ] Working tree limpio (git status)
```

## Bug histórico documentado

**13-Jun-2026**: Cadena de 3 deploys Vercel en `failure` por TS1382 (`->` literal en string JSX del catálogo de obras). Causa que producción quedó 5 commits atrás del main. Fix: cambiar `->` por `luego` en commit `bace3746`. Lección: **incluir typecheck local antes de push siempre**, especialmente cuando agrego texto descriptivo en componentes.
