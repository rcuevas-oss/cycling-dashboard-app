// src/lib/metricsUtils.ts

import { ActivitySummary } from './activityTypes';

export type Activity = ActivitySummary;

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

/**
 * Extrae la fecha local (YYYY-MM-DD) de un campo activity_date que puede venir en dos formatos:
 *   1. "2026-03-18"                     (solo fecha, se usa directamente sin pasar por Date)
 *   2. "2026-03-19T01:02:39+00:00"      (ISO UTC con hora, se convierte a hora local primero)
 * Esto evita que un entreno a las 22:00 en Chile (UTC-3) quede registrado el día siguiente.
 */
export function getActivityLocalDate(activityDate: any): string {
    const str = String(activityDate);
    // Si es solo fecha (10 chars ó formato YYYY-MM-DD sin hora), la usamos directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(str.slice(0, 10)) && str.length === 10) {
        return str;
    }
    // Tiene componente de hora: parseamos como Date (respeta la zona horaria del string)
    // y luego extraemos en hora LOCAL del navegador del usuario.
    return getLocalYYYYMMDD(new Date(str));
}

// Agrupar carga por día (formato YYYY-MM-DD)
export function getDailyLoads(activities: Activity[]): Record<string, number> {
    const daily: Record<string, number> = {};
    activities.forEach(act => {
        if (!act.activity_date) return;
        const dateStr = getActivityLocalDate(act.activity_date);
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
    // Generamos el set de fechas (YYYY-MM-DD) de los últimos 7 días en hora LOCAL
    const localDates = new Set<string>();
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        localDates.add(getLocalYYYYMMDD(d));
    }

    let count = 0;
    activities.forEach(act => {
        if (!act.activity_date) return;
        // Convertir a hora local antes de comparar
        const dateStr = getActivityLocalDate(act.activity_date);
        if (localDates.has(dateStr)) {
            count++;
        }
    });
    return count;
}

// Obtener Volumen Semanal (Semana Actual vs Semana Pasada en minutos)
export function getWeeklyVolumeBreakdown(activities: Activity[]) {
    const today = new Date();

    // Calcular los YYYY-MM-DD strings para comparar sin pasar por UTC
    const todayStr = getLocalYYYYMMDD(today);

    const startOfCurrentWeekDate = new Date(today);
    startOfCurrentWeekDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Lunes
    startOfCurrentWeekDate.setHours(0, 0, 0, 0);
    const currentWeekStart = getLocalYYYYMMDD(startOfCurrentWeekDate);

    const startOfLastWeekDate = new Date(startOfCurrentWeekDate);
    startOfLastWeekDate.setDate(startOfCurrentWeekDate.getDate() - 7);
    const lastWeekStart = getLocalYYYYMMDD(startOfLastWeekDate);

    const endOfLastWeekDate = new Date(startOfCurrentWeekDate);
    endOfLastWeekDate.setDate(endOfLastWeekDate.getDate() - 1);
    const lastWeekEnd = getLocalYYYYMMDD(endOfLastWeekDate);

    let currentWeekMinutes = 0;
    let lastWeekMinutes = 0;

    activities.forEach(act => {
        if (!act.activity_date) return;
        const actLocalDate = getActivityLocalDate(act.activity_date);
        const mins = Number(act.duration_minutes) || 0;

        if (actLocalDate >= currentWeekStart && actLocalDate <= todayStr) {
            currentWeekMinutes += mins;
        } else if (actLocalDate >= lastWeekStart && actLocalDate <= lastWeekEnd) {
            lastWeekMinutes += mins;
        }
    });

    return {
        currentWeekHours: Math.floor(currentWeekMinutes / 60),
        currentWeekMins: Math.round(currentWeekMinutes % 60),
        lastWeekHours: Math.floor(lastWeekMinutes / 60),
        lastWeekMins: Math.round(lastWeekMinutes % 60),
        trend: currentWeekMinutes >= lastWeekMinutes ? 'up' : 'down'
    };
}

// Extrae el historial diario de Potencia Promedio y Potencia Normalizada de los últimos N días
export function getPowerHistory(activities: Activity[], days: number = 90) {
    const today = new Date();
    const todayStr = getLocalYYYYMMDD(today);
    
    const startOfWindowDate = new Date(today);
    startOfWindowDate.setDate(today.getDate() - days + 1);
    const startStr = getLocalYYYYMMDD(startOfWindowDate);

    // Agrupar la potencia máxima media registrada por día
    const daily: Record<string, { avgPower: number, np: number, p20: number }> = {};
    
    activities.forEach(act => {
        if (!act.activity_date) return;
        const dateStr = getActivityLocalDate(act.activity_date);
        
        if (dateStr >= startStr && dateStr <= todayStr) {
            
            // Tratamos de obtener np (normalized_power o np del CSV) y potencia_media o average_power
            const actAvgPower = Number(act.potencia_media || act.average_power || 0);
            const actNP = Number(act.np || act.normalized_power || 0);
            const actP20 = Number(act.potencia_20min || 0);

            if (!daily[dateStr]) {
                daily[dateStr] = { avgPower: actAvgPower, np: actNP, p20: actP20 };
            } else {
                // Si hizo doble sesión, guardamos el esfuerzo más pesado o promediamos. 
                // Por ahora, para simplificar visualmente en el gráfico, guardamos de la sesión más fuerte.
                daily[dateStr].avgPower = Math.max(daily[dateStr].avgPower, actAvgPower);
                daily[dateStr].np = Math.max(daily[dateStr].np, actNP);
                daily[dateStr].p20 = Math.max(daily[dateStr].p20, actP20);
            }
        }
    });

    // Rellenamos los días para que el gráfico sea continuo
    const history: { date: string, avgPower: number | null, np: number | null, p20: number | null }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getLocalYYYYMMDD(d);
        
        if (daily[dateStr] && daily[dateStr].avgPower > 0) {
            history.push({ 
                date: dateStr, 
                avgPower: Math.round(daily[dateStr].avgPower),
                np: daily[dateStr].np > 0 ? Math.round(daily[dateStr].np) : null,
                p20: daily[dateStr].p20 > 0 ? Math.round(daily[dateStr].p20) : null
            });
        } else {
            // Null rompe las líneas para que no asuma 0W en días de descanso.
            history.push({ date: dateStr, avgPower: null, np: null, p20: null });
        }
    }

    return history;
}

// Distribución por zonas muy básica (basada en FC media si existe, o clasificar por intensidad)
export function getZoneDistribution(activities: Activity[], daysBack: number = 30) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysBack);
    const targetDateStr = getLocalYYYYMMDD(targetDate);

    let z1z2 = 0; // Recuperación / Base
    let z3z4 = 0; // Tempo / Umbral
    let z5z6 = 0; // VO2 / Anaeróbico

    activities.forEach(act => {
        if (!act.activity_date) return;
        const dateStr = getActivityLocalDate(act.activity_date);
        if (dateStr < targetDateStr) return;

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
