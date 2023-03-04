import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {

  const getInitialProps = async ctx => {
    const initialProps = await getInitialProps(ctx)
    return { ...initialProps }
  }

  return (
    <Html>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#000000" />
        <meta name="monetization" content="$ilp.uphold.com/3dJnef2dZfna" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
                function setTheme(newTheme) {
                  document.body.className = newTheme;
                  window.__theme = newTheme;
                  window.__onThemeChange(newTheme);
                }
                window.__onThemeChange = function () {};
                window.__setPreferredTheme = function (newTheme) {
                  setTheme(newTheme);
                  try {
                    localStorage.setItem("theme", JSON.stringify(window.__theme));
                  } catch (err) {}
                };
                const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
                darkQuery.addListener(function (event) {
                  window.__setPreferredTheme(event.matches ? "dark" : "light");
                });
                let preferredTheme;
                try {
                  preferredTheme = JSON.parse(localStorage.getItem("theme"));
                } catch (err) {}
                setTheme(preferredTheme || (darkQuery.matches ? "dark" : "light"));
              })();
            `
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}