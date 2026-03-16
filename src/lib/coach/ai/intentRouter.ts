import { GoogleGenAI } from "@google/genai";
import { IntentContext, IntentType } from "../types";

export async function detectIntent(apiKey: string, userMessage: string): Promise<IntentContext> {
    const ai = new GoogleGenAI({ apiKey });
    
    const todayISO = new Date().toISOString().split('T')[0];

    const prompt = `
    Eres un enrutador de intenciones para un Coach Ciclista con IA.
    Clasifica el siguiente mensaje del usuario en UNA de las siguientes categorías exactas. Actúa como un motor de clasificación rápido y determinista:

    - GREETING: El usuario solo saluda o se despide ("Hola", "Buen día", "Gracias"). No pide nada técnico.
    - QA: Pregunta técnica, biomecánica o nutricional genérica que NO requiere revisar sus métricas pasadas (Ej: "¿Cómo funciona el FTP?", "¿Qué comer antes de entrenar?", "¿A qué cadencia debo ir en subida?").
    - ANALYZE_SESSION: Pregunta específicamente por cómo le fue en un entrenamiento reciente o particular (Ej: "Ayer entrené, ¿qué tal?", "Analiza el fondo del domingo", "Mira mi salida de hoy").
    - ANALYZE_FORM: Pregunta por su estado de forma general, fatiga o sensaciones corporales amplias (Ej: "¿Cómo vengo?", "Siento las piernas pesadas", "¿Estoy listo para correr el fin de semana?").
    - PLAN_REQUEST: Pide concretamente la creación o ajuste de un calendario/plan de entrenamiento (Ej: "Arma mi semana", "Plan para los próximos 14 días", "Organiza mi entrenamiento").
    - AMBIGUOUS: Cualquier otra interacción confusa o un pedido de plan que no especifique temporalidad ("Quiero un plan" a secas).

    Debes responder ÚNICAMENTE con un objeto JSON válido (sin Markdown \`\`\`json) siguiendo esta estructura exacta:
    {
       "type": "GREETING" | "QA" | "ANALYZE_SESSION" | "ANALYZE_FORM" | "PLAN_REQUEST" | "AMBIGUOUS",
       "targetTimeframeDays": number | null, 
       "focusSessionDateStr": string | null
    }

    REGLAS ADICIONALES:
    1. Para \`targetTimeframeDays\`: Si pide un plan de "una semana", devuelve 7. Si es "quincena", 14. Si es "un mes", 30. Si no pide plan, null.
    2. Para \`focusSessionDateStr\`: Si el usuario menciona "ayer", "hoy", u otro día referencial, intenta calcular su fecha YYYY-MM-DD sabiendo que HOY es ${todayISO}. Si no se menciona una sesión específica, null.

    MENSAJE DEL USUARIO:
    "${userMessage}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash", // Modelo rápido y barato para routing
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                temperature: 0.1,
                responseMimeType: "application/json"
            }
        });

        const raw = response.text || "{}";
        const cleanJson = raw.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanJson);

        // Map strictly to IntentType
        const allowedTypes: IntentType[] = ["GREETING", "QA", "ANALYZE_SESSION", "ANALYZE_FORM", "PLAN_REQUEST", "AMBIGUOUS"];
        const type: IntentType = allowedTypes.includes(data.type) ? data.type : "AMBIGUOUS";

        const requiresHistoricalData = type === "ANALYZE_SESSION" || type === "ANALYZE_FORM" || type === "PLAN_REQUEST";

        return {
            type,
            requiresHistoricalData,
            targetTimeframeDays: data.targetTimeframeDays || undefined,
            focusSessionDateStr: data.focusSessionDateStr || undefined
        };
    } catch (e) {
        console.warn("Fallo en intent router de Gemini. Cayendo en AMBIGUOUS por seguridad.", e);
        return {
            type: "AMBIGUOUS",
            requiresHistoricalData: false
        };
    }
}
