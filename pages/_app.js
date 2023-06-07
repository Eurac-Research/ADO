import '../styles/globals.scss'
import { ThemeProvider } from '../context/theme'
import PlausibleProvider from 'next-plausible'
import Head from 'next/head'

function MyApp({ Component, pageProps }) {
  return (
    <PlausibleProvider domain="ado.eurac.edu, rollup.eurac.edu">
      <Head>
        <title>Alpine Drought Observatory | Eurac Research</title>
        <meta
          property="og:image"
          content="https://ado.eurac.edu/og-image.png"
        />
      </Head>
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </PlausibleProvider>
  )
}

export default MyApp
