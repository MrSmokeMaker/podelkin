/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_TELEMETRY_DISABLED: "1",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
