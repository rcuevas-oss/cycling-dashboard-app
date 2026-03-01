import { useState } from 'react'
import { AuthUI } from './components/AuthUI'
import { Dashboard } from './components/Dashboard'
import { AthleteProfile } from './components/AthleteProfile'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

export default function App() {
    const [session, setSession] = useState<Session | null>(null)
    const [activeTab, setActiveTab] = useState<'dashboard' | 'profile'>('dashboard')

    return (
        <div className="min-h-screen bg-background text-zinc-100 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
            {!session ? (
                <div className="max-w-md w-full glass rounded-3xl p-8 premium-shadow text-center space-y-6">
                    <div className="w-16 h-16 bg-garmin-blue/20 text-garmin-blue rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 3.5 0 0 0 0 7h5a3.5 3.5 3.5 0 0 1 0 7H6" /></svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Cycling <span className="gradient-text">AI Trainer</span>
                    </h1>
                    <p className="text-zinc-400">
                        Sube tus archivos CSV de Garmin y deja que nuestra inteligencia artificial optimice tus rutinas de entrenamiento basado en datos reales.
                    </p>
                    <AuthUI onSessionChange={(s) => setSession(s)} />
                </div>
            ) : (
                <div className="w-full max-w-[1400px] glass rounded-3xl p-4 sm:p-8 premium-shadow transition-all duration-500 min-h-[90vh] flex flex-col">

                    {/* APP HEADER & TABS UNIFICADO */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-border pb-6">
                        <div className="flex gap-2 sm:gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-zinc-800 text-garmin-blue shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                            >
                                📊 Panel de Control
                            </button>
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-zinc-800 text-amber-400 shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                            >
                                👤 Mi Perfil Biométrico
                            </button>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                            <span className="text-sm text-zinc-400 hidden sm:inline-block">
                                <span className="text-garmin-blue px-3 py-1 bg-garmin-blue/10 border border-garmin-blue/20 rounded-full font-medium">{session.user.email}</span>
                            </span>
                            <button
                                onClick={() => supabase.auth.signOut()}
                                className="px-5 py-2.5 bg-zinc-800 text-sm font-bold rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all border border-zinc-700 hover:border-red-500/50"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>

                    {/* CONTENIDO DINÁMICO DE PESTAÑAS */}
                    <div className="flex-1 w-full h-full animate-in fade-in duration-500">
                        {activeTab === 'dashboard' ? (
                            <Dashboard session={session} />
                        ) : (
                            <AthleteProfile session={session} />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
