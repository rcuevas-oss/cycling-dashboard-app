import React, { useState } from 'react';
import { FileDigit, Table } from 'lucide-react';
import { parseGarminFitPreviewWithOfficialSdk } from '../lib/garmin/browserFitSdk';
import { GarminFitPreviewData } from '../lib/garmin/fitTypes';

export function FitParserTest() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string>('Esperando archivo...');
    const [parsedData, setParsedData] = useState<GarminFitPreviewData | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const parseFitFile = async () => {
        if (!file) return;
        setStatus('Procesando archivo binario...');
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const preview = parseGarminFitPreviewWithOfficialSdk(arrayBuffer, file.name);

                console.log('Garmin FIT Preview:', preview);
                setParsedData(preview);
                setStatus(
                    `✅ Éxito: ${preview.normalized.laps.length} vueltas, ${preview.normalized.steps.length} pasos y ${preview.raw.records.length} puntos de registro.`,
                );
            } catch (err: any) {
                console.error('Error parseando FIT:', err);
                setStatus(`❌ Error: ${err.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="p-8 bg-zinc-900 min-h-screen text-zinc-100 flex flex-col gap-8">
            <div className="max-w-4xl mx-auto w-full space-y-6">
                <div className="bg-indigo-600/10 border border-indigo-500/30 p-6 rounded-2xl">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-indigo-400">
                        <FileDigit className="w-6 h-6" /> Entorno de Pruebas Garmin .FIT
                    </h2>
                    <p className="text-zinc-400 mt-2">
                        Este entorno es **aislado**. Carga un archivo `.fit` para ver cómo el sistema decodifica los datos binarios originales.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-zinc-500 uppercase">Selecciona Archivo .fit</label>
                        <input 
                            type="file" 
                            accept=".fit" 
                            onChange={handleFileChange}
                            className="bg-zinc-800 p-3 rounded-xl border border-zinc-700 w-full"
                        />
                    </div>
                    <button 
                        onClick={parseFitFile}
                        disabled={!file}
                        className="h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl font-bold mt-auto shadow-lg shadow-indigo-500/20"
                    >
                        Parsear Archivo FIT
                    </button>
                </div>

                <div className="p-4 bg-black/40 rounded-xl border border-zinc-800 text-sm font-mono text-indigo-300">
                    Estado: {status}
                </div>

                {parsedData?.normalized.session && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Table className="w-5 h-5 text-garmin-blue" /> Paso 1: Datos de Sesión (Resumen Maestro)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                <MetricBox label="Distancia" value={`${(((parsedData.normalized.session.distance_m || 0) as number) / 1000).toFixed(2)} km`} />
                                <MetricBox label="Tiempo" value={`${(((parsedData.normalized.session.elapsed_time_seconds || 0) as number) / 60).toFixed(1)} min`} />
                                <MetricBox label="Potencia Med" value={`${parsedData.normalized.session.average_power || 0} W`} />
                                <MetricBox label="Potencia Máx" value={`${parsedData.normalized.session.max_power || 0} W`} color="text-amber-400" />
                                <MetricBox label="Potencia Norm (NP)" value={`${parsedData.normalized.session.normalized_power || '--'} W`} color="text-indigo-400" />
                                <MetricBox label="IF" value={parsedData.normalized.session.intensity_factor || '--'} color="text-sky-400" />
                                <MetricBox label="TSS (FIT)" value={parsedData.normalized.session.training_stress_score || '--'} color="text-sky-500" />
                                <MetricBox label="HR Med/Máx" value={`${parsedData.normalized.session.average_heartrate || 0} / ${parsedData.normalized.session.max_heartrate || 0}`} color="text-rose-400" />
                                <MetricBox label="Aero TE" value={parsedData.normalized.session.aerobic_training_effect || '--'} color="text-emerald-400" />
                                <MetricBox label="Anaero TE" value={parsedData.normalized.session.anaerobic_training_effect || '--'} color="text-purple-400" />
                                <MetricBox label="Ascenso" value={`${parsedData.normalized.session.ascenso_total || 0} m`} color="text-emerald-500" />
                                <MetricBox label="Pasos" value={`${parsedData.normalized.steps.length}`} />
                            </div>
                        </div>

                        <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700 overflow-x-auto">
                            <h3 className="text-lg font-bold mb-4">Paso 2: Tabla de Vueltas (Laps)</h3>
                            <table className="w-full text-sm text-left">
                                <thead className="text-zinc-500 border-b border-zinc-700">
                                    <tr>
                                        <th className="pb-2">Lap</th>
                                        <th className="pb-2">Distancia</th>
                                        <th className="pb-2">Tiempo</th>
                                        <th className="pb-2">Watts (Med/Max)</th>
                                        <th className="pb-2">NP Lap</th>
                                        <th className="pb-2">Cadencia</th>
                                        <th className="pb-2">HR Med</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {parsedData.normalized.laps.map((lap, i: number) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="py-2 text-zinc-400">{i + 1}</td>
                                            <td className="py-2 font-medium">{(((lap.total_distance_m || 0) as number) / 1000).toFixed(2)} km</td>
                                            <td className="py-2 font-medium">{(((lap.total_elapsed_time_seconds || 0) as number) / 60).toFixed(1)} min</td>
                                            <td className="py-2">
                                                <span className="text-indigo-400 font-bold">{lap.avg_power || 0}W</span>
                                                <span className="text-zinc-600 text-xs ml-1">/ {lap.max_power || 0}W</span>
                                            </td>
                                            <td className="py-2 text-sky-400">{lap.normalized_power || '--'} W</td>
                                            <td className="py-2">{lap.avg_cadence || 0}</td>
                                            <td className="py-2 text-rose-400">{lap.avg_heart_rate || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricBox({ label, value, color = "text-white" }: { label: string, value: any, color?: string }) {
    return (
        <div className="flex flex-col bg-black/30 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">{label}</span>
            <span className={`text-lg font-black ${color}`}>{value}</span>
        </div>
    );
}
