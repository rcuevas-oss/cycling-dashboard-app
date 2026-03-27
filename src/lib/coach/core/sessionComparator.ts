import { ComparableSessions, ValidatedSession } from "../types";
import { classifyArchetype } from "./utils";

/**
 * Matches a focus session against historical sessions of the same archetype
 * to calculate relative performance changes (apples to apples).
 */
export function findComparableSessions(
  focusSessions: ValidatedSession[],
  baselineDays: ValidatedSession[]
): ComparableSessions {
  // DESIGN-3 fix: For AM/PM double days, use the session with highest TSS as the
  // representative, NOT the average. Averaging a recovery + VO2max session would give
  // a misleading 'tempo' archetype and skew the baseline comparison.
  const representativeSession = focusSessions.reduce((best, s) => {
    const tss = (s.raw.tss || s.raw.training_stress_score || 0);
    const bestTss = (best.raw.tss || best.raw.training_stress_score || 0);
    return tss > bestTss ? s : best;
  }, focusSessions[0]);

  const focusArchetype = classifyArchetype(representativeSession);
  const representativeNP = representativeSession.raw.np || representativeSession.raw.normalized_power || representativeSession.raw.potencia_media || 0;
  const representativeHR = representativeSession.raw.average_heartrate || 0;

  // Find all historically valid sessions that match the same archetype
  const historicalMatches = baselineDays.filter(
    (s) => 
      (s.quality === "clean" || s.quality === "low_confidence") && 
      classifyArchetype(s) === focusArchetype &&
      !focusSessions.some(fs => fs.id === s.id)
  );

  let npDifferencePercent = 0;
  let hrDifferencePercent = 1; // Default neutral
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

    const currentNP = representativeNP;
    const currentHR = representativeHR;
    const currentEF = (currentNP > 0 && currentHR > 0) ? (currentNP / currentHR) : 0;

    if (avgHistoricalNP > 0 && currentNP > 0) {
      npDifferencePercent = ((currentNP - avgHistoricalNP) / avgHistoricalNP) * 100;
    }
    
    if (avgHistoricalHR > 0 && currentHR > 0) {
      hrDifferencePercent = ((currentHR - avgHistoricalHR) / avgHistoricalHR) * 100;
    }

    if (avgHistoricalEF > 0 && currentEF > 0) {
      efficiencyFactorChange = currentEF - avgHistoricalEF;
    }
  }

  // Build a summary markdown for the AM/PM sessions
  let summary = "";
  if (focusSessions.length > 1) {
      summary = `Detectadas **${focusSessions.length} sesiones** para este día:\n`;
      focusSessions.forEach((s, i) => {
          const mins = Math.round((s.raw.moving_time || 0) / 60);
          summary += `- Sesión ${i+1}: ${s.raw.name || "Actividad"} (${mins} min, ${Math.round(s.raw.tss || 0)} TSS)\n`;
      });
  } else if (focusSessions.length === 1) {
      const s = focusSessions[0];
      const mins = Math.round((s.raw.moving_time || 0) / 60);
      summary = `Análisis de sesión única: **${s.raw.name || "Actividad"}** (${mins} min, ${Math.round(s.raw.tss || 0)} TSS).`;
  }

  return {
    focusArchetype,
    historicalMatches,
    comparativeDelta: {
      npDifferencePercent,
      hrDifferencePercent,
      efficiencyFactorChange
    },
    sessionSummaryMarkdown: summary
  };
}
