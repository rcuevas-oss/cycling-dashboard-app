import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Calendar, Bot, Clock, Activity } from 'lucide-react';

export function MyPlanCalendar({ session }: { session: Session }) {
    const [planData, setPlanData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlan = async () => {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('user_schedules')
                .select('schedule_data, updated_at, start_date, end_date')
                .eq('user_id', session.user.id)
                .lte('start_date', today)
                .gte('end_date', today)
                .maybeSingle();
            
            if (data && !error && data.schedule_data) {
                setPlanData({
                    ...data.schedule_data,
                    updated_at: data.updated_at,
                    start_date: data.start_date,
                    end_date: data.end_date
                });
            }
            setLoading(false);
        };
        fetchPlan();
    }, [session]);

    if (loading) {
        return (
            <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[500px]">
                <div className="animate-spin w-10 h-10 border-4 border-zinc-800 border-t-garmin-blue rounded-full mb-4"></div>
                <p className="text-zinc-500 font-medium tracking-wide animate-pulse">Cargando Planificación...</p>
            </div>
        );
    }

    const { nodes: allNodes = [], aiRationale, updated_at, start_date } = planData;
    const futureNodes = allNodes.filter((n: any) => !n.isHistory);

    if (futureNodes.length === 0) {
        return (
            <div className="flex-1 w-full flex items-center justify-center p-8">
                <div className="max-w-md w-full glass rounded-3xl p-8 text-center border border-zinc-800/50">
                    <Calendar className="w-16 h-16 text-zinc-600 mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-bold text-zinc-200 mb-2">Plan Completado / Sin Futuro</h2>
                    <p className="text-zinc-400 text-sm mb-6">No tienes sesiones de entrenamiento pendientes en este rango. Genera un nuevo ciclo en el planificador.</p>
                </div>
            </div>
        );
    }

    // Defensive calculation of TSS (Only summing FUTURE nodes)
    const totalTSS = futureNodes.reduce((acc: number, n: any) => acc + (n.tss || 0), 0);

    // Colores por zona para las tarjetas
    const getZoneColor = (zone: string) => {
        switch (zone) {
            case 'recovery': return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
            case 'endurance': return 'border-sky-500/50 bg-sky-500/10 text-sky-400';
            case 'tempo': return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
            case 'threshold': return 'border-orange-500/50 bg-orange-500/10 text-orange-400';
            case 'vo2max': return 'border-rose-500/50 bg-rose-500/10 text-rose-400';
            case 'anaerobic': return 'border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-400';
            case 'rest': return 'border-zinc-700/50 bg-zinc-800/20 text-zinc-500';
            default: return 'border-zinc-700 bg-zinc-800/20 text-zinc-400';
        }
    };

    return (
        <div className="w-full flex flex-col h-full bg-[#111113] relative overflow-hidden text-zinc-100 animate-fade-in rounded-2xl border border-zinc-800 shadow-xl">
            {/* Cabecera */}
            <div className="shrink-0 p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-zinc-800/80 bg-zinc-900/40">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <Calendar className="text-garmin-blue w-6 h-6" />
                        Mi Plan de Entrenamiento
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">Generado con VeloCoach AI. Última actualización: {new Date(updated_at).toLocaleDateString('es-ES')}</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button 
                        onClick={async () => {
                            if (window.confirm(`¿Seguro que deseas eliminar el plan activo (${planData.start_date} al ${planData.end_date})? Esta acción es irreversible.`)) {
                                const { error } = await supabase
                                    .from('user_schedules')
                                    .delete()
                                    .eq('user_id', session.user.id)
                                    .eq('start_date', planData.start_date);
                                
                                if (!error) {
                                    setPlanData(null); // Refresca la UI
                                } else {
                                    alert("Error al borrar el plan: " + error.message);
                                }
                            }
                        }}
                        className="text-xs font-bold uppercase text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 rounded-lg px-4 py-2 transition-colors h-fit whitespace-nowrap"
                    >
                        Borrar Plan
                    </button>
                    <div className="bg-black/50 border border-zinc-800 rounded-xl p-3 px-5 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">TSS Semanal Proyectado</p>
                            <p className="text-xl font-black text-rose-500">{totalTSS}</p>
                        </div>
                        <Activity className="text-rose-500/50 w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                {/* AI Rationale Block */}
                {aiRationale && (
                    <div className="mb-8 bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-shrink-0 items-center justify-center mt-1 shadow-lg shadow-indigo-500/20">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-400 mb-2 font-mono text-sm tracking-wide">Visión del Entrenador</h3>
                                <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                                    {aiRationale}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Timeline Grid de Nodos - 7 Columnas para Vista Semanal en PC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 pb-20">
                    {futureNodes.map((n: any, i: number) => {
                        const meta = n.meta || {};
                        const isRest = meta.zone === 'rest';

                        // Calculate specific date for this day (Timezone-safe parsing)
                        const [y, m, d] = start_date.split('-').map(Number);
                        const planStart = new Date(y, m - 1, d);
                        const cardDate = new Date(planStart);
                        cardDate.setDate(planStart.getDate() + (n.day - 1));
                        const dateLabel = cardDate.toLocaleDateString('es-ES', { 
                            weekday: 'short', 
                            day: 'numeric'
                        });

                        return (
                            <div key={i} className={`flex flex-col relative bg-[#131315] border ${isRest ? 'border-zinc-800/30 opacity-60' : 'border-zinc-800/80 shadow-sm'} rounded-xl p-3 hover:border-indigo-500/30 transition-all group min-h-[160px]`}>
                                {/* Header - Compacto */}
                                <div className="flex justify-between items-start mb-1.5">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[8px] uppercase font-black text-indigo-400/80 tracking-tighter">D{n.day}</span>
                                            <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-tighter">{dateLabel}</span>
                                        </div>
                                        <h3 className="font-bold text-zinc-200 text-[12px] mt-0.5 leading-none truncate w-[100px]" title={n.title}>{n.title}</h3>
                                    </div>
                                    <div className={`text-[7px] uppercase font-black px-1.5 py-0.5 rounded border ${getZoneColor(meta.zone)} scale-90 origin-right`}>
                                        {meta.zone || 'N/A'}
                                    </div>
                                </div>

                                {/* Body - Mini Stats */}
                                {!isRest && (
                                    <div className="flex justify-between items-center mb-2 mt-0.5 border-b border-zinc-800/30 pb-2">
                                        <div className="flex items-center gap-1 text-garmin-blue/80" title="Duración">
                                            <Clock className="w-2.5 h-2.5" />
                                            <span className="font-mono text-[9px] font-bold">{meta.durationMins}m</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-rose-400/80" title="TSS">
                                            <Activity className="w-2.5 h-2.5" />
                                            <span className="font-mono text-[9px] font-bold">{n.tss}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Steps - Rebalanceados para que no se corte el texto */}
                                {meta.steps && meta.steps.length > 0 ? (
                                    <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar max-h-[110px]">
                                        {meta.steps.map((step: any, sIdx: number) => (
                                            <div key={sIdx} className="grid grid-cols-12 gap-1 items-center bg-black/30 px-1 py-1 rounded border border-white/5">
                                                <span className="col-span-3 text-[7px] font-mono text-garmin-blue font-black whitespace-nowrap">{step.duration}</span>
                                                <span className="col-span-6 text-[8px] text-zinc-200 leading-tight font-medium break-words pr-1">{step.name}</span>
                                                <span className="col-span-3 text-[7px] font-mono text-indigo-300 text-right font-black whitespace-nowrap">{step.power}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center py-2">
                                        <span className="text-[8px] text-zinc-600 italic leading-tight text-center">
                                            {isRest ? 'Descanso recomendado' : 'Libre'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
