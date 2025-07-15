/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: {
  //   typedRoutes: true,
  // },
  images: {
    domains: ['webassets.eurac.edu'],
  },
  reactStrictMode: true,

  // Enable experimental features for better performance
  // experimental: {
  //   optimizePackageImports: ['react-map-gl', 'mapbox-gl']
  // },
}

module.exports = nextConfig
