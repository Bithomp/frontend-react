import { generateUrlSet, sitemapSections } from '../../utils/sitemap'

export default async function handler(req, res) {
  const sectionName = Array.isArray(req.query.section) ? req.query.section[0] : req.query.section
  const section = sitemapSections[sectionName]

  if (!section?.enabled) {
    res.status(404).end()
    return
  }

  const entries = await section.getEntries({ req })
  res.setHeader('Content-Type', 'text/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(generateUrlSet(entries))
}
