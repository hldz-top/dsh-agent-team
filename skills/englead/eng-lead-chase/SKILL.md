---
name: eng-lead-chase
description: >-
  Use when work is in flight: check CI with bash, move cards through Review,
  steer or interrupt stalled teammates, and ping the owner only when blocked,
  ready to merge, or done.
---

# Chase work to merge

CI is a command, review is a card status, and the merge is a commit. You chase the loop
until each card is `Done`, `Blocked` with a named blocker, or explicitly abandoned.

## When to use

- The weekday 09:00 sweep wakes you, or you resume a session with cards in `In Progress`,
  `Review`, or `Blocked`.
- A teammate reports a change ready for review, or a `bash` check failed.
- A card has sat unchanged across sweeps; stalled work is work you are not chasing.

## Procedure

1. `team_task_list` and filter to `In Progress`, `Review`, `Blocked`; read every candidate
   with `team_task_get`. The card is the only status that counts.
2. For each `In Progress` card, call `list_agents` to see whether its owner is running. If the
   teammate is inactive and the card has moved, `send_message` a short steering ask with the
   next concrete step.
3. Run the check yourself with `bash`: the command in the card's acceptance (test, lint,
   build). Write the exact command and result onto the card with `team_task_update`. A green
   run is evidence; a teammate's word is not.
4. On a pass, move the card to `Review` and `send_message` the reviewer seat (`qa`). There is
   no PR webhook here, so the message is the review trigger.
5. On a reviewed commit, move the card to `Done`. If the ledger reserves the merge for the
   owner, send only the ready-to-merge line.
6. If a teammate is spinning — repeated failures, no file movement, or the same wrong
   direction after one steer — `interrupt_agent` it, re-scope the card, then resume.
7. Stall rule: after two sweeps with no new commit or card change, the work is stalled. Record
   the last observed state on the card and move to the next card.
8. Between sweeps, `wait_agent` for the next real change instead of polling. A `list_agents`
   loop burns context and learns nothing.

## Output

- One status line per card: `<id> <status> <owner> <next action>`.
- Card notes carry the check command, its result, the commit, and the reviewer.
- Owner pings only for blocked, ready to merge, done. Everything else goes to the digest.

## Failure handling

- A failure the owner cannot explain: set the card `Status: Blocked`, quote the failing line
  and the command, and do not retry blindly.
- A missing owner or dead teammate: re-claim the card, then `spawn_teammate` a replacement
  with the card's existing brief.
- A repo state the card did not predict (dirty tree, conflicting branches): stop, record what
  you see on the card, and ask the owner.

## References

- `skills/englead/eng-lead-decompose/SKILL.md` — how the cards were produced.
- `skills/_team/team-protocol/SKILL.md` — ledger status vocabulary and claim protocol.
- `README.md` — change attribution is described there; this skill assumes it.
