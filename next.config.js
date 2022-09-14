module.exports = {
  images: {
    domains: ['webassets.eurac.edu'],
  },
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/spei-1',
      },
    ]
  },
}
