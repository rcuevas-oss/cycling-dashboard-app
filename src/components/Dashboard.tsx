import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { Session } from '@supabase/supabase-js';
import { getDailyLoads, calculatePMC, getConsistencyLast7Days, getZoneDistribution, getLoadLastNDays, getSessionsLast7Days } from '../lib/metricsUtils';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Area, ComposedChart, ReferenceLine, CartesianGrid } from 'recharts';

export function Dashboard({ session, activities, onDataChanged }: { session: Session, activities: any[], onDataChanged: () => Promise<void> }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const fetchActivities = async () => {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', session.user.id)
            .order('activity_date', { ascending: false });

        if (!error && data) {
            // Note: Dashboard doesn't set global activities anymore, 
            // but we kept this here in case we need local fetching. 
            // In a full refactor, this might be removed entirely.
        }
    };

    useEffect(() => {
        fetchActivities();
    }, [session.user.id]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    // Parseador avanzado de CSV de Garmin 
    const parseGarminCSV = async (file: File) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target?.result as string;
                    if (!text) return resolve([]);

                    // Helper para strings de tiempo (ignora cadenas con solo guiones o dos puntos como "--:--")
                    const tTime = (value: string | undefined | null) => {
                        if (value === undefined || value === null || value.toString().trim() === '') return null;
                        const cleaned = value.toString().replace(/"/g, '').trim();
                        if (/^[\s:-]+$/.test(cleaned)) return null;
                        return cleaned;
                    };

                    // Helper para parsear números con manejo de formatos regionales
                    const tNum = (value: string | undefined, metricType: 'integer' | 'decimal') => {
                        if (value === undefined || value === null || value.trim() === '') return null;
                        let cleaned = value.toString().replace(/"/g, '').trim();
                        if (/^[-:\s]+$/.test(cleaned)) return null; // Ignorar "--", "--:--", etc.

                        if (cleaned === '') return null;

                        if (metricType === 'integer') {
                            // "1.016" -> "1016" (Spain thousands), "1,244" -> "1244" (US thousands)
                            cleaned = cleaned.replace(/[,.]/g, '');
                        } else if (metricType === 'decimal') {
                            if (cleaned.includes(',') && cleaned.includes('.')) {
                                if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
                                    cleaned = cleaned.replace(/,/g, '');
                                } else {
                                    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
                                }
                            } else {
                                // "36,36" -> "36.36" or "36.36" -> "36.36"
                                cleaned = cleaned.replace(',', '.');
                            }
                        } else { // This 'else' branch seems to be a fallback for 'decimal' or a more general case
                            if (cleaned.includes(',') && cleaned.includes('.')) {
                                if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
                                    cleaned = cleaned.replace(/,/g, '');
                                } else {
                                    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
                                }
                            } else if (cleaned.includes(',')) {
                                if (/,\d{3}$/.test(cleaned) && cleaned.length >= 5) {
                                    cleaned = cleaned.replace(/,/g, '');
                                } else {
                                    cleaned = cleaned.replace(',', '.');
                                }
                            }
                        }

                        const num = Number(cleaned);
                        return isNaN(num) ? null : num;
                    };

                    // PapaParse procesa el texto puro manejando delimitadores y comillas internas correctamente
                    Papa.parse(text, {
                        header: false, // No hay encabezado en la primera fila de datos
                        skipEmptyLines: true,
                        complete: (results) => {
                            const activitiesToInsert: any[] = [];

                            // Mapeo dinámico y difuso (fuzzy) de cabeceras para múltiples idiomas y formatos de exportación
                            const headerRow = results.data[0] as string[];
                            const hLower = headerRow.map(h => h ? h.toString().toLowerCase() : '');
                            const findFuzzy = (keywords: string[]) => hLower.findIndex(h => keywords.some(k => h.includes(k)));

                            const idxMap: { [key: string]: number | undefined } = {
                                title: findFuzzy(['título', 'title']),
                                date: findFuzzy(['fecha', 'date', 'tiempo', 'time']),
                                dist: findFuzzy(['distancia', 'distance']),
                                cal: findFuzzy(['calor', 'calorie']),
                                duration: findFuzzy(['tiempo', 'time', 'duración', 'duration']),
                                t_mov: findFuzzy(['tiempo en movimiento', 'moving time', 'tiempo mov']),
                                t_transcur: findFuzzy(['tiempo transcurrido', 'elapsed time']),
                                lap_best: findFuzzy(['mejor vuelta', 'best lap']),
                                hr_mean: findFuzzy(['fc media', 'avg hr', 'mean hr', 'frecuencia card', 'frecuencia cardiaca media']),
                                hr_max: findFuzzy(['fc m', 'fc max', 'max hr', 'frecuencia cardiaca max']),
                                te_aer: findFuzzy(['te aer', 'aerobic te']),
                                vel_mean: findFuzzy(['velocidad media', 'avg speed', 'vel media']),
                                vel_max: findFuzzy(['velocidad m', 'max speed', 'vel max']),
                                asc_tot: findFuzzy(['ascenso', 'elev gain', 'total ascent']),
                                desc_tot: findFuzzy(['descenso', 'elev loss', 'total descent']),
                                alt_min: findFuzzy(['altura min', 'altura mín', 'min elev']),
                                alt_max: findFuzzy(['altura max', 'altura máx', 'max elev']),
                                cad_mean: findFuzzy(['cadencia media', 'avg cadence', 'cad media']),
                                cad_max: findFuzzy(['cadencia m', 'max cadence', 'cad max']),
                                np: findFuzzy(['np', 'potencia normalizada', 'normalized power']),
                                tss: findFuzzy(['tss', 'training stress score']),
                                p20: findFuzzy(['20 min', '20min', 'potencia maxima 20']),
                                p_mean: findFuzzy(['potencia media', 'avg power']),
                                p_max: findFuzzy(['potencia m', 'max power']),
                                strokes: findFuzzy(['pedaladas', 'strokes']),
                                temp_min: findFuzzy(['temp. min', 'temp. mín', 'min temp', 'temperatura min']),
                                descompresion: findFuzzy(['descompresi']),
                                laps: findFuzzy(['vueltas', 'laps']),
                                temp_max: findFuzzy(['temp. max', 'temp. máx', 'max temp', 'temperatura max']),
                                resp_mean: findFuzzy(['resp. media', 'avg resp', 'respiracion media']),
                                resp_min: findFuzzy(['resp. min', 'resp. mín', 'min resp', 'respiracion min']),
                                resp_max: findFuzzy(['resp. max', 'resp. máx', 'max resp', 'respiracion max']),
                            };

                            // Limpiar índices que devuelven -1 (no encontrados)
                            Object.keys(idxMap).forEach(k => { if (idxMap[k] === -1) idxMap[k] = undefined; });

                            // Iterar por todas las filas usando el parser oficial
                            for (let i = 1; i < results.data.length; i++) {
                                const dataTokens = results.data[i] as string[];

                                // Ignorar filas totalmente vacías o que comiencen con las etiquetas ignoradas de archivo Garmin
                                if (!dataTokens || dataTokens.length < 10) continue;
                                if (dataTokens[0] && typeof dataTokens[0] === 'string' && dataTokens[0].startsWith('Tipo de actividad')) continue;

                                let fecha = null;
                                if (idxMap.date !== undefined && dataTokens[idxMap.date]) {
                                    let dateStr = dataTokens[idxMap.date].toString().replace(/"/g, '').trim();

                                    // Fix DD/MM/YYYY into MM/DD/YYYY for native JS parsing
                                    const isDDMMYYYY = /^(\d{2})[-/](\d{2})[-/](\d{4})/.test(dateStr);
                                    if (isDDMMYYYY) {
                                        dateStr = dateStr.replace(/^(\d{2})[-/](\d{2})[-/](\d{4})/, '$2/$1/$3');
                                    }

                                    // Try to parse the date
                                    let parseDate = new Date(dateStr);

                                    // Si sigue fallando, intentar un parseo agresivo extrayendo números
                                    if (isNaN(parseDate.getTime())) {
                                        const match = dateStr.match(/(\d{2})[-/](\d{2})[-/](\d{4})\s+(\d{1,2}):(\d{2})/);
                                        if (match) {
                                            parseDate = new Date(`${match[3]}-${match[2]}-${match[1]}T${match[4].padStart(2, '0')}:${match[5]}:00`);
                                        }
                                    }

                                    if (!isNaN(parseDate.getTime())) {
                                        fecha = parseDate.toISOString();
                                    }
                                }

                                let duration_minutes = null;
                                const rawDuration = tTime(idxMap.duration !== undefined ? dataTokens[idxMap.duration] : undefined);

                                if (rawDuration) {
                                    const timeParts = rawDuration.split(':').map(Number);
                                    if (timeParts.length >= 3) {
                                        // hh:mm:ss o hh:mm:ss.0
                                        duration_minutes = Math.round(timeParts[0] * 60 + timeParts[1] + (timeParts[2] || 0) / 60);
                                    } else if (timeParts.length === 2) {
                                        // mm:ss
                                        duration_minutes = Math.round(timeParts[0] + timeParts[1] / 60);
                                    }
                                }

                                const rawTiempo = rawDuration;

                                const act = {
                                    titulo: (idxMap.title !== undefined && dataTokens[idxMap.title]) ? dataTokens[idxMap.title].toString().replace(/"/g, '').trim() : null,
                                    activity_date: fecha,
                                    distance_km: tNum(idxMap.dist !== undefined ? dataTokens[idxMap.dist]?.toString() : undefined, 'decimal'),
                                    calorias: tNum(idxMap.cal !== undefined ? dataTokens[idxMap.cal]?.toString() : undefined, 'integer'),
                                    duration_minutes: duration_minutes,

                                    tiempo: rawTiempo,
                                    tiempo_movimiento: tTime(idxMap.t_mov !== undefined ? dataTokens[idxMap.t_mov] : undefined),
                                    tiempo_transcurrido: tTime(idxMap.t_transcur !== undefined ? dataTokens[idxMap.t_transcur] : undefined),
                                    mejor_vuelta: tTime(idxMap.lap_best !== undefined ? dataTokens[idxMap.lap_best] : undefined),

                                    fc_media: tNum(idxMap.hr_mean !== undefined ? dataTokens[idxMap.hr_mean]?.toString() : undefined, 'integer'),
                                    fc_maxima: tNum(idxMap.hr_max !== undefined ? dataTokens[idxMap.hr_max]?.toString() : undefined, 'integer'),
                                    te_aerobico: tNum(idxMap.te_aer !== undefined ? dataTokens[idxMap.te_aer]?.toString() : undefined, 'decimal'),
                                    velocidad_media: tNum(idxMap.vel_mean !== undefined ? dataTokens[idxMap.vel_mean]?.toString() : undefined, 'decimal'),
                                    velocidad_maxima: tNum(idxMap.vel_max !== undefined ? dataTokens[idxMap.vel_max]?.toString() : undefined, 'decimal'),
                                    ascenso_total: tNum(idxMap.asc_tot !== undefined ? dataTokens[idxMap.asc_tot]?.toString() : undefined, 'integer'),
                                    descenso_total: tNum(idxMap.desc_tot !== undefined ? dataTokens[idxMap.desc_tot]?.toString() : undefined, 'integer'),
                                    altura_min: tNum(idxMap.alt_min !== undefined ? dataTokens[idxMap.alt_min]?.toString() : undefined, 'integer'),
                                    altura_max: tNum(idxMap.alt_max !== undefined ? dataTokens[idxMap.alt_max]?.toString() : undefined, 'integer'),

                                    cadencia_media: tNum(idxMap.cad_mean !== undefined ? dataTokens[idxMap.cad_mean]?.toString() : undefined, 'integer'),
                                    cadencia_maxima: tNum(idxMap.cad_max !== undefined ? dataTokens[idxMap.cad_max]?.toString() : undefined, 'integer'),

                                    normalized_power: tNum(idxMap.np !== undefined ? dataTokens[idxMap.np]?.toString() : undefined, 'integer'),
                                    training_stress_score: tNum(idxMap.tss !== undefined ? dataTokens[idxMap.tss]?.toString() : undefined, 'decimal'),
                                    potencia_20min: tNum(idxMap.p20 !== undefined ? dataTokens[idxMap.p20]?.toString() : undefined, 'integer'),
                                    potencia_media: tNum(idxMap.p_mean !== undefined ? dataTokens[idxMap.p_mean]?.toString() : undefined, 'integer'),
                                    potencia_maxima: tNum(idxMap.p_max !== undefined ? dataTokens[idxMap.p_max]?.toString() : undefined, 'integer'),
                                    pedaladas_totales: tNum(idxMap.strokes !== undefined ? dataTokens[idxMap.strokes]?.toString() : undefined, 'integer'),

                                    temperatura_min: tNum(idxMap.temp_min !== undefined ? dataTokens[idxMap.temp_min]?.toString() : undefined, 'decimal'),
                                    descompresion: tTime(idxMap.descompresion !== undefined ? dataTokens[idxMap.descompresion] : undefined),
                                    numero_vueltas: tNum(idxMap.laps !== undefined ? dataTokens[idxMap.laps]?.toString() : undefined, 'integer'),
                                    temperatura_max: tNum(idxMap.temp_max !== undefined ? dataTokens[idxMap.temp_max]?.toString() : undefined, 'decimal'),
                                    resp_media: tNum(idxMap.resp_mean !== undefined ? dataTokens[idxMap.resp_mean]?.toString() : undefined, 'integer'),
                                    resp_min: tNum(idxMap.resp_min !== undefined ? dataTokens[idxMap.resp_min]?.toString() : undefined, 'integer'),
                                    resp_max: tNum(idxMap.resp_max !== undefined ? dataTokens[idxMap.resp_max]?.toString() : undefined, 'integer'),
                                };

                                Object.keys(act).forEach(key => {
                                    if ((act as any)[key] === null) {
                                        delete (act as any)[key];
                                    }
                                });

                                if (act.distance_km !== undefined) {
                                    activitiesToInsert.push(act);
                                }
                            }

                            resolve(activitiesToInsert);
                        }
                    });
                } catch (err) {
                    console.error("Error parseando CSV:", err);
                    resolve([]);
                }
            };
            reader.readAsText(file);
        });
    };

    const processCSVAndUpload = async () => {
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setMessage('❌ Por favor, sube un archivo CSV válido.');
            return;
        }

        setUploading(true);
        setMessage('Extrayendo todas las columnas de Garmin Connect...');

        try {
            const parsedActivities: any[] = await parseGarminCSV(file) as any[];

            if (parsedActivities.length === 0) {
                throw new Error("No se encontraron entrenamientos legibles en el CSV. Intenta resubir.");
            }

            // Usamos Upsert delegando el filtro de duplicados a PostgreSQL
            // La base de datos ignorará silenciosamente si las 3 claves coinciden
            setMessage(`Inyectando hasta ${parsedActivities.length} entrenamientos limpios en tu Base de Datos...`);

            let insertPayload = parsedActivities.map(act => ({
                user_id: session.user.id,
                ...act
            }));

            const { error: dbError } = await supabase
                .from('activities')
                .upsert(insertPayload, {
                    onConflict: 'user_id, activity_date, distance_km',
                    ignoreDuplicates: true // Clave vital: ignora duplicados en lugar de dar error o sobreescribir
                });

            if (dbError) {
                console.error("⛔ ERROR REAL DE SUPABASE:", dbError);
                throw new Error('Error guardando en la tabla: ' + dbError.message + " - Detalles en consola.");
            }

            setMessage(`✅ ¡Exito! Sincronización completa finalizada.`);
            // 3. Avisar al Componente Principal que los datos cambiaron
            await onDataChanged();

        } catch (error: any) {
            setMessage(`❌ Error al subir: ${error.message || 'Error desconocido'} `);
        } finally {
            setUploading(false);
        }
    };

    // --- CÁLCULO DE MÉTRICAS FISIOLÓGICAS (Memoizadas) ---
    const metrics = useMemo(() => {
        if (!activities || activities.length === 0) return null;

        const dailyLoads = getDailyLoads(activities);
        const pmcData = calculatePMC(dailyLoads);
        const pmcHistory = pmcData.results;

        // Métricas "Actuales" (El verdadero último día con historial)
        const todayPMC = pmcHistory[pmcHistory.length - 1] || { ctlDisplayed: 0, atlDisplayed: 0, tsbDisplayed: 0 };

        const consistency = getConsistencyLast7Days(dailyLoads);
        const zones = getZoneDistribution(activities, 30);
        const load7d = getLoadLastNDays(dailyLoads, 7);
        const load28d = getLoadLastNDays(dailyLoads, 28);
        const sessionsThisWeek = getSessionsLast7Days(activities);

        return {
            ctl: todayPMC.ctlDisplayed || 0,
            atl: todayPMC.atlDisplayed || 0,
            tsb: todayPMC.tsbDisplayed || 0,
            history14d: pmcHistory.slice(-14), // Array de últimos 14 días para el gráfico
            maturityStatus: pmcData.status,
            daysAvailable: pmcData.daysAvailable,
            readinessScore: pmcData.readinessScore,
            consistency,
            zones,
            load7d,
            load28d,
            sessionsThisWeek
        };
    }, [activities]);

    // Helper visual para TSB (Más prudente según feedback)
    const getFormColor = (tsb: number) => {
        if (tsb > 25) return "text-sky-400"; // Muy fresco
        if (tsb >= 10) return "text-emerald-400"; // Fresco
        if (tsb >= -10) return "text-garmin-blue"; // Estable
        if (tsb >= -30) return "text-amber-400"; // Fatigado
        return "text-rose-500"; // Muy fatigado
    };
    const getFormDesc = (tsb: number) => {
        if (tsb > 25) return "Muy Fresco";
        if (tsb >= 10) return "Fresco / Tapering";
        if (tsb >= -10) return "Estable / Óptimo";
        if (tsb >= -30) return "Fatigado / Carga";
        return "Muy Fatigado / Riesgo";
    };

    return (
        <div className="w-full text-left flex flex-col h-full gap-6 lg:gap-8">
            {/* Cabecera Principal */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/50 p-6 rounded-2xl border border-border">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Panel de Entrenamiento</h2>
                    <p className="text-sm text-zinc-400 mt-1">Conectado como <span className="text-garmin-blue">{session.user.email}</span></p>
                </div>
                <button
                    onClick={() => supabase.auth.signOut()}
                    className="px-5 py-2.5 bg-zinc-800 text-sm font-medium rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all border border-zinc-700 hover:border-red-500/50"
                >
                    Cerrar Sesión
                </button>
            </div>

            {/* PANEL ANALÍTICO DE MÉTRICAS FISIOLÓGICAS */}
            {metrics && (
                <div className="flex flex-col gap-6 w-full">

                    {/* FILA 1: TARJETAS RESUMEN (Carga 7d, Carga 28d, Fatiga, Forma, Sesiones) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {/* Carga 7d */}
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-3xl flex flex-col justify-between group hover:border-zinc-700/80 transition-all shadow-xl hover:shadow-2xl relative overflow-hidden backdrop-blur-sm cursor-default">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                            <span className="text-[11px] font-bold text-zinc-500 tracking-widest mb-2">CARGA 7D</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white group-hover:scale-105 origin-left transition-transform">{metrics.load7d}</span>
                                <span className="text-[10px] text-zinc-500 font-mono">tss</span>
                            </div>
                        </div>

                        {/* Carga 28d */}
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-3xl flex flex-col justify-between group hover:border-zinc-700/80 transition-all shadow-xl hover:shadow-2xl relative overflow-hidden backdrop-blur-sm cursor-default">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                            <span className="text-[11px] font-bold text-zinc-500 tracking-widest mb-2">CARGA 28D</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white group-hover:scale-105 origin-left transition-transform">{metrics.load28d}</span>
                                <span className="text-[10px] text-zinc-500 font-mono">tss</span>
                            </div>
                        </div>

                        {/* Fatiga Actual (ATL) */}
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-3xl flex flex-col justify-between group hover:border-rose-500/30 transition-all shadow-xl hover:shadow-rose-500/10 relative overflow-hidden backdrop-blur-sm cursor-default">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent"></div>
                            <span className="text-[11px] font-bold text-zinc-500 tracking-widest mb-2 flex justify-between items-center w-full">
                                FATIGA (ATL)
                                {metrics.maturityStatus === 'provisional' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500/70">Est.</span>}
                            </span>
                            <div className="flex items-baseline gap-2">
                                {metrics.maturityStatus === 'insufficient' ? (
                                    <span className="text-xl font-black text-zinc-600">--</span>
                                ) : (
                                    <>
                                        <span className="text-3xl font-black text-rose-400 group-hover:text-rose-300 transition-colors drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]">{metrics.atl}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">tss/d</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Forma Actual (TSB) */}
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-3xl flex flex-col justify-between group relative overflow-hidden shadow-xl hover:shadow-sky-500/10 hover:border-sky-500/30 transition-all cursor-default">
                            <div className="absolute inset-0 opacity-10 blur-2xl transition-all group-hover:opacity-20 bg-gradient-to-br from-garmin-blue to-emerald-500 pointer-events-none"></div>
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/20 to-transparent"></div>
                            <span className="text-[11px] font-bold text-zinc-500 tracking-widest mb-2 relative z-10 flex justify-between items-center w-full">
                                FORMA (TSB)
                                {metrics.maturityStatus === 'provisional' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500/70">Est.</span>}
                            </span>

                            {metrics.maturityStatus === 'insufficient' ? (
                                <div className="flex flex-col justify-center h-full">
                                    <span className="text-[10px] text-zinc-500 leading-tight">Analizando historial...<br />({metrics.daysAvailable}/20 días)</span>
                                    <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${(metrics.daysAvailable / 20) * 100}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-baseline gap-2 relative z-10">
                                        <span className={`text-3xl font-black ${getFormColor(metrics.tsb)} drop-shadow-md`}>{metrics.tsb > 0 ? '+' : ''}{metrics.tsb}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold mt-1 uppercase relative z-10 ${getFormColor(metrics.tsb)} opacity-80`}>{getFormDesc(metrics.tsb)}</span>
                                </>
                            )}
                        </div>

                        {/* Sesiones de la Semana */}
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-3xl flex flex-col justify-between group hover:border-emerald-500/30 transition-all shadow-xl hover:shadow-emerald-500/10 lg:col-span-1 md:col-span-2 col-span-2 relative overflow-hidden backdrop-blur-sm cursor-default">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                            <span className="text-[11px] font-bold text-zinc-500 tracking-widest mb-2">SESIONES (7D)</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-emerald-400 group-hover:text-emerald-300 transition-colors drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{metrics.sessionsThisWeek}</span>
                                <span className="text-[10px] text-zinc-500 font-mono">actividades</span>
                            </div>
                        </div>
                    </div>

                    {/* FILA 2: GRÁFICOS (Carga Diaria, PMC, Zonas, Consistencia) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* 1. GRÁFICO CARGA DIARIA (Últimos 14 días en barras) */}
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-6 rounded-3xl flex flex-col shadow-2xl relative overflow-hidden group/chart cursor-default">
                            {/* Decorative background glow */}
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent"></div>

                            <div className="mb-6 flex justify-between items-center z-10">
                                <h4 className="text-xs font-bold text-zinc-400 tracking-widest">CARGA DIARIA (14D)</h4>
                            </div>

                            <div className="flex-1 w-full mt-4" style={{ minHeight: '200px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics.history14d} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" strokeOpacity={0.4} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(val) => new Date(val + 'T00:00:00').toLocaleDateString('es', { weekday: 'short' }).substring(0, 2).toUpperCase()}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#71717a', fontSize: 10 }}
                                            tickCount={4}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#27272a', opacity: 0.4 }}
                                            wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                            itemStyle={{ color: '#e4e4e7', fontWeight: 'bold' }}
                                            labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
                                            formatter={(value: any) => [<span className="text-garmin-blue">{Math.round(Number(value))} TSS</span>, 'Carga']}
                                            labelFormatter={(label) => new Date(label + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                                            isAnimationActive={false}
                                        />
                                        <Bar
                                            dataKey="tss"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={40}
                                            activeBar={{ filter: 'brightness(1.2)' }}
                                        >
                                            {
                                                metrics.history14d.map((entry, index) => {
                                                    let color = '#0ea5e9'; // garmin-blue
                                                    if (entry.tss > 100) color = '#f43f5e'; // rose-500
                                                    else if (entry.tss > 60) color = '#f59e0b'; // amber-500
                                                    return <Cell key={`cell-${index}`} fill={color} />;
                                                })
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. GRÁFICO PMC (CTL, ATL, TSB renderizados vía SVG nativo) */}
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-6 rounded-3xl flex flex-col relative overflow-hidden shadow-2xl">
                            {/* Decorative background glow */}
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent"></div>

                            <div className="mb-4 flex flex-col sm:flex-row justify-between sm:items-center z-10 relative gap-2">
                                <div className="flex flex-col gap-1">
                                    <h4 className="text-xs font-bold text-zinc-400 tracking-widest flex items-center gap-2">
                                        DINÁMICA DE CARGA (PMC 14D)
                                        {metrics.maturityStatus === 'provisional' && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">Calibrando ({metrics.daysAvailable}/42d)</span>}
                                        {metrics.maturityStatus === 'calibrated' && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Calibrado</span>}
                                    </h4>
                                    {metrics.maturityStatus === 'insufficient' ? (
                                        <p className="text-[10px] text-zinc-500 max-w-sm">Gráfico en construcción. Necesitamos al menos 20 días de historial para proyectar la carga cardiovascular. Días actuales: {metrics.daysAvailable}</p>
                                    ) : null}
                                </div>

                                {metrics.maturityStatus !== 'insufficient' && (
                                    <div className="flex gap-4 text-xs font-semibold bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                                        <span className="text-sky-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400"></span>CTL</span>
                                        <span className="text-rose-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400"></span>ATL</span>
                                        <span className="text-amber-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span>TSB</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 w-full mt-4" style={{ minHeight: '240px' }}>
                                {metrics.maturityStatus === 'insufficient' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/40">
                                        <svg className="w-8 h-8 text-zinc-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <p className="text-sm font-medium text-zinc-400">Recopilando datos iniciales</p>
                                        <div className="w-48 h-1.5 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                                            <div className="h-full bg-garmin-blue rounded-full transition-all duration-1000" style={{ width: `${(metrics.daysAvailable / 20) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={metrics.history14d} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorCtl" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" strokeOpacity={0.4} />
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(val) => new Date(val + 'T00:00:00').toLocaleDateString('es', { weekday: 'short' }).substring(0, 2).toUpperCase()}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                yAxisId="left"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#71717a', fontSize: 10 }}
                                            />
                                            <ReferenceLine y={0} yAxisId="left" stroke="#52525b" strokeDasharray="3 3" />
                                            <Tooltip
                                                wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                                labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '8px' }}
                                                labelFormatter={(label) => new Date(label + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                                                formatter={(value: any, name: any) => [
                                                    <span className="font-bold">{Math.round(Number(value))}</span>,
                                                    <span className="uppercase text-xs tracking-wider">{String(name)}</span>
                                                ]}
                                                isAnimationActive={false}
                                            />
                                            <Bar yAxisId="left" dataKey="tsbDisplayed" name="TSB" barSize={8} radius={[4, 4, 4, 4]} fill="#f59e0b">
                                                {
                                                    metrics.history14d.map((entry, index) => {
                                                        const color = entry.tsbDisplayed > 10 ? '#34d399' : entry.tsbDisplayed > 0 ? '#10b981' : entry.tsbDisplayed < -20 ? '#f43f5e' : '#f59e0b';
                                                        return <Cell key={`cell-${index}`} fill={color} />;
                                                    })
                                                }
                                            </Bar>
                                            <Area yAxisId="left" type="monotone" dataKey="ctlDisplayed" name="CTL" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorCtl)" activeDot={{ r: 6, strokeWidth: 0, fill: '#38bdf8' }} />
                                            <Area yAxisId="left" type="monotone" dataKey="atlDisplayed" name="ATL" stroke="#fb7185" strokeWidth={2} fill="none" activeDot={{ r: 4, strokeWidth: 0, fill: '#fb7185' }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* 3. GRÁFICO DISTRIBUCIÓN POR ZONAS */}
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-6 rounded-3xl flex flex-col justify-center shadow-2xl">
                            <h4 className="text-xs font-bold text-zinc-400 tracking-widest mb-6">DISTRIBUCIÓN POR ZONAS (30D)</h4>
                            <div className="w-full h-14 flex rounded-2xl overflow-hidden gap-1.5 mt-2 mb-6">
                                {metrics.zones.base > 0 && (
                                    <div className="bg-gradient-to-r from-sky-600 to-sky-400 h-full flex items-center justify-center transition-all hover:brightness-110 shadow-[inner_0_0_10px_rgba(255,255,255,0.1)] rounded-xl" style={{ width: `${metrics.zones.base}%` }} title={`Base/Aeróbico: ${metrics.zones.base}%`}>
                                        {metrics.zones.base > 15 && <span className="text-[11px] font-black text-white drop-shadow-md">{metrics.zones.base}%</span>}
                                    </div>
                                )}
                                {metrics.zones.umbral > 0 && (
                                    <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full flex items-center justify-center transition-all hover:brightness-110 shadow-[inner_0_0_10px_rgba(255,255,255,0.1)] rounded-xl" style={{ width: `${metrics.zones.umbral}%` }} title={`Umbral/Tempo: ${metrics.zones.umbral}%`}>
                                        {metrics.zones.umbral > 15 && <span className="text-[11px] font-black text-amber-950 drop-shadow-sm">{metrics.zones.umbral}%</span>}
                                    </div>
                                )}
                                {metrics.zones.vo2 > 0 && (
                                    <div className="bg-gradient-to-r from-rose-600 to-rose-400 h-full flex items-center justify-center transition-all hover:brightness-110 shadow-[inner_0_0_10px_rgba(255,255,255,0.1)] rounded-xl" style={{ width: `${metrics.zones.vo2}%` }} title={`VO2/Anaeróbico: ${metrics.zones.vo2}%`}>
                                        {metrics.zones.vo2 > 15 && <span className="text-[11px] font-black text-white drop-shadow-md">{metrics.zones.vo2}%</span>}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between w-full text-xs font-medium text-zinc-400 mt-auto bg-black/20 p-3 rounded-xl border border-white/5">
                                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]"></span> Z1/Z2 (Base)</span>
                                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span> Z3/Z4 (Umbral)</span>
                                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span> Z5+ (VO2 Max)</span>
                            </div>
                        </div>

                        {/* 4. GRÁFICO CONSISTENCIA SEMANAL */}
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-6 rounded-3xl flex flex-col justify-center shadow-2xl">
                            <h4 className="text-xs font-bold text-zinc-400 tracking-widest mb-6">CONSISTENCIA SEMANAL</h4>
                            <div className="flex justify-between items-center w-full gap-2 lg:gap-3 mt-auto">
                                {/* Generar historial de los últimos 7 días */}
                                {(() => {
                                    const grid = [];
                                    const totalDays = 7;
                                    const today = new Date();

                                    for (let i = totalDays - 1; i >= 0; i--) {
                                        const d = new Date(today);
                                        d.setDate(today.getDate() - i);
                                        const dateStr = d.toISOString().split('T')[0];

                                        // Buscar si en ese día hubo TSS
                                        const metricObj = metrics.history14d.find(x => x.date === dateStr);
                                        const hasLoad = (metricObj && metricObj.tss > 0);
                                        const dayName = d.toLocaleDateString('es', { weekday: 'short' }).substring(0, 2);

                                        grid.push(
                                            <div key={i} className="flex-1 flex flex-col items-center gap-3">
                                                <div
                                                    className={`w-full aspect-square rounded-2xl max-w-[56px] border flex items-center justify-center transition-all ${hasLoad ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-black/30 border-white/5 text-zinc-700 shadow-inner'}`}
                                                    title={dateStr}
                                                >
                                                    {hasLoad ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 2px 4px rgba(16,185,129,0.5))' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    ) : (
                                                        <span className="w-2 h-2 rounded-full bg-zinc-800"></span>
                                                    )}
                                                </div>
                                                <span className={`text-[11px] font-bold uppercase tracking-wider ${hasLoad ? 'text-emerald-500/80' : 'text-zinc-600'}`}>{dayName}</span>
                                            </div>
                                        );
                                    }
                                    return grid;
                                })()}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Layout Principal Grid: 1 columna en movil, 3 columnas asimétricas en PC */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full flex-1">

                {/* Panel Izquierdo: Uploader (Ocupa 4 columnas de 12 en PC) */}
                <div className="lg:col-span-4 flex flex-col h-fit">
                    <div className="bg-zinc-900 border border-border rounded-2xl p-6 sticky top-6">
                        <div className="mb-6">
                            <h3 className="font-semibold text-xl">Sincronizador CSV</h3>
                            <p className="text-zinc-400 text-sm mt-2">Arrastra tu exportación de Garmin Connect. Nuestro parser extraerá y filtrará las métricas automáticamente.</p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer bg-zinc-800/30 hover:bg-zinc-800/80 hover:border-garmin-blue transition-all group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                    <svg className="w-10 h-10 text-garmin-blue/70 mb-3 group-hover:scale-110 transition-transform" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                    </svg>
                                    <p className="text-sm font-medium text-zinc-300 truncate w-full">{file ? file.name : "Seleccionar o Soltar CSV"}</p>
                                </div>
                                <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                            </label>

                            <button
                                onClick={processCSVAndUpload}
                                disabled={!file || uploading}
                                className={`w-full py-3.5 rounded-xl font-semibold shadow-lg transition-all ${!file || uploading
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                                    : 'bg-garmin-blue text-white hover:bg-blue-600 hover:shadow-garmin-blue/20 hover:-translate-y-0.5'
                                    }`}
                            >
                                {uploading ? 'Procesando en la Nube...' : 'Sincronizar Datos'}
                            </button>

                            {message && (
                                <div className={`p-4 rounded-xl text-sm font-medium mt-2 border ${message.includes('❌') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel Derecho: Historial (Ocupa 8 columnas de 12 en PC) */}
                <div className="lg:col-span-8 flex flex-col">
                    <div className="bg-zinc-900 border border-border rounded-2xl p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-semibold text-xl">Tu Historial de Actividades</h3>
                            <span className="text-xs font-semibold px-3 py-1 bg-garmin-blue/20 text-garmin-blue rounded-full">
                                {activities.length} total
                            </span>
                        </div>

                        {activities.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border rounded-xl">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                                </div>
                                <h4 className="text-lg font-medium text-zinc-300">Aún no hay actividades guardadas</h4>
                                <p className="text-zinc-500 text-sm mt-2 max-w-sm">Sube tu primer archivo de Garmin en el panel lateral para empezar a visualizar tus métricas.</p>
                            </div>
                        ) : (
                            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar min-h-[400px]">
                                {activities.map((act) => (
                                    <div key={act.id} className="p-5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
                                        <div className="flex-1 min-w-0 w-full xl:w-auto">
                                            <p className="font-semibold text-garmin-blue text-lg truncate" title={act.file_name || act.titulo || 'Entrenamiento Garmin'}>
                                                {act.file_name || act.titulo || 'Entrenamiento Garmin'}
                                            </p>
                                            <p className="text-sm text-zinc-400 mt-1 truncate">
                                                {act.activity_date
                                                    ? new Date(act.activity_date).toLocaleString('es-CL', {
                                                        timeZone: 'America/Santiago',
                                                        dateStyle: 'long',
                                                        timeStyle: 'short'
                                                    })
                                                    : 'Fecha Desconocida'}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm w-full xl:w-fit bg-zinc-900/50 p-4 rounded-lg border border-zinc-700/30 shrink-0">
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Distancia</span>
                                                <span className="font-semibold text-zinc-200">{parseFloat(act.distance_km || 0).toFixed(1)} <span className="text-zinc-500 font-normal">km</span></span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Potencia</span>
                                                <span className="font-semibold text-amber-400">{act.potencia_media || 0} <span className="text-amber-400/50 font-normal">W</span></span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Pulso</span>
                                                <span className="font-semibold text-rose-400">{act.fc_media || 0} <span className="text-rose-400/50 font-normal">BPM</span></span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Tiempo</span>
                                                <span className="font-semibold text-zinc-300">{act.tiempo_transcurrido || act.tiempo || '00:00:00'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
