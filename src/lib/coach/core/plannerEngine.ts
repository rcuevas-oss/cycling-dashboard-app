import { 
  IntentContext, 
  PhysiologyAnalysis, 
  PlannedBlock, 
  SafeguardAction 
} from "../types";

// A very naive day parser. Real world would use better NLP or structured UI inputs.
const dayMap: Record<string, number> = {
  "domingo": 0, "lunes": 1, "martes": 2, "miercoles": 3, "miércoles": 3,
  "jueves": 4, "viernes": 5, "sabado": 6, "sábado": 6
};

function parseAvailability(availabilityStr: string): number[] {
  const norm = availabilityStr.toLowerCase();
  const days: number[] = [];
  for (const [dayName, dayIndex] of Object.entries(dayMap)) {
      if (norm.includes(dayName)) {
          days.push(dayIndex);
      }
  }
  return days.length > 0 ? Array.from(new Set(days)) : [0, 1, 2, 3, 4, 5, 6]; // Default to all if empty
}

/**
 * Builds a deterministic training schedule. 
 * Respects safeguards, physiological state, and user availability.
 */
export function draftSchedule(
  intentCtx: IntentContext,
  analysis: PhysiologyAnalysis | null,
  safeguard: SafeguardAction,
  availability: string
): PlannedBlock[] | null {

  // We only plan if requested
  if (intentCtx.type !== "PLAN_REQUEST") {
      return null;
  }

  // If the safety layer aborted planning completely
  if (safeguard.directive === "ABORT_AND_REQUEST_DATA" || safeguard.directive === "FORCE_BASELINE_TESTING") {
      return null;
  }

  const daysAvailable = parseAvailability(availability);
  const targetDays = intentCtx.targetTimeframeDays || 7;
  
  const schedule: PlannedBlock[] = [];
  const today = new Date();
  
  let isFatigued = safeguard.directive === "DOWNGRADE_CONFIDENCE" || 
                   (analysis && analysis.performanceFlag === "fatigue_suspected");

  // Iterate over the next X days
  for (let i = 0; i < targetDays; i++) {
      const cursorDate = new Date(today);
      cursorDate.setDate(today.getDate() + i);
      
      const dayOfWeek = cursorDate.getDay();
      const dateStr = cursorDate.toISOString().split("T")[0];

      // Is the user available on this day?
      if (!daysAvailable.includes(dayOfWeek)) {
          continue; // Skip, they don't train today
      }

      let assignedBlock = "b-base-std";

      // If fatigued, force recovery for the first two available days
      if (isFatigued) {
          assignedBlock = "b-recovery";
          if (schedule.length >= 1) {
             // After a couple of recovery days, assume they can do base
             isFatigued = false; 
          }
      } else {
          // Simple heuristic: weekends get long rides, weekdays get sweetspot or base
          if (dayOfWeek === 0 || dayOfWeek === 6) {
              assignedBlock = "b-base-long";
          } else if (schedule.length % 2 === 0) {
              assignedBlock = "b-sweetspot"; // alternate intensity
          }
      }

      schedule.push({
          date: dateStr,
          block_id: assignedBlock
      });
  }

  return schedule;
}
