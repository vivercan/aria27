// src/lib/auth-api.ts — Middleware de autenticación para API routes
// Patrón: El frontend envía user_email en body/params, el middleware
// lo valida contra la tabla Users y verifica el rol.
// TODO: Migrar a Supabase Auth con JWT cuando esté listo.
//
// HARDENING (5/Abr/2026):
// - Logging estructurado de intentos fallidos para auditoría
// - Validación de email con formato básico
// - Contador de fallos por email para detección de brute-force

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("AUTH-API");

// Tracker en memoria de intentos fallidos por email (protección brute-force)
const failedAttempts = new Map<string, { count: number; firstAt: number }>();
const MAX_FAILED_ATTEMPTS = 10;
const FAILED_WINDOW_MS = 10 * 60 * 1000; // 10 minutos

function recordFailedAttempt(email: string): boolean {
  const now = Date.now();
  const entry = failedAttempts.get(email);
  if (!entry || now - entry.firstAt > FAILED_WINDOW_MS) {
    failedAttempts.set(email, { count: 1, firstAt: now });
    return false;
  }
  entry.count++;
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function clearFailedAttempts(email: string) {
  failedAttempts.delete(email);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface AuthResult {
  authorized: boolean;
  user?: {
    email: string;
    role: string;
    name: string;
    phone?: string;
  };
  error?: string;
}

/**
 * Valida que el usuario existe en la tabla Users y tiene uno de los roles permitidos.
 * @param userEmail - Email del usuario (viene del frontend via body o query param)
 * @param allowedRoles - Array de roles permitidos. Si vacío, cualquier usuario autenticado pasa.
 * @returns AuthResult con usuario validado o error
 */
export async function validateApiAuth(
  userEmail: string | null | undefined,
  allowedRoles: string[] = []
): Promise<AuthResult> {
  if (!userEmail) {
    log.warn("Auth: user_email ausente");
    return { authorized: false, error: "user_email requerido" };
  }

  // Validación de formato
  if (!isValidEmail(userEmail)) {
    log.warn("Auth: email con formato inválido", { email: userEmail });
    return { authorized: false, error: "Formato de email inválido" };
  }

  // Protección brute-force
  const blocked = failedAttempts.get(userEmail);
  if (blocked && blocked.count >= MAX_FAILED_ATTEMPTS && Date.now() - blocked.firstAt < FAILED_WINDOW_MS) {
    log.warn("Auth: email bloqueado por intentos fallidos", { email: userEmail, count: blocked.count });
    return { authorized: false, error: "Demasiados intentos fallidos. Intenta en unos minutos." };
  }

  const { data: user, error } = await supabase
    .from("Users")
    .select("email, role, name, phone")
    .eq("email", userEmail)
    .single();

  if (error || !user) {
    const limitReached = recordFailedAttempt(userEmail);
    log.warn("Auth: usuario no encontrado", { email: userEmail, limitReached });
    return { authorized: false, error: "Usuario no encontrado en el sistema" };
  }

  // Admin siempre tiene acceso
  if (user.role === "admin") {
    clearFailedAttempts(userEmail);
    return { authorized: true, user };
  }

  // Si no se especifican roles, cualquier usuario autenticado pasa
  if (allowedRoles.length === 0) {
    clearFailedAttempts(userEmail);
    return { authorized: true, user };
  }

  // Verificar que el rol del usuario está en la lista de permitidos
  if (!allowedRoles.includes(user.role)) {
    log.warn("Auth: rol no autorizado", { email: userEmail, role: user.role, required: allowedRoles });
    return {
      authorized: false,
      error: `Rol '${user.role}' no autorizado. Se requiere: ${allowedRoles.join(", ")}`,
    };
  }

  clearFailedAttempts(userEmail);
  return { authorized: true, user };
}

/**
 * Helper para extraer user_email de body JSON o query params
 */
export function extractUserEmail(req: NextRequest, body?: any): string | null {
  // 1. Intentar del body
  if (body?.user_email) return body.user_email;

  // 2. Intentar del query param
  const emailParam = req.nextUrl.searchParams.get("user_email");
  if (emailParam) return emailParam;

  // 3. Intentar del header custom
  const emailHeader = req.headers.get("x-user-email");
  if (emailHeader) return emailHeader;

  return null;
}

/**
 * Respuesta estándar de error de autenticación
 */
export function unauthorizedResponse(message: string = "No autorizado"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Valida que un usuario existe en la tabla Users sin cambiar la lógica de roles.
 * Este helper es para backend validation de API requests que usan x-user-email header.
 * @param userEmail - Email del usuario a validar
 * @returns Usuario {email, role} si existe, null si no
 */
export async function validateApiUser(
  userEmail: string | null | undefined
): Promise<{ email: string; role: string } | null> {
  if (!userEmail) {
    return null;
  }

  if (!isValidEmail(userEmail)) {
    return null;
  }

  try {
    const sb = getSupabaseAdmin();
    const { data: user, error } = await sb
      .from("Users")
      .select("email,role")
      .eq("email", userEmail)
      .maybeSingle();

    if (error || !user) {
      return null;
    }

    return { email: user.email, role: user.role };
  } catch (err) {
    log.error("validateApiUser: error al consultar BD", { email: userEmail, error: err });
    return null;
  }
}
