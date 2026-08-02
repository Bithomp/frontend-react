import { generateUrlSet, sitemapSections } from '../../utils/sitemap'

function SitemapSection() {
  // getServerSideProps returns the XML response.
}

export async function getServerSideProps({ params, req, res }) {
  const sectionName = String(params?.section || '').match(/^([a-z-]+)\.xml$/)?.[1]
  const section = sitemapSections[sectionName]

  if (!section?.enabled) {
    return {
      notFound: true
    }
  }

  const entries = await section.getEntries({ req })
  res.setHeader('Content-Type', 'text/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(generateUrlSet(entries))
  res.end()

  return {
    props: {}
  }
}

export default SitemapSection
