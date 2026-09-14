import { NextResponse } from "next/server";
import { credentialsMatch, createSessionToken, demoEmail, sessionCookieName, sessionMaxAge } from "@/lib/auth/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = String(body?.email || "");
  const password = String(body?.password || "");
  if (!credentialsMatch(email, password)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  const token = await createSessionToken(demoEmail());
  const res = NextResponse.json({ ok: true, email: demoEmail() });
  res.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge(),
  });
  return res;
}
