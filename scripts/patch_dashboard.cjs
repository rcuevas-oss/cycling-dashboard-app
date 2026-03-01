const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const startMatch = "const act = {";
const endMatch = "if (act.distance_km !== undefined) {";
const startIndex = content.indexOf(startMatch);
const endIndex = content.indexOf(endMatch, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const pre = content.substring(0, startIndex);
    const post = content.substring(endIndex + endMatch.length);
    const middle = `const act = {
                            // --- FAMILIA METADATOS BÁSICOS ---
                            tipo_actividad: dataTokens[0] || 'Desconocido',
                            fecha_actividad: fecha, // BD Original: activity_date o fecha
                            favorito: dataTokens[2] === 'true',
                            titulo: dataTokens[3] || 'Entrenamiento',
                            distancia_km: tNum(dataTokens[4]),
                            calorias: tNum(dataTokens[5], true),
                            
                            // -- Mapeo del Tiempo real --
                            tiempo_crudo: dataTokens[6] || null, // Texto (ej 1:45:20)
                            tiempo_minutos: duration_minutes, // Entero calculado
                            
                            // --- FAMILIA FRECUENCIA CARDÍACA ---
                            fc_media: tNum(dataTokens[7], true),
                            fc_maxima: tNum(dataTokens[8], true),
                            te_aerobico: tNum(dataTokens[9]),
                            
                            // --- FAMILIA VELOCIDAD ---
                            velocidad_media: tNum(dataTokens[10]),
                            velocidad_maxima: tNum(dataTokens[11]),
                            
                            // --- FAMILIA ASCENSO/DESCENSO ---
                            ascenso_total: tNum(dataTokens[12], true),
                            descenso_total: tNum(dataTokens[13], true),
                            
                            // --- FAMILIA CADENCIA ---
                            cadencia_media: tNum(dataTokens[14], true),
                            cadencia_maxima: tNum(dataTokens[15], true),
                            
                            // --- FAMILIA POTENCIA (Vatios & Esfuerzo) ---
                            potencia_normalizada: tNum(dataTokens[16], true), // Normalized Power
                            tss: tNum(dataTokens[17]), // Training Stress Score real
                            potencia_20min: tNum(dataTokens[18], true),
                            potencia_media: tNum(dataTokens[19], true),
                            potencia_maxima: tNum(dataTokens[20], true),
                            
                            // --- FAMILIA OTROS Y CLIMA ---
                            pedaladas_totales: tNum(dataTokens[21], true),
                            temperatura_minima: tNum(dataTokens[22]),
                            temperatura_maxima: tNum(dataTokens[26]),
                            
                            // --- FAMILIA RESPIRACIÓN ---
                            resp_media: tNum(dataTokens[27], true),
                            resp_minima: tNum(dataTokens[28], true),
                            resp_maxima: tNum(dataTokens[29], true),
                            
                            // --- DEMÁS CAMPOS ---
                            numero_vueltas: tNum(dataTokens[25], true),
                            descompresion: dataTokens[23] || null,
                        };

                        // Purgar valores 'null' del objeto para enviar solo lo existente y útil
                        Object.keys(act).forEach(key => {
                             if ((act as any)[key] === null) {
                                 delete (act as any)[key];
                             }
                        });


                        // Insistir que solo pasa si calculó la distancia
                        if (act.distancia_km !== undefined) {`;

    fs.writeFileSync('src/components/Dashboard.tsx', pre + middle + post);
    console.log("Success Dashboard Update");
} else {
    console.log("Could not find boundaries");
}
