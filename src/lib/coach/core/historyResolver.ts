import { DashboardActivity, IntentContext, RawTimeWindows } from "../types";
import { getActivityLocalDate } from "../../metricsUtils";

const RECENT_WINDOW_DAYS = 14; 
const BASELINE_WINDOW_DAYS = 90;

// Helper: YYYY-MM-DD string for a Date object in local time
function localDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Slices the raw database activities into strictly isolated timeframes.
 * Uses string-based date comparisons (YYYY-MM-DD) in local time to avoid
 * UTC shifts that cause off-by-one-day errors for users in Chile (UTC-3).
 */
export function resolveTimeWindows(
  rawActivities: DashboardActivity[],
  intentCtx: IntentContext
): RawTimeWindows {
  const now = new Date();

  // Build YYYY-MM-DD boundary strings in local time
  const recentThresholdDate = new Date(now);
  recentThresholdDate.setDate(now.getDate() - RECENT_WINDOW_DAYS);
  const recentThreshold = localDateStr(recentThresholdDate);

  const baselineThresholdDate = new Date(now);
  baselineThresholdDate.setDate(now.getDate() - BASELINE_WINDOW_DAYS);
  const baselineThreshold = localDateStr(baselineThresholdDate);

  const baselineDaysRaw: DashboardActivity[] = [];
  const recentDaysRaw: DashboardActivity[] = [];
  const focusSessionsRaw: DashboardActivity[] = [];

  for (const activity of rawActivities) {
    if (!activity.start_date) continue; // Skip invalid rows

    // Convert to local date string (handles both "2026-03-18" and "2026-03-19T01:02:39+00:00")
    const actLocalDate = getActivityLocalDate(activity.start_date);

    // Filter by baseline period (e.g. last 90 days)
    if (actLocalDate >= baselineThreshold) {
      baselineDaysRaw.push(activity);
    }

    // Filter by recent period (e.g. last 14 days)
    if (actLocalDate >= recentThreshold) {
      recentDaysRaw.push(activity);
    }

    // Find focus sessions if the intent specifically asked for it
    if (
      intentCtx.type === "ANALYZE_SESSION" &&
      intentCtx.focusSessionDateStr
    ) {
      // Compare local date directly — fixes the UTC off-by-one-day bug
      if (actLocalDate === intentCtx.focusSessionDateStr) {
        focusSessionsRaw.push(activity);
      }
    }
  }

  return {
    recentDaysRaw,
    baselineDaysRaw,
    focusSessionsRaw,
  };
}
