---
name: codex-skill
description: >
  Mandatory checkpoint. When any of these happens, you MUST use codex-skill with Codex; otherwise STOP and do not proceed:
  (1) you are starting to draft or publish any plan/design/architecture;
  (2) you are about to finalize with wrap-up changes or delivery (done/PR/commit/merge/release/deploy);
  (3) you are stuck/unclear/can’t resolve something, requirements changed, or there is disagreement and you need calibration/help.
  Trigger keywords: plan, design, architecture, proposal, review, audit, final, done, ship, PR, commit, merge, release, deploy, stuck, blocked, unclear, help, explain.
allowed-tools: Bash, Read
---

# codex-skill

Use Codex as a second-opinion checkpoint at specific moments. When you load this skill, decide which guide to read next.

## What to load next (progressive disclosure)

- Starting to draft a plan/design/architecture → read `plan.md` (path: `<skill_root>/plan.md`)
- About to finalize (wrap-up changes / delivery: done/PR/commit/merge/release/deploy) → read `review.md` (path: `<skill_root>/review.md`)
- Stuck/unclear/unresolved, requirements changed, or disagreement → read `chat.md` (path: `<skill_root>/chat.md`)
- If unsure → start with `chat.md`

## Paths

- `<skill_root>` = the directory containing this `SKILL.md` (common: `~/.claude/skills/codex-skill`)
- Guides:
  - `<skill_root>/plan.md`
  - `<skill_root>/review.md`
  - `<skill_root>/chat.md`

Follow the chosen guide. It contains the command path and the required input template.
