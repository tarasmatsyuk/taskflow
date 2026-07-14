'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type {
  Attachment,
  Label,
  Task,
  TaskPriority,
  TaskStatus,
} from '../lib/types';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB — matches the API limit.

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Attachments for an existing task: list, upload, download, delete. */
function AttachmentsSection({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const listKey = ['attachments', taskId];
  const base = `/api/projects/${projectId}/tasks/${taskId}/attachments`;

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: listKey,
    queryFn: async () => (await axios.get<Attachment[]>(base)).data,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post(base, form);
      if (res.status >= 400) throw new Error('upload failed');
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`/api/attachments/${id}`);
      if (res.status >= 400) throw new Error('delete failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('File exceeds the 10 MB limit.');
      e.target.value = '';
      return;
    }
    upload.mutate(file, {
      onSettled: () => {
        if (inputRef.current) inputRef.current.value = '';
      },
    });
  }

  async function download(id: string) {
    const res = await axios.get<{ url: string }>(`/api/attachments/${id}`);
    if (res.status < 400 && res.data?.url) {
      window.open(res.data.url, '_blank', 'noopener');
    }
  }

  return (
    <div className="field">
      <label>Attachments</label>
      {isLoading ? (
        <p className="sub">Loading…</p>
      ) : attachments.length > 0 ? (
        <ul className="attach-list">
          {attachments.map((a) => (
            <li key={a.id} className="attach-row">
              <button
                type="button"
                className="attach-name"
                onClick={() => download(a.id)}
                title="Download"
              >
                {a.filename}
              </button>
              <span className="attach-size">{formatBytes(a.size)}</span>
              <button
                type="button"
                className="attach-del"
                onClick={() => remove.mutate(a.id)}
                disabled={remove.isPending}
                aria-label={`Delete ${a.filename}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sub">No attachments yet.</p>
      )}
      <input
        ref={inputRef}
        type="file"
        onChange={onPick}
        disabled={upload.isPending}
      />
      {upload.isPending && <p className="sub">Uploading…</p>}
      {(error || upload.isError) && (
        <p className="field-error">
          {error ?? 'Upload failed. Please try again.'}
        </p>
      )}
    </div>
  );
}

const STATUSES: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

type FormValues = {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
};

export function TaskModal({
  projectId,
  task,
  onClose,
}: {
  projectId: string;
  task?: Task;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const editing = Boolean(task);
  const [labelIds, setLabelIds] = useState<string[]>(
    task?.labels.map((l) => l.id) ?? [],
  );

  const { data: labels = [] } = useQuery({
    queryKey: ['labels', projectId],
    queryFn: async () =>
      (await axios.get<Label[]>(`/api/projects/${projectId}/labels`)).data,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'BACKLOG',
      priority: task?.priority ?? 'MEDIUM',
    },
  });

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = { ...values, labelIds };
      return editing
        ? axios.patch(`/api/projects/${projectId}/tasks/${task!.id}`, payload)
        : axios.post(`/api/projects/${projectId}/tasks`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      onClose();
    },
  });

  const toggleLabel = (id: string) =>
    setLabelIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{editing ? 'Edit task' : 'New task'}</h2>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
          <div className="field">
            <label>Title</label>
            <div className={`input ${errors.title ? 'invalid' : ''}`}>
              <input
                autoFocus
                placeholder="What needs doing?"
                {...register('title', { required: 'Title is required' })}
              />
            </div>
            {errors.title && <p className="field-error">{errors.title.message}</p>}
          </div>

          <div className="field">
            <label>Description</label>
            <div className="input">
              <input placeholder="Optional" {...register('description')} />
            </div>
          </div>

          <div className="field">
            <label>Status</label>
            <select className="select" {...register('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Priority</label>
            <select className="select" {...register('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {labels.length > 0 && (
            <div className="field">
              <label>Labels</label>
              <div className="label-picker">
                {labels.map((l) => {
                  const on = labelIds.includes(l.id);
                  return (
                    <button
                      type="button"
                      key={l.id}
                      className={`chip${on ? ' chip-on' : ''}`}
                      style={{ color: l.color, borderColor: l.color }}
                      onClick={() => toggleLabel(l.id)}
                    >
                      {on ? '✓ ' : ''}
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {editing && (
            <AttachmentsSection projectId={projectId} taskId={task!.id} />
          )}

          {save.isError && (
            <p className="field-error">Failed to save. Please try again.</p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn compact btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn compact" disabled={isSubmitting}>
              {editing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
