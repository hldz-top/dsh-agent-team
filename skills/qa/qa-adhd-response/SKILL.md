---
name: qa-adhd-response
description: >-
  Use for every owner-facing reply unless the owner said stop adhd mode: lead with the next
  action, number steps, restate state, cut tangents, one concrete next step, no preamble.
---

# ADHD-friendly agent responses

ADHD-friendly means the owner can act after the first line and can stop reading after the last
numbered step. Structure carries the meaning; tone does not.

## When to use

- Every owner-facing reply by default; the mode ends only when the owner says "stop adhd mode".
- A status update, blocked ask, handoff, or verdict where the owner must decide or act.
- The owner's message is short, urgent, or jumps between topics.
- A reply would otherwise open with context before the verdict or next action.

## Procedure

1. **Verdict or action first.** Line 1 is the one thing that matters: `STATUS PASS | FAIL |
   BLOCKED — <one line>` or `Next: <action>`. No greeting, apology, restated question, or
   background before it.
2. **Number multi-step work.** `1.`, `2.`, ... — one action per step, each naming its owner, the
   file or command, and the done condition.
3. **Restate state in one line.** `Done: ...` / `Not done: ...` / `Blocked on: <who> needs
   <what>`. The owner should not reconstruct state from the thread.
4. **Suppress tangents.** One idea per paragraph; background that is not needed to act goes
   after `Details:` or into the run report. Never open a tangent mid-reply.
5. **Name one concrete next step.** The last line is exactly one action with the owner who does
   it. No "let me know" closers.
6. **Say it directly.** Replace litotes and hedges with the literal claim: "not bad" → "good",
   "not unlikely" → "likely", "might be fine" → "unverified". Use fixed status words only.
7. **Cut the padding.** Delete "Sure", "Great question", restatement of the ask, and "Hope this
   helps". If a line does not change what the receiver does, delete the line.

## Output

Routine reply shape, 10 lines or fewer:

```text
STATUS FAIL — 2 BLOCK items failed on deploy sha <sha>
Next: englead fixes AC-3 and AC-7, then I re-run the gate.

1. <action> — <owner>, done when <condition>
2. <action> — <owner>, done when <condition>

Details: <optional, 3 lines max, or the repo-relative path to the full report>
```

- Status vocabulary is exactly `PASS | FAIL | BLOCKED`; "probably pass" is not a status.
- Numbers only when more than one step exists; a one-step reply is verdict line plus next step.
- Repo-relative paths only; the run report holds the long form.
- A blocked answer still leads with `STATUS BLOCKED` plus who is needed and what input.

## Failure handling

- If the detail genuinely does not fit, still lead with the verdict and next step, write the
  long form to `projects/<product>/qa/run-*.md` or the task card, and link its path.
- If you do not know, write `Unknown: <question>` and `Needs from <owner>: <input>`; never pad
  with hedges or guesses.
- If the owner says "stop adhd mode", drop the formatting but keep verdict-first and the single
  next step.
- If shortening the reply would hide a caveat that changes the owner's decision, keep the caveat
  on one line; honesty outranks brevity.

## References

- `skills/qa/qa-ac-fail-gate/SKILL.md`, `skills/_team/team-protocol/SKILL.md`
