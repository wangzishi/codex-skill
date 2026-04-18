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
- Supports `--model` for an exact Copilot model
- Supports `--list-model-options` to discover Claude/Gemini model ids exposed by the local Copilot CLI

## Migration from `codex-skill`

The historical install path was `~/.claude/skills/codex-skill`. For agentskills.io-style layouts, prefer:

```bash
mv ~/.claude/skills/codex-skill ~/.agents/skills/copilot-skill
```

If a client still scans `~/.claude/skills/`, keep a copy or symlink there as a compatibility path.

## Use

- The skill can trigger automatically based on its `description` keywords.
- If it does not trigger, explicitly say: "use the copilot-skill skill".
- Before invoking Copilot without an explicit model, first query the local Copilot model list and present all Claude/Gemini entries to the user with no recommendation:

```bash
<skill_root>/bin/copilot-skill --list-model-options
```

- Then rerun the chosen command with the exact selected model id:

```bash
<skill_root>/bin/copilot-skill-plan --model claude-sonnet-4.6 < message.txt
```

Examples:

```bash
<skill_root>/bin/copilot-skill --list-model-options
<skill_root>/bin/copilot-skill-plan --model claude-sonnet-4.6 < message.txt
<skill_root>/bin/copilot-skill-review --model gemini-2.5-pro < message.txt
```

Docs:

- `SKILL.md`
- `chat.md`
- `plan.md`
- `review.md`
