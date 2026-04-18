---
name: copilot-skill
description: >
  [AUTO-TRIGGER] ⚠️ BLOCKING GATE. MUST use /copilot-skill BEFORE drafting any plan/design/architecture (including writing a plan file and before ExitPlanMode),
  and BEFORE git commit, gh pr create, merge/release/deploy, or saying "done/shipped". Also use when stuck/unclear/help, requirements change, or disagreement.
---

# copilot-skill

Use GitHub Copilot CLI as a read-only second-opinion checkpoint at specific moments. When you load this skill, decide which guide to read next.

Before you invoke Copilot and no exact model has already been selected, first fetch the local Copilot model list:

```bash
<skill_root>/bin/copilot-skill --list-model-options
```

From that output, present all `claude-*` and `gemini-*` model ids to the user with no recommendation.

If the host agent supports structured blocking prompts, it must call `request_user_input` with one blocking question that lets the user choose the exact model id.

If structured prompts are unavailable, ask the same question in plain text and wait for the answer.

After the model is chosen, the host agent must collect a second explicit choice for context mode:

- `provided`: Copilot may only use the supplied prompt context
- `repo-read`: Copilot may read/search relevant files in the working directory, but must not modify files, execute commands, or access URLs

If the host agent supports structured blocking prompts, it must use `request_user_input` for this choice too. If not, ask in plain text and wait for the answer.

Then rerun the chosen command with:

- `--model <selected-model-id>`
- `--context-mode provided|repo-read`

If one family is empty in the local Copilot output, do not invent options for that family.

After `copilot-skill` returns, the host agent must briefly summarize the result to the user before continuing. Include:

- which exact Copilot model was used
- which context mode was used
- why Copilot was invoked (`chat`, `plan`, or `review`)
- the key conclusion or decision in 1-3 short sentences

## What to load next (progressive disclosure)

- Starting to draft a plan/design/architecture (including before ExitPlanMode) -> read `plan.md` (path: `<skill_root>/plan.md`)
- About to finalize (wrap-up changes / delivery: done/PR/commit/merge/release/deploy) -> read `review.md` (path: `<skill_root>/review.md`)
- Stuck/unclear/unresolved, requirements changed, or disagreement -> read `chat.md` (path: `<skill_root>/chat.md`)
- If unsure -> start with `chat.md`

## Paths

- `<skill_root>` = the directory containing this `SKILL.md` (preferred: `~/.agents/skills/copilot-skill`; historical compatibility path: `~/.claude/skills/codex-skill`)
- Guides:
  - `<skill_root>/plan.md`
  - `<skill_root>/review.md`
  - `<skill_root>/chat.md`

Follow the chosen guide. It contains the command path and the required input template.
