import { useRef, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { Files } from "lucide-react";
import { DEFAULT_FIT_LOOKBACK_DAYS, uploadAndIngestFitsBatch } from "../lib/fitSync";

interface FitSyncCardProps {
  session: Session;
  onSuccess: () => Promise<void>;
  title?: string;
  description?: string;
  buttonLabel?: string;
}

const SYSTEM_LOOKBACK_DAYS = DEFAULT_FIT_LOOKBACK_DAYS;

export function FitSyncCard({
  session,
  onSuccess,
  title = "Sincronizador FIT",
  description = "Carga tus archivos `.fit` originales de Garmin y el dashboard se actualiza de inmediato.",
  buttonLabel = "Sincronizar FIT",
}: FitSyncCardProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [ignoredFilesCount, setIgnoredFilesCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const filesInputRef = useRef<HTMLInputElement | null>(null);

  const resetPickers = () => {
    if (filesInputRef.current) filesInputRef.current.value = "";
  };

  const handleSelection = (fileList: FileList | null) => {
    const allFiles = Array.from(fileList ?? []);
    const fitFiles = allFiles
      .filter((file) => file.name.toLowerCase().endsWith(".fit"))
      .sort((a, b) => b.lastModified - a.lastModified);
    const ignoredCount = allFiles.length - fitFiles.length;

    setSelectedFiles(fitFiles);
    setIgnoredFilesCount(ignoredCount);

    if (fitFiles.length === 0) {
      setMessage("❌ No seleccionaste archivos .fit válidos.");
      return;
    }

    const selectionLabel = `Listos ${fitFiles.length} archivos FIT para sincronizar.`;
    const ignoredLabel = ignoredCount > 0 ? ` Se ignoraron ${ignoredCount} archivos no FIT.` : "";
    setMessage(`${selectionLabel}${ignoredLabel} El sistema importará automáticamente los últimos ${SYSTEM_LOOKBACK_DAYS} días.`);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setMessage(`Preparando ${selectedFiles.length} archivo(s) FIT para sincronización...`);

    try {
      const result = await uploadAndIngestFitsBatch(session, selectedFiles, {
        lookbackDays: SYSTEM_LOOKBACK_DAYS,
        onProgress: ({ current, total, fileName }) => {
          setMessage(`Procesando ${current}/${total}: ${fileName}`);
        },
      });

      const summary = [
        `${result.inserted} nuevas`,
        `${result.duplicates} duplicadas`,
        `${result.skipped_old} fuera de rango`,
        `${result.failed} fallidas`,
      ].join(" · ");

      const firstFailure = result.results.find((item) => item.status === "failed");
      setMessage(
        firstFailure
          ? `✅ Lote terminado: ${summary}. Primer error: ${firstFailure.file_name} (${firstFailure.reason})`
          : `✅ Lote terminado: ${summary}.`,
      );

      setSelectedFiles([]);
      setIgnoredFilesCount(0);
      resetPickers();
      await onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido.";
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-border rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="font-semibold text-xl">{title}</h3>
        <p className="text-zinc-400 text-sm mt-2">{description}</p>
      </div>

      <div className="flex flex-col gap-4">
        <input
          ref={filesInputRef}
          type="file"
          accept=".fit"
          multiple
          className="hidden"
          onChange={(e) => handleSelection(e.target.files)}
        />

        <button
          type="button"
          onClick={() => filesInputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl bg-zinc-800/30 hover:bg-zinc-800/80 hover:border-garmin-blue transition-all group px-4 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-garmin-blue/10 text-garmin-blue flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Files className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-zinc-200">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} FIT listos para sincronizar`
              : "Seleccionar archivos FIT"}
          </p>
          <p className="text-xs text-zinc-500 mt-2 max-w-xs">Elige uno o varios archivos .fit originales de Garmin.</p>
        </button>

        <button
          type="button"
          onClick={() => filesInputRef.current?.click()}
          className="w-full py-3 rounded-xl font-semibold border border-zinc-700 bg-zinc-800/40 hover:bg-zinc-800 hover:border-garmin-blue transition-all text-zinc-100"
        >
          Elegir varios FIT
        </button>

        <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Primera Carga</p>
          <p className="text-sm text-zinc-400 mt-2">
            El sistema sincroniza automáticamente los últimos {SYSTEM_LOOKBACK_DAYS} días. Esa ventana es fija y no la configura el usuario.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs text-zinc-400">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} FIT detectados${ignoredFilesCount > 0 ? ` · ${ignoredFilesCount} archivos ignorados por no ser .fit` : ""}`
              : "Aún no hay archivos en cola."}
          </p>
          {selectedFiles.length > 0 && (
            <div className="mt-2 max-h-24 overflow-y-auto custom-scrollbar pr-1 space-y-1">
              {selectedFiles.slice(0, 6).map((fitFile) => (
                <p key={`${fitFile.name}-${fitFile.lastModified}`} className="text-xs text-zinc-500 truncate">
                  {fitFile.name}
                </p>
              ))}
              {selectedFiles.length > 6 && (
                <p className="text-xs text-zinc-600">+{selectedFiles.length - 6} archivos más</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          className={`w-full py-3.5 rounded-xl font-semibold shadow-lg transition-all ${
            selectedFiles.length === 0 || isUploading
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
              : "bg-garmin-blue text-white hover:bg-blue-600 hover:shadow-garmin-blue/20 hover:-translate-y-0.5"
          }`}
        >
          {isUploading ? "Procesando lote FIT..." : buttonLabel}
        </button>

        {message && (
          <div
            className={`p-4 rounded-xl text-sm font-medium mt-2 border ${
              message.includes("❌")
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
