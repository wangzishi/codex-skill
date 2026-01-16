---
name: codex-skill
description: >
  [AUTO-TRIGGER] ⚠️ BLOCKING GATE. MUST use /codex-skill BEFORE drafting any plan/design/architecture (including writing a plan file and before ExitPlanMode),
  and BEFORE git commit, gh pr create, merge/release/deploy, or saying “done/shipped”. Also use when stuck/unclear/help, requirements change, or disagreement.
---

# codex-skill

Use Codex as a second-opinion checkpoint at specific moments. When you load this skill, decide which guide to read next.

## What to load next (progressive disclosure)

- Starting to draft a plan/design/architecture (including before ExitPlanMode) → read `plan.md` (path: `<skill_root>/plan.md`)
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
