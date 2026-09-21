import { parseAiMemo, type AiMemo } from "@/lib/ai/schema";
import { logOp } from "@/lib/log";
import { withBackoff } from "@/lib/retry";

export type ChatMessage = { role: "system" | "user"; content: string };

export interface AIProvider {
  id: string;
  complete(messages: ChatMessage[]): Promise<string>;
}

export class GroqProvider implements AIProvider {
  id = "groq";
  constructor(
    private key: string,
    private model = "llama-3.3-70b-versatile",
  ) {}

  async complete(messages: ChatMessage[]): Promise<string> {
    return withBackoff(async () => {
      const started = Date.now();
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, temperature: 0.2, max_tokens: 700, messages }),
      });
      logOp({ op: "ai.complete", provider: this.id, status: res.status, duration_ms: Date.now() - started });
      if (!res.ok) throw new Error(`AI provider failed (${res.status})`);
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return json.choices?.[0]?.message?.content || "";
    });
  }
}

export function getAIProvider(): AIProvider | null {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return new GroqProvider(key);
}

export async function completeText(messages: ChatMessage[]): Promise<string | null> {
  const provider = getAIProvider();
  if (!provider) return null;
  return provider.complete(messages);
}

export async function completeMemo(messages: ChatMessage[]): Promise<AiMemo | null> {
  const provider = getAIProvider();
  if (!provider) return null;
  const text = await provider.complete(messages);
  return parseAiMemo(text);
}
