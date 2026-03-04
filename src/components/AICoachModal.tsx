import React, { useState, useEffect, useRef } from 'react';
import { X, Bot, Sparkles, Send, Zap, Key } from 'lucide-react';
import { TrainingBlock } from '../lib/fitUtils';
import { generateWeeklyPlan } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AICoachModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyPlan?: (plan: Record<string, TrainingBlock[]>) => void;
    session: Session;
    athleteProfile?: any;
    recentActivitiesData?: any[];
}

interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    plan?: Record<string, TrainingBlock[]>;
    suggestedOptions?: string[];
    isGreeting?: boolean;
}

export function AICoachModal({ isOpen, onClose, onApplyPlan, session, athleteProfile, recentActivitiesData }: AICoachModalProps) {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [inputMsg, setInputMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hasSentWelcome, setHasSentWelcome] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (!apiKey && messages.length === 0) {
                setShowKeyInput(true);
            }
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // EFECTO PROACTIVO: Auto-Diagnóstico de Bienvenida (V2)
    useEffect(() => {
        if (isOpen && apiKey && messages.length === 0 && !hasSentWelcome && athleteProfile && (recentActivitiesData?.length ?? 0) > 0) {
            setHasSentWelcome(true);
            // Mandamos una orden oculta simulando que el usuario pidió analizar su forma
            handleSend("Analiza mi estado de forma actual y dame un diagnóstico basado en la carga reciente.", true);
        }
    }, [isOpen, apiKey, athleteProfile, recentActivitiesData, hasSentWelcome]);

    const handleSaveKey = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setApiKey(val);
        localStorage.setItem('gemini_api_key', val);
    };

    const handleSend = async (forcedMessage?: string, isSilentUserMessage: boolean = false) => {
        const messageToSend = forcedMessage || inputMsg;
        if (!messageToSend.trim()) return;
        if (!apiKey) {
            setShowKeyInput(true);
            return;
        }

        const newMsg = messageToSend.trim();
        setInputMsg('');

        // Si es el auto-diagnóstico inicial, no mostramos la burbuja gris del usuario diciendo "Analiza mi estado..."
        if (!isSilentUserMessage) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: newMsg }]);
        }

        setIsLoading(true);

        try {
            // Contexto Biomético Real Recuperado de Supabase
            const ftpGuardado = athleteProfile?.ftp_actual || "No especificado";
            const pesoGuardado = athleteProfile?.peso_actual_kg || "No especificado";
            const disciplinaGuardada = athleteProfile?.disciplina || "Ciclismo General";
            const objetivoGuardado = athleteProfile?.objetivo || "Ninguno Específico";
            const nombreGuardado = athleteProfile?.nombre || session?.user?.user_metadata?.full_name || "Ciclista";

            // Cálculo crucial PRO: Vatios por Kilo (W/kg)
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
                objetivo_principal: objetivoGuardado
            };

            // Cálculo robusto de carga para Gemini (Ventanas Móviles Sencillas)
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

            // Enriquecemos el contexto del atleta con cálculos de servidor pre-digeridos
            const enrichedAthleteContext = {
                ...athleteContext,
                analisis_carga_backend: {
                    tss_ultimos_7_dias_total: tss7d,
                    tss_promedio_diario_7d: Number((tss7d / 7).toFixed(1)),
                    volumen_diario_promedio_7d_mins: Number((mins7d / 7).toFixed(0)),
                    ctl_estimado_42d_promedio: Number((tss42d / 42).toFixed(1)),
                    nota_tecnica: "La IA NO DEBE calcular el ATL ni parámetros móviles manualmente, debe basarse en estos outputs."
                }
            };

            const response = await generateWeeklyPlan(apiKey, newMsg, enrichedAthleteContext, recentActivities);

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

    if (!isOpen) return null;

    // Sugerencias de Inicio Rápido Prompts
    const promptPlan7 = "Quiero que me armes un plan de entrenamiento de 7 días. Basa tu elección de bloques estrictamente en mi 'Objetivo Principal' guardado en mi perfil. Si necesitas saber mi disponibilidad de horas para esta semana, pregúntamelo rápidamente, o asume una disponibilidad estándar.";
    const promptPlan14 = "Quiero que me armes un plan de entrenamiento de 14 días. Basa tu elección de bloques estrictamente en mi 'Objetivo Principal' guardado en mi perfil. Si necesitas saber mi disponibilidad de horas, pregúntamelo rápidamente.";
    const promptAnalisis = "Quiero analizar mi forma deportiva actual basándote en mis métricas biométricas.";
    const promptFtp = "¿Me podrías explicar un método estructurado para hacer un Test FTP adecuadamente?";

    // --- Cálculos de Biometría y Rendimiento Relativo (W/kg) ---
    const ftp = athleteProfile?.ftp_actual;
    const peso = athleteProfile?.peso_actual_kg;
    let wkg: number | null = null;
    let wkgLevelStr = '';
    let wkgColor = 'text-zinc-500';
    let wkgBg = 'bg-zinc-500/10 border-zinc-500/20';

    if (ftp && peso && peso > 0) {
        wkg = Number((ftp / peso).toFixed(2));
        if (wkg < 2.5) { wkgLevelStr = 'Principiante'; wkgColor = 'text-zinc-400'; wkgBg = 'bg-zinc-500/10 border-zinc-500/50'; }
        else if (wkg < 3.2) { wkgLevelStr = 'Aficionado'; wkgColor = 'text-emerald-400'; wkgBg = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'; }
        else if (wkg < 3.9) { wkgLevelStr = 'Intermedio'; wkgColor = 'text-blue-400'; wkgBg = 'bg-blue-500/10 border-blue-500/40 text-blue-400'; }
        else if (wkg < 4.4) { wkgLevelStr = 'Avanzado'; wkgColor = 'text-indigo-400'; wkgBg = 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400'; }
        else if (wkg < 5.0) { wkgLevelStr = 'Semipro'; wkgColor = 'text-purple-400'; wkgBg = 'bg-purple-500/10 border-purple-500/40 text-purple-400'; }
        else { wkgLevelStr = 'Pro Tour'; wkgColor = 'text-rose-400'; wkgBg = 'bg-rose-500/10 border-rose-500/40 text-rose-400'; }
    }
    // -------------------------------------------------------------

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
            {/* Sidebar Panel */}
            <div className="w-full max-w-md h-full bg-[#111113] border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right text-zinc-100">

                {/* Header (Métricas Base movidas acá para limpieza) */}
                <div className="flex flex-col p-5 border-b border-zinc-800 bg-[#161618]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                                    AI Coach Pro
                                </h2>
                                <p className="text-[10px] uppercase tracking-wider flex items-center gap-1 text-zinc-500">
                                    Gemini Engine
                                    <button onClick={() => setShowKeyInput(!showKeyInput)} className="hover:text-amber-400 transition-colors">
                                        <Key className="w-3 h-3" />
                                    </button>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Fila Minimal de Conexión de Datos (Colorized Metrics) */}
                    <div className="mt-1">
                        {athleteProfile ? (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                {/* FTP */}
                                <div className="flex items-center gap-1.5 bg-black/40 shadow-inner rounded-md px-2.5 py-1 border border-zinc-800">
                                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-zinc-500 font-mono tracking-wider text-[10px]">FTP</span>
                                    <span className="text-white font-bold">{ftp ? `${ftp}W` : '--'}</span>
                                </div>

                                {/* Peso */}
                                <div className="flex items-center gap-1.5 bg-black/40 shadow-inner rounded-md px-2.5 py-1 border border-zinc-800">
                                    <span className="text-zinc-500 font-mono tracking-wider text-[10px]">PESO</span>
                                    <span className="text-white font-bold">{peso ? `${peso}kg` : '--'}</span>
                                </div>

                                {/* W/kg Level Badge */}
                                {wkg && (
                                    <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 border ${wkgBg} shadow-sm backdrop-blur-sm`}>
                                        <span className={`font-black font-mono tracking-tight ${wkgColor}`}>{wkg}</span>
                                        <span className={`text-[9px] uppercase font-bold tracking-widest opacity-90`}>{wkgLevelStr}</span>
                                        <span className="text-[9px] uppercase font-medium opacity-60 ml-0.5">W/KG</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 text-xs bg-black/20 rounded-lg p-2 border border-zinc-800/50">
                                <span className="text-zinc-500 font-mono tracking-wide">Vinculando Perfil Biométrico...</span>
                            </div>
                        )}
                    </div>
                </div >

                {/* Input API Key (Si es necesario) */}
                {
                    showKeyInput && (
                        <div className="px-5 py-4 bg-[#1a1a1c] border-b border-zinc-800 flex flex-col gap-2 relative z-10 shadow-md">
                            <div className="flex justify-between items-center">
                                <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                                    <Key className="w-3 h-3" /> CREDENCIAL GEMINI API
                                </label>
                                <button onClick={() => setShowKeyInput(false)} className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
                                    Ocultar
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={handleSaveKey}
                                    onKeyDown={(e) => e.key === 'Enter' && setShowKeyInput(false)}
                                    placeholder="AIzaxxxxxxxxxxxxx..."
                                    className="flex-1 bg-black/50 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                />
                                <button
                                    onClick={() => setShowKeyInput(false)}
                                    className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Dashboard / Chat Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 flex flex-col">

                    {messages.length === 0 && !isLoading && (
                        <div className="flex-1 flex flex-col justify-center items-center opacity-50">
                            <Bot className="w-12 h-12 text-zinc-600 mb-4" />
                            <p className="text-sm text-zinc-500">Comienza enviando un "Hola" para ver las opciones principales.</p>
                        </div>
                    )}

                    {/* Mensajes */}
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

                                    {/* Botón de Aplicar Plan si el mensaje contiene uno */}
                                    {m.plan && (
                                        <div className="mt-5 pt-5 border-t border-zinc-800/80">
                                            <p className="text-[11px] font-bold text-amber-500 mb-2 inline-flex items-center gap-1.5">
                                                <Sparkles className="w-3 h-3" /> ESQUEMA CALCULADO
                                            </p>
                                            <button
                                                onClick={() => {
                                                    if (onApplyPlan && m.plan) {
                                                        // 1. Aplicarlo localmente instantáneo
                                                        onApplyPlan(m.plan);

                                                        // 2. Guardarlo en la nube en background
                                                        if (session) {
                                                            supabase
                                                                .from('user_schedules')
                                                                .upsert({ user_id: session.user.id, schedule_data: m.plan })
                                                                .then(({ error }) => {
                                                                    if (error) console.error("Error auto-guardando plan AI:", error);
                                                                });
                                                        }

                                                        // 3. Cerrar el modal
                                                        onClose();
                                                    }
                                                }}
                                                className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                                            >
                                                Inyectar al Calendario
                                            </button>
                                        </div>
                                    )}

                                    {/* Menú Principal Especial si es Saludo */}
                                    {m.isGreeting && m.role === 'ai' && (
                                        <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col gap-3 w-full">
                                            {/* Sección Plan de Entrenamiento */}
                                            <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3.5 flex flex-col gap-2.5">
                                                <div className="flex flex-col">
                                                    <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest">Plan de Entrenamiento</h4>
                                                    <p className="text-[10px] text-zinc-400 mt-0.5">Rellena Objetivo, Fechas y Potencia/Pulso al pedirlo.</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => handleSend(promptPlan7)}
                                                        className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-500/40 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg transition-all"
                                                    >
                                                        7 días
                                                    </button>
                                                    <button
                                                        onClick={() => handleSend(promptPlan14)}
                                                        className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-500/40 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg transition-all"
                                                    >
                                                        14 días
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Sección Análisis */}
                                            <button
                                                onClick={() => handleSend(promptAnalisis)}
                                                className="text-left bg-zinc-800/40 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-zinc-600 rounded-xl p-3.5 transition-all w-full flex flex-col gap-1"
                                            >
                                                <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest">Analizar forma actual</h4>
                                                <p className="text-[10px] text-zinc-400">Evalúa tu estado fisiológico.</p>
                                            </button>

                                            {/* Sección Test FTP */}
                                            <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3.5 flex flex-col gap-2.5">
                                                <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest">Test FTP</h4>
                                                <button
                                                    onClick={() => handleSend(promptFtp)}
                                                    className="text-left px-3 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-700/50 text-xs text-zinc-400 rounded-lg transition-all"
                                                >
                                                    Método para hacer un FTP
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Chips de Opciones Sugeridas genéricas y cortas */}
                                    {m.suggestedOptions && m.suggestedOptions.length > 0 && m.role === 'ai' && !m.isGreeting && (
                                        <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
                                            {m.suggestedOptions.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSend(opt)}
                                                    className="w-full text-left px-3 py-2 bg-zinc-800/40 hover:bg-indigo-600/20 border border-zinc-700/50 hover:border-indigo-500/30 text-xs text-zinc-300 rounded-lg transition-all"
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex flex-col gap-1.5 items-start">
                                <div className="flex items-center gap-1.5 ml-1 mb-0.5">
                                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Coach AI</span>
                                </div>
                                <div className="bg-[#18181b] rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-zinc-400 border border-zinc-800 flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                                    <span>Analizando fisiología...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>
                </div>

                {/* Input Area Inferior */}
                <div className="p-4 bg-[#111113] border-t border-zinc-800">
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
                    <p className="text-[10px] text-center text-zinc-500 mt-2 font-mono">
                        Shift + Enter para nueva línea
                    </p>
                </div>

            </div >
        </div >
    );
}
