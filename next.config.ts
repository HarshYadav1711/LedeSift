import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents is incompatible with `export const runtime = "nodejs"` on
  // Route Handlers in Next.js 16.4. The summarize route requires the Node.js
  // runtime for jsdom / Readability / pinned sockets, so cacheComponents is off.
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
