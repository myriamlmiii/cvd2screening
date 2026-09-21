export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { assertEnv } = await import("./lib/env");
  assertEnv();
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: true,
  });
}
