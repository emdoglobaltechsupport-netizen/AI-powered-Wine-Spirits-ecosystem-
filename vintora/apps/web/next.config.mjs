/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @vintora/shared ships TypeScript source from the workspace.
  transpilePackages: ['@vintora/shared'],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
