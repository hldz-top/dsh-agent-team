---
name: audit-one-cleanup-per-area
description: >-
  Use after the audit notes exist: turn one area's finding into its own task card,
  branch and single commit, subtraction first, and refuse to mix areas or ship an
  unreproduced, guard-layered fix.
---

# One cleanup per area

The unit of shipping is the area, not the pass. Each area leaves the tree as one
card, one branch, one commit, so the owner can accept or revert it alone.

## When to use

- `projects/<name>/notes/audit-YYYY-MM-DD.md` lists an area with verdict `cleanup` or `root-cause`.
- The owner approved a cleanup, and the area's evidence is `code-true` or `log-true` (not `guess`).
- The previous card is in `Review` and the next area is ready to start.

## Procedure

1. Pick the highest-friction area with verdict `cleanup`. Never start a second area on the same branch.
2. Create the card with `team_task_create`:

   ```text
   subject:  cleanup: <area>
   description:
     Status: Todo
     Owner: audit
     Write scope: `<area path>`, `projects/<name>/notes/audit-YYYY-MM-DD.md`
     Blocked by: —
     Acceptance: `<test command>` passes · diff deletes or reuses before adding
   write_scopes: [`<area path>`]
   ```

3. `team_task_get` the card, then `team_task_update` with `action: "claim"` and its current revision.
4. Branch from the current base: `bash git switch -c audit/<area>-YYYY-MM-DD`. If the tree is
   dirty, stop — never stash or commit another seat's work out of the way.
5. Write the smallest correct diff. Subtraction first: delete the dead path, reuse the existing
   helper, and only then add code. Keep comments to non-obvious "why" and delete duplicated
   narration. A comments-only change is delegated to a `subagent` and re-tested; never self-approve it.
6. Prove it: run the project's test command from `project.md` / `package.json` with `bash`. For a
   slow suite start it with `run_in_background: true` and collect it with `job_output`. No pass, no commit.
7. Commit exactly once: `bash git commit -m "audit(<area>): <verb> <what>"`. Never push, never merge,
   never amend a branch others may have based work on.
8. Move the card to `Review` — `team_task_update` with `action: "complete"` — and put in its Notes:
   branch name, commit sha, `git show --stat`, net line delta, and one sentence justifying every
   net-new line. Update the ledger row in `projects/<name>/tasks.md` to `Status: Review`.
9. A second round of adjacent findings in the same subsystem is churn. Stop; do not add another
   guard. Record the signal in the notes, write the structural proposal (the invariant or token
   that makes the check one comparison), and set `Blocked by: owner decision`.
10. The next area starts from the updated base, on its own branch, with its own card.

## Output

- Ledger card in `projects/<name>/tasks.md` with the fixed fields: `Status`, `Owner`,
  `Write scope`, `Blocked by`, `Acceptance`, `Notes`.
- Branch `audit/<area>-YYYY-MM-DD` with one commit `audit(<area>): ...`.
- One line to the owner: `STATUS SHIPPED | STATUS BLOCKED | STATUS CLEAN` plus the diff delta.

## Failure handling

- Tests fail and the cause is not yours → drop your commit, `STATUS BLOCKED`, and name the failing
  test plus the seat that owns that area in `Blocked by:`.
- The fix needs a migration, production config, or a new subsystem → do not ship; card
  `Blocked by: owner decision` with the options.
- The area is too big for one small diff → split it into two cards now and ship the smaller half first.
- Churn detected → structural proposal only; zero guard commits, and say so in the digest.

## References

- `projects/_template/tasks.md` — card fields and status vocabulary.
- `skills/_team/team-protocol/SKILL.md` — claim, complete and handoff flow.
- `skills/audit/audit-codebase-research/SKILL.md` — where the area verdicts come from.
- `routines/nightly-audit.md` — the nightly prompt this skill is called from.
