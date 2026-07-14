# Next.js — шпаргалка для інтерв'ю

## Що таке Next.js

Фулстек-фреймворк поверх React: роутинг, SSR/SSG, API-ендпоінти, оптимізація зображень/шрифтів, code splitting з коробки. Сучасний стандарт — **App Router** (з v13), старий — Pages Router.

## Рендеринг — головна тема інтерв'ю

| Стратегія | Коли генерується HTML | Для чого |
|---|---|---|
| **SSR** (Server-Side Rendering) | На кожен запит | Персоналізовані/динамічні дані |
| **SSG** (Static Site Generation) | На етапі build | Блог, лендінги, докси |
| **ISR** (Incremental Static Regeneration) | Build + регенерація по таймеру/on-demand | Каталоги, контент що рідко змінюється |
| **CSR** (Client-Side Rendering) | У браузері | Дашборди за логіном, інтерактив |

- **Hydration** — браузер отримує готовий HTML, потім React "оживляє" його: навішує обробники подій. Hydration mismatch — коли серверний HTML ≠ перший клієнтський рендер (типово: `Date.now()`, `window`, random).
- App Router: статичний рендеринг за замовчуванням; сторінка стає динамічною, якщо використовує `cookies()`, `headers()`, `searchParams` або `fetch` з `cache: 'no-store'`.

## App Router — структура

```
app/
  layout.tsx        — спільний layout (зберігає стан між навігаціями)
  page.tsx          — сторінка маршруту
  loading.tsx       — Suspense fallback
  error.tsx         — error boundary ('use client' обов'язково)
  not-found.tsx
  projects/
    [id]/page.tsx   — динамічний сегмент → params.id
    [...slug]       — catch-all
  api/
    tasks/route.ts  — Route Handler (GET, POST, ...)
  (marketing)/      — route group, не впливає на URL
```

## Server Components vs Client Components

**За замовчуванням усі компоненти в `app/` — серверні.**

| | Server Component | Client Component |
|---|---|---|
| Директива | (default) | `'use client'` зверху файлу |
| Виконується | Тільки на сервері | Сервер (SSR) + браузер |
| Можна | async/await, прямий доступ до БД, секрети | useState, useEffect, onClick, browser API |
| Не можна | хуки стану, обробники подій | імпортувати Server Component |
| JS у бандлі | Не потрапляє | Потрапляє |

```tsx
// Server Component — async, дані напряму
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next 15: params — Promise
  const project = await getProject(id);
  return <Board project={project} />;
}
```

- `'use client'` — це **межа**: всі імпорти такого файлу теж стають клієнтськими.
- Серверний компонент МОЖНА передати клієнтському як `children`/props.
- **RSC payload** — серіалізований результат серверних компонентів; props через межу мають бути серіалізовними (не функції, крім Server Actions).

## Отримання даних

```tsx
// У Server Component — просто fetch/ORM
const res = await fetch('https://api...', {
  cache: 'force-cache',          // кешувати (SSG-поведінка)
  // cache: 'no-store',          // щоразу свіже (SSR)
  next: { revalidate: 60 },      // ISR: раз на 60с
  next: { tags: ['tasks'] },     // для revalidateTag
});
```

- Дедуплікація: однакові fetch в одному рендері виконуються один раз (`cache()` з React для не-fetch).
- **On-demand revalidation**: `revalidatePath('/projects')`, `revalidateTag('tasks')`.
- Паралельні запити: `Promise.all`; послідовні — await один за одним (waterfall — антипатерн).
- **Streaming**: `loading.tsx` або `<Suspense>` — віддати оболонку одразу, повільні частини достріляти потім.

## Server Actions

```tsx
'use server';
export async function createTask(formData: FormData) {
  await db.task.create({ data: { title: formData.get('title') as string } });
  revalidatePath('/board');
}
```
```tsx
// у клієнтському компоненті
<form action={createTask}>...</form>
```
- Мутації без ручних API-ендпоінтів; працюють і без JS (progressive enhancement).
- `useActionState` / `useFormStatus` — стан відправки і помилки.
- Це POST-ендпоінти під капотом — валідуй вхід і перевіряй авторизацію всередині.

## Route Handlers (API)

```ts
// app/api/tasks/route.ts
import { NextResponse } from 'next/server';
export async function GET(req: Request) {
  return NextResponse.json({ tasks: [] });
}
```
- Замінюють pages/api. Підтримують усі HTTP-методи.

## Навігація

- `<Link href="/projects">` — клієнтська навігація + **prefetch** видимих лінків.
- `useRouter()` (з `next/navigation`!): `router.push/replace/refresh`.
- `usePathname()`, `useSearchParams()` — клієнтські хуки.
- `redirect('/login')`, `notFound()` — у серверному коді.

## Middleware

```ts
// middleware.ts (корінь проєкту)
export function middleware(req: NextRequest) {
  if (!req.cookies.get('token')) return NextResponse.redirect(new URL('/login', req.url));
}
export const config = { matcher: ['/dashboard/:path*'] };
```
- Виконується **до** маршруту, на edge runtime. Для auth-редіректів, заголовків, A/B, geo. Без важкої логіки/БД.

## Оптимізації з коробки

- `next/image` — lazy loading, resize, WebP/AVIF, без layout shift (треба width/height).
- `next/font` — self-hosted шрифти, без запитів до Google, без FOUT.
- `next/script` — стратегії завантаження сторонніх скриптів.
- **Автоматичний code splitting** по маршрутах; `dynamic(() => import(...), { ssr: false })` для важких клієнтських компонентів.
- Metadata API: `export const metadata = {...}` або `generateMetadata()` — SEO.

## Кешування в App Router (4 шари)

1. **Request memoization** — дедуплікація fetch в одному рендері.
2. **Data Cache** — кеш результатів fetch між запитами (керується `cache`/`revalidate`).
3. **Full Route Cache** — кеш HTML+RSC статичних маршрутів.
4. **Router Cache** — клієнтський кеш відвіданих маршрутів.

(У Next 15 fetch і Route Handlers за замовчуванням **не кешуються** — зміна порівняно з 14.)

## Pages Router (legacy — можуть спитати)

- `getServerSideProps` — SSR на кожен запит.
- `getStaticProps` + `getStaticPaths` — SSG/ISR (`revalidate` у return).
- `_app.tsx`, `_document.tsx`; API — `pages/api/*`.

## Часті питання на інтерв'ю

1. **SSR vs SSG vs ISR — коли що?** Динамічні персональні дані → SSR; контент відомий на build → SSG; багато сторінок, що інколи змінюються → ISR.
2. **Чому Server Components?** Менше JS у бандлі, прямий доступ до даних, секрети не течуть на клієнт.
3. **Hydration error — причини?** Невідповідність серверного і клієнтського рендеру: `window`, дати, random, неправильна вкладеність HTML.
4. **Server Actions vs Route Handlers?** Actions — для мутацій з власного UI (форми); Handlers — публічне API, вебхуки, інші клієнти.
5. **Як захистити маршрути?** Middleware для редіректів + перевірка сесії в layout/page/action (middleware сам по собі — не єдиний рубіж).
6. **Що таке streaming/Suspense у Next?** Віддаємо HTML частинами: оболонку миттєво, повільні блоки — як будуть готові.
7. **`use client` робить компонент тільки клієнтським?** Ні — він усе одно пре-рендериться на сервері (SSR), просто також гідрується і виконується в браузері.
