# chat

Purpose: general discussion, calibration, and help (agent ↔ Codex). If you are unsure whether plan/review is needed, start with chat.

## When to use

- Normal requirement discussion (confirm understanding)
- Mid-implementation changes (new constraints, user changes mind, big deviation)
- Disagreements (you vs Codex)
- You are stuck / unsure / confused

## Message format (verbatim user quote MUST be first)

```text
<<<USER_MESSAGE_VERBATIM_BEGIN>>>
<copy/paste the user's exact words here>
<<<USER_MESSAGE_VERBATIM_END>>>

<<<CALLER_CONTEXT_BEGIN>>>
You are speaking with an AI coding agent (not the end user).
Do not ask the end user directly. If user input is required, list the minimum questions for the agent to ask.
Reply in English and keep it concise.
<<<CALLER_CONTEXT_END>>>

<<<AGENT_DISCUSSION_BEGIN>>>
- What I think is true:
- Where I might be wrong:
- Where Codex might be wrong:
- The minimum questions to ask the user (if needed):
<<<AGENT_DISCUSSION_END>>>
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

Return the content of `/tmp/codex_last.txt`.
