"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

export function LoginMark3D() {
  const wrap = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [pressed, setPressed] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -16, y: px * 22 });
  }, []);

  const reset = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  return (
    <div
      ref={wrap}
      className="login-mark relative mx-auto h-44 w-44 cursor-grab select-none sm:h-52 sm:w-52"
      style={{ perspective: "900px" }}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      role="img"
      aria-label="U-investors"
    >
      <div className="pointer-events-none absolute inset-[-18%] animate-login-orbit rounded-full border border-white/10" />
      <div className="pointer-events-none absolute inset-[-8%] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.35),transparent_68%)] blur-md" />
      <div
        className="login-mark__stage relative h-full w-full will-change-transform"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${pressed ? 0.96 : 1})`,
          transformStyle: "preserve-3d",
          transition: "transform 160ms ease-out",
        }}
      >
        <div className="animate-login-float h-full w-full" style={{ transformStyle: "preserve-3d" }}>
          <Image
            src="/brand/mark-3d.png"
            alt=""
            width={416}
            height={416}
            priority
            className="relative z-[1] h-full w-full rounded-[28%] object-cover shadow-[0_30px_60px_-20px_rgba(0,0,0,0.65)]"
            draggable={false}
          />
          <span className="login-mark__shine pointer-events-none absolute inset-0 overflow-hidden rounded-[28%]">
            <span className="absolute -left-1/3 top-[-20%] h-[140%] w-1/3 animate-login-shine bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </span>
        </div>
      </div>
    </div>
  );
}
