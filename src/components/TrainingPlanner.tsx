import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { Info, X, Save } from 'lucide-react';
import { TrainingBlock } from '../lib/fitUtils';
import { PREDEFINED_MICROCYCLES } from '../lib/trainingMicrocycles';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// Definición de Tipos de Entrenamiento
export const TRAINING_BLOCKS = [
    // --- ZONA 1 (Recuperación) ---
    {
        id: 'b-rec-activa', title: 'Recuperación Activa', zone: 'Z1', color: 'bg-stone-500/20 border-stone-500/50 text-stone-300', d: '45 min',
        description: 'Mantener un pedaleo fluido y suave.\n\n**Fase Única:**\n- 45 min constantes en Zona 1.\n\n*Nota: Busca vaciar las piernas.*'
    },
    {
        id: 'b-rec-rodillo', title: 'Spinning Rodillo (Z1)', zone: 'Z1', color: 'bg-stone-600/20 border-stone-600/50 text-stone-400', d: '30 min',
        description: 'Sesión cortísima indoor para mover sangre sin impacto.\n\n**Fase Única:**\n- 30 minutos a cadencia libre, sin resistencia.'
    },

    // --- ZONA 2 (Resistencia Base) ---
    {
        id: 'b-base-std', title: 'Resistencia Base Clásica', zone: 'Z2', color: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300', d: '2 hrs',
        description: 'Construyendo el motor aeróbico.\n\n**Calentamiento:**\n- 15 min Z1\n\n**Trabajo Principal:**\n- 1.5 horas en Z2 (Conversacional)\n\n**Enfriamiento:**\n- 15 min Z1'
    },
    {
        id: 'b-base-fondo', title: 'Tirada Larga Dominical', zone: 'Z2', color: 'bg-emerald-600/20 border-emerald-600/50 text-emerald-400', d: '3.5 hrs',
        description: 'Día crucial para el fondo físico.\n\n**Fase Única:**\n- 3.5 horas continuas Z2. Mantener cadencia 85-95 rpm. No saltar a Z4 en las subidas.'
    },

    // --- ZONA 3 (Tempo / Sweet Spot) ---
    {
        id: 'b-tempo-std', title: 'Bloques de Tempo Crudo', zone: 'Z3', color: 'bg-blue-500/20 border-blue-500/50 text-blue-300', d: '1.5 hrs',
        description: 'Tolerancia al esfuerzo medio-alto.\n\n**Calentamiento:**\n- 15 min progresivo\n\n**Trabajo Principal (3 veces):**\n- 15 min Z3\n- 5 min Z1\n\n**Enfriamiento:**\n- 15 min Z1'
    },
    {
        id: 'b-sst-base', title: 'Sweet Spot (3x15m)', zone: 'Z3+', color: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300', d: '1.5 hrs',
        description: 'El "Punto Dulce" para subir FTP rápido.\n\n**Calentamiento:** 15 min\n\n**Principal (3 veces):**\n- 15 min al 88-93% FTP\n- 5 min Z1 descanso\n\n**Enfriamiento:** 15 min'
    },

    // --- ZONA 4 (Umbral / FTP) ---
    {
        id: 'b-ftp-4x8', title: 'Intervalos FTP 4x8m', zone: 'Z4', color: 'bg-amber-500/20 border-amber-500/50 text-amber-300', d: '1 hr',
        description: 'Sufriendo en la línea roja.\n\n**Calentamiento:** 15 min\n\n**Principal (4 veces):**\n- 8 min exactamente al 100% FTP\n- 4 min Z1 descanso total\n\n**Enfriamiento:** 10 min'
    },
    {
        id: 'b-ftp-overunder', title: 'Over-Unders (4x10m)', zone: 'Z4', color: 'bg-orange-500/20 border-orange-500/50 text-orange-300', d: '1.5 hrs',
        description: 'Limpiar ácido láctico sin parar de pedalear fuerte.\n\n**Calentamiento:** 15 min\n\n**Principal (4 veces):**\n- 10 min que alternan: 2 min al 95% FTP (Under) / 1 min al 105% FTP (Over).\n- 4 min Z1 descanso\n\n**Enfriamiento:** 15 min'
    },
    {
        id: 'b-ftp-crudo', title: 'Umbral Crudo 2x20m', zone: 'Z4', color: 'bg-yellow-600/20 border-yellow-600/50 text-yellow-500', d: '1.5 hrs',
        description: 'Prueba psicológica de resistencia mental.\n\n**Principal:**\n- 20 min al 98% FTP\n- 10 min descanso Z1\n- 20 min al 98% FTP'
    },

    // --- ZONA 5 (VO2 Máx) ---
    {
        id: 'b-vo2-micro', title: 'Microintervalos 40/20', zone: 'Z5', color: 'bg-rose-500/20 border-rose-500/50 text-rose-300', d: '1 hr',
        description: 'Oxigenación extrema.\n\n**Principal (2 Series de 8 min):**\n- Alternar sin pausa: 40 seg al 120% FTP / 20 seg descanso Z1.\n- 5 min de Z1 entre ambas series completas.'
    },
    {
        id: 'b-vo2-largo', title: 'VO2 Max Clásico (4x3m)', zone: 'Z5', color: 'bg-pink-500/20 border-pink-500/50 text-pink-300', d: '1 hr',
        description: 'Aumentando la cilindrada pura.\n\n**Principal (4 veces):**\n- 3 minutos duros a Z5 (115-120% FTP).\n- 3 minutos Z1 para limpiar.\n\n*Nota: El último minuto de cada serie debe sentirse casi imposible.*'
    },
    {
        id: 'b-vo2-tabata', title: 'Tabatas Mortales', zone: 'Z5', color: 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300', d: '45 min',
        description: 'Corto pero brutalmente efectivo.\n\n**Principal:** 10 minutos seguidos de: 20 seg a tope (All Out) / 10 seg de descanso pasivo (no pedalear).'
    },

    // --- ZONA 6 (Anaeróbico y Fuerza) ---
    {
        id: 'b-sprint', title: 'Sprints Puros', zone: 'Z6', color: 'bg-purple-600/20 border-purple-600/50 text-purple-400', d: '1 hr',
        description: 'Conexión neuromuscular total.\n\n**Principal (8 veces):**\n- 15 segundos All-Out al 200%+ FTP.\n- 5 MINUTOS COMPLETOS en Z1 de recuperación total.'
    },
    {
        id: 'b-fuerza', title: 'Arrancadas / Fuerza Max', zone: 'Z6', color: 'bg-violet-700/20 border-violet-700/50 text-violet-300', d: '1 hr',
        description: 'Simula el gimnasio en la bici.\n\n**Principal (5 veces):**\n- Desde parado o muy lento, poner desarrollo duro y arrancar de pie por 20 seg a pura fuerza (cadencia muy baja 50rpm).\n- 5 min de rodaje suave Z1 entre repeticiones.'
    }
];

