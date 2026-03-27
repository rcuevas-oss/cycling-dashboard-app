// src/lib/coach/types.ts

// --- 1. INTENT ---
export type IntentType = "GREETING" | "QA" | "ANALYZE_SESSION" | "ANALYZE_FORM" | "DATA_SCIENCE" | "PLAN_REQUEST" | "AMBIGUOUS";

export interface IntentContext {
  type: IntentType;
  requiresHistoricalData: boolean; // True for ANALYZE_SESSION, ANALYZE_FORM, PLAN_REQUEST
  targetTimeframeDays?: number;    // E.g., 7 or 14 for a plan request
  focusSessionDateStr?: string;    // E.g., "2026-03-14" if asking about a specific recent workout
}

// --- 2. TIME WINDOWS ---
export interface ChatHistoryMessage {
    role: "user" | "model";
    content: string;
}

export interface RawTimeWindows {
  recentDaysRaw: DashboardActivity[];
  baselineDaysRaw: DashboardActivity[];
  focusSessionsRaw: DashboardActivity[]; // Fixed: changed from single to array for AM/PM support
}

export interface TimeWindows {
  recentDays: ValidatedSession[];    // Used for acute load (ATL), fatigue, current state
  baselineDays: ValidatedSession[];  // Used for chronic load (CTL), typical ranges
  focusSessions: ValidatedSession[]; // Fixed: changed from single to array for AM/PM support
}

// --- 3. DATA VALIDATION (Sensor/Capture Quality) ---
export type DataQuality = "clean" | "inconclusive" | "anomalous" | "low_confidence";

export interface DashboardActivity { // Representation of DB row
  id: string;
  name?: string;
  start_date: string;
  type: string;
  distance: number;
  distance_km?: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  ascenso_total?: number;
  descenso_total?: number;
  altura_min?: number;
  altura_max?: number;
  average_speed: number;
  max_speed: number;
  velocidad_media?: number;
  velocidad_maxima?: number;
  average_heartrate: number;
  max_heartrate: number;
  fc_maxima?: number;
  suffer_score?: number;
  tss?: number;
  training_stress_score?: number;
  np?: number;
  normalized_power?: number;
  if?: number;
  potencia_media?: number;
  potencia_maxima?: number;
  potencia_20min?: number;
  cadencia_media?: number;
  cadencia_maxima?: number;
  pedaladas_totales?: number;
  te_aerobico?: number;
  temperatura_min?: number;
  temperatura_max?: number;
  resp_media?: number;
  resp_min?: number;
  resp_max?: number;
  calorias?: number;
  is_indoor?: boolean; // Manual UI override for Rodillo
  raw_data?: any; // Escape hatch for complete row access
}

export interface ValidatedSession {
  id: string;
  date: Date;
  quality: DataQuality; // Instrumentation quality
  confidenceScore: number; // 0 to 100
  exclusionReason?: string; // e.g. "Impossible power 2500W"
  raw: DashboardActivity; // Keep original data accessible
}

// --- 4. SESSION COMPARATOR ---
export type SessionArchetype = "recovery" | "endurance" | "tempo/sweetspot" | "vo2max/anaerobic" | "mixed";

export interface ComparableSessions {
  focusArchetype: SessionArchetype;
  historicalMatches: ValidatedSession[];
  comparativeDelta: {
    npDifferencePercent: number;
    hrDifferencePercent: number;
    efficiencyFactorChange: number;
  }
  sessionSummaryMarkdown: string; // Summary of the analyzed focus sessions (AM/PM)
}

// --- 5. BASELINE ENGINE ---
export interface AthleteBaseline {
  periodDays: number;
  baselineConfidence: "high" | "medium" | "low";
  archetypeMetrics: Partial<Record<SessionArchetype, {
     typical_ef: number;       // NP / Avg HR
     typical_avg_hr: number;
     typical_np: number;
  }>>;
}

