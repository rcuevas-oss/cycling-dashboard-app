export type GarminFitMessageRecord = Record<string, unknown>;

export interface GarminFitDecodedMessages {
  sessionMesgs?: GarminFitMessageRecord[];
  lapMesgs?: GarminFitMessageRecord[];
  workoutStepMesgs?: GarminFitMessageRecord[];
  recordMesgs?: GarminFitMessageRecord[];
}

export interface GarminFitFileDescriptor {
  userId?: string;
  fileHash?: string;
  bucketName?: string;
  storagePath?: string;
  originalFilename: string;
  fileSizeBytes?: number;
}

export interface NormalizedGarminFitSession {
  title: string;
  sport: string | null;
  sub_sport: string | null;
  start_time: string;
  distance_m: number | null;
  moving_time_seconds: number | null;
  elapsed_time_seconds: number | null;
  ascenso_total: number | null;
  descenso_total: number | null;
  altura_min: number | null;
  altura_max: number | null;
  average_speed_mps: number | null;
  max_speed_mps: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  training_stress_score: number | null;
  intensity_factor: number | null;
  normalized_power: number | null;
  average_power: number | null;
  max_power: number | null;
  best_20min_power: number | null;
  average_cadence: number | null;
  max_cadence: number | null;
  total_cycles: number | null;
  calories: number | null;
  aerobic_training_effect: number | null;
  anaerobic_training_effect: number | null;
  temperature_min: number | null;
  temperature_max: number | null;
  respiration_rate_avg: number | null;
  respiration_rate_min: number | null;
  respiration_rate_max: number | null;
  is_indoor: boolean;
  raw_session: GarminFitMessageRecord;
}

export interface NormalizedGarminFitLap {
  lap_index: number;
  title: string | null;
  start_time: string | null;
  total_elapsed_time_seconds: number | null;
  total_timer_time_seconds: number | null;
  total_distance_m: number | null;
  total_ascent: number | null;
  total_descent: number | null;
  avg_power: number | null;
  max_power: number | null;
  normalized_power: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_cadence: number | null;
  max_cadence: number | null;
  total_calories: number | null;
  intensity: string | null;
  raw_lap: GarminFitMessageRecord;
}

export interface NormalizedGarminFitWorkoutStep {
  step_index: number;
  step_type: string | null;
  step_name: string | null;
  intensity: string | null;
  duration_type: string | null;
  duration_value: number | null;
  target_type: string | null;
  target_value: number | null;
  custom_target_low: number | null;
  custom_target_high: number | null;
  notes: string | null;
  raw_step: GarminFitMessageRecord;
}

export interface NormalizedGarminFitData {
  session: NormalizedGarminFitSession | null;
  laps: NormalizedGarminFitLap[];
  steps: NormalizedGarminFitWorkoutStep[];
  records: GarminFitMessageRecord[];
}

export interface GarminFitIngestPayload {
  user_id?: string;
  file?: {
    file_hash?: string;
    bucket_name?: string;
    storage_path?: string;
    original_filename: string;
    file_size_bytes?: number;
  };
  session: NormalizedGarminFitSession;
  laps: NormalizedGarminFitLap[];
  steps: NormalizedGarminFitWorkoutStep[];
}

export interface GarminFitPreviewData {
  raw: {
    session: GarminFitMessageRecord | null;
    laps: GarminFitMessageRecord[];
    steps: GarminFitMessageRecord[];
    records: GarminFitMessageRecord[];
  };
  normalized: NormalizedGarminFitData;
}
