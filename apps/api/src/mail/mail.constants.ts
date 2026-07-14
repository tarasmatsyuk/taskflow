/** BullMQ queue that backs all outgoing mail. */
export const EMAIL_QUEUE = 'emails';

/** Job names on the email queue. */
export const EMAIL_JOB = {
  assignment: 'assignment',
  digest: 'digest',
} as const;

/** Payload for an assignment-notification job. */
export interface AssignmentJobData {
  to: string;
  assigneeName: string;
  taskTitle: string;
  taskNumber: number;
  projectKey: string;
  projectId: string;
  taskId: string;
}

/** Payload for a due-date digest job (one per assignee). */
export interface DigestJobData {
  to: string;
  assigneeName: string;
  tasks: Array<{
    projectKey: string;
    number: number;
    title: string;
    dueDate: string;
  }>;
}
