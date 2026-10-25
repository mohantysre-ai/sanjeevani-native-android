import type { NextConfig } from "next";

// NATIVE_BUILD=1 → static export for the Capacitor Android bundle (hash-routed
// SPA served from app assets; API routes are moved aside by the build script
// and the /api/v1/* surface is replaced by the client shim in native-data.ts).
const native = process.env.NATIVE_BUILD === "1";

const nextConfig: NextConfig = {
  ...(native ? { output: "export" as const, images: { unoptimized: true } } : { output: "standalone" }),
  serverExternalPackages: ["z-ai-web-dev-sdk"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  ...(native
    ? {}
    : {
        headers: async () => [
          {
            // The service-worker script must never be HTTP-cached, otherwise the
            // browser's SW update check can pick up a stale handler after deploys.
            source: "/sw.js",
            headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
          },
          {
            // Translation packs are tiny and change rarely — cache hard but allow a
            // same-day refresh; the service worker keeps them offline-available too.
            source: "/locales/:pack*",
            headers: [
              { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
            ],
          },
        ],
      }),
};

export default nextConfig;
