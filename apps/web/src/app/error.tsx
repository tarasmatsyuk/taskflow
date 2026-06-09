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
    <div className="center-screen">
      <h1>Something went wrong</h1>
      <p>{error.message || 'Failed to load. The API may be unavailable.'}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn compact" onClick={() => reset()}>
          Try again
        </button>
        <Link className="btn compact" href="/projects">
          Back to projects
        </Link>
      </div>
    </div>
  );
}
