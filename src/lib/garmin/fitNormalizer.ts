import {
  GarminFitDecodedMessages,
  GarminFitFileDescriptor,
  GarminFitIngestPayload,
  GarminFitMessageRecord,
  GarminFitPreviewData,
  NormalizedGarminFitData,
  NormalizedGarminFitLap,
  NormalizedGarminFitSession,
  NormalizedGarminFitWorkoutStep,
} from "./fitTypes.ts";

function pickValue(record: GarminFitMessageRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

function asNumber(record: GarminFitMessageRecord, keys: string[]) {
  const value = pickValue(record, keys);

  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function asString(record: GarminFitMessageRecord, keys: string[]) {
  const value = pickValue(record, keys);

  if (typeof value === "string" && value.trim() !== "") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return null;
}

function asBoolean(record: GarminFitMessageRecord, keys: string[]) {
  const value = pickValue(record, keys);

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return null;
}

function toIsoString(value: unknown) {
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return null;
}

function getSessionTitle(session: GarminFitMessageRecord, originalFilename: string) {
  return asString(session, ["sportProfileName", "event", "sport"]) ?? originalFilename;
}

export function normalizeGarminFitSession(
  session: GarminFitMessageRecord,
  originalFilename: string,
): NormalizedGarminFitSession {
  const sport = asString(session, ["sport"]);
  const subSport = asString(session, ["subSport", "sub_sport"]);
  const startTime = toIsoString(pickValue(session, ["startTime", "timestamp"]));

  if (!startTime) {
    throw new Error("El FIT no contiene startTime/timestamp para la sesión principal.");
  }

  const isIndoor =
    asBoolean(session, ["isIndoor", "is_indoor"]) ??
    Boolean(
      sport?.toLowerCase().includes("indoor") ||
      subSport?.toLowerCase().includes("virtual") ||
      subSport?.toLowerCase().includes("indoor"),
    );

  return {
    title: getSessionTitle(session, originalFilename),
    sport,
    sub_sport: subSport,
    start_time: startTime,
    distance_m: asNumber(session, ["totalDistance"]),
    moving_time_seconds: asNumber(session, ["totalTimerTime", "totalMovingTime"]),
    elapsed_time_seconds: asNumber(session, ["totalElapsedTime"]),
    ascenso_total: asNumber(session, ["totalAscent"]),
    descenso_total: asNumber(session, ["totalDescent"]),
    altura_min: asNumber(session, ["minAltitude", "avgAltitude"]),
    altura_max: asNumber(session, ["maxAltitude"]),
    average_speed_mps: asNumber(session, ["avgSpeed", "enhancedAvgSpeed"]),
    max_speed_mps: asNumber(session, ["maxSpeed", "enhancedMaxSpeed"]),
    average_heartrate: asNumber(session, ["avgHeartRate"]),
    max_heartrate: asNumber(session, ["maxHeartRate"]),
    training_stress_score: asNumber(session, ["trainingStressScore"]),
    intensity_factor: asNumber(session, ["intensityFactor"]),
    normalized_power: asNumber(session, ["normalizedPower"]),
    average_power: asNumber(session, ["avgPower"]),
    max_power: asNumber(session, ["maxPower"]),
    best_20min_power: asNumber(session, ["best20minPower", "bestPower20Minutes"]),
    average_cadence: asNumber(session, ["avgCadence"]),
    max_cadence: asNumber(session, ["maxCadence"]),
    total_cycles: asNumber(session, ["totalCycles"]),
    calories: asNumber(session, ["totalCalories"]),
    aerobic_training_effect: asNumber(session, ["totalTrainingEffect"]),
    anaerobic_training_effect: asNumber(session, ["totalAnaerobicTrainingEffect"]),
    temperature_min: asNumber(session, ["minTemperature"]),
    temperature_max: asNumber(session, ["maxTemperature", "avgTemperature"]),
    respiration_rate_avg: asNumber(session, ["avgRespirationRate"]),
    respiration_rate_min: asNumber(session, ["minRespirationRate"]),
    respiration_rate_max: asNumber(session, ["maxRespirationRate"]),
    is_indoor: isIndoor,
    raw_session: session,
  };
}

export function normalizeGarminFitLap(
  lap: GarminFitMessageRecord,
  lapIndex: number,
): NormalizedGarminFitLap {
  return {
    lap_index: lapIndex,
    title: asString(lap, ["lapTrigger", "messageIndex"]),
    start_time: toIsoString(pickValue(lap, ["startTime", "timestamp"])),
    total_elapsed_time_seconds: asNumber(lap, ["totalElapsedTime"]),
    total_timer_time_seconds: asNumber(lap, ["totalTimerTime"]),
    total_distance_m: asNumber(lap, ["totalDistance"]),
    total_ascent: asNumber(lap, ["totalAscent"]),
    total_descent: asNumber(lap, ["totalDescent"]),
    avg_power: asNumber(lap, ["avgPower"]),
    max_power: asNumber(lap, ["maxPower"]),
    normalized_power: asNumber(lap, ["normalizedPower"]),
    avg_heart_rate: asNumber(lap, ["avgHeartRate"]),
    max_heart_rate: asNumber(lap, ["maxHeartRate"]),
    avg_cadence: asNumber(lap, ["avgCadence"]),
    max_cadence: asNumber(lap, ["maxCadence"]),
    total_calories: asNumber(lap, ["totalCalories"]),
    intensity: asString(lap, ["intensity", "lapTrigger"]),
    raw_lap: lap,
  };
}

export function normalizeGarminFitWorkoutStep(
  step: GarminFitMessageRecord,
  stepIndex: number,
): NormalizedGarminFitWorkoutStep {
  return {
    step_index: stepIndex,
    step_type: asString(step, ["wktStepType", "stepType"]),
    step_name: asString(step, ["wktStepName", "workoutStepName"]),
    intensity: asString(step, ["intensity"]),
    duration_type: asString(step, ["durationType"]),
    duration_value: asNumber(step, ["durationValue"]),
    target_type: asString(step, ["targetType"]),
    target_value: asNumber(step, ["targetValue"]),
    custom_target_low: asNumber(step, ["customTargetValueLow"]),
    custom_target_high: asNumber(step, ["customTargetValueHigh"]),
    notes: asString(step, ["notes"]),
    raw_step: step,
  };
}

export function normalizeGarminFitMessages(
  messages: GarminFitDecodedMessages,
  originalFilename: string,
): NormalizedGarminFitData {
  const sessionRecord = messages.sessionMesgs?.[0] ?? null;

  return {
    session: sessionRecord ? normalizeGarminFitSession(sessionRecord, originalFilename) : null,
    laps: (messages.lapMesgs ?? []).map((lap, index) => normalizeGarminFitLap(lap, index)),
    steps: (messages.workoutStepMesgs ?? []).map((step, index) => normalizeGarminFitWorkoutStep(step, index)),
    records: messages.recordMesgs ?? [],
  };
}

export function buildGarminFitPreview(
  messages: GarminFitDecodedMessages,
  originalFilename: string,
): GarminFitPreviewData {
  return {
    raw: {
      session: messages.sessionMesgs?.[0] ?? null,
      laps: messages.lapMesgs ?? [],
      steps: messages.workoutStepMesgs ?? [],
      records: messages.recordMesgs ?? [],
    },
    normalized: normalizeGarminFitMessages(messages, originalFilename),
  };
}

export function buildGarminFitIngestPayload(
  messages: GarminFitDecodedMessages,
  descriptor: GarminFitFileDescriptor,
): GarminFitIngestPayload {
  const normalized = normalizeGarminFitMessages(messages, descriptor.originalFilename);

  if (!normalized.session) {
    throw new Error("El FIT no contiene una sesión de actividad compatible.");
  }

  return {
    user_id: descriptor.userId,
    file: {
      file_hash: descriptor.fileHash,
      bucket_name: descriptor.bucketName,
      storage_path: descriptor.storagePath,
      original_filename: descriptor.originalFilename,
      file_size_bytes: descriptor.fileSizeBytes,
    },
    session: normalized.session,
    laps: normalized.laps,
    steps: normalized.steps,
  };
}
