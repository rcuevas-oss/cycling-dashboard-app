import { Encoder, Profile } from "@garmin/fitsdk";

// Mapeo básico de zonas a valores porcentuales o absolutos de potencia.
// En un caso real avanzado, el "customTargetValue(Low/High)" se llenaría basándose en el Perfil de Atleta (FTP real).
// Para este MVP vamos a enviar zonas predefinidas estáticas.

export type TrainingBlock = {
    id: string;
    title: string;
    zone: string;
    d: string;
    color?: string;
    description?: string; // Texto estructurado paso a paso para el usuario
};

function parseDurationToMs(d: string): number {
    // Parser simple de ejemplo: "45 min", "2-3 hrs", "1.5 hrs"
    if (d.includes('min')) {
        const mins = parseInt(d);
        return mins * 60 * 1000;
    }
    if (d.includes('hr')) {
        const match = d.match(/([\d.]+)/);
        if (match) {
            return parseFloat(match[1]) * 60 * 60 * 1000;
        }
    }
    return 60 * 60 * 1000; // default 1h
}

export function generateFitWorkout(workoutName: string, blocks: TrainingBlock[]) {
    const encoder = new Encoder();

    // 1. Cabecera del archivo
    encoder.writeMesg({
        mesgNum: Profile.MesgNum.FILE_ID,
        type: Profile.types.file.workout,
        manufacturer: Profile.types.manufacturer.development,
        product: 1,
        timeCreated: new Date(),
        serialNumber: Math.floor(Math.random() * 100000)
    });

    // 2. Definición del Workout General
    encoder.writeMesg({
        mesgNum: Profile.MesgNum.WORKOUT,
        wktName: workoutName.substring(0, 15), // Limite Garmin 15 chars
        sport: Profile.types.sport.cycling,
        numValidSteps: blocks.length
    });

    // 3. Pasos de Entrenamiento (Workout Steps)
    blocks.forEach((block, index) => {
        let lowPower = 100;
        let highPower = 150;
        let intensity = Profile.types.intensity.active;
        if (block.zone === 'Z1') {
            lowPower = 50;
            highPower = 130;
            intensity = Profile.types.intensity.recovery;
        }
        else if (block.zone === 'Z2') { lowPower = 130; highPower = 180; }
        else if (block.zone === 'Z3') { lowPower = 180; highPower = 220; }
        else if (block.zone === 'Z4') { lowPower = 220; highPower = 260; }
        else if (block.zone === 'Z5') { lowPower = 260; highPower = 400; }

        encoder.writeMesg({
            mesgNum: Profile.MesgNum.WORKOUT_STEP,
            messageIndex: index,
            wktStepName: block.title.substring(0, 15), // <--- CAMBIO CRÍTICO: el SDK Javascript exige wktStepName
            durationValue: parseDurationToMs(block.d),
            durationType: Profile.types.wktStepDuration.time,
            targetType: Profile.types.wktStepTarget.power,
            targetValue: 0, // Garmin expects 0 for custom range
            customTargetValueLow: lowPower + 1000,   // OFFSET requerido por Garmin (+1000)
            customTargetValueHigh: highPower + 1000, // OFFSET requerido por Garmin (+1000)
            intensity: intensity
        });
    });

    const fileBytes = encoder.close();

    // Blob trigger download
    const blob = new Blob([fileBytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${workoutName.replace(/\s+/g, '_')}.fit`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
