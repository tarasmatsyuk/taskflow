import axios from 'axios';

// Server-side base URL for the NestJS API. The browser never calls this
// directly — it goes through the BFF route handlers in app/api/*.
export const API_URL = process.env.API_URL ?? 'http://localhost:4200/api';

// Shared axios instance for all server-side calls to the API.
// validateStatus: never throw — callers inspect res.status themselves, so the
// BFF can pass the API's status/body straight through to the browser.
export const api = axios.create({
  baseURL: API_URL,
  validateStatus: () => true,
});
