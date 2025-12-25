/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Suppress 404 warnings for development chunks during HMR
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Reduce console noise from missing chunks during hot reload
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Suppress warnings about missing chunks during HMR
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
      }
    }
    
    // Exclude MongoDB and Node.js built-in modules from client bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        fs: false,
      }
      
      // Exclude MongoDB from client bundles
      config.externals = config.externals || []
      config.externals.push({
        'mongodb': 'commonjs mongodb',
        'mongodb/lib': 'commonjs mongodb/lib',
      })
    }
    
    return config
  },
}

export default nextConfig
