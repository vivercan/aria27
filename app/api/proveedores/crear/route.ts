/**
 * /api/proveedores/crear — POST
 * 24-Nov-2026
 *
 * Pedido de Jessica Rodriguez (Compras):
 *   "sera posible que cuando hacemos las requis tengamos mas accesible el dar
 *    de alta a los proveedores, y no tener que salir atras atras atras"
 *
 * Permite dar de alta un proveedor SIN salir de la pantalla donde estes
 * (Nueva Requisicion, comparativas, etc). Devuelve la fila ya guardada para
 * seleccionarla de inmediato: no hace falta recargar ni F5.
 *
  * Nota: la cookie de sesion es SameSite=Strict, que ya cubre CSRF.
 * Reglas:
 *  - Requiere sesion. Deja rastro en usuario_alta.
 *  - Nombre minimo 3 caracteres y no puede ser solo numeros (REQ-00863).
 *  - Si ya existe uno con el mismo nombre (sin importar mayusculas), lo
 *    devuelve en lugar de duplicar.
 *  - CLABE, si viene, debe ser de 18 digitos.
 *  - Los datos bancarios solo se devuelven a los roles que los pueden ver
 *    (mismo criterio que /api/proveedores/search).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { FORMAS_PAGO, requiereDatosBancarios } from "@/lib/formas-pago";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const log = logger("PROVEEDORES-CREAR");

const ROLES_BANCARIOS = new Set(["admin", "compras", "caja", "finanzas", "director", "owner"]);

// 25-Nov-2026: una sola fuente de verdad para las formas de pago.
const FORMAS = FORMAS_PAGO.map(f => f.valor);

function limpiar(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.res;

    const body = await req.json().catch(() => ({}));
    const nombre = String(body?.name ?? "").trim().replace(/\s+/g, " ");

    if (nombre.length < 3) {
      return NextResponse.json({ ok: false, error: "Escribe el nombre completo del proveedor (al menos 3 letras)." }, { status: 400 });
    }
    if (/^[\d\s.,-]+$/.test(nombre)) {
      return NextResponse.json({ ok: false, error: `"${nombre}" no es un nombre de proveedor. Escribe cómo se llama el negocio.` }, { status: 400 });
    }

    const formaPago = String(body?.payment_method ?? "EFECTIVO").trim().toUpperCase();
    if (!FORMAS.includes(formaPago)) {
      return NextResponse.json({ ok: false, error: `Forma de pago no válida. Usa una de: ${FORMAS.join(", ")}.` }, { status: 400 });
    }

    const clabe = limpiar(body?.bank_clabe)?.replace(/\D/g, "") || null;
    if (clabe && clabe.length !== 18) {
      return NextResponse.json({ ok: false, error: "La CLABE debe tener exactamente 18 dígitos." }, { status: 400 });
    }
    if (requiereDatosBancarios(formaPago) && !clabe) {
      return NextResponse.json({ ok: false, error: "Para pago por transferencia o cheque necesitas la CLABE de 18 dígitos." }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Anti-duplicado: mismo nombre exacto sin importar mayusculas/minusculas.
    const { data: yaExiste } = await db
      .from("suppliers")
      .select("id, name, payment_method, razon_social, bank_name, bank_clabe, bank_account_number, status")
      .ilike("name", nombre)
      .limit(1)
      .maybeSingle();

    if (yaExiste) {
      log.info("ya existia", { nombre, por: auth.email });
      return NextResponse.json({
        ok: true,
        yaExistia: true,
        aviso: `"${yaExiste.name}" ya estaba dado de alta. Lo seleccioné por ti.`,
        proveedor: filtrarBanca(yaExiste, auth.role),
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const fila: Record<string, unknown> = {
      name: nombre,
      payment_method: formaPago,
      razon_social: limpiar(body?.razon_social),
      rfc: limpiar(body?.rfc)?.toUpperCase() || null,
      phone: limpiar(body?.phone),
      email: limpiar(body?.email),
      contact_name: limpiar(body?.contact_name),
      bank_name: limpiar(body?.bank_name),
      bank_clabe: clabe,
      bank_account_number: limpiar(body?.bank_account_number),
      notas_comerciales: limpiar(body?.notas),
      status: "ACTIVO",
      active: true,
      usuario_alta: auth.email || null,
    };

    const { data, error } = await db
      .from("suppliers")
      .insert(fila)
      .select("id, name, payment_method, razon_social, bank_name, bank_clabe, bank_account_number, status")
      .single();

    if (error || !data) {
      log.error("insert fallo", { err: error?.message, nombre });
      return NextResponse.json({ ok: false, error: error?.message || "No se pudo guardar el proveedor." }, { status: 500 });
    }

    log.info("alta", { id: data.id, nombre, por: auth.email });
    return NextResponse.json({
      ok: true,
      yaExistia: false,
      proveedor: filtrarBanca(data, auth.role),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: unknown) {
    log.error("POST error", { e });
    return NextResponse.json({ ok: false, error: (e as { message?: string })?.message || "Error" }, { status: 500 });
  }
}

type Fila = {
  id: string | number;
  name: string;
  payment_method?: string | null;
  razon_social?: string | null;
  bank_name?: string | null;
  bank_clabe?: string | null;
  bank_account_number?: string | null;
  status?: string | null;
};

function filtrarBanca(r: Fila, role?: string | null) {
  const base = {
    id: String(r.id),
    name: r.name,
    payment_method: r.payment_method || null,
    razon_social: r.razon_social || null,
    status: r.status || null,
  };
  if (!ROLES_BANCARIOS.has((role || "").toLowerCase().trim())) {
    return { ...base, bank_name: null, bank_clabe: null, bank_account_number: null };
  }
  return {
    ...base,
    bank_name: r.bank_name || null,
    bank_clabe: r.bank_clabe || null,
    bank_account_number: r.bank_account_number || null,
  };
}
