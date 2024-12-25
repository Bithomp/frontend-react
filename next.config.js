const { i18n } = require('./next-i18next.config')

module.exports = {
  compiler: {
    styledComponents: true
  },
  i18n,
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    })
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.xrplexplorer.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'cdn.xahauexplorer.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'cdn.bithomp.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'secure.gravatar.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'xumm.app',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'xaman.app',
        port: ''
      }
    ]
  },
  compress: false,
  async redirects() {
    return [
      {
        source: '/go/:path*',
        destination: '/api/go/:path*',
        permanent: true
      },
      {
        source: '/rich-list',
        destination: '/distribution',
        permanent: true
      },
      {
        source: '/developer',
        destination: '/admin',
        permanent: true
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/robots.txt',
        destination: '/api/robots'
      },
      {
        source: '/tx/:id',
        destination: '/transaction/:id'
      },
      {
        source: '/tx',
        destination: '/transaction'
      },
      {
        source: '/address/:id',
        destination: '/account/:id'
      },
      {
        source: '/address',
        destination: '/account'
      }
    ]
  }
}
