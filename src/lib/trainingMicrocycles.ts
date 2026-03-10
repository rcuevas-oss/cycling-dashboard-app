import { TrainingMicrocycle } from './trainingModels';

// Listado predefinido de microciclos de prueba.
// Estos utilizan EXCLUSIVAMENTE los IDs de sesión definidos en PREDEFINED_SESSIONS.
export const PREDEFINED_MICROCYCLES: TrainingMicrocycle[] = [
    {
        id: 'mc-reacondicionamiento-01',
        title: 'Reacondicionamiento Básico',
        description: 'Vuelta a los pedales tras descanso o lesión. Movilización suave.',
        durationDays: 7, // Semana típica
        sessionsMap: {
            1: null, // Lunes: Descanso total
            2: 'b-rec-rodillo', // Martes: 30 min indoor Z1
            3: null, // Miércoles: Descanso total
            4: 'b-rec-activa', // Jueves: 45 min suaves
            5: null, // Viernes: Descanso total
            6: 'b-base-std', // Sábado: 1.5h Z2 como primer contacto de resistencia
            7: 'b-rec-activa' // Domingo: Recuperación post-resistencia
        }
    },
    {
        id: 'mc-base-01',
        title: 'Semana de Base Aeróbica',
        description: 'Construyendo el motor priorizando el volumen sobre intensidad.',
        durationDays: 7,
        sessionsMap: {
            1: null, // Lunes: Descanso tras el finde intensivo previo
            2: 'b-base-std', // Martes: 1.5h Z2
            3: 'b-tempo-std', // Miércoles: Trabajo Medio-Alto tolerado (Tempo)
            4: 'b-rec-rodillo',  // Jueves: Movilización corta
            5: 'b-base-std',  // Viernes: 1.5h Z2
            6: 'b-base-fondo',// Sábado: La tirada larga (3.5h Z2)
            7: 'b-rec-activa' // Domingo: 45 min suaves
        }
    },
    {
        id: 'mc-descarga-01',
        title: 'Semana de Descarga / Tapering',
        description: 'Mantenimiento de agilidad mientras sacamos fatiga del cuerpo.',
        durationDays: 7,
        sessionsMap: {
            1: null, // Lunes: Descanso Total
            2: 'b-rec-activa', // Martes: 45m Z1
            3: 'b-tempo-std', // Miércoles: Toque de intensidad media para no dormirse (1.5h Tempo)
            4: null, // Jueves: Descanso Total
            5: 'b-rec-rodillo', // Viernes: Movilización rápida (30m Z1)
            6: 'b-base-std', // Sábado: Resistencia corta y suave (1.5h Z2)
            7: null // Domingo: Descanso pre-evento o pre-ciclo nuevo
        }
    }
];
