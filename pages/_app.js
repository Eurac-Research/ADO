import '../styles/globals.scss'
import { useEffect, useState, useCallback } from 'react'
import Router from 'next/router'
import * as gtag from '../lib/gtag'
import { ThemeProvider } from "../context/theme";
import { GA_TRACKING_ID } from '../lib/gtag'
import Script from "next/script"

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const handleRouteChange = (url) => {
      gtag.pageview(url)
    }
    Router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      Router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [])

  return (
    <ThemeProvider>
      {/* Global Site Tag (gtag.js) - Google Analytics  */}
      <Script
        id="gtag"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script
        id="inline-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', '${GA_TRACKING_ID}', {
                page_path: window.location.pathname,
                'anonymize_ip': true
              });
              gtag('config', 'G-E4WRL8Q51T');
            `
        }}
      />
      <Component {...pageProps} />
    </ThemeProvider >
  )
}

export default MyApp
