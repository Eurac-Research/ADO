/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'webassets.eurac.edu' },
      { protocol: 'https', hostname: 'www.datocms-assets.com' },
    ],
  },
  reactStrictMode: true,
}

module.exports = nextConfig
