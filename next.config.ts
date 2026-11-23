import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page behind sign-in reads the session cookie, so it is per-user and dynamic.
  // Cache Components would force a Suspense split on every page for no gain here.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
