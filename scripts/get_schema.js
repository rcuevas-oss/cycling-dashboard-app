import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ejekklaxazkxkbrzcbek.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWtrbGF4YXpreGticnpjYmVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5MjM4OCwiZXhwIjoyMDg3ODY4Mzg4fQ.WxRlb7psTw5VwE8-ayj5I-iMFkwiWDq8ahiLpz5rBGo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns in activities table:', Object.keys(data[0]).join(', '));
        } else {
            console.log('Table is empty, fetching schema via REST...');
            // To get columns when empty, insert a dry run or just fetch one row - PostgREST returns empty array, but we need heads.
            // Another way: use the exact REST endpoint with OPTIONS
            const res = await fetch(`${supabaseUrl}/rest/v1/activities?limit=1`, {
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`
                }
            });
            const json = await res.json();
            console.log('REST response:', json);
            // Wait, if it's empty, we might not get keys. Let's insert a dummy row and rollback, or just fetch the OpenAPI spec!
            const specRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseServiceKey}`);
            const spec = await specRes.json();
            const activityProps = spec.definitions.activities.properties;
            console.log('Columns in activities table:', Object.keys(activityProps).join(', '));
        }
    }
}

checkSchema();
