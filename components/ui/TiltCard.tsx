"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const MAX_DEG = 5;

/** Wraps children in a card that tilts a few degrees toward the cursor on
    hover — subtle physical depth, not a gimmick. No dependency: a plain
    mousemove handler computing rotateX/rotateY from cursor position. */
export function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * (MAX_DEG * 2);
    const rotateX = (0.5 - py) * (MAX_DEG * 2);
    el.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
  };

  const onMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn(
        "shadow-elevate transition-[transform,box-shadow] duration-200 ease-out will-change-transform hover:shadow-elevate-hover",
        className,
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}
