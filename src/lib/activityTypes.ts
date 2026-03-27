export interface ActivitySummary {
  id: string;
  user_id?: string;
  file_id?: string;
  file_name?: string;
  title?: string;
  name?: string;
  titulo?: string;
  type?: string;
  activity_date: string;
  start_date?: string;
  date?: string;
  distance_km?: number;
  distance?: number;
  duration_minutes?: number;
  duration?: number;
  moving_time?: number;
  elapsed_time?: number;
  tiempo?: string;
  tiempo_movimiento?: string;
  tiempo_transcurrido?: string;
  total_elevation_gain?: number;
  ascenso_total?: number;
  descenso_total?: number;
  altura_min?: number;
  altura_max?: number;
  sport?: string;
  sub_sport?: string;
  average_speed?: number;
  max_speed?: number;
  velocidad_media?: number;
  velocidad_maxima?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  fc_media?: number;
  fc_maxima?: number;
  training_stress_score?: number;
  tss?: number;
  normalized_power?: number;
  np?: number;
  if?: number;
  intensity_factor?: number;
  average_power?: number;
  average_watts?: number;
  max_watts?: number;
  potencia_media?: number;
  potencia_maxima?: number;
  potencia_20min?: number;
  cadencia_media?: number;
  cadencia_maxima?: number;
  pedaladas_totales?: number;
  calorias?: number;
  te_aerobico?: number;
  te_anaerobico?: number;
  temperatura_min?: number;
  temperatura_max?: number;
  resp_media?: number;
  resp_min?: number;
  resp_max?: number;
  numero_vueltas?: number;
  is_indoor?: boolean;
  raw_data?: unknown;
}

export interface UserIngestionState {
  user_id: string;
  requires_fit_resync: boolean;
  first_fit_synced_at: string | null;
  migration_notice_dismissed_at: string | null;
}

export interface FitIngestResponse {
  session_id: string | null;
  status: "inserted" | "duplicate";
  laps_inserted: number;
  steps_inserted: number;
  file_name?: string;
  activity_date?: string | null;
}

export interface FitBatchItemResult {
  file_name: string;
  status: "inserted" | "duplicate" | "skipped_old" | "failed";
  session_id: string | null;
  activity_date?: string | null;
  laps_inserted?: number;
  steps_inserted?: number;
  reason?: string;
}

export interface FitBatchIngestResponse {
  selected_files: number;
  eligible_files: number;
  inserted: number;
  duplicates: number;
  skipped_old: number;
  failed: number;
  results: FitBatchItemResult[];
}
