---
name: eng-lead-decompose
description: >-
  Use when a request or project area must become parallel work: split it into
  task cards with disjoint write scopes, then spawn one teammate per ready card
  with a self-contained brief.
---

# Decompose work into teammates

A Cloud Agent's local equivalent is a teammate: one `spawn_teammate` call creates one
worker with its own context. This skill turns "do X" into cards and briefs.

## When to use

- The owner hands you a goal that needs more than one change or more than one file area.
- An area in `projects/<name>/project.md` has no task card, or a card covers several areas.
- A card is too large to review: no single acceptance check covers it.

## Procedure

1. `read` the ledger first: `projects/<name>/project.md`, `projects/<name>/tasks.md`, and any
   `notes/` file about the area. Read code only where the ledger is silent.
2. Inventory existing cards with `team_task_list` and read each candidate with `team_task_get`.
   Extend or re-scope before creating; a duplicate card is a failure, not extra coverage.
3. Split by write scope, not by phase. Each card owns disjoint files or directories and names
   them in `Write scope:`; if two cards need the same file, merge them or split at the boundary.
4. Write each brief before creating the card: goal, exact paths, acceptance checks, the
   commands that prove it, and what is out of scope. A new teammate knows only what you put
   in its prompt.
5. Create cards with `team_task_create`, each with subject, description, `write_scopes`, and
   `blocked_by` where one card's output feeds another. Set `Status: Todo`.
6. Spawn one teammate per ready card with `spawn_teammate`, naming it after the area
   (`<area>-worker`). Pass the self-contained brief as `prompt`; use `context: "fresh"` unless
   the work genuinely builds on this conversation.
7. Keep one lead card listing children, owners, and order; update it with `team_task_update`
   at the latest revision, and re-read after any concurrent change rather than forcing a
   stale write.
8. Stop decomposing when every card is independently claimable, reviewable, and finishable
   in one pass.

## Output

- One lead card plus one card per unit of work: `Status: Todo`, `Owner`, `Write scope`,
  `Blocked by`, `Acceptance` (1-3 checkable lines).
- Teammates named and spawned; each has exactly one ready card.
- A decomposition table: card id, owner, files, acceptance. Nothing else.

## Failure handling

- If a scope cannot be made disjoint, keep it as one card and say so; parallel teammates on
  one file produce conflicting writes.
- If the ledger contradicts the request, mark the lead card `Status: Blocked`, name the
  contradiction, and ask the owner with `ask_user_question`.
- If a teammate fails to start or stops early, check it with `list_agents`, then send a
  corrected brief with `send_message` or re-claim the card. Never leave an orphan card.

## References

- `TEMPLATE.md` — card fields, persona contract, status vocabulary.
- `skills/_team/team-protocol/SKILL.md` — claiming and coordination rules.
- `README.md` — team onboarding and change attribution live there; this skill covers only
  decomposition.
