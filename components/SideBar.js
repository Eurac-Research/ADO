import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'


function SideBar({ posts, sideBarPositionRelative }) {
  const router = useRouter();

  return (
    <div className={(sideBarPositionRelative === 0) ? `sideBar` : `sideBar relative`}>
      <div className={(router.pathname !== "/impacts" && router.pathname !== "/impacts-nuts2" && !router.asPath.includes('hydro') && !router.asPath.includes('/md')) ? "sideBarItem active" : "sideBarItem"}>
        <Link href="/">
          <a>Indices</a>
        </Link>
      </div>

      <div className={(router.pathname === "/impacts" || router.pathname === "/impacts-nuts2") ? "sideBarItem active" : "sideBarItem"}>
        <Link href="/impacts">
          <a>Impacts</a>
        </Link>
      </div>

      <div className={router.asPath.includes('hydro') ? "sideBarItem active" : "sideBarItem"}>
        <Link href="/hydro/cdi">
          <a>Hydro</a>
        </Link>
      </div>

      {posts && posts.map((item, index) => (
        <div key={`${item}-${index}`} className={router.asPath.includes(item.slug) ? "sideBarItem active" : "sideBarItem"}>
          <Link href={`/md/${item?.slug}`}>
            <a>{item.title}</a>
          </Link>
        </div>
      ))
      }

      <div className="alphaInfo">

        <h3>⚠️</h3>
        <p>This page is in public BETA and still under development.</p>
        <p>
          More information about the project at <a href="https://www.alpine-space.org/projects/ado/en/home">https://www.alpine-space.org/projects/ado/</a>
        </p>
        <p>
          Data can be found in the public repository <a href="https://github.com/Eurac-Research/ado-data">https://github.com/Eurac-Research/ado-data</a>
        </p>
        <p>Eurac Research, July 2022</p>

      </div>


    </div >

  );
}

export default SideBar;
