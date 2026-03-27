import { useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { supabase } from '../lib/supabase';
import {
    calculatePMC,
    getConsistencyLast7Days,
    getDailyLoads,
    getLoadLastNDays,
    getPowerHistory,
    getSessionsLast7Days,
    getZoneDistribution,
} from '../lib/metricsUtils';
import { ActivitySummary } from '../lib/activityTypes';
import { FitSyncCard } from './FitSyncCard';

interface DashboardProps {
    session: Session;
    activities: ActivitySummary[];
    onDataChanged: () => Promise<void>;
}

function getFormColor(tsb: number) {
    if (tsb > 25) return 'text-sky-400';
    if (tsb >= 10) return 'text-emerald-400';
    if (tsb >= -10) return 'text-garmin-blue';
    if (tsb >= -30) return 'text-amber-400';
    return 'text-rose-500';
}

function getFormDesc(tsb: number) {
    if (tsb > 25) return 'Muy Fresco';
    if (tsb >= 10) return 'Fresco / Tapering';
    if (tsb >= -10) return 'Estable / Optimo';
    if (tsb >= -30) return 'Fatigado / Carga';
    return 'Muy Fatigado / Riesgo';
}

function formatWeekday(value: string) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('es', { weekday: 'short' }).substring(0, 2).toUpperCase();
}

function formatShortDate(value: string) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function formatLongDateTime(value?: string | null) {
    if (!value) return 'Fecha desconocida';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'long', timeStyle: 'short' });
}

