'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import type { Task, TaskPriority, TaskStatus } from '../lib/types';

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
    mutationFn: (values: FormValues) =>
      editing
        ? axios.patch(`/api/projects/${projectId}/tasks/${task!.id}`, values)
        : axios.post(`/api/projects/${projectId}/tasks`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      onClose();
    },
  });

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
