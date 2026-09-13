export function logOp(fields: Record<string, string | number | boolean | null | undefined>) {
  const line = { ts: new Date().toISOString(), ...fields };
  console.info(JSON.stringify(line));
}
