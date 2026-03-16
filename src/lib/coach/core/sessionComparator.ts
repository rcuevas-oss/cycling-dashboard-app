import { ComparableSessions, ValidatedSession } from "../types";
import { classifyArchetype } from "./utils";

/**
 * Matches a focus session against historical sessions of the same archetype
 * to calculate relative performance changes (apples to apples).
 */
export function findComparableSessions(
  focusSession: ValidatedSession,
  baselineDays: ValidatedSession[]
): ComparableSessions {
  const focusArchetype = classifyArchetype(focusSession);

  // Find all historically valid sessions that match the same archetype
  const historicalMatches = baselineDays.filter(
    (s) => 
      (s.quality === "clean" || s.quality === "low_confidence") && 
      classifyArchetype(s) === focusArchetype &&
      s.id !== focusSession.id // Don't compare with itself
  );

  let npDifferencePercent = 0;
  let hrDifferencePercent = 0;
  let efficiencyFactorChange = 0;

  if (historicalMatches.length > 0) {
    let sumHistoricalNP = 0;
    let sumHistoricalHR = 0;
    let sumHistoricalEF = 0;
    let countNP = 0;
    let countHR = 0;
    let countEF = 0;

    for (const match of historicalMatches) {
      const np = match.raw.np || match.raw.potencia_media || 0;
      const hr = match.raw.average_heartrate || 0;

      if (np > 0) { sumHistoricalNP += np; countNP++; }
      if (hr > 0) { sumHistoricalHR += hr; countHR++; }
      if (np > 0 && hr > 0) { sumHistoricalEF += (np / hr); countEF++; }
    }

    const avgHistoricalNP = countNP > 0 ? sumHistoricalNP / countNP : 0;
    const avgHistoricalHR = countHR > 0 ? sumHistoricalHR / countHR : 0;
    const avgHistoricalEF = countEF > 0 ? sumHistoricalEF / countEF : 0;

    const currentNP = focusSession.raw.np || focusSession.raw.potencia_media || 0;
    const currentHR = focusSession.raw.average_heartrate || 0;
    const currentEF = (currentNP > 0 && currentHR > 0) ? (currentNP / currentHR) : 0;

    if (avgHistoricalNP > 0 && currentNP > 0) {
      npDifferencePercent = ((currentNP - avgHistoricalNP) / avgHistoricalNP) * 100;
    }
    
    if (avgHistoricalHR > 0 && currentHR > 0) {
      hrDifferencePercent = ((currentHR - avgHistoricalHR) / avgHistoricalHR) * 100;
    }

    // EF change is absolute ratio difference. Positive means better efficiency (more power per beat)
    if (avgHistoricalEF > 0 && currentEF > 0) {
      efficiencyFactorChange = currentEF - avgHistoricalEF;
    }
  }

  return {
    focusArchetype,
    historicalMatches,
    comparativeDelta: {
      npDifferencePercent,
      hrDifferencePercent,
      efficiencyFactorChange
    }
  };
}
