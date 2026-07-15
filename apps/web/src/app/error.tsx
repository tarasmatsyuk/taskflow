'use client';
import Link from 'next/link';

// Catches errors thrown while rendering pages (e.g. an API call failing) and
// shows a friendly fallback with a retry instead of crashing.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="center-screen error-scene">
      <div className="error-thread" aria-hidden="true" />
      <svg className="error-break" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2v7l-3 2 3 2v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <div className="error-card-wrap">
        <svg className="error-card" viewBox="0 0 132 88" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="130" height="86" rx="13" fill="var(--surface-2)" stroke="var(--border-strong)" />
          <rect x="16" y="18" width="62" height="8" rx="4" fill="var(--rose)" opacity=".85" />
          <rect x="16" y="38" width="90" height="6" rx="3" fill="var(--faint)" />
          <rect x="16" y="52" width="70" height="6" rx="3" fill="var(--faint)" />
          <circle cx="107" cy="21" r="4" fill="var(--rose)" opacity=".5" />
        </svg>
      </div>
      <h1>This page couldn&apos;t load</h1>
      <p>{error.message || 'Failed to load. The API may be unavailable.'}</p>
      <div className="error-actions">
        <button className="btn compact btn-rose" onClick={() => reset()}>
          Try again
        </button>
        <Link className="btn compact btn-ghost" href="/projects">
          Back to projects
        </Link>
      </div>
    </div>
  );
}
