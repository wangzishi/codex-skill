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
<skill_root>/bin/copilot-skill-chat --model <selected-model-id> --context-mode <selected-context-mode> < message.txt
```

`<skill_root>` is typically `~/.agents/skills/copilot-skill`.

Before running the command, first query `<skill_root>/bin/copilot-skill --list-model-options`, then present all `claude-*` and `gemini-*` ids from that output to the user with no recommendation. If the host agent supports structured blocking prompts, it must call `request_user_input`; otherwise ask in plain text.

After model selection, the host agent must collect a second explicit context mode choice:

- `provided`: only use the supplied prompt context
- `repo-read`: may read/search relevant files in the working directory, but may not modify files, execute commands, or access URLs

If the host agent supports structured blocking prompts, it must use `request_user_input` for this choice too; otherwise ask in plain text.

After Copilot responds, briefly summarize for the user which model and context mode were used, why Copilot was consulted, and the main takeaway.
