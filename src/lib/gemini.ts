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

    const systemInstruction = `Eres una IA de entrenamiento ciclista de alto rendimiento. Tu objetivo es ser técnico pero EXTREMADAMENTE ACCESIBLE. Explica conceptos fisiológicos (TSS, CTL, ATL, W/kg) de una forma sencilla que cualquier ciclista aficionado entienda al instante. 
IMPORTANTÍSIMO: Usa SIEMPRE formato Markdown (títulos con ###, viñetas, **negritas** para resaltar métricas en el texto) y acompáñalo de Emojis adecuados (🔥, 📊, ⚡️, ⚖️) para que tus mensajes sean visualmente atractivos y NO se vean como paredes de texto robótico. Nada de "[]" corchetes rígidos.

FECHA ACTUAL DEL SISTEMA: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

PERFIL DEL ATLETA:
${JSON.stringify(athleteContext, null, 2)}

RESUMEN DE ACTIVIDADES RECIENTES (Últimos entrenos):
${JSON.stringify(recentActivities, null, 2)}

SOLICITUD DEL ATLETA:
"${userPrompt}"

ESTRUCTURA DE RESPUESTA OBLIGATORIA (JSON):
Debes responder ESTRICTAMENTE con un solo objeto JSON válido. NO uses Markdown \`\`\`json. NO agregues texto antes ni después. El objeto DEBE tener estas exactas propiedades:
{
  "intent": "menu" | "plan_7d" | "plan_14d" | "analyze_form" | "ftp_test" | "qa" | "plan_ambiguous",
  "respuesta_coach": "Texto formateado en 3 partes cortas: 1) Forma actual (métricas del backend). 2) Diagnóstico (qué significa). 3) Decisión (qué hacer). Cero saludos ni rellenos.",
  "opciones_sugeridas": ["Opcion 1", "Opcion 2"], 
  "plan_semanal": { "Lunes": [], "Martes": ["id_bloque"], ... } | null,
  "isGreeting": boolean
}

REGLAS DE RUTEO POR INTENT:
0. REGLA MAESTRA DE FISIOLOGÍA: Si el PERFIL DEL ATLETA incluye "peso_kg" y "relacion_wkg", evalúa SIEMPRE críticamente este dato. En el ciclismo el peso es vital. Si el atleta pesa mucho (ej. > 85kg) y su ratio W/kg es bajo (ej. < 2.5 W/kg), DEBES ser asertivamente proactivo y señalar que mejorar la relación peso-potencia (perder grasa/ganar fuerza) es el factor limitante principal. No seas complaciente.
1. intent="menu" o "isGreeting"=true: Si el usuario SOLO TE ESTÁ SALUDANDO (ej. "hola", "buen día"). Responde un saludo breve invitando a elegir una opción. "opciones_sugeridas" DEBE estar vacío []. "plan_semanal" DEBE ser null.
2. intent="qa": Si el usuario hace una PREGUNTA TÉCNICA (ej. "qué es TSS"). Respóndela como fisiólogo. "plan_semanal" DEBE ser null. "opciones_sugeridas" puede tener hasta 2 dudas relacionadas.
3. intent="plan_ambiguous": Si el usuario pide un PLAN pero NO especifica 7 o 14 días. Diles que necesitas saberlo. "plan_semanal" DEBE ser null. "opciones_sugeridas" DEBE contener exactamente: ["7 días", "14 días"].
4. intent="plan_7d" o intent="plan_14d": SOLO Y EXCLUSIVAMENTE si el usuario especifica los días. 
   - SI NO SABES o intuyes su disponibilidad de tiempo (ej. horas a la semana), PREGÚNTALE BREVEMENTE y no generes nada aún ("plan_semanal"=null).
   - SI YA TIENES todo, arma el "plan_semanal" priorizando fisiológicamente los bloques que sirvan para su "objetivo_principal" definido en el PERFIL.
   - IMPORTANTE FORMATO: DEBES usar una estructura visual PROPIA Y DISTINTA al análisis. NO recicles el saludo del análisis. Ejemplo de estructura:
     ### 🗓️ Tu Enfoque Semanal para [Objetivo Principal]
     *(Explica por qué armaste la semana así de forma amigable)*.
     ### ⚡️ Bloques Clave
     *(Resalta 1 o 2 sesiones clave de la semana en base a su objetivo)*.
5. intent="analyze_form": Si pide analizar forma actual. Lee "analisis_carga_backend" de PERFIL DEL ATLETA. Tu respuesta_coach debe explicar las métricas sin usar lenguaje críptico y DEBE estar estructurada visualmente, por ejemplo:
   ### 📊 Tu Estado de Forma Actual
   *(Explica el TSS, volumen y el CTL en palabras simples: "Vienes con muy buena base", "Estás asimilando mucha carga de golpe").*
   ### ⚖️ El Motor (W/kg)
   *(Evalúa su "relacion_wkg" y peso de forma amigable pero directa: "Tu FTP de X es genial, pero si perdieras Y kilos volarías en las subidas").*
   ### 🎯 Mi Consejo Táctico
   *(Sugerencia accionable y clara).* 
   "plan_semanal" = null. "opciones_sugeridas" puede tener gatillos como ["Plan de 7 días", "Test FTP"]. 
   PROHIBIDO INCLUIR ESTA ESTRUCTURA CUANDO SE PIDA UN PLAN SEMANAL (REGLA 4).
6. intent="ftp_test": Si pide test de FTP. Explica el protocolo. "plan_semanal" = null.

REGLAS DE PLAN_SEMANAL (Si intent es plan_7d o plan_14d):
Usa ESTRICTAMENTE los IDs de la siguiente lista de BLOQUES DISPONIBLES:
${JSON.stringify(blocksAvailable, null, 2)}

DISEÑO LÓGICO Y FISIOLÓGICO DEL MICROCICLO (OBLIGATORIO):
1. DESCANSO TOTAL: Es fisiológicamente irresponsable entrenar 7 días seguidos. DEBES asignar obligatoriamente 1 o 2 días a la semana de DESCANSO TOTAL absoluto asignando un array vacío \`[]\` a ese día (Ej: \`"Lunes": [], "Viernes": []\`).
2. EVITAR ROBOTISMO: NO alternes actividades estúpidamente (ej. Z1, Z2, Z1, Z2, Z1). Construye bloques inteligentes (ej. 2 días de carga progresiva + 1 descanso + 1 día de intervalos + fin de semana largo).
3. FIN DE SEMANA (VOLUMEN): Si el plan requiere sesiones de mayor volumen (Tiradas largas de 2-4 hrs en Z2), asígnalas prioritariamente a Sábado o Domingo, que es cuando los ciclistas amateur tienen tiempo.`;

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
    let finalSchedule = data.plan_semanal;
    if (data.intent !== 'plan_7d' && data.intent !== 'plan_14d') {
        finalSchedule = null;
    }
    // Asegurar estructura del plan_semanal
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

    const schedule = {
        'Lunes': mapDay('Lunes'),
        'Martes': mapDay('Martes'),
        'Miércoles': mapDay('Miércoles'),
        'Jueves': mapDay('Jueves'),
        'Viernes': mapDay('Viernes'),
        'Sábado': mapDay('Sábado'),
        'Domingo': mapDay('Domingo')
    };

    return {
        textResponse: data.respuesta_coach || data.mensaje_inspirador || "",
        schedule,
        suggestedOptions: data.suggestedOptions,
        isGreeting: data.isGreeting
    };
}
