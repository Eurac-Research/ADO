'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SideBarProps } from '@/types'

function SideBar({ posts, sideBarPositionRelative }: SideBarProps) {
  const pathname = usePathname()

  return (
    <div
      className={sideBarPositionRelative === 0 ? `sideBar` : `sideBar relative`}
    >
      <div
        className={
          !pathname.includes('impact') &&
            !pathname.includes('hydro') &&
            !pathname.includes('/md') &&
            !pathname.includes('/vulnerabilities')
            ? 'sideBarItem active'
            : 'sideBarItem'
        }
      >
        <Link href="/">Indices</Link>
      </div>

      <div
        className={
          pathname === '/impacts' || pathname === '/impacts-nuts3'
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
          pathname === '/impact-probabilities' ||
            pathname === '/impact-probabilities' ||
            pathname.includes('/vulnerabilities')
            ? 'sideBarItem active'
            : 'sideBarItem'
        }
      >
        <Link href="/impact-probabilities" prefetch={false}>
          Impacts and risk
        </Link>
        <div
          className={
            pathname === '/impact-probabilities' ||
              pathname === '/impact-probabilities'
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
            pathname === '/vulnerabilities'
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
          pathname.includes('hydro') ? 'sideBarItem active' : 'sideBarItem'
        }
      >
        <Link href="/hydro/spei-1" prefetch={false}>
          Hydro
        </Link>
      </div>

      {posts &&
        posts.map((item, index) => (
          <div
            key={`${item.slug}-${index}`}
            className={
              pathname.includes(item.slug)
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
