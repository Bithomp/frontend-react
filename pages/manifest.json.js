import { explorerName, nativeCurrency, server, xahauNetwork } from '../utils'

const manifestJson = ({ theme }) => {
  if (typeof window !== 'undefined') {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    if (!theme && darkQuery) {
      theme = darkQuery.matches ? 'dark' : 'light'
    }
  }

  const imagePath = '/images/' + (xahauNetwork ? 'xahauexplorer' : 'xrplexplorer') + '/'

  const icons = server.includes('bithomp')
    ? [
        {
          src: './favicon.ico',
          sizes: '64x64 32x32 24x24 16x16',
          type: 'image/x-icon'
        }
      ]
    : [
        {
          src: imagePath + 'favicon.ico',
          sizes: '64x64 32x32 24x24 16x16',
          type: 'image/x-icon'
        },
        {
          src: imagePath + '192.png',
          type: 'image/png',
          sizes: '192x192'
        },
        {
          src: imagePath + '512.png',
          type: 'image/png',
          sizes: '512x512'
        }
      ]

  return {
    name: 'Bithomp ' + explorerName + ' Explorer and Services',
    short_name: 'The best ' + nativeCurrency + ' Explorer',
    description: 'Scan ' + nativeCurrency + ' Ledger: search for transactions, addresses, NFTs and more',
    start_url: '/',
    display: 'standalone',
    background_color: theme === 'dark' ? '#000' : '#fff',
    theme_color: theme === 'dark' ? '#000' : '#fff',
    icons
  }
}

function Manifest() {
  // getServerSideProps will do everything we need here
}

export async function getServerSideProps({ res, req }) {
  const json = manifestJson({ theme: req.cookies?.theme })
  res.setHeader('Content-Type', 'application/json')
  res.write(JSON.stringify(json))
  res.end()
  return {
    props: {}
  }
}

export default Manifest
