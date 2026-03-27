import { createClient } from "npm:@supabase/supabase-js@2";
import { buildGarminFitIngestPayloadWithOfficialSdk } from "./garminFitSdk.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function saveFailedParse(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  fileHash: string,
  bucketName: string,
  storagePath: string,
  originalFilename: string,
  fileSizeBytes: number,
  parseError: string,
) {
  await serviceClient.from("activity_files").upsert(
    {
      user_id: userId,
      file_hash: fileHash,
      bucket_name: bucketName,
      storage_path: storagePath,
      original_filename: originalFilename,
      file_size_bytes: fileSizeBytes,
      source_type: "fit",
      parse_status: "failed",
      parse_error: parseError,
      parsed_at: null,
    },
    { onConflict: "user_id,file_hash" },
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Método no permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Faltan variables de entorno de Supabase." }, 500);
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Falta el token de autorización." }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "No fue posible autenticar al usuario." }, 401);
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const body = await request.json().catch(() => null) as
    | { storagePath?: string; bucketName?: string; originalFilename?: string }
    | null;

  const bucketName = body?.bucketName ?? "fit-files";
  const storagePath = body?.storagePath;
  const originalFilename = body?.originalFilename ?? "activity.fit";

  if (!storagePath || !originalFilename.toLowerCase().endsWith(".fit")) {
    return jsonResponse({ error: "Debes indicar un archivo .fit válido." }, 400);
  }

  const { data: fileBlob, error: downloadError } = await serviceClient.storage
    .from(bucketName)
    .download(storagePath);

  if (downloadError || !fileBlob) {
    return jsonResponse({ error: "No se pudo descargar el archivo desde Storage." }, 400);
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const fileSizeBytes = arrayBuffer.byteLength;

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return jsonResponse({ error: "El archivo FIT supera el tamaño máximo permitido." }, 400);
  }

  const fileHash = toHex(await crypto.subtle.digest("SHA-256", arrayBuffer));

  try {
    const payload = buildGarminFitIngestPayloadWithOfficialSdk(arrayBuffer, {
      userId: user.id,
      fileHash,
      bucketName,
      storagePath,
      originalFilename,
      fileSizeBytes,
    });

    const { data, error } = await serviceClient.rpc("ingest_fit_activity", { payload });

    if (error) {
      throw error;
    }

    if (data?.status === "duplicate") {
      await serviceClient.storage.from(bucketName).remove([storagePath]);
    }

    return jsonResponse({
      session_id: data?.session_id ?? null,
      status: data?.status ?? "inserted",
      laps_inserted: data?.laps_inserted ?? 0,
      steps_inserted: data?.steps_inserted ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido parseando FIT.";
    await saveFailedParse(
      serviceClient,
      user.id,
      fileHash,
      bucketName,
      storagePath,
      originalFilename,
      fileSizeBytes,
      message,
    );
    return jsonResponse({ error: message }, 400);
  }
});
