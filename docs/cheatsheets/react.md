# React — шпаргалка для інтерв'ю

## Основи

**React** — бібліотека для побудови UI через компоненти. Декларативний підхід: описуєш *що* має бути на екрані, а не *як* це намалювати.

**JSX** — синтаксичний цукор над `React.createElement()`. Транспілюється Babel/SWC у виклики функцій.

**Virtual DOM** — легке представлення DOM у пам'яті. При зміні стану React будує нове дерево, порівнює зі старим (**reconciliation / diffing**) і застосовує мінімальний набір змін до реального DOM.

**Fiber** — архітектура reconciler'а (з React 16): рендер можна переривати, пріоритезувати, розбивати на частини (основа для concurrent features).

## Компоненти

```jsx
// Функціональний компонент — стандарт сьогодні
function TaskCard({ title, onDone }) {
  return <div onClick={onDone}>{title}</div>;
}
```

- **Props** — вхідні дані, read-only (компонент — "чиста функція" відносно props).
- **State** — внутрішні дані, зміна викликає ре-рендер.
- **Однонаправлений потік даних**: дані вниз через props, події вгору через колбеки.
- **key** у списках — допомагає diffing'у зрозуміти, який елемент який. Не використовуй index, якщо список змінюється (видалення/сортування) — будуть баги зі станом.

## Хуки (найважливіше на інтерв'ю)

### useState
```jsx
const [count, setCount] = useState(0);
setCount(c => c + 1); // функціональний апдейт — коли нове значення залежить від старого
```
- Оновлення стану **асинхронні та батчаться** (з React 18 — батчинг скрізь, включно з setTimeout/промісами).
- Стан **імутабельний**: не мутуй об'єкти/масиви, створюй нові (`{...obj}`, `[...arr]`).

### useEffect
```jsx
useEffect(() => {
  const sub = subscribe(id);
  return () => sub.unsubscribe(); // cleanup — перед наступним запуском і при unmount
}, [id]); // залежності
```
- `[]` — тільки після mount; без масиву — після кожного рендеру.
- Виконується **після** того, як браузер намалював екран.
- Для side effects: запити, підписки, таймери. НЕ для трансформації даних для рендеру (це робиться прямо в рендері або через useMemo).
- У StrictMode (dev) ефекти запускаються двічі — перевірка коректності cleanup.

### useRef
```jsx
const inputRef = useRef(null); // доступ до DOM
const timerId = useRef(); // мутабельне значення, що НЕ викликає ре-рендер
```

### useMemo / useCallback
```jsx
const sorted = useMemo(() => [...tasks].sort(byDate), [tasks]); // кешує значення
const handleClick = useCallback(() => select(id), [id]); // кешує функцію
```
- Потрібні для: важких обчислень, стабільних референсів для `React.memo`-дітей або залежностей інших хуків.
- Не обгортай усе підряд — це теж має ціну.

### useContext
```jsx
const theme = useContext(ThemeContext);
```
- Уникає prop drilling. Усі споживачі ре-рендеряться при зміні value — тримай контексти маленькими або розділяй (state окремо, dispatch окремо).

### useReducer
```jsx
const [state, dispatch] = useReducer(reducer, initial);
```
- Для складного стану зі взаємопов'язаними полями; логіка переходів в одному місці.

### Правила хуків
1. Викликати тільки на верхньому рівні (не в умовах/циклах) — React покладається на порядок викликів.
2. Тільки з функціональних компонентів або кастомних хуків.

### Кастомні хуки
```jsx
function useDebounce(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
```

## Життєвий цикл (мовою хуків)

| Фаза | Хук |
|---|---|
| Mount | `useEffect(..., [])` |
| Update | `useEffect(..., [deps])` |
| Unmount | cleanup-функція з useEffect |
| До малювання браузером | `useLayoutEffect` (синхронно, для вимірювання DOM) |

## Оптимізація продуктивності

- **React.memo(Component)** — пропускає ре-рендер, якщо props не змінилися (shallow compare).
- **useMemo / useCallback** — стабільні референси (без них memo-діти все одно ре-рендеряться, бо нова функція ≠ стара).
- **Винесення стану вниз** (colocation) — стан якомога ближче до місця використання.
- **Lazy loading**: `React.lazy(() => import('./Heavy'))` + `<Suspense fallback={...}>`.
- **Віртуалізація списків** — react-window / @tanstack/react-virtual для тисяч рядків.
- Ре-рендер компонента = ре-рендер усіх дітей за замовчуванням (якщо не memo).

## Concurrent features (React 18+)

- **useTransition** — позначити апдейт як нетерміновий: `startTransition(() => setFilter(q))`. UI лишається responsive.
- **useDeferredValue** — відкладена версія значення для важкого рендеру.
- **Suspense** — декларативний loading-стан для lazy-компонентів і даних.
- **Automatic batching** — кілька setState в одному тіку = один рендер.

## Форми

- **Controlled** — значення зі стейту: `<input value={v} onChange={e => setV(e.target.value)} />`. Повний контроль, валідація на льоту.
- **Uncontrolled** — DOM тримає значення, читаєш через ref. Менше ре-рендерів.
- На практиці: **react-hook-form** (uncontrolled під капотом, швидкий) + zod для валідації.

## Управління станом

- **Локальний**: useState/useReducer.
- **Глобальний клієнтський**: Context (рідкі зміни — тема, юзер), Zustand/Redux Toolkit (часті зміни).
- **Серверний стан**: TanStack Query / SWR — кешування, рефетч, інвалідація, optimistic updates. Серверні дані ≠ клієнтський стан, не клади їх у Redux.

```jsx
// TanStack Query — типовий патерн
const { data, isLoading } = useQuery({ queryKey: ['tasks', projectId], queryFn: fetchTasks });
const mutation = useMutation({
  mutationFn: moveTask,
  onMutate: async (next) => { /* optimistic update */ },
  onError: (e, vars, ctx) => { /* rollback */ },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
});
```

## Error Boundaries

- Ловлять помилки рендеру в дітях. Тільки класові компоненти (`componentDidCatch`, `getDerivedStateFromError`) або бібліотека `react-error-boundary`.
- НЕ ловлять: помилки в обробниках подій, async-коді, SSR.

## Часті питання на інтерв'ю

1. **Чому не можна мутувати стан?** React порівнює референси (Object.is); мутація = той самий референс = ре-рендеру не буде.
2. **Що таке closure trap (stale closure)?** Колбек "запам'ятав" старе значення стану. Рішення: функціональний апдейт, правильні deps, useRef.
3. **key={index} — чому погано?** При зміні порядку React переплутає елементи: стан інпутів "прилипне" не до тих рядків.
4. **useEffect vs useLayoutEffect?** layout — синхронно до paint (вимірювання/мутація DOM без миготіння); effect — після paint.
5. **Чим відрізняється state від props?** props — ззовні, read-only; state — всередині, змінюється через setter.
6. **Як працює reconciliation?** Порівняння дерев: різний тип елемента → перебудова піддерева; той самий тип → оновлення атрибутів; списки — за key.
7. **Controlled vs uncontrolled?** Хто джерело правди — React-стейт чи DOM.
8. **React.memo не працює — чому?** Inline-об'єкти/функції в props: `style={{...}}` — щоразу новий референс.
