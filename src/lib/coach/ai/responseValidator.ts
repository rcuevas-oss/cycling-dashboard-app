import { CoachResponseSchema } from "../types";

/**
 * Validates that the LLM response is valid JSON and matches our expected schema.
 * Replaces the need for chaotic error handling deep inside the LLM call.
 */
export function validateLLMResponse(rawString: string): CoachResponseSchema {
    let cleanString = rawString;
    
    // 1. Clean markdown code blocks if the LLM hallucinated them
    cleanString = cleanString.replace(/```json|```/g, "").trim();

    // 2. Strict parse
    let parsed: any;
    try {
        parsed = JSON.parse(cleanString);
    } catch (e) {
        throw new Error("El LLM no devolvió un JSON parseable.");
    }

    // 3. Schema defaults and enforcement
    const validated: CoachResponseSchema = {
        textMarkdown: typeof parsed.textMarkdown === "string" ? parsed.textMarkdown : "Hubo un error interpretando el análisis fisiológico.",
        generatedPlan: Array.isArray(parsed.generatedPlan) ? parsed.generatedPlan : null
    };

    return validated;
}

/**
 * Hardcoded fallback for catastrophic failures or when business safeguards force an abort.
 */
export function generateFallbackResponse(reason: string): CoachResponseSchema {
    return {
        textMarkdown: reason || "Lo siento, tuve un problema procesando tus datos métricos en este momento. Intenta formular tu petición nuevamente.",
        generatedPlan: null
    };
}
