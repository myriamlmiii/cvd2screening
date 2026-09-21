import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authIsRequired, readSessionToken, sessionCookieName } from "@/lib/auth/session";

function isOpen(pathname: string) {
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/webhooks")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  if (!authIsRequired()) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (isOpen(pathname)) return NextResponse.next();

  const session = await readSessionToken(req.cookies.get(sessionCookieName())?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
