# Cycling AI Trainer - Backend & Analytics Core

**Cycling AI Trainer** es una plataforma SaaS diseñada para procesar datos biométricos y telemétricos de ciclistas profesionales. Su núcleo es un motor capaz de ingerir exportaciones crudas de dispositivos Garmin, filtrar el ruido, y estructurar una base de datos relacional orientada al análisis de rendimiento y predicción de zonas mediante Inteligencia Artificial.

## 🧠 Arquitectura del Sistema

La plataforma está dividida en módulos de extracción, estructuración y biometría.

### 1. Ingesta de Datos (Garmin CSV Parser)
El módulo principal procesa archivos `.csv` de Garmin Connect que contienen hasta 34 columnas complejas.
- **Limpieza Automática:** El parser implementado en React procesa valores nulos (`--`), conserva decimales cruciales y reforma estructuras de tiempo.
- **Unificación de Mapeo:** Traduce y agrupa columnas híbridas (Spanglish) hacia una jerarquía estandarizada en Familias Logicas.

### 2. Estructura de Base de Datos (Supabase)
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
