import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-8">
      <div className="max-w-md">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          CVD 2.0 · 404
        </div>
        <h1 className="mt-2 text-title text-ink">Record not found</h1>
        <p className="mt-2 text-body-sm text-ink-2">
          This page or record does not exist, or has been archived.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-9 items-center rounded-lg bg-cvd px-4 text-body-sm font-medium text-white"
        >
          Situation
        </Link>
      </div>
    </div>
  );
}