const DAYS_COLUMN_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Helper para calcular vatios exactos por Coggan
export function formatZoneWatts(ftp: number | null | undefined, zoneString: string) {
    if (!ftp || ftp <= 0) return "";
    const z = zoneString.toUpperCase();
    if (z.includes('Z1')) return `< ${Math.round(ftp * 0.55)}W`;
    if (z.includes('Z2')) return `${Math.round(ftp * 0.56)}-${Math.round(ftp * 0.75)}W`;
    if (z.includes('Z3+')) return `${Math.round(ftp * 0.88)}-${Math.round(ftp * 0.93)}W`;
    if (z.includes('Z3')) return `${Math.round(ftp * 0.76)}-${Math.round(ftp * 0.90)}W`;
    if (z.includes('Z4')) return `${Math.round(ftp * 0.91)}-${Math.round(ftp * 1.05)}W`;
    if (z.includes('Z5')) return `${Math.round(ftp * 1.06)}-${Math.round(ftp * 1.20)}W`;
    if (z.includes('Z6')) return `> ${Math.round(ftp * 1.21)}W`;
    return "";
}

// Componente: Tarjeta Arrastrable (Librería)
function DraggableBlock({ id, block }: { id: string, block: typeof TRAINING_BLOCKS[0] }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        data: block
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.8 : 1,
    } : undefined;

    return (
        <div
            ref={setNodeRef} style={style} {...listeners} {...attributes}
            className={`cursor-grab active:cursor-grabbing p-3 rounded-lg border backdrop-blur-sm mb-3 shadow-lg transition-colors hover:bg-zinc-800 flex flex-col gap-1.5 ${block.color}`}
        >
            <div className="flex justify-between items-start">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm bg-black/40">{block.zone}</span>
                <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-1">{block.d}</span>
            </div>
            <p className="text-sm font-semibold truncate mt-0.5">{block.title}</p>
        </div>
    );
}

