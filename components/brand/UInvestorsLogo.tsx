"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Extruded bronze “U” with U-Investors wordmark. Hero sits in main; mark sits in nav. */
export function UInvestorsLogo({
  size = "hero",
  className,
}: {
  size?: "hero" | "nav";
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const hero = size === "hero";

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * (hero ? 16 : 8)).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * (hero ? 22 : 12)).toFixed(2)}deg`);
  };

  const onLeave = () => {
    const el = wrap.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      ref={wrap}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("u-logo", hero ? "u-logo--hero" : "u-logo--nav", className)}
    >
      <div className="u-logo__stage">
        <div className="u-logo__ring" />
        <div className="u-logo__mark" aria-hidden>
          <span className="u-logo__face">U</span>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="u-logo__slice" style={{ ["--i" as string]: i }}>
              U
            </span>
          ))}
        </div>
      </div>
      {hero && (
        <div className="u-logo__word">
          <div className="u-logo__name">U-Investors</div>
          <div className="u-logo__tag">Corporate Venture Development</div>
        </div>
      )}
    </div>
  );
}

export function SceneBackground() {
  return (
    <div className="scene-3d" aria-hidden>
      <div className="scene-3d__glow scene-3d__glow--a" />
      <div className="scene-3d__glow scene-3d__glow--b" />
      <div className="scene-3d__floor" />
      <div className="scene-3d__horizon" />
    </div>
  );
}
