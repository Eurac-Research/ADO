import { ReactNode } from 'react'
import { ThemeProvider } from '@/context/theme'
import PlausibleProvider from 'next-plausible'
import type { Metadata } from 'next'
import '@/styles/global.css'
import '@/styles/globals.scss'

export const metadata: Metadata = {
  title: 'Alpine Drought Observatory | Eurac Research',
  description: 'Alpine Drought Observatory - Monitoring drought conditions across the Alpine region',
  metadataBase: new URL('https://ado.eurac.edu'),
  openGraph: {
    title: 'Alpine Drought Observatory | Eurac Research',
    description: 'Alpine Drought Observatory - Monitoring drought conditions across the Alpine region',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'OdAWzIPNr_gquodYDcLJpB5xjGfw0mJ1Mowe5Do9k6U',
  },
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <PlausibleProvider domain="ado.eurac.edu, rollup.eurac.edu">
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </PlausibleProvider>
      </body>
    </html>
  )
}
