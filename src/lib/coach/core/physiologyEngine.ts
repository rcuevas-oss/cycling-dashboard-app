import { 
  AthleteBaseline, 
  ComparableSessions, 
  ConfidenceLevel, 
  PerformanceFlag, 
  PhysiologicalFact, 
  PhysiologyAnalysis, 
  ValidatedSession 
} from "../types";

/**
 * Cross-references valid sessions and comparables against the baseline 
 * to deduce fatigue, form, and aerobic decoupling.
 */
export function evaluatePhysiology(
  recentDays: ValidatedSession[],
  baseline: AthleteBaseline,
  focusSessionDelta?: ComparableSessions
): PhysiologyAnalysis {
  let performanceFlag: PerformanceFlag = "normal";
  const facts: PhysiologicalFact[] = [];
  const decisions: string[] = [];
  
  // Base Confidence from the baseline itself
  let analysisConfidence: ConfidenceLevel = baseline.baselineConfidence;

  if (analysisConfidence === "low" || recentDays.length === 0) {
     return {
         performanceFlag: "insufficient_data",
         facts: [{
             type: "anomaly",
             description: "No hay suficientes datos recientes o históricos para evaluar fisiología con certeza.",
             confidence: "low"
         }],
         decisions: ["Requerir consistencia en el registro de datos antes de generar métricas avanzadas."]
     };
  }

  // 1. Fatigue / Form Analysis (Approximation from Recent Load)
  let recentTSS = 0;
  for (const session of recentDays) {
     recentTSS += (session.raw.tss || 0);
  }
  
  // Heuristic: If they've done > 400 TSS in the last 7 days, they are probably fatigued
  // (In a real app, we use exponentially weighted ATL/CTL from the database).
  if (recentTSS > 400) {
      performanceFlag = "fatigue_suspected";
      facts.push({
          type: "fatigue",
          description: `Carga aguda muy alta (${recentTSS.toFixed(0)} TSS acumulados recientemente). Riesgo de sobre-entrenamiento si no se descansa.`,
          confidence: "medium"
      });
      decisions.push("Se limitará la intensidad las próximas 48h (Asignar Recuperación o Z1)");
  } else if (recentTSS < 150) {
      facts.push({
          type: "form",
          description: `Carga aguda baja (${recentTSS.toFixed(0)} TSS). El atleta debería estar fresco.`,
          confidence: "high"
      });
  }

  // 2. Efficiency & Performance Flags (If a focus session is provided)
  if (focusSessionDelta) {
      const delta = focusSessionDelta.comparativeDelta;
      
      // Decoupling / Efficiency drop (EF dropped significantly while NP was similar or lower)
      if (delta.efficiencyFactorChange < -0.1 && delta.hrDifferencePercent > 5) {
          facts.push({
              type: "efficiency",
              description: `Posible desacople aeróbico o sobreesfuerzo orgánico. Para el mismo tipo de sesión sostenida, el pulso subió un ${delta.hrDifferencePercent.toFixed(1)}% pero la eficiencia cayó.`,
              confidence: delta.hrDifferencePercent > 10 ? "high" : "medium"
          });
          performanceFlag = "bad_day_candidate";
          decisions.push("Considerar la última sesión como ineficiente. Añadir descanso visual al análisis.");
      }
      
      // Strong Day Candidate
      if (delta.efficiencyFactorChange > 0.05 && delta.npDifferencePercent > 5) {
          facts.push({
              type: "form",
              description: `Gran desempeño: La potencia normalizada fue ${delta.npDifferencePercent.toFixed(1)}% superior a sesiones similares históricas, manteniendo buena eficiencia.`,
              confidence: "high"
          });
          performanceFlag = "strong_day_candidate";
      }
  }

  // Ensure fallback state if nothing was flagged
  if (facts.length === 0) {
      facts.push({
          type: "form",
          description: "Rendimiento estable. Las métricas recientes no muestran desviaciones significativas de la línea base.",
          confidence: analysisConfidence
      });
      decisions.push("Mantener progresión actual.");
  }

  return {
      performanceFlag,
      facts,
      decisions
  };
}
