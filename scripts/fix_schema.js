import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ejekklaxazkxkbrzcbek.supabase.co';
// Usando llave de servicio para Bypass RLS y permisos administrativos.
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWtrbGF4YXpreGticnpjYmVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MjM4OCwiZXhwIjoyMDg3ODY4Mzg4fQ.WxRlb7psTw5VwE8-ayj5I-iMFkwiWDq8ahiLpz5rBGo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDatabase() {
    console.log('⏳ Ejecutando comandos DDL para corregir tabla activities en caliente...');

    // Utilizaremos un hack seguro desde RPC para ejecutar multiples lineas SQL si es posible
    // Pero la mejor manera via API rest de Service Role es llamar a la insercion de una fn y ejecutarla.

    // Como DDL directo suele requerir RPC para no ensuciar DB, vamos a intentarlo a traves de postgREST
    const query = `
    ALTER TABLE IF EXISTS public.activities 
    ADD COLUMN IF NOT EXISTS ascenso_total numeric,
    ADD COLUMN IF NOT EXISTS descenso_total numeric,
    ADD COLUMN IF NOT EXISTS temperatura_min numeric,
    ADD COLUMN IF NOT EXISTS temperatura_max numeric,
    ADD COLUMN IF NOT EXISTS numero_vueltas numeric,
    ADD COLUMN IF NOT EXISTS despues_vueltas numeric,
    ADD COLUMN IF NOT EXISTS tiempo_movimiento interval,
    ADD COLUMN IF NOT EXISTS tiempo_transcurrido interval,
    ADD COLUMN IF NOT EXISTS descompresion text,
    ADD COLUMN IF NOT EXISTS altura_max numeric,
    ADD COLUMN IF NOT EXISTS altura_min numeric,
    ADD COLUMN IF NOT EXISTS mejor_vuelta interval,
    ADD COLUMN IF NOT EXISTS resp_media numeric,
    ADD COLUMN IF NOT EXISTS resp_min numeric,
    ADD COLUMN IF NOT EXISTS resp_max numeric,
    ADD COLUMN IF NOT EXISTS velocidad_maxima numeric;
  `;

    // Workaround: crear una funcion y llamarla
    console.log("Creando funcion temporal rpc_exec...");
    const { error: fnError } = await supabase.rpc('exec_sql', { query: query });

    if (fnError) {
        console.log('❌ El método RPC falló porque la DB no tiene una funcion exec_sql permitida:', fnError.message);
        process.exit(1);
    } else {
        console.log('✅ Columnas creadas con exito!');
        process.exit(0);
    }
}

fixDatabase();
