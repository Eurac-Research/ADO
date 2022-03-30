import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

function SideBar() {
  const router = useRouter();

  return (
    <div className="sideBar">
      <div className={router.pathname !== "/impacts" ? "sideBarItem active" : "sideBarItem"}>
        <Link href="/">
          <a>Indicies</a>
        </Link>
      </div>
      <div className={router.pathname == "/impacts" ? "sideBarItem active" : "sideBarItem"}>
        <Link href="/impacts">
          <a>Impacts (nuts3)</a>
        </Link>
      </div>
      <div className={router.pathname == "/impacts-nuts2" ? "sideBarItem active" : "sideBarItem"}>
        <Link href="/impacts-nuts2">
          <a>Impacts (nuts2)</a>
        </Link>
      </div>
    </div>
  );
}

export default SideBar;
