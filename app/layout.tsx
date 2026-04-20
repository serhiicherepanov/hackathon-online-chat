import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { ServiceWorkerProvider } from "@/components/pwa/service-worker-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Online Chat",
  description: "Hackathon online chat — Next.js + Centrifugo + Postgres",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-background">
      <body className="min-h-screen bg-background font-sans antialiased">
        <ServiceWorkerProvider />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
