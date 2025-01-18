import { server } from '../../utils'

export default function Robots(req, res) {
  res.setHeader('Content-Type', 'text/plain')
  //let allow indexing all networks for now
  res.send('User-agent: *\nSitemap: ' + server + '/sitemap.xml\nDisallow: /go/')
  /*
  if (process.env.NEXT_PUBLIC_NETWORK_NAME === "mainnet") {
    res.send('User-agent: *\nDisallow: /api/\nDisallow: /go/')
  } else {
    res.send('User-agent: *\nAllow: /$\nDisallow: /\nDisallow: /go/')
  }
  */
}
