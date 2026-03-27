import { 
  DashboardActivity, 
  DataQuality, 
  RawTimeWindows, 
  TimeWindows, 
  ValidatedSession 
} from "../types";
import { getActivityLocalDate } from "../../metricsUtils";

/**
 * Builds a local-time Date from an activity_date/start_date field.
 * Avoids UTC shift: a 22:00 Chile activity stored as next-day UTC
 * would otherwise appear on the wrong day.
 */
function buildLocalDate(dateField: string): Date {
  const localStr = getActivityLocalDate(dateField);
  // Use noon local time to avoid DST edge cases at midnight
  return new Date(localStr + 'T12:00:00');
}

/**
 * Validates a single dashboard activity based on mechanical/sensor limits.
 * Does NOT evaluate human performance (e.g. "did you do well?").
 * Evaluates: "Did the Garmin fail?"
 */
function validateActivity(raw: DashboardActivity): ValidatedSession {
  let quality: DataQuality = "clean";
  let confidenceScore = 100;
  let exclusionReason = "";

  // 1. Check for missing critical data
  // moving_time is in SECONDS (confirmed by sessionComparator dividing by 60).
  // Less than 300 seconds = less than 5 minutes → skip warm-up artifacts.
  if (!raw.moving_time || raw.moving_time < 300) {
    quality = "inconclusive";
    confidenceScore = 0;
    exclusionReason = "Duración demasiado corta (< 5 min)";
    return { id: raw.id, date: buildLocalDate(raw.start_date), quality, confidenceScore, exclusionReason, raw };
  }

  // 2. Check for impossible sensor readings (Anomalous)
  if (raw.max_heartrate && raw.max_heartrate > 220) {
    quality = "anomalous";
    confidenceScore = 20;
    exclusionReason = "Frecuencia Cardíaca Máxima irreal (> 220 bpm)";
  } else if (raw.max_speed && raw.max_speed > 35) { // 35 m/s = ~126 km/h
    if (raw.average_speed > 25) { // Avg > 90km/h is definitely a car/GPS error
       quality = "anomalous";
       confidenceScore = 10;
       exclusionReason = "Velocidad promedio irreal (> 90 km/h). Posible GPS en auto.";
    }
  } else if (raw.potencia_maxima && raw.potencia_maxima > 2500) {
    quality = "anomalous";
    confidenceScore = 30;
    exclusionReason = "Pico de potencia irreal (> 2500W). Posible error de potenciómetro.";
  }

  // 3. Check for low confidence data (e.g. huge pauses, elapsed time >>> moving time)
  if (quality === "clean") {
    const activeRatio = raw.elapsed_time ? raw.moving_time / raw.elapsed_time : 1;
    if (activeRatio < 0.5) {
      quality = "low_confidence";
      confidenceScore = 50;
      exclusionReason = "Demasiado tiempo pausado (Ratio en movimiento < 50%)";
    }
  }

  return {
    id: raw.id,
    date: buildLocalDate(raw.start_date),  // Local time to avoid UTC shift
    quality,
    confidenceScore,
    exclusionReason: exclusionReason || undefined,
    raw
  };
}

/**
 * Converts raw time windows into validated time windows, 
 * attaching a quality flag and confidence rating to each session.
 */
export function executeDataValidation(rawWindows: RawTimeWindows): TimeWindows {
  const recentDays = rawWindows.recentDaysRaw.map(validateActivity);
  const baselineDays = rawWindows.baselineDaysRaw.map(validateActivity);
  const focusSessions = rawWindows.focusSessionsRaw.map(validateActivity);

  return {
    recentDays,
    baselineDays,
    focusSessions
  };
}
