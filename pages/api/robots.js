import { network, server } from '../../utils'

const isPrimaryIndexableNetwork = ['mainnet', 'xahau'].includes(network)

const nonMainnetRules = [
  'Allow: /$',
  'Allow: /explorer$',
  'Allow: /explorer/$',
  'Allow: /faucet$',
  'Allow: /faucet/$',
  'Allow: /create$',
  'Allow: /create/',
  'Allow: /tools$',
  'Allow: /tools/',
  'Allow: /_next/',
  'Allow: /images/',
  'Allow: /locales/',
  'Allow: /manifest.json$',
  'Disallow: /'
]

export default function Robots(req, res) {
  res.setHeader('Content-Type', 'text/plain')
  const rules = isPrimaryIndexableNetwork ? ['Disallow: /go/'] : nonMainnetRules

  res.send(['User-agent: *', `Sitemap: ${server}/sitemap.xml`, ...rules].join('\n'))
}
