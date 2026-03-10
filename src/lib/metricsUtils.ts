// src/lib/metricsUtils.ts

export type Activity = any; // Representa una fila de la BD 'activities'

// Función auxiliar para obtener la carga de una actividad individual
export function getActivityLoad(activity: Activity): number {
    // Si Garmin nos dio el TSS real, lo usamos
    if (activity.training_stress_score && !isNaN(activity.training_stress_score)) {
        return Number(activity.training_stress_score);
    }
    // Si no, estimamos basado en el tiempo.
    // Una estimación cruda asume ~50 TSS por hora para rodajes mezclados.
    const duration = Number(activity.duration_minutes);
    if (!isNaN(duration) && duration > 0) {
        return (duration / 60) * 50;
    }
    return 0;
}

// Helper para formatear YYYY-MM-DD en hora local evitando desfases por UTC
export function getLocalYYYYMMDD(dateObj: Date): string {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Agrupar carga por día (formato YYYY-MM-DD)
export function getDailyLoads(activities: Activity[]): Record<string, number> {
    const daily: Record<string, number> = {};
    activities.forEach(act => {
        if (!act.activity_date) return;
        const dateStr = getLocalYYYYMMDD(new Date(act.activity_date));
        daily[dateStr] = (daily[dateStr] || 0) + getActivityLoad(act);
    });
    return daily;
}

// Calcular EMA (Exponential Moving Average) según el estándar de TrainingPeaks
// La constante de suavizado 'k' usa 1/N en lugar de 2/(N+1)
function calculateEMA(todaysLoad: number, yesterdaysEMA: number, timeConstant: number): number {
    const k = 1 / timeConstant;
    return (todaysLoad * k) + (yesterdaysEMA * (1 - k));
}

export type MetricsMaturityStatus = 'insufficient' | 'provisional' | 'calibrated';

// Retorna las métricas históricas de PMC por día junto con el estado de madurez de los datos
export function calculatePMC(dailyLoads: Record<string, number>): {
    status: MetricsMaturityStatus;
    daysAvailable: number;
    trainingDays: number;
    readinessScore: number;
    results: { date: string, ctlRaw: number, atlRaw: number, tsbRaw: number, ctlDisplayed: number, atlDisplayed: number, tsbDisplayed: number, tss: number }[];
} {
    const dates = Object.keys(dailyLoads).sort();

    if (dates.length === 0) {
        return {
            status: 'insufficient',
            daysAvailable: 0,
            trainingDays: 0,
            readinessScore: 0,
            results: []
        };
    }

    const firstDateStr = dates[0];
    const lastDateStr = dates[dates.length - 1];

    const [fy, fm, fd] = firstDateStr.split('-').map(Number);
    const firstLoadDate = new Date(fy, fm - 1, fd);
    firstLoadDate.setHours(0, 0, 0, 0);

    const [ly, lm, ld] = lastDateStr.split('-').map(Number);
    const lastLoadDate = new Date(ly, lm - 1, ld);
    lastLoadDate.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 3600 * 24;
    let daysAvailable = Math.round((lastLoadDate.getTime() - firstLoadDate.getTime()) / msPerDay) + 1;
    if (daysAvailable < 0) daysAvailable = 0;

    let status: MetricsMaturityStatus = 'insufficient';
    if (daysAvailable >= 42) {
        status = 'calibrated';
    } else if (daysAvailable >= 20) {
        status = 'provisional';
    }

    const readinessScore = Math.min(daysAvailable / 42, 1);

    const results: { date: string, ctlRaw: number, atlRaw: number, tsbRaw: number, ctlDisplayed: number, atlDisplayed: number, tsbDisplayed: number, tss: number }[] = [];

    // TrainingPeaks strict logic: Initial CTL/ATL are seeded with the TSS of Day 1
    let currentCTL = 0;
    let currentATL = 0;
    let initialized = false;

    for (let i = 0; i < daysAvailable; i++) {
        const d = new Date(firstLoadDate);
        d.setDate(firstLoadDate.getDate() + i);

        const dateStr = getLocalYYYYMMDD(d);
        const todaysTSS = dailyLoads[dateStr] || 0;

        if (!initialized) {
            // Seed
            currentCTL = todaysTSS;
            currentATL = todaysTSS;
            initialized = true;

            results.push({
                date: dateStr,
                tss: todaysTSS,
                ctlRaw: currentCTL,
                atlRaw: currentATL,
                tsbRaw: 0, // Day 1 TSB is technically undefined/0 since yesterday didn't exist
                ctlDisplayed: Math.round(currentCTL),
                atlDisplayed: Math.round(currentATL),
                tsbDisplayed: 0
            });
            continue;
        }

        // TSB is yesterday's CTL - yesterday's ATL
        const todaysTSB = currentCTL - currentATL;

        // Apply EMA for today
        currentCTL = calculateEMA(todaysTSS, currentCTL, 42);
        currentATL = calculateEMA(todaysTSS, currentATL, 7);

        results.push({
            date: dateStr,
            tss: todaysTSS,
            ctlRaw: currentCTL,
            atlRaw: currentATL,
            tsbRaw: todaysTSB,
            ctlDisplayed: Math.round(currentCTL),
            atlDisplayed: Math.round(currentATL),
            tsbDisplayed: Math.round(todaysTSB)
        });
    }

    // Variables extras de auditoría que el usuario pidió verificar explícitamente:
    const trainingDays = dates.length; // 2. total de días con al menos una actividad
    // sessionCount lo podemos calcular si nos pasaran las 'activities' crudas, 
    // pero como mínimo logueamos trainingDays vs daysAvailable.

    // Debug constraints as requested by User
    if (process.env.NODE_ENV === 'development') {
        console.log("\n=== STRICT PMC AUDIT LOG ===");
        // console.log("SessionCount: (Gestionado en Dashboard)");
        console.log(`TrainingDays: ${trainingDays} (Días con al menos 1 actividad)`);
        console.log(`DaysAvailable: ${daysAvailable} (Span calendario desde ${firstDateStr} hasta ${lastDateStr})`);
        console.log(`MetricsStatus: ${status} (Derivado de DaysAvailable, NO de TrainingDays)`);
        console.log(`ReadinessScore: ${readinessScore} (DaysAvailable / 42)`);
        console.log("------------------------------------------------");
        console.log("DATE       | dailyTSS | ctlRaw | ctlDisp | atlRaw | atlDisp | tsbRaw | tsbDisp");

        // Imprimir los últimos 14 días para auditoría visual rápida
        const auditSlice = results.slice(-14);
        auditSlice.forEach(r => {
            console.log(
                `${r.date} | ` +
                `${r.tss.toString().padStart(8)} | ` +
                `${r.ctlRaw.toFixed(2).padStart(6)} | ` +
                `${r.ctlDisplayed.toString().padStart(7)} | ` +
                `${r.atlRaw.toFixed(2).padStart(6)} | ` +
                `${r.atlDisplayed.toString().padStart(7)} | ` +
                `${r.tsbRaw.toFixed(2).padStart(6)} | ` +
                `${r.tsbDisplayed.toString().padStart(7)}`
            );
        });

        const last = results[results.length - 1];
        if (last) {
            console.log("\n[VERIFICACIÓN] ¿ReadinessScore modifica los values expuestos?");
            console.log(`ctlDisplayed (${last.ctlDisplayed}) es exactamente Math.round(ctlRaw) (${Math.round(last.ctlRaw)}):`, last.ctlDisplayed === Math.round(last.ctlRaw));
            console.log(`atlDisplayed (${last.atlDisplayed}) es exactamente Math.round(atlRaw) (${Math.round(last.atlRaw)}):`, last.atlDisplayed === Math.round(last.atlRaw));
            console.log(`tsbDisplayed (${last.tsbDisplayed}) es exactamente Math.round(tsbRaw) (${Math.round(last.tsbRaw)}):`, last.tsbDisplayed === Math.round(last.tsbRaw));
            console.log("=============================\n");
        }
    }

    return { status, daysAvailable, trainingDays, readinessScore, results };
}

// Métricas de Consistencia
export function getConsistencyLast7Days(dailyLoads: Record<string, number>): number {
    const today = new Date();
    let daysActive = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = getLocalYYYYMMDD(d);
        if (dailyLoads[dateStr] && dailyLoads[dateStr] > 0) {
            daysActive++;
        }
    }
    return daysActive;
}

