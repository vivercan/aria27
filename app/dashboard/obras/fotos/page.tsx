'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadAndInsert, deleteRowAndBlob, buildPath } from '@/lib/storage';
import { useDropZone } from '@/lib/use-drop-zone';
import AriaBackButton from '@/components/AriaBackButton';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('FOTOS');
import {
  Camera,
  Upload,
  Trash2,
  X,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Image,
  Building2,
  FolderUp,
  Inbox,
} from 'lucide-react';

interface Obra {
  id: string;
  nombre: string;
}

interface Photo {
  id: string;
  carpeta_id: string;
  nombre: string;
  url: string;
  tipo: string;
  created_at: string;
}

interface LightboxState {
  isOpen: boolean;
  photoIndex: number;
}

export default function FotosPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lightbox, setLightbox] = useState<LightboxState>({ isOpen: false, photoIndex: 0 });
  const [loadingObras, setLoadingObras] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Load obras
  useEffect(() => {
    const fetchObras = async () => {
      try {
        setLoadingObras(true);
        const { data, error: err } = await supabase
          .from('centros_trabajo')
          .select('id, nombre')
          .order('nombre', { ascending: true });

        if (err) throw err;
        setObras(data || []);
        if (data && data.length > 0) {
          setSelectedObraId(data[0].id);
        }
      } catch (err: unknown) {
        log.error('Error loading obras', { error: err });
        setError('Failed to load obras');
      } finally {
        setLoadingObras(false);
      }
    };

    fetchObras();
  }, []);

  // Load photos for selected obra
  useEffect(() => {
    if (!selectedObraId) {
      setPhotos([]);
      return;
    }

    const fetchPhotos = async () => {
      try {
        setLoadingPhotos(true);
        const carpetaId = `obras:fotos:${selectedObraId}`;
        const { data, error: err } = await supabase
          .from('expedientes_archivos')
          .select('id, carpeta_id, nombre, url, tipo, created_at')
          .eq('carpeta_id', carpetaId)
          .order('created_at', { ascending: false });

        if (err) throw err;
        setPhotos(data || []);
      } catch (err: unknown) {
        log.error('Error loading photos', { error: err });
        setError('Failed to load photos');
      } finally {
        setLoadingPhotos(false);
      }
    };

    fetchPhotos();
  }, [selectedObraId]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFolderClick = useCallback(() => {
    folderInputRef.current?.click();
  }, []);


  /** Shared upload logic for both input and drag & drop â sequential con concurrencia 3 */
  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || !selectedObraId) return;
      try {
        setUploading(true);
        setError(null);
        const carpetaId = `obras:fotos:${selectedObraId}`;
        const CONCURRENCY = 3;
        for (let i = 0; i < files.length; i += CONCURRENCY) {
          const batch = files.slice(i, i + CONCURRENCY);
          await Promise.all(
            batch.map((file) => {
              const path = buildPath({ module: 'obras-fotos', scope: [selectedObraId], file });
              return uploadAndInsert({
                file, bucket: 'expedientes', path,
                table: 'expedientes_archivos',
                payload: { carpeta_id: carpetaId, nombre: file.name, tipo: 'foto' },
              });
            })
          );
        }
        const { data, error: err } = await supabase
          .from('expedientes_archivos')
          .select('id, carpeta_id, nombre, url, tipo, created_at')
          .eq('carpeta_id', carpetaId)
          .order('created_at', { ascending: false });
        if (err) throw err;
        setPhotos(data || []);
      } catch (err: unknown) {
        log.error('Error uploading photos', { error: err });
        setError('Failed to upload photos. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [selectedObraId]
  );

  const { dragging, progress: dropProgress, dropHandlers } = useDropZone(uploadFiles);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.currentTarget.files;
      if (!files || !selectedObraId) return;

      try {
        setUploading(true);
        setError(null);

        const carpetaId = `obras:fotos:${selectedObraId}`;
        const CONCURRENCY = 3;
        const fileArr = Array.from(files);
        for (let i = 0; i < fileArr.length; i += CONCURRENCY) {
          const batch = fileArr.slice(i, i + CONCURRENCY);
          await Promise.all(
            batch.map((file) => {
              const path = buildPath({
                module: 'obras-fotos',
                scope: [selectedObraId],
                file,
              });
              return uploadAndInsert({
                file,
                bucket: 'expedientes',
                path,
                table: 'expedientes_archivos',
                payload: {
                  carpeta_id: carpetaId,
                  nombre: file.name,
                  tipo: 'foto',
                },
              });
            })
          );
        }

        // Refresh photos
        const { data, error: err } = await supabase
          .from('expedientes_archivos')
          .select('id, carpeta_id, nombre, url, tipo, created_at')
          .eq('carpeta_id', carpetaId)
          .order('created_at', { ascending: false });

        if (err) throw err;
        setPhotos(data || []);

        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err: unknown) {
        log.error('Error uploading photos', { error: err });
        setError('Failed to upload photos. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [selectedObraId]
  );

  const handleDeletePhoto = useCallback(
    async (photoId: string, photoUrl: string) => {
      try {
        setError(null);
        await deleteRowAndBlob({
          bucket: 'expedientes',
          table: 'expedientes_archivos',
          id: photoId,
          userEmail: typeof window !== 'undefined' ? localStorage.getItem('userEmail') || 'anon' : 'anon',
          blobUrlField: 'url',
        });

        // Refresh photos
        if (selectedObraId) {
          const carpetaId = `obras:fotos:${selectedObraId}`;
          const { data, error: err } = await supabase
            .from('expedientes_archivos')
            .select('id, carpeta_id, nombre, url, tipo, created_at')
            .eq('carpeta_id', carpetaId)
            .order('created_at', { ascending: false });

          if (err) throw err;
          setPhotos(data || []);
        }

        setConfirmDelete(null);
      } catch (err: unknown) {
        log.error('Error deleting photo', { error: err });
        setError('Failed to delete photo');
      }
    },
    [selectedObraId]
  );

  const openLightbox = useCallback((index: number) => {
    setLightbox({ isOpen: true, photoIndex: index });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox({ isOpen: false, photoIndex: 0 });
  }, []);

  const goToPrevious = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      photoIndex: (prev.photoIndex - 1 + photos.length) % photos.length,
    }));
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      photoIndex: (prev.photoIndex + 1) % photos.length,
    }));
  }, [photos.length]);

  const currentPhoto = lightbox.isOpen && photos[lightbox.photoIndex] ? photos[lightbox.photoIndex] : null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className={`h-full flex flex-col bg-[#040810] text-white relative ${dragging ? "ring-2 ring-inset ring-emerald-400/60" : ""}`} {...dropHandlers}>
      {/* Drag & drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-30 bg-emerald-500/10  flex flex-col items-center justify-center pointer-events-none">
          <Inbox className="w-12 h-12 text-emerald-400 mb-2" />
          <p className="text-emerald-300 text-sm font-medium">Suelta fotos o carpetas aqu\u00ed</p>
        </div>
      )}
      {/* Scanning/uploading progress overlay */}
      {dropProgress && (
        <div className="absolute inset-0 z-30 bg-[#0a1628]/80  flex flex-col items-center justify-center pointer-events-none">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-2" />
          <p className="text-emerald-300 text-sm font-medium">
            {dropProgress.phase === "scanning" ? "Escaneando carpetas\u2026" : "Subiendo fotos\u2026"}
          </p>
          {dropProgress.total > 0 && (
            <p className="text-emerald-400/60 text-xs mt-1">
              {dropProgress.current} / {dropProgress.total} archivos
            </p>
          )}
        </div>
      )}
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#040810]/80 ">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <AriaBackButton href="/dashboard/obras" />
            <Camera className="h-5 w-5 text-aria-accent" />
            <h1 className="text-xl font-semibold">GalerÃÂ­a de Fotos</h1>
          </div>

          {selectedObraId && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70">
                {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
              </span>
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-accent/80 hover:bg-aria-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Fotos</span>
                  </>
                )}
              </button>
              <button
                onClick={handleFolderClick}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <FolderUp className="h-4 w-4" />
                    <span>Carpeta</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 py-3 bg-red-900/30 border border-red-700/50 text-red-200 text-sm rounded-lg mx-6 mt-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Obras list */}
        <div className="w-64 border-r border-white/[0.06] overflow-y-auto">
          <div className="p-4 space-y-2">
            {loadingObras ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : obras.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-8 w-8 mx-auto text-white/30 mb-2" />
                <p className="text-sm text-white/50">No obras available</p>
              </div>
            ) : (
              obras.map((obra) => (
                <button
                  key={obra.id}
                  onClick={() => setSelectedObraId(obra.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedObraId === obra.id
                      ? 'bg-aria-accent/80/30 border border-aria-accent/50 text-white'
                      : 'border border-white/[0.06] text-white/70 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="truncate font-medium text-sm">{obra.nombre}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedObraId ? (
            // Empty state - no obra selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto text-white/30 mb-4" />
                <h2 className="text-lg font-semibold text-white/70 mb-2">Selecciona una obra</h2>
                <p className="text-sm text-white/50">
                  Elige una obra de la lista para ver o subir fotos
                </p>
              </div>
            </div>
          ) : loadingPhotos ? (
            // Loading state
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-aria-accent" />
            </div>
          ) : photos.length === 0 ? (
            // Empty state - no photos
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Image className="h-12 w-12 mx-auto text-white/30 mb-4" />
                <h2 className="text-lg font-semibold text-white/70 mb-2">Sin fotos</h2>
                <p className="text-sm text-white/50 mb-4">
                  Esta obra aÃÂºn no tiene fotos. Sube algunas para comenzar.
                </p>
                <button
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-accent/80 hover:bg-aria-accent/80 disabled:opacity-50 transition-colors text-sm"
                >
                  <Upload className="h-4 w-4" />
                  <span>Subir primera foto</span>
                </button>
              </div>
            </div>
          ) : (
            // Photo grid
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-white/[0.06] hover:border-aria-accent/50 transition-all bg-white/[0.03]"
                    >
                      {/* Image */}
                      <img
                        src={photo.url}
                        alt={photo.nombre}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => openLightbox(index)}
                      />

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

                      {/* Info footer */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                        <p className="text-xs text-white/70 truncate">{photo.nombre}</p>
                        <p className="text-xs text-white/50">{formatDate(photo.created_at)}</p>
                      </div>

                      {/* Delete button */}
                      {confirmDelete === photo.id ? (
                        <div className="absolute top-2 right-2 flex gap-1 z-20">
                          <button
                            onClick={() => handleDeletePhoto(photo.id, photo.url)}
                            className="p-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="p-1.5 rounded bg-white/[0.1] hover:bg-white/[0.2] text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(photo.id)}
                          className="absolute top-2 right-2 p-1.5 rounded bg-black/50 group-hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightbox.isOpen && currentPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80  flex items-center justify-center p-4">
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/[0.1] hover:bg-white/[0.2] text-white transition-colors z-50"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Main image container */}
          <div className="relative w-full h-full flex items-center justify-center max-w-5xl max-h-[80vh]">
            <img
              src={currentPhoto.url}
              alt={currentPhoto.nombre}
              className="max-w-full max-h-full object-contain rounded-lg"
            />

            {/* Previous button */}
            {photos.length > 1 && (
              <button
                onClick={goToPrevious}
                className="absolute left-4 p-2 rounded-lg bg-white/[0.1] hover:bg-white/[0.2] text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            {/* Next button */}
            {photos.length > 1 && (
              <button
                onClick={goToNext}
                className="absolute right-4 p-2 rounded-lg bg-white/[0.1] hover:bg-white/[0.2] text-white transition-colors"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            )}

            {/* Photo counter */}
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-white/[0.1]  text-sm text-white">
                {lightbox.photoIndex + 1} / {photos.length}
              </div>
            )}

            {/* Photo info */}
            <div className="absolute bottom-4 left-4 text-sm text-white/70 max-w-xs">
              <p className="truncate font-medium">{currentPhoto.nombre}</p>
              <p className="text-xs text-white/50">{formatDate(currentPhoto.created_at)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        webkitdirectory=""
        directory=""
      />
    </div>
  );
}
