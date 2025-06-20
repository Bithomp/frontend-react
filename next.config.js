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
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = __dirname;
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
      },
      {
        source: '/xrpl-article',
        destination: '/learn/what-is-xrp',
        permanent: true
      },
      {
        source: '/rlusd',
        destination: '/learn/ripple-usd',
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
})


// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "pavelfokindev",
    project: "javascript-nextjs",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