// Suma de carga total de los últimos N días
export function getLoadLastNDays(dailyLoads: Record<string, number>, days: number): number {
    const today = new Date();
    let totalLoad = 0;
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = getLocalYYYYMMDD(d);
        if (dailyLoads[dateStr]) {
            totalLoad += dailyLoads[dateStr];
        }
    }
    return Math.round(totalLoad);
}

// Conteo de sesiones en los últimos 7 días para ser consistente con Carga 7D
export function getSessionsLast7Days(activities: Activity[]): number {
    const today = new Date();
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const startOfWindow = new Date(today);
    startOfWindow.setDate(today.getDate() - 6); // 7 días inclusive (hoy y 6 previos)
    startOfWindow.setHours(0, 0, 0, 0);

    let count = 0;
    activities.forEach(act => {
        if (!act.activity_date) return;
        const actDate = new Date(act.activity_date);
        if (actDate >= startOfWindow && actDate <= endOfToday) {
            count++;
        }
    });
    return count;
}

// Obtener Volumen Semanal (Semana Actual vs Semana Pasada en minutos)
export function getWeeklyVolumeBreakdown(activities: Activity[]) {
    const today = new Date();

    // Normalizar a medianoche para evitar problemas horarios
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const startOfCurrentWeek = new Date(today);
    startOfCurrentWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Lunes
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfCurrentWeek);
    startOfLastWeek.setDate(startOfCurrentWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfCurrentWeek);
    endOfLastWeek.setMilliseconds(-1);

    let currentWeekMins = 0;
    let lastWeekMins = 0;

    activities.forEach(act => {
        if (!act.activity_date) return;
        const actDate = new Date(act.activity_date);
        const mins = Number(act.duration_minutes) || 0;

        if (actDate >= startOfCurrentWeek && actDate <= endOfToday) {
            currentWeekMins += mins;
        } else if (actDate >= startOfLastWeek && actDate <= endOfLastWeek) {
            lastWeekMins += mins;
        }
    });

    return {
        currentWeek: Math.round(currentWeekMins / 60 * 10) / 10, // horas con 1 decimal
        lastWeek: Math.round(lastWeekMins / 60 * 10) / 10
    };
}

