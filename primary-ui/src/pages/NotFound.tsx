import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div
        className="text-center p-10 rounded"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}
      >
        <h1
          className="font-bold mb-4"
          style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--text-primary)' }}
        >
          404
        </h1>
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>Page not found</p>
        <a
          href="/"
          className="underline transition-colors"
          style={{ color: 'var(--accent-gold)' }}
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
