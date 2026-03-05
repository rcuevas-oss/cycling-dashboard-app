import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

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

                    const lines = text.split('\n');
                    if (lines.length < 2) return resolve([]);

                    const activitiesToInsert = [];

                    // --- NUEVO MAPEO DINÁMICO DE CABECERAS ---
                    const rawHeaders = lines[0].toLowerCase();
                    const headers = rawHeaders.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().replace(/^"|"$/g, ''));

                    const findIdx = (keywords: string[], fallback: number) => {
                        const idx = headers.findIndex(h => keywords.some(kw => h.includes(kw)));
                        return idx === -1 ? fallback : idx;
                    };

                    const idxMap: Record<string, number> = {
                        date: findIdx(['fecha', 'date', 'tiempo', 'time'], 1),
                        duration: findIdx(['tiempo', 'time', 'duración', 'duration'], 6),
                        dist: findIdx(['distancia', 'distance'], 4),
                        cal: findIdx(['calor', 'calorie'], 5), // calor matches CalorÃ­as
                        hr_mean: findIdx(['fc media', 'avg hr', 'mean hr', 'frecuencia card'], 12), // frecuencia card matches Frecuencia cardÃ­aca
                        hr_max: findIdx(['fc max', 'max hr'], 13), // fails accent -> fallback 13
                        cad_mean: findIdx(['cadencia media', 'avg cadence'], 14),
                        cad_max: findIdx(['cadencia m', 'max cadence'], 15),
                        np: findIdx(['np', 'potencia normalizada', 'normalized power'], 16),
                        tss: findIdx(['tss', 'training stress score'], 17),
                        p20: findIdx(['20 min', '20min'], 18),
                        p_mean: findIdx(['potencia media', 'avg power'], 19),
                        p_max: findIdx(['potencia m', 'max power'], 20),
                        strokes: findIdx(['pedaladas', 'strokes'], 21),
                        temp_min: findIdx(['temp. min', 'min temp'], 22),
                        descompresion: findIdx(['descompresi'], 23),
                        laps: findIdx(['vueltas', 'laps'], 25),
                        temp_max: findIdx(['temp. max', 'max temp'], 26),
                        resp_mean: findIdx(['resp. media', 'avg resp'], 27),
                        resp_min: findIdx(['resp. m', 'min resp'], 28),
                        resp_max: findIdx(['resp. m', 'max resp'], 29),
                    };

                    const tNum = (val: string | undefined, metricType: 'auto' | 'decimal' | 'integer' = 'auto') => {
                        if (!val || val === '--' || val === '') return null;

                        let cleaned = val.replace(/^"|"$/g, '').trim();
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
                        } else {
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
                    }

                    // Iterar por todas las líneas saltando la cabecera
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line || line.startsWith('"Tipo de actividad')) continue;

                        const dataTokens = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(t => t.trim().replace(/^"|"$/g, ''));

                        if (dataTokens.length < 10) continue;

                        let fecha = null;
                        if (dataTokens[idxMap.date]) {
                            let dateStr = dataTokens[idxMap.date].replace(/"/g, '').trim();

                            const isDDMMYYYY = /^(\d{2})[-/](\d{2})[-/](\d{4})/.test(dateStr);
                            if (isDDMMYYYY) {
                                dateStr = dateStr.replace(/^(\d{2})[-/](\d{2})[-/](\d{4})/, '$3-$2-$1');
                            }

                            dateStr = dateStr.replace(' ', 'T');

                            const parseDate = new Date(dateStr);

                            if (!isNaN(parseDate.getTime())) {
                                fecha = parseDate.toISOString();
                            }
                        }

                        let duration_minutes = null;
                        if (dataTokens[idxMap.duration]) {
                            const timeParts = dataTokens[idxMap.duration].split(':').map(Number);
                            if (timeParts.length === 3) {
                                duration_minutes = Math.round(timeParts[0] * 60 + timeParts[1] + timeParts[2] / 60);
                            } else if (timeParts.length === 2) {
                                duration_minutes = Math.round(timeParts[0] + timeParts[1] / 60);
                            }
                        }

                        const act = {
                            activity_date: fecha,
                            distance_km: tNum(dataTokens[idxMap.dist], 'decimal'),
                            calorias: tNum(dataTokens[idxMap.cal], 'integer'),
                            duration_minutes: duration_minutes,

                            tiempo: dataTokens[idxMap.duration] && dataTokens[idxMap.duration] !== '--' ? dataTokens[idxMap.duration] : null,
                            tiempo_movimiento: dataTokens[30] && dataTokens[30] !== '--' ? dataTokens[30] : null,
                            tiempo_transcurrido: dataTokens[31] && dataTokens[31] !== '--' ? dataTokens[31] : null,
                            mejor_vuelta: dataTokens[24] && dataTokens[24] !== '--' ? dataTokens[24] : null,

                            fc_media: tNum(dataTokens[idxMap.hr_mean], 'integer'),
                            fc_maxima: tNum(dataTokens[idxMap.hr_max], 'integer'),
                            te_aerobico: tNum(dataTokens[9]),
                            velocidad_media: tNum(dataTokens[10]),
                            velocidad_maxima: tNum(dataTokens[11]),
                            ascenso_total: tNum(dataTokens[12]),
                            descenso_total: tNum(dataTokens[13]),
                            altura_min: tNum(dataTokens[32]),
                            altura_max: tNum(dataTokens[33]),

                            cadencia_media: tNum(dataTokens[idxMap.cad_mean], 'integer'),
                            cadencia_maxima: tNum(dataTokens[idxMap.cad_max], 'integer'),

                            normalized_power: tNum(dataTokens[idxMap.np], 'integer'),
                            training_stress_score: tNum(dataTokens[idxMap.tss], 'integer'),
                            potencia_20min: tNum(dataTokens[idxMap.p20], 'integer'),
                            potencia_media: tNum(dataTokens[idxMap.p_mean], 'integer'),
                            potencia_maxima: tNum(dataTokens[idxMap.p_max], 'integer'),
                            pedaladas_totales: tNum(dataTokens[idxMap.strokes], 'integer'),

                            temperatura_min: tNum(dataTokens[idxMap.temp_min], 'decimal'),
                            descompresion: dataTokens[idxMap.descompresion] && dataTokens[idxMap.descompresion] !== '--' ? dataTokens[idxMap.descompresion] : null,
                            numero_vueltas: tNum(dataTokens[idxMap.laps], 'integer'),
                            temperatura_max: tNum(dataTokens[idxMap.temp_max], 'decimal'),
                            resp_media: tNum(dataTokens[idxMap.resp_mean], 'integer'),
                            resp_min: tNum(dataTokens[idxMap.resp_min], 'integer'),
                            resp_max: tNum(dataTokens[idxMap.resp_max], 'integer'),
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
