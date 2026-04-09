import ModuleFolders from "@/components/ModuleFolders";

export default function SuaPage() {
  return (
    <ModuleFolders
      titulo="SUA Finanzas"
      descripcion="Archivos SUA, líneas de captura y acuses · organiza por mes o por centro de costo"
      backHref="/dashboard/finanzas"
      scope="finanzas:sua"
    />
  );
}
