export type TrainingZone = 'Z1' | 'Z2' | 'Z3' | 'Z3+' | 'Z4' | 'Z5' | 'Z6';

export type StepType = 'warmup' | 'work' | 'recovery' | 'cooldown' | 'repeat';

// Un paso individual dentro de una sesión (ej: 5 min en Z4)
export interface TrainingStep {
    id: string;
    type: StepType;
    zone: TrainingZone;
    durationMinutes: number;
    targetCadence?: number; // Opcional, rpm
    description?: string;

    // Si type es 'repeat', steps contiene los pasos a repetir
    repeats?: number;
    steps?: TrainingStep[];
}

// Una plantilla genérica de sesión (ej: "Intervalos VO2Max Clásicos")
export interface TrainingSessionTemplate {
    id: string;
    title: string;
    description: string;
    primaryZone: TrainingZone;
    totalDurationMinutes: number;
    estimatedTss: number;
    steps: TrainingStep[];
}

// Un bloque de varios días relativos (ej: "Semana de Carga 1", 7 días)
export interface TrainingMicrocycle {
    id: string;
    title: string;
    description: string;
    durationDays: number; // Típicamente 7 (una semana)

    // key es el día relativo (1 a durationDays)
    // El value es el ID del TrainingSessionTemplate, o null si es descanso
    sessionsMap: Record<number, string | null>;
}

// Un bloque mayor compuesto por microciclos (ej: "Base 1", 4 semanas)
export interface TrainingPhase {
    id: string;
    title: string;
    description: string;

    // IDs de los Microciclos en orden secuencial
    microcycleIds: string[];
}

// Una instancia real asignada a un usuario en una fecha específica
export interface TrainingSessionInstance {
    id: string; // ID único de la ejecución
    userId: string;
    date: string; // formato YYYY-MM-DD
    templateId: string; // Referencia al TrainingSessionTemplate original
    status: 'planned' | 'completed_full' | 'completed_partial' | 'missed';
    completionNotes?: string;

    // Si la IA ajustó algo de la plantilla base para este día específico
    overrideDurationMinutes?: number;
    overrideZone?: TrainingZone;
}

// ==========================================
// EJEMPLO MÍNIMO DE USO (Eliminado temporalmente para evitar quejas de TSC por variables sin uso exportado)
// ==========================================


