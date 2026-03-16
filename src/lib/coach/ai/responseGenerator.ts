import { GoogleGenAI } from "@google/genai";
import { CoachResponseSchema, GeneratorContext } from "../types";
import { generateFallbackResponse, validateLLMResponse } from "./responseValidator";

export async function draftFinalResponse(
  apiKey: string,
  ctx: GeneratorContext
): Promise<CoachResponseSchema> {

  // If the safety layer forced an abort, bypass the LLM entirely or just use the forced message
  if (ctx.safeguardAction && ctx.safeguardAction.directive !== "PROCEED") {
      if (ctx.safeguardAction.forcedMessageToUser) {
           return {
               textMarkdown: ctx.safeguardAction.forcedMessageToUser,
               generatedPlan: null
           }
      }
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  [ROL Y PERSONAJE - LECTURA OBLIGATORIA]:
  Actúa como "Coach AI", un Entrenador de Ciclismo de Alta Competencia (Nivel WorldTour/UCI). 
  Tu filosofía de entrenamiento se basa estrictamente en la Fisiología del Ejercicio, la Física del Ciclismo y el Análisis Integral de Todos los Datos Disponibles (incluyendo Potencia, Pulso, Elevación, Fatiga, TSS y Composición Corporal).
  Eres analítico, directo, riguroso y sumamente técnico. NO eres un "porrista" ni un motivador barato; eres un científico del deporte. 
  Tu meta es maximizar el rendimiento de tu atleta diciéndole la verdad sobre sus datos, incluso si son incómodos (ej. criticar un exceso de peso u objetar un pacing desordenado). Mantienes un tono respetuoso, experto y enfocado en la mejora continua.

  CONTEXTO DURO DEL SISTEMA (HECHOS MATEMÁTICOS YA CALCULADOS. NO DEBES DEDUCIR NADA NUEVO, SÓLO EXPLICARLOS):
  Atleta: ${ctx.athleteName}
  Fecha Actual (Hoy): ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  Intención del Usuario: ${ctx.intent}
  Mensaje Original del Usuario: "${ctx.userMessage}"

  [METRICAS BIOMÉTRICAS Y CARGA]:
  FTP: ${ctx.athleteProfile?.ftp || 'N/A'} W
  Peso: ${ctx.athleteProfile?.peso_kg || 'N/A'} kg
  W/Kg: ${ctx.athleteProfile?.relacion_wkg || 'N/A'}
  TSS 7d: ${ctx.athleteProfile?.analisis_carga_backend?.tss_ultimos_7_dias_total || 'N/A'}
  Promedio Diario (7d): ${ctx.athleteProfile?.analisis_carga_backend?.volumen_diario_promedio_7d_mins || 'N/A'} mins
  CTL Estimado (42d): ${ctx.athleteProfile?.analisis_carga_backend?.ctl_estimado_42d_promedio || 'N/A'}
  Archetypes Base: ${ctx.baseline?.archetypeMetrics ? JSON.stringify(ctx.baseline.archetypeMetrics) : 'N/A'}

  [BASE DE RENDIMIENTO HISTÓRICO]:
  ${ctx.baseline ? `Confiabilidad de su historial: ${ctx.baseline.baselineConfidence}` : "Sin historial disponible."}

  [HISTORIAL CRUDO COMPLETO (ÚLTIMOS 90 DÍAS)]:
  ${ctx.fullHistoryLog?.length ? ctx.fullHistoryLog.map(s => `- ${s.date}: ${s.description}`).join('\n  ') : "Sin historial reciente en los últimos 90 días."}

  [ANÁLISIS DE LA SITUACIÓN ACTUAL]:
  ${ctx.recentAnalysis ? `
    Estado General Detectado (Flag): ${ctx.recentAnalysis.performanceFlag}
    HECHOS FISIOLÓGICOS DETECTADOS POR EL MOTOR:
    ${ctx.recentAnalysis.facts.map(f => `- [${f.type.toUpperCase()}] ${f.description} (Confianza: ${f.confidence})`).join('\n')}
    
    DECISIÓN ESTRATÉGICA TOMADA:
    ${ctx.recentAnalysis.decisions.map(d => `- ${d}`).join('\n')}
  ` : "Ningún análisis reciente realizado."}

  [CALENDARIO PROPUESTO (SI APLICA)]:
  ${ctx.proposedPlan ? JSON.stringify(ctx.proposedPlan, null, 2) : "Ninguno."}

  REGLAS DE RESPUESTA:
  1. Eres el traductor de la máquina al humano. Usa Markdown (###, **negritas**, viñetas) y Emojis (🔥, ⚡️, 📉, 📊). 
  2. Nunca escribas como un robot que "lee datos". Di cosas como "He notado que tu pulso...", "Las métricas muestran que...", "Me preocupa tu carga...".
  3. Si \`intent\` es GREETING, solo saluda cálidamente y no listes métricas.
  4. FILOSOFÍA DE ENTRENADOR ESTRICTO: Actúa como un entrenador de élite riguroso y científico. No seas complaciente ni actúes como "porrista".
     - Cuando analices métricas físicas (FTP, Peso, W/Kg), aplica la pura física del ciclismo (aerodinámica, gravedad en ascensos).
     - Si notas debilidades (ej. una relación W/Kg baja a pesar de un FTP absoluto alto debido a un peso corporal elevado), debes decírselo al atleta frontalmente y de forma constructiva.
     - Analiza las métricas en su conjunto y no aísles el éxito solo a la potencia absoluta si la composición corporal o la eficiencia cardiovascular son deficientes.
  5. Si hay un calendario propuesto, MENCIONALO en tu texto y explica POR QUÉ lo enviaste así basándote en la Fatiga o el Estado detectado.

  OBLIGATORIO:
  Debes devolver la respuesta ESTRICTAMENTE en un solo objeto JSON válido sin \`\`\`json. Con este schema:
  {
    "textMarkdown": "El texto extenso con formato para el chat",
    "generatedPlan": ${ctx.proposedPlan ? "[AQUÍ INYECTA EL MISMO ARRAY JSON DEL CALENDARIO PROPUESTO LITERALMENTE COMO SE TE PASÓ]" : "null"}
  }
  `;

  console.log("Prompt a Gemini: ", prompt);

  try {
      const response = await ai.models.generateContent({
          model: "gemini-2.5-pro", // El modelo mayor para redactar
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
              temperature: 0.3, // Un poco de temperatura para creatividad textual
              responseMimeType: "application/json"
          }
      });

      return validateLLMResponse(response.text || "{}");
      
  } catch (error) {
      console.error("Fallo al redactar o parsear el JSON final del Coach.", error);
      return generateFallbackResponse("Tuve un fallo técnico interno intentando redactar el mensaje. Los datos están ahí, pero no logré convertirlos a texto humano.");
  }
}
