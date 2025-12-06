import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlideFrameProvider, DetachedContentProvider } from "@/components/glide-frame";
import { Navigation } from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GlideFrame Demo",
  description: "A draggable and resizable floating container component for Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlideFrameProvider>
          <DetachedContentProvider>
            <Navigation />
            {children}
          </DetachedContentProvider>
        </GlideFrameProvider>
      </body>
    </html>
  );
}
