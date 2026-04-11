#!/bin/bash
# Genera tipos TypeScript automáticos del schema de Supabase.
# Requisitos: npm install --save-dev supabase
# Uso:       npx supabase login   (una sola vez)
#            bash scripts/gen-types.sh

set -euo pipefail

PROJECT_ID="yhylkvpynzyorqortbkk"
OUTPUT="src/types/supabase.ts"

echo "🔄 Generando tipos desde Supabase proyecto $PROJECT_ID..."
mkdir -p "$(dirname "$OUTPUT")"

npx supabase gen types typescript \
  --project-id "$PROJECT_ID" \
  > "$OUTPUT"

echo "✅ Tipos generados en $OUTPUT"
echo "   Líneas: $(wc -l < "$OUTPUT")"
echo ""
echo "Siguiente paso: reemplazar 'any' en export/route.ts con Database types"
