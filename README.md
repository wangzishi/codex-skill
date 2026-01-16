# codex-skill

A Claude Skill that uses the local `codex` CLI as a second-opinion guardrail during development.

## Install

Personal install:

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/madwiki/codex-skill ~/.claude/skills/codex-skill
```

Project install (shared via repo):

```bash
mkdir -p .claude/skills
git clone https://github.com/madwiki/codex-skill .claude/skills/codex-skill
```

## Use

- The Skill is triggered automatically based on its `description` keywords.
- If it doesn't trigger, explicitly say: "use the codex-skill skill".

See:

- `SKILL.md`
- `chat.md`
- `plan.md`
- `review.md`
