import { z } from "zod";

const emptyToUndef = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    AIRTABLE_TOKEN: emptyToUndef,
    AIRTABLE_API_KEY: emptyToUndef,
    AIRTABLE_BASE_ID: emptyToUndef,
    SUPABASE_URL: emptyToUndef,
    SUPABASE_ANON_KEY: emptyToUndef,
    SUPABASE_SERVICE_ROLE_KEY: emptyToUndef,
    GROQ_API_KEY: emptyToUndef,
    INTAKE_WEBHOOK_SECRET: emptyToUndef,
    SYNC_WEBHOOK_SECRET: emptyToUndef,
    CRON_SECRET: emptyToUndef,
    AUTH_REQUIRED: z.enum(["true", "false"]).optional(),
    AUTH_SECRET: emptyToUndef,
    DEMO_EMAIL: emptyToUndef,
    DEMO_PASSWORD: emptyToUndef,
    ALLOWED_EMAILS: emptyToUndef,
    TEAM_DRISS_EMAIL: emptyToUndef,
    TEAM_JONATHAN_EMAIL: emptyToUndef,
    APP_ROLE: z.enum(["Viewer", "Reviewer", "Admin"]).optional(),
    GOOGLE_DRIVE_FOLDER_IDS: emptyToUndef,
    GOOGLE_SERVICE_ACCOUNT_KEY: emptyToUndef,
    SENTRY_DSN: emptyToUndef,
    NEXT_PUBLIC_SENTRY_DSN: emptyToUndef,
    UPSTASH_REDIS_REST_URL: emptyToUndef,
    UPSTASH_REDIS_REST_TOKEN: emptyToUndef,
    AI_PROVIDER: z.enum(["groq", "openai", "anthropic"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.GOOGLE_DRIVE_FOLDER_IDS && !data.GOOGLE_SERVICE_ACCOUNT_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_SERVICE_ACCOUNT_KEY"],
        message: "GOOGLE_DRIVE_FOLDER_IDS is set but GOOGLE_SERVICE_ACCOUNT_KEY is empty — folder ingest will no-op.",
      });
    }
    if (data.UPSTASH_REDIS_REST_URL && !data.UPSTASH_REDIS_REST_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["UPSTASH_REDIS_REST_TOKEN"],
        message: "UPSTASH_REDIS_REST_URL is set without UPSTASH_REDIS_REST_TOKEN.",
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    console.error("[env] invalid environment", parsed.error.flatten().fieldErrors);
    return envSchema.parse({ NODE_ENV: source.NODE_ENV });
  }
  return parsed.data;
}

/** Boot-time check. Logs pairing mistakes (Drive folders without a key). Throws only for AUTH_SECRET in production. */
export function assertEnv(source: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`).join("\n");
    console.error(`[env] ${issues}`);
  }
  if (source.AUTH_REQUIRED === "true" && source.NODE_ENV === "production" && !source.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is required when AUTH_REQUIRED=true in production.");
  }
  return readEnv(source);
}
