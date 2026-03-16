// src/lib/coach/types.ts

// --- 1. INTENT ---
export type IntentType = "GREETING" | "QA" | "ANALYZE_SESSION" | "ANALYZE_FORM" | "PLAN_REQUEST" | "AMBIGUOUS";

export interface IntentContext {
  type: IntentType;
  requiresHistoricalData: boolean; // True for ANALYZE_SESSION, ANALYZE_FORM, PLAN_REQUEST
  targetTimeframeDays?: number;    // E.g., 7 or 14 for a plan request
  focusSessionDateStr?: string;    // E.g., "2026-03-14" if asking about a specific recent workout
}

// --- 2. TIME WINDOWS ---
export interface RawTimeWindows {
  recentDaysRaw: DashboardActivity[];
  baselineDaysRaw: DashboardActivity[];
  focusSessionRaw?: DashboardActivity;
}

export interface TimeWindows {
  recentDays: ValidatedSession[];    // Used for acute load (ATL), fatigue, current state
  baselineDays: ValidatedSession[];  // Used for chronic load (CTL), typical ranges
  focusSession?: ValidatedSession;   // If "How did I do today?"
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
  average_speed: number;
  max_speed: number;
  average_heartrate: number;
  max_heartrate: number;
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
  fc_maxima?: number;
  te_aerobico?: number;
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
}

// --- 7. BUSINESS FALLBACK ---
export type SafeguardDirective = "PROCEED" | "ABORT_AND_REQUEST_DATA" | "FORCE_BASELINE_TESTING" | "DOWNGRADE_CONFIDENCE";

export interface SafeguardAction {
  directive: SafeguardDirective;
  fallbackReason?: string; 
  forcedMessageToUser?: string; // Text to feed LLM on ABORT
}

// --- 8. PLANNER ---
export interface PlannedBlock {
    date: string;
    block_id: string;
}

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
  baseline?: AthleteBaseline;
  recentAnalysis?: PhysiologyAnalysis; 
  proposedPlan?: PlannedBlock[] | null; 
  safeguardAction?: SafeguardAction;
}

// --- 10. OUTPUT VALIDATOR ---
export interface CoachResponseSchema {
    textMarkdown: string;       
    generatedPlan?: PlannedBlock[] | null;        
}
