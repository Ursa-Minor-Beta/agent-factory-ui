import { useEffect } from 'react';
import { config } from '../config';

// Title set by the current page; Layout's nav-based title applies when none is set
let pageTitle: string | null = null;

export const getPageTitle = () => pageTitle;

// Page effects run before Layout's, so Layout reads this on path changes instead of overwriting it
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    pageTitle = `${title} | ${config.appName}`;
    document.title = pageTitle;
    return () => {
      pageTitle = null;
    };
  }, [title]);
}
