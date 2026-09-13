/* ============================================================
   Internal vs External sourcing, inferred from the free-text
   SOURCE field — there is no explicit Internal/External field in
   the base. This is a best-effort heuristic, not ground truth:

     - contains "outbound"                          -> internal
     - contains "inbound"                            -> external
     - matches a known partner/event/community name  -> external
       (GITEX, VivaTech, Tech Tour, Renew Capital, Betawaves,
       LaunchAfrica, AfricArena, Plug and Play, Orange Fab, Kalys,
       Witamax, UM6P, CDG, 212 Founders, Al Akhawayn)
     - otherwise (a bare person/team name, e.g. "DL", "TB",
       "U Team") -> internal, on the assumption that an unqualified
       name with no organization is a team member or scout
     - empty/missing -> unspecified

   If this classification doesn't match how the fund actually
   thinks about Internal/External, replace the rule here — every
   view that filters by it reads from this one function.
   ============================================================ */

export type SourceCategory = "internal" | "external" | "unspecified";

const EXTERNAL_PATTERNS = [
  "gitex",
  "vivatech",
  "tech tour",
  "renew capital",
  "betawaves",
  "launchafrica",
  "launch africa",
  "africarena",
  "plug and play",
  "orange fab",
  "kalys",
  "witamax",
  "um6p",
  "cdg",
  "212 founders",
  "akhawayn",
  "startup world cup",
  "holmarcom",
  "iberia",
  "dts 2025",
  "wam 2026",
];

export function sourceCategory(source: string | null): SourceCategory {
  if (!source || !source.trim()) return "unspecified";
  const s = source.toLowerCase();
  if (s.includes("outbound")) return "internal";
  if (s.includes("inbound")) return "external";
  if (EXTERNAL_PATTERNS.some((p) => s.includes(p))) return "external";
  return "internal";
}
