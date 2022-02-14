import * as React from 'react'
import Link from 'next/link'

function SideBar() {

  return (
    <div className="sideBar">
      <div className='sideBarItem active'>
        <Link href="/">
          <a>Indicies</a>
        </Link>
      </div>
      <div className='sideBarItem'>
        <Link href="/impacts">
          <a>Impacts</a>
        </Link>
      </div>
    </div>
  );
}

export default SideBar;
