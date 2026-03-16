import { AthleteBaseline, SessionArchetype, ValidatedSession } from "../types";
import { classifyArchetype } from "./utils";

/**
 * Builds the user's historical baseline from valid past sessions.
 */
export function buildAthleteBaseline(baselineDays: ValidatedSession[]): AthleteBaseline {
  // Filter out anomalies
  const validSessions = baselineDays.filter(
    s => s.quality === "clean" || s.quality === "low_confidence"
  );

  let confidence: "high" | "medium" | "low" = "low";
  if (validSessions.length > 20) confidence = "high";
  else if (validSessions.length > 5) confidence = "medium";

  // Calculate period days between oldest and newest
  let periodDays = 0;
  if (validSessions.length > 1) {
    const dates = validSessions.map(s => s.date.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    periodDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  } else if (validSessions.length === 1) {
    periodDays = 1;
  }

  // Bucket sessions by archetype
  const grouped: Record<string, ValidatedSession[]> = {};
  for (const session of validSessions) {
    const archetype = classifyArchetype(session);
    if (!grouped[archetype]) grouped[archetype] = [];
    grouped[archetype].push(session);
  }

  const archetypeMetrics: AthleteBaseline["archetypeMetrics"] = {};

  // Calculate averages per archetype
  for (const [arch, sessions] of Object.entries(grouped)) {
    const archetype = arch as SessionArchetype;
    let sumEF = 0;
    let sumHR = 0;
    let sumNP = 0;
    let countEF = 0;
    let countHR = 0;
    let countNP = 0;

    for (const s of sessions) {
      const hr = s.raw.average_heartrate || 0;
      const np = s.raw.np || s.raw.potencia_media || 0;

      if (hr > 0 && np > 0) {
        sumEF += np / hr;
        countEF++;
      }
      if (hr > 0) {
        sumHR += hr;
        countHR++;
      }
      if (np > 0) {
        sumNP += np;
        countNP++;
      }
    }

    archetypeMetrics[archetype] = {
      typical_ef: countEF > 0 ? sumEF / countEF : 0,
      typical_avg_hr: countHR > 0 ? sumHR / countHR : 0,
      typical_np: countNP > 0 ? sumNP / countNP : 0,
    };
  }

  return {
    periodDays,
    baselineConfidence: confidence,
    archetypeMetrics
  };
}
