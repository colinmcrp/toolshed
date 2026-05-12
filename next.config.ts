import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      // Allow HTML artifact uploads up to 6 MB plus multipart overhead.
      bodySizeLimit: "7mb",
    },
  },
};

export default nextConfig;
