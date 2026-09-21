"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** One full-viewport scrim + panel, portaled to document.body so sidebar/header never poke through. */
export function ErpOverlay({
  children,
  onClose,
  panelClassName,
}: {
  children: React.ReactNode;
  onClose: () => void;
  panelClassName?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 block h-full w-full cursor-default border-0 p-0"
        style={{ background: "rgba(0, 0, 0, 0.5)" }}
        onClick={onClose}
      />
      <div className={cn("relative z-[1] w-full rounded-2xl bg-white p-5 shadow-overlay", panelClassName)} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
