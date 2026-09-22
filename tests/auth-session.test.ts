import { describe, expect, it } from "vitest";
import { allowedEmails, createSessionToken, credentialsMatch, readSessionToken } from "@/lib/auth/session";

describe("demo session", () => {
  it("accepts the supervisor preview credentials", () => {
    expect(credentialsMatch("investors123@gmail.com", "12345@")).toBe(true);
    expect(credentialsMatch("Investors123@gmail.com", "12345@")).toBe(true);
    expect(credentialsMatch("investors123@gmail.com", "wrong")).toBe(false);
  });

  it("allows Meriem, Driss, and Jonathan", () => {
    expect(allowedEmails()).toEqual(expect.arrayContaining([
      "lmeriem28@gmail.com",
      "dlaraki@u-investors.com",
      "j.lobe@u-investors.com",
    ]));
    expect(credentialsMatch("lmeriem28@gmail.com", "12345@")).toBe(true);
    expect(credentialsMatch("dlaraki@u-investors.com", "12345@")).toBe(true);
    expect(credentialsMatch("j.lobe@u-investors.com", "12345@")).toBe(true);
    expect(credentialsMatch("unknown@example.com", "12345@")).toBe(false);
  });

  it("round-trips a signed cookie payload", async () => {
    const token = await createSessionToken("investors123@gmail.com");
    const session = await readSessionToken(token);
    expect(session?.email).toBe("investors123@gmail.com");
    expect(await readSessionToken("tampered")).toBeNull();
  });
});
