# Lección aprendida — 13-Jun-2026

## Título del error
TS1382 `->` literal en JSX rompió 3 deploys Vercel silenciosamente

## Tipo de error
Parser TSX bloqueado por carácter ambiguo + CI con typecheck no bloqueante = falla silenciosa de deploy

## Dónde ocurrió
`app/dashboard/obras/catalogo/page.tsx` línea 321 — texto descriptivo en `<p>` con
`Tip: clic derecho en Google Maps -> "Que hay aqui" -> copia los 2 numeros`

## Causa raíz (dos niveles)
1. **Inmediata**: `->` literal en texto JSX confunde al parser TS (error TS1382).
2. **Estructural**: el CI workflow tenía `continue-on-error: true` en el step de typecheck.
   El error pasó verde en GitHub Actions pero rompió Vercel build. Producción quedó
   5 commits atrás durante ~2 horas sin alerta.

## Cómo se detectó
JJ reportó "ya quedó" no se reflejaba en pantalla. Investigación via GitHub Deployments API
mostró 3 deployments en estado `failure`. Inspección local con `npx tsc --noEmit` reveló
el TS1382 inmediatamente.

## Cómo se corrigió
1. Cambio `->` por palabra "luego" en commit `bace3746`.
2. CI cambiado: typecheck ahora es step **bloqueante**.
3. Agregado step `npx next build` como espejo del build de Vercel.
4. Pre-push hook `.githooks/pre-push` corre typecheck antes de cada push.
5. Script `prepare` activa `core.hooksPath` para todos los clones nuevos.

## Cómo evitar que se repita
- CI typecheck bloqueante (ya activo).
- Pre-push hook local (ya activo via `npm install` ejecuta prepare).
- `docs/ANTIPATRONES_JSX.md` con lista de patrones prohibidos.
- `npm run precheck` corre typecheck + tests antes de push manual.

## Archivos afectados (creados / modificados como blindaje)
- `.github/workflows/ci.yml` — typecheck bloqueante + next build dry-run
- `.githooks/pre-push` — hook local
- `package.json` — scripts `prepare` + `precheck`
- `docs/ANTIPATRONES_JSX.md` — patrones prohibidos
- `docs/LECCIONES_APRENDIDAS/2026-06-13-ts1382-vercel-silencioso.md` — este archivo

## Patrón prohibido desde hoy
1. `->`, `<-`, `=>`, `<=`, `>=` literales dentro de texto JSX (no dentro de `{...}`)
2. CI workflow steps con `continue-on-error: true` en typecheck o build
3. Push directo a main sin validar typecheck local

## Regla nueva para futuras tareas
**REGLA-13JUN-001**: cualquier modificación a un componente .tsx que agregue
texto descriptivo debe verificarse con `npm run typecheck` antes de commit.
Si el commit es no-trivial (más de 5 líneas o más de 1 archivo), correr `npm run precheck`.

## Validación
- `npx tsc --noEmit` en main = 0 errores
- Vercel deploy `a613fa2e` = success
- Bundle servido `dpl_4dXBGgwzrHBVhgazA4FXHyVWsXxb` con todos los fixes promovidos
