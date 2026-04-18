# plan

Use before you publish any plan/design/architecture (including before ExitPlanMode). Copilot should help you detect missing requirements, risks, and the minimum clarifying questions + acceptance checklist.

## Message template

```text
<<<USER_MESSAGE_VERBATIM_BEGIN>>>
<copy/paste the user's exact words>
<<<USER_MESSAGE_VERBATIM_END>>>

## Requirements interpretation
- My interpretation:
- Assumptions:
- Non-goals:

## Proposed plan
<your draft plan>

## Constraints (optional)
<constraints>
```

## Run

```bash
<skill_root>/bin/copilot-skill-plan --model gemini-2.5-pro < message.txt
```

`<skill_root>` is typically `~/.agents/skills/copilot-skill`.

Before running the command, first query `<skill_root>/bin/copilot-skill --list-model-options`, then present all `claude-*` and `gemini-*` ids from that output to the user with no recommendation.
