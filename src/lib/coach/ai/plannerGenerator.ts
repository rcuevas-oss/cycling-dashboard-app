import { GoogleGenAI } from "@google/genai";
import { WORKOUT_LIBRARY, AthleteProfile } from "../types";

export interface PlannerWidgetConfig {
  planningMode: 'microcycle' | 'event';
  microcycleType?: string;
  microcycleDuration?: string;
  targetDate?: string;
  trainingMethodology?: string;
  flexibility: string;
  daysAvailable?: string[];
  hoursPerDay?: Record<string, number>;
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both';
}

export interface GeneratedPlanNode {
  dayOffset: number; // 0 is today, 1 is tomorrow, etc.
  workoutId: string; // Must strictly match an ID from WORKOUT_LIBRARY
  durationMinutes?: number; // AI calculated custom duration
  rationale: string; // Brief AI reasoning for why this block was chosen
  coachNote?: string; // Specific coaching tip or key data for the athlete
  steps: { name: string; duration: string; power: string; }[]; // Dynamic workout steps
}

export interface CoachPlanResponse {
  globalRationale: string;
  planNodes: GeneratedPlanNode[];
}

// Simple retry helper for transient failures
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable = err?.status === 429 || err?.status === 503 || err?.code === 'ECONNRESET';
      if (!isRetryable || attempt === maxAttempts) break;
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      console.warn(`[AI PLANNER] Reintentando (${attempt}/${maxAttempts}) en ${delayMs}ms...`, err?.status || err?.message);
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  throw lastError;
}

