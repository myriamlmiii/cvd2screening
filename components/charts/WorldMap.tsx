"use client";

import { useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import countries110m from "world-atlas/countries-110m.json";
import { toMapCountryName } from "@/lib/countries";

type Geo = { rsmKey: string; properties: { name?: string } };

const MULTI = ["#c45c4a", "#5a9a62", "#d4b85a", "#4a6a8a", "#7a5a9a", "#4a9a9a", "#c47a4a"];

function hashHue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return MULTI[h % MULTI.length];
}

export function WorldMap({
  data,
  onCountryClick,
  height = 220,
  showMarkers = true,
  palette = "accent",
}: {
  data: { label: string; count: number }[];
  onCountryClick?: (label: string, e: React.MouseEvent) => void;
  height?: number;
  showMarkers?: boolean;
  palette?: "accent" | "multi";
}) {
  const counts = useMemo(() => {
    const m = new Map<string, { count: number; label: string }>();
    for (const d of data) {
      const en = toMapCountryName(d.label);
      if (en) m.set(en, { count: d.count, label: d.label });
    }
    return m;
  }, [data]);
  const max = Math.max(1, ...Array.from(counts.values()).map((v) => v.count));
  const markers: { key: string; count: number; label: string; coords: [number, number] }[] = [];

  return (
    <div className="w-full" style={{ height }}>
      <ComposableMap projectionConfig={{ scale: 118 }} width={800} height={400} style={{ width: "100%", height: "100%" }}>
        <Geographies geography={countries110m}>
          {({ geographies }: { geographies: Geo[] }) =>
            geographies.map((geo) => {
              const name = geo.properties.name ?? "";
              const hit = counts.get(name);
              if (hit && showMarkers) {
                const centroid = geoCentroid(geo as unknown as Parameters<typeof geoCentroid>[0]);
                if (Number.isFinite(centroid[0]) && Number.isFinite(centroid[1])) {
                  markers.push({ key: geo.rsmKey, count: hit.count, label: hit.label, coords: centroid });
                }
              }
              const fill = hit
                ? palette === "multi"
                  ? hashHue(hit.label)
                  : "var(--cvd)"
                : "var(--map-empty, var(--surface-2))";
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={(e) => hit && onCountryClick?.(hit.label, e as unknown as React.MouseEvent)}
                  style={{
                    default: {
                      fill,
                      fillOpacity: hit ? (palette === "multi" ? 0.85 : 0.3 + 0.5 * (hit.count / max)) : 1,
                      stroke: "var(--line)",
                      strokeWidth: 0.4,
                      outline: "none",
                      cursor: hit ? "pointer" : "default",
                    },
                    hover: {
                      fill,
                      fillOpacity: hit ? 1 : 1,
                      stroke: "var(--line-strong)",
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    pressed: { fill, outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
        {showMarkers &&
          markers.map((m) => (
            <Marker key={m.key} coordinates={m.coords}>
              <circle r={7.5} fill="var(--cvd)" stroke="var(--surface)" strokeWidth={1.5} />
              <text
                textAnchor="middle"
                y={2.5}
                style={{ fontSize: 7.5, fontWeight: 700, fontFamily: "var(--font-mono)", fill: "#14151a" }}
              >
                {m.count}
              </text>
            </Marker>
          ))}
      </ComposableMap>
    </div>
  );
}
