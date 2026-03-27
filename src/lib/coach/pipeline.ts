import { CoachResponseSchema, DashboardActivity } from "./types";
import { detectIntent } from "./ai/intentRouter";
import { resolveTimeWindows } from "./core/historyResolver";
import { executeDataValidation } from "./core/dataValidator";
import { buildAthleteBaseline } from "./core/baselineEngine";
import { findComparableSessions } from "./core/sessionComparator";
import { buildFullHistoryLog } from "./core/utils";
import { evaluatePhysiology } from "./core/physiologyEngine";
import { evaluateSafeguards } from "./core/businessFallback";
import { draftFinalResponse } from "./ai/responseGenerator";
import { getActivityLocalDate } from "../metricsUtils";

// Helper: build a local-time Date from a start_date field (avoids UTC shift)
function buildLocalDate(dateField: string): Date {
  const localStr = getActivityLocalDate(dateField);
  return new Date(localStr + 'T12:00:00');
}

/**
 * The Master Entry Point for the Advanced Coach AI.
 * Replaces the monolithic gemini.ts.
 */
export async function runCoachPipeline(
  apiKey: string,
  userMessage: string,
  profile: any,
  rawActivities: DashboardActivity[],
  chatHistory: {role: "user" | "model", content: string}[] = [] // Injected Conversational Memory
): Promise<CoachResponseSchema> {
  console.log("[COACH PIPELINE] Started processing request...");

  try {
    // 1. INTENT ROUTER
    const intentCtx = await detectIntent(apiKey, userMessage);
    console.log("[COACH PIPELINE] Intent detected:", intentCtx.type);

    // Fast path: if no historical data needed, skip to response generator
    if (!intentCtx.requiresHistoricalData) {
      const fullHistoryLog = buildFullHistoryLog(
          rawActivities.slice(0, 90).map(a => ({ id: a.id, date: buildLocalDate(a.start_date), quality: "clean" as const, confidenceScore: 100, raw: a }))
      );
      return await draftFinalResponse(apiKey, {
        athleteName: profile?.nombre || "Atleta",
        athleteProfile: profile,
        fullHistoryLog,
        intent: intentCtx.type,
        userMessage,
        chatHistory
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
    if (intentCtx.type === "ANALYZE_SESSION" && validWindows.focusSessions.length > 0) {
       comparableDelta = findComparableSessions(validWindows.focusSessions, validWindows.baselineDays);
    }
    const analysis = evaluatePhysiology(validWindows.recentDays, baseline, comparableDelta);
    console.log("[COACH PIPELINE] Physiology evaluated. Flag:", analysis.performanceFlag);

    // 7. BUSINESS FALLBACK LAYER
    const safeguard = evaluateSafeguards(baseline, analysis, intentCtx);
    console.log("[COACH PIPELINE] Safeguard directive:", safeguard.directive);

    // 8. PLANNER ENGINE REMOVED - Logic moved to VeloFlow AI Builder
    // The coach now focuses strictly on analysis and response.

    // 9. RESPONSE GENERATOR
    const fullHistoryLog = buildFullHistoryLog(validWindows.baselineDays);

    return await draftFinalResponse(apiKey, {
        athleteName: profile?.nombre || "Atleta",
        athleteProfile: profile,
        fullHistoryLog,
        intent: intentCtx.type,
        userMessage,
        chatHistory,
        baseline,
        recentAnalysis: analysis,
        safeguardAction: safeguard
    });

  } catch (error) {
     console.error("[COACH PIPELINE] Pipeline crashed:", error);
     return {
         textMarkdown: "He experimentado un colapso en mi motor analítico. Los engranajes dejaron de girar. ¿Puedes reformular tu consulta por favor?"
     };
  }
}
