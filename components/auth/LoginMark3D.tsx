"use client";

import { useCallback, useRef, useState } from "react";
import { UMark } from "@/components/brand/UMark";

export function LoginMark3D() {
  const wrap = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -10, y: px * 14 });
  }, []);

  return (
    <div
      ref={wrap}
      className="relative mx-auto h-[88px] w-[88px]"
      style={{ perspective: "700px" }}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      role="img"
      aria-label="U-investors"
    >
      <div
        className="h-full w-full"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 160ms ease-out",
        }}
      >
        <UMark size={88} className="h-full w-full drop-shadow-md" />
      </div>
    </div>
  );
}
