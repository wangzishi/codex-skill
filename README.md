# codex-skill

A Claude Skill that uses the local `codex` CLI as a second-opinion guardrail.

## Install

Personal install:

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/madwiki/codex-skill ~/.claude/skills/codex-skill
```

## What it does

- Provides three entrypoints: `chat`, `plan`, `review`
- Automatically persists and reuses the Codex session id via `<repo>/.claude/codex_session.json`

## Use

- The skill can trigger automatically based on its `description` keywords.
- If it doesn't trigger, explicitly say: "use the codex-skill skill".

Docs:

- `SKILL.md`
- `chat.md`
- `plan.md`
- `review.md`
