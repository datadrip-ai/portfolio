import React from 'react';
import '@/globals.css';
import Link from 'next/link';
import Services from './services';

const Nav = () => {
  return (
    <div className="nav ctr m-1 p-1 flex grid-rows-1 top-0 left-0 right-0 text-center fixed bg-black/50 z-50">
      <Link className="b2" href="/">Home</Link>
      <Link className="b2" href="/videos">Videos</Link>
      <Services />
    </div>
  );
};

export default Nav;