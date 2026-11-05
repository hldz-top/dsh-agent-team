# Team protocol (shared by all five seats)

Every seat on this team mounts this skill. It is the coordination contract: how to read
the project ledger, how to claim work, and how to use the Agent Team surface.

## When to use

- At the start of any task that touches `projects/<name>/` — read the ledger before acting.
- Before writing files another seat may also touch.
- When you are blocked, when you finish a task card, or when you must hand work to a teammate.

## The ledger

The team's source of truth is the repository, not a chat window.

| Path | Holds |
|---|---|
| `projects/<name>/project.md` | Goal, owner decisions, success criteria, current status, area list |
| `projects/<name>/tasks.md` | The task board: one card per unit of work |
| `projects/<name>/qa/` | QA packs and run reports (`ACC-*.md`, `run-YYYY-MM-DD-*.md`) |
| `projects/<name>/notes/` | Research, logs, decisions that are not tasks |

Card fields are fixed by the `pm` seat; do not invent others:
`Id:` `Status:` `Owner:` `Scope:` `Depends on:` `Blocked by:` `Acceptance:` `Note:`.
`Id:` and `Owner:` are mandatory on every project and every card.

Task status vocabulary is fixed: `Todo` → `In Progress` → `Review` → `Done`, plus `Blocked`
as a side state, never a destination. A `Blocked` card MUST say who or what it is blocked on
and what is needed, in the card's `Blocked by:` line, with the actual question in `Note:`.
A card with an empty `Blocked by:` is a defect. `Done` requires evidence in the ledger,
`qa/`, or the repo; a chat claim is not evidence and settles at `Review`.

## Claiming work

1. `team_task_list` — see what exists, its owner and readiness.
2. `team_task_get` — read the whole card before editing it.
3. `team_task_update` with `action: "claim"` and the current revision, then edit the ledger
   card to `In Progress` with your seat name.
4. Do the work. Keep writes inside the card's declared write scope.
5. `team_task_update` with `action: "complete"` when the acceptance criteria are met, and
   move the ledger card to `Review` (or `Done` when the card says so).

Never claim a card another seat owns. Never edit a card at a stale revision — re-read and rebase.

## Using the team surface（两条指挥线）

- `lead` 只对四个线头派工（`pm` / `englead` / `qa` / `audit`），**不直接指挥 worker**。
- 线头用 `subagent` 起 worker：一次性、上下文独立、可指定 `cwd` 与模型，任务结束即结束。
- worker **不是团队成员**：不占团队席位、不上任务板、不能 `spawn_teammate`；协调只经线头。
- `send_message` 用于团队成员之间（含跨线协调）；`wait_agent` 只对团队成员有效，对 worker 无效。
- 只有 `lead` 能 `spawn_teammate` / `interrupt_agent`。
- worker 在各自 worktree 里干活；团队文件、账本、任务板由线头写。

Only one member should write a given file. If two cards need the same file, merge the cards
or split by file.

## Output

- Every handoff states: what changed, what is now true, what is still unknown.
- When you finish, write to the ledger; a status that exists only in chat did not happen.

## Failure handling

- Blocked on a human decision → `Status: Blocked` in the ledger + one `ask_user_question`
  with concrete options. Do not guess. In a team session the Lead routes it to the owner;
  a teammate never asks the owner directly for something the Lead already owns.
- Blocked on another seat → `send_message` that seat with the exact ask, set
  `Blocked by:`, then move on to unblocked work.
- Out of budget or unsure → stop and report honestly. Never report unverified work as done.
