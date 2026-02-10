# =============================================
# FASE 1: AccessGuard en módulos protegidos
# Un layout.tsx por módulo = protege TODAS sus páginas
# =============================================

# --- FINANZAS ---
@"
"use client";
import AccessGuard from "@/components/AccessGuard";
export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="finanzas">{children}</AccessGuard>;
}
"@ | Set-Content "app\dashboard\finanzas\layout.tsx" -Encoding UTF8
Write-Host "  1. finanzas/layout.tsx" -ForegroundColor Green

# --- ACTIVOS ---
@"
"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ActivosLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="activos">{children}</AccessGuard>;
}
"@ | Set-Content "app\dashboard\activos\layout.tsx" -Encoding UTF8
Write-Host "  2. activos/layout.tsx" -ForegroundColor Green

# --- CONFIGURACION ---
@"
"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="configuracion">{children}</AccessGuard>;
}
"@ | Set-Content "app\dashboard\configuracion\layout.tsx" -Encoding UTF8
Write-Host "  3. configuracion/layout.tsx" -ForegroundColor Green

# --- TALENTO ---
@"
"use client";
import AccessGuard from "@/components/AccessGuard";
export default function TalentoLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="talento">{children}</AccessGuard>;
}
"@ | Set-Content "app\dashboard\talento\layout.tsx" -Encoding UTF8
Write-Host "  4. talento/layout.tsx" -ForegroundColor Green

# --- OBRAS ---
@"
"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ObrasLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="obras">{children}</AccessGuard>;
}
"@ | Set-Content "app\dashboard\obras\layout.tsx" -Encoding UTF8
Write-Host "  5. obras/layout.tsx" -ForegroundColor Green

# --- REQUISICIONES ---
@"
"use client";
import AccessGuard from "@/components/AccessGuard";
export default function RequisicionesLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="requisiciones">{children}</AccessGuard>;
}
"@ | Set-Content "app\dashboard\requisiciones\layout.tsx" -Encoding UTF8
Write-Host "  6. requisiciones/layout.tsx" -ForegroundColor Green

# --- PLANTILLAS ---
@"
"use client";
import AccessGuard from "@/components/AccessGuard";
export default function PlantillasLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="plantillas">{children}</AccessGuard>;
}
"@ | Set-Content "app\dashboard\plantillas\layout.tsx" -Encoding UTF8
Write-Host "  7. plantillas/layout.tsx" -ForegroundColor Green

Write-Host "`n7 layouts de proteccion creados" -ForegroundColor Cyan

# =============================================
# BUILD
# =============================================
Write-Host "`nEjecutando build..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild exitoso" -ForegroundColor Green
    git add .
    git commit -m "security: AccessGuard layouts en 7 modulos - proteccion por URL directa"
    git push
    Write-Host "Deploy iniciado" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "PROTECCION APLICADA:" -ForegroundColor Yellow
    Write-Host "  Finanzas - todas las paginas protegidas" -ForegroundColor White
    Write-Host "  Activos - todas las paginas protegidas" -ForegroundColor White
    Write-Host "  Configuracion - todas las paginas protegidas" -ForegroundColor White
    Write-Host "  Talento - todas las paginas protegidas" -ForegroundColor White
    Write-Host "  Obras - todas las paginas protegidas" -ForegroundColor White
    Write-Host "  Requisiciones - todas las paginas protegidas" -ForegroundColor White
    Write-Host "  Plantillas - todas las paginas protegidas" -ForegroundColor White
    Write-Host ""
    Write-Host "Si Jessica escribe /dashboard/finanzas en la URL = ACCESO RESTRINGIDO" -ForegroundColor Magenta
} else {
    Write-Host "`nError en build - revisa arriba" -ForegroundColor Red
}
