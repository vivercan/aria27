import { NextResponse, NextRequest } from "next/server";
import { notifyOps } from "@/lib/notify-ops";
import { logger } from "@/lib/logger";

const log = logger("EMPLEADO-NOTIFY-ALTA");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const full_name = String(body.full_name || "").trim();
    const position = String(body.position || "").trim();
    const project_site = String(body.project_site || "").trim();
    const empresa = String(body.empresa || "").trim();
    const actor = String(body.actor || "sistema").trim();
    if (!full_name) return NextResponse.json({ ok: false, error: "full_name requerido" }, { status: 400 });

    await notifyOps({
      evento: "EMPLEADO_ALTA",
      resumen: `${full_name}${position ? " - " + position : ""}${project_site ? " (" + project_site + ")" : ""}`,
      detalle: `Alta de empleado:\nNombre: ${full_name}${position ? "\nPuesto: " + position : ""}${project_site ? "\nObra/Centro: " + project_site : ""}${empresa ? "\nEmpresa: " + empresa : ""}`,
      actor,
      metadata: { full_name, position, project_site, empresa },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    log.error("[EMPLEADO-NOTIFY-ALTA]", e);
    return NextResponse.json({ ok: false, error: (e as Error)?.message || "error" }, { status: 500 });
  }
}
