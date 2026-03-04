import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Check, ChevronRight, Zap, Target, User as UserIcon, Activity } from 'lucide-react';

interface OnboardingWizardProps {
    session: Session;
    initialProfile: any;
    onComplete: () => Promise<void>;
}

export function OnboardingWizard({ session, initialProfile, onComplete }: OnboardingWizardProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState<{
        nombre: string;
        sexo: string;
        altura: string;
        pesoActual: string;
        disciplina: string;
        objetivo: string;
        diasDisponibles: string[];
        horasPorDia: Record<string, string>;
        ftpActual: string;
    }>({
        nombre: initialProfile?.nombre || '',
        sexo: initialProfile?.sexo || 'Masculino',
        altura: initialProfile?.altura_cm?.toString() || '',
        pesoActual: initialProfile?.peso_actual_kg?.toString() || '',
        disciplina: initialProfile?.disciplina || 'Ruta',
        objetivo: initialProfile?.objetivo || 'Mantenimiento / Fitness General',
        diasDisponibles: [],
        horasPorDia: {
            'Lunes': '1.5', 'Martes': '1.5', 'Miércoles': '1.5', 'Jueves': '1.5', 'Viernes': '1.5', 'Sábado': '2', 'Domingo': '2'
        },
        ftpActual: initialProfile?.ftp_actual?.toString() || '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(''); // Clear error on interaction
    };

    const nextStep = () => {
        // Validation per step
        if (step === 1 && !formData.nombre.trim()) {
            setError('Por favor, ingresa tu nombre completo.');
            return;
        }
        if (step === 2 && (!formData.pesoActual || Number(formData.pesoActual) <= 20 || !formData.altura || Number(formData.altura) <= 100)) {
            setError('Por favor, ingresa valores válidos de peso (kg) y altura (cm).');
            return;
        }
        if (step === 3 && !formData.disciplina) {
            setError('Por favor, selecciona tu disciplina.');
            return;
        }
        if (step === 4 && formData.diasDisponibles.length === 0) {
            setError('Por favor, selecciona al menos un día de disponibilidad.');
            return;
        }
        setStep(s => s + 1);
        setError('');
    };

    const prevStep = () => {
        setStep(s => Math.max(1, s - 1));
        setError('');
    };

    const handleFinish = async () => {
        if (!formData.ftpActual || Number(formData.ftpActual) <= 50) {
            setError('Por favor, ingresa un FTP válido (ej. 200).');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Construir string final interactivo
            const disponibilidadFinal = formData.diasDisponibles.length > 0
                ? formData.diasDisponibles.map(d => `${d} (${formData.horasPorDia[d] || '1.5'}h)`).join(', ')
                : 'No especificado';

            // Upsert Profile
            const profileData = {
                id: session.user.id,
                ...formData,
                disponibilidad: disponibilidadFinal,
                fecha_evento: initialProfile?.fecha_evento || null, // Keep existing if any, not asked here
                ftp_actual: Number(formData.ftpActual),
                peso_actual_kg: Number(formData.pesoActual),
                altura_cm: Number(formData.altura),
                updated_at: new Date().toISOString(),
            };

            // Clean up temporary keys before inserting
            delete (profileData as any).ftpActual;
            delete (profileData as any).pesoActual;
            delete (profileData as any).altura;
            delete (profileData as any).diasDisponibles;
            delete (profileData as any).horasPorDia;

            const { error: profileError } = await supabase
                .from('athlete_profiles')
                .upsert(profileData);

            if (profileError) throw profileError;

            // Push weight to history track
            // Check if weight actually changed logic is omitted here because it's first onboarding, just insert.
            const { error: weightError } = await supabase
                .from('weight_history')
                .insert({
                    user_id: session.user.id,
                    peso_kg: Number(formData.pesoActual)
                });

            if (weightError) throw weightError;

            // Trigger parent refresh & redirect
            await onComplete();

        } catch (err: any) {
            setError(`Error al guardar: ${err.message}`);
            setIsLoading(false);
        }
    };

    // --- RENDER HELPERS ---

    const renderProgressBar = () => {
        const steps = [
            { num: 1, label: 'Identidad' },
            { num: 2, label: 'Físico' },
            { num: 3, label: 'Perfil' },
            { num: 4, label: 'Horarios' },
            { num: 5, label: 'Motor' }
        ];

        return (
            <div className="w-full max-w-2xl mx-auto mb-10 shrink-0">
                <div className="flex items-center justify-between relative">
                    {/* Background Line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-800/80 rounded-full z-0"></div>
                    {/* Active Line (Calculated Width) */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-purple-500 z-0 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}></div>

                    {steps.map((s) => {
                        const isCompleted = step > s.num;
                        const isActive = step === s.num;

                        return (
                            <div key={s.num} className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 transform ${isCompleted
                                    ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.6)] scale-95'
                                    : isActive
                                        ? 'bg-[#111113] border-2 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-110'
                                        : 'bg-[#1a1a1c] border border-zinc-800 text-zinc-500 scale-90'
                                    }`}>
                                    {isCompleted ? <Check className="w-5 h-5" /> : <span className="text-sm font-black">{s.num}</span>}
                                </div>
                                <span className={`text-[10px] uppercase font-bold tracking-widest transition-colors duration-300 ${isActive ? 'text-purple-300' : isCompleted ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                    {s.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#111113] flex flex-col h-[100dvh]">

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32 custom-scrollbar">

                {/* Header / Logo */}
                <div className="text-center mb-8 shrink-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                        Bienvenido a <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">Cycling Coach AI</span>
                    </h1>
                    <p className="text-zinc-400 max-w-lg mx-auto text-sm sm:text-base">
                        Tu entrenador inteligente necesita algo de información esencial para calibrar tu motor y crear tu primer plan de entrenamiento personalizado.
                    </p>
                </div>

                {renderProgressBar()}

                {/* Error Banner */}
                {error && (
                    <div className="max-w-xl mx-auto w-full mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm text-center font-medium animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {/* Form Container */}
                <div className="w-full max-w-xl mx-auto flex-1">

                    {/* STEP 1: Identidad */}
                    {step === 1 && (
                        <div className="animate-in slide-in-from-right-8 fade-in duration-500 bg-[#161618] border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                                    <UserIcon className="w-6 h-6 text-purple-400" /> Identidad Básica
                                </h2>
                                <p className="text-zinc-500">Empecemos con lo básico para personalizar tu experiencia.</p>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-purple-400/80 uppercase tracking-widest ml-1">NOMBRE COMPLETO</label>
                                    <input
                                        type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} autoFocus
                                        className="w-full bg-[#111113] border border-zinc-800 rounded-2xl p-4 text-white text-lg focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-zinc-700 shadow-inner"
                                        placeholder="Ej. Tadej Pogačar"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-purple-400/80 uppercase tracking-widest ml-1">SEXO BIOLÓGICO</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Masculino', 'Femenino'].map(op => (
                                            <button
                                                key={op} onClick={() => setFormData(prev => ({ ...prev, sexo: op }))}
                                                className={`p-4 rounded-2xl border text-center font-bold transition-all duration-300 ${formData.sexo === op ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/50' : 'bg-[#111113] border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
                                            >
                                                {op}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Físico */}
                    {step === 2 && (
                        <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                                    <Activity className="w-6 h-6 text-purple-400" /> Tu Chasis
                                </h2>
                                <p className="text-zinc-500">El ciclismo se trata de gravedad. Necesitamos tu peso real.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col justify-center items-center h-48 bg-[#161618] border border-zinc-800/80 rounded-3xl relative overflow-hidden shadow-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none"></div>
                                    <p className="text-xs font-black text-purple-400/80 uppercase tracking-widest mb-4 z-10">PESO ACTUAL</p>
                                    <div className="flex items-baseline gap-2 z-10">
                                        <input
                                            type="number" name="pesoActual" value={formData.pesoActual} onChange={handleInputChange} autoFocus
                                            className="w-32 bg-transparent border-b-2 border-purple-500/50 text-center text-5xl font-bold text-white focus:outline-none focus:border-purple-400 transition-colors placeholder:text-zinc-800"
                                            placeholder="0"
                                        />
                                        <span className="text-xl font-bold text-zinc-500">KG</span>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center items-center h-48 bg-[#161618] border border-zinc-800/80 rounded-3xl relative overflow-hidden shadow-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none"></div>
                                    <p className="text-xs font-black text-purple-400/80 uppercase tracking-widest mb-4 z-10">ALTURA</p>
                                    <div className="flex items-baseline gap-2 z-10">
                                        <input
                                            type="number" name="altura" value={formData.altura} onChange={handleInputChange}
                                            className="w-32 bg-transparent border-b-2 border-purple-500/50 text-center text-5xl font-bold text-white focus:outline-none focus:border-purple-400 transition-colors placeholder:text-zinc-800"
                                            placeholder="0"
                                        />
                                        <span className="text-xl font-bold text-zinc-500">CM</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-xs text-zinc-500 mt-6 max-w-sm mx-auto">
                                Estos datos son privados y vitales para que la IA calcule con precisión quirúrgica tu relación W/kg y nivel de arrastre aerodinámico.
                            </p>
                        </div>
                    )}

                    {/* STEP 3: Perfil / Disciplina */}
                    {step === 3 && (
                        <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                                    <Target className="w-6 h-6 text-purple-400" /> Tu Enfoque
                                </h2>
                                <p className="text-zinc-500">Dinos cómo montas en bici y qué buscas lograr.</p>
                            </div>

                            <div className="space-y-8 bg-[#161618] border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-purple-400/80 uppercase tracking-widest ml-1">TERRENO PRINCIPAL</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Ruta', 'MTB', 'Gravel', 'Pista'].map(op => (
                                            <button
                                                key={op} onClick={() => setFormData(prev => ({ ...prev, disciplina: op }))}
                                                className={`p-4 rounded-2xl border text-center font-bold text-sm transition-all duration-300 ${formData.disciplina === op ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/50' : 'bg-[#111113] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'}`}
                                            >
                                                {op}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-zinc-800/50">
                                    <label className="text-[10px] font-black text-purple-400/80 uppercase tracking-widest ml-1">OBJETIVO CENTRAL</label>
                                    <div className="flex flex-col gap-3">
                                        {[
                                            { id: 'Salud y Recreacional', desc: 'Longevidad, rodajes suaves en Z2, sin estrés competitivo.' },
                                            { id: 'Mantenimiento / Fitness General', desc: 'Mantener forma física general mezclando diversión e intensidad.' },
                                            { id: 'Competición / Evento Específico', desc: 'Entrenamiento estructurado y agresivo buscando picos de forma.' },
                                        ].map(obj => (
                                            <button
                                                key={obj.id} onClick={() => setFormData(prev => ({ ...prev, objetivo: obj.id }))}
                                                className={`p-4 rounded-2xl border text-left transition-all duration-300 flex flex-col gap-1.5 ${formData.objetivo === obj.id ? 'bg-purple-500/5 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.1)] ring-1 ring-purple-500/20' : 'bg-[#111113] border-zinc-800 hover:border-zinc-700'}`}
                                            >
                                                <span className={`font-bold ${formData.objetivo === obj.id ? 'text-purple-400' : 'text-zinc-300'}`}>{obj.id}</span>
                                                <span className="text-xs font-medium text-zinc-500">{obj.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Horarios y Disponibilidad */}
                    {step === 4 && (
                        <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                                    <Activity className="w-6 h-6 text-purple-400" /> Disponibilidad
                                </h2>
                                <p className="text-zinc-500">¿De cuánto tiempo a la semana dispone tu motor?</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-zinc-300 mb-4 uppercase tracking-wider text-center">Selecciona tus días libres</label>
                                    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(dia => {
                                            const mapFull = { 'L': 'Lunes', 'M': 'Martes', 'X': 'Miércoles', 'J': 'Jueves', 'V': 'Viernes', 'S': 'Sábado', 'D': 'Domingo' } as Record<string, string>;
                                            const fullDay = mapFull[dia];
                                            const isSelected = formData.diasDisponibles.includes(fullDay);
                                            return (
                                                <button
                                                    key={dia}
                                                    onClick={() => setFormData(p => ({
                                                        ...p,
                                                        diasDisponibles: isSelected ? p.diasDisponibles.filter(d => d !== fullDay) : [...p.diasDisponibles, fullDay]
                                                    }))}
                                                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl font-black text-lg transition-all duration-300 ${isSelected ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-110 ring-2 ring-purple-500/50' : 'bg-[#161618] border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 hover:bg-[#1a1a1c]'}`}
                                                >
                                                    {dia}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                {formData.diasDisponibles.length > 0 && (
                                    <div className="bg-[#161618] p-6 rounded-3xl border border-zinc-800/80 flex flex-col items-center justify-center max-w-2xl mx-auto shadow-xl mt-6 animate-in fade-in zoom-in-95">
                                        <label className="block text-sm font-bold text-purple-400 mb-4 text-center">Ajusta tus horas para cada día seleccionado</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
                                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
                                                .filter(d => formData.diasDisponibles.includes(d))
                                                .map(dia => (
                                                    <div key={dia} className="flex items-center justify-between bg-[#111113] border border-zinc-700/50 rounded-2xl p-2.5">
                                                        <span className="font-bold text-zinc-300 ml-2">{dia}</span>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={formData.horasPorDia[dia] || '1.5'}
                                                                onChange={(e) => setFormData(p => ({
                                                                    ...p,
                                                                    horasPorDia: { ...p.horasPorDia, [dia]: e.target.value }
                                                                }))}
                                                                className="w-16 bg-[#1a1a1c] border border-zinc-700 rounded-xl p-1.5 text-white text-lg font-black text-center focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
                                                                step="0.5" min="0.5" max="10"
                                                            />
                                                            <span className="text-zinc-500 text-xs font-bold uppercase mr-1">hrs</span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: FTP (El Motor) */}
                    {step === 5 && (
                        <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                                    <Zap className="w-6 h-6 text-amber-500" /> El Motor (FTP)
                                </h2>
                                <p className="text-zinc-500">El número más importante de tu planificación.</p>
                            </div>

                            <div className="bg-[#161618] border border-amber-500/30 p-8 rounded-3xl relative overflow-hidden mb-6 shadow-2xl">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Zap className="w-32 h-32 text-amber-500" />
                                </div>
                                <h3 className="text-amber-400 font-bold mb-2">Umbral de Potencia Funcional</h3>
                                <p className="text-sm font-medium text-zinc-400 leading-relaxed max-w-sm relative z-10 mb-8">
                                    Estimamos tus Zonas de Entrenamiento basándonos en tu Potencia Promedio Máxima sostenida por una hora.
                                    Ingresa tu resultado más reciente.
                                </p>

                                <div className="flex items-center gap-4 relative z-10">
                                    <input
                                        type="number" name="ftpActual" value={formData.ftpActual} onChange={handleInputChange} autoFocus
                                        className="w-40 bg-[#111113] border border-amber-500/50 rounded-2xl p-4 text-white text-4xl font-black text-center focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-zinc-800 shadow-inner"
                                        placeholder="250"
                                    />
                                    <span className="text-xl font-bold text-zinc-500 tracking-wider">VATIOS (W)</span>
                                </div>
                            </div>

                            {/* Summary Live Preview */}
                            {formData.ftpActual && formData.pesoActual && (
                                <div className="bg-purple-500/10 border-2 border-purple-500/30 p-6 rounded-3xl flex items-center justify-between animate-in fade-in zoom-in-95 duration-300 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                                    <div>
                                        <p className="text-[10px] text-purple-400/80 font-black uppercase tracking-widest mb-1.5">Tu Relación W/kg Inicial</p>
                                        <p className="text-zinc-300 font-bold text-sm">Vital para la escalada.</p>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <div className="text-5xl font-black font-mono text-purple-400 drop-shadow-lg">
                                            {(Number(formData.ftpActual) / Number(formData.pesoActual)).toFixed(2)}
                                        </div>
                                        <div className="text-sm font-bold text-purple-400/50">W/KG</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation Fixed */}
            <div className="absolute bottom-0 left-0 w-full bg-[#111113]/90 backdrop-blur-md border-t border-zinc-800 p-4 sm:p-6 z-[110]">
                <div className="max-w-xl mx-auto flex justify-between items-center gap-4">
                    {step > 1 ? (
                        <button
                            onClick={prevStep} disabled={isLoading}
                            className="px-6 py-4 rounded-2xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                            ← Volver
                        </button>
                    ) : (
                        <div></div> // Spacer
                    )}

                    {step < 5 ? (
                        <button
                            onClick={nextStep}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-1 ring-purple-500/50"
                        >
                            Siguiente Paso <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish} disabled={isLoading}
                            className="bg-garmin-blue hover:bg-[#006bb0] text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] shadow-[0_0_30px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isLoading ? 'Calibrando...' : 'Finalizar y Entrar'} <ChevronRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
