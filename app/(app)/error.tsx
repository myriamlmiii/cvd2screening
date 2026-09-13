"use client";

import { Button } from "@/components/ui/Button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="animate-fade-in py-16">
      <div className="max-w-md">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          Processing unavailable
        </div>
        <h1 className="mt-2 text-section text-ink">This view could not be loaded</h1>
        <p className="mt-2 text-body-sm text-ink-2">
          The screening or portfolio data for this page is temporarily unavailable.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={reset}>Retry</Button>
          <span className="font-mono text-[11px] text-ink-3">Reference: CVD-2048</span>
        </div>
      </div>
    </div>
  );
}
