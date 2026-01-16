# review

Purpose: as the final step before you say “done/shipped/merged/released/deployed”, ask Codex to review your delivery summary against the verbatim user requirements and call out correctness risks, regressions, missing tests, and minimum user confirmations.

## Message format (verbatim user quote SHOULD be first)

```text
## Change summary
<<<USER_MESSAGE_VERBATIM_BEGIN>>>
<copy/paste the user's exact words here>
<<<USER_MESSAGE_VERBATIM_END>>>

<<<CALLER_CONTEXT_BEGIN>>>
You are speaking with an AI coding agent (not the end user).
Do not ask the end user directly. If user input is required, list the minimum questions for the agent to ask.
Reply in English.
<<<CALLER_CONTEXT_END>>>

<<<AGENT_DELIVERY_CONTEXT_BEGIN>>>
- What changed:
- Why:
- Impact / risk:
- Rollback:
<<<AGENT_DELIVERY_CONTEXT_END>>>

## Test results
<optional but recommended>

## Open questions
<optional>

Please answer in 4 sections:
1) Correctness vs the verbatim user requirements
2) Likely regressions / high-risk areas
3) Missing coverage & minimal tests to add
4) Minimum user confirmations (if any)
Keep it concise and avoid endless nitpicking.
```

## Run Codex (in `<repo>`)

- Resume (when `<repo>/.claude/codex_session.json` exists):

```bash
codex exec --cd "<repo>" --skip-git-repo-check --json --output-last-message "/tmp/codex_last.txt" resume "<session_id>" - > "/tmp/codex_events.jsonl"
```

- New session (when no `session_id`):

```bash
codex exec --cd "<repo>" --skip-git-repo-check --json --output-last-message "/tmp/codex_last.txt" - > "/tmp/codex_events.jsonl"
```

## Persist the session id (required)

- Extract `thread_id` from the first JSONL line:

```bash
python3 -c 'import json; print(json.loads(open("/tmp/codex_events.jsonl").readline())["thread_id"])'
```

- Write/update `<repo>/.claude/codex_session.json` with:

```json
{
  "session_id": "<thread_id>",
  "updated_at": "<UTC_ISO8601>"
}
```

- Use `date -u +"%Y-%m-%dT%H:%M:%SZ"` for `updated_at`.

## Output

1) Summarize Codex findings briefly.
2) If there are blockers, fix them before declaring done.
