---
name: pm-project-ops
description: >-
  Use when creating, staffing, or running a project in this repo's local Markdown ledger:
  project rows, task cards, claim-based assignment, status tracking, and unblocking work.
---

# Project ops on the local ledger

The original seat ran projects in Notion: one row per project, one channel per project, and
task rows that specialist bots claimed. This repo has no Notion MCP server and no channels.
The local equivalent is plain Markdown under `projects/<name>/`, versioned in Git:

| Path | Holds |
|---|---|
| `projects/<name>/project.md` | `Id:`, `Status:`, `Owner:`, `Goal:`, `Success criteria:`, `Areas:`, `Decisions:` |
| `projects/<name>/tasks.md` | one card per unit of work, in the card shape below |
| `projects/<name>/qa/` | QA packs and run reports, written by the QA seat |
| `projects/<name>/notes/` | research, logs, and decisions that are not tasks |

There is no page icon to set. The rule that replaces it: every project and every card carries
an `Id:` and an `Owner:`. A card missing either is malformed and must not be created.

## When to use

- The human owner asks to start, staff, track, or report on a project.
- `projects/<name>/project.md` or `tasks.md` is missing, stale, or has a malformed card.
- A card has been `Blocked` for a round, or a seat reports it cannot proceed.
- A seat finishes a card and the ledger status must move to `Review` or `Done`.

## Procedure

### A. Read before writing

1. `read` `projects/<name>/project.md` and `projects/<name>/tasks.md`; if absent, `glob`
   `projects/**` and check `projects/_template/`.
2. `team_task_list` to see shared board cards, owners, revisions, and blockers.
3. `team_task_get` the card before you change it; never edit at a stale revision.

### B. Create a project

4. `bash` `mkdir -p projects/<name>/qa projects/<name>/notes`.
5. `write` `projects/<name>/project.md`:

       # <project name>
       - Id: <name>
       - Status: active
       - Owner: <human owner>
       - Goal: <one-sentence outcome>
       - Success criteria:
         - <binary, checkable>
       - Areas: <code | review | qa | release ...>
       - Decisions:
         - <YYYY-MM-DD> <decision> (<who>)

6. `write` `projects/<name>/tasks.md` with one card per deployable outcome:

       ## T-001 <imperative title>
       - Id: T-001
       - Status: Todo
       - Owner: unowned
       - Scope: <repo-relative paths this card may write>
       - Depends on: none
       - Blocked by: none
       - Acceptance: <binary, checkable>
       - Note: <context, or the question if blocked>

7. `team_task_create` one shared card per ledger card: card id in the subject, the same paths
   in `write_scopes`, and the real dependencies in `blocked_by`.

### C. Staff by claim, not by force

8. A card is staffed when a seat claims it: `team_task_update action="claim"` at the current
   revision, then the seat sets the ledger card to `In Progress` with its own name.
9. If a card is still `Todo` and `unowned` at kickoff, `send_message` the seat with the card id,
   its `Acceptance:` line, and its scope — then leave it. Never do the work yourself.

### D. Track and close

10. When a seat reports a card finished, `read` the changed files and the evidence it names.
    Move `In Progress` → `Review`. Move `Review` → `Done` only when `Acceptance:` is satisfied
    by evidence in the ledger, `qa/`, or the repo; otherwise send the gap back as a new card.
11. Append to `Decisions:` whenever the human owner decides something; it is append-only.

### E. Unblock

12. One `edit` call per blocked card: `Status: Blocked`, then
    `Blocked by: <seat or human> — needs <exact thing>`, then the question in `Note:`.
13. Blocked on a seat → `send_message` that seat with the exact ask, then work the next card.
14. Blocked on the human → one `ask_user_question` with 2–4 concrete options; record the
    answer in `Decisions:`.

## Output

- Files: `projects/<name>/project.md` and `projects/<name>/tasks.md`; `write` on first
  creation, `edit` for every later change. Never hand-edit `team-bundle/`.
- Status vocabulary, exactly: `Todo` | `In Progress` | `Blocked` | `Review` | `Done`.
- Every project and card has `Id:` and `Owner:`; every `Blocked` card has a filled `Blocked by:`.
- Human status report: one table `Id | Title | Owner | Status | Blocked by`, then the decisions
  needed, numbered. `present` the ledger files when a durable artifact is requested.
- Seat handoff: ≤6 lines — what changed, what is now true, what is needed.

## Failure handling

- `projects/_template/` is the scaffold: copy its field list, never invent fields. If it is
  missing, recreate it from this skill and tell the Lead seat.
- Field names disagree with `skills/_team/team-protocol/SKILL.md` → the team protocol wins;
  report the mismatch to the Lead instead of silently diverging.
- Two seats claim one card → the earliest clean claim at a current revision wins, the other
  releases; re-read before rebasing.
- Card blocked for over a round, or acceptance unknowable → stop, escalate, and write
  `STATUS BLOCKED` plus the concrete reason; never write a fabricated progress line.
- Write scope blocks the card → stop and report which card needs a wider scope; do not widen
  your own boundary.

## References

- `TEMPLATE.md` — format contract for agents and skills.
- `skills/_team/team-protocol/SKILL.md` — shared ledger and claiming contract.
- `projects/_template/` — project scaffold, when present.
- `team-bundle/cordis.patch.yml` — generated preset wiring; read only, never edit.
