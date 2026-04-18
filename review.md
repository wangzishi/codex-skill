# review

Use as the final step before you say "done/shipped/merged/released/deployed". Do not use this for plan review (use `plan.md` instead). Copilot should check correctness vs the verbatim user requirements and call out regressions, missing coverage, and minimum user confirmations.

## Message template

```text
<<<USER_MESSAGE_VERBATIM_BEGIN>>>
<copy/paste the user's exact words>
<<<USER_MESSAGE_VERBATIM_END>>>

## Delivery summary
- What changed:
- Why:
- Impact / risk:
- Rollback:

## Test results (optional)
<tests>

## Open questions (optional)
<questions>
```

## Run

```bash
<skill_root>/bin/copilot-skill-review --model <selected-model-id> < message.txt
```

`<skill_root>` is typically `~/.agents/skills/copilot-skill`.

Before running the command, first query `<skill_root>/bin/copilot-skill --list-model-options`, then present all `claude-*` and `gemini-*` ids from that output to the user with no recommendation. If the host agent supports structured blocking prompts, it must call `request_user_input`; otherwise ask in plain text.

After Copilot responds, briefly summarize for the user which model was used, why Copilot was consulted, and the main takeaway.
