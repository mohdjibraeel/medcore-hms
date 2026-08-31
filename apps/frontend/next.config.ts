import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://medcore-backend-1796.onrender.com/:path*",
      },
    ];
  },
};

export default nextConfig;