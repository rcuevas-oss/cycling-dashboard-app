import { GoogleGenAI } from "@google/genai";
import { CoachResponseSchema, GeneratorContext } from "../types";
import { generateFallbackResponse, validateLLMResponse } from "./responseValidator";
import { generateHeadCoachPrompt } from "./prompts/headCoachPrompt";
import { generateDataScientistPrompt } from "./prompts/dataScientistPrompt";
import { generateGreetingPrompt } from "./prompts/greetingPrompt";
import { generatePlanRequestPrompt } from "./prompts/planRequestPrompt";

// MEJORA-5: Simple retry helper with exponential backoff for transient Gemini API failures
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable = err?.status === 429 || err?.status === 503 || err?.code === 'ECONNRESET';
      if (!isRetryable || attempt === maxAttempts) break;
      const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.warn(`[COACH AI] Reintentando (${attempt}/${maxAttempts}) en ${delayMs}ms...`, err?.status || err?.message);
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  throw lastError;
}

export async function draftFinalResponse(
  apiKey: string,
  ctx: GeneratorContext
): Promise<CoachResponseSchema> {

  // If the safety layer forced an abort, bypass the LLM entirely or just use the forced message
  if (ctx.safeguardAction && ctx.safeguardAction.directive !== "PROCEED") {
      if (ctx.safeguardAction.forcedMessageToUser) {
           return {
               textMarkdown: ctx.safeguardAction.forcedMessageToUser
           }
      }
  }

  const ai = new GoogleGenAI({ apiKey });

  // ----------------------------------------------------
  // MULTI-AGENT ORCHESTRATION / ROUTING
  // DESIGN-6: PLAN_REQUEST now routes to a specialized prompt that analyzes
  // the athlete's current state and directs them to the VeloFlow AI Builder.
  // ----------------------------------------------------
  let prompt = "";
  
  if (ctx.intent === "GREETING") {
      prompt = generateGreetingPrompt(ctx);
  } else if (ctx.intent === "DATA_SCIENCE") {
      prompt = generateDataScientistPrompt(ctx);
  } else if (ctx.intent === "PLAN_REQUEST") {
      prompt = generatePlanRequestPrompt(ctx);
  } else {
      // Default to Head Coach for ANALYZE_SESSION, ANALYZE_FORM, QA, AMBIGUOUS
      prompt = generateHeadCoachPrompt(ctx);
  }

  console.log(`[ORCHESTRATOR] Routing intent '${ctx.intent}' to corresponding specialized agent prompt.`);

  try {
      // Convert history to Gemini format (limit to last 6 messages max to save tokens & stay focused)
      const maxHistory = 6;
      const recentHistory = (ctx.chatHistory || []).slice(-maxHistory);
      
      const contents: any[] = recentHistory.map(msg => ({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content }]
      }));

      // Append the actual strict prompt AT THE END
      contents.push({ role: "user", parts: [{ text: prompt }] });

      // MEJORA-5: Use retry wrapper for resilience against transient API failures
      const response = await withRetry(() => ai.models.generateContent({
          model: "gemini-2.5-pro", 
          contents: contents,
          config: {
              temperature: 0.2,
              responseMimeType: "application/json"
          }
      }));

      return validateLLMResponse(response.text || "{}");
      
  } catch (error: any) {
      console.error("Fallo al redactar o parsear el JSON final del Coach.", error);
      return generateFallbackResponse(`Tuve un fallo técnico temporal intentando conectarme con mi cerebro o parsear los datos. Razón exacta del error: ${error?.message || error?.status || "Error desconocido"}`);
  }
}
