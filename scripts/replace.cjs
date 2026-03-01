const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
const startMatch = "const act = {";
const endMatch = "if (act.distancia_km !== undefined) {";
const startIndex = content.indexOf(startMatch);
const endIndex = content.indexOf(endMatch, startIndex);
if (startIndex !== -1 && endIndex !== -1) {
    const pre = content.substring(0, startIndex);
    const post = content.substring(endIndex + endMatch.length);
    const middle = `// Calcular duration_minutes (int4) desde la string "1:45:20"
                        let duration_minutes = null;
                        if (dataTokens[6]) {
                            const timeParts = dataTokens[6].split(':').map(Number);
                            if (timeParts.length === 3) {
                                duration_minutes = Math.round(timeParts[0] * 60 + timeParts[1] + timeParts[2] / 60);
                            } else if (timeParts.length === 2) {
                                duration_minutes = Math.round(timeParts[0] + timeParts[1] / 60);
                            }
                        }

                        const act = {
                            // Columnas de BD en inglés
                            activity_date: fecha,
                            distance_km: tNum(dataTokens[4]),
                            duration_minutes: duration_minutes,
                            avg_power: tNum(dataTokens[16], true),
                            normalized_power: tNum(dataTokens[19], true),
                            avg_hr: tNum(dataTokens[7], true),
                            tss: tNum(dataTokens[18]),
                            
                            // Agregados con el último script SQL a prueba de balas en Español
                            calorias: tNum(dataTokens[5], true),
                            tiempo: dataTokens[6] || null, // Se mantiene el crudo por si existe la col "tiempo"
                            
                            fc_media: tNum(dataTokens[7], true),
                            fc_maxima: tNum(dataTokens[8], true),
                            te_aerobico: tNum(dataTokens[9]),
                            
                            velocidad_media: tNum(dataTokens[10]),
                            velocidad_maxima: tNum(dataTokens[11]),
                            
                            ascenso_total: tNum(dataTokens[12], true),
                            descenso_total: tNum(dataTokens[13], true),
                            
                            cadencia_media: tNum(dataTokens[14], true),
                            cadencia_maxima: tNum(dataTokens[15], true),
                            potencia_20min: tNum(dataTokens[46], true),
                            potencia_media: tNum(dataTokens[16], true),
                            potencia_maxima: tNum(dataTokens[17], true),
                            
                            numero_vueltas: tNum(dataTokens[50], true), 
                            
                            resp_media: tNum(dataTokens[53], true),
                            resp_min: tNum(dataTokens[54], true),
                            resp_max: tNum(dataTokens[55], true),
                            
                            temperatura_min: tNum(dataTokens[56]),
                            temperatura_max: tNum(dataTokens[57]),
                            
                            descompresion: dataTokens[58] || null,
                        };

                        // Purgar valores 'null' del objeto
                        Object.keys(act).forEach(key => {
                             if ((act as any)[key] === null) {
                                 delete (act as any)[key];
                             }
                        });


                        // Solo insertar líneas que contengan alguna forma métrica (distancia)
                        if (act.distance_km !== undefined) {`;
    fs.writeFileSync('src/components/Dashboard.tsx', pre + middle + post);
    console.log("Success");
} else {
    console.log("Could not find boundaries");
}
