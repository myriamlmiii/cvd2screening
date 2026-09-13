import { vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react")>();
  return { ...mod, cache: <T extends (...args: never[]) => unknown>(fn: T) => fn };
});
