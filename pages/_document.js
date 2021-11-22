import Document, { Html, Head, Main, NextScript } from 'next/document'
import { GA_TRACKING_ID } from '../lib/gtag'
import CookieConsent from 'react-cookie-consent'

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html>
        <Head>
          {/* Global Site Tag (gtag.js) - Google Analytics  */}
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
              'anonymize_ip': true
            });
          `,
            }}
          />
        </Head>
        <body className="light-theme">
          <Main />
          <NextScript />

          <CookieConsent
            location="bottom"
            buttonText="OK"
            cookieName="ADOCookieConsent"
            style={{ background: "#0000002E", fontSize: "13px", zIndex: "1000", justifyContent: "center", alignItems: "center", opacity: "0.8", color: "#404649" }}
            buttonStyle={{ background: "#fff", color: "#404649", fontSize: "13px" }}
            contentStyle={{ margin: "10px", flex: "1 0 100px" }}
            expires={150}
            sameSite="strict"
          >
            This website uses cookies.{" "}
            Read our <span style={{ textDecoration: "underline" }}><a href="https://www.eurac.edu/en/static/privacy-policy">Privacy Statement</a></span>
          </CookieConsent>

        </body>
      </Html>
    )
  }
}

export default MyDocument