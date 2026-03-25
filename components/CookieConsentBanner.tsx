'use client'

import CookieConsent from 'react-cookie-consent'

export default function CookieConsentBanner() {
  return (
    <CookieConsent
      location="bottom"
      buttonText="OK"
      cookieName="cookieConsentAccepted"
      style={{ background: '#222', left: 'auto', right: '0', zIndex: 40 }}
      buttonStyle={{
        background: '#36a036',
        color: '#fff',
        padding: '6px 12px',
        fontWeight: 'bold',
        fontSize: '14px',
      }}
      expires={150}
    >
      In order to give you a better service this site uses cookies.
      Additionally third party cookies are used. By continuing to browse the
      site you are agreeing to our use of cookies.{' '}
      <a href="https://privacy.eurac.edu" className="privacyLink">
        Privacy Policy
      </a>
    </CookieConsent>
  )
}
