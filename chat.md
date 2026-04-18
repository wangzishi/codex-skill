# chat

Use when you need discussion, calibration, or help (agent <-> Copilot).

## When to use

- Normal requirements discussion (confirm understanding)
- Mid-implementation changes (new constraints, user changes mind, big deviation)
- Disagreements (you vs Copilot)
- You are stuck / unsure / confused

## Message template

```text
<<<USER_MESSAGE_VERBATIM_BEGIN>>>
<copy/paste the user's exact words>
<<<USER_MESSAGE_VERBATIM_END>>>

## Agent context
- What I believe is true:
- What I might be wrong about:
- What Copilot might be wrong about:

## Questions
- My questions for Copilot:
- If user input is required, list the minimum questions for the user:
```

## Run

```bash
<skill_root>/bin/copilot-skill-chat < message.txt
```

`<skill_root>` is typically `~/.agents/skills/copilot-skill`.
