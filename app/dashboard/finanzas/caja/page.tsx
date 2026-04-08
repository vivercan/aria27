import ModuleFolders from "@/components/ModuleFolders";

export default function CajaPage() {
  return (
    <ModuleFolders
      titulo="Caja Chica"
      descripcion="Comprobantes, vales y reposiciones · organiza por semana o responsable en carpetas"
      backHref="/dashboard/finanzas"
      scope="finanzas:caja"
    />
  );
}
