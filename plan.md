# plan

Use before you publish any plan/design/architecture. Codex should help you detect missing requirements, risks, and the minimum clarifying questions + acceptance checklist.

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
<skill_root>/bin/codex-skill-plan < message.txt
```

`<skill_root>` is typically `~/.claude/skills/codex-skill`.
