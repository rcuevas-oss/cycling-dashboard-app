import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export function AthleteProfile({ session, profile, onDataChanged }: { session: Session, profile: any, onDataChanged: () => Promise<void> }) {
    const [isLoading, setIsLoading] = useState(false); // Used for both initial load and saving
    const [message, setMessage] = useState('');

    // State to hold form data, initialized from profile prop
    const [formData, setFormData] = useState({
        nombre: '',
        sexo: 'Masculino',
        disciplina: 'Ruta',
        objetivo: 'Mantenimiento / Fitness General',
        disponibilidad: '',
        fechaEvento: '',
        ftpActual: '',
        pesoActual: '',
    });

    // Historial para comparar si cambió el peso
    const [originalPeso, setOriginalPeso] = useState<number | ''>('');

    // Populate form data when the profile prop changes
    useEffect(() => {
        if (profile) {
            setFormData({
                nombre: profile.nombre || '',
                sexo: profile.sexo || 'Masculino',
                disciplina: profile.disciplina || 'Ruta',
                objetivo: profile.objetivo || 'Mantenimiento / Fitness General',
                disponibilidad: profile.disponibilidad || '',
                fechaEvento: profile.fecha_evento || '',
                ftpActual: profile.ftp_actual?.toString() || '',
                pesoActual: profile.peso_actual_kg?.toString() || '',
            });
            setOriginalPeso(profile.peso_actual_kg || '');
        }
    }, [profile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsLoading(true);

        try {
            // 1. Guardar/Actualizar Perfil (Upsert usando el ID de la cuenta)
            const profileData = {
                id: session.user.id,
                ...formData,
                fecha_evento: formData.fechaEvento ? formData.fechaEvento : null,
                ftp_actual: formData.ftpActual === '' ? null : Number(formData.ftpActual),
                peso_actual_kg: formData.pesoActual === '' ? null : Number(formData.pesoActual),
                updated_at: new Date().toISOString(),
            };

            // Eliminar keys camelCase usadas localmente antes de BD (opcional pero limpio)
            delete (profileData as any).fechaEvento;
            delete (profileData as any).ftpActual;
            delete (profileData as any).pesoActual;

            const { error: profileError } = await supabase
                .from('athlete_profiles')
                .upsert(profileData);

            if (profileError) throw profileError;

            // 2. Si el peso cambió, inyectar automáticamente al historial biométrico (Data AI)
            if (formData.pesoActual !== '' && formData.pesoActual !== originalPeso.toString()) {
                const { error: weightError } = await supabase
                    .from('weight_history')
                    .insert({
                        user_id: session.user.id,
                        peso_kg: Number(formData.pesoActual)
                    });

                if (weightError) throw weightError;
                setOriginalPeso(Number(formData.pesoActual)); // Reset param comparison para que no lo mande doble si vuelve a clickear
            }

            setMessage('✅ Perfil y métricas biométricas enlazadas a tu base de datos exitosamente.');
            await onDataChanged(); // Aviso a App.tsx para que recargue y distribuya la nueva data
        } catch (error: any) {
            setMessage(`❌ Error al guardar datos: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !profile) {
        return <div className="p-12 text-center text-zinc-400 font-medium">Cargando perfil biométrico...</div>;
    }

    return (
        <div className="w-full text-left flex flex-col h-full gap-6">
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-border">
                <h2 className="text-2xl font-bold tracking-tight">Tu Perfil Fisiológico</h2>
                <p className="text-sm text-zinc-400 mt-1">
                    Esta información es vital para que nuestra IA calcule tus desgastes, zonas y proporcione recomendaciones muy precisas de vatios/kilo (W/kg).
                </p>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* IDENTIDAD */}
                <div className="bg-zinc-900 border border-border rounded-xl p-6 space-y-5">
                    <h3 className="font-semibold text-lg text-garmin-blue border-b border-border pb-2">Identidad Ciclista</h3>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-zinc-300">Nombre Completo</label>
                        <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-garmin-blue transition-colors"
                            placeholder="Ej. Tadej Pogačar"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-300">Sexo Biológico</label>
                            <select name="sexo" value={formData.sexo} onChange={handleInputChange}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-garmin-blue transition-colors"
                            >
                                <option value="Masculino">Masculino</option>
                                <option value="Femenino">Femenino</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-300">Disciplina Principal</label>
                            <select name="disciplina" value={formData.disciplina} onChange={handleInputChange}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-garmin-blue transition-colors"
                            >
                                <option value="Ruta">Ruta</option>
                                <option value="MTB">MTB</option>
                                <option value="Gravel">Gravel</option>
                                <option value="Pista">Pista</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2 col-span-2">
                            <label className="text-sm font-medium text-zinc-300">Objetivo Principal / Enfoque</label>
                            <select name="objetivo" value={formData.objetivo} onChange={handleInputChange}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-garmin-blue transition-colors"
                            >
                                <option value="Salud y Recreacional">Salud y Recreacional (Longevidad, Z2, sin estrés)</option>
                                <option value="Mantenimiento / Fitness General">Mantenimiento / Fitness General (Mantener base, divertirse)</option>
                                <option value="Competición / Evento Específico">Competición / Evento Específico (Preparación estructurada)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2 col-span-2">
                            <label className="text-sm font-medium text-zinc-300">Días y Horas Disponibles para Entrenar</label>
                            <input type="text" name="disponibilidad" value={formData.disponibilidad || ''} onChange={handleInputChange}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-garmin-blue transition-colors"
                                placeholder="Ej. Lunes, Miércoles, Viernes (1.5h/día)"
                            />
                            <p className="text-xs text-zinc-500">Define aquí tus días libres específicos. La IA leerá esto y <b>no</b> programará entrenamientos en los días que no señales.</p>
                        </div>

                        <div className="flex flex-col gap-2 col-span-2">
                            <label className="text-sm font-medium text-amber-400">Fecha Límite / Evento Objetivo (Opcional)</label>
                            <input type="date" name="fechaEvento" value={formData.fechaEvento} onChange={handleInputChange}
                                className="w-full bg-zinc-800 border border-amber-500/30 rounded-lg p-3 text-white focus:outline-none focus:border-amber-400 transition-colors"
                                min={new Date().toISOString().split('T')[0]}
                            />
                            <p className="text-xs text-zinc-500">¿Tienes un evento a la vista o quieres planificar para unos meses específicos independientemente de tu enfoque? Pon la fecha y la IA la tomará en consideración.</p>
                        </div>
                    </div>
                </div>

                {/* EL MOTOR Y CARROCERÍA */}
                <div className="bg-zinc-900 border border-border rounded-xl p-6 space-y-5">
                    <h3 className="font-semibold text-xl text-amber-400 border-b border-border pb-2">El Motor y Carrocería</h3>

                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                        <p className="text-xs text-amber-200/80 mb-3 leading-relaxed">
                            ⚠️ <span className="font-bold">ATENCIÓN:</span> El FTP de tus salidas de Garmin no es de fiar universalmente (salvo que sea un Test FTP oficial). Digita aquí expresamente tu FTP más realista de los últimos 30 días para no contaminar tus gráficas de Entrenamiento por zonas.
                        </p>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-amber-400">FTP Guardado (Vatios)</label>
                            <input type="number" name="ftpActual" value={formData.ftpActual} onChange={handleInputChange}
                                className="w-full bg-zinc-800 border border-amber-500/30 rounded-lg p-3 text-white focus:outline-none focus:border-amber-400 transition-colors font-mono text-lg"
                                placeholder="Ej. 250"
                            />
                        </div>

                        {/* CALCULATED ZONES (LIVE PREVIEW) */}
                        {formData.ftpActual && Number(formData.ftpActual) > 0 && (
                            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 mt-4 animate-in fade-in">
                                <h4 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                                    ⚡️ Tus Zonas de Potencia Estimadas
                                </h4>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-[11px] font-mono">
                                    <div className="bg-stone-500/10 border border-stone-500/20 p-2 rounded"><span className="text-stone-400 font-bold block mb-0.5">Z1 (Recuperación)</span>&lt; {Math.round(Number(formData.ftpActual) * 0.55)}W</div>
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded"><span className="text-emerald-400 font-bold block mb-0.5">Z2 (Resistencia)</span>{Math.round(Number(formData.ftpActual) * 0.56)} - {Math.round(Number(formData.ftpActual) * 0.75)}W</div>
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded"><span className="text-blue-400 font-bold block mb-0.5">Z3 (Tempo)</span>{Math.round(Number(formData.ftpActual) * 0.76)} - {Math.round(Number(formData.ftpActual) * 0.90)}W</div>
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded"><span className="text-amber-400 font-bold block mb-0.5">Z4 (Umbral/FTP)</span>{Math.round(Number(formData.ftpActual) * 0.91)} - {Math.round(Number(formData.ftpActual) * 1.05)}W</div>
                                    <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded"><span className="text-rose-400 font-bold block mb-0.5">Z5 (VO2 Máx)</span>{Math.round(Number(formData.ftpActual) * 1.06)} - {Math.round(Number(formData.ftpActual) * 1.20)}W</div>
                                    <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded"><span className="text-purple-400 font-bold block mb-0.5">Z6 (Anaeróbica)</span>&gt; {Math.round(Number(formData.ftpActual) * 1.21)}W</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-zinc-300">Peso Actual (Kg)</label>
                        <p className="text-xs text-emerald-400/80 mb-1">Tu peso registrará un log histórico automático (Time Series) cada vez que lo actualices aquí.</p>
                        <input type="number" step="0.1" name="pesoActual" value={formData.pesoActual} onChange={handleInputChange}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-garmin-blue transition-colors font-mono text-lg"
                            placeholder="Ej. 72.5"
                        />
                    </div>
                </div>

                {/* BOTÓN MAGICO DE GUARDADO */}
                <div className="lg:col-span-2 flex flex-col items-center mt-4">
                    <button type="submit" disabled={isLoading}
                        className={`w-full lg:w-1/2 py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${isLoading
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                            : 'bg-garmin-blue text-white hover:bg-blue-600 hover:shadow-garmin-blue/20 hover:-translate-y-1'
                            }`}
                    >
                        {isLoading ? 'Guardando Biometría...' : 'Guardar Perfil y Actualizar Motor'}
                    </button>
                    {message && (
                        <div className={`mt-4 p-4 rounded-xl text-sm font-medium w-full lg:w-1/2 text-center border ${message.includes('❌') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}
