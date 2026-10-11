import { useEffect } from 'react';

/** /mockups → the static mockup index in public/mockups (the SPA router would otherwise 404 it). */
const MockupsRedirect = () => {
  useEffect(() => {
    window.location.replace('/mockups/index.html');
  }, []);
  return null;
};

export default MockupsRedirect;
