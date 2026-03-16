import { CoachResponseSchema, DashboardActivity } from "./types";
import { detectIntent } from "./ai/intentRouter";
import { resolveTimeWindows } from "./core/historyResolver";
import { executeDataValidation } from "./core/dataValidator";
import { buildAthleteBaseline } from "./core/baselineEngine";
import { findComparableSessions } from "./core/sessionComparator";
import { buildFullHistoryLog } from "./core/utils";
import { evaluatePhysiology } from "./core/physiologyEngine";
import { evaluateSafeguards } from "./core/businessFallback";
import { draftSchedule } from "./core/plannerEngine";
import { draftFinalResponse } from "./ai/responseGenerator";

/**
 * The Master Entry Point for the Advanced Coach AI.
 * Replaces the monolithic gemini.ts.
 */
export async function runCoachPipeline(
  apiKey: string,
  userMessage: string,
  profile: any,
  rawActivities: DashboardActivity[]
): Promise<CoachResponseSchema> {
  console.log("[COACH PIPELINE] Started processing request...");

  try {
    // 1. INTENT ROUTER
    const intentCtx = await detectIntent(apiKey, userMessage);
    console.log("[COACH PIPELINE] Intent detected:", intentCtx.type);

    // Fast path: if no historical data needed, skip to response generator
    if (!intentCtx.requiresHistoricalData) {
      const fullHistoryLog = buildFullHistoryLog(
          rawActivities.slice(0, 90).map(a => ({ id: a.id, date: new Date(a.start_date), quality: "clean", confidenceScore: 100, raw: a }))
      );
      return await draftFinalResponse(apiKey, {
        athleteName: profile?.nombre || "Atleta",
        athleteProfile: profile,
        fullHistoryLog,
        intent: intentCtx.type,
        userMessage
      });
    }

    // 2. HISTORY RESOLVER
    const rawWindows = resolveTimeWindows(rawActivities, intentCtx);

    // 3. DATA VALIDATOR
    const validWindows = executeDataValidation(rawWindows);

    // 4. BASELINE ENGINE
    const baseline = buildAthleteBaseline(validWindows.baselineDays);

    // 5. SESSION COMPARATOR & 6. PHYSIOLOGY ENGINE
    let comparableDelta;
    if (intentCtx.type === "ANALYZE_SESSION" && validWindows.focusSession) {
       comparableDelta = findComparableSessions(validWindows.focusSession, validWindows.baselineDays);
    }
    const analysis = evaluatePhysiology(validWindows.recentDays, baseline, comparableDelta);
    console.log("[COACH PIPELINE] Physiology evaluated. Flag:", analysis.performanceFlag);

    // 7. BUSINESS FALLBACK LAYER
    const safeguard = evaluateSafeguards(baseline, analysis, intentCtx);
    console.log("[COACH PIPELINE] Safeguard directive:", safeguard.directive);

    // 8. PLANNER ENGINE (Only runs if PLAN_REQUEST and safeguard allows it)
    const proposedPlan = draftSchedule(
        intentCtx, 
        analysis, 
        safeguard, 
        profile?.disponibilidad || "Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo"
    );

    // 9. RESPONSE GENERATOR
    const fullHistoryLog = buildFullHistoryLog(validWindows.baselineDays);

    return await draftFinalResponse(apiKey, {
        athleteName: profile?.nombre || "Atleta",
        athleteProfile: profile,
        fullHistoryLog,
        intent: intentCtx.type,
        userMessage,
        baseline,
        recentAnalysis: analysis,
        proposedPlan,
        safeguardAction: safeguard
    });

  } catch (error) {
     console.error("[COACH PIPELINE] Pipeline crashed:", error);
     return {
         textMarkdown: "He experimentado un colapso en mi motor analítico. Los engranajes dejaron de girar. ¿Puedes reformular tu consulta por favor?",
         generatedPlan: null
     };
  }
}
