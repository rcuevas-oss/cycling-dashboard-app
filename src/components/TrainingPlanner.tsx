import { useState } from 'react';
import { Save, Sparkles, Bot, X, LayoutGrid } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

// VeloFlow Imports
import { DnDProvider } from '../contexts/DnDContext';
import { ReactFlowProvider } from '@xyflow/react';
import Sidebar from './veloflow/Sidebar';
import TrainingFlow from './veloflow/TrainingFlow';
import BacktestingPanel from './veloflow/BacktestingPanel';
import AIPlannerWidget from './veloflow/AIPlannerWidget';
import type { AthleteProfile } from '../lib/coach/types';
import type { CoachPlanResponse } from '../lib/coach/ai/plannerGenerator';
import { getDailyLoads, calculatePMC } from '../lib/metricsUtils';
import { ActivitySummary } from '../lib/activityTypes';

function getActivityDate(activity: ActivitySummary) {
    return activity.activity_date || activity.start_date || activity.date || null;
}

function getActivityDurationSeconds(activity: ActivitySummary) {
    const directSeconds = Number(activity.duration || activity.moving_time || activity.elapsed_time || 0);
    if (directSeconds > 0) return directSeconds;

    const minutes = Number(activity.duration_minutes || 0);
    return minutes > 0 ? minutes * 60 : 0;
}

