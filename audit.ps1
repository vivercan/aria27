Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  AUDITORIA: CRUD + CARGA MASIVA + PERMISOS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "`n=== 1. CRUD POR PAGINA ===" -ForegroundColor Yellow
Get-ChildItem -Path "app\dashboard" -Recurse -Filter "page.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $path = $_.FullName.Replace((Get-Location).Path + "\app\dashboard\", "").Replace("\page.tsx", "")
    $lines = (Get-Content $_.FullName).Count
    $hasSelect = $content -match '\.from\('
    $hasInsert = $content -match '\.insert\('
    $hasUpdate = $content -match '\.update\('
    $hasDelete = $content -match '\.delete\('
    $hasFetch = $content -match 'fetch\s*\('
    $hasForm = $content -match 'handleSubmit|onSubmit|handleSave'
    $ops = @()
    if ($hasSelect) { $ops += "R" }
    if ($hasInsert) { $ops += "C" }
    if ($hasUpdate) { $ops += "U" }
    if ($hasDelete) { $ops += "D" }
    if ($hasFetch) { $ops += "API" }
    $opsStr = if ($ops.Count -gt 0) { $ops -join "," } else { "NADA" }
    $hasWrite = $hasInsert -or $hasUpdate -or $hasDelete -or ($hasFetch -and $hasForm)
    if ($lines -lt 50) {
        Write-Host "  MENU  $path" -ForegroundColor Gray
    } elseif (-not $hasSelect -and -not $hasFetch) {
        Write-Host "  LOCAL $path [$opsStr]" -ForegroundColor Yellow
    } elseif ($hasWrite) {
        Write-Host "  CRUD  $path [$opsStr]" -ForegroundColor Green
    } else {
        Write-Host "  SOLO-READ $path [$opsStr]" -ForegroundColor Red
    }
}

Write-Host "`n=== 2. CARGA MASIVA ===" -ForegroundColor Yellow
$found = $false
Get-ChildItem -Path "app\dashboard" -Recurse -Filter "page.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $path = $_.FullName.Replace((Get-Location).Path + "\app\dashboard\", "").Replace("\page.tsx", "")
    if ($content -match 'FileReader|readAsArrayBuffer|Papa\.parse|XLSX|carga.*masiva|bulk|importar') {
        Write-Host "  SI $path" -ForegroundColor Green
        $found = $true
    }
}
if (-not $found) { Write-Host "  NINGUNA pagina tiene carga masiva" -ForegroundColor Red }

Write-Host "`n=== 3. PERMISOS POR ROL ===" -ForegroundColor Yellow
$layoutContent = Get-Content "app\dashboard\layout.tsx" -Raw
if ($layoutContent -match 'role|permissions|userRole|isAdmin') {
    Write-Host "  Layout SI verifica roles" -ForegroundColor Green
} else {
    Write-Host "  Layout NO verifica roles" -ForegroundColor Red
}
$pc = 0
Get-ChildItem -Path "app\dashboard" -Recurse -Filter "page.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $path = $_.FullName.Replace((Get-Location).Path + "\app\dashboard\", "").Replace("\page.tsx", "")
    if ($content -match '\brole\b|\brol\b|\bpermissions\b|\bisAdmin\b|\buserRole\b') {
        Write-Host "  ROL $path" -ForegroundColor Green
        $pc++
    }
}
Write-Host "  Total paginas con control de rol: $pc" -ForegroundColor White

Write-Host "`n=== 4. SIDEBAR ===" -ForegroundColor Yellow
$sb = Get-Content "components\dashboard\Sidebar.tsx" -Raw
if ($sb -match 'role|permissions|userRole') {
    Write-Host "  Sidebar SI filtra por rol" -ForegroundColor Green
} else {
    Write-Host "  Sidebar muestra TODO a TODOS" -ForegroundColor Red
}

Write-Host "`n=== 5. LOCALSTORAGE KEYS ===" -ForegroundColor Yellow
$keys = @()
Get-ChildItem -Path "app" -Recurse -Include "*.tsx","*.ts" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $ms = [regex]::Matches($content, 'localStorage\.(getItem|setItem)\s*\(\s*["'']([^"'']+)["'']')
    foreach ($m in $ms) { $keys += $m.Groups[2].Value }
}
$keys | Sort-Object -Unique | ForEach-Object { Write-Host "    $_" -ForegroundColor White }

Write-Host "`n=== 6. EXPORT ===" -ForegroundColor Yellow
Get-ChildItem -Path "app\dashboard" -Recurse -Filter "page.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $path = $_.FullName.Replace((Get-Location).Path + "\app\dashboard\", "").Replace("\page.tsx", "")
    if ($content -match 'Blob|download|api/export|api/nomina/export') {
        Write-Host "  EXPORT $path" -ForegroundColor Green
    }
}

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  FIN AUDITORIA" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
