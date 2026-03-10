# Cycling AI Trainer - Backend & Analytics Core

**Cycling AI Trainer** es una plataforma SaaS diseñada para procesar datos biométricos y telemétricos de ciclistas profesionales. Su núcleo es un motor capaz de ingerir exportaciones crudas de dispositivos Garmin, filtrar el ruido, y estructurar una base de datos relacional orientada al análisis de rendimiento y predicción de zonas mediante Inteligencia Artificial.

## 🧠 Arquitectura del Sistema

La plataforma está dividida en módulos de extracción, estructuración y biometría.

### 1. Ingesta de Datos (Garmin CSV Parser)
El módulo principal (`src/components/Dashboard.tsx`) procesa archivos `.csv` de Garmin Connect que contienen hasta 34 columnas complejas. Es una zona crítica de procesamiento de datos en el cliente.
- **Fuzzy Matching Automático**: Implementa un mapeo difuso de cabeceras multilenguaje, soportando CSVs exportados en inglés o español, y absorbiendo cambios en el nombre de las columnas. Resuelve automáticamente delimitadores de comas o punto y comas usando `PapaParse`.
- **Limpieza de Intervalos Vacíos (`tTime`)**: Garmin exporta comúnmente cadenas de texto basura (`"--"`, `"--:--:--"`) en campos de tiempo nulos cuando el reloj se desconecta o no tiene sensores (e.g. Descompresión, Tiempo en movimiento). Esta zona aplica expresiones regulares (`/^[-:\\s]+$/`) para castar esos strings vacíos forzados a `null` de postgres, *previniendo el error crítico `invalid input syntax for type interval`* al impactar en Supabase.
- **Limpieza Numérica (`tNum`)**: Convierte strings con comas europeas (ej. `34,5`) a puntos flotantes nativos. Extrae promedios y mapea a jerarquía estructurada.

### 2. Motor Analítico Fisiológico (Performance Management Chart - PMC)
Ubicado en `src/lib/metricsUtils.ts`, el sistema proyecta la Carga Cardiovascular del atleta sin recurrir a librerías externas. La métrica y madurez de datos se evalúa en el cliente:
- **Resiliencia TSS (Plan B)**: Para salvaguardar los gráficos cuando un atleta corre sin potenciómetro, el sistema intercepta las actividades sin `training_stress_score`. Evita inyectar un cero (que hundiría artificialmente la gráfica) e inyecta una estimación base de **50 TSS por hora** procesando la columna `duration_minutes`.
- **Cálculos Strict TrainingPeaks**: La Matemática de Media Móvil Exponencial (EMA) no asume un inicio con valores en 0, sino que planta la "Semilla" de CTL y ATL igual al TSS exacto del Día 1.
- **Spans y Madurez de Datos**: Analiza la densidad del historial. Resta estrictamente en el calendario los días entre `firstAvailableDate` y `lastAvailableDate`, clasificando el modelo en `insufficient` (<20d), `provisional` (<42d) y `calibrated` (>42d), y bloqueando proyecciones fantasmas para evitar que el UI engañe al ciclista.

### 3. Estructura de Base de Datos (Supabase)
El ecosistema de datos está hosteado en **Supabase** (PostgreSQL) y emplea estrictas normas de integridad:

*   **Tabla de Actividades (`activities`):** El almacén transaccional masivo. Organizado por familias (Metadatos Base, Frecuencia Cardíaca, Velocidad/Ritmo, Potencia, Cadencia, Clima). 
*   **Gestor Anti-Duplicados:** Implementa políticas de tipo `UPSERT` en base a una llave compuesta única (`user_id` + `fecha_actividad` + `distancia_km`) permitiendo entrenamientos dobles en un día sin clonar registros erróneos.

### 3. Perfiles de Atletas y Contexto Biométrico
Para que un algoritmo de Inteligencia artificial defina un plan, necesita conocer la "carrocería" y el "motor" del ciclista.

*   **Tabla `athlete_profiles`:** Registra Nombre, Sexo Biológico, Disciplina Principal (Ruta, MTB, Pista) y el **FTP Manual Autorreportado** para evitar sesgos de cálculos inexactos.
*   **Tabla de Transacciones de Peso (`weight_history`):** Diario biométrico automatizado. Registra un historial logarítmico cronometrado cada vez que el ciclista altera su peso corpóreo. Esto permite a la futura inteligencia artificial cruzar picos térmicos de rendimiento (W/kg) contra las bajadas o subidas repentinas de masa.

## 🔐 Seguridad e Identidad
Toda la arquitectura Backend está sellada a través de **Políticas de Seguridad a Nivel de Fila (RLS)** instaladas directamente en Supabase. Garantiza a nivel criptográfico que un usuario autenticado solo puede inyectar y realizar consultas (SELECT) sobre perfiles o actividades estrictamente vinculadas a su `auth.uid()`.

---

## 🚀 Próximas Fases: El Motor de IA
La base de datos actual está preparada para la inserción del **Motor de Machine Learning / IA Generativa**. La IA tomará como contexto principal la cronología del desgaste (Training Stress Score) unida al histórico del peso y FTP, buscando generar calendarios automatizados predictivos que le digan al ciclista cuándo forzar el paso y cuándo recuperar para evitar el sobre-entrenamiento.

## 🖥️ Interfaz de Usuario
Actualmente, la aplicación está enfocada en la funcionalidad central o "Core Backend". **No cuenta con una Landing Page pública**.
El enrutamiento inicia directamente en el sistema de autenticación, dando paso inmediato al panel de control (`Dashboard`), el planificador (`TrainingPlanner`) y el perfil del atleta una vez que se inicia sesión.
