# VeloCoach AI (Cycling AI Trainer)

**VeloCoach AI** es una plataforma SaaS de vanguardia diseñada para procesar datos biométricos de ciclistas, analizar métricas de fatiga en tiempo real, y estructurar calendarios de entrenamiento mediante Inteligencia Artificial adaptativa. 

Su motor Core es capaz de digerir exportaciones crudas de dispositivos Garmin, filtrar el ruido, y estructurar una base de datos relacional orientada al análisis de rendimiento y la predicción gráfica del PMC (*Performance Management Chart*).

---

## ✨ Características Principales

### 1. VeloFlow AI Builder (Planificador de Canvas)
El panel central interactivo de la aplicación.
*   **Diseño Drag-and-Drop:** Arrastra nodos de entrenamiento (Resistencia, Tempo, VO2Max) para estructurar tus semanas de forma manual.
*   **Generador Basado en LLM:** Solicita un bloque de entrenamiento mediante un prompt. La IA de VeloCoach analiza tus **últimas 14 actividades**, tus niveles actuales de fatiga (CTL/ATL) y tu disponibilidad de tiempo para generar un plan de múltiples días.
*   **Grid Layout Inteligente:** Los planes largos (>7 días) se despliegan automáticamente en una cuadrícula de calendario manejable, evitando el desorden visual horizontal.
*   **Pasos Dinámicos Integrados:** La IA no solo te dice "Entrena Resistencia", sino que redacta estructuras precisas (Calentamiento, Serie Principal, Enfriamiento) inyectando duraciones y potencias específicas para cada paso.

### 2. Dashboard de Monitoreo Analítico
Panel de control para la gestión de actividades y visualización métrica.
*   **Ingesta Garmin CSV:** Analizador inteligente basado en `PapaParse` con *fuzzy matching*. Identifica cabeceras en múltiples idiomas, limpia campos nulos ("--") de Garmin Connect, y mapea todo a una base de datos validada en la nube.
*   **Pestaña "Mi Plan":** Un calendario visual y responsivo que sincroniza automáticamente con la nube el plan generado en VeloFlow. Las tarjetas muestran TSS proyectado, duraciones, la estructura paso a paso y el *Razonamiento* (Rationale) documentado por la IA de por qué eligió esos entrenamientos.
*   **Conversor Universal de UI:** Protegido nativamente contra motores de traducción de navegador para asegurar que unidades métricas técnicas (W, BPM, kJ, TSS) nunca corrompan visualmente la interfaz de React.

### 3. Motor Fisiológico (Supabase + PMC)
Cálculo en tiempo real del estado de forma sin comprometer privacidad.
*   **Supabase PostgreSQL:** La arquitectura está fuertemente sellada usando *Row Level Security* (RLS). Tu `auth.uid()` es tu única llave. El sistema no duplica actividades (usa llaves compuestas UPSERT) ni planes de entrenamiento, asegurando una base de datos limpia.
*   **Manejo de Fatiga (CTL, ATL, TSB):** Matemáticas de promedio móvil exponencial implementadas 100% in-house. Planta de semillas reales en el Día 1.
*   **Interpolación de Potencia:** Para proteger las gráficas de aquellos atletas sin potenciómetro, el motor cuenta con salvaguardas (Plan B) que inyectan una aproximación basada en la duración.

### 4. VeloCoach AI Assistant (Agente Fisiológico Asistido)
*   Integrado mediante modelos `gemini-2.5-flash` y `gemini-2.5-pro`.
*   Un "Míster" a tu disposición las 24 horas. Puede responderte preguntas sobre el ácido láctico o leer directamente tu base de datos histórica para cuestionar si te estás sobreentrenando analizando la pendiente de tu línea ATL en los últimos 7 días.

---

## 🚀 Instalación y Desarrollo Local

El proyecto está construido sobre React (TypeScript), Vite, TailwindCSS y Lucide-React.

1. **Clona el repositorio** e instala dependencias:
   ```bash
   npm install
   ```
2. **Configura tu Entorno (`.env.local`)**:
   Necesitarás las credenciales de Supabase y tu API Key de Google Gemini.
   ```env
   VITE_SUPABASE_URL="tu-url"
   VITE_SUPABASE_ANON_KEY="tu-anon-key"
   VITE_GEMINI_API_KEY="tu-gemini-key"
   ```
3. **Inicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

## 🛡️ Estructura de la Base de Datos
*   `profiles`: Información biométrica e historial de atleta (FTP, umbrales).
*   `activities`: La bóveda del historial transaccional de entrenamiento Garmin.
*   `user_schedules`: Tabla JSONB que guarda tu planificación activa de VeloFlow (con lógica UPSERT para no tener datos duplicados basura).

---
*Construido para el Alto Rendimiento.*
