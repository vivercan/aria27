#!/usr/bin/env bash
# ============================================================
# ARIA27 — Security Audit Script v2
# Bloquea patrones peligrosos antes de llegar a producción.
# Corre en CI en cada push/PR. Falla con exit 1 si hay hallazgos.
# ============================================================

set -euo pipefail

ERRORS=0
WARNINGS=0

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ARIA27 Security Audit v2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  echo -e "       ${BOLD}$2${NC}:$3"
  echo -e "       → $4"
  echo ""
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
  echo -e "       ${BOLD}$2${NC}:$3"
  echo ""
  WARNINGS=$((WARNINGS + 1))
}

# ── REGLA 1: res.json() sin .catch() ─────────────────────────
# Busca SOLO en archivos de componentes/páginas (app/dashboard)
# Las API routes tienen sus propios try/catch globales
echo "▸ Regla 1 — res.json() sin .catch() (páginas cliente)"
HITS=$(grep -rn "await [a-zA-Z_][a-zA-Z0-9_]*\.json()" app/dashboard app/page.tsx \
  --include="*.ts" --include="*.tsx" \
  | grep -v "\.catch" \
  | grep -v "node_modules" \
  | grep -v "\.next/" \
  2>/dev/null || true)

if [ -n "$HITS" ]; then
  while IFS=: read -r file line content; do
    fail "res.json() sin .catch() — crash visible al usuario si body vacío" \
         "$file" "$line" "Cambia a: res.json().catch(() => ({}))"
  done <<< "$HITS"
else
  echo -e "  ${GREEN}✓ Sin hallazgos${NC}"
fi
echo ""

# ── REGLA 2: JSON.parse() sin try/catch (análisis profundo) ──
echo "▸ Regla 2 — JSON.parse() sin try/catch (análisis de contexto)"
python3 - <<'PYEOF'
import re, sys, os, glob

files = glob.glob("app/**/*.ts", recursive=True) + glob.glob("app/**/*.tsx", recursive=True)
files = [f for f in files if ".next/" not in f and "node_modules" not in f]

errors = []

for filepath in files:
    try:
        with open(filepath) as f:
            lines = f.readlines()
    except Exception:
        continue

    for i, line in enumerate(lines):
        if "JSON.parse(" not in line:
            continue
        code = line.strip()
        # Skip comments
        if code.startswith("//") or code.startswith("*"):
            continue
        # Skip safe patterns: JSON.parse with || fallback
        if re.search(r"JSON\.parse\([^)]*\|\|", line):
            continue
        # Skip: inside ternary with null check (jsonMatch ? JSON.parse...)
        if re.search(r"\?\s*JSON\.parse", line):
            continue

        # Check if inside try/catch by scanning whole function up to 200 lines back
        context_start = max(0, i - 200)
        context = lines[context_start:i]
        context_text = "".join(context)

        # Count open try blocks vs catch blocks
        try_opens = len(re.findall(r'\btry\s*\{', context_text))
        catch_closes = len(re.findall(r'\}\s*catch\s*[\(\{]', context_text))

        if try_opens > catch_closes:
            continue  # Inside a try block — protected

        errors.append(f"  FAIL|{filepath}|{i+1}|{code[:80]}")

if errors:
    for e in errors:
        _, fp, ln, code = e.split("|", 3)
        print(f"\033[0;31m[FAIL]\033[0m JSON.parse() sin try/catch")
        print(f"       \033[1m{fp}\033[0m:{ln}")
        print(f"       → {code}")
        print(f"       → Envuelve en: try {{ JSON.parse(...) }} catch {{ return error_response }}")
        print()
    sys.exit(len(errors))
else:
    print(f"  \033[0;32m✓ Sin hallazgos\033[0m")
    sys.exit(0)
PYEOF
JSON_EXIT=$?
ERRORS=$((ERRORS + JSON_EXIT))
echo ""

# ── REGLA 3: Emails operacionales hardcodeados en acciones ───
echo "▸ Regla 3 — Emails hardcodeados en acciones de escritura"
HARDCODED_EMAILS=(
  "autorizador@gcuavante.com"
  "compras@gcuavante.com"
  "direccion@gcuavante.com"
)
FOUND_EMAIL=false

for email in "${HARDCODED_EMAILS[@]}"; do
  HITS=$(grep -rn "\"${email}\"" app/ \
    --include="*.ts" --include="*.tsx" \
    | grep -v "node_modules" \
    | grep -v "\.next/" \
    | grep -v "ALLOWED_EMAILS\|ADMIN_EMAILS\|RESTORE_EMAILS\|//" \
    2>/dev/null || true)

  if [ -n "$HITS" ]; then
    FOUND_EMAIL=true
    while IFS=: read -r file line content; do
      fail "Email operacional hardcodeado '$email'" \
           "$file" "$line" "Usa localStorage.getItem('userEmail') en su lugar"
    done <<< "$HITS"
  fi
done

if [ "$FOUND_EMAIL" = false ]; then
  echo -e "  ${GREEN}✓ Sin hallazgos${NC}"
fi
echo ""

# ── REGLA 4: localStorage sin null-check en JSON.parse ───────
echo "▸ Regla 4 — JSON.parse(localStorage.getItem()) sin fallback"
HITS=$(grep -rn "JSON\.parse(localStorage\.getItem(" app/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules" \
  | grep -v "\.next/" \
  | grep -v "|| '{}'\||| '\[\]'\||| ''" \
  2>/dev/null || true)

if [ -n "$HITS" ]; then
  while IFS=: read -r file line content; do
    fail "JSON.parse(localStorage.getItem()) crashea si el valor es null" \
         "$file" "$line" "Usa: JSON.parse(localStorage.getItem('key') || '{}')"
  done <<< "$HITS"
else
  echo -e "  ${GREEN}✓ Sin hallazgos${NC}"
fi
echo ""

# ── RESULTADO FINAL ───────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}✅  Audit limpio — 0 errores, 0 advertencias${NC}"
elif [ "$ERRORS" -eq 0 ]; then
  echo -e "${YELLOW}⚠️   Audit: 0 errores, ${WARNINGS} advertencias${NC}"
else
  echo -e "${RED}❌  Audit fallido — ${ERRORS} error(es)${NC}"
  echo "    Corrige antes de hacer merge."
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $([[ "$ERRORS" -gt 0 ]] && echo 1 || echo 0)
