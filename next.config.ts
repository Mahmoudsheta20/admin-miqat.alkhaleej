import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.MIQAT_E2E === "1" ? ".next-e2e" : ".next",
  devIndicators: false,
  experimental: {
    proxyTimeout: 150_000,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'miqatalkhaleej.s3.eu-central-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },
  async rewrites() {
    const rawBackend = (
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:5001"
    )
      .trim()
      .replace(/^["']+|["']+$/g, "")
      .replace(/\/+$/, "")
      .replace(/\/api$/, "");

    const target = rawBackend.startsWith("http") ? rawBackend : `http://${rawBackend}`;

    return [
      {
        source: "/api/proxy/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