// Distribución por zonas muy básica (basada en FC media si existe, o clasificar por intensidad)
export function getZoneDistribution(activities: Activity[], daysBack: number = 30) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysBack);

    let z1z2 = 0; // Recuperación / Base
    let z3z4 = 0; // Tempo / Umbral
    let z5z6 = 0; // VO2 / Anaeróbico

    activities.forEach(act => {
        if (!act.activity_date) return;
        if (new Date(act.activity_date) < targetDate) return;

        const hr = act.fc_media ? Number(act.fc_media) : 0;

        // heurística genérica si no sabemos el maxHR
        if (hr > 0) {
            if (hr < 140) z1z2++;
            else if (hr >= 140 && hr < 165) z3z4++;
            else z5z6++;
        } else {
            // Si no hay HR, estimamos por potencia o asumiendo Base
            if (act.normalized_power || act.potencia_media) {
                const p = Number(act.normalized_power || act.potencia_media);
                if (p > 220) z5z6++;
                else if (p > 160) z3z4++;
                else z1z2++;
            } else {
                // Caída libre: todo a base
                z1z2++;
            }
        }
    });

    const total = z1z2 + z3z4 + z5z6;
    if (total === 0) return { base: 0, umbral: 0, vo2: 0 };

    return {
        base: Math.round((z1z2 / total) * 100),
        umbral: Math.round((z3z4 / total) * 100),
        vo2: Math.round((z5z6 / total) * 100)
    };
}
