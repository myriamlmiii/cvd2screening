import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));

export const envSchema = z.object({
  AIRTABLE_TOKEN: z.string().optional(),
  AIRTABLE_API_KEY: z.string().optional(),
  AIRTABLE_BASE_ID: z.string().optional(),
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  INTAKE_WEBHOOK_SECRET: z.string().optional(),
  AUTH_REQUIRED: z.enum(["true", "false"]).optional(),
  APP_ROLE: z.enum(["Viewer", "Reviewer", "Admin"]).optional(),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  AI_PROVIDER: z.enum(["groq", "openai", "anthropic"]).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    console.error("[env] invalid environment", parsed.error.flatten().fieldErrors);
    return envSchema.parse({});
  }
  return parsed.data;
}
