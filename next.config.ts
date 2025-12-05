import type { NextConfig } from "next";

/**
 * Next.js configuration for GitHub Pages deployment
 *
 * Key settings:
 * - output: 'export' - Generates static HTML files for GitHub Pages
 * - basePath - Required for GitHub Pages subdomain (username.github.io/repo-name)
 * - images.unoptimized - Required for static export (no server-side image optimization)
 */
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/glide-frame" : "";

const nextConfig: NextConfig = {
  // Static HTML export for GitHub Pages
  output: "export",

  // Base path for GitHub Pages (repo name)
  basePath,

  // Asset prefix for correct resource loading
  assetPrefix: basePath,

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Trailing slash for cleaner URLs on static hosting
  trailingSlash: true,
};

export default nextConfig;
