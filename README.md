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
- Supports `--context-mode provided|repo-read` to control whether Copilot may inspect repository files
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

- If the host agent supports a blocking interactive picker, it must call `request_user_input` so the user can choose one exact model id.
- If structured prompts are unavailable, ask the same question in plain text and wait for the answer.
- After model selection, the host agent must collect a second explicit choice for context mode:
  - `provided`: only use the supplied prompt context
  - `repo-read`: may read/search relevant files in the working directory, but may not modify files, execute commands, or access URLs
- If the host agent supports a blocking interactive picker, it must use `request_user_input` for context mode too.
- If the host agent supports sub-agents, the recommended orchestration is:
  1. host agent collects both blocking choices (`model`, then `context-mode`)
  2. host agent delegates the actual `copilot-skill-*` command to a sub-agent
  3. sub-agent returns Copilot's raw answer to the host agent
  4. host agent summarizes the result for the user and decides the next step
- Do not delegate model selection or context-mode selection to a sub-agent. Those user-facing blocking interactions stay in the host agent.
- Recommended sub-agent handoff contract:
  - host agent passes the exact command, working directory, and fully assembled stdin payload
  - sub-agent runs `copilot-skill-chat|plan|review` and returns Copilot's raw output only
  - sub-agent does not ask the user questions and does not continue implementation on its own
- Then rerun the chosen command with the exact selected model id:

```bash
<skill_root>/bin/copilot-skill-plan --model <selected-model-id> --context-mode <selected-context-mode> < message.txt
```

Examples:

```bash
<skill_root>/bin/copilot-skill --list-model-options
<skill_root>/bin/copilot-skill-plan --model <selected-model-id> --context-mode <selected-context-mode> < message.txt
<skill_root>/bin/copilot-skill-review --model <selected-model-id> --context-mode <selected-context-mode> < message.txt
```

- After Copilot responds, the host agent must briefly summarize what happened for the user:
  - exact model id used
  - context mode used
  - why Copilot was called
  - the key result in 1-3 short sentences

Docs:

- `SKILL.md`
- `chat.md`
- `plan.md`
- `review.md`
