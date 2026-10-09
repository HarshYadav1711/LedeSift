import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents is incompatible with `export const runtime = "nodejs"` on
  // Route Handlers in Next.js 16.4. The summarize route requires the Node.js
  // runtime for jsdom / Readability / pinned sockets, so cacheComponents is off.
  //
  // Production builds use webpack (`next build --webpack`) because Next.js 16
  // Turbopack can emit unresolved hashed externals for jsdom on Vercel
  // serverless (empty HTTP 500 on /api/summarize). Dev may still use Turbopack.
  //
  // jsdom is pinned to 26.x: 27+ pulls ESM-only @exodus/bytes, and Vercel's
  // serverless Node loader rejects require(ESM) (ERR_REQUIRE_ESM → empty 500).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["jsdom", "@mozilla/readability", "@google/genai"],
};

export default nextConfig;
