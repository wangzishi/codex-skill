---
name: codex-skill
description: >
  Use Codex as a second-opinion guardrail. Use `plan` before you publish any plan/design/architecture. Use `review` as the final step before you say done/ship/merge/release/deploy. Use `chat` to ask for help or calibrate when you're stuck, unsure, confused, or requirements change.
  Trigger keywords: plan, planning, design, architecture, proposal, risk, constraints, acceptance, checklist, test plan, review, audit, final, final step, sign-off, done, finish, complete, ready to ship, release, deploy, merge, regression, second opinion, stuck, blocked, confused, unclear, help, explain.
allowed-tools: Bash
---

# codex-skill

This skill routes specific moments of your workflow to Codex.

- `plan`: before you publish any plan / design / architecture
- `review`: final step before you say “done / shipped / merged / released / deployed”
- `chat`: help & calibration (requirements change, big deviation, disagreement, or you're stuck/unsure)

## Session binding (required)

- Repo session file: `<repo>/.claude/codex_session.json`
- `<repo>` is inferred via `git rev-parse --show-toplevel` (fallback: current directory).
- The scripts automatically:
  - Create `<repo>/.claude/codex_session.json` on first run
  - Reuse the same `session_id` on subsequent runs
  - Update `updated_at`
- To force a fresh Codex session, pass `--new-session`.

## Input rule (required)

Every message you send MUST start with a verbatim user quote block (copy/paste, no rewriting):

```text
<<<USER_MESSAGE_VERBATIM_BEGIN>>>
<the user's exact words>
<<<USER_MESSAGE_VERBATIM_END>>>

<your agent context, plan, change summary, questions>
```

## Commands

Run the command that matches your intent (in `<repo>`):

- Chat: `~/.claude/skills/codex-skill/bin/codex-skill-chat`
- Plan review: `~/.claude/skills/codex-skill/bin/codex-skill-plan`
- Final review: `~/.claude/skills/codex-skill/bin/codex-skill-review`

See: `chat.md`, `plan.md`, `review.md`.
