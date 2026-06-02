import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer auto-loads .env or reads the datasource URL from the schema.
// We load the root .env (above) and hand the connection URL to Migrate here.
export default defineConfig({
  schema: 'apps/api/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'tsx apps/api/prisma/seed.ts',
  },
});
