import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export function AthleteProfile({ session }: { session: Session }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // State
    const [nombre, setNombre] = useState('');
    const [sexo, setSexo] = useState('Masculino');
    const [disciplina, setDisciplina] = useState('Ruta');
    const [ftpActual, setFtpActual] = useState<number | ''>('');
    const [pesoActual, setPesoActual] = useState<number | ''>('');

    // Historial para comparar si cambió el peso
    const [originalPeso, setOriginalPeso] = useState<number | ''>('');

    useEffect(() => {
        fetchProfile();
    }, [session.user.id]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('athlete_profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            // PGRST116 indicates no rows returned from single() - very normal for new users
            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching profile", error);
            }

            if (data) {
                setNombre(data.nombre || '');
                setSexo(data.sexo || 'Masculino');
                setDisciplina(data.disciplina || 'Ruta');
                setFtpActual(data.ftp_actual || '');
                setPesoActual(data.peso_actual_kg || '');
                setOriginalPeso(data.peso_actual_kg || '');
            }
        } catch (error) {
            console.error("Error catched", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setSaving(true);

        try {
            // 1. Guardar/Actualizar Perfil (Upsert usando el ID de la cuenta)
            const profileData = {
                id: session.user.id,
                nombre,
                sexo,
                disciplina,
                ftp_actual: ftpActual === '' ? null : Number(ftpActual),
                peso_actual_kg: pesoActual === '' ? null : Number(pesoActual),
                updated_at: new Date().toISOString(),
            };

            const { error: profileError } = await supabase
                .from('athlete_profiles')
                .upsert(profileData);

            if (profileError) throw profileError;

            // 2. Si el peso cambió, inyectar automáticamente al historial biométrico (Data AI)
            if (pesoActual !== '' && pesoActual !== originalPeso) {
                const { error: weightError } = await supabase
                    .from('weight_history')
                    .insert({
                        user_id: session.user.id,
                        peso_kg: Number(pesoActual)
                    });

                if (weightError) throw weightError;
                setOriginalPeso(pesoActual); // Reset param comparison para que no lo mande doble si vuelve a clickear
            }

            setMessage('✅ Perfil y métricas biométricas enlazadas a tu base de datos exitosamente.');
        } catch (error: any) {
            setMessage(`❌ Error al guardar datos: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
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
                        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-garmin-blue transition-colors"
                            placeholder="Ej. Tadej Pogačar"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-300">Sexo Biológico</label>
                            <select value={sexo} onChange={e => setSexo(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-garmin-blue transition-colors"
                            >
                                <option value="Masculino">Masculino</option>
                                <option value="Femenino">Femenino</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-300">Disciplina Principal</label>
                            <select value={disciplina} onChange={e => setDisciplina(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-garmin-blue transition-colors"
                            >
                                <option value="Ruta">Ruta</option>
                                <option value="MTB">MTB</option>
                                <option value="Gravel">Gravel</option>
                                <option value="Pista">Pista</option>
                            </select>
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
                            <input type="number" value={ftpActual} onChange={e => setFtpActual(e.target.value ? Number(e.target.value) : '')}
                                className="w-full bg-zinc-800 border border-amber-500/30 rounded-lg p-3 text-white focus:outline-none focus:border-amber-400 transition-colors font-mono text-lg"
                                placeholder="Ej. 250"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-zinc-300">Peso Actual (Kg)</label>
                        <p className="text-xs text-emerald-400/80 mb-1">Tu peso registrará un log histórico automático (Time Series) cada vez que lo actualices aquí.</p>
                        <input type="number" step="0.1" value={pesoActual} onChange={e => setPesoActual(e.target.value ? Number(e.target.value) : '')}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-garmin-blue transition-colors font-mono text-lg"
                            placeholder="Ej. 72.5"
                        />
                    </div>
                </div>

                {/* BOTÓN MAGICO DE GUARDADO */}
                <div className="lg:col-span-2 flex flex-col items-center mt-4">
                    <button type="submit" disabled={saving}
                        className={`w-full lg:w-1/2 py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${saving
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                            : 'bg-garmin-blue text-white hover:bg-blue-600 hover:shadow-garmin-blue/20 hover:-translate-y-1'
                            }`}
                    >
                        {saving ? 'Guardando Biometría...' : 'Guardar Perfil y Actualizar Motor'}
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
