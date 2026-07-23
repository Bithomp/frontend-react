import { generateSitemapIndex, sitemapSectionNames } from '../utils/sitemap'

function SitemapIndex() {
  // getServerSideProps returns the XML response.
}

export function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'text/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  res.write(generateSitemapIndex(sitemapSectionNames))
  res.end()

  return {
    props: {}
  }
}

export default SitemapIndex
