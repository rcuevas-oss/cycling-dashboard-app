import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { Info, X } from 'lucide-react';
import { TrainingBlock } from '../lib/fitUtils';

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

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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
            className={`cursor-grab active:cursor-grabbing p-3 rounded-lg border backdrop-blur-sm mb-3 shadow-lg transition-colors hover:bg-zinc-800 ${block.color}`}
        >
            <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm bg-black/40">{block.zone}</span>
                <span className="text-[10px] text-zinc-400 font-mono">{block.d}</span>
            </div>
            <p className="text-sm font-semibold truncate">{block.title}</p>
        </div>
    );
}

// Componente: Columna Destino (Días de la Semana)
function DroppableDay({ id, title, assignments, onBlockClick }: { id: string, title: string, assignments: TrainingBlock[], onBlockClick: (b: TrainingBlock) => void }) {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col min-h-[300px] p-3 rounded-xl border transition-colors relative group/day ${isOver ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-zinc-800/20 border-zinc-800'
                }`}
        >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{title}</h3>
            </div>

            <div className="flex-1 flex flex-col gap-2">
                {assignments.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 font-mono">
                        Descanso
                    </div>
                ) : (
                    assignments.map((b, idx) => (
                        <div
                            key={`${b.id}-${idx}`}
                            onClick={() => onBlockClick(b)}
                            className={`p-3 rounded-lg border ${b.color} relative group cursor-pointer hover:ring-2 hover:ring-white/20 transition-all`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm bg-black/40">{b.zone}</span>
                                <span className="text-[10px] opacity-70 font-mono">{b.d}</span>
                            </div>
                            <p className="text-sm font-semibold truncate leading-tight pr-5">{b.title}</p>
                            <Info className="w-4 h-4 absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export function TrainingPlanner({ schedule, setSchedule }: { schedule: Record<string, TrainingBlock[]>, setSchedule: React.Dispatch<React.SetStateAction<Record<string, TrainingBlock[]>>> }) {
    const [selectedBlock, setSelectedBlock] = useState<TrainingBlock | null>(null);

    // Manejar finalización de "soltar"
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.data.current) {
            const dropDayId = over.id as string;
            const blockData = active.data.current as TrainingBlock;

            setSchedule(prev => ({
                ...prev,
                [dropDayId]: [...prev[dropDayId], blockData]
            }));
        }
    };

    const clearSchedule = () => {
        setSchedule({
            'Lunes': [], 'Martes': [], 'Miércoles': [], 'Jueves': [], 'Viernes': [], 'Sábado': [], 'Domingo': []
        });
    }

    return (
        <div className="space-y-6 animate-fade-in text-zinc-100">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight mb-2">Planificador Pro</h2>
                    <p className="text-zinc-400">Construye tu meso-ciclo o pídele a la IA que llene el tablero.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Carga Est. (TSS)</p>
                        <p className="text-xl font-bold font-mono text-amber-400 text-right mt-1">
                            {Object.values(schedule).flat().length * 60} <span className="text-sm text-zinc-500">tss</span>
                        </p>
                    </div>
                    <button onClick={clearSchedule} className="px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20">
                        Limpiar
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
                        <div className="space-y-1">
                            {TRAINING_BLOCKS.map(block => (
                                <DraggableBlock key={block.id} id={block.id} block={block} />
                            ))}
                        </div>
                        <p className="mt-6 text-xs text-zinc-500 text-center leading-relaxed">
                            Mantén el click y arrastra un bloque hacia el tablero calendario para proponer el entreno.
                        </p>
                    </div>

                    {/* Calendario (4 columnas xl) */}
                    <div className="xl:col-span-4 overflow-x-auto">
                        <div className="min-w-[800px] grid grid-cols-7 gap-3">
                            {DAYS_OF_WEEK.map(day => (
                                <DroppableDay
                                    key={day}
                                    id={day}
                                    title={day}
                                    assignments={schedule[day]}
                                    onBlockClick={setSelectedBlock}
                                />
                            ))}
                        </div>
                    </div>

                </div>
            </DndContext>

            {/* Modal de Detalles del Bloque (Para transcribir a Garmin) */}
            {selectedBlock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">

                        <div className={`p-5 flex justify-between items-center ${selectedBlock.color?.split(' ')[0]} border-b border-zinc-700/50`}>
                            <div>
                                <h3 className="font-bold text-xl text-white">{selectedBlock.title}</h3>
                                <p className="text-xs opacity-80 font-mono mt-1 text-white/80">{selectedBlock.zone} • {selectedBlock.d}</p>
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
                                {selectedBlock.description || "Entrenamiento libre. Mantén el esfuerzo en la zona indicada."}
                            </div>
                        </div>

                        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end">
                            <button
                                onClick={() => setSelectedBlock(null)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20 font-semibold"
                            >
                                Entendido
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
