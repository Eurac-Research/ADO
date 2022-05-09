import '../styles/globals.scss'
import { useEffect, useState, useCallback } from 'react'
import Router from 'next/router'
import * as gtag from '../lib/gtag'
import { ThemeProvider } from "../context/theme";

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
      <Component {...pageProps} />
    </ThemeProvider >
  )
}

export default MyApp