// Componente: Columna Destino (Días del Mes)
function DroppableDay({ id, dateObj, currentMonth, assignments, onBlockClick, ftp }: { id: string, dateObj: Date, currentMonth: Date, assignments: TrainingBlock[], onBlockClick: (b: TrainingBlock, dateId: string) => void, ftp?: number }) {
    const { isOver, setNodeRef } = useDroppable({ id });
    const isCurrentMonth = isSameMonth(dateObj, currentMonth);
    const isCurrentDay = isToday(dateObj);
    const isPastDay = isBefore(startOfDay(dateObj), startOfDay(new Date()));

    return (
        <div
            ref={setNodeRef}
            className={`min-h-[140px] rounded-xl border flex flex-col overflow-hidden transition-all ${isOver ? 'bg-zinc-800/80 ring-2 ring-garmin-blue' : 'bg-black/20'} ${!isCurrentMonth ? 'opacity-40' : ''}`}
        >
            {/* Header del Día */}
            <div className={`py-1.5 px-3 border-b flex justify-between items-center ${isCurrentDay ? 'bg-garmin-blue/20 border-garmin-blue/30' : 'bg-zinc-900/50 border-zinc-800'}`}>
                <h4 className={`text-sm font-bold ${isCurrentDay ? 'text-garmin-blue' : isCurrentMonth ? 'text-zinc-200' : 'text-zinc-600'}`}>
                    {format(dateObj, 'd')}
                </h4>
            </div>

            {/* Contenido (Si no hay bloques, y estamos over, mostramos indicador visual) */}
            <div className={`flex-1 p-2 flex flex-col gap-2 ${assignments?.length === 0 && isOver ? 'bg-garmin-blue/5' : ''}`}>
                {assignments?.length > 0 && (
                    assignments.map((b, idx) => (
                        <div
                            key={`${b.id}-${idx}`}
                            onClick={() => onBlockClick(b, id)}
                            className={`p-3 rounded-lg border relative group cursor-pointer hover:ring-2 hover:ring-white/20 transition-all flex flex-col gap-1.5
                                ${b.status === 'completed_full' ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                                    b.status === 'completed_partial' ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' :
                                        b.status === 'missed' ? 'bg-rose-500/10 border-rose-500/30 opacity-60' :
                                            (isPastDay && (!b.status || b.status === 'planned')) ? 'opacity-50 grayscale border-zinc-700' :
                                                b.color
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm bg-black/40 ${b.status === 'completed_full' ? 'text-emerald-400' : b.status === 'completed_partial' ? 'text-amber-400' : ''}`}>{b.zone}</span>
                                <span className="text-[10px] opacity-70 font-mono shrink-0 ml-1">
                                    {b.status === 'completed_full' ? '✅' : b.status === 'completed_partial' ? '⚠️' : b.status === 'missed' ? '❌' : b.d}
                                </span>
                            </div>
                            {formatZoneWatts(ftp, b.zone) && (
                                <div className="text-[10px] font-mono opacity-80 leading-none truncate mt-1">
                                    ⚡ {formatZoneWatts(ftp, b.zone)}
                                </div>
                            )}
                            <p className={`text-sm font-semibold truncate leading-tight pr-5 mt-0.5 ${b.status === 'missed' ? 'line-through text-zinc-500' : ''}`}>{b.title}</p>
                            <Info className="w-4 h-4 absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export function TrainingPlanner({ schedule, setSchedule, session, profile }: { schedule: Record<string, TrainingBlock[]>, setSchedule: React.Dispatch<React.SetStateAction<Record<string, TrainingBlock[]>>>, session: Session, profile?: any }) {
    const [selectedBlock, setSelectedBlock] = useState<{ block: TrainingBlock, dateId: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedMicrocycle, setSelectedMicrocycle] = useState<string>('');

    // Extraer FTP para los cálculos de la librería y el calendario
    const ftp = profile?.ftp_actual ? Number(profile.ftp_actual) : undefined;

    // Generar Cuadrícula del Mes
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const handleToday = () => setCurrentMonth(new Date());

    const saveSchedule = async () => {
        if (!session) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('user_schedules')
                .upsert({ user_id: session.user.id, schedule_data: schedule });

            if (error) {
                console.error("Error al guardar el plan:", error);
                alert("Error al guardar el plan en la nube.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Manejar finalización de "soltar"
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.data.current) {
            const dropDayId = over.id as string;
            const blockData = active.data.current as TrainingBlock;

            setSchedule(prev => ({
                ...prev,
                [dropDayId]: [...(prev[dropDayId] || []), blockData]
            }));
        }
    };

    const clearSchedule = () => {
        if (window.confirm("¿Seguro que deseas vaciar completamente TU CALENDARIO? Esto borrará el histórico y el futuro planificado.")) {
            setSchedule({});
        }
    }

    const applyMicrocycle = () => {
        if (!selectedMicrocycle) return;
        const mc = PREDEFINED_MICROCYCLES.find(m => m.id === selectedMicrocycle);
        if (!mc) return;

        // Apply starting from the current beginning of the week of the displayed month
        // or starting from today if viewing current month. For simplicity let's use the start of the current week viewed. 
        // A better approach would be letting user select start date, but keeping it minimal: Use today as Day 1 if in current month, else 1st of month.
        const baseDate = isSameMonth(new Date(), currentMonth) ? new Date() : startOfMonth(currentMonth);
        const startDay = startOfWeek(baseDate, { weekStartsOn: 1 }); // Force Monday start

        const newSchedule = { ...schedule };

        for (let i = 1; i <= mc.durationDays; i++) {
            const blockId = mc.sessionsMap[i];
            if (blockId) {
                const targetDate = new Date(startDay);
                targetDate.setDate(targetDate.getDate() + (i - 1));
                const dateStr = format(targetDate, 'yyyy-MM-dd');

                const blockTemplate = TRAINING_BLOCKS.find(b => b.id === blockId);
                if (blockTemplate) {
                    // Clone block to avoid reference issues
                    newSchedule[dateStr] = [...(newSchedule[dateStr] || []), { ...blockTemplate }];
                }
            }
        }

        setSchedule(newSchedule);
        setSelectedMicrocycle('');
    };

    return (
        <div className="space-y-6 animate-fade-in text-zinc-100">

            {/* Cabecera Principal */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight mb-2">Planificador Base</h2>
                    <p className="text-zinc-400">Construye tus ciclos arrastrando bloques hacia el calendario real.</p>
                </div>

                {/* Controles de Mes */}
                <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <button onClick={handleToday} className="px-3 py-1.5 text-sm font-bold text-garmin-blue hover:text-garmin-blue/80 hover:bg-garmin-blue/10 rounded-lg transition-colors">
                        Hoy
                    </button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                    <div className="px-4 text-center min-w-[140px]">
                        <span className="text-base font-bold text-white capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
                    </div>
                </div>
            </div>

            {/* Barra de Herramientas (Microciclos + Acciones) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-black/20 p-3 rounded-2xl border border-white/5 flex-wrap">
                <div className="flex items-center gap-2">
                    <select
                        value={selectedMicrocycle}
                        onChange={(e) => setSelectedMicrocycle(e.target.value)}
                        className="bg-zinc-900/80 text-sm text-zinc-300 border border-zinc-700 rounded-lg px-3 py-2 focus:outline-none focus:border-garmin-blue hover:bg-zinc-800 transition-colors cursor-pointer appearance-none outline-none"
                    >
                        <option value="" className="bg-zinc-900 text-zinc-300">Cargar Microciclo...</option>
                        {PREDEFINED_MICROCYCLES.map(mc => (
                            <option key={mc.id} value={mc.id} className="bg-zinc-900 text-zinc-300">
                                {mc.title} ({mc.durationDays}d)
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={applyMicrocycle}
                        disabled={!selectedMicrocycle}
                        className="text-xs px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold rounded-lg disabled:opacity-50 transition-all hover:bg-zinc-700 hover:text-white"
                    >
                        Aplicar
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center gap-3">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Carga (TSS)</p>
                        <p className="text-sm font-bold font-mono text-amber-400">
                            {Object.values(schedule).flat().length * 60}
                        </p>
                    </div>

                    <button onClick={clearSchedule} className="text-sm font-medium text-zinc-400 hover:text-rose-400 transition-colors px-2">
                        Limpiar Plan
                    </button>

                    <button
                        onClick={saveSchedule}
                        disabled={isSaving}
                        className={`text-sm font-semibold transition-colors flex items-center gap-2 px-5 py-2 rounded-xl border ${isSaving
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                            : 'bg-garmin-blue/10 border-garmin-blue/30 text-garmin-blue hover:bg-garmin-blue hover:text-black hover:border-garmin-blue'
                            }`}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            <DndContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                    {/* Librería de Bloques (1 columna xl) */}
                    <div className="xl:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-inner">
                        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-5 flex items-center gap-2">
                            Librería de Sesiones
                        </h3>
                        <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[500px]">
                            {TRAINING_BLOCKS.map(block => (
                                <DraggableBlock key={block.id} id={block.id} block={block} />
                            ))}
                        </div>
                        <p className="mt-6 text-xs text-zinc-500 text-center leading-relaxed">
                            Mantén el click y arrastra un bloque hacia el tablero calendario para proponer el entreno.
                        </p>
                    </div>

                    {/* Calendario Mensual (4 columnas xl) */}
                    <div className="xl:col-span-4 bg-[#141416] border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden shadow-inner">
                        <div className="flex-1 overflow-x-auto p-5 custom-scrollbar">
                            <div className="min-w-[800px]">
                                <div className="grid grid-cols-7 gap-1.5 mb-2">
                                    {DAYS_COLUMN_HEADERS.map(day => (
                                        <div key={day} className="text-center py-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1.5 min-w-0">
                                    {calendarDays.map((dateObj) => {
                                        const dateStr = format(dateObj, 'yyyy-MM-dd');
                                        return (
                                            <DroppableDay
                                                key={dateStr}
                                                id={dateStr}
                                                dateObj={dateObj}
                                                currentMonth={currentMonth}
                                                assignments={schedule[dateStr] || []}
                                                onBlockClick={(b, dateId) => setSelectedBlock({ block: b, dateId })}
                                                ftp={ftp}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </DndContext>

            {/* Modal de Detalles del Bloque (Para transcribir a Garmin) */}
            {selectedBlock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">

                        <div className={`p-5 flex justify-between items-center ${selectedBlock.block.color?.split(' ')[0]} border-b border-zinc-700/50`}>
                            <div>
                                <h3 className="font-bold text-xl text-white">{selectedBlock.block.title}</h3>
                                <p className="text-xs opacity-80 font-mono mt-1 text-white/80">{selectedBlock.block.zone} • {selectedBlock.block.d}</p>
                            </div>
                            <button onClick={() => setSelectedBlock(null)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <p className="text-sm text-zinc-400 mb-4 font-medium flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Recrea esta estructura paso a paso en Garmin Connect (Móvil o PC):
                            </p>
                            <div className="bg-zinc-950 rounded-xl p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap border border-zinc-800 text-zinc-300 shadow-inner">
                                {selectedBlock.block.description || "Entrenamiento libre. Mantén el esfuerzo en la zona indicada."}
                            </div>

                            {/* Actions to update block status */}
                            <div className="mt-6 border-t border-zinc-800/50 pt-5">
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Estado del Entrenamiento</p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => {
                                            const updatedSchedule = { ...schedule };
                                            const index = updatedSchedule[selectedBlock.dateId].findIndex(b => b.id === selectedBlock.block.id);
                                            if (index !== -1) {
                                                updatedSchedule[selectedBlock.dateId][index] = { ...selectedBlock.block, status: 'completed_full' };
                                                setSchedule(updatedSchedule);
                                                setSelectedBlock(null);
                                            }
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 ${selectedBlock.block.status === 'completed_full' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/20 border-zinc-800 hover:bg-emerald-500/10 hover:border-emerald-500/50 text-zinc-400'}`}
                                    >
                                        <span className="text-xl">✅</span>
                                        <div>
                                            <p className="font-semibold text-sm">Completado al 100%</p>
                                            <p className="text-xs opacity-75">El entrenamiento se realizó según lo indicado.</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const updatedSchedule = { ...schedule };
                                            const index = updatedSchedule[selectedBlock.dateId].findIndex(b => b.id === selectedBlock.block.id);
                                            if (index !== -1) {
                                                updatedSchedule[selectedBlock.dateId][index] = { ...selectedBlock.block, status: 'completed_partial' };
                                                setSchedule(updatedSchedule);
                                                setSelectedBlock(null);
                                            }
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 ${selectedBlock.block.status === 'completed_partial' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-black/20 border-zinc-800 hover:bg-amber-500/10 hover:border-amber-500/50 text-zinc-400'}`}
                                    >
                                        <span className="text-xl">⚠️</span>
                                        <div>
                                            <p className="font-semibold text-sm">Completado Parcialmente</p>
                                            <p className="text-xs opacity-75">Se cortó antes o no se cumplieron las zonas.</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const updatedSchedule = { ...schedule };
                                            const index = updatedSchedule[selectedBlock.dateId].findIndex(b => b.id === selectedBlock.block.id);
                                            if (index !== -1) {
                                                updatedSchedule[selectedBlock.dateId][index] = { ...selectedBlock.block, status: 'missed' };
                                                setSchedule(updatedSchedule);
                                                setSelectedBlock(null);
                                            }
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 ${selectedBlock.block.status === 'missed' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-black/20 border-zinc-800 hover:bg-rose-500/10 hover:border-rose-500/50 text-zinc-400'}`}
                                    >
                                        <span className="text-xl">❌</span>
                                        <div>
                                            <p className="font-semibold text-sm">No Realizado</p>
                                            <p className="text-xs opacity-75">Se faltó a la sesión por descanso o impedimento.</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    const updatedSchedule = { ...schedule };
                                    updatedSchedule[selectedBlock.dateId] = updatedSchedule[selectedBlock.dateId].filter(b => b.id !== selectedBlock.block.id);
                                    setSchedule(updatedSchedule);
                                    setSelectedBlock(null);
                                }}
                                className="px-5 py-2.5 bg-black hover:bg-rose-900/40 text-rose-500 border border-rose-900/50 rounded-xl transition-colors font-semibold"
                            >
                                Eliminar del Calendario
                            </button>
                            <button
                                onClick={() => setSelectedBlock(null)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20 font-semibold"
                            >
                                Cerrar
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

