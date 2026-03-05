import { useState } from 'react';
import { ArrowRight, Activity, Brain, LineChart, Cpu, Zap, Shield, Menu, X, ChevronRight } from 'lucide-react'
import { SiGarmin, SiSupabase, SiReact, SiTailwindcss, SiTypescript, SiOpenai, SiGithub } from 'react-icons/si'

interface LandingPageProps {
    onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const scrollToSection = (id: string) => {
        setIsMobileMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            const yOffset = -80; // Account for fixed navbar
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
                    {/* Logo Area */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-10 h-10 bg-garmin-blue/10 text-garmin-blue rounded-xl flex items-center justify-center border border-garmin-blue/20 shadow-[0_0_15px_rgba(0,124,195,0.2)]">
                            <Activity className="w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Cycling AI</span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group">
                            Características
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-garmin-blue transition-all group-hover:w-full"></span>
                        </button>
                        <button onClick={() => scrollToSection('manual')} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group">
                            Manual de Uso
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-garmin-blue transition-all group-hover:w-full"></span>
                        </button>
                        <button onClick={() => scrollToSection('about')} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group">
                            Quiénes Somos
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-garmin-blue transition-all group-hover:w-full"></span>
                        </button>
                    </div>

                    {/* Right Side: Start Button & Mobile Toggle */}
                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/rcuevas-oss"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden md:flex text-zinc-400 hover:text-white transition-colors"
                            title="GitHub"
                        >
                            <SiGithub className="w-5 h-5" />
                        </a>

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

                {/* Mobile Menu Overlay */}
                <div className={`md:hidden absolute top-20 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-white/5 transition-all duration-300 overflow-hidden ${isMobileMenuOpen ? 'max-h-96 border-b py-4' : 'max-h-0 border-transparent py-0'}`}>
                    <div className="flex flex-col px-6 gap-4">
                        <button onClick={() => scrollToSection('features')} className="flex items-center justify-between py-3 text-left text-zinc-300 font-medium border-b border-white/5">
                            Características <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                        <button onClick={() => scrollToSection('manual')} className="flex items-center justify-between py-3 text-left text-zinc-300 font-medium border-b border-white/5">
                            Manual de Uso <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                        <button onClick={() => scrollToSection('about')} className="flex items-center justify-between py-3 text-left text-zinc-300 font-medium border-b border-white/5">
                            Quiénes Somos <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                        <a
                            href="https://github.com/rcuevas-oss"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between py-3 text-left text-zinc-300 font-medium border-b border-white/5"
                        >
                            <span className="flex items-center gap-3">
                                <SiGithub className="w-5 h-5" /> GitHub
                            </span>
                            <ChevronRight className="w-4 h-4 opacity-50" />
                        </a>
                        <button onClick={onGetStarted} className="mt-2 w-full flex items-center justify-center gap-2 px-5 py-4 bg-garmin-blue text-white text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(0,124,195,0.3)]">
                            Iniciar Sesión <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pt-36 pb-32 max-w-7xl mx-auto w-full text-center">

                {/* Early Access Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-700/50 mb-8 animate-fade-in-up shadow-sm" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-garmin-blue opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-garmin-blue"></span>
                    </span>
                    <span className="text-xs font-bold text-zinc-300 tracking-wide uppercase">Acceso Anticipado (Piloto)</span>
                    <span className="w-px h-3 bg-zinc-700 mx-1"></span>
                    <span className="text-zinc-400 text-xs flex items-center gap-1">
                        IA Activa <Activity className="w-3 h-3 text-emerald-400" />
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                    Entrena como un Profesional. <br className="hidden md:block" />
                    <span className="gradient-text">Planifica como una Máquina.</span>
                </h1>

                <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                    Sube tus datos crudos de Garmin. Define tu horizonte de fechas y nuestra Inteligencia Artificial calculará dinámicamente tus mesociclos sin riesgo de sobreentrenamiento.
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
                        onClick={() => scrollToSection('features')}
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
                            <h3 className="text-xl font-bold mb-3 text-white">Periodización por Objetivos</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Escoge entre Salud, Mantenimiento o Competición. Alimenta la IA con la fecha de tu evento y ella construirá retrospectivamente tus fases de Base, Construcción o Tapering.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="glass p-8 rounded-3xl premium-shadow hover:-translate-y-2 transition-transform duration-300 group border border-white/5 hover:border-amber-500/50">
                            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                                <LineChart className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Calendario Dinámico Mensual</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Visualiza todo tu horizonte de entrenamiento. Rastrea tu carga real frente a la planificada y navega semanas a meses vista con un solo clic.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="glass p-8 rounded-3xl premium-shadow hover:-translate-y-2 transition-transform duration-300 group border border-white/5 hover:border-purple-500/50 lg:col-span-2">
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                <div className="flex-1">
                                    <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                                        <Zap className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-white">Sistema de Plantillas de Entrenamiento</h3>
                                    <p className="text-zinc-400 leading-relaxed">
                                        Crea tu biblioteca maestra de sesiones clave (Umbrales 4x8', V02Max 5x3'). Insértalas tú mismo en el calendario para forzar los estímulos, y deja que la IA se encargue de rellenar el microciclo calculando la recuperación necesaria.
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

            {/* Manual de Uso Section */}
            <section id="manual" className="relative z-10 py-24 bg-background border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 animate-fade-in-up">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Manual de Uso Inmediato</h2>
                        <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
                            Diseñado sin fricciones. Desde tu ciclocomputador hasta una planificación generativa en 3 simples pasos.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {/* Connecting Line (Desktop only) */}
                        <div className="hidden md:block absolute top-[4.5rem] left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-garmin-blue/20 via-garmin-blue/50 to-emerald-500/20 z-0"></div>

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center text-center group">
                            <div className="w-20 h-20 bg-zinc-900 border-2 border-zinc-800 rounded-full flex items-center justify-center text-garmin-blue mb-6 group-hover:border-garmin-blue/50 group-hover:scale-110 transition-all shadow-xl">
                                <span className="absolute -top-3 -right-3 w-8 h-8 bg-garmin-blue text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-4 border-background">1</span>
                                <Activity className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Exporta tu Historial</h3>
                            <p className="text-zinc-400 leading-relaxed text-sm">
                                Entra a tu cuenta de Garmin Connect web, ve a "Actividades", escoge "Todas las actividades" y exporta la vista actual a formato CSV.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center text-center group mt-8 md:mt-0">
                            <div className="w-20 h-20 bg-zinc-900 border-2 border-zinc-800 rounded-full flex items-center justify-center text-purple-400 mb-6 group-hover:border-purple-500/50 group-hover:scale-110 transition-all shadow-xl">
                                <span className="absolute -top-3 -right-3 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-4 border-background">2</span>
                                <LineChart className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Sube el Archivo</h3>
                            <p className="text-zinc-400 leading-relaxed text-sm">
                                Inicia sesión en Cycling AI y carga tu archivo. Nuestro parser limpiará el ruido métrico y estructurará tu historial atlético.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center text-center group mt-8 md:mt-0">
                            <div className="w-20 h-20 bg-zinc-900 border-2 border-zinc-800 rounded-full flex items-center justify-center text-emerald-400 mb-6 group-hover:border-emerald-500/50 group-hover:scale-110 transition-all shadow-xl">
                                <span className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-4 border-background">3</span>
                                <Brain className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Genera tu Mesociclo</h3>
                            <p className="text-zinc-400 leading-relaxed text-sm">
                                Habla con nuestro AI Coach. Pídele un plan para tu próximo Gran Fondo y observa cómo el calendario se programa dinámicamente frente a ti.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quiénes Somos Section */}
            <section id="about" className="relative z-10 py-24 bg-surface/30 border-t border-white/5 overflow-hidden">
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-garmin-blue/10 blur-[100px] rounded-full"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="glass p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
                        {/* Decoración */}
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-garmin-blue/5 to-transparent pointer-events-none"></div>

                        <div className="flex flex-col md:flex-row gap-12 items-center">
                            <div className="flex-1 space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-garmin-blue/10 text-garmin-blue text-xs font-bold uppercase tracking-wider mb-2">
                                    <Shield className="w-4 h-4" /> El Proyecto
                                </div>
                                <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                                    Construido por <span className="text-garmin-blue">Atletas.</span><br />
                                    Potenciado por <span className="text-emerald-400">Datos.</span>
                                </h2>
                                <p className="text-zinc-400 text-lg leading-relaxed">
                                    Cycling AI nació bajo una premisa sencilla: <strong>el ciclismo de fondo ha dejado de ser solo sudor para convertirse en una ecuación matemática</strong>.
                                </p>
                                <p className="text-zinc-400 text-lg leading-relaxed">
                                    Unimos la rigurosidad de la fisiología deportiva (fases de Base, Construcción, Puesta a Punto) con el poder iterativo de la Inteligencia Artificial Generativa. Aquí no existen planes genéricos en PDF, existe adaptación dinámica basada en tu historial de carga (TSS).
                                </p>
                                <div className="pt-4 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                                        <Cpu className="w-6 h-6 text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">Arquitectura de Rendimiento</p>
                                        <p className="text-zinc-500 text-sm">v1.0.0 - Pilgrimage</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full md:w-5/12 aspect-[4/5] rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                                {/* Si el usuario tiene una imagen, se colocaría aquí. Por ahora usamos un placeholder elegante */}
                                <div className="absolute inset-0 bg-garmin-blue/5 group-hover:bg-garmin-blue/10 transition-colors duration-500 flex flex-col items-center justify-center p-8 text-center gap-4">
                                    <Activity className="w-24 h-24 text-garmin-blue/40" strokeWidth={1} />
                                    <div className="z-20 absolute bottom-8 left-8 right-8 text-left">
                                        <p className="text-emerald-400 font-mono text-sm mb-2 opacity-80">{"<DataDriven />"}</p>
                                        <p className="text-white font-medium text-lg leading-snug">
                                            "El volumen construye resistencia, pero la inteligencia construye campeones."
                                        </p>
                                    </div>
                                </div>
                            </div>
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
