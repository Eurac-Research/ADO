import SideBar from './SideBar'
import Header from '../components/Header'
import { useThemeContext } from '../context/theme'
import CookieConsent from 'react-cookie-consent'

export default function Layout({ children, posts, headerMode = 0 } = {}) {
  const [theme, setTheme] = useThemeContext()

  return (
    <div className={theme}>
      <Header headerModeWithBackground={headerMode} />
      <SideBar posts={posts} sideBarPositionRelative={headerMode} />
      <main>{children}</main>

      <div
        className="darkModeToggle"
        onClick={() => {
          theme == 'light' ? setTheme('dark') : setTheme('light')
        }}
        title={
          theme === 'light' ? 'switch to dark mode' : 'switch to light mode'
        }
      >
        {theme === 'light' ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            title="moon"
          >
            <path d="M283.21 512c78.96 0 151.08-35.92 198.86-94.8 7.07-8.7-.64-21.42-11.56-19.34-124.2 23.65-238.27-71.58-238.27-196.96a200.43 200.43 0 0 1 101.5-174.39C343.43 21 341 6.31 330 4.28A258.16 258.16 0 0 0 283.2 0c-141.3 0-256 114.51-256 256 0 141.3 114.51 256 256 256z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            title="sun"
            fill="none"
            stroke="#000"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        )}
      </div>
      <CookieConsent
        location="bottom"
        buttonText="OK"
        cookieName="cookieConsentAccepted"
        style={{ background: '#222', left: 'auto', right: '0' }}
        buttonStyle={{
          background: '#36a036',
          color: '#fff',
          padding: '8px 14px',
          fontWeight: 'bold',
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
    </div>
  )
}
