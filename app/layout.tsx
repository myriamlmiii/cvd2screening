import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/components/shell/ThemeToggle";
import { LocaleProvider } from "@/lib/i18n";
import { AppToaster } from "@/components/ui/Toaster";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const heading = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CVD 2.0 · U-Investors",
  description:
    "Corporate Venture Development. Investment intelligence, screening and post-investment value creation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${sans.variable} ${mono.variable} ${heading.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Clash Display isn't on Google Fonts — served from Fontshare. --font-display
            falls back to Space Grotesk (see globals.css) if this request fails, so
            hero numbers never render in the browser default sans. */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@600&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans text-body antialiased">
        <LocaleProvider>
          {children}
          <AppToaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
