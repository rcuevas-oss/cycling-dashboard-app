import { Session } from "@supabase/supabase-js";
import { FitBatchIngestResponse, FitIngestResponse } from "./activityTypes";
import { parseGarminFitPreviewWithOfficialSdk } from "./garmin/browserFitSdk";
import { GarminFitPreviewData } from "./garmin/fitTypes";
import { supabase } from "./supabase";

const FIT_BUCKET = "fit-files";
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const DEFAULT_FIT_LOOKBACK_DAYS = 90;

type StoredFitMeta = {
  bucket_name: string;
  storage_path: string;
  original_filename: string;
  file_size_bytes: number;
  file_hash: string;
};

type ParsedFitCandidate = {
  preview: GarminFitPreviewData;
  fileHash: string;
  activityDate: string;
  distanceKm: number | null;
};

type FitBatchIngestOptions = {
  lookbackDays?: number | null;
  onProgress?: (progress: { current: number; total: number; fileName: string }) => void;
};

function sanitizeFilename(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeUploadError(message: string) {
  if (message.toLowerCase().includes("bucket not found")) {
    return "Falta el bucket de Storage `fit-files` en Supabase. Ejecuta la migracion FIT o crea ese bucket antes de subir archivos.";
  }

  return message;
}

function isStorageObjectAlreadyExists(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already exists") || normalized.includes("duplicate");
}

function roundMetric(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function buildUtcDayCutoff(lookbackDays: number) {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - lookbackDays);
  return cutoff;
}

function isWithinLookbackWindow(activityDate: string, lookbackDays: number | null | undefined) {
  if (lookbackDays === null || lookbackDays === undefined) return true;

  const parsed = new Date(activityDate);
  if (Number.isNaN(parsed.getTime())) return true;

  return parsed >= buildUtcDayCutoff(lookbackDays);
}

function secondsToInterval(totalSeconds: number | null | undefined) {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) return null;

  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getBestLapInterval(preview: GarminFitPreviewData) {
  const validLapSeconds = preview.normalized.laps
    .map((lap) => lap.total_timer_time_seconds ?? lap.total_elapsed_time_seconds)
    .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value) && value > 0);

  if (!validLapSeconds.length) return null;

  return secondsToInterval(Math.min(...validLapSeconds));
}

