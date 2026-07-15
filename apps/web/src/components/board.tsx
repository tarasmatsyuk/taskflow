'use client';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Label, Task, TaskPriority, TaskStatus } from '../lib/types';
import { TaskModal } from './task-modal';

// Bare API origin for the realtime socket (NOT the /api BFF prefix).
const WS_URL = process.env.NEXT_PUBLIC_API_WS_URL ?? 'http://localhost:4200';

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

const initials = (name: string) =>
  name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

/** Presentational card (shared by the draggable card and the drag overlay). */
function CardView({ task, projectKey }: { task: Task; projectKey: string }) {
  return (
    <>
      <span className="prio" style={{ background: PRIORITY_COLOR[task.priority] }} />
      <div className="card-top">
        <span className="tid">
          {projectKey}-{task.number}
        </span>
      </div>
      <h4>{task.title}</h4>
      {task.labels?.length > 0 && (
        <div className="labels">
          {task.labels.map((l) => (
            <span
              key={l.id}
              className="lab"
              style={{ color: l.color, background: `color-mix(in srgb, ${l.color} 16%, transparent)` }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}
      <div className="card-foot">
        <span className="prio-tag" style={{ color: PRIORITY_COLOR[task.priority] }}>
          {task.priority}
        </span>
        {task.assignee && (
          <span className="ava" title={task.assignee.name} style={{ background: 'var(--accent)' }}>
            {initials(task.assignee.name)}
          </span>
        )}
      </div>
    </>
  );
}

function DraggableCard({
  task,
  projectKey,
  onOpen,
}: {
  task: Task;
  projectKey: string;
  onOpen: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  return (
    <div
      ref={setNodeRef}
      className="card"
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
      onClick={() => onOpen(task)}
      {...listeners}
      {...attributes}
    >
      <CardView task={task} projectKey={projectKey} />
    </div>
  );
}

function Column({
  status,
  name,
  dot,
  tasks,
  projectKey,
  onOpen,
}: {
  status: TaskStatus;
  name: string;
  dot: string;
  tasks: Task[];
  projectKey: string;
  onOpen: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="col">
      <div className="col-head">
        <span className="col-dot" style={{ background: dot }} />
        <span className="col-name">{name}</span>
        <span className="col-count">{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className={`col-body${isOver ? ' col-over' : ''}`}>
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} projectKey={projectKey} onOpen={onOpen} />
        ))}
        {tasks.length === 0 && <p className="col-empty">Drop here</p>}
      </div>
    </div>
  );
}

export function Board({
  projectId,
  projectKey,
  initialTasks,
}: {
  projectId: string;
  projectKey: string;
  initialTasks: Task[];
}) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // null = closed; { task } = edit; {} = create.
  const [modal, setModal] = useState<{ task?: Task } | null>(null);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () =>
      (await axios.get<Task[]>(`/api/projects/${projectId}/tasks`)).data,
    initialData: initialTasks,
  });

  const { data: labels = [] } = useQuery({
    queryKey: ['labels', projectId],
    queryFn: async () =>
      (await axios.get<Label[]>(`/api/projects/${projectId}/labels`)).data,
  });

  // Realtime: subscribe to this project's room and fold live task events into
  // the TanStack Query cache (no refetch). Upsert-by-id makes events idempotent,
  // so the local user's own optimistic mutations just re-settle to server truth.
  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

    const upsert = (task: Task) =>
      queryClient.setQueryData<Task[]>(['tasks', projectId], (old = []) =>
        old.some((t) => t.id === task.id)
          ? old.map((t) => (t.id === task.id ? task : t))
          : [...old, task],
      );
    const drop = (id: string) =>
      queryClient.setQueryData<Task[]>(['tasks', projectId], (old = []) =>
        old.filter((t) => t.id !== id),
      );

    (async () => {
      try {
        const { data, status } = await axios.get<{ token: string }>(
          '/api/realtime/token',
        );
        if (cancelled || status >= 400 || !data?.token) return;
        socket = io(WS_URL, {
          auth: { token: data.token },
          transports: ['websocket'],
        });
        socket.on('connect', () => socket?.emit('join', { projectId }));
        socket.on('task.created', upsert);
        socket.on('task.updated', upsert);
        socket.on('task.moved', upsert);
        socket.on('task.deleted', (p: { id: string }) => drop(p.id));
      } catch {
        // Realtime is best-effort; the board still works without it.
      }
    })();

    return () => {
      cancelled = true;
      if (socket) {
        socket.emit('leave', { projectId });
        socket.disconnect();
      }
    };
  }, [projectId, queryClient]);

  const move = useMutation({
    mutationFn: (vars: { taskId: string; status: TaskStatus; position: number }) =>
      axios.patch(`/api/projects/${projectId}/tasks/${vars.taskId}/move`, {
        status: vars.status,
        position: vars.position,
      }),
    // Optimistic: move the card in the cache immediately so the board feels instant.
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      const previous = queryClient.getQueryData<Task[]>(['tasks', projectId]);
      queryClient.setQueryData<Task[]>(['tasks', projectId], (old = []) => {
        const targetOrders = old
          .filter((t) => t.status === vars.status && t.id !== vars.taskId)
          .map((t) => t.order);
        const newOrder = targetOrders.length ? Math.max(...targetOrders) + 1000 : 1000;
        return old.map((t) =>
          t.id === vars.taskId ? { ...t, status: vars.status, order: newOrder } : t,
        );
      });
      return { previous };
    },
    // Roll back to the snapshot if the request fails.
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['tasks', projectId], ctx.previous);
      }
    },
    // Resync with the server's authoritative order regardless of outcome.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  // Require a small drag distance so clicks don't trigger a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const byStatus = (status: TaskStatus) =>
    tasks
      .filter(
        (t) =>
          t.status === status &&
          (!labelFilter || t.labels.some((l) => l.id === labelFilter)),
      )
      .sort((a, b) => a.order - b.order);

  function onDragStart(e: DragStartEvent) {
    setActiveTask((e.active.data.current?.task as Task) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const task = e.active.data.current?.task as Task | undefined;
    const targetStatus = e.over?.id as TaskStatus | undefined;
    if (!task || !targetStatus || task.status === targetStatus) return;

    // Append to the end of the target column.
    const position = tasks.filter(
      (t) => t.status === targetStatus && t.id !== task.id,
    ).length;
    move.mutate({ taskId: task.id, status: targetStatus, position });
  }

  return (
    <>
      <div className="board-toolbar">
        <div className="filter-chips">
          {labels.length > 0 && (
            <button
              className={`chip${labelFilter === null ? ' chip-on' : ''}`}
              onClick={() => setLabelFilter(null)}
            >
              All
            </button>
          )}
          {labels.map((l) => (
            <button
              key={l.id}
              className={`chip${labelFilter === l.id ? ' chip-on' : ''}`}
              style={{ color: l.color, borderColor: l.color }}
              onClick={() => setLabelFilter(labelFilter === l.id ? null : l.id)}
            >
              {l.name}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button className="btn compact" onClick={() => setModal({})}>
          + New task
        </button>
      </div>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="board">
          {COLUMNS.map((col) => (
            <Column
              key={col.status}
              status={col.status}
              name={col.name}
              dot={col.dot}
              tasks={byStatus(col.status)}
              projectKey={projectKey}
              onOpen={(task) => setModal({ task })}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="card" style={{ cursor: 'grabbing' }}>
              <CardView task={activeTask} projectKey={projectKey} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modal && (
        <TaskModal
          projectId={projectId}
          task={modal.task}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