// --- 6. PHYSIOLOGY ENGINE ---
export type PerformanceFlag = "normal" | "bad_day_candidate" | "strong_day_candidate" | "fatigue_suspected" | "insufficient_data";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface PhysiologicalFact {
    type: "fatigue" | "form" | "efficiency" | "anomaly";
    description: string; 
    confidence: ConfidenceLevel;
}

export interface PhysiologyAnalysis {
  performanceFlag: PerformanceFlag;
  facts: PhysiologicalFact[];
  decisions: string[];
  comparableDelta?: ComparableSessions; 
}

// --- 7. BUSINESS FALLBACK ---
export type SafeguardDirective = "PROCEED" | "ABORT_AND_REQUEST_DATA" | "FORCE_BASELINE_TESTING" | "DOWNGRADE_CONFIDENCE";

export interface SafeguardAction {
  directive: SafeguardDirective;
  fallbackReason?: string; 
  forcedMessageToUser?: string; // Text to feed LLM on ABORT
}

// --- 8. PLANNER (DEPRECATED IN COACH, NOW IN VELOFLOW) ---
// PlannedBlock removed as it is now handled by VeloFlow AI Builder

// --- 9. GENERATOR CONTEXT ---
export interface CompactSession {
    date: string;
    description: string;
}

export interface GeneratorContext {
  athleteName: string;
  athleteProfile?: any;
  fullHistoryLog?: CompactSession[];
  intent: IntentType;
  userMessage: string;
  chatHistory?: ChatHistoryMessage[]; // Conversational memory
  baseline?: AthleteBaseline;
  recentAnalysis?: PhysiologyAnalysis; 
  safeguardAction?: SafeguardAction;
}

// --- 10. OUTPUT VALIDATOR ---
export interface CoachResponseSchema {
    textMarkdown: string;       
}

// --- 11. VELOFLOW REACT FLOW TYPES ---
export type Zone = 'rest' | 'recovery' | 'endurance' | 'tempo' | 'threshold' | 'vo2max' | 'anaerobic';

export interface WorkoutStep {
  type?: 'warmup' | 'active' | 'recovery' | 'cooldown';
  name: string;
  duration: string;
  power: string;
  description?: string;
}

export interface TrainingWorkout {
  id: string; // The type id, e.g., 'endurance-2h'
  title: string;
  durationMins: number; // Duration in minutes
  intensityFactor: number; // Percentage of FTP (e.g. 0.70 for 70%)
  zone: Zone;
  description: string;
  steps?: WorkoutStep[];
  coachNote?: string;
}

export interface TrainingNodeData extends Record<string, unknown> {
  workout: TrainingWorkout;
  label: string;
}