export function Dashboard({ session, activities, onDataChanged }: DashboardProps) {
    const metrics = useMemo(() => {
        if (!activities?.length) return null;

        const dailyLoads = getDailyLoads(activities);
        const pmcData = calculatePMC(dailyLoads);
        const pmcHistory = pmcData.results;
        const todayPMC = pmcHistory[pmcHistory.length - 1] || { ctlDisplayed: 0, atlDisplayed: 0, tsbDisplayed: 0 };

        return {
            ctl: todayPMC.ctlDisplayed || 0,
            atl: todayPMC.atlDisplayed || 0,
            tsb: todayPMC.tsbDisplayed || 0,
            history14d: pmcHistory.slice(-14),
            history90d: pmcHistory.slice(-90),
            maturityStatus: pmcData.status,
            daysAvailable: pmcData.daysAvailable,
            consistency: getConsistencyLast7Days(dailyLoads),
            zones: getZoneDistribution(activities, 30),
            load7d: getLoadLastNDays(dailyLoads, 7),
            load28d: getLoadLastNDays(dailyLoads, 28),
            sessionsThisWeek: getSessionsLast7Days(activities),
            powerHistory90d: getPowerHistory(activities, 90),
        };
    }, [activities]);

    const recentActivities = useMemo(() => activities.slice(0, 150), [activities]);

    return (
        <div className="w-full text-left flex flex-col h-full gap-6 lg:gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/50 p-6 rounded-2xl border border-border">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Panel de Entrenamiento</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        Conectado como <span className="text-garmin-blue">{session.user.email}</span>
                    </p>
                </div>
                <button
                    onClick={() => supabase.auth.signOut()}
                    className="px-5 py-2.5 bg-zinc-800 text-sm font-medium rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all border border-zinc-700 hover:border-red-500/50"
                >
                    Cerrar Sesion
                </button>
            </div>

            {metrics && (
                <div className="flex flex-col gap-6 w-full">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-3xl flex flex-col justify-between shadow-xl relative overflow-hidden">
                            <span className="text-[11px] font-bold text-zinc-500 tracking-widest mb-2">CARGA 7D</span>
                            <div className="flex items-baseline gap-2"><span className="text-3xl font-black text-white">{metrics.load7d}</span><span className="text-[10px] text-zinc-500 font-mono">tss</span></div>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-3xl flex flex-col justify-between shadow-xl relative overflow-hidden">
                            <span className="text-[11px] font-bold text-zinc-500 tracking-widest mb-2">CARGA 28D</span>
                            <div className="flex items-baseline gap-2"><span className="text-3xl font-black text-white">{metrics.load28d}</span><span className="text-[10px] text-zinc-500 font-mono">tss</span></div>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-3xl flex flex-col justify-between shadow-xl relative overflow-hidden">
                            <span className="text-[11px] font-bold text-zinc-500 tracking-widest mb-2">FATIGA (ATL)</span>
                            <div className="flex items-baseline gap-2">
                                {metrics.maturityStatus === 'insufficient' ? <span className="text-xl font-black text-zinc-600">--</span> : <><span className="text-3xl font-black text-rose-400">{metrics.atl}</span><span className="text-[10px] text-zinc-500 font-mono">tss/d</span></>}
                            </div>
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-3xl flex flex-col justify-between shadow-xl relative overflow-hidden">
                            <span className="text-[11px] font-bold text-zinc-500 tracking-widest mb-2">FORMA (TSB)</span>
                            {metrics.maturityStatus === 'insufficient' ? <span className="text-[10px] text-zinc-500">Analizando historial... ({metrics.daysAvailable}/20 dias)</span> : <>
                                <span className={`text-3xl font-black ${getFormColor(metrics.tsb)}`}>{metrics.tsb > 0 ? '+' : ''}{metrics.tsb}</span>
                                <span className={`text-[10px] font-bold mt-1 uppercase ${getFormColor(metrics.tsb)} opacity-80`}>{getFormDesc(metrics.tsb)}</span>
                            </>}
                        </div>
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-3xl flex flex-col justify-between shadow-xl relative overflow-hidden md:col-span-2 lg:col-span-1 col-span-2">
                            <span className="text-[11px] font-bold text-zinc-500 tracking-widest mb-2">SESIONES (7D)</span>
                            <div className="flex items-baseline gap-2"><span className="text-3xl font-black text-emerald-400">{metrics.sessionsThisWeek}</span><span className="text-[10px] text-zinc-500 font-mono">actividades</span></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-6 rounded-3xl flex flex-col shadow-2xl relative overflow-hidden">
                            <div className="mb-6 flex justify-between items-center z-10">
                                <h4 className="text-xs font-bold text-zinc-400 tracking-widest">CARGA DIARIA (14D)</h4>
                            </div>
                            <div className="flex-1 w-full mt-4" style={{ minHeight: '200px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics.history14d} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" strokeOpacity={0.4} />
                                        <XAxis dataKey="date" tickFormatter={formatWeekday} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} tickCount={4} />
                                        <Tooltip
                                            cursor={{ fill: '#27272a', opacity: 0.4 }}
                                            wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                            itemStyle={{ color: '#e4e4e7', fontWeight: 'bold' }}
                                            labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
                                            formatter={(value: any) => [<span className="text-garmin-blue">{Math.round(Number(value || 0))} TSS</span>, 'Carga']}
                                            labelFormatter={(label: any) => new Date(`${label}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                                            isAnimationActive={false}
                                        />
                                        <Bar dataKey="tss" radius={[4, 4, 0, 0]} maxBarSize={40} activeBar={{ filter: 'brightness(1.2)' }}>
                                            {metrics.history14d.map((entry, index) => {
                                                let color = '#0ea5e9';
                                                if (entry.tss > 100) color = '#f43f5e';
                                                else if (entry.tss > 60) color = '#f59e0b';
                                                return <Cell key={`daily-load-${index}`} fill={color} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-6 rounded-3xl flex flex-col relative overflow-hidden shadow-2xl">
                            <div className="mb-4 flex flex-col sm:flex-row justify-between sm:items-center z-10 relative gap-2">
                                <div className="flex flex-col gap-1">
                                    <h4 className="text-xs font-bold text-zinc-400 tracking-widest flex items-center gap-2">
                                        DINAMICA DE CARGA (PMC 14D)
                                        {metrics.maturityStatus === 'provisional' && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">Calibrando ({metrics.daysAvailable}/42d)</span>}
                                        {metrics.maturityStatus === 'calibrated' && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Calibrado</span>}
                                    </h4>
                                    {metrics.maturityStatus === 'insufficient' ? (
                                        <p className="text-[10px] text-zinc-500 max-w-sm">Grafico en construccion. Necesitamos al menos 20 dias de historial para proyectar la carga cardiovascular. Dias actuales: {metrics.daysAvailable}</p>
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
                                        <p className="text-sm font-medium text-zinc-400">Recopilando datos iniciales</p>
                                        <div className="w-48 h-1.5 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                                            <div className="h-full bg-garmin-blue rounded-full transition-all duration-1000" style={{ width: `${(metrics.daysAvailable / 20) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={metrics.history14d} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorCtl14" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" strokeOpacity={0.4} />
                                            <XAxis dataKey="date" tickFormatter={formatWeekday} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }} dy={10} />
                                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                                            <ReferenceLine y={0} yAxisId="left" stroke="#52525b" strokeDasharray="3 3" />
                                            <Tooltip
                                                wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                                labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '8px' }}
                                                labelFormatter={(label: any) => new Date(`${label}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                                                formatter={(value: any, name: any) => [<span className="font-bold">{Math.round(Number(value || 0))}</span>, <span className="uppercase text-xs tracking-wider">{String(name)}</span>]}
                                                isAnimationActive={false}
                                            />
                                            <Bar yAxisId="left" dataKey="tsbDisplayed" name="TSB" barSize={8} radius={[4, 4, 4, 4]} fill="#f59e0b">
                                                {metrics.history14d.map((entry, index) => {
                                                    const color = entry.tsbDisplayed > 10 ? '#34d399' : entry.tsbDisplayed > 0 ? '#10b981' : entry.tsbDisplayed < -20 ? '#f43f5e' : '#f59e0b';
                                                    return <Cell key={`pmc-14-${index}`} fill={color} />;
                                                })}
                                            </Bar>
                                            <Area yAxisId="left" type="monotone" dataKey="ctlDisplayed" name="CTL" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorCtl14)" activeDot={{ r: 6, strokeWidth: 0, fill: '#38bdf8' }} />
                                            <Area yAxisId="left" type="monotone" dataKey="atlDisplayed" name="ATL" stroke="#fb7185" strokeWidth={2} fill="none" activeDot={{ r: 4, strokeWidth: 0, fill: '#fb7185' }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-6 rounded-3xl flex flex-col justify-center shadow-2xl">
                            <h4 className="text-xs font-bold text-zinc-400 tracking-widest mb-6">DISTRIBUCION POR ZONAS (30D)</h4>
                            <div className="w-full h-14 flex rounded-2xl overflow-hidden gap-1.5 mt-2 mb-6">
                                {metrics.zones.base > 0 && <div className="bg-gradient-to-r from-sky-600 to-sky-400 h-full flex items-center justify-center rounded-xl" style={{ width: `${metrics.zones.base}%` }}>{metrics.zones.base > 15 && <span className="text-[11px] font-black text-white">{metrics.zones.base}%</span>}</div>}
                                {metrics.zones.umbral > 0 && <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full flex items-center justify-center rounded-xl" style={{ width: `${metrics.zones.umbral}%` }}>{metrics.zones.umbral > 15 && <span className="text-[11px] font-black text-amber-950">{metrics.zones.umbral}%</span>}</div>}
                                {metrics.zones.vo2 > 0 && <div className="bg-gradient-to-r from-rose-600 to-rose-400 h-full flex items-center justify-center rounded-xl" style={{ width: `${metrics.zones.vo2}%` }}>{metrics.zones.vo2 > 15 && <span className="text-[11px] font-black text-white">{metrics.zones.vo2}%</span>}</div>}
                            </div>
                            <div className="flex justify-between w-full text-xs font-medium text-zinc-400 mt-auto bg-black/20 p-3 rounded-xl border border-white/5">
                                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400"></span> Z1/Z2 (Base)</span>
                                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300"></span> Z3/Z4 (Umbral)</span>
                                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400"></span> Z5+ (VO2 Max)</span>
                            </div>
                        </div>

                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-6 rounded-3xl flex flex-col justify-center shadow-2xl">
                            <h4 className="text-xs font-bold text-zinc-400 tracking-widest mb-6">CONSISTENCIA SEMANAL</h4>
                            <div className="flex justify-between items-center w-full gap-2 lg:gap-3 mt-auto">
                                {(() => {
                                    const grid = [];
                                    const totalDays = 7;
                                    const today = new Date();
                                    for (let i = totalDays - 1; i >= 0; i--) {
                                        const d = new Date(today);
                                        d.setDate(today.getDate() - i);
                                        const dateStr = d.toISOString().split('T')[0];
                                        const metricObj = metrics.history14d.find((item) => item.date === dateStr);
                                        const hasLoad = !!(metricObj && metricObj.tss > 0);
                                        const dayName = d.toLocaleDateString('es', { weekday: 'short' }).substring(0, 2);
                                        grid.push(
                                            <div key={i} className="flex-1 flex flex-col items-center gap-3">
                                                <div className={`w-full aspect-square rounded-2xl max-w-[56px] border flex items-center justify-center transition-all ${hasLoad ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-black/30 border-white/5 text-zinc-700 shadow-inner'}`} title={dateStr}>
                                                    {hasLoad ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg>
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

                    <div className="flex flex-col gap-4">
                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-6 rounded-3xl flex flex-col shadow-2xl">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-400 tracking-widest">POTENCIA PROMEDIO DIARIA (GARMIN)</h4>
                                    <p className="text-zinc-500 text-sm mt-2">Historial crudo de tu Potencia Media y Normalizada (Ultimos 90 dias).</p>
                                </div>
                                <div className="flex gap-5 text-sm font-semibold bg-black/20 px-4 py-2 rounded-full border border-white/5">
                                    <span className="text-amber-400 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400"></span>Potencia Media</span>
                                    <span className="text-violet-400 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-violet-400"></span>Normalizada (NP)</span>
                                </div>
                            </div>
                            <div className="h-[380px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={metrics.powerHistory90d} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" strokeOpacity={0.35} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={formatShortDate} minTickGap={24} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                                        <Tooltip
                                            wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                            labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '8px' }}
                                            labelFormatter={(label: any) => new Date(`${label}T00:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                            formatter={(value: any, name: any) => [value ?? '--', String(name)]}
                                            isAnimationActive={false}
                                        />
                                        <Line type="monotone" dataKey="avgPower" name="Potencia Media" stroke="#fbbf24" strokeWidth={4} dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#fbbf24', strokeWidth: 0 }} connectNulls={false} />
                                        <Line type="monotone" dataKey="np" name="Normalizada (NP)" stroke="#c084fc" strokeWidth={3.5} dot={{ r: 3, fill: '#c084fc', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#c084fc', strokeWidth: 0 }} connectNulls={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-zinc-900/80 border border-zinc-800/80 p-6 rounded-3xl flex flex-col shadow-2xl">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-xs font-bold text-zinc-400 tracking-widest">DINAMICA DE CARGA (PMC MACRO-CICLO)</h4>
                                        {metrics.maturityStatus === 'calibrated' && <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">Calibrado</span>}
                                        {metrics.maturityStatus === 'provisional' && <span className="text-[11px] px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">Calibrando ({metrics.daysAvailable}/42d)</span>}
                                    </div>
                                    <p className="text-zinc-500 text-sm mt-2">Visualizando hasta 90 dias historicos (Estructura de Base o Pico).</p>
                                </div>
                                <div className="flex gap-5 text-sm font-semibold bg-black/20 px-4 py-2 rounded-full border border-white/5">
                                    <span className="text-sky-400 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-sky-400"></span>Fitness (CTL)</span>
                                    <span className="text-rose-400 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-400"></span>Fatiga (ATL)</span>
                                    <span className="text-amber-400 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400"></span>Forma (TSB)</span>
                                </div>
                            </div>
                            <div className="h-[420px]">
                                {metrics.maturityStatus === 'insufficient' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/40">
                                        <p className="text-sm font-medium text-zinc-400">Aun no hay suficiente profundidad historica para el macro-ciclo.</p>
                                        <p className="text-xs text-zinc-500 mt-2">Dias disponibles: {metrics.daysAvailable}</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={metrics.history90d} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorCtl90" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" strokeOpacity={0.35} />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={formatShortDate} minTickGap={24} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                                            <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                                            <Tooltip
                                                wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                                labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '8px' }}
                                                labelFormatter={(label: any) => new Date(`${label}T00:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                                formatter={(value: any, name: any) => [Math.round(Number(value || 0)), String(name)]}
                                                isAnimationActive={false}
                                            />
                                            <Bar dataKey="tsbDisplayed" name="Forma (TSB)" barSize={7} radius={[4, 4, 4, 4]}>
                                                {metrics.history90d.map((entry, index) => {
                                                    let color = '#f59e0b';
                                                    if (entry.tsbDisplayed > 10) color = '#34d399';
                                                    else if (entry.tsbDisplayed > 0) color = '#10b981';
                                                    else if (entry.tsbDisplayed < -20) color = '#f43f5e';
                                                    return <Cell key={`pmc-90-${index}`} fill={color} />;
                                                })}
                                            </Bar>
                                            <Area type="monotone" dataKey="ctlDisplayed" name="Fitness (CTL)" stroke="#38bdf8" strokeWidth={3} fill="url(#colorCtl90)" fillOpacity={1} activeDot={{ r: 5, strokeWidth: 0, fill: '#38bdf8' }} />
                                            <Line type="monotone" dataKey="atlDisplayed" name="Fatiga (ATL)" stroke="#fb7185" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: '#fb7185' }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full flex-1">
                <div className="lg:col-span-4 flex flex-col h-fit">
                    <div className="sticky top-6">
                        <FitSyncCard
                            session={session}
                            onSuccess={onDataChanged}
                            title="Sincronizador FIT"
                            description="Carga tus archivos `.fit` originales de Garmin. Se usa el mismo parser oficial del entorno FIT Test y se refleja de inmediato en el dashboard original."
                            buttonLabel="Sincronizar lote FIT"
                        />
                    </div>
                </div>

                <div className="lg:col-span-8 flex flex-col">
                    <div className="bg-zinc-900 border border-border rounded-2xl p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-semibold text-xl">Tu Historial de Actividades</h3>
                            <span className="text-xs font-semibold px-3 py-1 bg-garmin-blue/20 text-garmin-blue rounded-full">{recentActivities.length} total</span>
                        </div>
                        {recentActivities.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border rounded-xl">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                                        <circle cx="12" cy="13" r="3" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-medium text-zinc-300">Aun no hay actividades guardadas</h4>
                                <p className="text-zinc-500 text-sm mt-2 max-w-sm">Sube tu primer archivo FIT en el panel lateral para empezar a visualizar tus metricas.</p>
                            </div>
                        ) : (
                            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar min-h-[400px]">
                                {recentActivities.map((act) => (
                                    <div key={act.id} className="p-5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-all flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
                                        <div className="flex-1 min-w-0 w-full xl:w-auto">
                                            <p className="font-semibold text-garmin-blue text-lg truncate" title={act.file_name || act.titulo || act.title || act.name || 'Entrenamiento Garmin'}>
                                                {act.file_name || act.titulo || act.title || act.name || 'Entrenamiento Garmin'}
                                            </p>
                                            <p className="text-sm text-zinc-400 mt-1 truncate">{formatLongDateTime(act.activity_date)}</p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm w-full xl:w-fit bg-zinc-900/50 p-4 rounded-lg border border-zinc-700/30 shrink-0">
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Distancia</span>
                                                <span className="font-semibold text-zinc-200">
                                                    {parseFloat(String(act.distance_km || 0)).toFixed(1)} <span className="text-zinc-500 font-normal">km</span>
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Potencia</span>
                                                <span className="font-semibold text-amber-400">
                                                    {act.potencia_media || act.average_power || 0} <span className="text-amber-400/50 font-normal">W</span>
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Pulso</span>
                                                <span className="font-semibold text-rose-400">
                                                    {act.fc_media || act.average_heartrate || 0} <span className="text-rose-400/50 font-normal">BPM</span>
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Tiempo</span>
                                                <span className="font-semibold text-zinc-300">
                                                    {act.tiempo_transcurrido || act.tiempo || `${Math.round(act.duration_minutes || 0)} min`}
                                                </span>
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
