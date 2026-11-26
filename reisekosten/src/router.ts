import { useEffect, useState } from 'react';

export function navigate(path: string) {
  const ziel = '#' + path;
  if (location.hash !== ziel) location.hash = ziel;
  window.scrollTo({ top: 0 });
}

export function useRoute(): string[] {
  const lese = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  const [teile, setTeile] = useState(lese);
  useEffect(() => {
    const h = () => setTeile(lese());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return teile;
}
