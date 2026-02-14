import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // For HA ingress - path will be like /api/hassio_ingress/xxx/
  // We use relative paths so assets load correctly regardless of base path
  assetPrefix: './',

  images: {
    unoptimized: true, // For standalone deployment in Docker
  },

  // Externalize native modules to prevent bundling issues
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
