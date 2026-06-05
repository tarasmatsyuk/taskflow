'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4200/api';

type Health = { status: string; service: string; timestamp: string };

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

    const [projects, setProjects] = useState<any[]>([]);


  useEffect(() => {
    fetch(`${API}/health`)
      .then((res) => res.json())
      .then(setHealth)
      .catch((e) => setError(e.message));
  }, []);

    useEffect(() => {
    fetch(`${API}/projects`)
      .then((res) => res.json())
      .then(res => {
        setProjects(res.data); 
        console.log(res);
      })
      .catch((e) => setError(e.message));
  }, []);

  const ok = health?.status === 'ok';

  return (
    <main style={{ fontFamily: 'system-ui', padding: 48, maxWidth: 560 }}>
      <h1>TaskFlow</h1>
      <p style={{ color: '#666' }}>Vertical slice: Next.js → NestJS → JSON</p>

      <div style={{ marginTop: 24, padding: 20, border: '1px solid #ddd', borderRadius: 12 }}>
        <strong>API status</strong>
        {error && <p style={{ color: 'crimson' }}>❌ {error}</p>}
        {!error && !health && <p>Checking…</p>}
        {health && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: ok ? '#22c55e' : '#ef4444',
            }} />
            {health.service} — {health.status} @ {health.timestamp}
          </p>
        )}
      </div>
      <ul>
        {projects?.map(project => (
          <li key={project.id}>{project.name} ({project.status})</li>
        ))}
      </ul>
    </main>
  );
}