import { 
  AthleteBaseline, 
  IntentContext, 
  PhysiologyAnalysis, 
  SafeguardAction 
} from "../types";

/**
 * The Safety Layer. Acts before the LLM or Planner get a chance to hallucinate.
 * Evaluates the confidence of the data and physiological facts,
 * degrading or aborting the request if it's unsafe.
 */
export function evaluateSafeguards(
  baseline: AthleteBaseline,
  analysis: PhysiologyAnalysis | null,
  intentCtx: IntentContext
): SafeguardAction {

  // Safeguards only matter if we are trying to analyze or plan based on history
  if (!intentCtx.requiresHistoricalData) {
      return { directive: "PROCEED" };
  }

  // 1. Data Poverty: If the user simply doesn't have enough history
  if (baseline.periodDays < 7 && intentCtx.type === "PLAN_REQUEST") {
      return {
          directive: "ABORT_AND_REQUEST_DATA",
          fallbackReason: "Atleta con menos de 7 días de historial intentando generar un plan completo.",
          forcedMessageToUser: "Necesito recopilar más datos sobre tu rendimiento (idealmente un par de semanas de entrenamientos consistentes) antes de poder diseñar un plan a medida seguro para ti. ¡Sigue pedaleando y subiendo tus métricas!"
      }
  }

  if (analysis) {
      // 2. High Fatigue Override: If the physiology engine screams fatigue
      if (analysis.performanceFlag === "fatigue_suspected") {
          // If asking for a plan, we can't abort, but we can force it to be gentle
          if (intentCtx.type === "PLAN_REQUEST") {
              return {
                  directive: "DOWNGRADE_CONFIDENCE",
                  fallbackReason: "Alta fatiga detectada. Forzando plan restrictivo.",
                  forcedMessageToUser: "Veo métricas de fatiga elevadas en tus recientes salidas. El plan que he estructurado limitará la intensidad para priorizar tu recuperación."
              }
          }
      }

      // 3. Low Confidence / Insufficient Data override
      if (analysis.performanceFlag === "insufficient_data") {
          return {
              directive: "FORCE_BASELINE_TESTING",
              fallbackReason: "Análisis fisiológico falló por falta de datos, sugiriendo Test FTP en su lugar.",
              forcedMessageToUser: "Tus datos recientes son inconsistentes o muy escasos para evaluar tu estado de forma o generar un plan avanzado. Te sugiero que hagamos un Test de FTP primero para calibrar tus zonas y luego armamos la temporada."
          }
      }
  }

  return { directive: "PROCEED" };
}
