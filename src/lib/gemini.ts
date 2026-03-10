import { GoogleGenAI } from "@google/genai";
import { TRAINING_BLOCKS } from "../components/TrainingPlanner";

import { TrainingBlock } from "./fitUtils";

export async function generateWeeklyPlan(
    apiKey: string,
    userPrompt: string,
    athleteContext: any,
    recentActivities: any[],
    plannedSchedule?: Record<string, TrainingBlock[]> | null
): Promise<{ textResponse: string, schedule: Record<string, TrainingBlock[]> | null, suggestedOptions: string[], isGreeting: boolean }> {

    const ai = new GoogleGenAI({ apiKey });

    // Construimos la librería de bloques individuales disponibles para que Gemini los asigne a días específicos
    const blocksAvailable = TRAINING_BLOCKS.map(b => ({
        id: b.id,
        title: b.title,
        zone: b.zone,
        duration: b.d
    }));

    // Generar mapeo de fechas a días de la semana para que la IA no adivine
    const diasSemanaMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hoy = new Date();
    let calendarioRef = "MAPEO DE FECHAS A DÍAS DE LA SEMANA (USAR COMO GUÍA ESTRICTA PARA LA DISPONIBILIDAD):\n";
    for (let i = 0; i <= 35; i++) {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() + i);
        const iso = d.toISOString().split('T')[0];
        const diaNombre = diasSemanaMap[d.getDay()];
        calendarioRef += `- ${iso} es ${diaNombre}\n`;
    }

    const systemInstruction = `Eres una IA de entrenamiento ciclista de alto rendimiento. Tu objetivo es ser técnico pero EXTREMADAMENTE ACCESIBLE y PERSONALIZADO. Explica conceptos fisiológicos (TSS, CTL, ATL, W/kg) de una forma sencilla que cualquier ciclista aficionado entienda al instante. 
IMPORTANTÍSIMO: Usa SIEMPRE formato Markdown (títulos con ###, viñetas, **negritas** para resaltar métricas en el texto) y acompáñalo de Emojis adecuados (🔥, 📊, ⚡️, ⚖️) para que tus mensajes sean visualmente atractivos y NO se vean como paredes de texto robótico. Nada de "[]" corchetes rígidos.

CONEXIÓN PERSONAL (OBLIGATORIA): Tienes acceso al nombre del ciclista y a su disciplina. IMPORTANTE: EVITA iniciar cada mensaje con un saludo cliché (ej. "Hola [Nombre]", "¡Hola! Soy tu IA"). Compórtate como un entrenador en medio de una conversación continua: entra directo al grano de forma natural, técnica y empática. Usa su nombre esporádicamente para enfatizar un consejo, pero NUNCA saludes en cada interacción. Hazlo sentir que ya están trabajando juntos en el velódromo.

FECHA ACTUAL DEL SISTEMA (DÍA 1 DEL PLAN): ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (ISO: ${new Date().toISOString().split('T')[0]})

${calendarioRef}

PERFIL DEL ATLETA:
${JSON.stringify(athleteContext, null, 2)}

RESUMEN DE ACTIVIDADES RECIENTES (Últimos entrenos pasados):
${JSON.stringify(recentActivities, null, 2)}

ENTRENAMIENTOS YA PLANIFICADOS Y SU CUMPLIMIENTO (HISTÓRICO Y FUTURO):
${plannedSchedule ? JSON.stringify(plannedSchedule, null, 2) : "Ninguno."}
La IA DEBE revisar este calendario. Cada bloque puede tener un 'status' (planned, completed_full, completed_partial, missed). 
REGLA DE CONCILIACIÓN: Si notas que el usuario tiene bloques marcados como 'missed' o 'completed_partial' recientemente, su recuperación puede ser mayor a la planeada, o puede estar fallando en la disciplina. Afróntalo en tu análisis si te pide feedback. Si un bloque no tiene estado o dice 'planned' y ya pasó la fecha, asume que 'missed'.
REGLA DE FUTURO: NO sobrescribas los días futuros ya planificados a menos que el usuario lo pida explícitamente. Complementa los días vacíos o ajusta la carga tomando este calendario futuro en cuenta.

SOLICITUD DEL ATLETA:
"${userPrompt}"

ESTRUCTURA DE RESPUESTA OBLIGATORIA (JSON):
Debes responder ESTRICTAMENTE con un solo objeto JSON válido. NO uses Markdown \`\`\`json. NO agregues texto antes ni después. El objeto DEBE tener estas exactas propiedades:
{
  "intent": "menu" | "plan_7d" | "plan_14d" | "plan_30d" | "plan_objetivo" | "analyze_form" | "ftp_test" | "qa" | "plan_ambiguous",
  "respuesta_coach": "El cuerpo de tu respuesta. Si es 'analyze_form', usa 3 partes: 1) Forma, 2) Diagnóstico, 3) Decisión. Si es 'qa' u otro, responde de manera conversacional, respondiendo SÓLO a lo preguntado, corto y sin recitar todas las métricas base por defecto.",
  "opciones_sugeridas": ["Opcion 1", "Opcion 2"], 
  "plan_entrenamientos": [ 
    { 
      "date": "2026-03-09", 
      "block_id": "b-base-std"
    }
  ] | null,
  "isGreeting": boolean
}

REGLAS DE RUTEO POR INTENT:
0. ESTRATEGIA DE ASIGNACIÓN (CRÍTICA): Tu trabajo es armar el rompecabezas de su entrenamiento en base a sus disponibilidades. LEE ATENTAMENTE la "disponibilidad" en el PERFIL DEL ATLETA. SOLO PUEDES PLANIFICAR SESIONES EN LOS DÍAS DE LA SEMANA QUE EL ATLETA INDIQUE ESTAR DISPONIBLE. Deja los demás días libres/vacíos. JUSTIFICA SIEMPRE en tu 'respuesta_coach' por qué estructuraste la semana así.
0. REGLA MAESTRA DE FISIOLOGÍA: Evalúa críticamente el peso (W/kg) de forma proactiva ÚNICAMENTE si el usuario pide explícitamente analizar su forma ("analyze_form") o pide un plan general ("plan_7d"/"plan_14d"/"plan_30d"). NO repitas el sermón del FTP/peso en cada pregunta básica. ¡Habla como un humano!
1. intent="menu" o "isGreeting"=true: Si el usuario SOLO TE ESTÁ SALUDANDO (ej. "hola", "buen día"). Responde un saludo breve invitando a elegir una opción. "opciones_sugeridas" DEBE estar vacío []. "plan_entrenamientos" DEBE ser null.
2. intent="qa": Preguntas puntuales (ej. dudas técnicas, o preguntas sobre sus promedios o constancia). Responde SOLO lo preguntado, en 1 a 5 líneas. MÁXIMO 1 o 2 métricas si aplican. PROHIBIDO repetir el diagnóstico general completo. Si pide un dato matemático que no existe en el contexto provisto, responde 'NEED_FETCH: [qué dato falta]' en la respuesta_coach. "plan_entrenamientos" DEBE ser null. "opciones_sugeridas" puede tener hasta 2 dudas relacionadas.
3. intent="plan_ambiguous": Si el usuario pide un PLAN pero NO especifica duración ni evento. Diles que necesitas saberlo. "plan_entrenamientos" DEBE ser null. "opciones_sugeridas" DEBE contener: ["Planificar Objetivo", "Plan de 7 días", "Mesociclo 30 días"].
4. intent="plan_7d", "plan_14d", "plan_30d" o "plan_objetivo": MODO PLANIFICADOR.
   - SI ES "plan_objetivo": Revisa si hay "fecha_evento" en el perfil. Si NO la hay, dile que vaya a su Perfil Biométrico y configure su fecha exacta del evento. Si SÍ la hay, calcula cuánto falta para esa fecha.
   - REGLA DE FORMATO COACH: DEBES usar una estructura visual PROPIA Y DISTINTA al análisis. Ejemplo de estructura:
     ### 🗓️ Tu Camino hacia [Objetivo Principal]
     *(Explica tu decisión táctica para las próximas semanas. Habla sobre la Fase del entrenamiento: Base, Build o Peak).*
     ### ⚡️ Sesiones Clave
     *(Menciona 1 o 2 días que serán críticos).*
5. intent="analyze_form": Si pide analizar forma actual. Lee "analisis_carga_backend" de PERFIL DEL ATLETA. Tu respuesta_coach debe explicar las métricas sin usar lenguaje críptico y DEBE estar estructurada visualmente, por ejemplo:
   ### 📊 Tu Estado de Forma Actual
   *(Explica el TSS, volumen y el CTL en palabras simples: "Vienes con muy buena base", "Estás asimilando mucha carga de golpe").*
   ### ⚖️ El Motor (W/kg)
   *(Evalúa su "relacion_wkg" y peso de forma amigable pero directa).*
   ### 🎯 Mi Consejo Táctico
   *(Sugerencia accionable y clara).* 
   "plan_entrenamientos" = null. "opciones_sugeridas" puede tener gatillos como ["Planificar Objetivo", "Plan de 7 días"]. 
   PROHIBIDO INCLUIR ESTA ESTRUCTURA CUANDO SE PIDA UN PLAN SEMANAL (REGLA 4).
6. intent="ftp_test": Si pide test de FTP. Explica el protocolo. "plan_entrenamientos" = null.

REGLAS DE PLAN_ENTRENAMIENTOS (Si intent es plan_X):
Usa ESTRICTAMENTE los IDs de la siguiente lista de BLOQUES DE ENTRENAMIENTO disponibles:
${JSON.stringify(blocksAvailable, null, 2)}

DISEÑO LÓGICO Y FISIOLÓGICO DEL CICLO (OBLIGATORIO):
1. FECHAS DE INICIO (date): Usa cadenas de texto con la fecha en formato ISO (YYYY-MM-DD). RESPETA ROTUNDAMENTE LA DISPONIBILIDAD DEL ATLETA. Si dice "Solo Lunes y Miércoles", asegúrate de que cada 'date' en el JSON caiga en esos días de la semana y ninguno en otro. Fecha actual: ${new Date().toISOString().split('T')[0]}. Utiliza el MAPEO DE FECHAS A DÍAS (está en las instrucciones anteriores) para saber qué ISO corresponde a qué día de la semana.
2. VOLUMEN: Adapta la carga. Planifica la cantidad de días de acuerdo con su disponibilidad temporal. Si se piden 14 días pero solo entrena 3 días a la semana, entrega como máximo unos 6 u 8 bloques, dependiendo de las fechas disponibles en ese rango.
3. EXCLUSIVIDAD: NO inventes bloques. Solo puedes elegir 'block_id' desde la lista de disponibles provista.`;

    // Función sanitizadora ultra-robusta recomendada
    const sanitizeJson = (raw: string) => {
        const s = raw.replace(/```json| ```/g, "").trim();
        const start = s.indexOf("{");
        const end = s.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) return s;
        return s.slice(start, end + 1).trim();
    };

    let data: any = null;
    let attempts = 0;
    const maxAttempts = 2;
    let lastRaw = "";

    while (attempts < maxAttempts) {
        try {
            const promptContent = attempts === 0
                ? systemInstruction
                : `Devuelve SOLO un JSON válido(sin texto extra).Corrige este contenido: \n\n${lastRaw} `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: [{ role: "user", parts: [{ text: promptContent }] }],
                config: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            });

            lastRaw = response.text || "";
            const jsonString = sanitizeJson(lastRaw);
            data = JSON.parse(jsonString);
            break; // Si parseó exitosamente, rompemos el ciclo

        } catch (error) {
            console.warn(`Intento ${attempts + 1} fallido de parsear JSON de Gemini.`, error);
            attempts++;
            if (attempts >= maxAttempts) {
                console.error("Fallo total al generar JSON de Gemini.");
                return {
                    textResponse: "Error interno estructurando la información fisiológica de la IA. Por favor, intenta formular tu pregunta nuevamente.",
                    schedule: null,
                    suggestedOptions: [],
                    isGreeting: false
                };
            }
        }
    }

    if (!data) throw new Error("Datos de IA Nulos");

    // === VALIDACIÓN MINIMA ROBUSTA DEL ESQUEMA ===
    data.isGreeting = !!data.isGreeting;
    data.suggestedOptions = Array.isArray(data.opciones_sugeridas) ? data.opciones_sugeridas : [];

    // Forzar null si los intent de ruteo prohíben planes
    let finalSchedule = data.plan_entrenamientos;
    if (data.intent !== 'plan_7d' && data.intent !== 'plan_14d' && data.intent !== 'plan_30d' && data.intent !== 'plan_objetivo') {
        finalSchedule = null;
    }
    // Asegurar estructura del plan_entrenamientos
    if (finalSchedule && !Array.isArray(finalSchedule)) {
        finalSchedule = null;
    }

    if (!finalSchedule || finalSchedule.length === 0) {
        return {
            textResponse: data.respuesta_coach || data.mensaje_inspirador || "Procesado.",
            schedule: null,
            suggestedOptions: data.suggestedOptions,
            isGreeting: data.isGreeting
        };
    }

    const schedule: Record<string, TrainingBlock[]> = {};

    finalSchedule.forEach((assignment: any) => {
        if (!assignment.date || !assignment.block_id) return;

        const dateStr = assignment.date; // Esperado en YYYY-MM-DD

        // NO sobrescribimos días previos del calendario planificado actual si el usuario ya tenía algo
        if (!schedule[dateStr]) {
            schedule[dateStr] = plannedSchedule && plannedSchedule[dateStr] ? [...plannedSchedule[dateStr]] : [];
        }

        const blockTemplate = TRAINING_BLOCKS.find(b => b.id === assignment.block_id);
        if (blockTemplate) {
            // Check if block already exists on that date to prevent strict duplicates (optional, but clean)
            if (!schedule[dateStr].some(existing => existing.id === blockTemplate.id)) {
                schedule[dateStr].push({ ...blockTemplate });
            }
        }
    });

    return {
        textResponse: data.respuesta_coach || data.mensaje_inspirador || "",
        schedule,
        suggestedOptions: data.suggestedOptions,
        isGreeting: data.isGreeting
    };
}
