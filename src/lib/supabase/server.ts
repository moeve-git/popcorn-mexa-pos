import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase SÓLO para el servidor.
 * Usa la llave service_role / secret (secreta): nunca se envía al navegador.
 */
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en las variables de entorno");
  }
  if (isPublicKey(key)) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY tiene la llave pública (anon/publishable). Usa la llave secreta: service_role o sb_secret_…",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isPublicKey(key: string) {
  if (key.startsWith("sb_publishable_")) return true;
  if (key.startsWith("sb_secret_")) return false;
  // Llaves JWT antiguas: revisamos el rol dentro del token
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
    return payload.role === "anon";
  } catch {
    return false;
  }
}
