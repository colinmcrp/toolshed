import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      // Allow HTML artifact uploads up to 10 MB plus multipart overhead.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
