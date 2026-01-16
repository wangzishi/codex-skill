# review

Use as the final step before you say “done/shipped/merged/released/deployed”. Codex should check correctness vs the verbatim user requirements and call out regressions, missing coverage, and minimum user confirmations.

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
~/.claude/skills/codex-skill/bin/codex-skill-review < message.txt
```
