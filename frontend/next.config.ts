import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── TypeScript ────────────────────────────────────────────────
  typescript: {
    ignoreBuildErrors: true,
  },

  // ─── Output & Runtime ─────────────────────────────────────────
  // Use standalone for Docker / server deployments
  output: "standalone",

  // ─── Compiler Optimizations ───────────────────────────────────
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },

  // ─── Experimental Features ────────────────────────────────────
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "zustand",
      "sonner",
      "clsx",
      "tailwind-merge",
    ],
    // Optimize server actions
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // ─── Image Optimization ───────────────────────────────────────
  images: {
    // Support modern formats
    formats: ["image/avif", "image/webp"],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimized images for 30 days
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Allow SVG with security config
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Remote patterns for backend images
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "18080",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // ─── HTTP Headers for Performance & Security ──────────────────
  async headers() {
    return [
      {
        // Apply caching to all static assets
        source: "/(.*)\\.(jpg|jpeg|png|gif|ico|svg|webp|avif|woff|woff2|ttf|otf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Security headers for all routes
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },

  // ─── Redirects for SEO & UX ───────────────────────────────────
  async redirects() {
    return [
      // Redirect root to login if not authenticated (handled by middleware, but keep as fallback)
    ];
  },

  // ─── Rewrites for API Proxy ───────────────────────────────────
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  // ─── Turbopack Configuration ──────────────────────────────────
  turbopack: {},

  // ─── Compression ──────────────────────────────────────────────
  compress: true,

  // ─── Power by header ──────────────────────────────────────────
  poweredByHeader: false,

  // ─── React Strict Mode ────────────────────────────────────────
  reactStrictMode: true,

  // ─── Trailing Slash ───────────────────────────────────────────
  trailingSlash: false,
};

export default nextConfig;
