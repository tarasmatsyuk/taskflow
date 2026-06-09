import Link from 'next/link';
import { Logo } from '../../../components/logo';
import { LogoutButton } from '../../../components/logout-button';
import { apiGet } from '../../../lib/server-api';
import type { Project, Task, TaskPriority, TaskStatus } from '../../../lib/types';

const COLUMNS: { status: TaskStatus; name: string; dot: string }[] = [
  { status: 'BACKLOG', name: 'Backlog', dot: 'var(--faint)' },
  { status: 'TODO', name: 'To Do', dot: 'var(--sky)' },
  { status: 'IN_PROGRESS', name: 'In Progress', dot: '#ff9f45' },
  { status: 'IN_REVIEW', name: 'In Review', dot: 'var(--violet)' },
  { status: 'DONE', name: 'Done', dot: 'var(--accent)' },
];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  URGENT: '#ff5d6c',
  HIGH: '#ff9f45',
  MEDIUM: '#56b6ff',
  LOW: '#6b7280',
};

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, tasks] = await Promise.all([
    apiGet<Project>(`/projects/${id}`),
    apiGet<Task[]>(`/projects/${id}/tasks`),
  ]);

  const byStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

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

      <div className="board">
        {COLUMNS.map((col) => {
          const colTasks = byStatus(col.status);
          return (
            <div className="col" key={col.status}>
              <div className="col-head">
                <span className="col-dot" style={{ background: col.dot }} />
                <span className="col-name">{col.name}</span>
                <span className="col-count">{colTasks.length}</span>
              </div>
              <div className="col-body">
                {colTasks.map((t) => (
                  <div className="card" key={t.id}>
                    <span
                      className="prio"
                      style={{ background: PRIORITY_COLOR[t.priority] }}
                    />
                    <div className="card-top">
                      <span className="tid">
                        {project.key}-{t.number}
                      </span>
                    </div>
                    <h4>{t.title}</h4>
                    <div className="card-foot">
                      <span
                        className="prio-tag"
                        style={{ color: PRIORITY_COLOR[t.priority] }}
                      >
                        {t.priority}
                      </span>
                      {t.assignee && (
                        <span
                          className="ava"
                          title={t.assignee.name}
                          style={{ background: 'var(--accent)' }}
                        >
                          {initials(t.assignee.name)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <p className="col-empty">No tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
