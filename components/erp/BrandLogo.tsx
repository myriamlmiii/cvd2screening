"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  size = "nav",
  className,
}: {
  size?: "nav" | "hero";
  className?: string;
}) {
  const hero = size === "hero";
  return (
    <div className={cn("brand-logo", hero && "brand-logo--hero", className)}>
      <div className="brand-logo__orb">
        <Image
          src="/brand/mark-3d.png"
          alt="U-Investors"
          width={hero ? 88 : 32}
          height={hero ? 88 : 32}
          className="brand-logo__img"
          priority={hero}
        />
      </div>
      <div className={cn("leading-tight", hero ? "mt-3 text-center" : "")}>
        <div className={cn("font-semibold tracking-tight", hero ? "text-[22px] text-[#0c2340]" : "text-[15px] text-white")}>
          U-investors
        </div>
        {hero ? <div className="text-[12px] text-ink-3">CVD 2.0 · ERP & CRM</div> : null}
      </div>
    </div>
  );
}
