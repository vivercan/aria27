"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { uploadAndInsert, buildPath } from "@/lib/storage";
import {
  ArrowLeft, Upload, FileText, Search, Loader2, FolderOpen,
  Download, Trash2, Eye, Plus, X, ChevronRight, File
} from "lucide-react";

const DOC_TYPES = [
  { key: "acta_constitutiva", label: "Acta Constitutiva", desc: "Escritura pública de constitución" },
  { key: "tip", label: "TIP", desc: "Tarjeta de Identificación Patronal" },
  { key: "repse", label: "REPSE", desc: "Registro de Prestadoras de Servicios Especializados" },
  { key: "csf", label: "CSF", desc: "Constancia de Situación Fiscal" },
  { key: "domicilio", label: "Comprobante de Domicilio", desc: "Comprobante de domicilio vigente" },
  { key: "poder_notarial", label: "Poder Notarial", desc: "Poder del representante legal" },
  { key: "otro", label: "Otros Documentos", desc: "Documentos corporativos adicionales" },
];

interface Documento {
  id: string;
  carpeta_id: string;
  nombre: string;
  tipo: string;
  url: string;
  created_at: string;
}

interface Carpeta {
  id: string;
  nombre: string;
  orden: number;
  created_at: string;
}

export default function DocumentacionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [documentos, setDocumentos] = useState<Record<string, Documento[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [carpetaActiva, setCarpetaActiva] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const { data: carps } = await supabase
      .from("expedientes_carpetas")
      .select("*")
      .is("obra_id", null)
      .order("orden");

    if (carps && carps.length > 0) {
      setCarpetas(carps);
      const carpetaIds = carps.map(c => c.id);
      const { data: archivos } = await supabase
        .from("expedientes_archivos")
        .select("*")
        .in("carpeta_id", carpetaIds)
        .order("created_at", { ascending: false });

      if (archivos) {
        const grouped: Record<string, Documento[]> = {};
        archivos.forEach(a => {
          if (!grouped[a.carpeta_id]) grouped[a.carpeta_id] = [];
          grouped[a.carpeta_id].push(a);
        });
        setDocumentos(grouped);
      }
    }
    setLoading(false);
  };

  const msg = (tipo: "success" | "error", texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3000);
  };

  const crearCarpeta = async (nombre: string) => {
    const { data, error } = await supabase.from("expedientes_carpetas").insert({
      nombre,
      obra_id: null,
      obra_nombre: "Corporativo",
      orden: carpetas.length,
    }).select().single();

    if (error) { msg("error", error?.message ?? "Error al crear carpeta"); return null; }
    msg("success", `Carpeta "${nombre}" creada`);
    cargar();
    return data;
  };

  const subirArchivo = async (file: globalThis.File, carpetaId: string) => {
    setUploading(true);
    const path = buildPath({ module: "documentacion-legal", scope: [carpetaId], file: file as unknown as File });
    try {
      await uploadAndInsert({
        bucket: "expedientes",
        path,
        file: file as unknown as File,
        table: "expedientes_archivos",
        payload: {
          carpeta_id: carpetaId,
          nombre: file.name,
          tipo: file.type || file.name.split(".").pop() || "application/octet-stream",
        },
        urlField: "url",
      });
      msg("success", `"${file.name}" subido exitosamente`);
    } catch (err: any) {
      msg("error", err?.message || "Error al subir");
    }
    setUploading(false);
    cargar();
  };

  const handleUploadClick = async (docType: string) => {
    let carpeta = carpetas.find(c => c.nombre === docType);
    if (!carpeta) {
      const created = await crearCarpeta(docType);
      if (!created) return;
      carpeta = created;
    }
    setCarpetaActiva(carpeta!.id);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !carpetaActiva) return;
    await subirArchivo(file, carpetaActiva);
    e.target.value = "";
  };

  const getDocsCount = (docType: string) => {
    const carpeta = carpetas.find(c => c.nombre === docType);
    if (!carpeta) return 0;
    return (documentos[carpeta.id] || []).length;
  };

  const getDocsList = (docType: string): Documento[] => {
    const carpeta = carpetas.find(c => c.nombre === docType);
    if (!carpeta) return [];
    return documentos[carpeta.id] || [];
  };

  const [expanded, setExpanded] = useState<string | null>(null);

  const filteredTypes = DOC_TYPES.filter(d =>
    d.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link href="/dashboard/administracion" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Documentación Legal</h1>
          <p className="text-xs text-slate-400">Acta constitutiva, TIP, REPSE, CSF y documentos corporativos</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar tipo de documento..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600"
          />
        </div>
      </div>

      {mensaje && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Document Grid */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" />
          </div>
        ) : (
          filteredTypes.map(docType => {
            const count = getDocsCount(docType.label);
            const docs = getDocsList(docType.label);
            const isExpanded = expanded === docType.key;

            return (
              <div key={docType.key} className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : docType.key)}
                >
                  <div className={`p-2 rounded-lg ${count > 0 ? "bg-emerald-500/10" : "bg-blue-500/10"}`}>
                    {count > 0 ? <FolderOpen className="w-5 h-5 text-emerald-400" /> : <FileText className="w-5 h-5 text-blue-400" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white">{docType.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{docType.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {count > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        {count} archivo{count !== 1 ? "s" : ""}
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleUploadClick(docType.label); }}
                      disabled={uploading}
                      className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                    >
                      {uploading && carpetaActiva ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    </button>
                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-3">
                    {docs.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-2">Sin documentos cargados</p>
                    ) : (
                      <div className="space-y-2">
                        {docs.map(doc => (
                          <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{doc.nombre}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(doc.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                            </div>
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
