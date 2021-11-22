module.exports = {
  reactStrictMode: true,
  i18n: {
    locales: ['en', 'de', 'it'],
    defaultLocale: 'en',
  },
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/cdi"
      }
    ]
  }
}
