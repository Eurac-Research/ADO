import CookieConsent from 'react-cookie-consent'
import SideBar from "./SideBar"

export default function Layout({ theme, children, files }) {

  console.log("files layout", files);


  return (
    <div className={theme}>
      <SideBar files={files} />
      <main>{children}</main>
      <CookieConsent
        location="none"
        buttonText="It's OK for me"
        cookieName="ADOCookieConsent"
        overlay={true}
        overlayClasses="cookieConsentContainer"
        containerClasses="cookieConsent"
        contentClasses="cookieConsentContent"
        expires={150}
        sameSite="strict"
      >
        This website uses cookies (Google Analytics).{" "}<br />
        Read our <span style={{ textDecoration: "underline" }}><a href="https://www.eurac.edu/en/static/privacy-policy">Privacy Statement</a></span>
      </CookieConsent>
    </div>
  )
}
