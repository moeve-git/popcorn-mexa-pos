export const PIN_COOKIE = "pcm_access";

/** Valor que se guarda en la cookie cuando el PIN es correcto */
export async function pinToken(pin: string) {
  const data = new TextEncoder().encode(`popcorn-mexa:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
