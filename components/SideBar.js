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
          <a>Impacts</a>
        </Link>
      </div>
    </div>
  );
}

export default SideBar;
