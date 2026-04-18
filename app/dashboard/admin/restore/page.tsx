"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DatabaseBackup,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  HardDrive,
  Server,
} from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

const ALLOWED_EMAILS = [
  "juanviverosv@gmail.com",
  "recursos.humanos@gcuavante.com",
];

interface TableResult {
  tabla: string;
  status: "ok" | "skip" | "error";
  rows: number;
  message?: string;
}

interface RestoreResult {
  date: string;
  completadoEn: string;
  tables: {
    total: number;
    ok: number;
    skip: number;
    error: number;
    totalRows: number;
    detalle: TableResult[];
  };
  storage?: { skipped?: boolean };
}

export default function RestorePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [includeStorage, setIncludeStorage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Verificar identidad del usuario
  useEffect(() => {
    const email = localStorage.getItem("userEmail") || sessionStorage.getItem("userEmail") || "";
    setUserEmail(email);
    setAuthorized(ALLOWED_EMAILS.includes(email));
  }, []);

  const fetchDates = useCallback(async () => {
    if (!userEmail) return;
    setLoadingDates(true);
    try {
      const res = await fetch("/api/backup/restore", {
        headers: { "x-user-email": userEmail },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAvailableDates(data.dates || []);
        if (data.dates?.length > 0) setSelectedDate(data.dates[0]);
      }
    } catch {
      // silencioso
    } finally {
      setLoadingDates(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (authorized) fetchDates();
  }, [authorized, fetchDates]);

  const handleRestore = async () => {
    if (!selectedDate || !userEmail || !confirmed) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        body: JSON.stringify({ date: selectedDate, includeStorage }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Error desconocido");
      } else {
        setResult(data);
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || "Error de conexión");
    } finally {
      setLoading(false);
      setConfirmed(false);
    }
  };

  // ── Pantalla de acceso denegado ────────────────────────────────────────
  if (authorized === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <XCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-xl font-semibold text-red-400">Acceso Denegado</h2>
        <p className="text-gray-400 text-sm">Esta sección es exclusiva del administrador principal.</p>
        {/* EX-6 18-Abr-2026: AriaBackButton canónico */}
        <div className="mt-2"><AriaBackButton /></div>
      </div>
    );
  }

  if (authorized === null) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header — EX-6 18-Abr-2026: AriaBackButton canónico */}
      <div className="flex items-center gap-3">
        <AriaBackButton />
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <DatabaseBackup className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Restaurar Sistema</h1>
            <p className="text-xs text-gray-400">Punto de restauración — Solo administrador principal</p>
          </div>
        </div>
      </div>

      {/* Advertencia */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200 space-y-1">
          <p className="font-semibold">Operación crítica e irreversible</p>
          <p className="text-amber-300/80">
            La restauración sobreescribe los datos actuales con el snapshot seleccionado.
            Úsala solo si el sistema tiene datos corruptos o se eliminó información importante.
          </p>
        </div>
      </div>

      {/* Selector de fecha */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-aria-primary" />
          <h2 className="text-sm font-semibold text-white">Seleccionar snapshot</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Fecha de respaldo</label>
            {loadingDates ? (
              <div className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />
            ) : (
              <select
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setConfirmed(false); setResult(null); }}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-aria-primary"
              >
                {availableDates.length === 0 ? (
                  <option value="">Sin snapshots disponibles</option>
                ) : (
                  availableDates.map((d) => (
                    <option key={d} value={d} className="bg-gray-900">
                      {d} {d === availableDates[0] ? "— más reciente" : ""}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="includeStorage"
              checked={includeStorage}
              onChange={(e) => setIncludeStorage(e.target.checked)}
              className="rounded border-white/[0.12] bg-white/[0.06] text-aria-primary"
            />
            <label htmlFor="includeStorage" className="text-sm text-gray-300 cursor-pointer">
              Incluir archivos de Storage (fotos, documentos, expedientes)
            </label>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-white/[0.04] rounded-lg">
            <input
              type="checkbox"
              id="confirmRestore"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-white/[0.12] bg-white/[0.06] text-red-400 mt-0.5"
            />
            <label htmlFor="confirmRestore" className="text-sm text-gray-300 cursor-pointer leading-snug">
              Confirmo que entiendo que esta operación sobreescribe los datos actuales con el snapshot del{" "}
              <span className="text-white font-semibold">{selectedDate}</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleRestore}
          disabled={!selectedDate || !confirmed || loading}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            !selectedDate || !confirmed || loading
              ? "bg-white/[0.06] text-gray-500 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Restaurando... esto puede tomar 1-2 minutos
            </>
          ) : (
            <>
              <DatabaseBackup className="w-4 h-4" />
              Restaurar snapshot {selectedDate}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 space-y-4">
          {/* Resumen */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <h2 className="text-sm font-semibold text-white">Restauración completada — {result.date}</h2>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Tablas OK", value: result.tables.ok, color: "text-green-400" },
              { label: "Saltadas", value: result.tables.skip, color: "text-gray-400" },
              { label: "Errores", value: result.tables.error, color: "text-red-400" },
              { label: "Registros", value: result.tables.totalRows.toLocaleString(), color: "text-blue-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/[0.04] rounded-lg p-3 text-center">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tablas con error */}
          {result.tables.error > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Tablas con error</p>
              {result.tables.detalle
                .filter((r) => r.status === "error")
                .map((r) => (
                  <div key={r.tabla} className="flex items-start gap-2 text-xs bg-red-500/10 rounded-lg p-2.5">
                    <Server className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-red-300 font-medium">{r.tabla}</span>
                      {r.message && <p className="text-red-400/70 mt-0.5">{r.message}</p>}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Tablas OK (colapsable) */}
          <details className="group">
            <summary className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors">
              <HardDrive className="w-3.5 h-3.5" />
              Ver todas las tablas restauradas ({result.tables.ok})
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
              {result.tables.detalle
                .filter((r) => r.status === "ok")
                .map((r) => (
                  <div key={r.tabla} className="flex items-center justify-between text-xs bg-white/[0.04] rounded px-2.5 py-1.5">
                    <span className="text-gray-300">{r.tabla}</span>
                    <span className="text-green-400">{r.rows.toLocaleString()} filas</span>
                  </div>
                ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
