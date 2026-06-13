# ANTIPATRONES JSX/TSX — ARIA27

## Por qué este archivo existe

13-Jun-2026: un `->` literal dentro de un `<p>` en `app/dashboard/obras/catalogo/page.tsx`
rompió el parser TSX (error TS1382). El CI no lo detectó porque tenía `continue-on-error: true`.
Vercel falló 3 deploys consecutivos. Producción quedó 5 commits atrás durante 2 horas.

## Reglas duras

Dentro de texto JSX (no dentro de `{...}`), están **PROHIBIDOS** estos caracteres literales:

| Carácter | Causa | Alternativa segura |
|---|---|---|
| `>` | Confunde con cierre de tag | `&gt;`, `{'>'}`, palabras |
| `<` | Confunde con apertura de tag | `&lt;`, `{'<'}`, palabras |
| `->` | Confunde con cierre por TS1382 | "luego", `→` (Unicode), `&rarr;` |
| `<-` | Mismo problema | "regresa a", `←`, `&larr;` |
| `=>` | Riesgo de confusión | "implica", `⇒` |
| `<=` | Riesgo en parser | "menor o igual", `≤` |
| `>=` | Riesgo en parser | "mayor o igual", `≥` |
| `&&` | Generalmente safe pero buena práctica escapar | "y" o `{'&&'}` |
| `}` | Cierra expression | `{'}'}` |
| `{` | Abre expression | `{'{'}` |

## Patrón correcto

```tsx
// MAL
<p>Tip: clic derecho -> "Que hay aqui"</p>

// BIEN (3 opciones)
<p>Tip: clic derecho, luego "Que hay aqui"</p>
<p>Tip: clic derecho &rarr; "Que hay aqui"</p>
<p>Tip: clic derecho {'->'} "Que hay aqui"</p>
```

## Detección automática

El CI ahora corre `npm run typecheck` en modo bloqueante. Si introduces uno de estos
patrones, el push a main fallará en CI antes de llegar a Vercel.

El pre-push hook local en `.githooks/pre-push` también corre typecheck antes de pushear.

## Cómo grep rápido por estos antipatrones

```bash
# Buscar -> literal en JSX text
grep -rEn '>[^<>{}=]*->[^<>{}]*<' --include="*.tsx"

# Buscar < o > suelto en texto entre tags
grep -rEn '<(p|span|div|label|td|th|button|a|h[1-6])[^>]*>[^<]*[<>][^<{}]*</' --include="*.tsx"
```

## Bug histórico documentado

Commit que rompió: `528a72c5` (feat campos lat/lng catalogo obras).
Commit que arregló: `bace3746` (cambió `->` por `luego`).
Lección: incluir typecheck obligatorio antes de push.
