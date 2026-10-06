import { useEffect } from 'react';
import { SITE_NAME } from '../utils/constants.js';

const DEFAULT_DESCRIPTION =
  'Find a doctor, book a time, get your appointment ID and follow your place in the queue.';

function setMeta(selector, content) {
  document.querySelector(selector)?.setAttribute('content', content);
}

// Sets the tab title, meta description and Open Graph tags for a page.
export function usePageMeta(title, description = DEFAULT_DESCRIPTION) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Wait at home, not in the waiting room`;
    document.title = fullTitle;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', description);
  }, [title, description]);
}
