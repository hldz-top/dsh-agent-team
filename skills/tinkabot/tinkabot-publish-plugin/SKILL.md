---
name: tinkabot-publish-plugin
description: >-
  Use when the owner explicitly asks to publish a wrapped plugin: route once between Cursor
  Marketplace and cursor.directory, pass the approve gate, submit nothing without a yes.
---

# Publish a wrapped plugin

This repo has no marketplace submission tool. Publishing is: prove locally, route the
destination once, assemble a packet, pass one approve gate — then only a human with account
access submits. A listing with no URL or id in the packet did not happen.

## When to use

- The owner's message contains an explicit publish verb ("publish", "submit", "list") for a
  named plugin and version, and the bundle already passed local proof.
- A routed destination or an approve question is already open on the task board.
- The owner asks where the plugin should go without saying "publish" — then only route.

## Procedure

### A. Instruction gate

1. `read` the owner's latest message and quote it in
   `projects/<name>/notes/publish-<plugin-id>.md`, with date, plugin id, version, and the
   exact publish wording. A wrap request, a proof request, or silence is not an instruction.
2. If the instruction is not explicit, stop at `STATUS BLOCKED` and ask once; never treat a
   "looks good" as permission to submit.

### B. Route once (merged proof then publish flow)

3. Confirm the wrap skill's proof is recorded: install, new session, preset visible, one
   `mcp__<serverName>__<tool>` call returned data, `PASS`. Without `PASS` the status is
   `STATUS FAIL` and no publish step runs.
4. Ask the owner exactly once whether they work at the company or service behind the API.
   - yes, or the owner insists → `Route: cursor-marketplace`.
   - no, or unsure → `Route: cursor.directory`.
   Record the route in the note. Trust the answer; never re-ask in a later turn.
5. When Grok Bot is the target, record the gap: Grok Bot loads plugins only from its
   dashboard or marketplace, never from a local `~/.cursor/plugins/local` directory. Local
   proof therefore stays in Cursor IDE or DSH; never claim a Grok Bot proof.

### C. Assemble the packet (still nothing submitted)

6. `write` the publish note with: plugin id, version, bundle path, digest of every bundle
   file (`bash` one hash per file), the data shape in one line, `serverName`, tool list,
   auth and privacy statement (no keys, no personal data, no hidden network calls), license,
   repo URL, route, proof record, and `Status: not-submitted`.
7. Verify installability from a clean profile: `plugin_manager { action: "install_bundle",
   target: <absolute bundle path> }` succeeds and one MCP tool still answers. The packet
   contains no secrets and no absolute home paths.
8. When the destination expects a listing body, `write` it next to the note (name, one-line
   description, categories, install command, screenshot if asked). Versions are immutable: a
   changed bundle means a new version and a new proof.

### D. Approve gate (the submit blocker)

9. Issue one `ask_user_question` quoting: plugin id, version, route, destination account
   owner, contents list, bundle digest, and exactly what will be submitted. Options:
   `Approve submit`, `Request changes`, `Cancel`.
10. Only `Approve submit` opens the gate. Any other answer, a skipped question, or silence
    keeps `STATUS BLOCKED`; never infer approval.
11. On approval, submit only through the action the owner authorizes. There is no DSH
    marketplace command: either the owner submits through the dashboard or hands over the
    packet. A human step is `STATUS BLOCKED` naming who must act and what to send.
12. After submit, `write` back timestamp, route, approver, digest, and the listing URL or id
    the owner returns. Without that evidence the state is `submitted-unconfirmed`, not
    `listed`.

### E. Record and close

13. `team_task_update` the publish card to `complete` only with the listing evidence;
    otherwise leave it `in_progress` or reopen it with the blocker.

## Output

- Files: `projects/<name>/notes/publish-<plugin-id>.md` (packet), any listing body next to
  it, and a shared card carrying the same plugin id and write scope.
- Publish vocabulary, exactly: `not-submitted` → `approved-submit` → `submitted-unconfirmed`
  → `listed` (requires the URL or id).
- Gate words: `PASS | FAIL | BLOCKED`, plus `Route: cursor-marketplace | cursor.directory`.
- Handoff to the Lead ≤6 lines: plugin and version, route, gate word, evidence, owner action.

## Failure handling

- No explicit publish instruction → do not publish; say what is missing and offer local proof.
- Route unanswered after one ask → `STATUS BLOCKED` with the pending question; no submit.
- Approve gate not clearly answered → `STATUS BLOCKED`; silence is not consent.
- No tool exists to submit → `STATUS BLOCKED` naming the human with account access and the
  exact packet; never fabricate a listing or an acceptance email.
- Destination rejects or changes terms → record the rejection verbatim in the packet, keep the
  version unpublished, and wait for the owner; never resubmit blindly.
- Proof regressed → `STATUS FAIL`, back to `tinkabot-wrap-api-as-plugin`; publish stops.

## References

- `skills/tinkabot/tinkabot-wrap-api-as-plugin/SKILL.md` — data shape and local proof.
- `TEMPLATE.md` — agent/skill format contract.
- `team-bundle/package.json` — real `dsh.bundle.patch` marker.
- `projects/<name>/notes/` — packet location.
