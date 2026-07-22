import '@testing-library/jest-dom';

// jsdom doesn't implement matchMedia — default to "no preference" so any
// component reading prefers-reduced-motion (or similar) doesn't crash.
// Individual tests can still override window.matchMedia locally as needed.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
