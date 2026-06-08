import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    // Lint is run separately via `npm run lint`. Don't block production builds.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Konva's Node.js build requires the `canvas` package which doesn't exist in Next.js.
    // Marking it as external prevents the build error while still allowing ssr:false dynamic imports.
    config.externals = [...(config.externals as string[]), { canvas: 'canvas' }]
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/:path*`,
      },
    ]
  },
}

export default nextConfig
