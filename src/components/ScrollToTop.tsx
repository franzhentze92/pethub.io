import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** Routes that share scroll position when switching between sub-paths (e.g. marketplace tabs). */
function getScrollSection(pathname: string): string {
  if (pathname.startsWith('/marketplace')) return '/marketplace';
  return pathname;
}

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (previousPathname === null) {
      window.scrollTo(0, 0);
      return;
    }

    if (getScrollSection(previousPathname) === getScrollSection(pathname)) {
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
