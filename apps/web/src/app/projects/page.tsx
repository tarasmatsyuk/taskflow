import Link from 'next/link';
import { Logo } from '../../components/logo';
import { LogoutButton } from '../../components/logout-button';
import { apiGet } from '../../lib/server-api';
import type { Paginated, Project, ProjectStatus } from '../../lib/types';

const STATUS_STYLE: Record<ProjectStatus, { color: string; bg: string }> = {
  ACTIVE: { color: 'var(--accent)', bg: 'rgba(194,242,79,.14)' },
  REVIEW: { color: '#ff9f45', bg: 'rgba(255,159,69,.15)' },
  ARCHIVED: { color: 'var(--faint)', bg: 'rgba(255,255,255,.06)' },
};

// Server component: fetches the current user's projects on the server using the
// access-token cookie (no token ever reaches the browser).
export default async function ProjectsPage() {
  const { data: projects } = await apiGet<Paginated<Project>>(
    '/projects?limit=50&sortBy=createdAt&sortOrder=asc',
  );

  return (
    <div className="page">
      <header className="page-top">
        <Logo />
        <span className="name">
          Task<b>Flow</b>
        </span>
        <span className="page-title">Projects</span>
        <span className="spacer" />
        <LogoutButton />
      </header>

      <div className="grid">
        {projects.map((p) => {
          const s = STATUS_STYLE[p.status];
          return (
            <Link className="pcard" key={p.id} href={`/projects/${p.id}`}>
              <div className="accent" style={{ background: p.color }} />
              <div className="body">
                <div className="pcard-top">
                  <div
                    className="pico"
                    style={{
                      background: `color-mix(in srgb, ${p.color} 18%, transparent)`,
                      color: p.color,
                    }}
                  >
                    {p.key}
                  </div>
                  <div>
                    <h3>{p.name}</h3>
                    <span className="key">{p.key}</span>
                  </div>
                  <span
                    className="status-tag"
                    style={{ color: s.color, background: s.bg }}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="pdesc">{p.description ?? 'No description'}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
