import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ProjectStatus } from '@prisma/client';

// Prisma 7: the client talks to Postgres through a driver adapter.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Demo owner — stands in for the authenticated user until M2 adds real auth.
const DEMO_USER = {
  email: 'taras@taskflow.dev',
  name: 'Taras K.',
};

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

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { name: DEMO_USER.name },
    create: DEMO_USER,
  });

  for (const project of PROJECTS) {
    await prisma.project.upsert({
      where: { key: project.key },
      update: { ...project, ownerId: owner.id },
      create: { ...project, ownerId: owner.id },
    });
  }

  const count = await prisma.project.count();
  console.log(`🌱 Seeded ${owner.name} + ${count} projects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
