# copilot-skill

An Agent Skill that uses the local `copilot` CLI as a read-only second-opinion guardrail.

## Prerequisites

- `node` available on `PATH`
- GitHub Copilot CLI installed and authenticated

## Install

User-level install:

```bash
mkdir -p ~/.agents/skills
git clone <repo-url> ~/.agents/skills/copilot-skill
```

Project-level install:

```bash
mkdir -p ./.agents/skills
git clone <repo-url> ./.agents/skills/copilot-skill
```

## What it does

- Provides three entrypoints: `chat`, `plan`, `review`
- Pipes your prompt to the local `copilot` CLI in read-only programmatic mode
- Uses a fixed prompt contract so Copilot reviews the provided context instead of modifying files

## Migration from `codex-skill`

The historical install path was `~/.claude/skills/codex-skill`. For agentskills.io-style layouts, prefer:

```bash
mv ~/.claude/skills/codex-skill ~/.agents/skills/copilot-skill
```

If a client still scans `~/.claude/skills/`, keep a copy or symlink there as a compatibility path.

## Use

- The skill can trigger automatically based on its `description` keywords.
- If it does not trigger, explicitly say: "use the copilot-skill skill".

Docs:

- `SKILL.md`
- `chat.md`
- `plan.md`
- `review.md`
