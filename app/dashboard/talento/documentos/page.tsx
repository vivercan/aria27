"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { buildPath } from "@/lib/storage";
import { clientLogger } from "@/lib/client-logger";
import {
  ArrowLeft, Folder, FolderLock, FolderOpen, Upload, Download,
  Loader2, File as FileIcon, Image, FileText, Trash2, Check,
  CheckSquare, Square, ChevronRight, X, Eye, Lock, Globe
} from "lucide-react";

const log = clientLogger("MIS-DOCS");
const BUCKET = "expedientes";
const STORAGE_PREFIX = "mis_documentos";
const SYSTEM_UUID = "00000000-0000-0000-0000-000000000000";

/* âââââ tipos âââââ */
interface UserRow { id: string; display_name: string | null; name: string | null; email: string }
interface DocRow {
  id: string; owner_user_id: string; owner_name: string; folder_type: string;
  parent_path: string; nombre: string; tipo: string | null; url: string;
  size_bytes: number | null; uploaded_by: string | null; created_at: string;
}
interface UploadProgress { name: string; progress: number; done: boolean; error?: string }

type View = "users" | "folders" | "files";

/* âââââ helpers âââââ */
function friendlySize(bytes: number | null): string {
  if (!bytes) return "â";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return Image;
  if (["pdf"].includes(ext)) return FileText;
  return FileIcon;
}

