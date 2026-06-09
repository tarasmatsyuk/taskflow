import Link from 'next/link';
import { Board } from '../../../components/board';
import { Logo } from '../../../components/logo';
import { LogoutButton } from '../../../components/logout-button';
import { apiGet } from '../../../lib/server-api';
import type { Project, Task } from '../../../lib/types';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Fetch on the server for first paint; the Board hydrates this into TanStack
  // Query as initialData and takes over client-side.
  const [project, tasks] = await Promise.all([
    apiGet<Project>(`/projects/${id}`),
    apiGet<Task[]>(`/projects/${id}/tasks`),
  ]);

  return (
    <div className="page">
      <header className="page-top">
        <Logo />
        <span className="crumb">
          <Link href="/projects">Projects</Link> /{' '}
        </span>
        <span className="page-title" style={{ marginLeft: 0 }}>
          {project.name}
        </span>
        <span className="key" style={{ marginLeft: 4 }}>
          {project.key}
        </span>
        <span className="spacer" />
        <LogoutButton />
      </header>

      <Board projectId={id} projectKey={project.key} initialTasks={tasks} />
    </div>
  );
}
