---
name: codex-skill
description: >
  Use Codex as a second-opinion guardrail during development. MUST run plan before you publish any plan/design/architecture. MUST run review as the final step before you say done/ship/merge/release/deploy. Use chat to ask for help or calibrate when you're stuck, unsure, or requirements change.
  Trigger keywords: plan, planning, design, architecture, proposal, risk, constraints, acceptance, checklist, test plan, review, audit, final, final step, sign-off, done, finish, complete, ready to ship, release, deploy, merge, regression, second opinion, stuck, blocked, confused, unclear, help, explain.
allowed-tools: Bash, Read, Write
---

# codex-skill

You MUST involve Codex at these moments:

- `plan`: before you publish any plan / design / architecture
- `review`: the final step before you say “done / shipped / merged / released / deployed”
- `chat`: calibration & help (requirements change, big deviation, disagreement, or you're stuck/unsure)

## Session binding (required)

- Session file: `<repo>/.claude/codex_session.json`
- `<repo>`: prefer `git rev-parse --show-toplevel`; if that fails, use the current directory
- If the file exists: reuse `session_id` via `codex exec resume <session_id>`
- If it does not exist: after the first Codex run, capture the returned session id and create the file

Maintain only these fields: `session_id`, `updated_at`.

## Input requirement (required)

Every message to Codex MUST start with a verbatim user quote block (copy/paste, no rewriting), then add the agent context + your questions/plan/disagreements.

Templates: `chat.md`, `plan.md`, `review.md`.

## Calibration rule (required)

Codex can be wrong. If Codex conflicts with the verbatim user message or known facts:

- Use `chat` in the same session to point out up to 3 concrete conflicts and ask Codex for the minimum clarifying questions.
- If still unclear, ask the user, then use `chat` again to update Codex.
