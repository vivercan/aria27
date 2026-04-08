import ModuleFolders from "@/components/ModuleFolders";

export default function ConcretoPage() {
  return (
    <ModuleFolders
      titulo="Control de Concreto"
      descripcion="Colados, pruebas de resistencia y bitácora · organiza por obra o por colado en carpetas"
      backHref="/dashboard/obras"
      scope="obras:concreto"
    />
  );
}
