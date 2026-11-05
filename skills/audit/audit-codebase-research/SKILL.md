---
name: audit-codebase-research
description: >-
  Use when starting or resuming the nightly audit pass: bind the repo to a project,
  settle the 04:00 schedule, walk the whole codebase for real, and record per-area
  verdicts with evidence before any cleanup is proposed.
---

# Whole-codebase audit research

Research the tree before proposing anything. A finding you cannot point at —
`path:line` or a raw log row — is a guess, and guesses do not become cleanups.

## When to use

- The nightly audit wakes on its `schedule_create` delivery, or the owner asks for an audit pass.
- Before writing any cleanup task card or branch: the audit notes file must exist first.
- When resuming an interrupted pass and `projects/<name>/notes/audit-<date>.md` is missing or partial.

## Procedure

1. Bind the repo. `read projects/<name>/project.md`; if it is absent or has no Areas table, run
   `bash: git rev-parse --show-toplevel` and ask the owner once which project this is.
   No answer → `STATUS BLOCKED`, stop for the night.
2. Settle the schedule before the first pass. Ask with `ask_user_question` ("run nightly at
   04:00 local?"), and only after a yes call `schedule_create` with exactly this shape:

   ```text
   title:  Nightly code-quality audit
   target: new
   rrule:  DTSTART;TZID=Asia/Taipei:20261106T040000
           RRULE:FREQ=DAILY
   prompt: <the pass prompt in routines/nightly-audit.md>
   ```

   `DTSTART` is the next 04:00 in the owner's IANA zone (this repo's example uses Asia/Taipei;
   never a fixed offset such as UTC+8) and `RRULE:FREQ=DAILY` carries no time part. After
   creation call `schedule_list` and confirm the next occurrence is 04:00 local. To change the
   time later use `schedule_edit` — never create a second schedule task.
3. Read the current state: `bash git status --short`, `git log --oneline -30`,
   `git branch --show-current`, `git diff --stat`.
4. Walk every area in the Areas table: `glob` the area path, `grep` it for the risky patterns
   (swallowed errors, leftover work-in-progress markers, retry loops, stale flags), then `read` the files the matches
   point at. Do not audit a directory you have only globbed.
5. Reproduce the suspicious ones. If a log exists, pull the raw rows with `bash` before calling a
   span missing; never answer from memory when a log exists. Walk the exact path that ran.
6. Classify each area — one verdict, evidence class kept separate: `clean` · `cleanup` ·
   `root-cause`, and each finding tagged `code-true`, `log-true` or `guess`.
7. `todo_write` one item per area you will touch, largest friction first.
8. Write `projects/<name>/notes/audit-YYYY-MM-DD.md` in the shape below, then continue with
   `skills/audit/audit-one-cleanup-per-area/SKILL.md`.

## Output

`projects/<name>/notes/audit-YYYY-MM-DD.md`:

```markdown
# Audit YYYY-MM-DD

- HEAD: <sha> · branch: <branch> · dirty: <no | files>
- Areas scanned: <n> · cleanups proposed: <n> · root-cause: <n> · clean: <n>

## <area> — <clean | cleanup | root-cause>

- Evidence: `<path>:<line>` — <one sentence on what is wrong>
- Class: code-true | log-true | guess
- Cleanup: <delete | reuse | rename, one line> | none
- Net effect: -<n> / +<n> lines, <n> new files
```

Digest to the owner: 5 lines max — areas scanned, cleanups shipped, churn signals,
blocked-on-owner, next candidate.

## Failure handling

- No project binding, or two projects match the repo → `ask_user_question` once, then `STATUS BLOCKED`.
- No test output or log available for a finding → keep it `guess` in the notes and do not ship it.
- A pass that finds nothing worth shipping ends with "no cleanup warranted" plus the evidence.
  Manufacturing work is a failure, not a win; never pad the digest with activity.

## References

- `routines/nightly-audit.md` — ready-to-paste schedule shape and nightly prompt.
- `projects/_template/project.md` — Areas table and ledger fields.
- `skills/_team/team-protocol/SKILL.md` — ledger rules and claim flow.
