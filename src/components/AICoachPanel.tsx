import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Zap, Flag } from 'lucide-react';
import { TrainingBlock } from '../lib/fitUtils';
import { generateWeeklyPlan } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AICoachPanelProps {
    session: Session;
    athleteProfile?: any;
    recentActivitiesData?: any[];
    scheduleData?: Record<string, TrainingBlock[]>;
    onApplyPlan?: (plan: Record<string, TrainingBlock[]>) => void;
    onNavigate?: (view: string) => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    plan?: Record<string, TrainingBlock[]>;
    suggestedOptions?: string[];
    isGreeting?: boolean;
}

export function AICoachPanel({ session, athleteProfile, recentActivitiesData, scheduleData, onApplyPlan, onNavigate }: AICoachPanelProps) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const [inputMsg, setInputMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSend = async (forcedMessage?: string, isSilentUserMessage: boolean = false) => {
        const messageToSend = forcedMessage || inputMsg;
        if (!messageToSend.trim()) return;
        if (!apiKey) {
            setMessages(prev => [...prev, {
                id: Date.now().toString() + '-error',
                role: 'ai',
                content: '⚠️ No has configurado tu clave API de Gemini en .env.local. La IA no puede responder.'
            }]);
            return;
        }

        const newMsg = messageToSend.trim();
        setInputMsg('');

        if (!isSilentUserMessage) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: newMsg }]);
        }

        setIsLoading(true);

        try {
            const ftpGuardado = athleteProfile?.ftp_actual || "No especificado";
            const pesoGuardado = athleteProfile?.peso_actual_kg || "No especificado";
            const disciplinaGuardada = athleteProfile?.disciplina || "Ciclismo General";
            const objetivoGuardado = athleteProfile?.objetivo || "Ninguno Específico";
            const fechaEventoGuardada = athleteProfile?.fecha_evento || null;
            const nombreGuardado = athleteProfile?.nombre || session?.user?.user_metadata?.full_name || "Ciclista";

            let vatios_por_kilo: string | number = "No calculable";
            if (typeof athleteProfile?.ftp_actual === 'number' && typeof athleteProfile?.peso_actual_kg === 'number' && athleteProfile.peso_actual_kg > 0) {
                vatios_por_kilo = Number((athleteProfile.ftp_actual / athleteProfile.peso_actual_kg).toFixed(2));
            }

            const athleteContext = {
                nombre: nombreGuardado,
                ftp: ftpGuardado,
                peso_kg: pesoGuardado,
                relacion_wkg: vatios_por_kilo,
                disciplina: disciplinaGuardada,
                objetivo_principal: objetivoGuardado,
                fecha_evento: fechaEventoGuardada,
                disponibilidad_semanal: athleteProfile?.disponibilidad || "Disponibilidad completa (Acepta cualquier día, asume 1-2h diarias)."
            };

            const hoy = new Date();
            let tss7d = 0;
            let tss42d = 0;
            let mins7d = 0;

            const recentActivities = (recentActivitiesData || []).map(act => {
                if (act.activity_date) {
                    const diffTime = Math.abs(hoy.getTime() - new Date(act.activity_date).getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    const tss = typeof act.training_stress_score === 'number' ? act.training_stress_score : 0;
                    const mins = typeof act.duration_minutes === 'number' ? act.duration_minutes : 0;

                    if (diffDays <= 7) {
                        tss7d += tss;
                        mins7d += mins;
                    }
                    if (diffDays <= 42) {
                        tss42d += tss;
                    }
                }

                return {
                    fecha: act.activity_date,
                    distancia_km: act.distance_km,
                    duracion_min: act.duration_minutes,
                    TSS: act.training_stress_score,
                    fc_media: act.fc_media,
                    potencia_normalizada: act.normalized_power,
                    desnivel_acumulado: act.ascenso_total
                };
            });

            const enrichedAthleteContext = {
                ...athleteContext,
                analisis_carga_backend: {
                    tss_ultimos_7_dias_total: tss7d,
                    tss_promedio_diario_7d: Number((tss7d / 7).toFixed(1)),
                    volumen_diario_promedio_7d_mins: Number((mins7d / 7).toFixed(0)),
                    ctl_estimado_42d_promedio: Number((tss42d / 42).toFixed(1)),
                    nota_tecnica: "Evalúa el progreso y recomienda acciones."
                }
            };

            const response = await generateWeeklyPlan(apiKey, newMsg, enrichedAthleteContext, recentActivities, scheduleData);

            // Interceptar intención de IA de abrir el planificador o dashboard (Opcional, futuro)
            // Si la IA dice "Abre el planificador", podríamos onNavigate('planner')

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response.textResponse,
                plan: response.schedule || undefined,
                suggestedOptions: response.suggestedOptions || [],
                isGreeting: response.isGreeting
            }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: `❌ Error de IA: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const promptPlanObjetivo = "Arma mi plan de entrenamiento hacia mi objetivo. Ábreme el Planificador AI para verlo.";
    const promptAnalisis = "Evalúa mi progreso para llegar a mi objetivo basado en mis métricas biométricas recientes.";

    // Cálculos Relativos
    const ftp = athleteProfile?.ftp_actual;
    const peso = athleteProfile?.peso_actual_kg;
    let wkg: number | null = null;
    let wkgBg = 'bg-zinc-500/10 border-zinc-500/20';

    if (ftp && peso && peso > 0) {
        wkg = Number((ftp / peso).toFixed(2));
        if (wkg < 3.2) wkgBg = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400';
        else if (wkg < 3.9) wkgBg = 'bg-blue-500/10 border-blue-500/40 text-blue-400';
        else if (wkg < 4.4) wkgBg = 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400';
        else if (wkg < 5.0) wkgBg = 'bg-purple-500/10 border-purple-500/40 text-purple-400';
        else wkgBg = 'bg-rose-500/10 border-rose-500/40 text-rose-400';
    }

    let diasParaEvento: number | null = null;
    let textoEvento = "";
    if (athleteProfile?.fecha_evento) {
        const diffTime = new Date(athleteProfile.fecha_evento).getTime() - new Date().getTime();
        diasParaEvento = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diasParaEvento > 0) textoEvento = `Faltan ${diasParaEvento} días`;
        else if (diasParaEvento === 0) textoEvento = "¡Es Hoy!";
        else textoEvento = `Evento Finalizado`;
    }

    return (
        <div className="w-full h-full bg-[#111113] border-l border-zinc-800 flex flex-col shadow-2xl text-zinc-100 rounded-2xl overflow-hidden relative">
            {/* Header */}
            <div className="flex flex-col p-5 border-b border-zinc-800 bg-[#161618]">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                                AI Command Center
                            </h2>
                            <p className="text-[10px] uppercase tracking-wider flex items-center gap-1 text-zinc-500">
                                Powered by Gemini 1.5
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-1">
                    {athleteProfile ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <div className="flex items-center gap-1.5 bg-black/40 shadow-inner rounded-md px-2.5 py-1 border border-zinc-800">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-white font-bold">{ftp ? `${ftp}W` : '--'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-black/40 shadow-inner rounded-md px-2.5 py-1 border border-zinc-800">
                                <span className="text-white font-bold">{peso ? `${peso}kg` : '--'}</span>
                            </div>
                            {wkg && (
                                <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 border ${wkgBg} shadow-sm backdrop-blur-sm`}>
                                    <span className={`font-black font-mono`}>{wkg}</span>
                                    <span className="text-[9px] uppercase font-medium opacity-60 ml-0.5">W/KG</span>
                                </div>
                            )}
                            {textoEvento && (
                                <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 rounded-md px-2.5 py-1 border border-amber-500/30">
                                    <Flag className="w-3.5 h-3.5" />
                                    <span className="font-bold">{textoEvento}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 text-xs bg-black/20 rounded-lg p-2 border border-zinc-800/50">
                            <span className="text-zinc-500 font-mono tracking-wide">Vinculando Perfil Biométrico...</span>
                        </div>
                    )}
                </div>
            </div>
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 flex flex-col">
                {messages.length === 0 && !isLoading && (
                    <div className="flex-1 flex flex-col justify-center items-center opacity-80 mt-10">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 ring-1 ring-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                            <Bot className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-zinc-200 font-bold mb-1">Coach de Inteligencia Artificial</h3>
                        <p className="text-sm text-zinc-500 mb-8 text-center max-w-[250px]">
                            La IA analiza tu carga fisiológica reciente para recomendarte tu siguiente paso.
                        </p>

                        <div className="flex flex-col gap-3 w-full max-w-[280px]">
                            <button
                                onClick={() => handleSend("Analiza mi estado de forma actual y dame un diagnóstico basado en la carga reciente.", true)}
                                className="w-full py-3 px-4 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 transition-all"
                            >
                                <Zap className="w-4 h-4" />
                                Generar Diagnóstico Inicial
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {messages.map((m) => (
                        <div key={m.id} className={`flex flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {m.role === 'ai' && (
                                <div className="flex items-center gap-1.5 ml-1 mb-0.5">
                                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Coach AI</span>
                                </div>
                            )}
                            <div className={`${m.role === 'user' ? 'bg-indigo-600 rounded-2xl rounded-tr-sm text-white' : 'bg-[#18181b] rounded-2xl rounded-tl-sm text-zinc-300 border border-zinc-800'} px-5 py-4 max-w-[92%] shadow-md`}>
                                {m.role === 'ai' ? (
                                    <div className="prose prose-invert prose-sm prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border-zinc-800 max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                                )}

                                {m.plan && (
                                    <div className="mt-5 pt-5 border-t border-zinc-800/80">
                                        <button
                                            onClick={() => {
                                                if (onApplyPlan && m.plan) {
                                                    onApplyPlan(m.plan);
                                                    if (session) {
                                                        supabase.from('user_schedules').upsert({ user_id: session.user.id, schedule_data: m.plan }).then();
                                                    }
                                                    if (onNavigate) onNavigate('planner'); // Forzar abrir la vista del planner
                                                }
                                            }}
                                            className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                        >
                                            Inyectar al Tablero
                                        </button>
                                    </div>
                                )}

                                {m.suggestedOptions && m.suggestedOptions.length > 0 && m.role === 'ai' && (
                                    <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
                                        {m.suggestedOptions.map((opt, i) => (
                                            <button key={i} onClick={() => handleSend(opt)} className="text-left px-3 py-2 bg-zinc-800/40 hover:bg-indigo-600/20 border border-zinc-700/50 hover:border-indigo-500/30 text-xs text-zinc-300 rounded-lg transition-all">
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex flex-col gap-1.5 items-start mb-6">
                            <div className="flex items-center gap-1.5 ml-1 mb-0.5">
                                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Coach AI</span>
                            </div>
                            <div className="bg-[#18181b] rounded-2xl rounded-tl-sm px-5 py-5 text-sm w-full max-w-[280px] border border-zinc-800 shadow-md">
                                <div className="flex justify-between items-center text-xs text-zinc-400 mb-3 font-medium">
                                    <span className="animate-pulse">Calculando biometría y carga...</span>
                                    <Zap className="w-3 h-3 text-amber-500 animate-bounce" />
                                </div>
                                <div className="w-full bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 h-1.5 rounded-full w-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-2" />
                </div>
            </div>

            {/* Quick Prompts (Above Input box for fast action) */}
            <div className="px-3 pt-2 pb-1 bg-[#111113] flex gap-2 overflow-x-auto custom-scrollbar">
                <button onClick={() => { handleSend(promptPlanObjetivo); if (onNavigate) onNavigate('planner'); }} className="shrink-0 px-3 py-1.5 bg-zinc-800/50 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold border border-zinc-700/50 hover:border-indigo-500/50 rounded-full transition-all">
                    Planificar Objetivo
                </button>
                <button onClick={() => handleSend(promptAnalisis)} className="shrink-0 px-3 py-1.5 bg-zinc-800/50 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-zinc-700/50 hover:border-emerald-500/50 rounded-full transition-all">
                    Evaluar Progreso
                </button>
            </div>

            {/* Input */}
            <div className="p-4 bg-[#111113]">
                <div className="relative flex items-end bg-[#1a1a1c] border border-zinc-800 rounded-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                    <textarea
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Consulta técnica o pide un plan..."
                        className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 px-4 py-3.5 focus:outline-none text-sm resize-none custom-scrollbar min-h-[50px] max-h-[120px]"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={isLoading || !inputMsg.trim()}
                        className="p-2.5 m-1.5 bg-indigo-600 disabled:bg-zinc-800 hover:bg-indigo-500 rounded-xl text-white disabled:text-zinc-600 transition-colors disabled:cursor-not-allowed shrink-0"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

