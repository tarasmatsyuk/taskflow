import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  MemberRole,
  PrismaClient,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  UserRole,
} from '@prisma/client';
import * as argon2 from 'argon2';

// Prisma 7: the client talks to Postgres through a driver adapter.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Demo owner — log in with this in M2: taras@taskflow.dev / password123
const DEMO_USER = {
  email: 'taras@taskflow.dev',
  name: 'Taras K.',
  role: UserRole.ADMIN,
};
const DEMO_PASSWORD = 'password123';

// The 5 projects from the mockups (taskflow-mockups.html).
const PROJECTS = [
  {
    key: 'TF',
    name: 'TaskFlow',
    color: '#c2f24f',
    status: ProjectStatus.ACTIVE,
    description:
      'The full-stack board app — Nest + Next, the project you are building.',
  },
  {
    key: 'DS',
    name: 'Design System',
    color: '#38bdf8',
    status: ProjectStatus.ACTIVE,
    description: 'Shared component library and design tokens across all apps.',
  },
  {
    key: 'MS',
    name: 'Marketing Site',
    color: '#fb7185',
    status: ProjectStatus.REVIEW,
    description: 'Public landing pages, pricing, and the docs portal.',
  },
  {
    key: 'MA',
    name: 'Mobile App',
    color: '#e879f9',
    status: ProjectStatus.ACTIVE,
    description: 'React Native client sharing the TaskFlow API and auth.',
  },
  {
    key: 'AG',
    name: 'API Gateway',
    color: '#fbbf24',
    status: ProjectStatus.ACTIVE,
    description: 'Edge gateway, rate limiting, and request tracing.',
  },
];

// A few tasks for the TF project, spread across the board columns.
// `order` uses 1000-spacing to leave room for fractional reordering.
const TF_TASKS = [
  { number: 1, title: 'Scaffold Nx monorepo (api, web, shared)', status: TaskStatus.DONE, priority: TaskPriority.LOW, order: 1000 },
  { number: 2, title: 'Docker Compose: postgres, redis, minio', status: TaskStatus.DONE, priority: TaskPriority.LOW, order: 2000 },
  { number: 3, title: 'Projects CRUD module + Swagger docs', status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, order: 3000 },
  { number: 4, title: 'JWT access + refresh token rotation', status: TaskStatus.IN_REVIEW, priority: TaskPriority.URGENT, order: 1000 },
  { number: 5, title: 'Kanban board with dnd-kit + optimistic UI', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, order: 1000 },
  { number: 6, title: 'Next App Router auth with httpOnly cookies', status: TaskStatus.TODO, priority: TaskPriority.HIGH, order: 1000 },
  { number: 7, title: 'WebSocket gateway for live board updates', status: TaskStatus.BACKLOG, priority: TaskPriority.MEDIUM, order: 1000 },
];

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD);
  const owner = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { name: DEMO_USER.name, role: DEMO_USER.role, passwordHash },
    create: { ...DEMO_USER, passwordHash },
  });

  for (const project of PROJECTS) {
    const p = await prisma.project.upsert({
      where: { key: project.key },
      update: { ...project, ownerId: owner.id },
      create: { ...project, ownerId: owner.id },
    });

    // Owner is a member (OWNER role) of their own project.
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: p.id, userId: owner.id } },
      update: { role: MemberRole.OWNER },
      create: { projectId: p.id, userId: owner.id, role: MemberRole.OWNER },
    });

    // Seed tasks only for the flagship TF project.
    if (project.key === 'TF') {
      for (const task of TF_TASKS) {
        await prisma.task.upsert({
          where: { projectId_number: { projectId: p.id, number: task.number } },
          update: { ...task, assigneeId: owner.id },
          create: { ...task, projectId: p.id, assigneeId: owner.id },
        });
      }
    }
  }

  const [projects, members, tasks] = await Promise.all([
    prisma.project.count(),
    prisma.projectMember.count(),
    prisma.task.count(),
  ]);
  console.log(
    `🌱 Seeded ${owner.name} + ${projects} projects, ${members} memberships, ${tasks} tasks.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
