export function UMark({ className, size = 72 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="u-tile" x1="8" y1="6" x2="74" y2="76" gradientUnits="userSpaceOnUse">
          <stop stopColor="#243656" />
          <stop offset="1" stopColor="#0f1c30" />
        </linearGradient>
        <linearGradient id="u-letter" x1="24" y1="18" x2="56" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5eead4" />
          <stop offset="0.45" stopColor="#1B2B44" />
          <stop offset="1" stopColor="#0b1626" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="76" height="76" rx="18" fill="#c9a227" />
      <rect x="5" y="5" width="70" height="70" rx="16" fill="url(#u-tile)" />
      <path
        d="M24 22c0-1.7 1.4-3 3-3h5c1.7 0 3 1.3 3 3v18.5c0 6.4 4.6 10.5 11 10.5s11-4.1 11-10.5V22c0-1.7 1.3-3 3-3h5c1.6 0 3 1.3 3 3v19c0 12.2-9 21-22 21s-22-8.8-22-21V22Z"
        fill="url(#u-letter)"
      />
      <path
        d="M27 19h5c1.1 0 2 .9 2 2v19.5c0 7.3 5.3 12.5 12 12.5s12-5.2 12-12.5V21c0-1.1.9-2 2-2"
        stroke="#7dd3c7"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
