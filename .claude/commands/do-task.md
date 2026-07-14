---
description: Implement a task end-to-end using the frontend/backend/db agent team, open a PR, then run code review on it.
argument-hint: "<task description>"
allowed-tools: Agent, Skill, TaskCreate, TaskUpdate, Bash(git status:*), Bash(git checkout:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git diff:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(nx:*), Bash(pnpm:*)
---

Implement the following task end-to-end, then open a PR and get it reviewed.

Task: $ARGUMENTS

**Agent assumptions (applies to all agents and subagents):** all tools are functional and will work without error — do not test tools or make exploratory calls. Only call a tool if it's required to complete the task.

Follow these steps precisely:

1. **Plan.** Read the task description above and break it into the concrete pieces of work needed across the stack: database/schema changes, backend/API changes, and frontend/UI changes. Not every task touches all three layers — decide which of `db-guy`, `backend-guy`, `frontend-guy` are actually needed and state that decision (and why) before proceeding. Use TaskCreate to track the steps you're about to run.

2. **Check the working tree.** Run `git status`. If there are uncommitted changes unrelated to this task, stop and ask the user how to proceed rather than branching over their in-progress work.

3. **Branch.** Create and check out a new branch off the current branch, named `task/<short-kebab-case-description>`.

4. **Implement, in dependency order.** Schema changes block API changes, which block UI changes that depend on them. Launch only the agents this task needs, in this order, waiting for each to finish before starting the next:
   a. `db-guy` — schema/migration changes, if needed.
   b. `backend-guy` — API/service changes, if needed. Tell it what `db-guy` changed (new fields/models) so it isn't rediscovering that from scratch.
   c. `frontend-guy` — UI changes, if needed. Tell it the exact API shape `backend-guy` produced (new/changed endpoints, request/response fields) so it implements against reality, not assumptions.

   Give each agent the relevant slice of the task description, not just "do your part" — it needs enough context to make good calls within its own domain.

5. **Verify.** Run the relevant `nx` typecheck/lint/test targets for every project touched (e.g. `nx affected -t lint,test,typecheck`). Fix failures before continuing — do not open a PR on a broken build. If a fix requires crossing a domain boundary (e.g. a frontend type error caused by a backend change), route the fix back to the owning agent rather than patching it yourself.

6. **Commit and push.** Stage only files relevant to this task (never `git add -A`/`-u` blindly — review `git status` first). Write a commit message explaining why the change was made. Push the branch with `git push -u origin <branch>`.

7. **Open the PR.** Use `gh pr create` with a title (<70 chars) and a body containing a summary and a test plan, based on what steps 1–5 actually did.

8. **Review.** Invoke the `code-review` skill with args `<PR#> --comment`, where `<PR#>` is the number `gh pr create` just returned. The `--comment` flag makes it post its findings as inline comments directly on the PR (or a summary comment if no issues were found) — this is a visible action on a shared PR, not just a local report.

9. **Report back** to the user: the PR URL, which agents were used and why, and a summary of the code-review findings. Do not merge the PR — that's the user's call.

Notes:
- Steps 3 onward push real commits and open a real PR — this command performs consequential, hard-to-fully-reverse actions each time it runs. If the task description is ambiguous about scope, ask a clarifying question before branching rather than guessing.
- Do not skip step 5 — integration bugs between the three layers are the main risk of splitting implementation by role.