// Global predefined library of workouts
export const WORKOUT_LIBRARY: TrainingWorkout[] = [
  {
    id: 'rest-day',
    title: 'Descanso Total',
    durationMins: 0,
    intensityFactor: 0.0,
    zone: 'rest',
    description: 'Día libre. Recuperación pasiva.',
  },
  {
    id: 'recovery-45m',
    title: 'Recovery',
    durationMins: 45,
    intensityFactor: 0.50, // Z1
    zone: 'recovery',
    description: 'Pedaleo muy suave para flujo sanguíneo.',
  },
  {
    id: 'endurance-2h',
    title: 'Fondo Z2',
    durationMins: 120,
    intensityFactor: 0.65, // Z2
    zone: 'endurance',
    description: 'Resistencia aeróbica continua (Z2).',
  },
  {
    id: 'endurance-sprints-90m',
    title: 'Fondo + Sprints',
    durationMins: 90,
    intensityFactor: 0.75, // Z2 alta por NP
    zone: 'endurance',
    description: 'Fondo Z2 con bloques de sprints cortos de 15s cada 15m.',
    steps: [
      { type: 'warmup', name: 'Calentamiento', duration: '15m', power: '55-65% FTP' },
      { type: 'active', name: 'Fondo Z2', duration: '20m', power: '65-75% FTP' },
      { type: 'active', name: 'Sprint #1 (MAX)', duration: '15s', power: 'Z7 (Max)', description: 'Esfuerzo explosivo sentado o de pie.' },
      { type: 'recovery', name: 'Recup / Fondo', duration: '15m', power: '65% FTP' },
      { type: 'active', name: 'Sprint #2 (MAX)', duration: '15s', power: 'Z7 (Max)', description: 'Esfuerzo explosivo sentado o de pie.' },
      { type: 'recovery', name: 'Recup / Fondo', duration: '15m', power: '65% FTP' },
      { type: 'active', name: 'Sprint #3 (MAX)', duration: '15s', power: 'Z7 (Max)', description: 'Esfuerzo explosivo sentado o de pie.' },
      { type: 'cooldown', name: 'Enfriamiento', duration: '10m', power: '50% FTP' }
    ]
  },
  {
    id: 'tempo-1h',
    title: 'Tempo Z3',
    durationMins: 60,
    intensityFactor: 0.82, // Z3
    zone: 'tempo',
    description: 'Intensidad moderada continua (Z3).',
  },
  {
    id: 'sweetspot-1h',
    title: 'Sweet Spot',
    durationMins: 60,
    intensityFactor: 0.88, // Z3 Alta / Z4 Baja
    zone: 'threshold', // Agrupado visualmente con el umbral
    description: 'Bloques de 10-20m justo debajo del umbral.',
  },
  {
    id: 'threshold-1h',
    title: 'Umbral Z4',
    durationMins: 60,
    intensityFactor: 0.95, // Z4
    zone: 'threshold',
    description: 'Pasadas sostenidas al umbral anaeróbico.',
  },
  {
    id: 'over-unders-1h',
    title: 'Over-Unders',
    durationMins: 60,
    intensityFactor: 0.90, // Z4 con picos Z5
    zone: 'threshold',
    description: 'Lactate clearance. Picos Z5 y valles Z4.',
  },
  {
    id: 'vo2max-1h',
    title: 'VO2 Max',
    durationMins: 60, // Aumentado a 1h (calentamiento + vo2)
    intensityFactor: 1.05, // Z5+
    zone: 'vo2max',
    description: 'Intervalos agónicos de 3-5 minutos.',
  },
  {
    id: 'anaerobic-45m',
    title: 'Microbursts',
    durationMins: 45,
    intensityFactor: 1.15, // Z6
    zone: 'anaerobic',
    description: 'Micro-intervalos (ej. 40/20s o 30/30s).',
  },
  {
    id: 'sprints-1h',
    title: 'Max Sprints',
    durationMins: 60,
    intensityFactor: 0.80, // Z7 (NP baja por mucho descanso)
    zone: 'anaerobic', // Visualmente anaeróbico
    description: 'Sprints máximos de 10-15s con mucho descanso libre.',
  },
  {
    id: 'race-day-3h',
    title: 'Carrera / Épico',
    durationMins: 180, // 3 horas
    intensityFactor: 0.85, // Genera un TSS altísimo (~215 TSS)
    zone: 'tempo', // Mezcla de todo, se tiñe de zona media/alta
    description: 'Simulación de carrera o fondo letal de fin de semana.',
  },
  {
    id: 'endurance-3h',
    title: 'Fondo Largo',
    durationMins: 180,
    intensityFactor: 0.65,
    zone: 'endurance',
    description: 'Fondo de resistencia aeróbica (Z2).',
  },
  {
    id: 'endurance-4h',
    title: 'Gran Fondo',
    durationMins: 240,
    intensityFactor: 0.65,
    zone: 'endurance',
    description: 'Fondo de larga duración para base aeróbica.',
  }
];

export interface AthleteProfile {
  name: string;
  ftp: number;
  ftpSource: 'manual' | 'data'; // Source of FTP for AI context
  weightKg: number;
  currentCtl: number;
  currentAtl: number;
  currentTsb: number;
  recentVolumeHours?: number;
  recentActivitySummary?: string;
  disciplina?: string; // Onboarding field
  objetivo?: string;   // Onboarding field
}

export interface HistoricalWorkout {
  date: string;
  tss: number;
  intensityFactor: number;
  durationMins: number;
  title: string;
}
