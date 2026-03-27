import { useState } from 'react';
import { ArrowRight, Menu, X, ChevronRight, Activity, CheckCircle2, XCircle, Brain, Zap, LineChart, Clock, Sparkles, Bot, LayoutGrid, Target, TrendingUp } from 'lucide-react'
import { SiGarmin, SiSupabase, SiReact, SiTailwindcss, SiTypescript, SiOpenai } from 'react-icons/si'

interface LandingPageProps {
    onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const scrollToSection = (id: string) => {
        setIsMobileMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            const yOffset = -80;
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-background text-zinc-100 selection:bg-garmin-blue selection:text-white flex flex-col relative overflow-x-hidden">

            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-garmin-blue/20 blur-[120px] rounded-full pointer-events-none opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none opacity-30"></div>

            {/* Glass Navbar */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
                <nav className="w-full max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-10 h-10 bg-garmin-blue/10 text-garmin-blue rounded-xl flex items-center justify-center border border-garmin-blue/20 shadow-[0_0_15px_rgba(0,124,195,0.2)]">
                            <Activity className="w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">VeloFlow</span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group">
                            Cómo Funciona
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-garmin-blue transition-all group-hover:w-full"></span>
                        </button>
                        <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group">
                            Características
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-garmin-blue transition-all group-hover:w-full"></span>
                        </button>
                        <button onClick={() => scrollToSection('audience')} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group">
                            Para Quién Es
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-garmin-blue transition-all group-hover:w-full"></span>
                        </button>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onGetStarted}
                            className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-bold rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        >
                            Acceder
                            <ArrowRight className="w-4 h-4" />
                        </button>

                        <button
                            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </nav>

                {/* Mobile Menu */}
                <div className={`md:hidden absolute top-20 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-white/5 transition-all duration-300 overflow-hidden ${isMobileMenuOpen ? 'max-h-96 border-b py-4' : 'max-h-0 border-transparent py-0'}`}>
                    <div className="flex flex-col px-6 gap-4">
                        <button onClick={() => scrollToSection('how-it-works')} className="flex items-center justify-between py-3 text-left text-zinc-300 font-medium border-b border-white/5">
                            Cómo Funciona <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                        <button onClick={() => scrollToSection('features')} className="flex items-center justify-between py-3 text-left text-zinc-300 font-medium border-b border-white/5">
                            Características <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                        <button onClick={() => scrollToSection('audience')} className="flex items-center justify-between py-3 text-left text-zinc-300 font-medium border-b border-white/5">
                            Para Quién Es <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                        <button onClick={onGetStarted} className="mt-2 w-full flex items-center justify-center gap-2 px-5 py-4 bg-garmin-blue text-white text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(0,124,195,0.3)]">
                            Iniciar Sesión <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO PRINCIPAL */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pt-36 pb-20 max-w-7xl mx-auto w-full text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-700/50 mb-8 animate-fade-in-up shadow-sm">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-garmin-blue opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-garmin-blue"></span>
                    </span>
                    <span className="text-xs font-bold text-zinc-300 tracking-wide uppercase">AI Predictiva Activa</span>
                </div>

                <h1 className="text-5xl md:text-8xl font-extrabold tracking-tight mb-8 leading-[1.05] animate-fade-in-up">
                    Tu Rendimiento. <br className="hidden md:block" />
                    <span className="gradient-text">Decodificado por IA.</span>
                </h1>

                <p className="text-lg md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-10 animate-fade-in-up leading-relaxed">
                    Analiza tu historial, predice tu fatiga y genera planes profesionales listos para tu dispositivo Garmin. <span className="text-zinc-100 font-semibold">Ciencia real, lenguaje simple.</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mx-auto justify-center animate-fade-in-up mb-20">
                    <button
                        onClick={onGetStarted}
                        className="group relative px-8 py-4 bg-white text-black font-bold rounded-2xl overflow-hidden transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative flex items-center justify-center gap-2 group-hover:text-black">
                            Probar VeloFlow Gratis
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>
                </div>

                {/* VISUAL PRINCIPAL: Rediseñado con split AI/Dashboard */}
                <div className="w-full max-w-6xl mx-auto rounded-[2.5rem] border border-white/10 bg-zinc-900/40 p-3 md:p-6 premium-shadow relative group animate-fade-in-up hidden sm:block" style={{ animationDelay: '0.4s' }}>
                    <div className="bg-zinc-950 rounded-[2rem] overflow-hidden relative flex border border-white/5 backdrop-blur-3xl shadow-2xl h-[560px]">
                        
                        {/* Panel Izquierdo: AI Insight Sidebar */}
                        <div className="w-1/3 border-r border-white/10 flex flex-col bg-zinc-900/30">
                            <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-black/20">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-bold text-zinc-100 italic">VeloCoach AI</span>
                            </div>
                            <div className="flex-1 p-5 space-y-6 overflow-hidden">
                                <div className="space-y-2">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Análisis de Progreso</p>
                                    <div className="bg-zinc-800/50 rounded-xl p-3 border border-indigo-500/20">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-xs text-zinc-400">Eficiencia Aeróbica</span>
                                            <span className="text-sm font-bold text-emerald-400">+12.4%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-[78%]"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                                            <Sparkles className="w-3 h-3 text-indigo-400" />
                                        </div>
                                        <div className="bg-zinc-800/80 rounded-2xl rounded-tl-none p-3 text-[11px] text-zinc-300 leading-relaxed border border-white/5">
                                            "Tu desacoplamiento cardíaco ha bajado un 5%. Estás listo para aumentar el volumen de Z3."
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 pl-9">
                                        <div className="h-6 w-32 bg-indigo-600/10 border border-indigo-500/20 rounded-lg flex items-center justify-center">
                                            <span className="text-[9px] font-bold text-indigo-400">Ajustar Plan Semanal</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-2">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest italic">Correlación de Datos</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                                            <div className="text-[9px] text-zinc-500">Fatiga (ATL)</div>
                                            <div className="text-xs font-bold text-rose-400 font-mono">82% <TrendingUp className="inline w-2 h-2" /></div>
                                        </div>
                                        <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                                            <div className="text-[9px] text-zinc-500">FTP Est.</div>
                                            <div className="text-xs font-bold text-garmin-blue font-mono">312w</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Panel Derecho: Planner / Dashboard View */}
                        <div className="flex-1 flex flex-col relative">
                            {/* Toolbar */}
                            <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md">
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                                    </div>
                                    <div className="h-4 w-px bg-white/10"></div>
                                    <span className="text-[11px] font-mono text-zinc-400">VeloFlow / Entrenamientos Estructurados</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-garmin-blue/10 border border-garmin-blue/30 text-garmin-blue px-3 py-1 rounded-lg flex items-center gap-2">
                                        <SiGarmin className="w-4 h-4" />
                                        <span className="text-[10px] font-bold">Garmin Ready</span>
                                    </div>
                                    <button className="bg-indigo-600 px-3 py-1 rounded-lg text-[10px] font-bold text-white shadow-lg shadow-indigo-600/20">
                                        Generar con IA
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Area (Mocking React Flow Nodes) */}
                            <div className="flex-1 bg-zinc-950 p-6 relative overflow-hidden">
                                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '30px 30px' }}></div>
                                
                                {/* Example Nodes */}
                                <div className="relative h-full">
                                    {/* Primary Node 1 */}
                                    <div className="absolute top-10 left-10 w-48 bg-zinc-900 border border-indigo-500/30 rounded-xl p-4 shadow-xl z-10 animate-pulse-subtle">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                        </div>
                                        <div className="text-xs font-bold text-white mb-1">VO2Max Intervals</div>
                                        <div className="text-[10px] text-zinc-400 font-mono">5 x 4' @ 115% FTP</div>
                                        <div className="mt-4 flex gap-1 h-8 items-end">
                                            <div className="w-full bg-zinc-800 h-2 rounded-t-sm"></div>
                                            <div className="w-full bg-indigo-500 h-6 rounded-t-sm"></div>
                                            <div className="w-full bg-zinc-800 h-2 rounded-t-sm"></div>
                                            <div className="w-full bg-indigo-500 h-6 rounded-t-sm"></div>
                                            <div className="w-full bg-zinc-800 h-2 rounded-t-sm"></div>
                                        </div>
                                    </div>

                                    {/* Connection Line (SVG) */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                                        <path d="M 230 110 Q 300 110 300 180" stroke="url(#gradient-line)" strokeWidth="2" fill="none" strokeDasharray="5,5" />
                                        <defs>
                                            <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#6366f1" />
                                                <stop offset="100%" stopColor="#0ea5e9" />
                                            </linearGradient>
                                        </defs>
                                    </svg>

                                    {/* Primary Node 2 (Prediction) */}
                                    <div className="absolute top-48 left-60 w-56 bg-zinc-900 border border-emerald-500/30 rounded-xl p-4 shadow-xl animate-float">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                            <span className="text-[8px] font-bold text-emerald-500 uppercase">Backtesting Activo</span>
                                        </div>
                                        <div className="text-xs font-bold text-white mb-1">Impacto en TSB (Fatiga)</div>
                                        <div className="text-[10px] text-zinc-400 mb-3 leading-relaxed">Predicción de frescura post-sesión.</div>
                                        <div className="flex items-end justify-between gap-1 h-12">
                                            {[40, 60, 30, 80, 50, 90, 45].map((h, i) => (
                                                <div key={i} className={`w-full rounded-t-sm ${i === 5 ? 'bg-emerald-500' : 'bg-zinc-800'}`} style={{ height: `${h}%` }}></div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Overlay Metrics Floating */}
                                    <div className="absolute bottom-10 right-10 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Fitness (CTL)</div>
                                                <div className="text-lg font-mono font-bold text-garmin-blue">84.2</div>
                                            </div>
                                            <div className="w-px h-8 bg-white/10"></div>
                                            <div>
                                                <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Forma (TSB)</div>
                                                <div className="text-lg font-mono font-bold text-rose-500">-12</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute -top-6 -right-6 w-12 h-12 bg-indigo-600 rounded-2xl blur-2xl opacity-40"></div>
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-garmin-blue rounded-full blur-3xl opacity-20"></div>
                </div>

                {/* VISUAL MÓVIL (Tarjeta simplificada) */}
                <div className="w-full sm:hidden mx-auto rounded-[2rem] border border-white/10 bg-zinc-900/50 p-2 relative group animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <div className="bg-zinc-950 rounded-2xl overflow-hidden relative flex flex-col border border-white/5 p-4 text-left">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Hoy - Martes</span>
                            <span className="text-xs font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">TSS 85</span>
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Umbral 4x8'</h3>
                                <p className="text-sm text-zinc-400 font-mono">1h 15m • IF 0.82</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs p-2 rounded bg-zinc-900 border border-white/5">
                                <span className="text-garmin-blue font-mono">15:00</span>
                                <span className="text-zinc-300 w-1/2">Calentamiento</span>
                                <span className="text-zinc-500 text-right font-mono w-1/4">55%</span>
                            </div>
                            <div className="flex justify-between text-xs p-2 rounded bg-amber-500/5 border border-amber-500/20 shadow-[inset_2px_0_0_#f59e0b]">
                                <span className="text-garmin-blue font-mono">8:00</span>
                                <span className="text-amber-400 w-1/2 font-bold">Bloque de Umbral</span>
                                <span className="text-indigo-400 text-right font-mono w-1/4">95-105%</span>
                            </div>
                            <div className="flex justify-between text-xs p-2 rounded bg-zinc-900 border border-white/5">
                                <span className="text-garmin-blue font-mono">4:00</span>
                                <span className="text-zinc-400 w-1/2">Recuperación Z1</span>
                                <span className="text-zinc-500 text-right font-mono w-1/4">50%</span>
                            </div>
                            <div className="flex justify-between text-xs justify-center p-2 pt-4">
                                <span className="text-zinc-600 font-mono">... (x4 repeticiones)</span>
                            </div>
                        </div>
                    </div>
                </div>

              {/* SECCIÓN 1: IA ANALÍTICA (DIAGNÓSTICO) */}
            <section id="ai-analysis" className="py-24 md:py-32 relative z-10 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider border border-indigo-500/20">
                                <Brain className="w-3.5 h-3.5" /> IA de Análisis Profundo
                            </div>
                            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
                                Diagnóstico Real. <br />
                                <span className="text-indigo-400">Sin Interpretaciones.</span>
                            </h2>
                            <p className="text-zinc-400 text-xl leading-relaxed">
                                Nuestra IA no solo lee KB/s; cruza tu historial de potencia, frecuencia cardíaca y HRV de tus últimas 150 sesiones para decirte <span className="text-white font-bold">exactamente cuánto has mejorado.</span>
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-100 italic">"Tu potencia en el umbral ha subido un 4.2% analizando tus últimas 150 sesiones."</p>
                                        <p className="text-xs text-zinc-500">Análisis basado en 12 actividades correlacionadas.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 w-full relative group">
                            <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative bg-zinc-950 rounded-3xl border border-white/10 p-6 shadow-2xl overflow-hidden aspect-video flex flex-col justify-center">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <span className="text-zinc-400 text-sm">Mejora de Potencia (5 min)</span>
                                        <span className="text-2xl font-bold text-emerald-400">+18%</span>
                                    </div>
                                    <div className="h-4 w-full bg-zinc-900 rounded-full overflow-hidden p-1 border border-white/5">
                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full w-[82%] animate-shimmer"></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 pt-4">
                                        <div className="text-center">
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Resistencia</div>
                                            <div className="text-lg font-bold text-white">Alta</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Recuperación</div>
                                            <div className="text-lg font-bold text-emerald-500">Óptima</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Fatiga</div>
                                            <div className="text-lg font-bold text-rose-500">12%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 2: VELO FLOW (GARMIN READY) */}
            <section id="veloflow" className="py-24 md:py-32 relative z-10 bg-zinc-900/20 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                        <div className="flex-1 space-y-8 text-right md:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-garmin-blue/10 text-garmin-blue text-xs font-bold uppercase tracking-wider border border-garmin-blue/20">
                                <SiGarmin className="w-3.5 h-3.5" /> Garmin Compatibility Ready
                            </div>
                            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
                                VeloFlow: <br />
                                <span className="text-garmin-blue">Bloques de Entrenamiento IA.</span>
                            </h2>
                            <p className="text-zinc-400 text-xl leading-relaxed">
                                Diseña sesiones complejas arrastrando bloques de potencia. VeloFlow genera archivos estructurados <span className="text-white font-bold italic">exactamente como Garmin los espera</span> para que solo tengas que subirlos y pedalear.
                            </p>
                            <div className="flex flex-col md:flex-row gap-4 justify-end md:justify-start">
                                <div className="px-4 py-2 rounded-xl bg-zinc-800 border border-white/5 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-garmin-blue" />
                                    <span className="text-sm font-medium">Exportación FIT/TCX</span>
                                </div>
                                <div className="px-4 py-2 rounded-xl bg-zinc-800 border border-white/5 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-garmin-blue" />
                                    <span className="text-sm font-medium">Drag-and-Drop Simplificado</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 w-full order-1">
                            {/* Mockup de VeloFlow Nodes */}
                            <div className="aspect-[4/3] rounded-[2rem] border border-white/10 bg-black p-4 premium-shadow relative overflow-hidden flex flex-col">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-garmin-blue/10 blur-[80px] rounded-full"></div>
                                <div className="flex-1 flex flex-col gap-4 justify-center items-center">
                                    <div className="w-56 bg-zinc-900 border border-garmin-blue/40 rounded-2xl p-4 shadow-2xl relative translate-x-[-20px] -rotate-2">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded bg-garmin-blue/20 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-garmin-blue"/></div>
                                            <span className="text-[10px] font-bold text-white">INTERVALO UMBRAL</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-garmin-blue w-[90%]"></div>
                                            </div>
                                            <div className="text-[9px] text-zinc-500 font-mono">10:00 @ 100% FTP</div>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center">
                                        <ArrowRight className="w-4 h-4 text-zinc-700 rotate-90" />
                                    </div>
                                    <div className="w-56 bg-zinc-900 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl relative translate-x-[20px] rotate-2">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center"><Clock className="w-3.5 h-3.5 text-emerald-500"/></div>
                                            <span className="text-[10px] font-bold text-white">RECUPERACIÓN Z1</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-[40%]"></div>
                                            </div>
                                            <div className="text-[9px] text-zinc-500 font-mono">05:00 @ 55% FTP</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 3: BACKTESTING (PREDICCIÓN) */}
            <section id="backtesting" className="py-24 md:py-32 relative z-10 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                                <LineChart className="w-3.5 h-3.5" /> Backtesting Estadístico
                            </div>
                            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
                                Mira el Futuro <br />
                                <span className="text-emerald-400">de tu Rendimiento.</span>
                            </h2>
                            <p className="text-zinc-400 text-xl leading-relaxed">
                                Crea un plan y comprueba estadísticamente cómo evolucionarán tus niveles de fitness y fatiga. <span className="text-white font-bold">Llega a tu evento principal en el pico absoluto de forma</span>, no por suerte, sino por cálculo.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-zinc-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Proyecciones de CTL (Fitness) a 30 días
                                </li>
                                <li className="flex items-center gap-3 text-zinc-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Alertas de sobre-entrenamiento preventivas
                                </li>
                            </ul>
                        </div>
                        <div className="flex-1 w-full">
                            {/* Mockup de Gráfico Predictivo */}
                            <div className="aspect-video rounded-3xl bg-zinc-950 border border-white/10 p-8 premium-shadow relative overflow-hidden group">
                                <div className="absolute top-4 right-6 text-[10px] font-mono text-zinc-600">Simulación / Semana +3</div>
                                <div className="h-full w-full flex items-end gap-1.5 pt-8">
                                    {[20, 25, 22, 35, 45, 42, 38, 55, 65, 60, 58, 75, 85, 82, 95].map((h, i) => (
                                        <div key={i} className={`flex-1 rounded-t-lg transition-all duration-500 ${i > 7 ? 'bg-emerald-500/40 border-t border-emerald-500 border-dashed animate-pulse' : 'bg-emerald-500/20'}`} style={{ height: `${h}%` }}>
                                            {i === 14 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">FITNESS PEAK</div>}
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5"></div>
                                <div className="absolute top-2/3 left-0 w-full h-[1px] bg-white/5"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 4: DASHBOARD COMPRENSIBLE */}
            <section id="dashboard" className="py-24 md:py-32 relative z-10 bg-surface/30">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                        <div className="flex-1 space-y-8 text-right md:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100/10 text-zinc-100 text-xs font-bold uppercase tracking-wider border border-white/10">
                                <LayoutGrid className="w-3.5 h-3.5" /> Dashboard Simplificado
                            </div>
                            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
                                Datos Complejos, <br />
                                <span className="text-zinc-400">Lenguaje Humano.</span>
                            </h2>
                            <p className="text-zinc-400 text-xl leading-relaxed">
                                Olvídate de gráficos técnicos indescifrables. Nuestro panel traduce términos como TSS, IF y ATL a conceptos que <span className="text-white font-bold italic">realmente importan</span> para tu entrenamiento diario. No somos para ingenieros aeroespaciales, somos para ciclistas.
                            </p>
                        </div>
                        <div className="flex-1 w-full grid grid-cols-2 gap-6">
                            <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 premium-shadow hover:scale-105 transition-transform cursor-pointer group">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                    <Target className="w-5 h-5" />
                                </div>
                                <h4 className="text-white font-bold mb-2">Entrenamiento Útil</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed font-mono">Has acumulado 4h en Z4 esta semana. Eficacia máxima.</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 premium-shadow hover:scale-105 transition-transform cursor-pointer group translate-y-8">
                                <div className="w-10 h-10 rounded-xl bg-garmin-blue/10 text-garmin-blue flex items-center justify-center mb-4 group-hover:bg-garmin-blue group-hover:text-white transition-colors">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h4 className="text-white font-bold mb-2">Batería Humana</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed font-mono">Energía actual al 85%. Recomendación: Entreno intenso.</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 premium-shadow hover:scale-105 transition-transform cursor-pointer group">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h4 className="text-white font-bold mb-2">Estado de Forma</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed font-mono">Subiendo. Tu corazón es hoy un 3% más eficiente.</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 premium-shadow hover:scale-105 transition-transform cursor-pointer group translate-y-8">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                    <Brain className="w-5 h-5" />
                                </div>
                                <h4 className="text-white font-bold mb-2">Análisis de IA</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed font-mono">Has superado tu mejor marca de 20min. Nuevo FTP detectado.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>

            {/* AUDIENCIA / FIT */}
            <section id="audience" className="py-24 relative z-10 bg-surface/30 border-t border-white/5">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-16 px-4">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Diseñado para ciclistas que entrenan con objetivos</h2>
                        <p className="text-zinc-400 text-lg">VeloFlow es una herramienta de análisis para quienes buscan estructura, datos claros y un progreso sostenible.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* FIT */}
                        <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 premium-shadow">
                            <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2"><CheckCircle2 className="w-6 h-6"/> Le sacarás provecho si:</h3>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> 
                                    <span className="text-zinc-300">Utilizas potenciómetro o monitor cardíaco y registras tus actividades.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> 
                                    <span className="text-zinc-300">Te interesa gestionar tu carga de entrenamiento (TSS) para evitar sobrecargas o estancamientos.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> 
                                    <span className="text-zinc-300">Buscas adaptar tus semanas con rapidez, en lugar de seguir un plan en PDF que no considera tu fatiga diaria.</span>
                                </li>
                            </ul>
                        </div>

                        {/* NO FIT */}
                        <div className="p-8 rounded-3xl bg-zinc-800/20 border border-zinc-700/50 opacity-90 premium-shadow">
                            <h3 className="text-xl font-bold text-zinc-400 mb-6 flex items-center gap-2"><XCircle className="w-6 h-6"/> Puede que no lo necesites si:</h3>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" /> 
                                    <span className="text-zinc-300/80">Prefieres salir a pedalear de forma libre, sin prestarle tanta atención a las zonas de intensidad.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" /> 
                                    <span className="text-zinc-300/80">No sueles descargar el historial de tus entrenamientos en un ciclocomputador.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" /> 
                                    <span className="text-zinc-300/80">Solo buscas un plan estático de 12 semanas listo para copiar y pegar sin ajustar sobre la marcha.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA SECUNDARIO & TECH STACK */}
            <section className="relative z-10 py-16 bg-background border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-sm font-semibold text-zinc-600 uppercase tracking-widest mb-8">Arquitectura robusta y escalable</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-30 hover:opacity-80 transition-opacity duration-500 monochrome filter grayscale">
                        <SiGarmin className="w-10 h-10 hover:text-garmin-blue hover:grayscale-0 transition-all cursor-pointer" title="Garmin" />
                        <SiSupabase className="w-10 h-10 hover:text-[#3ECF8E] hover:grayscale-0 transition-all cursor-pointer" title="Supabase" />
                        <SiOpenai className="w-10 h-10 hover:text-white hover:grayscale-0 transition-all cursor-pointer" title="OpenAI" />
                        <SiReact className="w-10 h-10 hover:text-[#61DAFB] hover:grayscale-0 transition-all cursor-pointer" title="React" />
                        <SiTailwindcss className="w-10 h-10 hover:text-[#06B6D4] hover:grayscale-0 transition-all cursor-pointer" title="Tailwind CSS" />
                        <SiTypescript className="w-10 h-10 hover:text-[#3178C6] hover:grayscale-0 transition-all cursor-pointer" title="TypeScript" />
                    </div>
                    
                    <button
                        onClick={onGetStarted}
                        className="mt-20 px-10 py-5 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-transform premium-shadow shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                    >
                        Ingresar a la Plataforma
                    </button>
                </div>
            </section>

            {/* FOOTER PÚBLICO */}
            <footer className="relative z-10 border-t border-white/5 bg-black/80 py-8 text-center backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
                    <Activity className="w-6 h-6 text-garmin-blue/50 mb-4" />
                    <p className="text-zinc-600 text-xs">Desarrollado para ciclistas analíticos. © 2026 VeloFlow by Cycling AI.</p>
                </div>
            </footer>
        </div>
    )
}
