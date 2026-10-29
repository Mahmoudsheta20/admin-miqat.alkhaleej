import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      .replace(/\/+$/, "");

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
