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
<skill_root>/bin/copilot-skill-plan --model <selected-model-id> --context-mode <selected-context-mode> < message.txt
```

`<skill_root>` is typically `~/.agents/skills/copilot-skill`.

Before running the command, first query `<skill_root>/bin/copilot-skill --list-model-options`, then present all `claude-*` and `gemini-*` ids from that output to the user with no recommendation. If the host agent supports structured blocking prompts, it must call `request_user_input`; otherwise ask in plain text.

After model selection, the host agent must collect a second explicit context mode choice:

- `provided`: only use the supplied prompt context
- `repo-read`: may read/search relevant files in the working directory, but may not modify files, execute commands, or access URLs

If the host agent supports structured blocking prompts, it must use `request_user_input` for this choice too; otherwise ask in plain text.

If sub-agents are available, keep both blocking user choices in the host agent. After `model` and `context-mode` are fixed, the host agent should delegate the actual `copilot-skill-plan` invocation to a sub-agent, receive Copilot's raw reply, and then summarize it for the user before publishing any plan.

After Copilot responds, briefly summarize for the user which model and context mode were used, why Copilot was consulted, and the main takeaway.