export async function generateWidgetPlan(
  apiKey: string,
  config: PlannerWidgetConfig,
  profile: AthleteProfile
): Promise<CoachPlanResponse | { error: string }> {
  
  const ai = new GoogleGenAI({ apiKey });

  // Map the library IDs and descriptions so Gemini knows EXACTLY what to choose from.
  const libraryContext = WORKOUT_LIBRARY.map(w => 
    `- ID: "${w.id}" | Titulo: ${w.title} | Duración: ${w.durationMins}m | IF: ${w.intensityFactor} | Tipo: ${w.description}`
  ).join('\n');

  // W/kg Profiling
  const wkg = profile.ftp / profile.weightKg;
  let athleteLevel = "Principiante / Adaptación Base";
  if (wkg > 2.5 && wkg <= 3.5) athleteLevel = "Amateur / Nivel Medio";
  if (wkg > 3.5 && wkg <= 4.5) athleteLevel = "Avanzado / Competitivo";
  if (wkg > 4.5) athleteLevel = "Élite / Pro";

  // Weekly TSS Target Calculation (Norwegian Maintenance/Load logic)
  // Target = CTL * 7 (maintenance) * factor
  const tssFactor = config.microcycleType === 'recuperacion' ? 0.85 : 1.1; 
  const weeklyTssTarget = Math.round(profile.currentCtl * 7 * tssFactor);

  // Availability logic moved entirely to availabilityCalendar directly below

  let modeSpecificPrompt = "";
  let totalDaysToGenerate = 7;

  if (config.planningMode === 'microcycle') {
    totalDaysToGenerate = parseInt(config.microcycleDuration || '7', 10);
    modeSpecificPrompt = `
    MODO: MICROCICLO DIRECTO (Corto Plazo)
    Fase de Entrenamiento Solicitada: ${config.microcycleType?.toUpperCase()}
    Duración Solicitada: ${config.microcycleDuration} días.
    Misión: Construye una secuencia diaria lógica de entrenamiento para estos ${config.microcycleDuration} días que cumpla el objetivo de la fase solicitada.
    `;
  } else {
    let generateDays = 14;
    let daysToEvent = 14;
    
    if (config.targetDate) {
      const target = new Date(config.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      
      const diffTime = target.getTime() - today.getTime();
      daysToEvent = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      generateDays = Math.min(daysToEvent, 60); // INCREASED TO 60 DAYS (2 MONTHS)
    }
    totalDaysToGenerate = generateDays;

    modeSpecificPrompt = `
    MODO: OBJETIVO A PLAZO (Periodización)
    Meta: Llegar con Peak Performance al día ${config.targetDate}.
    Días hasta el evento: ${daysToEvent} días.
    Misión: Generar los próximos ${generateDays} días de entrenamiento siguiendo una periodización inversa de TSB.
    REGLA ESTRICTA DE DURACIÓN DIARIA: Debes generar EXACTAMENTE ${generateDays} días consecutivos (del día 0 al día ${generateDays - 1}) para llenar este bloque del calendario. No puedes generar ni menos ni más. 
    `;
  }

  // Build absolute daily constraints
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayDate = new Date();
  
  if (config.planningMode === 'microcycle') {
      // Un microciclo en ciclismo casi siempre inicia los Lunes.
      // Si hoy es Lunes (1), empezamos hoy. Si es Domingo (0), empezamos mañana (1).
      // Si es otro día, calculamos los días faltantes hasta el próximo Lunes.
      const currentDay = todayDate.getDay();
      const daysToMonday = currentDay === 1 ? 0 : (currentDay === 0 ? 1 : 8 - currentDay);
      todayDate.setDate(todayDate.getDate() + daysToMonday);
  }
  
  let availabilityCalendar = "CALENDARIO DIARIO ESTRICTO DE DISPONIBILIDAD OBLIGATORIA:\\n";
  for (let i = 0; i < totalDaysToGenerate; i++) {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() + i);
      const dayName = dayNames[d.getDay()];
      
      if (config.daysAvailable && config.daysAvailable.length > 0 && !config.daysAvailable.includes(dayName)) {
          availabilityCalendar += `[dayOffset: ${i}] (${dayName}) -> PROHIBIDO ENTRENAR. OBLIGATORIO ASIGNAR ID: "rest-day" (0m).\\n`;
      } else {
          const hoursStr = (config.hoursPerDay && config.hoursPerDay[dayName]) ? config.hoursPerDay[dayName] : 'Libre';
          availabilityCalendar += `[dayOffset: ${i}] (${dayName}) -> DISPONIBLE. Horas máx indicadas: ${hoursStr}h.\\n`;
      }
  }

  const prompt = `
  Eres VeloCoach, el Entrenador Fisiológico de Inteligencia Artificial Oficial de VeloFlow. Tu tarea es generar la estructura de entrenamiento exacta para tu atleta.
  NO ERES UNA CALCULADORA AL AZAR QUE APILA BLOQUES FATIGANTES. 
  TU INTELIGENCIA Y FILOSOFÍA ESTÁ ESTRICTAMENTE BASADA EN EL MÉTODO NORUEGO.

  PERFIL BIOLÓGICO DEL ATLETA:
  - Nombre: ${profile.name}
  - Disciplina: ${profile.disciplina || "Ciclismo General"} | Objetivo: ${profile.objetivo || "Mejora de Rendimiento"}
  - Nivel Estimado: ${athleteLevel} (${wkg.toFixed(2)} W/kg)
  - FTP Actual: ${profile.ftp}W (${profile.ftpSource === 'data' ? 'DERIVADO DE DATOS REALES DE 20MIN' : 'INGRESO MANUAL'})
  - Tolerancia de Volumen Histórico Reciente: ${profile.recentVolumeHours || 5} Horas/Semana.
  - TARGET TSS SEMANAL (Objetivo Fisiológico): ~${weeklyTssTarget} TSS.
  - TSB (Frescura): ${profile.currentTsb.toFixed(1)}
  - ${availabilityCalendar}
  - HISTORIAL RECIENTE (Últimas sesiones con métricas): 
${profile.recentActivitySummary || "Sin data"}

  ${modeSpecificPrompt}
  
  REGLAS BIOLÓGICAS DE HIERRO (TU FILOSOFÍA NORUEGA):
  0) METODOLOGÍA BASE: Método Noruego (Bakken/Ingebrigtsen). 
     - Microciclos: Siempre de 7 días.
     - Mesociclos: Bloques de 4 semanas (3 carga + 1 descarga).
     - RITMO: El estándar es 2 días de "Threshold" (Lactato controlado) a la semana. 
     - DOBLE THRESHOLD: En semanas de 'Choque' o 'Carga', es ALTAMENTE RECOMENDADO programar "Double Threshold" en Martes y Jueves (Mañana y Tarde) si la disponibilidad del atleta lo permite.
     - ZONAS: Alto volumen en Z2. Threshold en Z4 (87-92% FTP). Evita Z5/Z6 salvo sprints cortos o tapering.

  0.1) INTELIGENCIA DE FASE Y SEGURIDAD:
     - FASE SOLICITADA: ${config.microcycleType === 'auto' ? 'DECISIÓN AUTÓNOMA DEL COACH (IA)' : config.microcycleType?.toUpperCase()}.
     - REGLA DE SEGURIDAD (MANDATORIA): Si el TSB del atleta es < -25 (Fatiga Extrema), ignora cualquier petición de 'Choque' o 'Carga' y programa una SEMANA DE RECUPERACIÓN (Z1/Z2 + descanso). La salud del atleta es lo primero.
     - LÓGICA AUTO: Si la fase es 'DECISIÓN AUTÓNOMA', analiza:
        * TSB > 5: El atleta está fresco. Programa INTRODUCCIÓN o CARGA.
        * TSB entre -15 y 5: Estado normal de entrenamiento. Programa CARGA o CHOQUE.
        * TSB < -15: Fatiga acumulada. Prioriza RECUPERACIÓN o AJUSTE SUAVE.

  A) REGLA DE RECUPERACIÓN: Tras una sesión de INTENSIDAD ALTA, el día siguiente debe ser suave (Z1/Z2) o descanso.
  B) VOLUMEN Y CALENDARIO ESTRICTO: Revisa atentamente el "CALENDARIO DIARIO ESTRICTO" que está en los datos del atleta. SI UN DÍA DICE "PROHIBIDO ENTRENAR", ES OBLIGATORIO PONER "rest-day". No programes entrenamiento en los días prohibidos.
  C) GESTIÓN INTELIGENTE DE HORAS DISPONIBLES: Las horas máximas indicadas para un día son TU LÍMITE TECHO, NO UN OBJETIVO A RELLENAR OBLIGATORIAMENTE. Si un bloque de intensidad (Z4/Z5) o de recuperación solo requiere de 60 minutos fisológicamente, programa 60 minutos y NO uses la 1.5h completa. Prioriza la CALIDAD fisiológica (TSS), no aplastes al atleta con relleno.
  D) OBJETIVO TSS: Intenta que la suma de TSS de los nodos generados se acerque al Target Semanal (~${weeklyTssTarget}) para mantener o mejorar el CTL. Solo redúcelo si la fatiga (TSB < -20) es muy alta.
  D) LUGAR: Si el atleta prefiere 'indoor', prioriza sesiones de 60-90m. Si prefiere 'outdoor', prioriza fondos largos el fin de semana.
  E) ADAPTABILIDAD: Si el objetivo es '${profile.objetivo}', ajusta la especificidad de los bloques.
  
  RESTRICCIONES ADICIONALES DEL ATLETA:
  "${config.flexibility || 'Ninguna. Libertad total para programar respetando el método noruego.'}"

  ---------------------
  LIBRERÍA DE BLOQUES DISPONIBLES:
  SOLO PUEDES ELEGIR BLOQUES DE ESTA LISTA ABSOLUTA. NINGÚN OTRO ID SERÁ VÁLIDO.
  ${libraryContext}
  ---------------------

  REGLAS DE FORMATO Y LÓGICA:
  1. Devuelve ESTRICTAMENTE un JSON puro, sin \`\`\`json ni formato extra.
  2. Nunca asignes un "dayOffset" futuro lejano. La secuencia debe empezar en 0 (Lunes) y ser secuencial.
  3. Si el atleta especificó "Descanso el Martes", calcúlalo matemáticamente y asígnale el ID "rest-day". Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long' })}.
  4. Usa el campo "rationale" (breve string) para explicar en 1 línea el bloque.
  5. OBLIGATORIO - TIEMPOS DINÁMICOS: El campo "durationMinutes" (número entero) NO DEBE copiar la librería por defecto. Ajusta el tiempo a la fatiga y disponibilidad, sin pasarte de las horas disponibles indicadas.
  6. OBLIGATORIO - GARMIN STEPS (PASOS INTERNOS): TODO entrenamiento debe tener rutinas paso a paso.
     - El campo "type" es ESTRICTO: solo puede ser 'warmup', 'active', 'recovery' o 'cooldown'.
     - El campo "power" es ESTRICTO: SOLO DEBE CONTENER RANGOS NUMÉRICOS (ej. "150W", "60-70% FTP", "Z2"). NUNCA pongas texto largo ahí.
     - Si necesitas escribir texto largo ("Alternar 4x3m"), ponlo en el campo "description".
  6.1 DECOMPOSICIÓN DE DRILLS: Si el entrenamiento incluye "Sprints" o "Openers", DEBES descomponerlos en pasos individuales (ej. 45m Fondo + 3x 30s Sprint + 2m Recup). NUNCA dejes un bloque genérico si hay intensidad mezclada.
  7. En el campo "globalRationale", escribe un mensaje fisiológico al atleta.

  Schema Esperado (DEBE ser un Object con estas propiedades exactas):
  {
    "globalRationale": "Mensaje detallado...",
    "planNodes": [
      {
        "dayOffset": 0,
        "workoutId": "endurance-2h",
        "durationMinutes": 90,
        "rationale": "Base necesaria para abrir el ciclo de carga.",
        "coachNote": "Mantén la cadencia entre 90-95 rpm para eficiencia metabólica.",
        "steps": [
          { "type": "warmup", "name": "Calentamiento", "duration": "15m", "power": "50-60% FTP" },
          { "type": "active", "name": "Fondo Continuo Z2", "duration": "60m", "power": "65-75% FTP", "description": "Rodar ágil sin pasar de Z2" },
          { "type": "cooldown", "name": "Enfriamiento", "duration": "15m", "power": "50% FTP" }
        ]
      }
    ]
  }
  `;

  console.log("[AI PLANNER] Enviando prompt a Gemini...");

  try {
      const response = await withRetry(() => ai.models.generateContent({
          model: "gemini-2.5-pro", 
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
              temperature: 0.1 
          }
      }));

      const rawText = response.text || "[]";
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.planNodes && Array.isArray(parsed.planNodes)) {
          // DESIGN-5: Validate every workoutId against WORKOUT_LIBRARY before returning.
          // Gemini can hallucinate IDs that don't exist, causing undefined workout nodes.
          const validIds = new Set(WORKOUT_LIBRARY.map(w => w.id));
          const originalCount = parsed.planNodes.length;
          parsed.planNodes = parsed.planNodes.filter((node: any) => {
              const valid = validIds.has(node.workoutId);
              if (!valid) {
                  console.warn(`[AI PLANNER] Gemini devolvió workoutId inválido: "${node.workoutId}" (día ${node.dayOffset}). Ignorando.`);
              }
              return valid;
          });
          if (parsed.planNodes.length < originalCount) {
              console.warn(`[AI PLANNER] ${originalCount - parsed.planNodes.length} nodo(s) descartado(s) por IDs inválidos.`);
          }
          return parsed as CoachPlanResponse;
      } else {
          console.error("Gemini no devolvió la estructura CoachPlanResponse:", parsed);
          return { error: "El modelo no devolvió la estructura JSON requerida (planNodes faltante)." };
      }
      
  } catch (error: any) {
      console.error("[AI PLANNER] Error generando plan algorítmico:", error);
      return { error: error?.message || "Fallo de conexión o timeout con la API de Gemini." };
  }
}
