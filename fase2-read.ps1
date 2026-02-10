Write-Host "=== PAGINAS SOLO-READ - CONTENIDO ===" -ForegroundColor Cyan

$pages = @(
    "activos\asignacion",
    "activos\estado",
    "activos\mantenimiento",
    "finanzas\por-pagar",
    "requisiciones\productos",
    "requisiciones\prospeccion",
    "requisiciones\cotizaciones",
    "talento\checadas",
    "talento\legales"
)

foreach ($p in $pages) {
    $file = "app\dashboard\$p\page.tsx"
    if (Test-Path $file) {
        $lines = (Get-Content $file).Count
        Write-Host "`n--- $p ($lines lineas) ---" -ForegroundColor Yellow
        Get-Content $file | Select-Object -First 15
        Write-Host "  ..." -ForegroundColor Gray
        # Mostrar funciones/handlers
        Select-String -Path $file -Pattern "const \w+ = |function \w+|handleSave|handleSubmit|handleAdd|handleEdit|handleDelete" | ForEach-Object {
            Write-Host "  L$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor White
        }
    } else {
        Write-Host "`n--- $p NO EXISTE ---" -ForegroundColor Red
    }
}
