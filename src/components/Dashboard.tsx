import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export function Dashboard({ session }: { session: Session }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [activities, setActivities] = useState<any[]>([]);

    const fetchActivities = async () => {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('activity_date', { ascending: false });

        if (!error && data) {
            setActivities(data);
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

                    const tNum = (val: string, _isInt = false) => {
                        if (!val || val === '--' || val === '') return null;

                        // Quitamos comillas si Garmin las envolvió (ej: `"145"`)
                        let cleaned = val.replace(/^"|"$/g, '').trim();
                        if (cleaned === '') return null;

                        // Regla maestra de limpieza numérica pro (Soporta formatos USA y EU)
                        if (cleaned.includes(',') && cleaned.includes('.')) {
                            if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
                                cleaned = cleaned.replace(/,/g, ''); // USA: 1,234.56 -> 1234.56
                            } else {
                                cleaned = cleaned.replace(/\./g, '').replace(',', '.'); // EU: 1.234,56 -> 1234.56
                            }
                        } else if (cleaned.includes(',')) {
                            // Tiene coma pero no punto. Garmin exporta miles como "1,244". 
                            // Si tiene 3 dígitos tras la coma, asumimos que es separador de miles.
                            if (/,\d{3}$/.test(cleaned) && cleaned.length >= 5) {
                                cleaned = cleaned.replace(/,/g, ''); // 1,244 -> 1244
                            } else {
                                cleaned = cleaned.replace(',', '.'); // 15,5 -> 15.5
                            }
                        }

                        // Parsear explícitamente a Número de Javascript antes de enviarlo a PostgreSQL
                        const num = Number(cleaned);
                        return isNaN(num) ? null : num;
                    }

                    // Iterar por todas las líneas saltando la cabecera
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        // Separar por comas respetando comillas
                        const dataTokens = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(t => t.trim().replace(/^"|"$/g, ''));

                        // Validar si la fila tiene la longitud esperada para este nuevo formato (61 columnas aprox)
                        if (dataTokens.length < 10) continue;

                        let fecha = null;
                        if (dataTokens[1]) {
                            // Garmin Chile suele devolver "DD-MM-YYYY HH:mm:ss" pero a veces "YYYY-MM-DD HH:mm:ss"
                            let dateStr = dataTokens[1].replace(/"/g, '').trim();

                            // Si detecta DD-MM-YYYY o DD/MM/YYYY, lo invierte a YYYY-MM-DD para compatibilidad absoluta de JS
                            const isDDMMYYYY = /^(\d{2})[-/](\d{2})[-/](\d{4})/.test(dateStr);
                            if (isDDMMYYYY) {
                                dateStr = dateStr.replace(/^(\d{2})[-/](\d{2})[-/](\d{4})/, '$3-$2-$1');
                            }

                            // Sustituir el espacio entre fecha y hora por una T para asegurar la sintaxis ISO en todos los navegadores
                            dateStr = dateStr.replace(' ', 'T');

                            const parseDate = new Date(dateStr);

                            // Si logró parsearlo adecuadamente
                            if (!isNaN(parseDate.getTime())) {
                                fecha = parseDate.toISOString();
                            }
                        }

                        // Mapeo exhaustivo para las 61 columnas reales del archivo final de Garmin
                        // Calcular duration_minutes (int4) desde la string "1:45:20"
                        let duration_minutes = null;
                        if (dataTokens[6]) {
                            const timeParts = dataTokens[6].split(':').map(Number);
                            if (timeParts.length === 3) {
                                duration_minutes = Math.round(timeParts[0] * 60 + timeParts[1] + timeParts[2] / 60);
                            } else if (timeParts.length === 2) {
                                duration_minutes = Math.round(timeParts[0] + timeParts[1] / 60);
                            }
                        }

                        const act = {
                            // Columnas de variables existentes en Supabase actual:
                            activity_date: fecha,
                            distance_km: tNum(dataTokens[4]),
                            calorias: tNum(dataTokens[5]),
                            duration_minutes: duration_minutes,

                            // Tiempos (Pasan como texto)
                            tiempo: dataTokens[6] && dataTokens[6] !== '--' ? dataTokens[6] : null,
                            tiempo_movimiento: dataTokens[30] && dataTokens[30] !== '--' ? dataTokens[30] : null,
                            tiempo_transcurrido: dataTokens[31] && dataTokens[31] !== '--' ? dataTokens[31] : null,
                            mejor_vuelta: dataTokens[24] && dataTokens[24] !== '--' ? dataTokens[24] : null,

                            // FC
                            fc_media: tNum(dataTokens[7]),
                            fc_maxima: tNum(dataTokens[8]),
                            te_aerobico: tNum(dataTokens[9]),

                            // Velocidad
                            velocidad_media: tNum(dataTokens[10]),
                            velocidad_maxima: tNum(dataTokens[11]),

                            // Ascenso/Descenso
                            ascenso_total: tNum(dataTokens[12]),
                            descenso_total: tNum(dataTokens[13]),
                            altura_min: tNum(dataTokens[32]),
                            altura_max: tNum(dataTokens[33]),

                            // Cadencia
                            cadencia_media: tNum(dataTokens[14]),
                            cadencia_maxima: tNum(dataTokens[15]),

                            // Potencia
                            normalized_power: tNum(dataTokens[16]),
                            training_stress_score: tNum(dataTokens[17]),
                            potencia_20min: tNum(dataTokens[18]),
                            potencia_media: tNum(dataTokens[19]),
                            potencia_maxima: tNum(dataTokens[20]),
                            pedaladas_totales: tNum(dataTokens[21]),

                            // Clima Extras
                            temperatura_min: tNum(dataTokens[22]),
                            descompresion: dataTokens[23] && dataTokens[23] !== '--' ? dataTokens[23] : null,
                            numero_vueltas: tNum(dataTokens[25]),
                            temperatura_max: tNum(dataTokens[26]),

                            // Respiración
                            resp_media: tNum(dataTokens[27]),
                            resp_min: tNum(dataTokens[28]),
                            resp_max: tNum(dataTokens[29]),
                        };

                        // Purgar valores 'null' del objeto para enviar solo lo existente y útil
                        Object.keys(act).forEach(key => {
                            if ((act as any)[key] === null) {
                                delete (act as any)[key];
                            }
                        });


                        // Insistir que solo pasa si calculó la distancia (usando la llave real de supabase)
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
            setFile(null);
            fetchActivities();
        } catch (error: any) {
            setMessage(`❌ Error al subir: ${error.message || 'Error desconocido'}`);
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
                                    <div key={act.id} className="p-5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-garmin-blue text-lg truncate" title={act.file_name || act.titulo || 'Entrenamiento Garmin'}>
                                                {act.file_name || act.titulo || 'Entrenamiento Garmin'}
                                            </p>
                                            <p className="text-sm text-zinc-400 mt-1">
                                                {act.activity_date
                                                    ? new Date(act.activity_date).toLocaleString('es-CL', {
                                                        timeZone: 'America/Santiago',
                                                        dateStyle: 'long',
                                                        timeStyle: 'short'
                                                    })
                                                    : 'Fecha Desconocida'}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm w-full md:w-auto bg-zinc-900/50 p-3 rounded-lg border border-zinc-700/30">
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