function getSubfolders(docs: DocRow[], currentPath: string): string[] {
  const folders = new Set<string>();
  for (const d of docs) {
    if (d.parent_path === currentPath) continue;
    if (!d.parent_path.startsWith(currentPath)) continue;
    const rest = d.parent_path.slice(currentPath.length);
    const nextSlash = rest.indexOf("/", 1);
    const sub = nextSlash === -1 ? rest : rest.slice(0, nextSlash + 1);
    if (sub && sub !== "/") folders.add(sub.replace(/^\//, "").replace(/\/$/, ""));
  }
  return Array.from(folders).sort();
}

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   COMPONENTE PRINCIPAL
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
export default function MisDocumentosPage() {
  /* ââ state global ââ */
  const [view, setView] = useState<View>("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [folderType, setFolderType] = useState<"compartidos" | "privados" | "publica" | null>(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentEmail, setCurrentEmail] = useState("anon");

  /* ââ PIN state ââ */
  const [pinRequired, setPinRequired] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [unlockedUsers, setUnlockedUsers] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ââ cargar usuario actual ââ */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setCurrentEmail(data.user.email);
    });
  }, []);

  /* ââ cargar usuarios del sistema ââ */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, display_name, name, email")
        .order("display_name", { ascending: true });
      if (error) { log.error("fetch users", error.message); }
      else { setUsers(data ?? []); }
      setLoading(false);
    })();
  }, []);

  /* ââ cargar documentos cuando cambia usuario+tipo ââ */
  const loadDocs = useCallback(async () => {
    if (!folderType) return;
    if (folderType !== "publica" && !selectedUser) return;
    setLoading(true);
    let query = supabase
      .from("mis_documentos")
      .select("*")
      .eq("folder_type", folderType);
    if (folderType !== "publica" && selectedUser) {
      query = query.eq("owner_user_id", selectedUser.id);
    }
    const { data, error } = await query
      .order("parent_path")
      .order("nombre");
    if (error) log.error("fetch docs", error.message);
    else setDocs(data ?? []);
    setSelectedIds(new Set());
    setLoading(false);
  }, [selectedUser, folderType]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  /* ââ handlers navegaciÃ³n ââ */
  function goBack() {
    if (view === "files" && currentPath !== "/") {
      const parts = currentPath.replace(/\/$/, "").split("/").filter(Boolean);
      parts.pop();
      setCurrentPath(parts.length === 0 ? "/" : "/" + parts.join("/") + "/");
      return;
    }
    if (view === "files") { setView("folders"); setFolderType(null); setDocs([]); setCurrentPath("/"); return; }
    if (view === "folders") { setView("users"); setSelectedUser(null); return; }
  }

  function selectUser(u: UserRow) {
    setSelectedUser(u);
    setView("folders");
  }

  function selectFolder(type: "compartidos" | "privados" | "publica") {
    if (type === "publica") {
      setFolderType("publica");
      setCurrentPath("/");
      setView("files");
      return;
    }
    if (type === "privados" && !unlockedUsers.has(selectedUser!.id)) {
      setPinRequired(true);
      setPinInput("");
      setPinError("");
      return;
    }
    setFolderType(type);
    setCurrentPath("/");
    setView("files");
  }

  async function verifyPin() {
    if (!selectedUser) return;
    const { data } = await supabase
      .from("users")
      .select("private_folder_pin")
      .eq("id", selectedUser.id)
      .single();
    const storedPin = data?.private_folder_pin ?? "1234";
    if (pinInput === storedPin) {
      setUnlockedUsers((prev) => new Set(prev).add(selectedUser.id));
      setPinRequired(false);
      setFolderType("privados");
      setCurrentPath("/");
      setView("files");
    } else {
      setPinError("PIN incorrecto");
    }
  }

  function enterSubfolder(name: string) {
    setCurrentPath((prev) => (prev === "/" ? "/" + name + "/" : prev + name + "/"));
  }

  /* ââ UPLOAD ââ */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !folderType) return;
    if (folderType !== "publica" && !selectedUser) return;

    setUploading(true);
    const queue: UploadProgress[] = Array.from(files).map((f) => ({
      name: f.name, progress: 0, done: false,
    }));
    setUploadQueue([...queue]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        queue[i].progress = 10;
        setUploadQueue([...queue]);

        // Determinar subcarpeta del archivo (webkitRelativePath si viene de carpeta)
        let subPath = currentPath;
        const relPath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath;
        if (relPath && relPath.includes("/")) {
          const parts = relPath.split("/");
          parts.pop(); // quitar nombre del archivo
          subPath = currentPath === "/" ? "/" + parts.join("/") + "/" : currentPath + parts.join("/") + "/";
        }

        const ownerId = folderType === "publica" ? SYSTEM_UUID : selectedUser!.id;
        const storagePath = buildPath({
          module: STORAGE_PREFIX,
          scope: [ownerId, folderType, subPath.replace(/\//g, "_")],
          file,
        });

        queue[i].progress = 30;
        setUploadQueue([...queue]);

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file, { upsert: false });
        if (upErr) throw new Error(upErr.message);

        queue[i].progress = 70;
        setUploadQueue([...queue]);

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

        const ownerName = folderType === "publica"
          ? "Pública"
          : (selectedUser!.display_name || selectedUser!.name || selectedUser!.email);
        const { error: dbErr } = await supabase.from("mis_documentos").insert({
          owner_user_id: ownerId,
          owner_name: ownerName,
          folder_type: folderType,
          parent_path: subPath,
          nombre: file.name,
          tipo: file.name.split(".").pop()?.toLowerCase() ?? null,
          url: urlData.publicUrl,
          size_bytes: file.size,
          uploaded_by: currentEmail,
        });
        if (dbErr) throw new Error(dbErr.message);

        queue[i].progress = 100;
        queue[i].done = true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        queue[i].error = msg;
        queue[i].done = true;
        log.error("upload file", msg);
      }
      setUploadQueue([...queue]);
    }

    setUploading(false);
    e.target.value = "";
    loadDocs();
    setTimeout(() => setUploadQueue([]), 3000);
  }

  /* ââ DELETE ââ */
  async function handleDelete(docId: string) {
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return;
    const blobPath = doc.url.includes(`/object/public/${BUCKET}/`)
      ? doc.url.split(`/object/public/${BUCKET}/`)[1]
      : null;
    if (blobPath) {
      await supabase.storage.from(BUCKET).remove([blobPath]);
    }
    await supabase.from("mis_documentos").delete().eq("id", docId);
    loadDocs();
  }

  async function handleDeleteSelected() {
    for (const id of selectedIds) {
      await handleDelete(id);
    }
    setSelectedIds(new Set());
  }

  /* ââ DOWNLOAD ââ */
  function downloadFile(url: string, nombre: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.target = "_blank";
    a.click();
  }

  function downloadSelected() {
    const sel = docs.filter((d) => selectedIds.has(d.id) && d.parent_path === currentPath);
    for (const d of sel) {
      downloadFile(d.url, d.nombre);
    }
  }

  /* ââ toggle selecciÃ³n ââ */
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const currentFiles = docs.filter((d) => d.parent_path === currentPath);
    if (selectedIds.size === currentFiles.length && currentFiles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentFiles.map((d) => d.id)));
    }
  }

  /* ââ datos de la vista actual ââ */
  const currentFiles = docs.filter((d) => d.parent_path === currentPath);
  const subfolders = getSubfolders(docs, currentPath);
  const breadcrumb = currentPath === "/"
    ? []
    : currentPath.split("/").filter(Boolean);

  const userName = (u: UserRow) => u.display_name || u.name || u.email;

  /* âââ RENDER âââ */
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {view !== "users" && (
            <button onClick={goBack} className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-300" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">Mis Documentos</h1>
            <p className="text-xs text-slate-400">
              {view === "users" && "Selecciona un usuario"}
              {view === "folders" && selectedUser && userName(selectedUser)}
              {view === "files" && (
                <span className="flex items-center gap-1">
                  {folderType === "publica" ? "Pública" : (selectedUser && userName(selectedUser))}
                  {" "}<ChevronRight className="w-3 h-3" />
                  <span className="capitalize">{folderType === "publica" ? "Pública" : folderType}</span>
                  {breadcrumb.map((b, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" /> {b}
                    </span>
                  ))}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Acciones en vista files */}
        {view === "files" && (
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={downloadSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-sm transition-colors"
                >
                  <Download className="w-4 h-4" /> Descargar ({selectedIds.size})
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.size})
                </button>
              </>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary/80 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Subir archivos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-aria-primary animate-spin" />
          </div>
        )}

        {/* ââ VISTA: USUARIOS ââ */}
        {!loading && view === "users" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => selectUser(u)}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-aria-primary/50 hover:bg-slate-800 transition-all duration-200"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-aria-primary to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {userName(u).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-white group-hover:text-aria-accent transition-colors text-center">
                  {userName(u)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ââ VISTA: CARPETAS (Compartidos / Privados) ââ */}
        {!loading && view === "folders" && selectedUser && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mt-8">
            <button
              onClick={() => selectFolder("compartidos")}
              className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-slate-800 transition-all duration-200"
            >
              <FolderOpen className="w-20 h-20 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-semibold text-white">Compartidos</span>
              <span className="text-xs text-slate-400">Acceso libre</span>
            </button>
            <button
              onClick={() => selectFolder("privados")}
              className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-amber-500/50 hover:bg-slate-800 transition-all duration-200"
            >
              <FolderLock className="w-20 h-20 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-semibold text-white">Privados</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Requiere PIN
              </span>
            </button>
            <button
              onClick={() => selectFolder("publica")}
              className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800 transition-all duration-200"
            >
              <Globe className="w-20 h-20 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-semibold text-white">Pública</span>
              <span className="text-xs text-slate-400">Visible para todos</span>
            </button>
          </div>
        )}

        {/* ââ VISTA: ARCHIVOS + SUBCARPETAS ââ */}
        {!loading && view === "files" && (
          <div>
            {/* Select all bar */}
            {currentFiles.length > 0 && (
              <div className="flex items-center gap-3 mb-4 px-2">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white transition-colors">
                  {selectedIds.size === currentFiles.length ? (
                    <CheckSquare className="w-5 h-5 text-aria-primary" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <span className="text-sm text-slate-400">
                  {currentFiles.length} archivo{currentFiles.length !== 1 ? "s" : ""}
                  {subfolders.length > 0 && ` Â· ${subfolders.length} subcarpeta${subfolders.length !== 1 ? "s" : ""}`}
                </span>
              </div>
            )}

            {/* Subcarpetas */}
            {subfolders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                {subfolders.map((sf) => (
                  <button
                    key={sf}
                    onClick={() => enterSubfolder(sf)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-aria-primary/40 hover:bg-slate-800/70 transition-all"
                  >
                    <Folder className="w-10 h-10 text-amber-400" />
                    <span className="text-xs text-slate-300 text-center truncate w-full">{sf}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Archivos */}
            {currentFiles.length === 0 && subfolders.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <Folder className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Sin archivos. Sube algo para empezar.</p>
              </div>
            )}

            <div className="space-y-1">
              {currentFiles.map((doc) => {
                const Icon = fileIcon(doc.nombre);
                const isSelected = selectedIds.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isSelected ? "bg-aria-primary/10 border border-aria-primary/30" : "bg-slate-800/30 border border-transparent hover:bg-slate-800/60"
                    }`}
                  >
                    <button onClick={() => toggleSelect(doc.id)} className="flex-none">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-aria-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                      )}
                    </button>
                    <Icon className="w-5 h-5 text-slate-400 flex-none" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{doc.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {friendlySize(doc.size_bytes)} Â· {new Date(doc.created_at).toLocaleDateString("es-MX")}
                        {doc.uploaded_by && ` Â· ${doc.uploaded_by}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-none">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                        title="Ver"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => downloadFile(doc.url, doc.nombre)}
                        className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 rounded-lg hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ââ UPLOAD PROGRESS OVERLAY ââ */}
        {uploadQueue.length > 0 && (
          <div className="fixed bottom-6 right-6 w-96 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">
                Subiendo archivos ({uploadQueue.filter((u) => u.done).length}/{uploadQueue.length})
              </h4>
              {!uploading && (
                <button onClick={() => setUploadQueue([])} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-60 overflow-auto">
              {uploadQueue.map((uq, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {uq.error ? (
                      <X className="w-3.5 h-3.5 text-red-400 flex-none" />
                    ) : uq.done ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-none" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-aria-primary animate-spin flex-none" />
                    )}
                    <span className="text-xs text-slate-300 truncate flex-1">{uq.name}</span>
                    <span className="text-xs text-slate-500 flex-none">{uq.progress}%</span>
                  </div>
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        uq.error ? "bg-red-500" : uq.done ? "bg-emerald-500" : "bg-aria-primary"
                      }`}
                      style={{ width: `${uq.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ââ PIN MODAL ââ */}
      {pinRequired && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <FolderLock className="w-12 h-12 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Carpeta Privada</h3>
              <p className="text-sm text-slate-400 text-center">
                Ingresa el PIN para acceder a los documentos privados de {selectedUser && userName(selectedUser)}.
              </p>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") verifyPin(); }}
                placeholder="PIN"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-aria-primary"
                autoFocus
              />
              {pinError && <p className="text-sm text-red-400">{pinError}</p>}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPinRequired(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={verifyPin}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-aria-primary text-white hover:bg-aria-primary/80 transition-colors font-medium"
                >
                  Entrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
