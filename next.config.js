const { i18n } = require('./next-i18next.config')

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = withBundleAnalyzer({
  compiler: {
    styledComponents: true
  },
  i18n,
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    })
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}
    config.resolve.alias['@'] = __dirname
    return config
  },
  images: {
    deviceSizes: [640, 750, 1080, 1200, 1920],
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
      },
      {
        source: '/blackholed-address',
        destination: '/learn/blackholed-address',
        permanent: true
      },
      {
        source: '/blacklisted-address',
        destination: '/learn/blacklisted-address',
        permanent: true
      },
      {
        source: '/verified-domains',
        destination: '/learn/verified-domain',
        permanent: true
      },
      {
        source: '/rlusd',
        destination: '/learn/ripple-usd',
        permanent: true
      },
      {
        source: '/xrp-xah-taxes',
        destination: '/learn/xrp-xah-taxes',
        permanent: true
      },
      {
        source: '/xrpl-article',
        destination: '/learn/xrpl-article',
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
        source: '/address/:id/dex',
        destination: '/account/:id/dex'
      },
      {
        source: '/address/:id/transactions',
        destination: '/account/:id/transactions'
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
})
