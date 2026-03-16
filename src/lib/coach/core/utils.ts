import { SessionArchetype, ValidatedSession } from "../types";

/**
 * Classifies a session into an archetype based on intensity and duration.
 * Keeps comparisons "apples to apples".
 */
export function classifyArchetype(session: ValidatedSession): SessionArchetype {
  const hr = session.raw.average_heartrate || 0;
  
  if (hr > 0 && hr < 110) return "recovery";
  if (hr >= 110 && hr <= 145) return "endurance";
  if (hr > 145 && hr <= 165) return "tempo/sweetspot";
  if (hr > 165) return "vo2max/anaerobic";

  const np = session.raw.np || session.raw.potencia_media || 0;
  if (np > 0) {
      if (np < 150) return "recovery";
      if (np >= 150 && np <= 220) return "endurance";
      if (np > 220 && np <= 280) return "tempo/sweetspot";
      if (np > 280) return "vo2max/anaerobic";
  }

  return "mixed";
}

/**
 * Unpacks the full array of valid baseline sessions (up to 90 days)
 * into a line-by-line detailed text log for the LLM to process on its own.
 */
export function buildFullHistoryLog(baselineDays: ValidatedSession[]) {
    const compact = (s: ValidatedSession) => {
        const d = s.raw;
        const mins = Math.round((d.moving_time || d.elapsed_time || 0) / 60);
        const np = Math.round(d.normalized_power || d.np || d.potencia_media || 0);
        const hr = Math.round(d.average_heartrate || 0);
        const tss = Math.round(d.training_stress_score || d.tss || 0);
        const dist = d.distance_km ? Math.round(d.distance_km) : d.distance ? Math.round(d.distance / 1000) : 0;
        const elev = d.ascenso_total ? Math.round(d.ascenso_total) : d.total_elevation_gain ? Math.round(d.total_elevation_gain) : 0;
        const dateStr = d.start_date.split('T')[0];
        const arch = classifyArchetype(s);
        
        const actName = d.name ? `"${d.name}"` : d.type || "Actividad";
        
        return {
            date: dateStr,
            description: `${actName} [${arch.toUpperCase()}] Dur:${mins}m | Dist:${dist}km | Desnivel:${elev}m | TSS:${tss} | NP:${np}W | HR:${hr}bpm`
        };
    };

    return baselineDays
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map(compact);
}
