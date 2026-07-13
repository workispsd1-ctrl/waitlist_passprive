import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow loading the dev server over the local network (e.g. from a phone
  // or another machine on the LAN). Without this, Next.js 16 blocks
  // cross-origin dev requests, which prevents the page from hydrating.
  allowedDevOrigins: ["192.168.29.194"],
};

export default nextConfig;
