import { GoogleGenAI } from "@google/genai";
import { TRAINING_BLOCKS } from "../components/TrainingPlanner";
import { TrainingBlock } from "./fitUtils";

export async function generateWeeklyPlan(
    apiKey: string,
    userPrompt: string,
    athleteContext: any,
    recentActivities: any[]
): Promise<{ textResponse: string, schedule: Record<string, TrainingBlock[]> | null, suggestedOptions: string[], isGreeting: boolean }> {

    const ai = new GoogleGenAI({ apiKey });

    // Construimos el diccionario de bloques disponibles para que Gemini sepa qué puede elegir
    const blocksAvailable = TRAINING_BLOCKS.map(b => ({
        id: b.id,
        nombre: b.title,
        zona: b.zone,
        duracion_tipica: b.d
    }));

    const systemInstruction = `Eres una IA de entrenamiento ciclista de alto rendimiento. Tu objetivo es ser técnico pero EXTREMADAMENTE ACCESIBLE y PERSONALIZADO. Explica conceptos fisiológicos (TSS, CTL, ATL, W/kg) de una forma sencilla que cualquier ciclista aficionado entienda al instante. 
IMPORTANTÍSIMO: Usa SIEMPRE formato Markdown (títulos con ###, viñetas, **negritas** para resaltar métricas en el texto) y acompáñalo de Emojis adecuados (🔥, 📊, ⚡️, ⚖️) para que tus mensajes sean visualmente atractivos y NO se vean como paredes de texto robótico. Nada de "[]" corchetes rígidos.

CONEXIÓN PERSONAL (OBLIGATORIA): Tienes acceso al nombre del ciclista y a su disciplina preferida en el PERFIL DEL ATLETA. DEBES referirte al usuario por su nombre de vez en cuando (especialmente en los saludos) para construir confianza, y DEBES adaptar tus consejos al contexto de su disciplina (ej. Ruta, MTB, Gravel) y su objetivo principal. Hazlo sentir que conoces su perfil.

FECHA ACTUAL DEL SISTEMA (DÍA 1 DEL PLAN SI APLICA): ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (ISO: ${new Date().toISOString().split('T')[0]})

PERFIL DEL ATLETA:
${JSON.stringify(athleteContext, null, 2)}

RESUMEN DE ACTIVIDADES RECIENTES (Últimos entrenos):
${JSON.stringify(recentActivities, null, 2)}

SOLICITUD DEL ATLETA:
"${userPrompt}"

ESTRUCTURA DE RESPUESTA OBLIGATORIA (JSON):
Debes responder ESTRICTAMENTE con un solo objeto JSON válido. NO uses Markdown \`\`\`json. NO agregues texto antes ni después. El objeto DEBE tener estas exactas propiedades:
{
  "intent": "menu" | "plan_7d" | "plan_14d" | "plan_30d" | "plan_objetivo" | "analyze_form" | "ftp_test" | "qa" | "plan_ambiguous",
  "respuesta_coach": "El cuerpo de tu respuesta. Si es 'analyze_form', usa 3 partes: 1) Forma, 2) Diagnóstico, 3) Decisión. Si es 'qa' u otro, responde de manera conversacional, respondiendo SÓLO a lo preguntado, corto y sin recitar todas las métricas base por defecto.",
  "opciones_sugeridas": ["Opcion 1", "Opcion 2"], 
  "plan_calendario": { "2026-03-04": [], "2026-03-05": ["id_bloque"], ... } | null,
  "isGreeting": boolean
}

REGLAS DE RUTEO POR INTENT:
0. REGLA MAESTRA DE FISIOLOGÍA: Evalúa críticamente el peso (W/kg) de forma proactiva ÚNICAMENTE si el usuario pide explícitamente analizar su forma ("analyze_form") o pide un plan general ("plan_7d"/"plan_14d"/"plan_30d"). NO repitas el sermón del FTP/peso en cada pregunta básica. ¡Habla como un humano!
1. intent="menu" o "isGreeting"=true: Si el usuario SOLO TE ESTÁ SALUDANDO (ej. "hola", "buen día"). Responde un saludo breve invitando a elegir una opción. "opciones_sugeridas" DEBE estar vacío []. "plan_calendario" DEBE ser null.
2. intent="qa": Preguntas puntuales (ej. dudas técnicas, o preguntas sobre sus promedios o constancia). Responde SOLO lo preguntado, en 1 a 5 líneas. MÁXIMO 1 o 2 métricas si aplican. PROHIBIDO repetir el diagnóstico general completo. Si pide un dato matemático que no existe en el contexto provisto, responde 'NEED_FETCH: [qué dato falta]' en la respuesta_coach. "plan_calendario" DEBE ser null. "opciones_sugeridas" puede tener hasta 2 dudas relacionadas.
3. intent="plan_ambiguous": Si el usuario pide un PLAN pero NO especifica duración ni evento. Diles que necesitas saberlo. "plan_calendario" DEBE ser null. "opciones_sugeridas" DEBE contener: ["Planificar Objetivo", "Plan de 7 días", "Mesociclo 30 días"].
4. intent="plan_7d", "plan_14d", "plan_30d" o "plan_objetivo": MODO PLANIFICADOR.
   - SI ES "plan_objetivo": Revisa si hay "fecha_evento" en el perfil. Si NO la hay, dile que vaya a su Perfil Biométrico y configure su fecha exacta del evento. Si SÍ la hay, calcula (aproximadamente) cuántas semanas faltan desde hoy. Si faltan más de 4 semanas, entrégale el PRIMER MESOCICLO de 4 semanas (28 fechas) enfocado en Fase Base o Build. Si faltan menos de 28 días, entrégale los días exactos restantes como Fase Peaking / Tapering.
   - SI ES "plan_7d", "14d" o "30d": Genera los días solicitados.
   - REGLA DE FORMATO COACH: DEBES usar una estructura visual PROPIA Y DISTINTA al análisis. Ejemplo de estructura:
     ### 🗓️ Tu Camino hacia [Objetivo Principal]
     *(Explica tu decisión táctica para las próximas semanas. Habla sobre la Fase del entrenamiento: Base, Build o Peak).*
     ### ⚡️ Sesiones Clave
     *(Menciona 1 o 2 días que serán críticos).*
5. intent="analyze_form": Si pide analizar forma actual. Lee "analisis_carga_backend" de PERFIL DEL ATLETA. Tu respuesta_coach debe explicar las métricas sin usar lenguaje críptico y DEBE estar estructurada visualmente, por ejemplo:
   ### 📊 Tu Estado de Forma Actual
   *(Explica el TSS, volumen y el CTL en palabras simples: "Vienes con muy buena base", "Estás asimilando mucha carga de golpe").*
   ### ⚖️ El Motor (W/kg)
   *(Evalúa su "relacion_wkg" y peso de forma amigable pero directa: "Tu FTP de X es genial, pero si perdieras Y kilos volarías en las subidas").*
   ### 🎯 Mi Consejo Táctico
   *(Sugerencia accionable y clara).* 
   "plan_calendario" = null. "opciones_sugeridas" puede tener gatillos como ["Planificar Objetivo", "Plan de 7 días"]. 
   PROHIBIDO INCLUIR ESTA ESTRUCTURA CUANDO SE PIDA UN PLAN SEMANAL (REGLA 4).
6. intent="ftp_test": Si pide test de FTP. Explica el protocolo. "plan_calendario" = null.

REGLAS DE PLAN_CALENDARIO (Si intent es plan_X):
Usa ESTRICTAMENTE los IDs de la siguiente lista de BLOQUES DISPONIBLES:
${JSON.stringify(blocksAvailable, null, 2)}

DISEÑO LÓGICO Y FISIOLÓGICO DEL CICLO (OBLIGATORIO):
1. LLAVES DE FECHA EXACTAS: Usa cadenas de texto con la fecha en formato ISO (YYYY-MM-DD). La fecha de inicio es HOY: ${new Date().toISOString().split('T')[0]}. Empieza el plan desde hoy o mañana, y corre en fechas consecutivas según el intent (7, 14, 30 días, o según plan_objetivo).
2. DESCANSO TOTAL: Es fisiológicamente irresponsable entrenar 7 días seguidos. DEBES asignar obligatoriamente 1 o 2 días a la semana de DESCANSO TOTAL absoluto asignando un array vacío \`[]\` a ese día (Ej: \`"2026-03-05": [], "2026-03-09": []\`).
3. EVITAR ROBOTISMO: NO alternes actividades estúpidamente (ej. Z1, Z2, Z1, Z2, Z1). Construye bloques inteligentes (ej. 2 días de carga progresiva + 1 descanso + 1 día de intervalos + fin de semana largo).
4. FIN DE SEMANA (VOLUMEN): Si el plan requiere sesiones de mayor volumen (Tiradas largas de 2-4 hrs en Z2), asígnalas prioritariamente a Sábado o Domingo, que es cuando los ciclistas amateur tienen tiempo. (Calcula mentalmente qué fechas caen fin de semana a partir de la fecha de inicio).`;

    // Función sanitizadora ultra-robusta recomendada
    const sanitizeJson = (raw: string) => {
        const s = raw.replace(/```json|```/g, "").trim();
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
                : `Devuelve SOLO un JSON válido (sin texto extra). Corrige este contenido:\n\n${lastRaw}`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
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
    let finalSchedule = data.plan_calendario;
    if (data.intent !== 'plan_7d' && data.intent !== 'plan_14d' && data.intent !== 'plan_30d' && data.intent !== 'plan_objetivo') {
        finalSchedule = null;
    }
    // Asegurar estructura del plan_calendario
    if (finalSchedule && (typeof finalSchedule !== 'object' || Array.isArray(finalSchedule))) {
        finalSchedule = null;
    }

    if (!finalSchedule || Object.keys(finalSchedule).length === 0) {
        return {
            textResponse: data.respuesta_coach || data.mensaje_inspirador || "Procesado.",
            schedule: null,
            suggestedOptions: data.suggestedOptions,
            isGreeting: data.isGreeting
        };
    }

    const mapDay = (dayKey: string) => {
        const blockIds = finalSchedule[dayKey] || [];
        return blockIds.map((id: string) => TRAINING_BLOCKS.find(b => b.id === id)).filter(Boolean) as TrainingBlock[];
    };

    const schedule: Record<string, TrainingBlock[]> = {};
    Object.keys(finalSchedule).forEach(dateKey => {
        schedule[dateKey] = mapDay(dateKey);
    });

    return {
        textResponse: data.respuesta_coach || data.mensaje_inspirador || "",
        schedule,
        suggestedOptions: data.suggestedOptions,
        isGreeting: data.isGreeting
    };
}