export function TrainingPlanner({ session, profile, activities = [] }: { session: Session, profile?: any, activities?: ActivitySummary[] }) {
    const [isSaving, setIsSaving] = useState(false);
    const [backtestResults, setBacktestResults] = useState<any>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [isAIWidgetOpen, setIsAIWidgetOpen] = useState(false);
    const [pendingAiPlan, setPendingAiPlan] = useState<any[] | null>(null);
    const [aiGlobalRationale, setAiGlobalRationale] = useState<string | null>(null);
    const [clearTrigger, setClearTrigger] = useState(0);

    // Calcular PMC base actual a partir de actividades globales
    const pmcHistory = activities.length > 0 ? calculatePMC(getDailyLoads(activities)).results : [];
    const todayPMC = pmcHistory.length > 0 ? pmcHistory[pmcHistory.length - 1] : { ctlDisplayed: 0, atlDisplayed: 0, tsbDisplayed: 0 };

    // Extraer el historial real del PMC (últimos 30 días para visualización)
    const pmcHistoryVisual = pmcHistory.slice(-30).map(day => ({
        ...day,
        title: day.date // Trick to preserve date in the label
    }));

    // 1. Smart FTP Resolution (Last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recent90DaysActivities = activities.filter(a => {
        const activityDate = getActivityDate(a);
        return activityDate ? new Date(activityDate) >= ninetyDaysAgo : false;
    });
    
    const max20MinPower = recent90DaysActivities.reduce((max, a) => {
        const p20 = a.potencia_20min || 0;
        return p20 > max ? p20 : max;
    }, 0);

    let finalFtp = profile?.ftp_actual ? Number(profile.ftp_actual) : 250;
    let ftpSource: 'manual' | 'data' = 'manual';

    if (max20MinPower > 100) {
        const derivedFtp = Math.round(max20MinPower * 0.95);
        if (derivedFtp > 100) {
           finalFtp = derivedFtp;
           ftpSource = 'data';
        }
    }

    // 2. Calcular volumen real de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentActivities = activities.filter(a => {
        const activityDate = getActivityDate(a);
        return activityDate ? new Date(activityDate) >= thirtyDaysAgo : false;
    });
    const recentVolumeSeconds = recentActivities.reduce((acc, a) => acc + getActivityDurationSeconds(a), 0);
    
    const recentVolumeHours = Math.round(recentVolumeSeconds / 3600);

    // 3. Enriquecer resumen de actividades (Detalle premium para IA)
    const recentActivityLog = activities
        .filter(a => (a.tss || a.training_stress_score || 0) > 0 || getActivityDurationSeconds(a) > 600)
        .sort((a, b) => {
            const bDate = getActivityDate(b);
            const aDate = getActivityDate(a);
            return new Date(bDate || 0).getTime() - new Date(aDate || 0).getTime();
        })
        .slice(0, 10) // 10 sesiones potentes es suficiente
        .map(a => {
            const dateStr = new Date(getActivityDate(a) || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
            const name = a.name?.substring(0, 15) || 'Ciclismo';
            const tss = Math.round(a.tss || a.training_stress_score || 0);
            const np = Math.round(a.np || a.normalized_power || 0);
            const ifVal = (a.if || a.intensity_factor || 0).toFixed(2);
            const hr = Math.round(a.average_heartrate || a.fc_media || 0);
            const dur = Math.round(getActivityDurationSeconds(a) / 60);
            return `${dateStr} [${name}]: ${tss}TSS, ${dur}m, NP:${np}w, IF:${ifVal}, HR:${hr}`;
        })
        .join('\n');

    // Mapper de perfil para VeloFlow
    const athleteProfile: AthleteProfile = {
        name: profile?.nombre || "Atleta Activo",
        ftp: finalFtp,
        ftpSource: ftpSource,
        weightKg: profile?.peso_actual_kg ? Number(profile.peso_actual_kg) : 75,
        currentCtl: todayPMC.ctlDisplayed,
        currentAtl: todayPMC.atlDisplayed,
        currentTsb: todayPMC.tsbDisplayed,
        recentVolumeHours: recentVolumeHours > 0 ? recentVolumeHours : 5, 
        recentActivitySummary: recentActivityLog || "Sin historial reciente cargado.",
        disciplina: profile?.disciplina || "Ruta",
        objetivo: profile?.objetivo || "Mantenimiento"
    };



    const [reorderTrigger, setReorderTrigger] = useState(0);

    const getPlanStartDate = () => {
        // Calculate the Monday of the current week (our standard start date)
        const now = new Date();
        const day = now.getDay();
        // If it's Sunday (0), we want "Tomorrow" (Next Monday), not "Last Monday"
        const diff = now.getDate() - day + (day === 0 ? 1 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        
        // Timezone-safe string format (local YYYY-MM-DD)
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const d = String(monday.getDate()).padStart(2, '0');
        return `${year}-${month}-${d}`;
    };

    const saveSchedule = async () => {
        if (!session || !backtestResults) return;
        
        const startDate = getPlanStartDate();
        // Calculate dynamic end date based on the plan's span
        const maxOffset = Math.max(...backtestResults.stats.map((s: any) => s.day), 0);
        const startObj = new Date(startDate);
        const endObj = new Date(startObj);
        endObj.setDate(startObj.getDate() + maxOffset);
        const endDate = endObj.toISOString().split('T')[0];

        setIsSaving(true);
        
        try {
            // ADVANCED OVERLAP DETECTION
            // A plan overlaps if: (new_start <= existing_end) AND (new_end >= existing_start)
            const { data: overlappingPlans } = await supabase
                .from('user_schedules')
                .select('start_date, end_date')
                .eq('user_id', session.user.id)
                .lte('start_date', endDate)
                .gte('end_date', startDate);

            if (overlappingPlans && overlappingPlans.length > 0) {
                const conflict = overlappingPlans[0];
                const proceed = window.confirm(`¡Aviso de Solapamiento! Ya tienes un plan del ${conflict.start_date} al ${conflict.end_date} que coincide con estas fechas. ¿Deseas REEMPLAZARLO por este nuevo diseño?`);
                if (!proceed) {
                    setIsSaving(false);
                    return;
                }
            }

            const planToSave = {
                // Filter out historical nodes to only save the actual training plan (future nodes)
                nodes: backtestResults.stats.filter((n: any) => !n.isHistory),
                totalTSS: backtestResults.totalTSS,
                aiRationale: aiGlobalRationale,
                range: { start: startDate, end: endDate }
            };

            const { error } = await supabase
                .from('user_schedules')
                .upsert({ 
                    user_id: session.user.id, 
                    start_date: startDate,
                    end_date: endDate,
                    schedule_data: planToSave as any,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error("Error al guardar el plan:", error);
                alert("Error al guardar el plan en la nube.");
            } else {
                alert(`Plan Guardado Exitosamente del ${startDate} al ${endDate}.`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const clearSchedule = async () => {
        if (window.confirm("¿Seguro que deseas limpiar el lienzo actual?")) {
            setClearTrigger(prev => prev + 1);
            
            if (session && window.confirm("¿Deseas también ELIMINAR tu plan guardado en la nube para ESTA SEMANA? Esta acción es irreversible.")) {
                try {
                    const startDate = getPlanStartDate();
                    const { error } = await supabase
                        .from('user_schedules')
                        .delete()
                        .eq('user_id', session.user.id)
                        .eq('start_date', startDate);
                    
                    if (error) throw error;
                    alert("Plan eliminado exitosamente de la base de datos.");
                } catch (error) {
                    console.error("Error al borrar el plan", error);
                    alert("No se pudo eliminar el plan. Verifica tu conexión.");
                }
            }
        }
    }

    const reorderLayout = () => {
        setReorderTrigger(prev => prev + 1);
    };

    const handleInjectAIPlan = (response: CoachPlanResponse) => {
        setPendingAiPlan(response.planNodes);
        setAiGlobalRationale(response.globalRationale);
    };

    return (
        <div className="flex-1 w-full overflow-hidden animate-fade-in text-zinc-100 h-full flex flex-col">

            {/* React Flow Editor Layout */}
            <div className="flex-1 w-full border-t border-zinc-800 overflow-hidden shadow-inner flex bg-black relative">
                <DnDProvider>
                    <ReactFlowProvider>
                        {/* Panel Izquierdo: Librería de Nodos */}
                        <Sidebar athleteName={athleteProfile.name} />
                        
                        {/* Lienzo Central: React Flow Canvas */}
                        <div style={{ flex: 1, backgroundColor: '#141416', position: 'relative' }}>
                            <TrainingFlow 
                                setBacktestResults={setBacktestResults} 
                                baselineAthlete={athleteProfile} 
                                historicalData={pmcHistoryVisual as any} 
                                pendingAiPlan={pendingAiPlan}
                                onAiPlanInjected={() => setPendingAiPlan(null)}
                                clearTrigger={clearTrigger}
                                reorderTrigger={reorderTrigger}
                            />

                            {/* Botonera Superior Flotante (Dentro del Canvas Central) */}
                            <div className="absolute top-4 right-4 z-[60] flex items-center gap-3 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800/50 backdrop-blur-md shadow-2xl">
                                
                                <button 
                                    onClick={() => setIsAIWidgetOpen(true)}
                                    className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold px-3 py-1.5 rounded-lg shadow-lg hover:bg-indigo-500 hover:text-white hover:border-indigo-400 transition-all text-sm flex items-center gap-1.5"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>AI Builder</span>
                                </button>

                                <div className="w-px h-5 bg-zinc-800 mx-1"></div>

                                {backtestResults && !isPanelOpen && (
                                    <button 
                                        className="bg-garmin-blue text-black font-bold px-4 py-1.5 rounded-lg shadow-lg hover:bg-garmin-blue/80 transition-colors text-sm"
                                        onClick={() => setIsPanelOpen(true)}
                                    >
                                        Simulador PMC
                                    </button>
                                )}
                                <button 
                                    onClick={reorderLayout}
                                    title="Reordenar nodos como calendario"
                                    className="text-sm font-medium text-indigo-400 hover:text-indigo-200 transition-colors px-3 py-1.5 flex items-center gap-1.5"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    <span>Reordenar</span>
                                </button>
                                <button onClick={clearSchedule} className="text-sm font-medium text-zinc-400 hover:text-rose-400 transition-colors px-3 py-1.5">
                                    Limpiar
                                </button>
                                <button
                                    onClick={saveSchedule}
                                    disabled={isSaving || !backtestResults}
                                    className={`text-sm font-semibold transition-colors flex items-center gap-2 px-4 py-1.5 rounded-lg border ${isSaving
                                        ? 'bg-zinc-800/50 border-zinc-700 text-zinc-600 cursor-not-allowed'
                                        : 'bg-garmin-blue/10 border-garmin-blue/30 text-garmin-blue hover:bg-garmin-blue hover:text-black hover:border-garmin-blue'
                                        }`}
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? 'Guardando...' : 'Guardar (DB)'}
                                </button>
                            </div>

                            {/* Floating AI Widget Overlay */}
                            {isAIWidgetOpen && (
                                <AIPlannerWidget 
                                    onClose={() => setIsAIWidgetOpen(false)} 
                                    onInjectPlan={handleInjectAIPlan} 
                                    athleteProfile={athleteProfile}
                                />
                            )}

                            {/* Mensaje Global del Entrenador (AI Rationale Log) */}
                            {aiGlobalRationale && (
                                <div className="absolute bottom-6 left-6 z-[60] w-[400px] max-w-[90vw] bg-[#141416]/95 backdrop-blur-3xl border border-zinc-800 shadow-2xl shadow-indigo-500/10 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                                    <div className="flex items-center justify-between p-3 border-b border-zinc-800/80 bg-black/40">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                                <Bot className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <h3 className="font-bold text-zinc-100 text-sm">Registro de Decisiones AI</h3>
                                        </div>
                                        <button onClick={() => setAiGlobalRationale(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                        {aiGlobalRationale}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Panel Derecho: Simulador de PMC / Estadísticas */}
                        {backtestResults && isPanelOpen && (
                            <div style={{ width: '360px', borderLeft: '1px solid #27272a', backgroundColor: '#09090b', zIndex: 10 }}>
                                <BacktestingPanel results={backtestResults} onClose={() => setIsPanelOpen(false)} />
                            </div>
                        )}


                    </ReactFlowProvider>
                </DnDProvider>
            </div>
        </div>
    );
}
