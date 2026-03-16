import { DashboardActivity, IntentContext, RawTimeWindows } from "../types";

const RECENT_WINDOW_DAYS = 14; 
const BASELINE_WINDOW_DAYS = 90;

/**
 * Slices the raw database activities into strictly isolated timeframes.
 * @param rawActivities All activities fetched from the database, ideally sorted newest first.
 * @param intentCtx The intent context to determine if a focus session is needed.
 * @returns RawTimeWindows separated into recent, baseline, and optional focus session.
 */
export function resolveTimeWindows(
  rawActivities: DashboardActivity[],
  intentCtx: IntentContext
): RawTimeWindows {
  const now = new Date();
  const recentThreshold = new Date(now);
  recentThreshold.setDate(now.getDate() - RECENT_WINDOW_DAYS);

  const baselineThreshold = new Date(now);
  baselineThreshold.setDate(now.getDate() - BASELINE_WINDOW_DAYS);

  const baselineDaysRaw: DashboardActivity[] = [];
  const recentDaysRaw: DashboardActivity[] = [];
  let focusSessionRaw: DashboardActivity | undefined;

  // We assume rawActivities are sorted descending by date, but we don't strictly rely on it.
  for (const activity of rawActivities) {
    if (!activity.start_date) continue; // Skip invalid rows
    
    const activityDate = new Date(activity.start_date);

    // Filter by baseline period (e.g. last 90 days)
    if (activityDate >= baselineThreshold) {
      baselineDaysRaw.push(activity);
    }

    // Filter by recent period (e.g. last 14 days)
    if (activityDate >= recentThreshold) {
      recentDaysRaw.push(activity);
    }

    // Find focus session if the intent specifically asked for it
    if (
      intentCtx.type === "ANALYZE_SESSION" &&
      intentCtx.focusSessionDateStr
    ) {
      // Very simple matching by YYYY-MM-DD
      const activityDateStr = activity.start_date.split("T")[0];
      if (activityDateStr === intentCtx.focusSessionDateStr) {
        // If multiple exist (e.g., morning and evening ride on the same day), 
        // we might grab the first one or longest one. Currently taking the first match.
        if (!focusSessionRaw) {
            focusSessionRaw = activity;
        } else if (activity.elapsed_time > focusSessionRaw.elapsed_time) {
            // Favor the longer ride if multiple on the same day
            focusSessionRaw = activity;
        }
      }
    }
  }

  return {
    recentDaysRaw,
    baselineDaysRaw,
    focusSessionRaw,
  };
}
