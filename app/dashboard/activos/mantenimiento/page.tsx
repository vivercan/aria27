import HiddenStub from "@/components/HiddenStub";

export default function MantenimientoPage() {
  return (
    <HiddenStub
      titulo="Mantenimiento"
      modulo="Activos"
      hubHref="/dashboard/activos"
      motivo="Mantenimiento de activos no tiene tabla de servicios programados ni historial. Pendiente de definir periodicidad, responsables y bitácora."
      decision="OCULTA TEMPORAL"
    />
  );
}
