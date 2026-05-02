import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lockfile lives in this dir, but the parent repo also has a package-lock.json
  // (Node.js + Python + frontend in one repo). Pin the workspace root so
  // Next.js doesn't infer the wrong ancestor.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
