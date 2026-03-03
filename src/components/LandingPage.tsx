import { ArrowRight, Activity, Brain, LineChart, Cpu, Zap, Shield } from 'lucide-react'
import { SiGarmin, SiSupabase, SiReact, SiTailwindcss, SiTypescript, SiOpenai } from 'react-icons/si'

interface LandingPageProps {
    onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-background text-zinc-100 selection:bg-garmin-blue selection:text-white flex flex-col relative overflow-hidden">

            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-garmin-blue/20 blur-[120px] rounded-full pointer-events-none opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none opacity-30"></div>

            {/* Navigation */}
            <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10 animate-fade-in-down">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-garmin-blue/20 text-garmin-blue rounded-xl flex items-center justify-center border border-garmin-blue/30 shadow-[0_0_15px_rgba(0,124,195,0.3)]">
                        <Activity className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Cycling AI</span>
                </div>
                <button
                    onClick={onGetStarted}
                    className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                    Iniciar Sesión
                </button>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pt-20 pb-32 max-w-7xl mx-auto w-full text-center">

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-garmin-blue/30 text-emerald-400 text-sm font-medium mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Impulsado por Inteligencia Artificial Generativa
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                    Entrena como un Profesional. <br className="hidden md:block" />
                    <span className="gradient-text">Planifica como una Máquina.</span>
                </h1>

                <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                    Sube tus archivos crudos de Garmin. Extraemos tus métricas, analizamos tu desgaste biométrico (TSS) y nuestra IA creará el calendario predictivo perfecto para evitar el sobreentrenamiento.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                    <button
                        onClick={onGetStarted}
                        className="group relative px-8 py-4 bg-white text-black font-bold rounded-2xl overflow-hidden transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative flex items-center justify-center gap-2 group-hover:text-black">
                            Comenzar a Entrenar
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>

                    <button
                        onClick={() => {
                            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="px-8 py-4 glass border border-zinc-700 text-white font-bold rounded-2xl hover:bg-zinc-800/50 transition-colors"
                    >
                        Descubrir Características
                    </button>
                </div>
            </main>

            {/* Features Section */}
            <section id="features" className="relative z-10 py-24 bg-surface/30 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">El ecosistema de datos definitivo</h2>
                        <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
                            Diseñado específicamente para ciclistas que buscan entender la matemática detrás de su rendimiento.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="glass p-8 rounded-3xl premium-shadow hover:-translate-y-2 transition-transform duration-300 group border border-white/5 hover:border-garmin-blue/50">
                            <div className="w-14 h-14 bg-garmin-blue/10 rounded-2xl flex items-center justify-center text-garmin-blue mb-6 group-hover:scale-110 transition-transform">
                                <Cpu className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Parser Garmin .fit/.csv</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Ingesta automática de tus exportaciones crudas. Limpiamos el ruido, conservamos decimales vitales y unificamos el Spanglish a una estructura relacional.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="glass p-8 rounded-3xl premium-shadow hover:-translate-y-2 transition-transform duration-300 group border border-white/5 hover:border-emerald-500/50">
                            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                                <Brain className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Planificador AI Reactivo</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Olvida las plantillas estáticas. Nuestra IA ajusta tus microciclos de entrenamiento en tiempo real basándose en tu acumulación de fatiga.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="glass p-8 rounded-3xl premium-shadow hover:-translate-y-2 transition-transform duration-300 group border border-white/5 hover:border-amber-500/50">
                            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                                <LineChart className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Perfil Biométrico 360°</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Cronología exacta de tu peso (W/kg) y FTP manual. La IA usa estos datos combinados con el clima para predecir tu umbral aeróbico.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="glass p-8 rounded-3xl premium-shadow hover:-translate-y-2 transition-transform duration-300 group border border-white/5 hover:border-purple-500/50 lg:col-span-2">
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                <div className="flex-1">
                                    <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                                        <Zap className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-white">Zonas de Potencia Dinámicas</h3>
                                    <p className="text-zinc-400 leading-relaxed">
                                        El sistema recalcula tus zonas de entrenamiento (Z1-Z7) automáticamente con cada incremento detectado en el núcleo transaccional. Tu app siempre sabe cuándo estás en Sweet Spot y cuándo en el límite anaeróbico.
                                    </p>
                                </div>
                                <div className="w-full md:w-1/3 aspect-square rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-transparent flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgydjJIMXoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
                                    <Activity className="w-20 h-20 text-purple-400/50" />
                                </div>
                            </div>
                        </div>

                        {/* Feature 5 */}
                        <div className="glass p-8 rounded-3xl premium-shadow hover:-translate-y-2 transition-transform duration-300 group border border-white/5 hover:border-blue-500/50">
                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                                <Shield className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Seguridad RLS Total</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Integridad criptográfica en Supabase backend. Entrenamientos sellados: nadie más puede consultar o inyectar datos en tu perfil de atleta.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tech Stack Section */}
            <section className="relative z-10 py-16 bg-background border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 text-center animate-fade-in-up" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
                    <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-8">Potenciado por tecnologías de clase mundial</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 transition-opacity hover:opacity-100 duration-500">
                        <SiGarmin className="w-10 h-10 md:w-12 md:h-12 hover:text-garmin-blue transition-colors cursor-pointer" title="Garmin" />
                        <SiSupabase className="w-10 h-10 md:w-12 md:h-12 hover:text-[#3ECF8E] transition-colors cursor-pointer" title="Supabase" />
                        <SiOpenai className="w-10 h-10 md:w-12 md:h-12 hover:text-white transition-colors cursor-pointer" title="OpenAI" />
                        <SiReact className="w-10 h-10 md:w-12 md:h-12 hover:text-[#61DAFB] transition-colors cursor-pointer" title="React" />
                        <SiTailwindcss className="w-10 h-10 md:w-12 md:h-12 hover:text-[#06B6D4] transition-colors cursor-pointer" title="Tailwind CSS" />
                        <SiTypescript className="w-10 h-10 md:w-12 md:h-12 hover:text-[#3178C6] transition-colors cursor-pointer" title="TypeScript" />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 bg-black/50 py-12 text-center">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
                    <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-white/10">
                        <Activity className="w-5 h-5 text-garmin-blue" />
                    </div>
                    <p className="text-zinc-500 text-sm mb-2">Desarrollado para ciclistas que aman los datos.</p>
                    <p className="text-zinc-600 text-xs">© 2026 Cycling AI Trainer. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    )
}
