// Server-side base URL for the NestJS API. The browser never calls this
// directly — it goes through the BFF route handlers in app/api/*.
export const API_URL = process.env.API_URL ?? 'http://localhost:4200/api';
