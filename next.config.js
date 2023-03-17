const { i18n } = require('./next-i18next.config')

module.exports = {
  i18n,
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"]
    });
    return config;
  },
  compress: false,
  async redirects() {
    return [
      {
        source: '/go/:path*',
        destination: 'https://bithomp.com/api/go/:path*',
        permanent: true
      }
    ]
  },
};