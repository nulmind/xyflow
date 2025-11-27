/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@xyflow/react', '@xyflow/system'],

  // Enable static export for demo mode (GitHub Pages deployment)
  output: process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? 'export' : undefined,

  // Disable image optimization for static export
  images: {
    unoptimized: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  },

  // Set base path if deploying to a subdirectory (e.g., GitHub Pages repo)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

module.exports = nextConfig;
