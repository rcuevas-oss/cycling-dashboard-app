import { useState, useEffect } from 'react'
import { AuthUI } from './components/AuthUI'
import { Dashboard } from './components/Dashboard'
import { MyPlanCalendar } from './components/MyPlanCalendar'
import { AthleteProfile } from './components/AthleteProfile'
import { OnboardingWizard } from './components/OnboardingWizard'
import { TrainingPlanner } from './components/TrainingPlanner'
import { AICoachModal } from './components/AICoachModal'
import { AICoachPanel } from './components/AICoachPanel'
import { LandingPage } from './components/LandingPage'
import { FitParserTest } from './components/FitParserTest'
import { FitMigrationModal } from './components/FitMigrationModal'
import { Bot, User, LogOut, ChevronDown, FlaskConical } from 'lucide-react'
import { SiGithub } from 'react-icons/si'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { ActivitySummary, UserIngestionState } from './lib/activityTypes'

function isMissingRelationError(error: { code?: string; message?: string } | null) {
    if (!error) return false
    return error.code === 'PGRST205' || error.code === '42P01' || error.message?.toLowerCase().includes('could not find the table') || false
}

export default function App() {
    const [session, setSession] = useState<Session | null>(null)
    const [activeTab, setActiveTab] = useState<'dashboard' | 'my_plan' | 'planner' | 'fit_test'>('dashboard')
    const [isAIModalOpen, setIsAIModalOpen] = useState(false)
    const [showAuth, setShowAuth] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [isTabTransitioning, setIsTabTransitioning] = useState(false)

    // Estados Globales (Caché en Memoria Viva)
    const [globalProfile, setGlobalProfile] = useState<any>(null)
    const [globalActivities, setGlobalActivities] = useState<ActivitySummary[]>([])
    const [ingestionState, setIngestionState] = useState<UserIngestionState | null>(null)
    const [isLoadingData, setIsLoadingData] = useState(true)
    const isFitTestEnabled = import.meta.env.DEV



    // Función Centralizada para Recargar el Contexto desde Supabase
    const refreshGlobalData = async () => {
        if (!session) {
            setGlobalProfile(null)
            setGlobalActivities([])
            setIngestionState(null)
            setIsLoadingData(false)
            return
        }

        setIsLoadingData(true)

        const userId = session.user.id
        const [
            { data: profileData },
            modernActivitiesResult,
            legacyActivitiesResult,
            { data: ingestionData, error: ingestionError },
        ] = await Promise.all([
            supabase
                .from('athlete_profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle(),
            supabase
                .from('activity_summaries')
                .select('*')
                .eq('user_id', userId)
                .order('activity_date', { ascending: false })
                .limit(150),
            supabase
                .from('activities')
                .select('*')
                .eq('user_id', userId)
                .order('activity_date', { ascending: false })
                .limit(150),
            supabase
                .from('user_ingestion_state')
                .select('user_id, requires_fit_resync, first_fit_synced_at, migration_notice_dismissed_at')
                .eq('user_id', userId)
                .maybeSingle(),
        ])

        let resolvedActivities: ActivitySummary[] = []

        if (!legacyActivitiesResult.error && (legacyActivitiesResult.data?.length ?? 0) > 0) {
            resolvedActivities = (legacyActivitiesResult.data as ActivitySummary[] | null) ?? []
        } else if (!modernActivitiesResult.error) {
            resolvedActivities = (modernActivitiesResult.data as ActivitySummary[] | null) ?? []
        } else if (!legacyActivitiesResult.error) {
            resolvedActivities = (legacyActivitiesResult.data as ActivitySummary[] | null) ?? []
        } else if (!isMissingRelationError(modernActivitiesResult.error) && !isMissingRelationError(legacyActivitiesResult.error)) {
            console.error('No se pudieron cargar las actividades del dashboard.', {
                modern: modernActivitiesResult.error,
                legacy: legacyActivitiesResult.error,
            })
        }

        setGlobalProfile(profileData ?? null)
        setGlobalActivities(resolvedActivities)

        if (ingestionError && !isMissingRelationError(ingestionError)) {
            console.error('No se pudo cargar user_ingestion_state.', ingestionError)
            setIngestionState(null)
        } else if (ingestionError) {
            setIngestionState(null)
        } else {
            setIngestionState(ingestionData ?? null)
        }

        setIsLoadingData(false)
    };

    // Lógica de Transición Suave entre Pestañas
    const handleTabChange = (newTab: 'dashboard' | 'my_plan' | 'planner' | 'fit_test') => {
        if (newTab === activeTab) return;
        setIsTabTransitioning(true);
        setTimeout(() => {
            setActiveTab(newTab);
            setTimeout(() => setIsTabTransitioning(false), 50); 
        }, 300); 
    };

    useEffect(() => {
        let isMounted = true

        supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
            if (isMounted) {
                setSession(existingSession)
            }
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!isMounted) return

            setSession(nextSession)

            if (!nextSession) {
                setGlobalProfile(null)
                setGlobalActivities([])
                setIngestionState(null)
                setShowUserMenu(false)
                setShowProfile(false)
                setIsLoadingData(false)
            }
        })

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [])

    useEffect(() => {
        refreshGlobalData()
    }, [session?.user.id])

    const requiresOnboarding = !globalProfile || !globalProfile.ftp_actual || !globalProfile.peso_actual_kg
    const requiresFitResync = !!session && !isLoadingData && !requiresOnboarding && !!ingestionState?.requires_fit_resync

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
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Cycling <span className="gradient-text">AI Trainer</span>
                        </h1>
                        <AuthUI onSessionChange={(s) => setSession(s)} />
                    </div>
                )
            ) : (
                <div className={`w-full mx-auto h-full flex flex-col relative transition-opacity duration-300 ${isTabTransitioning ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'} ${activeTab === 'dashboard' ? 'max-w-[1600px] p-4 sm:p-6 gap-4' : 'max-w-none p-0 gap-0'}`}>
                    {/* APP HEADER MINIMALISTA */}
                    <div className={`flex justify-between items-center bg-[#111113] border-b border-zinc-800 shadow-sm shrink-0 transition-none ${activeTab === 'dashboard' ? 'rounded-2xl p-4 border' : 'p-4'}`}>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <h1 className="text-xl font-bold tracking-tight hidden sm:block">
                                    Cycling <span className="text-garmin-blue">Pro</span>
                                </h1>
                            </div>

                            {/* Pestañas de Navegación Internas Integradas en el Header */}
                            <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
                                <button
                                    onClick={() => handleTabChange('dashboard')}
                                    disabled={isTabTransitioning}
                                    className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                                >
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => handleTabChange('my_plan')}
                                    disabled={isTabTransitioning}
                                    className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'my_plan' ? 'bg-garmin-blue/20 text-garmin-blue shadow-sm' : 'text-zinc-500 hover:text-garmin-blue hover:bg-garmin-blue/10'}`}
                                >
                                    Mi Plan
                                </button>
                                <button
                                    onClick={() => handleTabChange('planner')}
                                    disabled={isTabTransitioning}
                                    className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'planner' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                                >
                                    VeloFlow AI
                                </button>
                                {isFitTestEnabled && (
                                    <button
                                        onClick={() => handleTabChange('fit_test')}
                                        disabled={isTabTransitioning}
                                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === 'fit_test' ? 'bg-indigo-600/20 text-indigo-400 shadow-sm border border-indigo-500/30' : 'text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
                                    >
                                        <FlaskConical className="w-3.5 h-3.5" /> FIT Test
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Menú de Usuario Compacto */}
                        <div className="relative flex items-center gap-4">
                            <a
                                href="https://github.com/rcuevas-oss"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-500 hover:text-white transition-colors"
                                title="Código Fuente - GitHub"
                            >
                                <SiGithub className="w-5 h-5" />
                            </a>

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
                    ) : requiresOnboarding ? (
                        <OnboardingWizard session={session} initialProfile={globalProfile} onComplete={refreshGlobalData} />
                    ) : (
                        <div className={`flex-1 w-full flex flex-col lg:flex-row overflow-hidden min-h-0 ${activeTab === 'dashboard' ? 'gap-6' : 'gap-0'}`}>
                            {/* COLUMNA IZQUIERDA: Herramientas (Dashboard / Planner) */}
                            <div className={`w-full ${activeTab === 'dashboard' ? 'lg:w-[65%] xl:w-[70%] p-4 sm:p-6 rounded-2xl border' : 'lg:w-full p-0 sm:p-0'} flex flex-col h-full bg-[#111113] border-zinc-800 overflow-hidden shadow-xl relative`}>

                                {/* Pestañas eliminadas de aquí */}

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20 lg:pb-8 relative">
                                    {activeTab === 'dashboard' && <Dashboard session={session} activities={globalActivities} onDataChanged={refreshGlobalData} />}
                                    {activeTab === 'my_plan' && <MyPlanCalendar session={session} />}
                                    {activeTab === 'planner' && <TrainingPlanner session={session} profile={globalProfile} activities={globalActivities} />}
                                    {activeTab === 'fit_test' && isFitTestEnabled && <FitParserTest />}
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: AI Coach Center (Solo visible nativamente en LG y en Dashboard) */}
                            {activeTab === 'dashboard' && (
                                <div className="hidden lg:flex w-full lg:w-[35%] xl:w-[30%] h-full">
                                    <AICoachPanel
                                        session={session}
                                        athleteProfile={globalProfile}
                                        recentActivitiesData={globalActivities}
                                        onNavigate={(v) => setActiveTab(v as any)}
                                    />
                                </div>
                            )}
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

                    {requiresFitResync && (
                        <FitMigrationModal
                            session={session}
                            onSyncComplete={refreshGlobalData}
                        />
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
                        session={session}
                        athleteProfile={globalProfile}
                        recentActivitiesData={globalActivities}
                    />
                </div>
            )}
        </div>
    )
}