async function sha256Hex(arrayBuffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildLegacyRawPayload(preview: GarminFitPreviewData, storedFit: StoredFitMeta) {
  return {
    source: "garmin_fit_browser",
    parser: "official_sdk",
    uploaded_at: new Date().toISOString(),
    file: storedFit,
    raw: {
      session: preview.raw.session,
      laps: preview.raw.laps,
      steps: preview.raw.steps,
      record_count: preview.raw.records.length,
    },
    normalized: {
      session: preview.normalized.session,
      laps: preview.normalized.laps,
      steps: preview.normalized.steps,
      record_count: preview.normalized.records.length,
    },
  };
}

function buildLegacyActivityRow(
  session: Session,
  fileName: string,
  preview: GarminFitPreviewData,
  storedFit: StoredFitMeta,
) {
  const summary = preview.normalized.session;

  if (!summary) {
    throw new Error("El FIT no contiene una sesión principal compatible.");
  }

  return {
    user_id: session.user.id,
    file_name: fileName,
    titulo: summary.title || fileName,
    activity_date: summary.start_time,
    duration_minutes: roundMetric((summary.elapsed_time_seconds ?? summary.moving_time_seconds ?? 0) / 60, 0),
    distance_km: roundMetric((summary.distance_m ?? 0) / 1000, 3),
    avg_power: roundMetric(summary.average_power, 0),
    normalized_power: roundMetric(summary.normalized_power, 0),
    avg_hr: roundMetric(summary.average_heartrate, 0),
    tss: roundMetric(summary.training_stress_score, 2),
    ascenso_total: roundMetric(summary.ascenso_total, 2),
    descenso_total: roundMetric(summary.descenso_total, 2),
    temperatura_min: roundMetric(summary.temperature_min, 2),
    temperatura_max: roundMetric(summary.temperature_max, 2),
    numero_vueltas: preview.normalized.laps.length,
    tiempo_movimiento: secondsToInterval(summary.moving_time_seconds),
    tiempo_transcurrido: secondsToInterval(summary.elapsed_time_seconds),
    tiempo: secondsToInterval(summary.elapsed_time_seconds),
    mejor_vuelta: getBestLapInterval(preview),
    altura_max: roundMetric(summary.altura_max, 2),
    altura_min: roundMetric(summary.altura_min, 2),
    resp_media: roundMetric(summary.respiration_rate_avg, 2),
    resp_min: roundMetric(summary.respiration_rate_min, 2),
    resp_max: roundMetric(summary.respiration_rate_max, 2),
    velocidad_maxima: roundMetric((summary.max_speed_mps ?? 0) * 3.6, 2),
    calorias: roundMetric(summary.calories, 0),
    fc_media: roundMetric(summary.average_heartrate, 0),
    fc_maxima: roundMetric(summary.max_heartrate, 0),
    te_aerobico: roundMetric(summary.aerobic_training_effect, 2),
    velocidad_media: roundMetric((summary.average_speed_mps ?? 0) * 3.6, 2),
    cadencia_media: roundMetric(summary.average_cadence, 2),
    cadencia_maxima: roundMetric(summary.max_cadence, 2),
    training_stress_score: roundMetric(summary.training_stress_score, 2),
    potencia_20min: roundMetric(summary.best_20min_power, 0),
    potencia_media: roundMetric(summary.average_power, 0),
    potencia_maxima: roundMetric(summary.max_power, 0),
    pedaladas_totales: roundMetric(summary.total_cycles, 0),
    is_indoor: summary.is_indoor,
    laps_data: buildLegacyRawPayload(preview, storedFit),
  };
}

function readStoredFitMeta(lapsData: unknown): StoredFitMeta | null {
  if (!lapsData || typeof lapsData !== "object") return null;

  const rawFile = (lapsData as { file?: Partial<StoredFitMeta> }).file;
  if (!rawFile?.bucket_name || !rawFile.storage_path || !rawFile.original_filename || !rawFile.file_hash) {
    return null;
  }

  return {
    bucket_name: rawFile.bucket_name,
    storage_path: rawFile.storage_path,
    original_filename: rawFile.original_filename,
    file_size_bytes: Number(rawFile.file_size_bytes ?? 0),
    file_hash: rawFile.file_hash,
  };
}

async function findExistingActivityByFileHash(session: Session, fileHash: string) {
  const { data, error } = await supabase
    .from("activities")
    .select("id, laps_data")
    .eq("user_id", session.user.id)
    .contains("laps_data", { file: { file_hash: fileHash } })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo verificar si el FIT ya existía por hash: ${error.message}`);
  }

  return data;
}

async function findExistingActivityBySignature(session: Session, activityDate: string, distanceKm: number | null) {
  let query = supabase
    .from("activities")
    .select("id, laps_data")
    .eq("user_id", session.user.id)
    .eq("activity_date", activityDate)
    .order("created_at", { ascending: false })
    .limit(1);

  if (distanceKm !== null) {
    query = query.eq("distance_km", distanceKm);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`No se pudo verificar si el FIT ya existía: ${error.message}`);
  }

  return data;
}

async function uploadOriginalFit(file: File, storagePath: string) {
  const { error } = await supabase.storage
    .from(FIT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: "application/octet-stream",
      upsert: false,
    });

  if (error) {
    if (isStorageObjectAlreadyExists(error.message)) {
      return;
    }

    throw new Error(`No se pudo subir el archivo FIT: ${normalizeUploadError(error.message)}`);
  }
}

async function removeUploadedFit(storagePath: string) {
  await supabase.storage.from(FIT_BUCKET).remove([storagePath]);
}

async function parseFitCandidate(file: File): Promise<ParsedFitCandidate> {
  if (!file.name.toLowerCase().endsWith(".fit")) {
    throw new Error("Por favor, selecciona un archivo .fit válido.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("El archivo FIT supera el tamaño máximo permitido de 25 MB.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const preview = parseGarminFitPreviewWithOfficialSdk(arrayBuffer, file.name);

  if (!preview.normalized.session) {
    throw new Error("El FIT no contiene una sesión principal compatible.");
  }

  const fileHash = await sha256Hex(arrayBuffer);
  const activityDate = preview.normalized.session.start_time;
  const distanceKm = roundMetric((preview.normalized.session.distance_m ?? 0) / 1000, 3);

  return {
    preview,
    fileHash,
    activityDate,
    distanceKm,
  };
}

async function persistParsedFit(session: Session, file: File, parsedFit: ParsedFitCandidate): Promise<FitIngestResponse> {
  const { preview, fileHash, activityDate, distanceKm } = parsedFit;
  const existingByHash = await findExistingActivityByFileHash(session, fileHash);
  const existingBySignature = existingByHash
    ? null
    : await findExistingActivityBySignature(session, activityDate, distanceKm);
  const existingActivity = existingByHash ?? existingBySignature;
  const existingStoredFit = readStoredFitMeta(existingActivity?.laps_data);

  const storedFit =
    existingStoredFit ??
    {
      bucket_name: FIT_BUCKET,
      storage_path: `${session.user.id}/${fileHash}-${sanitizeFilename(file.name)}`,
      original_filename: file.name,
      file_size_bytes: file.size,
      file_hash: fileHash,
    };

  if (!existingStoredFit) {
    await uploadOriginalFit(file, storedFit.storage_path);
  }

  const payload = buildLegacyActivityRow(session, file.name, preview, storedFit);
  const isDuplicate = Boolean(existingActivity?.id);

  try {
    if (existingActivity?.id) {
      const { data, error } = await supabase
        .from("activities")
        .update(payload)
        .eq("id", existingActivity.id)
        .eq("user_id", session.user.id)
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        session_id: data?.id ?? existingActivity.id,
        status: "duplicate",
        laps_inserted: preview.normalized.laps.length,
        steps_inserted: preview.normalized.steps.length,
        file_name: file.name,
        activity_date: activityDate,
      };
    }

    const { data, error } = await supabase
      .from("activities")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      session_id: data?.id ?? null,
      status: isDuplicate ? "duplicate" : "inserted",
      laps_inserted: preview.normalized.laps.length,
      steps_inserted: preview.normalized.steps.length,
      file_name: file.name,
      activity_date: activityDate,
    };
  } catch (error) {
    if (!existingStoredFit) {
      await removeUploadedFit(storedFit.storage_path);
    }

    const errorMessage = error instanceof Error ? error.message : "Error desconocido guardando la actividad.";
    throw new Error(`No se pudo guardar la actividad FIT en Supabase: ${errorMessage}`);
  }
}

export async function uploadAndIngestFit(session: Session, file: File): Promise<FitIngestResponse> {
  const parsedFit = await parseFitCandidate(file);
  return persistParsedFit(session, file, parsedFit);
}

export async function uploadAndIngestFitsBatch(
  session: Session,
  files: File[],
  options: FitBatchIngestOptions = {},
): Promise<FitBatchIngestResponse> {
  const uniqueFiles = files.filter(
    (file, index, allFiles) =>
      allFiles.findIndex(
        (candidate) =>
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.lastModified === file.lastModified,
      ) === index,
  );

  const results: FitBatchIngestResponse["results"] = [];
  const seenHashes = new Set<string>();
  const lookbackDays = options.lookbackDays ?? DEFAULT_FIT_LOOKBACK_DAYS;

  for (let index = 0; index < uniqueFiles.length; index += 1) {
    const file = uniqueFiles[index];
    options.onProgress?.({
      current: index + 1,
      total: uniqueFiles.length,
      fileName: file.name,
    });

    try {
      const parsedFit = await parseFitCandidate(file);

      if (!isWithinLookbackWindow(parsedFit.activityDate, lookbackDays)) {
        results.push({
          file_name: file.name,
          status: "skipped_old",
          session_id: null,
          activity_date: parsedFit.activityDate,
          reason: `Fuera del rango de los últimos ${lookbackDays} días.`,
        });
        continue;
      }

      if (seenHashes.has(parsedFit.fileHash)) {
        results.push({
          file_name: file.name,
          status: "duplicate",
          session_id: null,
          activity_date: parsedFit.activityDate,
          reason: "Archivo repetido dentro del lote seleccionado.",
        });
        continue;
      }

      seenHashes.add(parsedFit.fileHash);
      const ingestResult = await persistParsedFit(session, file, parsedFit);
      results.push({
        file_name: file.name,
        status: ingestResult.status,
        session_id: ingestResult.session_id,
        activity_date: ingestResult.activity_date,
        laps_inserted: ingestResult.laps_inserted,
        steps_inserted: ingestResult.steps_inserted,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido.";
      results.push({
        file_name: file.name,
        status: "failed",
        session_id: null,
        reason: errorMessage,
      });
    }
  }

  return {
    selected_files: files.length,
    eligible_files: uniqueFiles.length,
    inserted: results.filter((result) => result.status === "inserted").length,
    duplicates: results.filter((result) => result.status === "duplicate").length,
    skipped_old: results.filter((result) => result.status === "skipped_old").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}
