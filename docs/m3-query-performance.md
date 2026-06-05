# M3 — query performance: indexes, query plan, and the N+1 fix

## 1. The board index

The board's hot query is "tasks in a project, by column, in order":

```sql
SELECT * FROM "Task"
WHERE "projectId" = $1 AND status = $2 AND "deletedAt" IS NULL
ORDER BY status, "order";
```

Index added to match it exactly:

```prisma
@@index([projectId, status, order])   // Task
```

Leading `projectId` + `status` serve the `WHERE`; trailing `order` lets Postgres
return rows **already sorted**, skipping a separate sort step.

## 2. Inspecting the plan (EXPLAIN ANALYZE)

On the 7-row seed table the planner correctly ignores the index (a seq scan is
cheaper). To see the index earn its keep, we bulk-loaded 30k tasks **inside a
rolled-back transaction** (no data persisted) and compared plans.

**With the index (planner default):**
```
Index Scan using "Task_projectId_status_order_idx" on "Task"
  Index Cond: (("projectId" = $1) AND (status = 'TODO'))
  Filter: ("deletedAt" IS NULL)
Execution Time: 2.5 ms
```

**Index disabled (forced seq scan), for contrast:**
```
Sort  (Sort Key: "order", quicksort 904kB)
  -> Seq Scan on "Task"
       Filter: deletedAt IS NULL AND projectId = $1 AND status = 'TODO'
       Rows Removed by Filter: 23937
Execution Time: 9.2 ms
```

Takeaways:
- **~3.7× faster** (2.5 ms vs 9.2 ms) at 30k rows, and the gap widens with scale.
- The index version has **no Sort node** — the index supplies rows in `order`.
- The seq scan reads all 30k rows and throws away ~24k ("Rows Removed by Filter").
- Lesson: on tiny tables an index won't be used; always test plans against
  realistic data volumes.

## 3. The N+1 problem and the fix

**N+1:** rendering the board needs each task's assignee. The naive shape is
1 query for the task list + **N** more (one per task) to load each assignee:

```ts
const tasks = await prisma.task.findMany({ where: { projectId } }); // 1
for (const t of tasks) {
  t.assignee = await prisma.user.findUnique({ where: { id: t.assigneeId } }); // ×N
}
```
A 50-task board = 51 round-trips.

**Fix:** fetch the assignee in the same query via `include`. Prisma resolves it
in a single extra batched query (an `IN (...)`), so it's **2 queries total
regardless of N**:

```ts
this.prisma.task.findMany({
  where: { projectId, deletedAt: null },
  include: { assignee: { select: { id: true, name: true, email: true } } },
  orderBy: [{ status: 'asc' }, { order: 'asc' }],
});
```

`findAll` and `findOne` now embed a trimmed `assignee` (id/name/email — no
secrets). Verified: the task-list response carries the assignee object inline.
