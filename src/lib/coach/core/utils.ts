import { SessionArchetype, ValidatedSession } from "../types";
import { getActivityLocalDate } from "../../metricsUtils";

/**
 * Classifies a session into an archetype based on intensity and duration.
 * Priority: HR if available (relative to ~190 bpm proxy max), then NP relative to FTP if available in raw,
 * otherwise absolute watt heuristic. Keeps comparisons "apples to apples".
 */
export function classifyArchetype(session: ValidatedSession): SessionArchetype {
  const hr = session.raw.average_heartrate || 0;
  const np = session.raw.np || session.raw.normalized_power || session.raw.potencia_media || 0;
  const ftp = (session.raw as any).ftp || 0; // FTP if injected into raw for context

  // --- HR-based classification (always preferred when pulso is available) ---
  if (hr > 0) {
    // Use percentage of assumed max HR (proxy: 185 bpm) for relative zones
    const hrPct = hr / 185;
    if (hrPct < 0.60) return "recovery";          // Z1 < 60% HRmax
    if (hrPct < 0.79) return "endurance";          // Z2 60–79%
    if (hrPct < 0.90) return "tempo/sweetspot";    // Z3–Z4 80–89%
    return "vo2max/anaerobic";                     // Z5+ ≥ 90%
  }

  // --- Power-based classification (when HR is missing) ---
  if (np > 0) {
    if (ftp > 0) {
      // Relative to athlete's own FTP (best accuracy)
      const ifVal = np / ftp;
      if (ifVal < 0.55) return "recovery";
      if (ifVal < 0.75) return "endurance";
      if (ifVal < 0.92) return "tempo/sweetspot";
      return "vo2max/anaerobic";
    }
    // Absolute fallback (no FTP known) — broad amateur ranges
    if (np < 160) return "recovery";
    if (np <= 230) return "endurance";
    if (np <= 300) return "tempo/sweetspot";
    return "vo2max/anaerobic";
  }

  return "mixed";
}

/**
 * Unpacks the full array of valid baseline sessions (up to 90 days)
 * into a line-by-line detailed text log for the LLM, grouping by date
 * to handle multiple sessions per day (AM/PM).
 */
export function buildFullHistoryLog(baselineDays: ValidatedSession[]) {
    // Sort descending by date
    const sorted = [...baselineDays].sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Group by date string to count sessions per day
    const dateCounts: Record<string, number> = {};
    sorted.forEach(s => {
        const d = s.raw.start_date.split('T')[0];
        dateCounts[d] = (dateCounts[d] || 0) + 1;
    });

    const dateSeenCount: Record<string, number> = {};

    const compact = (s: ValidatedSession) => {
        const d = s.raw;
        const mins = Math.round((d.moving_time || d.elapsed_time || 0) / 60);
        const np = Math.round(d.normalized_power || d.np || d.potencia_media || 0);
        const hr = Math.round(d.average_heartrate || 0);
        const tss = Math.round(d.training_stress_score || d.tss || 0);
        const dist = d.distance_km ? Math.round(d.distance_km) : d.distance ? Math.round(d.distance / 1000) : 0;
        const elev = d.ascenso_total ? Math.round(d.ascenso_total) : d.total_elevation_gain ? Math.round(d.total_elevation_gain) : 0;
        // BUG-4: use getActivityLocalDate to get the correct local date, not the UTC date from split('T')[0]
        const dateStr = getActivityLocalDate(d.start_date);
        const timeStr = d.start_date.split('T')[1] || "12:00:00";
        const hour = parseInt(timeStr.split(':')[0], 10);
        
        const arch = classifyArchetype(s);
        const actName = d.name ? `"${d.name}"` : d.type || "Actividad";
        
        // Manejo Inteligente de Días Dobles: Mañana (<14h) vs Tarde (>=14h)
        dateSeenCount[dateStr] = (dateSeenCount[dateStr] || 0) + 1;
        let sessionLabel = "";
        if (dateCounts[dateStr] > 1) {
             const timeOfDay = hour < 14 ? "Mañana" : "Tarde";
             sessionLabel = ` [Doble Jornada: ${timeOfDay}]`;
        }

        // 🕵️‍♂️ Detección de Entorno (Rodillo / Exterior)
        // Prioridad 1: Override manual del usuario en la Base de Datos (is_indoor)
        // Prioridad 2: Heurística Matemática si no hay override
        let isRodillo = false;
        if (d.is_indoor === true || d.is_indoor === false) {
            isRodillo = d.is_indoor;
        } else {
            const typeStr = String(d.type || "").toLowerCase();
            const isVirtual = typeStr.includes("virtual") || typeStr.includes("interior") || typeStr.includes("indoor");
            isRodillo = isVirtual || (mins > 20 && dist < 5 && (np > 50 || hr > 100));
        }
        const envTag = isRodillo ? " [RODILLO/INDOOR]" : " [EXTERIOR]";
        
        // Extracción de Datos Forenses (Nuevas Métricas)
        const p20m = d.potencia_20min ? ` | Pico 20m:${Math.round(d.potencia_20min)}W` : "";
        const maxHr = d.max_heartrate ? ` | MaxHR:${Math.round(d.max_heartrate)}` : "";
        const temp = d.temperatura_max ? ` | TempMax:${Math.round(d.temperatura_max)}C` : (d.temperatura_min ? ` | Temp:${Math.round(d.temperatura_min)}C` : "");
        const cadence = d.cadencia_media ? ` | RPM:${Math.round(d.cadencia_media)}` : "";
        const teAero = d.te_aerobico ? ` | TE.Aero:${d.te_aerobico}` : "";
        const maxAlt = d.altura_max ? ` | AltMax:${Math.round(d.altura_max)}m` : "";

        return {
            date: dateStr,
            description: `${actName}${sessionLabel}${envTag} [${arch.toUpperCase()}] Dur:${mins}m | Dist:${dist}km | Desnivel:${elev}m | TSS:${tss} | NP:${np}W | HR:${hr}bpm${p20m}${maxHr}${temp}${cadence}${maxAlt}${teAero}`
        };
    };

    return sorted.map(compact);
}
