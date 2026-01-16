# plan

Purpose: before you publish any plan/design/architecture, ask Codex to review your requirements understanding + draft plan and produce missing items, risks, clarifying questions, and a minimal test/acceptance checklist.

## Message format (verbatim user quote MUST be first)

```text
## Requirements
<<<USER_MESSAGE_VERBATIM_BEGIN>>>
<copy/paste the user's exact words here>
<<<USER_MESSAGE_VERBATIM_END>>>

<<<CALLER_CONTEXT_BEGIN>>>
You are speaking with an AI coding agent (not the end user).
Do not ask the end user directly. If user input is required, list the minimum questions for the agent to ask.
Reply in English.
<<<CALLER_CONTEXT_END>>>

<<<AGENT_INTERPRETATION_BEGIN>>>
- My interpretation:
- Assumptions:
- Non-goals:
<<<AGENT_INTERPRETATION_END>>>

## Proposed plan
<your draft plan here>

## Constraints
<optional>

Please answer in 4 sections:
1) Missing requirements / misunderstanding risks
2) Key risks & edge cases
3) Minimum clarifying questions for the user
4) Minimal test plan / acceptance checklist
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

1) Summarize Codex feedback briefly.
2) Then publish your final plan, incorporating the feedback.
