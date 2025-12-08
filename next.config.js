# =======================================================
#    ABRIR next.config.js PARA CORRECCIÓN FINAL
# =======================================================

$RutaNextConfig = ".\next.config.js"

Write-Host "`n[1/2] 🔍 Intentando abrir el archivo next.config.js en VS Code..." -ForegroundColor Cyan

# El comando 'code' abre el archivo en VS Code
code $RutaNextConfig

Write-Host "    ✅ El archivo next.config.js debería haberse abierto ahora." -ForegroundColor Green
Write-Host "`n[2/2] 📝 REEMPLAZA el contenido de ese archivo con el código que te di anteriormente y guárdalo." -ForegroundColor Yellow