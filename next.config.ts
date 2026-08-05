import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The admin page builder posts base64 images through /api/admin/upload;
  // the 4MB image cap in that route needs headroom for base64's ~33% overhead.
  experimental: {
    serverActions: { bodySizeLimit: '6mb' },
  },
}

export default nextConfig
