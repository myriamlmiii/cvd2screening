export function clipText(value: string | null | undefined, max: number): string {
  const s = (value || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= max) return s;
  const slice = s.slice(0, Math.max(1, max - 1));
  const cut = slice.lastIndexOf(" ");
  const base = cut >= Math.floor(max * 0.45) ? slice.slice(0, cut) : slice;
  return `${base.replace(/[\s.,;:/\-]+$/, "")}…`;
}
