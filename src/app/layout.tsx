import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-app-sans",
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-app-bengali",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "SR Telecom & Library - POS & Inventory System",
  description: "Comprehensive Book and Stationery Shop Management System for Bangladesh",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SR POS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full ${notoSans.variable} ${notoSansBengali.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans antialiased text-slate-800 bg-slate-50 selection:bg-slate-200"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
