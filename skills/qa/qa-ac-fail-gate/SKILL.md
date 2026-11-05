---
name: qa-ac-fail-gate
description: >-
  Use when a binding PM cut must become a canonical AC pack and be judged on a live deploy
  before ship: SHA gate, BLOCK vs WARN severity, PASS | FAIL | BLOCKED report with YAML footer.
---

# Enterprise AC fail-gate

Turn one binding cut into a canonical acceptance pack, prove the deployed SHA matches the code
being judged, run the pack on the live deploy, and publish a self-contained report that any seat
can read without asking you.

## When to use

- `projects/<product>/project.md` or `projects/<product>/tasks.md` marks a cut as binding (a
  frozen scope or PRD snapshot) and someone asks "is it ready to ship?".
- Eng claims done or CI CLEAN and QA must judge the same AC map rather than accept the claim.
- A merge was reported on the watched product repo and the post-merge BLOCK pack must re-run.
- A prior `run-*.md` ended `FAIL` or `BLOCKED` and the fix now needs a fresh verdict.

## Procedure

1. **Read the cut.** `read projects/<product>/project.md` and `projects/<product>/tasks.md`;
   `grep` the ledger for the cut/PRD snapshot. Record its date and scope in one line. If no cut
   is marked binding, stop at Failure handling (`no_cut`) — never draft ACs from memory.
2. **Load or write the pack.** `read` the canonical pack at the owner-set path, often
   `projects/<product>/qa/CANONICAL-AC-PACK.md`. Append and dedupe by AC id; when absent, derive
   one AC per testable claim in the cut. Each AC has `id`, `expected`, `severity`
   (`BLOCK` | `WARN`), and `observe` (the live-deploy evidence that decides it).
3. **Check fixtures.** `read` the owner-set fixtures path, often
   `projects/<product>/qa/fixtures.json`. An empty `fixtures` array or unreadable file is a
   pack defect (`pack_defect`), not a passing run. Record fixture identity once and reuse it for
   the whole compare; fixtures do not rotate mid-run.
4. **SHA gate (hard).** In `bash`, run `git rev-parse HEAD` on the judged repo, then obtain the
   deployed SHA from the address the owner names (a build-info HTTP endpoint or a deploy SHA
   file) with `bash`.
   - Both readable and equal → record `sha`, continue.
   - Both readable but different → `STATUS FAIL`, `gate: sha_mismatch`, stop; the pack does not run.
   - Either unreadable, empty, or unnamed → `STATUS BLOCKED`, `gate: unavailable`, name the
     missing input and its owner. Skipping the gate is not allowed.
5. **Run BLOCK items** on the live deploy only. Perform each `observe` action and capture
   `expected` vs `observed`. CI, branch state, and local tests cannot stand in for a live check.
6. **Run WARN items** the same way. A failed WARN goes to `warn_items`; it does not block ship.
7. **Get credentials properly.** If a check needs a login, ask the named password owner with
   `ask_user_question` once per job; never invent a password, secret, or shared test account.
8. **Write the report** to `projects/<product>/qa/run-YYYY-MM-DD-<slug>.md` with the human
   header and YAML footer below. Existing runs are history: write a new file, never overwrite one.
9. **Hand off** the verdict with `qa-adhd-response` and update the ledger card
   (`team_task_update`, or `edit` on `projects/<product>/tasks.md`).

Completion criterion: every pack item has an observed result, the footer is filled, and the
first line is exactly one of the three status words.

## Output

Report path: `projects/<product>/qa/run-YYYY-MM-DD-<slug>.md`. Header first:

```markdown
# AC run — <product> — YYYY-MM-DD <slug>

STATUS: PASS | FAIL | BLOCKED
Gate: sha=<40-char sha> deploy=<address the sha was read from> pack=<pack path>
```

Then one row per AC, then the footer:

```yaml
status: PASS | FAIL | BLOCKED
sha: <commit sha compared against the deploy>
deploy: <deployed address the sha was read from>
pack_version: <cut id and pack date>
blocked_items: [<AC ids>]   # failed BLOCK items: ship blockers
warn_items: [<AC ids>]      # failed or unrun WARN items: not ship blockers
run_at: <ISO-8601 timestamp>
```

Per-item rows: `| id | severity | expected | observed | verdict |`. Verdict rules:

- `PASS` = equal SHA, every BLOCK item observed passing, every WARN item passing or listed.
- `FAIL` = any BLOCK item fails, or the SHA gate mismatches. Use `FAIL` for observed failure.
- `BLOCKED` = the run could not execute (no cut, pack defect, missing fixtures/credentials/deploy
  SHA). Never use `BLOCKED` to soften a failure you observed.

The report is self-contained so other seats read it instead of asking you.

## Failure handling

- A `BLOCKED` verdict names three things: reason code (`no_cut` | `pack_defect` |
  `no_fixtures` | `gate: unavailable` | `no_credentials`), the owner who resolves it, and the
  exact input needed. Put it in the first line and in the footer `status`.
- If the deployed SHA changes mid-run, stop: `BLOCKED` `sha_drift`, then re-run from the gate.
  Never mix observations from two SHAs in one report.
- If a run contradicts an earlier one, keep both files and point the ledger at the newest;
  dedupe by AC id. Do not edit the older report.
- If an expected result is wrong or ambiguous, escalate to the owner before editing the pack;
  the edit needs its own recorded decision, never a quiet fix to make a run green.
- If CI is clean but the deploy fails an AC, the verdict is `FAIL`; the gate is not tradable
  for a schedule.

## References

- `projects/<product>/qa/CANONICAL-AC-PACK.md`, `projects/<product>/qa/fixtures.json`,
  `projects/<product>/qa/run-*.md`
- `skills/qa/qa-adhd-response/SKILL.md`, `skills/_team/team-protocol/SKILL.md`,
  `projects/_template/tasks.md`
