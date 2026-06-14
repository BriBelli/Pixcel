/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pxs/core'],
  turbopack: {},
  devIndicators: false,
};

module.exports = nextConfig;
