import { NextResponse, type NextRequest } from "next/server";
import { PIN_COOKIE, pinToken } from "@/lib/pin";

/**
 * Sin login. Si defines APP_PIN en Vercel, se pide el PIN una sola vez
 * por dispositivo (se recuerda 1 año). Si no lo defines, la app queda abierta.
 */
export async function proxy(request: NextRequest) {
  const pin = process.env.APP_PIN;
  const isAccess = request.nextUrl.pathname.startsWith("/acceso");

  if (!pin) {
    if (isAccess) return NextResponse.redirect(new URL("/venta", request.url));
    return NextResponse.next();
  }

  const ok = request.cookies.get(PIN_COOKIE)?.value === (await pinToken(pin));

  if (!ok && !isAccess) {
    return NextResponse.redirect(new URL("/acceso", request.url));
  }
  if (ok && isAccess) {
    return NextResponse.redirect(new URL("/venta", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
