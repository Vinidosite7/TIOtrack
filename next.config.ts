import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack from treating the user's home directory as the project root
  // when another package-lock.json exists above this project.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
