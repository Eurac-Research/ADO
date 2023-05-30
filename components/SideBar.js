import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

function SideBar({ posts, sideBarPositionRelative }) {
  const router = useRouter()

  return (
    <div
      className={sideBarPositionRelative === 0 ? `sideBar` : `sideBar relative`}
    >
      <div
        className={
          !router.asPath.includes('impact') &&
          !router.asPath.includes('hydro') &&
          !router.asPath.includes('/md') &&
          !router.asPath.includes('/vulnerabilities')
            ? 'sideBarItem active'
            : 'sideBarItem'
        }
      >
        <Link href="/">Indices</Link>
      </div>

      <div
        className={
          router.pathname === '/impacts' || router.pathname === '/impacts-nuts3'
            ? 'sideBarItem active'
            : 'sideBarItem'
        }
      >
        <Link href="/impacts" prefetch={false}>
          Reported Impacts
        </Link>
      </div>

      <div
        className={
          router.pathname === '/impact-probabilities' ||
          router.pathname === '/impact-probabilities' ||
          router.asPath.includes('/vulnerabilities')
            ? 'sideBarItem active'
            : 'sideBarItem'
        }
      >
        <Link href="/impact-probabilities" prefetch={false}>
          Impacts and risk
        </Link>
        <div
          className={
            router.pathname === '/impact-probabilities' ||
            router.pathname === '/impact-probabilities'
              ? 'sideBarItemSub active'
              : 'sideBarItemSub'
          }
        >
          <Link href="/impact-probabilities" prefetch={false}>
            Impact probabilities
          </Link>
        </div>
        <div
          className={
            router.pathname === '/vulnerabilities'
              ? 'sideBarItemSub active'
              : 'sideBarItemSub'
          }
        >
          <Link href="/vulnerabilities" prefetch={false}>
            Vulnerabilities
          </Link>
        </div>
      </div>

      <div
        className={
          router.asPath.includes('hydro') ? 'sideBarItem active' : 'sideBarItem'
        }
      >
        <Link href="/hydro/spei-1" prefetch={false}>
          Hydro
        </Link>
      </div>

      {posts &&
        posts.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className={
              router.asPath.includes(item.slug)
                ? 'sideBarItem active'
                : 'sideBarItem'
            }
          >
            <Link href={`/md/${item?.slug}`} prefetch={false}>
              {item.title}
            </Link>
          </div>
        ))}
    </div>
  )
}

export default SideBar
