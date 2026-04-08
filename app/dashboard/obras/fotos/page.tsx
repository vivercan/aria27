import ModuleFolders from "@/components/ModuleFolders";

export default function FotosPage() {
  return (
    <ModuleFolders
      titulo="Fotos de Obra"
      descripcion="Galería fotográfica organizada por carpetas (una por obra, fecha o tema)"
      backHref="/dashboard/obras"
      scope="obras:fotos"
    />
  );
}
