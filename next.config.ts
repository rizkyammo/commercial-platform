import type { NextConfig } from "next";
import path from "path";

// ============================================================
// SECURITY HEADERS
// ============================================================
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,

  // ============================================================
  // FIX #1: Turbopack root — karena package-lock.json ada di parent
  // ============================================================
  turbopack: {
    root: path.resolve(__dirname),
  },

  // ============================================================
  // FIX #2: Allow akses dari LAN IP (mobile, tablet)
  // Tanpa ini, Next.js 15+ block CSS/JS dari origin non-localhost
  // ============================================================
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.6",       // ← IP LAN Anda
    "192.168.1.*",       // ← semua di subnet sama (kalau didukung)
    "192.168.*.*",
  ],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;