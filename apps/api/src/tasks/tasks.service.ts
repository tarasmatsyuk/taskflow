import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import type { Cache } from 'cache-manager';
import { EventsGateway } from '../realtime/events.gateway';
import {
  AssignmentJobData,
  EMAIL_JOB,
  EMAIL_QUEUE,
} from '../mail/mail.constants';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';

const ORDER_GAP = 1000; // spacing between tasks; leaves room for fractional inserts
const MIN_GAP = 1; // below this, fractional room is exhausted → rebalance
const BOARD_TTL_MS = 60_000; // board cache is a safety net; invalidated on every write

const boardKey = (projectId: string) => `board:${projectId}`;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async create(projectId: string, dto: CreateTaskDto): Promise<TaskEntity> {
    await this.assertProjectExists(projectId);
    const status = dto.status ?? TaskStatus.BACKLOG;

    // Transaction: derive the next per-project number and the next order
    // within the target column atomically, then create.
    const task = await this.prisma.$transaction(async (tx) => {
      const [lastNumbered, lastInColumn] = await Promise.all([
        tx.task.findFirst({
          where: { projectId },
          orderBy: { number: 'desc' },
          select: { number: true },
        }),
        tx.task.findFirst({
          where: { projectId, status },
          orderBy: { order: 'desc' },
          select: { order: true },
        }),
      ]);

      return tx.task.create({
        data: {
          projectId,
          number: (lastNumbered?.number ?? 0) + 1,
          order: (lastInColumn?.order ?? 0) + ORDER_GAP,
          title: dto.title,
          description: dto.description,
          status,
          priority: dto.priority ?? TaskPriority.MEDIUM,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          assigneeId: dto.assigneeId,
          labels: dto.labelIds?.length
            ? { connect: dto.labelIds.map((id) => ({ id })) }
            : undefined,
        },
        include: TasksService.withRelations,
      });
    });

    await this.invalidateBoard(projectId);
    this.events.emitTaskCreated(projectId, task);
    if (task.assigneeId) {
      await this.enqueueAssignment(task);
    }
    return task;
  }

  // Fetch assignee + labels in the SAME query (avoids per-task N+1 lookups).
  private static readonly withRelations = {
    assignee: { select: { id: true, name: true, email: true } },
    labels: { select: { id: true, name: true, color: true } },
  };

  async findAll(projectId: string, query: QueryTasksDto) {
    const isBoardRead =
      !query.status && !query.assigneeId && !query.labelId;

    // Only the unfiltered board read is cached (that's the hot path the web
    // board fetches and groups client-side).
    if (isBoardRead) {
      const cached = await this.cache.get<TaskEntity[]>(boardKey(projectId));
      if (cached) {
        return cached;
      }
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        status: query.status,
        assigneeId: query.assigneeId,
        deletedAt: null, // soft-deleted tasks are hidden from normal reads
        ...(query.labelId && { labels: { some: { id: query.labelId } } }),
      },
      include: TasksService.withRelations,
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    });

    if (isBoardRead) {
      await this.cache.set(boardKey(projectId), tasks, BOARD_TTL_MS);
    }
    return tasks;
  }

  async findOne(projectId: string, id: string) {
    // Scope by projectId so tasks can't be read across projects via a guessed id.
    // Excludes soft-deleted tasks → a deleted task reads as 404.
    const task = await this.prisma.task.findFirst({
      where: { id, projectId, deletedAt: null },
      include: TasksService.withRelations,
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found in project ${projectId}`);
    }
    return task;
  }

  async update(projectId: string, id: string, dto: UpdateTaskDto) {
    const before = await this.findOne(projectId, id); // 404 if missing / wrong project
    const { labelIds, dueDate, ...rest } = dto;
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        // `set` replaces the label list, so unchecking a label removes it.
        labels: labelIds ? { set: labelIds.map((id) => ({ id })) } : undefined,
      },
      include: TasksService.withRelations,
    });

    await this.invalidateBoard(projectId);
    this.events.emitTaskUpdated(projectId, task);
    // Notify only when the assignee actually changed to someone new.
    if (task.assigneeId && task.assigneeId !== before.assigneeId) {
      await this.enqueueAssignment(task);
    }
    return task;
  }

  async remove(projectId: string, id: string) {
    await this.findOne(projectId, id); // 404 if missing or already deleted
    // Soft delete: mark instead of removing, so it can be restored.
    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.invalidateBoard(projectId);
    this.events.emitTaskDeleted(projectId, id);
  }

  async restore(projectId: string, id: string) {
    // Look up *including* soft-deleted rows so we can revive one.
    const existing = await this.prisma.task.findFirst({ where: { id, projectId } });
    if (!existing) {
      throw new NotFoundException(`Task ${id} not found in project ${projectId}`);
    }
    const task = await this.prisma.task.update({
      where: { id },
      data: { deletedAt: null },
      include: TasksService.withRelations,
    });
    await this.invalidateBoard(projectId);
    // Restore re-adds the card for live boards.
    this.events.emitTaskCreated(projectId, task);
    return task;
  }

  /**
   * Move a task to a column + position. Runs in a transaction so reading the
   * neighbours, computing the fractional order, and writing are consistent.
   */
  async move(projectId: string, id: string, dto: MoveTaskDto) {
    const task = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.task.findFirst({ where: { id, projectId } });
      if (!existing) {
        throw new NotFoundException(`Task ${id} not found in project ${projectId}`);
      }
      const status = dto.status ?? existing.status;

      // Siblings in the target column (excluding the moving task), in order.
      const siblings = await tx.task.findMany({
        where: { projectId, status, id: { not: id }, deletedAt: null },
        orderBy: { order: 'asc' },
        select: { order: true },
      });

      const pos = Math.min(dto.position, siblings.length);
      const prev = siblings[pos - 1]?.order;
      const next = siblings[pos]?.order;

      let order: number;
      if (prev === undefined && next === undefined) {
        order = ORDER_GAP; // empty column
      } else if (prev === undefined) {
        order = next! - ORDER_GAP; // front
      } else if (next === undefined) {
        order = prev + ORDER_GAP; // end
      } else {
        order = (prev + next) / 2; // between two neighbours
      }

      await tx.task.update({ where: { id }, data: { status, order } });

      // Out of fractional room between neighbours → renumber the column evenly.
      if (prev !== undefined && next !== undefined && next - prev < MIN_GAP) {
        await this.rebalance(tx, projectId, status);
      }

      return tx.task.findUniqueOrThrow({
        where: { id },
        include: TasksService.withRelations,
      });
    });

    await this.invalidateBoard(projectId);
    this.events.emitTaskMoved(projectId, task);
    return task;
  }

  /** Reassign evenly-spaced order values to a column (after fractional exhaustion). */
  private async rebalance(
    tx: Prisma.TransactionClient,
    projectId: string,
    status: TaskStatus,
  ) {
    const ordered = await tx.task.findMany({
      where: { projectId, status, deletedAt: null },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    let i = 1;
    for (const t of ordered) {
      await tx.task.update({ where: { id: t.id }, data: { order: i * ORDER_GAP } });
      i++;
    }
  }

  private async assertProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  private invalidateBoard(projectId: string) {
    return this.cache.del(boardKey(projectId));
  }

  /** Enqueue an assignment-notification email for a task's current assignee. */
  private async enqueueAssignment(task: {
    id: string;
    number: number;
    title: string;
    projectId: string;
    assigneeId: string | null;
    assignee?: { name: string; email: string } | null;
  }) {
    if (!task.assignee) return;
    const project = await this.prisma.project.findUnique({
      where: { id: task.projectId },
      select: { key: true },
    });
    const data: AssignmentJobData = {
      to: task.assignee.email,
      assigneeName: task.assignee.name,
      taskTitle: task.title,
      taskNumber: task.number,
      projectKey: project?.key ?? 'TF',
      projectId: task.projectId,
      taskId: task.id,
    };
    await this.emailQueue.add(EMAIL_JOB.assignment, data);
  }
}
