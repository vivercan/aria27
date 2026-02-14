import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/d:token([a-f0-9-]{36})",
        destination: "/autorizar/:token",
      },
      {
        source: "/d/:path*",
        destination: "/autorizar/:path*",
      },
    ];
  },
};
export default nextConfig;
