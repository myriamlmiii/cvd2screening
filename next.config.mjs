/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["unpdf", "mammoth"],
  },
};

export default nextConfig;
