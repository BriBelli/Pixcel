/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pxs/core'],
  
  // Optimize for development
  webpack: (config, { dev }) => {
    // Don't watch node_modules to prevent "too many files" error
    if (dev) {
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      };
    }

    return config;
  },
};

module.exports = nextConfig;
