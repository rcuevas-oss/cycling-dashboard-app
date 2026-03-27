import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Zap, X, Download } from 'lucide-react';
import { runCoachPipeline } from '../lib/coach/pipeline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Session } from '@supabase/supabase-js';
import { ActivitySummary } from '../lib/activityTypes';
import { buildCoachActivityDataset } from '../lib/coachActivityAdapter';

interface AICoachModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: Session;
    athleteProfile?: any;
    recentActivitiesData?: ActivitySummary[];
}

interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    isGreeting?: boolean;
}

export function AICoachModal({ isOpen, onClose, session, athleteProfile, recentActivitiesData }: AICoachModalProps) {
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
                objetivo_principal: objetivoGuardado,
                disponibilidad_semanal: athleteProfile?.disponibilidad || "Disponibilidad completa (Acepta cualquier día, asume 1-2h diarias)."
            };

            const { recentActivities, loadSummary } = buildCoachActivityDataset(recentActivitiesData || []);

            // Enriquecemos el contexto del atleta con cálculos de servidor pre-digeridos
            const enrichedAthleteContext = {
                ...athleteContext,
                analisis_carga_backend: {
                    tss_ultimos_7_dias_total: loadSummary.tss7d,
                    volumen_diario_promedio_7d_mins: loadSummary.volumenPromedio7dMins,
                    ctl_calculado_ewma_42d: loadSummary.ctl,
                    atl_calculado_ewma_7d: loadSummary.atl,
                    tsb_calculado_balance_hoy: loadSummary.tsb,
                    nota_tecnica: "La IA NO DEBE calcular el ATL ni parámetros móviles manualmente, debe basarse en estos outputs EWMA."
                }
            };

            // Extraemos y mapeamos el historial limpio para inyectarle memoria a la IA
            const historyToPass = messages
                .filter(m => !m.id.includes('error') && !m.isGreeting)
                .map(m => ({
                    role: m.role === 'ai' ? 'model' : 'user' as "user" | "model",
                    content: m.content
                }));

            const response = await runCoachPipeline(apiKey, newMsg, enrichedAthleteContext, recentActivities, historyToPass);

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response.textMarkdown,
                isGreeting: false
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
    let wkgColor = 'text-zinc-500';
    let wkgBg = 'bg-zinc-500/10 border-zinc-500/20';

    if (ftp && peso && peso > 0) {
        wkg = Number((ftp / peso).toFixed(2));
        if (wkg < 2.5) { wkgColor = 'text-zinc-400'; wkgBg = 'bg-zinc-500/10 border-zinc-500/50'; }
        else if (wkg < 3.2) { wkgColor = 'text-emerald-400'; wkgBg = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'; }
        else if (wkg < 3.9) { wkgColor = 'text-blue-400'; wkgBg = 'bg-blue-500/10 border-blue-500/40 text-blue-400'; }
        else if (wkg < 4.4) { wkgColor = 'text-indigo-400'; wkgBg = 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400'; }
        else if (wkg < 5.0) { wkgColor = 'text-purple-400'; wkgBg = 'bg-purple-500/10 border-purple-500/40 text-purple-400'; }
        else { wkgColor = 'text-rose-400'; wkgBg = 'bg-rose-500/10 border-rose-500/40 text-rose-400'; }
    }
    // -------------------------------------------------------------

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
            {/* Sidebar Panel */}
            <div className="w-full max-w-md h-full bg-[#111113] border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right text-zinc-100">

                {/* Header — compact single row */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800 bg-[#161618]">
                    {/* Icon */}
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                        <Bot className="w-3.5 h-3.5 text-white" />
                    </div>

                    {/* Title */}
                    <h2 className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 shrink-0">
                        AI Coach
                    </h2>

                    {/* Inline Metrics — scrollable on very small screens */}
                    {athleteProfile ? (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
                            {/* FTP */}
                            <div className="flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5 border border-zinc-800 shrink-0">
                                <Zap className="w-3 h-3 text-amber-500" />
                                <span className="text-white font-bold text-[11px]">{ftp ? `${ftp}W` : '--'}</span>
                            </div>

                            {/* Peso */}
                            <div className="flex items-center gap-1 bg-black/40 rounded px-1.5 py-0.5 border border-zinc-800 shrink-0">
                                <span className="text-zinc-500 font-mono text-[9px]">KG</span>
                                <span className="text-white font-bold text-[11px]">{peso || '--'}</span>
                            </div>

                            {/* W/kg Badge */}
                            {wkg && (
                                <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 border ${wkgBg} shrink-0`}>
                                    <span className={`font-black font-mono text-[11px] ${wkgColor}`}>{wkg}</span>
                                    <span className="text-[8px] uppercase font-bold opacity-80">W/KG</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 min-w-0">
                            <span className="text-zinc-500 font-mono text-[10px]">Cargando...</span>
                        </div>
                    )}

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Dashboard / Chat Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 flex flex-col">

                    {messages.length === 0 && !isLoading && (
                        <div className="flex-1 flex flex-col justify-center items-center opacity-80 mt-10">
                            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 ring-1 ring-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                                <Bot className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h3 className="text-zinc-200 font-bold mb-1 text-center">Coach de IA</h3>
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
                                        <div className="flex flex-col">
                                            <div className="prose prose-invert prose-sm prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border-zinc-800 max-w-none">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                            </div>
                                            {!m.isGreeting && (
                                                <button 
                                                    onClick={() => {
                                                        const blob = new Blob([m.content], { type: 'text/markdown' });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `AI_Coach_Report_${new Date().toISOString().split('T')[0]}.md`;
                                                        a.click();
                                                        URL.revokeObjectURL(url);
                                                    }}
                                                    className="mt-3 text-[10px] flex items-center gap-1.5 text-zinc-500 hover:text-indigo-400 transition-colors bg-zinc-800/20 hover:bg-zinc-800/60 w-fit px-2 py-1 rounded-md border border-zinc-800/50"
                                                    title="Descargar informe como documento de texto"
                                                >
                                                    <Download className="w-3 h-3" /> Descargar Informe
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
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

                {/* Input Area Inferior */}
                <div className="p-4 bg-[#111113] border-t border-zinc-800 pb-[calc(1rem+env(safe-area-inset-bottom,16px))]">
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
