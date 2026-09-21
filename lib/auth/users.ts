import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/services/supabase-rest";
import { readSessionToken, sessionCookieName } from "@/lib/auth/session";

export type CrmUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export const KNOWN_TEAM: { email: string; name: string; role: string }[] = [
  { email: "lmeriem28@gmail.com", name: "Meriem", role: "Analyste" },
  { email: "dlaraki@u-investors.com", name: "Driss", role: "Managing Director" },
  { email: "j.lobe@u-investors.com", name: "Jonathan", role: "Analyste" },
];

export function teamSeedRows() {
  return [...KNOWN_TEAM];
}

export async function findUserByEmail(email: string): Promise<CrmUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const result = await supabaseAdmin<CrmUser[]>(
    `users?email=eq.${encodeURIComponent(normalized)}&select=id,email,name,role&limit=1`,
  );
  return result.ok ? result.data?.[0] ?? null : null;
}

export async function currentCrmUser(): Promise<CrmUser | null> {
  const session = await readSessionToken(cookies().get(sessionCookieName())?.value);
  if (!session?.email) return null;
  return findUserByEmail(session.email);
}

export async function seedKnownUsers() {
  const rows = teamSeedRows();
  const result = await supabaseAdmin<CrmUser[]>("users?on_conflict=email", {
    method: "POST",
    body: JSON.stringify(rows),
    prefer: "resolution=merge-duplicates,return=representation",
  });
  return result;
}
