import { useEffect, useMemo, useState } from 'react';

export function useIsMobile(breakpointPx: number = 768): boolean {
  const query = useMemo(
    () => `(max-width: ${breakpointPx - 1}px)`,
    [breakpointPx],
  );
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}
