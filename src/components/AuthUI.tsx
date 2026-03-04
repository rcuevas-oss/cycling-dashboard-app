import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Mail, Lock, AlertCircle, ArrowRight, UserPlus, Loader2 } from 'lucide-react';

interface AuthProps {
    onSessionChange: (session: Session | null) => void;
}

export function AuthUI({ onSessionChange }: AuthProps) {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // This checks for existing session just like before
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) onSessionChange(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) onSessionChange(session);
        });

        return () => subscription.unsubscribe();
    }, [onSessionChange]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setIsLoading(true);

        try {
            if (isLoginMode) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('Credenciales inválidas. Verifica tu correo y contraseña.');
                    }
                    throw error;
                }
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) {
                    if (error.message.includes('User already registered')) {
                        throw new Error('Este correo ya está registrado. Intenta iniciar sesión.');
                    }
                    throw error;
                }
                // Si es sign up exitoso y no hay confirmación obligatoria de mail por la config default, Supabase iniciará sesión
            }
        } catch (error: any) {
            setErrorMsg(error.message || 'Ocurrió un error inesperado al procesar la solicitud.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* TAB SELECTOR */}
            <div className="w-full bg-zinc-900/80 p-1.5 rounded-2xl flex gap-1 mb-8 border border-zinc-800 shadow-inner">
                <button
                    onClick={() => { setIsLoginMode(true); setErrorMsg(null); }}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${isLoginMode
                            ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                >
                    Iniciar Sesión
                </button>
                <button
                    onClick={() => { setIsLoginMode(false); setErrorMsg(null); }}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${!isLoginMode
                            ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/50'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                >
                    <UserPlus className="w-4 h-4" /> Registrarse
                </button>
            </div>

            {/* INTRO TEXT */}
            {!isLoginMode && (
                <div className="text-left mb-6 px-1 animate-in slide-in-from-right-4 fade-in duration-300">
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Comienza tu entrenamiento</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                        Crea tu cuenta gratis para integrar métricas y recibir planes dinámicos generados por IA.
                    </p>
                </div>
            )}
            {isLoginMode && (
                <div className="text-left mb-6 px-1 animate-in slide-in-from-left-4 fade-in duration-300">
                    <h3 className="text-xl font-bold text-white mb-1 tracking-tight">¡Hola de nuevo!</h3>
                    <p className="text-sm text-zinc-400">Ingresa a tu panel de control de atleta.</p>
                </div>
            )}

            {/* ERROR BANNER */}
            {errorMsg && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left animate-in fade-in zoom-in-95 duration-200">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-red-400 font-medium">{errorMsg}</span>
                </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">Correo Electrónico</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-garmin-blue text-zinc-500">
                            <Mail className="h-5 w-5" />
                        </div>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-black/40 border border-zinc-800 text-white text-base rounded-xl focus:ring-garmin-blue focus:border-garmin-blue block w-full pl-11 py-3.5 transition-all placeholder:text-zinc-600 shadow-sm"
                            placeholder="tu@email.com"
                        />
                    </div>
                </div>

                <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">Contraseña</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-garmin-blue text-zinc-500">
                            <Lock className="h-5 w-5" />
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            className="bg-black/40 border border-zinc-800 text-white text-base rounded-xl focus:ring-garmin-blue focus:border-garmin-blue block w-full pl-11 py-3.5 transition-all placeholder:text-zinc-600 shadow-sm"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-6 flex items-center justify-center gap-2 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 bg-garmin-blue hover:bg-[#006bb0] shadow-garmin-blue/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <>
                            <span className="text-base">{isLoginMode ? 'Entrar a mi cuenta' : 'Crear Cuenta y Continuar'}</span>
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
