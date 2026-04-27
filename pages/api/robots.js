import { server } from '../../utils'

export default function Robots(req, res) {
  res.setHeader('Content-Type', 'text/plain')
  res.send(`User-agent: *\nSitemap: ${server}/sitemap.xml\nDisallow: /go/`)
}
