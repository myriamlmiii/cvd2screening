/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    instrumentationHook: true,
  },
  async redirects() {
    return [
      { source: "/review", destination: "/pipeline", permanent: false },
      { source: "/workflow", destination: "/", permanent: false },
      { source: "/files", destination: "/documents", permanent: false },
      { source: "/analytics", destination: "/analyses", permanent: false },
      { source: "/screening", destination: "/", permanent: false },
      { source: "/screening/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
