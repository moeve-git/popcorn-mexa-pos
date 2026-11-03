"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PIN_COOKIE, pinToken } from "@/lib/pin";

export async function enterPin(pin: string) {
  const expected = process.env.APP_PIN;
  if (!expected) redirect("/venta");
  if (pin !== expected) return "PIN incorrecto";

  (await cookies()).set(PIN_COOKIE, await pinToken(pin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/venta");
}
