import { TrainingSessionTemplate } from './trainingModels';

// Basado en TRAINING_BLOCKS original
export const PREDEFINED_SESSIONS: TrainingSessionTemplate[] = [
    // --- ZONA 1 (Recuperación) ---
    {
        id: 'b-rec-activa',
        title: 'Recuperación Activa',
        description: 'Mantener un pedaleo fluido y suave.\n\n**Fase Única:**\n- 45 min constantes en Zona 1.\n\n*Nota: Busca vaciar las piernas.*',
        primaryZone: 'Z1',
        totalDurationMinutes: 45,
        estimatedTss: 25, // TODO: Ajustar fórmulas reales de TSS
        steps: [
            { id: '1', type: 'work', zone: 'Z1', durationMinutes: 45, description: 'Rodaje suave constante' }
        ]
    },
    {
        id: 'b-rec-rodillo',
        title: 'Spinning Rodillo (Z1)',
        description: 'Sesión cortísima indoor para mover sangre sin impacto.\n\n**Fase Única:**\n- 30 minutos a cadencia libre, sin resistencia.',
        primaryZone: 'Z1',
        totalDurationMinutes: 30,
        estimatedTss: 15,
        steps: [
            { id: '1', type: 'work', zone: 'Z1', durationMinutes: 30, description: 'Cadencia libre, mínima resistencia' }
        ]
    },

    // --- ZONA 2 (Resistencia Base) ---
    {
        id: 'b-base-std',
        title: 'Resistencia Base Clásica',
        description: 'Construyendo el motor aeróbico.\n\n**Calentamiento:**\n- 15 min Z1\n\n**Trabajo Principal:**\n- 1.5 horas en Z2 (Conversacional)\n\n**Enfriamiento:**\n- 15 min Z1',
        primaryZone: 'Z2',
        totalDurationMinutes: 120, // 2 hrs
        estimatedTss: 90,
        steps: [
            { id: '1', type: 'warmup', zone: 'Z1', durationMinutes: 15 },
            { id: '2', type: 'work', zone: 'Z2', durationMinutes: 90, description: 'Ritmo conversacional' },
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 15 }
        ]
    },
    {
        id: 'b-base-fondo',
        title: 'Tirada Larga Dominical',
        description: 'Día crucial para el fondo físico.\n\n**Fase Única:**\n- 3.5 horas continuas Z2. Mantener cadencia 85-95 rpm. No saltar a Z4 en las subidas.',
        primaryZone: 'Z2',
        totalDurationMinutes: 210, // 3.5 hrs
        estimatedTss: 160,
        steps: [
            { id: '1', type: 'work', zone: 'Z2', durationMinutes: 210, targetCadence: 90, description: 'Ritmo continuo largo, sin saltos a Z4' }
        ]
    },

    // --- ZONA 3 (Tempo / Sweet Spot) ---
    {
        id: 'b-tempo-std',
        title: 'Bloques de Tempo Crudo',
        description: 'Tolerancia al esfuerzo medio-alto.\n\n**Calentamiento:**\n- 15 min progresivo\n\n**Trabajo Principal (3 veces):**\n- 15 min Z3\n- 5 min Z1\n\n**Enfriamiento:**\n- 15 min Z1',
        primaryZone: 'Z3',
        totalDurationMinutes: 90, // 15 + (3x (15+5)) + 15 = 15 + 60 + 15 = 90 (1.5 hrs)
        estimatedTss: 85,
        steps: [
            { id: '1', type: 'warmup', zone: 'Z1', durationMinutes: 15, description: 'Progresivo' },
            {
                id: '2', type: 'repeat', zone: 'Z3', durationMinutes: 0, repeats: 3, steps: [
                    { id: 'r1', type: 'work', zone: 'Z3', durationMinutes: 15 },
                    { id: 'r2', type: 'recovery', zone: 'Z1', durationMinutes: 5 }
                ]
            },
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 15 }
        ]
    },
    {
        id: 'b-sst-base',
        title: 'Sweet Spot (3x15m)',
        description: 'El "Punto Dulce" para subir FTP rápido.\n\n**Calentamiento:** 15 min\n\n**Principal (3 veces):**\n- 15 min al 88-93% FTP\n- 5 min Z1 descanso\n\n**Enfriamiento:** 15 min',
        primaryZone: 'Z3+', // Usado como Z3 High en la UI actual
        totalDurationMinutes: 90,
        estimatedTss: 95,
        steps: [
            { id: '1', type: 'warmup', zone: 'Z1', durationMinutes: 15 },
            {
                id: '2', type: 'repeat', zone: 'Z3+', durationMinutes: 0, repeats: 3, steps: [
                    { id: 'r1', type: 'work', zone: 'Z3+', durationMinutes: 15, description: 'Sweet Spot (88-93% FTP)' },
                    { id: 'r2', type: 'recovery', zone: 'Z1', durationMinutes: 5 }
                ]
            },
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 15 }
        ]
    },

    // --- ZONA 4 (Umbral / FTP) ---
    {
        id: 'b-ftp-4x8',
        title: 'Intervalos FTP 4x8m',
        description: 'Sufriendo en la línea roja.\n\n**Calentamiento:** 15 min\n\n**Principal (4 veces):**\n- 8 min exactamente al 100% FTP\n- 4 min Z1 descanso total\n\n**Enfriamiento:** 10 min',
        primaryZone: 'Z4',
        totalDurationMinutes: 73, // Redondeado a ~1hr en UI, exacto: 15 + (4x(8+4)) + 10 = 15 + 48 + 10 = 73 min
        estimatedTss: 80,
        steps: [
            { id: '1', type: 'warmup', zone: 'Z1', durationMinutes: 15 },
            {
                id: '2', type: 'repeat', zone: 'Z4', durationMinutes: 0, repeats: 4, steps: [
                    { id: 'r1', type: 'work', zone: 'Z4', durationMinutes: 8, description: 'Línea Roja (100% FTP)' },
                    { id: 'r2', type: 'recovery', zone: 'Z1', durationMinutes: 4, description: 'Descanso Total' }
                ]
            },
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 10 }
        ]
    },
    {
        id: 'b-ftp-overunder',
        title: 'Over-Unders (4x10m)',
        description: 'Limpiar ácido láctico sin parar de pedalear fuerte.\n\n**Calentamiento:** 15 min\n\n**Principal (4 veces):**\n- 10 min que alternan: 2 min al 95% FTP (Under) / 1 min al 105% FTP (Over).\n- 4 min Z1 descanso\n\n**Enfriamiento:** 15 min',
        primaryZone: 'Z4',
        // TODO: Modelar los micro-intervalos internos. Por ahora se simplifica el bloque de 10 min.
        // Opcionalmente se podría agregar otro nivel de anidamiento en `steps`, pero lo dejamos como 'work' por ahora.
        totalDurationMinutes: 86, // 15 + (4x(10+4)) + 15 = 15 + 56 + 15 = 86 min (1.5 hrs en UI)
        estimatedTss: 90,
        steps: [
            { id: '1', type: 'warmup', zone: 'Z1', durationMinutes: 15 },
            {
                id: '2', type: 'repeat', zone: 'Z4', durationMinutes: 0, repeats: 4, steps: [
                    { id: 'r1', type: 'work', zone: 'Z4', durationMinutes: 10, description: 'Alternar 2m Under(Z4-), 1m Over(Z4+)' },
                    { id: 'r2', type: 'recovery', zone: 'Z1', durationMinutes: 4 }
                ]
            },
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 15 }
        ]
    },
    {
        id: 'b-ftp-crudo',
        title: 'Umbral Crudo 2x20m',
        description: 'Prueba psicológica de resistencia mental.\n\n**Principal:**\n- 20 min al 98% FTP\n- 10 min descanso Z1\n- 20 min al 98% FTP',
        primaryZone: 'Z4',
        // UI original decía "1.5 hrs", pero la descripción solo suma 20+10+20 = 50 min.
        // TODO: Agregar warmup/cooldown que justifique la hora y media real. Por ahora pongo 15/15.
        totalDurationMinutes: 80, // 15 + 20 + 10 + 20 + 15 = 80 min
        estimatedTss: 95,
        steps: [
            { id: '1', type: 'warmup', zone: 'Z1', durationMinutes: 15, description: 'TODO: Ajustar (no provisto en original)' },
            {
                id: '2', type: 'repeat', zone: 'Z4', durationMinutes: 0, repeats: 2, steps: [
                    { id: 'r1', type: 'work', zone: 'Z4', durationMinutes: 20, description: 'Umbral Constante (98% FTP)' },
                    { id: 'r2', type: 'recovery', zone: 'Z1', durationMinutes: 10 }
                ]
            }, // Nota: Si son 2 reps, habrá 10m de rec medio innecesarios al final, pero simplifica la creación de .fit iterativo.
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 15, description: 'TODO: Ajustar' }
        ]
    },

    // --- ZONA 5 (VO2 Máx) ---
    {
        id: 'b-vo2-micro',
        title: 'Microintervalos 40/20',
        description: 'Oxigenación extrema.\n\n**Principal (2 Series de 8 min):**\n- Alternar sin pausa: 40 seg al 120% FTP / 20 seg descanso Z1.\n- 5 min de Z1 entre ambas series completas.',
        primaryZone: 'Z5',
        // TODO: Simplificado. Representar 40s/20s en decimales no es "durationMinutes" entero limpio.
        // Por ahora lo metemos entero en el step 'work' temporalmente, la UI del Garmin file debe ajustarlo a ms.
        totalDurationMinutes: 60, // 1 hr
        estimatedTss: 80,
        steps: [
            { id: '1', type: 'warmup', zone: 'Z2', durationMinutes: 20 },
            {
                id: '2', type: 'repeat', zone: 'Z5', durationMinutes: 0, repeats: 2, steps: [
                    { id: 'r1', type: 'work', zone: 'Z5', durationMinutes: 8, description: 'Micro-intervalos: alternar 40s Z5+ / 20s Z1 ininterrumpidamente.' },
                    { id: 'r2', type: 'recovery', zone: 'Z1', durationMinutes: 5, description: 'Descanso entre series' }
                ]
            },
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 14 }
        ]
    },
    {
        id: 'b-vo2-largo',
        title: 'VO2 Max Clásico (4x3m)',
        description: 'Aumentando la cilindrada pura.\n\n**Principal (4 veces):**\n- 3 minutos duros a Z5 (115-120% FTP).\n- 3 minutos Z1 para limpiar.\n\n*Nota: El último minuto de cada serie debe sentirse casi imposible.*',
        primaryZone: 'Z5',
        // Total UI original 1 hr (60 min). 4x(3+3) = 24.  60-24 = 36 min a repartir en W/U y C/D. (18/18)
        totalDurationMinutes: 60,
        estimatedTss: 85,
        steps: [
            { id: '1', type: 'warmup', zone: 'Z2', durationMinutes: 18 },
            {
                id: '2', type: 'repeat', zone: 'Z5', durationMinutes: 0, repeats: 4, steps: [
                    { id: 'r1', type: 'work', zone: 'Z5', durationMinutes: 3, description: 'Duros (115-120% FTP)' },
                    { id: 'r2', type: 'recovery', zone: 'Z1', durationMinutes: 3, description: 'Giro ágil para limpiar' }
                ]
            },
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 18 }
        ]
    },
    {
        id: 'b-vo2-tabata',
        title: 'Tabatas Mortales',
        description: 'Corto pero brutalmente efectivo.\n\n**Principal:** 10 minutos seguidos de: 20 seg a tope (All Out) / 10 seg de descanso pasivo (no pedalear).',
        primaryZone: 'Z5',
        // Total 45 min. Prin 10 min. W/U 20, C/D 15.
        totalDurationMinutes: 45,
        estimatedTss: 80,
        steps: [
            { id: '1', type: 'warmup', zone: 'Z2', durationMinutes: 20 },
            { id: '2', type: 'work', zone: 'Z6', durationMinutes: 10, description: 'Tabatas: 20seg All-Out / 10seg descanso pasivo' },
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 15 }
        ]
    },

    // --- ZONA 6 (Anaeróbico y Fuerza) ---
    {
        id: 'b-sprint',
        title: 'Sprints Puros',
        description: 'Conexión neuromuscular total.\n\n**Principal (8 veces):**\n- 15 segundos All-Out al 200%+ FTP.\n- 5 MINUTOS COMPLETOS en Z1 de recuperación total.',
        primaryZone: 'Z6',
        totalDurationMinutes: 60, // 8 x (5 min + 15 segs) = ~42m. W/U y C/D = 18m.
        estimatedTss: 70, // Sprinting da alto impacto muscular pero bajo TSS aeróbico.
        steps: [
            { id: '1', type: 'warmup', zone: 'Z1', durationMinutes: 10 },
            {
                id: '2', type: 'repeat', zone: 'Z6', durationMinutes: 0, repeats: 8, steps: [
                    { id: 'r1', type: 'work', zone: 'Z6', durationMinutes: 0.25, description: 'Sprint All-Out 200%+' }, // TODO: durationMinutes decimal para 15 segs
                    { id: 'r2', type: 'recovery', zone: 'Z1', durationMinutes: 5, description: 'Recuperación total pasiva' }
                ]
            },
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 8 }
        ]
    },
    {
        id: 'b-fuerza',
        title: 'Arrancadas / Fuerza Max',
        description: 'Simula el gimnasio en la bici.\n\n**Principal (5 veces):**\n- Desde parado o muy lento, poner desarrollo duro y arrancar de pie por 20 seg a pura fuerza (cadencia muy baja 50rpm).\n- 5 min de rodaje suave Z1 entre repeticiones.',
        primaryZone: 'Z6',
        // 5 * 5.3 = ~26m. Restan ~34m para WU/CD.
        totalDurationMinutes: 60,
        estimatedTss: 75,
        steps: [
            { id: '1', type: 'warmup', zone: 'Z1', durationMinutes: 15 },
            {
                id: '2', type: 'repeat', zone: 'Z6', durationMinutes: 0, repeats: 5, steps: [
                    { id: 'r1', type: 'work', zone: 'Z5', durationMinutes: 0.33, targetCadence: 50, description: 'Tensión muscular: Salida atrancada de pie (20 segs)' }, // TODO: decimal validation for Fit SDK export later.
                    { id: 'r2', type: 'recovery', zone: 'Z1', durationMinutes: 5, description: 'Rodaje Suave' }
                ]
            },
            { id: '3', type: 'cooldown', zone: 'Z1', durationMinutes: 18 }
        ]
    }
];
