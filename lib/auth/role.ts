export type AppRole = "Viewer" | "Reviewer" | "Admin";

const RANK: Record<AppRole, number> = { Viewer: 0, Reviewer: 1, Admin: 2 };

export function currentRole(source: NodeJS.ProcessEnv = process.env): AppRole {
  const raw = source.APP_ROLE;
  if (raw === "Viewer" || raw === "Reviewer" || raw === "Admin") return raw;
  return "Reviewer";
}

export function canMutate(role: AppRole = currentRole()): boolean {
  return RANK[role] >= RANK.Reviewer;
}
