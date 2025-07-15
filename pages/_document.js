import Document, { Html, Head, Main, NextScript } from 'next/document'
import { server, xahauNetwork } from '../utils'

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const originalRenderPage = ctx.renderPage

    // Run the React rendering logic synchronously
    ctx.renderPage = () =>
      originalRenderPage({
        // Useful for wrapping the whole react tree
        enhanceApp: (App) => App,
        // Useful for wrapping in a per-page basis
        enhanceComponent: (Component) => Component
      })

    // Run the parent `getInitialProps`, it now includes the custom `renderPage`
    const initialProps = await Document.getInitialProps(ctx)
    const cookieTheme = ctx.req?.cookies?.theme ?? null
    const logoPath = server.includes('bithomp') ? '' : '/images/' + (xahauNetwork ? 'xahauexplorer' : 'xrplexplorer')

    return { ...initialProps, cookieTheme, logoPath }
  }

  render() {
    return (
      <Html>
        <Head>
          <link rel="icon" href={this.props.logoPath + '/favicon.ico'} />
          {/* <meta name="theme-color" content="#000000" /> */}
          <link rel="apple-touch-icon" href={this.props.logoPath + '/apple-touch-icon.png'} />
          <link rel="manifest" href="/manifest.json" />
        </Head>
        <body data-networkname={process.env.NEXT_PUBLIC_NETWORK_NAME}>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
