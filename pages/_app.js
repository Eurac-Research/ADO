import '../styles/globals.scss'
import { ThemeProvider } from "../context/theme";
import PlausibleProvider from "next-plausible"

function MyApp({ Component, pageProps }) {

  return (
    <PlausibleProvider domain="ado.eurac.edu, rollup.eurac.edu">
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </PlausibleProvider>
  )
}

export default MyApp
