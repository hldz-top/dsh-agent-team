---
name: eng-lead-digest
description: >-
  Use when running the weekday cadence or when the owner asks where things stand:
  reconcile the ledger against the repo, then write one daily digest instead of a
  stream of pings.
---

# Daily digest

One batched report per day. The digest is how healthy-but-uninteresting progress reaches
the owner without interrupting them; the weekday 09:00 schedule is what produces it.

## When to use

- The weekday 09:00 schedule wakes you.
- The owner asks "where are we?" — answer from the digest, not from a fresh interrogation.
- A day ends with more than one card shipped, blocked, or waiting in `Review`.

## Procedure

1. `read` the last digest in `projects/<name>/notes/` to get the baseline date.
2. `team_task_list` every project under `projects/`; `team_task_get` the cards created or
   changed since that date.
3. Reconcile against the repo with `bash`: `git log --oneline -20` and `git status`. A card
   that says `Done` without a commit is not done; correct it with `team_task_update` at the
   current revision before writing the digest.
4. `write` the digest to `projects/<name>/notes/digest-YYYY-MM-DD.md` with four sections:
   Shipped, In Review, Blocked (each with its named blocker), Next.
5. Set up the weekday cadence once, during seat handoff — not on every digest — from a
   session running this seat: `schedule_create` with `title`, `target: new`, and the
   two-line `rrule`: `DTSTART;TZID=Asia/Taipei:20261106T090000` then
   `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=9`. Pass this skill's steps as the
   `prompt`. A new session inherits this seat's preset only because you created the
   schedule from here; a second copy means duplicate pings, so create one and stop.
6. Check the returned `scheduledAt`: it must read 09:00 in the owner's time zone. A wrong
   time zone is the most common cadence accident, so fix the rule rather than living with it.
7. `send_message` the digest to the owner only when it contains a blocked, ready-to-merge, or
   done item; otherwise it stays in the ledger and the owner is not interrupted.
8. Keep it to one screen: five lines is the target. A digest that needs scrolling is a
   report, not a digest.

## Output

- `projects/<name>/notes/digest-YYYY-MM-DD.md` with Shipped / In Review / Blocked / Next.
- A five-line owner message when the three ping cases are present.
- One schedule whose next occurrence is weekday 09:00 local.

## Failure handling

- No project bound to the repo: write `STATUS BLOCKED`, ask the owner once which project it
  is, and stop the pass instead of guessing.
- A digest source that cannot be reconciled (uncommitted work, a card with no owner): list it
  under Blocked with the exact question; do not smooth it over.
- A schedule that returns a non-09:00 local time: delete nothing, fix the rrule, and report
  the corrected time to the owner.
- If there is nothing to report, write "no change" with the evidence and send nothing.

## References

- `routines/nightly-audit.md` — the audit seat's nightly analogue and schedule shapes.
- `skills/englead/eng-lead-chase/SKILL.md` — the sweep this digest summarizes.
- `projects/_template/tasks.md` — fixed card fields and status vocabulary.
