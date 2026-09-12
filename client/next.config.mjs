/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Disable Image Optimization since it requires Next.js server
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
};

export default nextConfig;
