import ModuleFolders from "@/components/ModuleFolders";

export default function MantenimientoPage() {
  return (
    <ModuleFolders
      titulo="Mantenimiento de Activos"
      descripcion="Bitácoras, servicios, facturas de taller · organiza por activo o tipo de servicio"
      backHref="/dashboard/activos"
      scope="activos:mantenimiento"
    />
  );
}
