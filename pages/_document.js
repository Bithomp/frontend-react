import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {

  return (
    <Html>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
                function getCookie(cname) {
                  let name = cname + "=";
                  let decodedCookie = decodeURIComponent(document.cookie);
                  let ca = decodedCookie.split(';');
                  for(let i = 0; i <ca.length; i++) {
                    let c = ca[i];
                    while (c.charAt(0) == ' ') {
                      c = c.substring(1);
                    }
                    if (c.indexOf(name) == 0) {
                      return c.substring(name.length, c.length);
                    }
                  }
                  return "";
                }
                function setTheme(newTheme) {
                  document.body.className = newTheme;
                  window.__theme = newTheme;
                  window.__onThemeChange(newTheme);
                }
                window.__onThemeChange = function () {};
                window.__setPreferredTheme = function (newTheme) {
                  setTheme(newTheme);
                  try {
                    document.cookie = "theme=" + JSON.stringify(window.__theme);
                  } catch (err) {}
                };
                let preferredTheme;
                try {
                  preferredTheme = JSON.parse(getCookie("theme"));
                } catch (err) {}
                const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
                if (!preferredTheme) {
                  darkQuery.addListener(function (event) {
                    window.__setPreferredTheme(event.matches ? "dark" : "light");
                  });
                }
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