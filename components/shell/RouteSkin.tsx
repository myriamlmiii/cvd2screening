"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Page token for CSS (workflow starfield). Theme is user-controlled. */
export function RouteSkin() {
  const pathname = usePathname();
  const page =
    pathname.startsWith("/analytics") || pathname.startsWith("/portfolio")
      ? "analytics"
      : pathname.startsWith("/workflow") || pathname.startsWith("/screening")
        ? "workflow"
        : pathname.startsWith("/review") || pathname.startsWith("/pipeline") || pathname.startsWith("/files")
          ? "review"
          : "overview";

  useEffect(() => {
    document.documentElement.dataset.page = page;
    return () => {
      delete document.documentElement.dataset.page;
    };
  }, [page]);

  return null;
}
