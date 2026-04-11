/**
 * Tipos compartidos derivados del esquema Supabase de ARIA27.
 * Centraliza las interfaces que reemplazan `: any` en el codebase.
 *
 * Convención:
 *   - Prefijo Db* = fila tal como sale de Supabase (snake_case)
 *   - Sin prefijo  = tipo de dominio transformado (camelCase o mixto)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Supabase client alias ───────────────────────────────
export type SB = SupabaseClient;

// ─── Requisiciones / Cotizaciones ────────────────────────

export interface DbRequisition {
  id: string;
  folio: string;
  status: string;
  cost_center_name: string;
  created_at: string;
  created_by: string;
  authorization_comments?: string | null;
  cotizacion_data?: CotizacionData | null;
  approved_by?: string | null;
  obra_nombre?: string;
}

export interface CotizacionData {
  suppliers?: CotSupplier[];
  quotes?: CotQuote[];
  items?: string[];
  items_detail?: CotItemDetail[];
  obra?: string;
  folio?: string;
}

export interface CotSupplier {
  supplier: string;
  items_prices?: Record<string, number>;
  tax_rate?: number;
  advance_percentage?: number;
  advance_amount?: number;
  rebaja_iva?: boolean;
  observaciones?: string;
  entrega?: string;
  forma_pago?: string;
  factura?: boolean;
}

export interface CotSupplierComputed extends CotSupplier {
  subtotal: number;
  iva: number;
  total: number;
}

export interface CotQuote {
  supplier: string;
  subtotal?: number;
  total?: number;
  tax_rate?: number;
  iva?: number;
  advance_percentage?: number;
  advance_amount?: number;
  entrega?: string;
  forma_pago?: string;
  factura?: boolean;
  notas?: string;
}

export interface CotItemDetail {
  product_name: string;
  quantity: number;
  unit?: string;
}

// ─── Órdenes de Compra ───────────────────────────────────

export interface DbPurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  total: number;
  status: string;
  created_at: string;
  obra_nombre?: string;
  monto_pagado?: number;
}

// ─── Nómina ──────────────────────────────────────────────

export interface DbNominaHistorico {
  empleado_nombre: string;
  semana: number;
  anio: number;
  neto_pagar: number;
  sueldo_neto?: number;
  status: string;
  obra?: string;
}

// ─── Cobros / Cobranza ───────────────────────────────────

export interface DbCobroManual {
  id: string;
  folio: string;
  fecha: string;
  monto: number;
  saldo?: number;
  cliente_nombre: string;
  estatus: string;
  obra_nombre?: string;
  created_at?: string;
}

// ─── Presupuestos ────────────────────────────────────────

export interface DbPresupuestoPartida {
  id?: string;
  obra_nombre: string;
  categoria: string;
  concepto?: string;
  cantidad?: number;
  precio_unitario?: number;
  monto: number;
  importe?: number;
}

// ─── Avance Físico ───────────────────────────────────────

export interface DbObraAvance {
  id?: string;
  obra_nombre: string;
  semana_iso: string;
  porcentaje_avance: number;
}

// ─── Bitácora de Obra ────────────────────────────────────

export interface DbBitacoraObra {
  id?: string;
  obra_nombre: string;
  fecha: string;
  clima?: string;
  personal_en_obra?: number;
  actividades?: string;
  incidentes?: string;
}

// ─── Alertas ─────────────────────────────────────────────

export interface Alerta {
  id: string;
  tipo: "URGENTE" | "ATENCION" | "INFO";
  modulo: string;
  titulo: string;
  detalle: string;
  link?: string;
  fecha: string;
}

// ─── Conciliación Bancaria ───────────────────────────────

export interface DbMovimientoBancario {
  id: string;
  banco: string;
  monto: number;
  fecha_movimiento: string;
  concepto: string;
  status_match?: string;
}

// ─── Inventario ──────────────────────────────────────────

export interface DbInventarioRecord {
  id: string;
  obra_nombre: string;
  producto_nombre: string;
  cantidad_disponible: number;
  unidad: string;
}

// ─── Cotizaciones a Cliente ──────────────────────────────

export interface DbCotizacionCliente {
  id: string;
  folio: string;
  cliente_nombre: string;
  total: number;
  fecha_vencimiento: string;
  status: string;
}

// ─── Asistencias ─────────────────────────────────────────

export interface DbAsistencia {
  id?: string;
  employee_id: string;
  hora_entrada?: string;
  hora_salida?: string;
  fecha?: string;
  obra_nombre?: string;
  tipo?: string;
}

// ─── Préstamos ───────────────────────────────────────────

export interface DbPrestamo {
  id: string;
  employee_id: string;
  monto: number;
  descuento_semanal: number;
  saldo: number;
  status?: string;
}

// ─── Configuración (catálogos) ───────────────────────────

export interface DbConfigItem {
  id?: string;
  clave: string;
  valor: string;
  descripcion?: string;
}

// ─── Usuarios ────────────────────────────────────────────

export interface DbUser {
  id?: string;
  email: string;
  role: string;
  name: string;
  phone?: string;
  active?: boolean;
  permissions?: Record<string, boolean>;
}

// ─── Excel helpers (typed ObraData) ──────────────────────

export interface ObraDataTyped {
  partidas: DbPresupuestoPartida[];
  requisitions: Pick<DbRequisition, "id" | "folio" | "status" | "created_at">[];
  ocs: Pick<DbPurchaseOrder, "po_number" | "supplier_name" | "total" | "status" | "created_at">[];
  nomina: DbNominaHistorico[];
  cobros: Pick<DbCobroManual, "folio" | "fecha" | "monto" | "cliente_nombre" | "estatus">[];
  avances: DbObraAvance[];
  bitacora: DbBitacoraObra[];
}

// ─── Genérico sumador ────────────────────────────────────

export type SumKey<T> = keyof {
  [K in keyof T as T[K] extends number | undefined ? K : never]: T[K];
};
