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
  images: {
    domains: ['cdn.bithomp.com', 'pbs.twimg.com', 'secure.gravatar.com', 'xumm.app'],
  },
  compress: false,
  async redirects() {
    return [
      {
        source: '/go/:path*',
        destination: 'https://bithomp.com/api/go/:path*',
        permanent: true
      },
      {
        source: '/rich-list',
        destination: '/distribution',
        permanent: true
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/robots.txt',
        destination: '/api/robots'
      }
    ];
  }
};