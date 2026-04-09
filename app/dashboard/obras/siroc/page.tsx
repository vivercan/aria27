import ModuleFolders from "@/components/ModuleFolders";

export default function SIROCPage() {
  return (
    <ModuleFolders
      titulo="SIROC"
      descripcion="Registro IMSS de obras · organiza avisos, incidencias y reportes por carpetas"
      backHref="/dashboard/obras"
      scope="obras:siroc"
    />
  );
}
