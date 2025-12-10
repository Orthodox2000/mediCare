import type { NextConfig } from "next";
/** @type {import('next').NextConfig} */

const nextConfig = {
  typescript: {
    // ❗ Allows production builds to succeed even with TS errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
