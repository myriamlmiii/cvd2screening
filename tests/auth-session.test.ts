import { describe, expect, it } from "vitest";
import { createSessionToken, credentialsMatch, readSessionToken } from "@/lib/auth/session";

describe("demo session", () => {
  it("accepts the supervisor preview credentials", () => {
    expect(credentialsMatch("investors123@gmail.com", "1234@5")).toBe(true);
    expect(credentialsMatch("Investors123@gmail.com", "1234@5")).toBe(true);
    expect(credentialsMatch("investors123@gmail.com", "wrong")).toBe(false);
  });

  it("round-trips a signed cookie payload", async () => {
    const token = await createSessionToken("investors123@gmail.com");
    const session = await readSessionToken(token);
    expect(session?.email).toBe("investors123@gmail.com");
    expect(await readSessionToken("tampered")).toBeNull();
  });
});
