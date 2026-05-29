import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

// Self-host Inter font via next/font for optimal performance
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
  fallback: [
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "Noto Sans SC",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Rebuild — 业务管理系统",
    template: "%s | Rebuild",
  },
  description:
    "企业级 CRM / 低代码平台，基于 Python FastAPI + Next.js 构建。支持元数据驱动、工作流自动化、AI 助手等功能。",
  keywords: [
    "CRM",
    "低代码",
    "业务管理",
    "FastAPI",
    "Next.js",
    "企业应用",
    "开源",
    "workflow",
    "low-code",
  ],
  authors: [{ name: "Rebuild Team" }],
  creator: "Rebuild",
  publisher: "Rebuild",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://getrebuild.com"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Rebuild",
    title: "Rebuild — 企业级 CRM / 低代码平台",
    description:
      "基于 FastAPI + Next.js 构建的开源企业级 CRM / 低代码平台。元数据驱动，开箱即用。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Rebuild CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rebuild — 企业级 CRM / 低代码平台",
    description:
      "基于 FastAPI + Next.js 构建的开源企业级 CRM / 低代码平台。",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Preconnect to backend for faster API calls */}
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080"}
          crossOrigin="anonymous"
        />
        {/* DNS prefetch for common external domains */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//cdn.jsdelivr.net" />
      </head>
      <body
        className={`${inter.className} font-sans antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={4000}
            toastOptions={{
              className: "font-sans text-sm",
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
