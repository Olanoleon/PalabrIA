import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No `output: "standalone"` — Railway runs the app with `next start`, so the
  // self-contained bundle standalone produces is dead weight (it copies
  // node_modules again). Re-enable it if this ever moves to a Docker image.
  poweredByHeader: false,
  // Prisma loads its engine by dynamic require; leaving it external keeps the
  // bundler from tracing the whole project to follow that path.
  serverExternalPackages: ["@prisma/client", "@/generated/prisma"],
  experimental: {
    // Server actions receive form data from the learner app only; the default
    // 1 MB body limit is ample and worth stating so it is not raised by accident.
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
