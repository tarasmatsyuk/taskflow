import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { DigestJobData, EMAIL_JOB, EMAIL_QUEUE } from '../mail/mail.constants';

const LOOKAHEAD_MS = 48 * 60 * 60 * 1000; // tasks due within 48h

/**
 * Daily due-date digest. Finds tasks due within the next 48h, groups them by
 * assignee, and enqueues one digest email per assignee onto the email queue.
 */
@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(EMAIL_QUEUE) private readonly queue: Queue,
  ) {}

  // Runs daily at 08:00 server time. Set DIGEST_CRON_DISABLED=true to skip.
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'due-date-digest' })
  async handleDailyDigest() {
    if (this.config.get<string>('DIGEST_CRON_DISABLED') === 'true') {
      return;
    }
    await this.runDigest();
  }

  /** Extracted so it can be invoked ad-hoc (e.g. for a demo) as well as by cron. */
  async runDigest() {
    const now = new Date();
    const until = new Date(now.getTime() + LOOKAHEAD_MS);

    const tasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        assigneeId: { not: null },
        dueDate: { gte: now, lte: until },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { key: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Group by assignee.
    const byAssignee = new Map<string, DigestJobData>();
    for (const t of tasks) {
      if (!t.assignee || !t.dueDate) continue;
      const entry = byAssignee.get(t.assignee.id) ?? {
        to: t.assignee.email,
        assigneeName: t.assignee.name,
        tasks: [],
      };
      entry.tasks.push({
        projectKey: t.project.key,
        number: t.number,
        title: t.title,
        dueDate: t.dueDate.toISOString(),
      });
      byAssignee.set(t.assignee.id, entry);
    }

    for (const data of byAssignee.values()) {
      await this.queue.add(EMAIL_JOB.digest, data);
    }
    this.logger.log(
      `Due-date digest: enqueued ${byAssignee.size} email(s) for ${tasks.length} task(s)`,
    );
    return { assignees: byAssignee.size, tasks: tasks.length };
  }
}
