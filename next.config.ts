import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  experimental: {
    useCache: true,
  },
  output: "standalone",
};

export default nextConfig;
