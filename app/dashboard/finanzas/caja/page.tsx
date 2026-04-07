import HiddenStub from "@/components/HiddenStub";

export default function CajaPage() {
  return (
    <HiddenStub
      titulo="Caja"
      modulo="Finanzas"
      hubHref="/dashboard/finanzas"
      motivo="Caja chica no tiene tabla de movimientos ni reglas de arqueo. Hoy los gastos se capturan en Gastos por Obra."
      decision="OCULTA TEMPORAL"
    />
  );
}
