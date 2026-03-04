import { useState, useEffect } from 'react'
import { AuthUI } from './components/AuthUI'
import { Dashboard } from './components/Dashboard'
import { AthleteProfile } from './components/AthleteProfile'
import { OnboardingWizard } from './components/OnboardingWizard'
import { TrainingPlanner } from './components/TrainingPlanner'
import { AICoachModal } from './components/AICoachModal'
import { AICoachPanel } from './components/AICoachPanel'
import { LandingPage } from './components/LandingPage'
import { Bot, User, LogOut, ChevronDown } from 'lucide-react'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { TrainingBlock } from './lib/fitUtils'

export default function App() {
    const [session, setSession] = useState<Session | null>(null)
    const [activeTab, setActiveTab] = useState<'dashboard' | 'planner'>('dashboard')
    const [isAIModalOpen, setIsAIModalOpen] = useState(false)
    const [showAuth, setShowAuth] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)

    // Estados Globales (Caché en Memoria Viva)
    const [globalProfile, setGlobalProfile] = useState<any>(null)
    const [globalActivities, setGlobalActivities] = useState<any[]>([])
    const [isLoadingData, setIsLoadingData] = useState(true)

    // Estado global del planificador para que la IA pueda inyectar rutinas (Formato YYYY-MM-DD)
    const [schedule, setSchedule] = useState<Record<string, TrainingBlock[]>>({})

    // Función Centralizada para Recargar el Contexto desde Supabase
    const refreshGlobalData = async () => {
        if (!session) return;
        setIsLoadingData(true);

        // 1. Descargar Perfil
        const { data: profileData } = await supabase
            .from('athlete_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileData) {
            setGlobalProfile(profileData);
        } else {
            setGlobalProfile(null);
        }

        // 2. Descargar Actividades (Limitadas a las últimas 50 para rendimiento y IA)
        const { data: actsData } = await supabase
            .from('activities')
            .select('*')
            .order('activity_date', { ascending: false })
            .limit(50);
        if (actsData) setGlobalActivities(actsData);

        setIsLoadingData(false);
    };

    // Efecto Inicial: Cargar Plan Semanal y Contexto Global al loguearse
    useEffect(() => {
        const fetchSchedule = async () => {
            if (session) {
                const { data, error } = await supabase
                    .from('user_schedules')
                    .select('schedule_data')
                    .eq('user_id', session.user.id)
                    .single()

                if (!error && data && data.schedule_data) {
                    const parsed = data.schedule_data as Record<string, TrainingBlock[]>;
                    // Migración simple: Si detecta el formato viejo de días, limpia el calendario
                    if (Object.keys(parsed).includes('Lunes')) {
                        console.warn("Detectado formato de calendario antiguo. Reseteando a formato de Fechas.");
                        setSchedule({});
                    } else {
                        setSchedule(parsed);
                    }
                }
            }
        }

        if (session) {
            fetchSchedule();
            refreshGlobalData();
        }
    }, [session])

    return (
        <div className={`bg-background text-zinc-100 flex items-center justify-center ${session ? 'fixed inset-0 overflow-hidden' : 'min-h-screen relative overflow-x-hidden'}`}>
            {!session ? (
                !showAuth ? (
                    <LandingPage onGetStarted={() => setShowAuth(true)} />
                ) : (
                    <div className="max-w-md w-full glass rounded-3xl p-8 premium-shadow text-center space-y-6 m-4 sm:m-8 animate-fade-in-up">
                        <button
                            onClick={() => setShowAuth(false)}
                            className="absolute top-4 left-4 text-zinc-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                        >
                            ← Volver
                        </button>
                        <div className="w-16 h-16 bg-garmin-blue/20 text-garmin-blue rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 3.5 0 0 0 0 7h5a3.5 3.5 3.5 0 0 1 0 7H6" /></svg>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Cycling <span className="gradient-text">AI Trainer</span>
                        </h1>
                        <AuthUI onSessionChange={(s) => setSession(s)} />
                    </div>
                )
            ) : (
                <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 transition-all duration-500 h-full flex flex-col gap-4 relative">
                    {/* APP HEADER MINIMALISTA */}
                    <div className="flex justify-between items-center bg-[#111113] border border-zinc-800 rounded-2xl p-4 shadow-sm shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight hidden sm:block">
                                Cycling <span className="text-garmin-blue">Pro</span>
                            </h1>
                        </div>

                        {/* Menú de Usuario Compacto */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 rounded-full border border-zinc-700/50 transition-colors"
                            >
                                <div className="w-6 h-6 rounded-full bg-garmin-blue/20 text-garmin-blue flex items-center justify-center text-xs font-bold">
                                    {session.user.email?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-zinc-300 hidden sm:block font-medium">{session.user.email?.split('@')[0]}</span>
                                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-2 border-b border-zinc-800/50 mb-2">
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Cuenta</p>
                                        <p className="text-sm text-zinc-300 truncate">{session.user.email}</p>
                                    </div>
                                    <button
                                        onClick={() => { setShowProfile(true); setShowUserMenu(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-amber-400 transition-colors flex items-center gap-2"
                                    >
                                        <User className="w-4 h-4" /> Perfil Biométrico
                                    </button>
                                    <button
                                        onClick={() => supabase.auth.signOut()}
                                        className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 mt-1"
                                    >
                                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ENRUTAMIENTO PRINCIPAL: SI FALTA FTP/PESO O NO TIENE PERFIL, FORZAMOS ONBOARDING */}
                    {isLoadingData ? (
                        <div className="flex-1 w-full flex items-center justify-center">
                            <div className="animate-spin w-10 h-10 border-4 border-zinc-800 border-t-garmin-blue rounded-full"></div>
                        </div>
                    ) : (!globalProfile || !globalProfile.ftp_actual || !globalProfile.peso_actual_kg) ? (
                        <OnboardingWizard session={session} initialProfile={globalProfile} onComplete={refreshGlobalData} />
                    ) : (
                        <div className="flex-1 w-full flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
                            {/* COLUMNA IZQUIERDA: Herramientas (Dashboard / Planner) */}
                            <div className="w-full lg:w-[65%] xl:w-[70%] flex flex-col h-full bg-[#111113] border border-zinc-800 rounded-2xl overflow-hidden p-4 sm:p-6 shadow-xl relative">

                                {/* Pestañas de Navegación Internas (Minimalistas) */}
                                <div className="flex gap-2 mb-6 bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-800/50 w-fit shrink-0">
                                    <button
                                        onClick={() => setActiveTab('dashboard')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                                    >
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('planner')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'planner' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                                    >
                                        Planificador
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20 lg:pb-0">
                                    {activeTab === 'dashboard' && <Dashboard session={session} activities={globalActivities} onDataChanged={refreshGlobalData} />}
                                    {activeTab === 'planner' && <TrainingPlanner schedule={schedule} setSchedule={setSchedule} session={session} profile={globalProfile} />}
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: AI Coach Center (Solo visible nativamente en LG) */}
                            <div className="hidden lg:flex w-full lg:w-[35%] xl:w-[30%] h-full">
                                <AICoachPanel
                                    session={session}
                                    athleteProfile={globalProfile}
                                    recentActivitiesData={globalActivities}
                                    scheduleData={schedule}
                                    onApplyPlan={(plan) => setSchedule(plan)}
                                    onNavigate={(v) => setActiveTab(v as any)}
                                />
                            </div>
                        </div>
                    )}

                    {/* MODAL DE PERFIL BIOMÉTRICO (SLIDEOVER) */}
                    {showProfile && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                            <div className="bg-[#111113] border border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#161618] rounded-t-2xl shrink-0">
                                    <h2 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                                        <User className="w-5 h-5" /> Ajustes del Corredor
                                    </h2>
                                    <button onClick={() => setShowProfile(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-lg transition-colors border border-zinc-700">
                                        Cerrar Panel
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                    <AthleteProfile session={session} profile={globalProfile} onDataChanged={refreshGlobalData} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* AI COACH FLOATING BUTTON & MODAL (SOLO EN MÓVIL < LG) */}
            {session && (
                <div className="lg:hidden">
                    <button
                        onClick={() => setIsAIModalOpen(true)}
                        className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-4 shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all hover:scale-110 flex items-center justify-center"
                    >
                        <Bot className="w-6 h-6" />
                    </button>

                    <AICoachModal
                        isOpen={isAIModalOpen}
                        onClose={() => setIsAIModalOpen(false)}
                        onApplyPlan={(plan) => setSchedule(plan)}
                        session={session}
                        athleteProfile={globalProfile}
                        recentActivitiesData={globalActivities}
                        scheduleData={schedule}
                    />
                </div>
            )}
        </div>
    )
}
