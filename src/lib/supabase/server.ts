import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase SÓLO para el servidor.
 * Usa la llave service_role (secreta): nunca se envía al navegador.
 */
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en las variables de entorno");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
