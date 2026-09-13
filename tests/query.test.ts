import { describe, expect, it } from "vitest";
import { filterStartups, startupQuerySchema } from "@/lib/startups/filter";
import { deal } from "./fixtures";

describe("filterStartups", () => {
  const deals = [
    deal({ id: "a", name: "Alpha Pay", sector: "Fintech", status: "En étude", country: "France" }),
    deal({ id: "b", name: "Beta Shop", sector: "E-commerce", status: "Déclinée", country: "Maroc" }),
  ];

  it("filters by sector server-side without returning the rest", () => {
    const q = startupQuerySchema.parse({ sector: "Fintech", pageSize: 40 });
    const rows = filterStartups(deals, q);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Alpha Pay");
  });

  it("searches name and description", () => {
    const q = startupQuerySchema.parse({ q: "shop" });
    expect(filterStartups(deals, q).map((d) => d.id)).toEqual(["b"]);
  });
});
