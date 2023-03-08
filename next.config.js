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
  async redirects() {
    return [
      {
        source: '/top-nft-sales',
        destination: '/nft-sales',
        permanent: true,
      },
      {
        source: '/latest-nft-sales',
        destination: '/nft-sales?list=last',
        permanent: true,
      },
    ]
  },
};