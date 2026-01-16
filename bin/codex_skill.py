#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple


CODEX_BIN = os.environ.get("CODEX_BIN", "codex")
CODEX_HOME = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex")))
DEFAULT_MODEL = os.environ.get("CODEX_MODEL")
DEFAULT_REASONING_EFFORT = os.environ.get("CODEX_REASONING_EFFORT")

VERBATIM_BEGIN = "<<<USER_MESSAGE_VERBATIM_BEGIN>>>"
VERBATIM_END = "<<<USER_MESSAGE_VERBATIM_END>>>"


def eprint(*args: object) -> None:
    print(*args, file=sys.stderr)


def find_project_root(start: Path) -> Path:
    """
    Infer a stable project root for storing per-project state.

    Rationale:
    - Tool runners may execute commands from a subdirectory (or a nested git repo).
    - Relying on `git` can fail in restricted PATH environments.
    - We want the same root as the caller's project, not an arbitrary subdirectory.

    Heuristic (highest priority first):
    1) The highest ancestor containing `.claude/codex_session.json`
    2) The highest ancestor containing `.claude/`
    3) The highest ancestor containing `.git` (dir or file)
    4) Fallback to the resolved start directory
    """
    start = start.expanduser().resolve()

    ancestors: list[Path] = []
    cur = start
    while True:
        ancestors.append(cur)
        if cur.parent == cur:
            break
        cur = cur.parent

    best_session: Optional[Path] = None
    best_claude_dir: Optional[Path] = None
    best_git: Optional[Path] = None

    for p in ancestors:
        if (p / ".claude" / "codex_session.json").is_file():
            best_session = p
        if (p / ".claude").is_dir():
            best_claude_dir = p
        if (p / ".git").exists():
            best_git = p

    return best_session or best_claude_dir or best_git or start


def session_file_path(repo_root: Path) -> Path:
    return repo_root / ".claude" / "codex_session.json"


def read_session_id(repo_root: Path) -> Optional[str]:
    path = session_file_path(repo_root)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            sid = data.get("session_id")
            if isinstance(sid, str) and sid:
                return sid
    except Exception:
        return None
    return None


def write_session_id(repo_root: Path, session_id: str) -> None:
    path = session_file_path(repo_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "session_id": session_id,
        "updated_at": datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
    }
    tmp = path.with_suffix(path.suffix + f".tmp.{os.getpid()}")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def split_verbatim(stdin_text: str) -> Tuple[str, str]:
    text = stdin_text.replace("\r\n", "\n").replace("\r", "\n")
    stripped = text.lstrip()
    if not stripped.startswith(VERBATIM_BEGIN):
        raise ValueError(
            f"Input must start with a verbatim user block: {VERBATIM_BEGIN} ... {VERBATIM_END}"
        )

    offset = len(text) - len(stripped)
    begin_idx = offset
    end_idx = text.find(VERBATIM_END, begin_idx)
    if end_idx == -1:
        raise ValueError(f"Missing verbatim end marker: {VERBATIM_END}")

    after_end = end_idx + len(VERBATIM_END)
    if after_end < len(text) and text[after_end : after_end + 1] == "\n":
        after_end += 1

    verbatim = text[begin_idx:after_end].strip("\n") + "\n"
    rest = text[after_end:]
    return verbatim, rest


def role_card_text() -> str:
    return "\n".join(
        [
            "<<<ROLE_CARD_BEGIN>>>",
            "This session may include messages from a human (via `codex resume`) and from an AI agent (via codex-skill scripts).",
            "Treat the verbatim user block as the source of truth for user intent and constraints.",
            "Treat everything after the verbatim block as agent-authored context, questions, plans, or delivery summaries.",
            'When replying to agent messages, address the agent and refer to the human as "the user" (not "you").',
            "If user input is required, list the minimum questions for the agent to ask the user (do not ask the user directly).",
            "<<<ROLE_CARD_END>>>",
        ]
    )


def tool_suffix(tool: str) -> str:
    if tool == "plan":
        return "\n".join(
            [
                "Please answer in 4 sections:",
                "1) Missing requirements / misunderstanding risks",
                "2) Key risks & edge cases",
                "3) Minimum clarifying questions for the user",
                "4) Minimal test plan / acceptance checklist",
                "Keep it concise and prioritize blockers over nitpicks.",
            ]
        )
    if tool == "review":
        return "\n".join(
            [
                "Please answer in 4 sections:",
                "1) Correctness vs the verbatim user requirements",
                "2) Likely regressions / high-risk areas",
                "3) Missing coverage & minimal tests to add",
                "4) Minimum user confirmations (if any)",
                "Keep it concise and prioritize blockers over nitpicks.",
            ]
        )
    return "Reply in English and keep it concise."


def build_prompt(tool: str, stdin_text: str, include_role_card: bool) -> str:
    verbatim, rest = split_verbatim(stdin_text)
    parts: list[str] = [verbatim.rstrip("\n")]

    agent_parts: list[str] = []
    if include_role_card:
        agent_parts.append(role_card_text())

    agent_parts.append(
        "\n".join(
            [
                "<<<AGENT_MESSAGE_BEGIN>>>",
                f"origin=codex-skill tool={tool}",
                "You are speaking with an AI coding agent (not the end user).",
                "Do not ask the end user directly. If user input is required, list the minimum questions for the agent to ask.",
                "<<<AGENT_MESSAGE_END>>>",
            ]
        )
    )

    rest_stripped = rest.strip()
    if rest_stripped:
        agent_parts.append(rest_stripped)
    agent_parts.append(tool_suffix(tool))

    parts.append("\n\n".join(agent_parts))
    return "\n\n".join(parts).strip() + "\n"


def safe_json_loads(line: str) -> Optional[dict]:
    try:
        obj = json.loads(line)
        return obj if isinstance(obj, dict) else None
    except Exception:
        return None


def detect_thread_id(event: dict) -> Optional[str]:
    thread_id = event.get("thread_id")
    if isinstance(thread_id, str) and thread_id:
        return thread_id

    if event.get("type") == "session_meta":
        payload = event.get("payload")
        if isinstance(payload, dict):
            sid = payload.get("id")
            if isinstance(sid, str) and sid:
                return sid

    if event.get("type") == "thread.started":
        tid = event.get("thread_id")
        if isinstance(tid, str) and tid:
            return tid

    return None


@dataclass
class CodexRunResult:
    session_id: str
    reply: str


def run_codex(
    repo_root: Path,
    session_id: Optional[str],
    prompt: str,
    timeout_s: int,
    model: Optional[str],
    reasoning_effort: Optional[str],
) -> CodexRunResult:
    tmp_last = Path(tempfile.mkstemp(prefix="codex-skill-last-", suffix=".txt")[1])
    try:
        base_args = [
            "exec",
            "--skip-git-repo-check",
            "--json",
            "--cd",
            str(repo_root),
            "--output-last-message",
            str(tmp_last),
        ]
        if model:
            base_args += ["--model", model]
        if reasoning_effort:
            base_args += ["--config", f'model_reasoning_effort="{reasoning_effort}"']

        if session_id:
            cmd = [CODEX_BIN, *base_args, "resume", session_id, "-"]
        else:
            cmd = [CODEX_BIN, *base_args, "-"]

        proc = subprocess.Popen(
            cmd,
            cwd=str(repo_root),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )

        thread_id: Optional[str] = None

        try:
            assert proc.stdin is not None
            proc.stdin.write(prompt)
            proc.stdin.close()
        except Exception:
            proc.kill()
            raise

        try:
            assert proc.stdout is not None
            for line in proc.stdout:
                event = safe_json_loads(line.strip())
                if not event:
                    continue
                tid = detect_thread_id(event)
                if tid and not thread_id:
                    thread_id = tid

            rc = proc.wait(timeout=timeout_s)
        except subprocess.TimeoutExpired:
            proc.kill()
            raise RuntimeError(f"codex timed out after {timeout_s}s")

        if rc != 0:
            stderr = ""
            try:
                assert proc.stderr is not None
                stderr = proc.stderr.read().strip()
            except Exception:
                stderr = ""
            raise RuntimeError(stderr or f"codex exited with code {rc}")

        if not thread_id:
            raise RuntimeError("Failed to detect Codex thread_id from JSONL output.")

        reply = ""
        try:
            reply = tmp_last.read_text(encoding="utf-8").strip()
        except Exception:
            reply = ""
        if not reply:
            raise RuntimeError("Failed to read Codex last message output.")

        return CodexRunResult(session_id=thread_id, reply=reply)
    finally:
        try:
            tmp_last.unlink(missing_ok=True)  # type: ignore[call-arg]
        except Exception:
            pass


def find_rollout_for_session(session_id: str) -> Optional[Path]:
    sessions_root = CODEX_HOME / "sessions"
    if not sessions_root.exists():
        return None

    best: Optional[Tuple[float, Path]] = None
    for root, _dirs, files in os.walk(sessions_root):
        for name in files:
            if not name.endswith(".jsonl"):
                continue
            if session_id not in name:
                continue
            p = Path(root) / name
            try:
                mtime = p.stat().st_mtime
            except Exception:
                continue
            if best is None or mtime > best[0]:
                best = (mtime, p)
    return best[1] if best else None


def try_promote_exec_session_to_cli(session_id: str) -> None:
    rollout = find_rollout_for_session(session_id)
    if rollout is None:
        return
    try:
        raw = rollout.read_text(encoding="utf-8")
        idx = raw.find("\n")
        if idx == -1:
            return
        first_line = raw[:idx].rstrip("\n\r")
        rest = raw[idx + 1 :]
        event = safe_json_loads(first_line)
        if not event:
            return
        if event.get("type") != "session_meta":
            return
        payload = event.get("payload")
        if not isinstance(payload, dict):
            return
        if payload.get("id") != session_id:
            return
        if payload.get("originator") != "codex_exec":
            return
        if payload.get("source") != "exec":
            return

        payload = dict(payload)
        payload["originator"] = "codex_cli_rs"
        payload["source"] = "cli"
        event = dict(event)
        event["payload"] = payload

        new_first = json.dumps(event, ensure_ascii=False)
        if "\n" in new_first:
            return

        tmp = rollout.with_suffix(rollout.suffix + f".tmp.{os.getpid()}")
        tmp.write_text(new_first + "\n" + rest, encoding="utf-8")
        tmp.replace(rollout)
    except Exception:
        return


def main() -> int:
    parser = argparse.ArgumentParser(prog="codex-skill")
    parser.add_argument("--cwd", default=".", help="Working directory (project root inferred).")
    parser.add_argument("--new-session", action="store_true", help="Force creating a new Codex session.")
    parser.add_argument("--timeout-s", type=int, default=180, help="codex exec timeout in seconds.")
    parser.add_argument("--model", default=None, help="Optional model override for this call.")
    parser.add_argument("--reasoning-effort", default=None, help="Optional reasoning effort override for this call.")

    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("chat", help="General discussion / calibration (reads stdin).")
    sub.add_parser("plan", help="Plan review (reads stdin).")
    sub.add_parser("review", help="Final review (reads stdin).")

    args = parser.parse_args()

    start_cwd = Path(args.cwd).expanduser()
    repo_root = find_project_root(start_cwd)

    session_id = None if args.new_session else read_session_id(repo_root)
    include_role_card = session_id is None

    stdin_text = sys.stdin.read()
    if not stdin_text.strip():
        eprint("Empty input. Provide content via stdin.")
        return 2

    model = args.model or DEFAULT_MODEL
    reasoning_effort = args.reasoning_effort or DEFAULT_REASONING_EFFORT

    try:
        prompt = build_prompt(args.cmd, stdin_text, include_role_card=include_role_card)
        result = run_codex(
            repo_root=repo_root,
            session_id=session_id,
            prompt=prompt,
            timeout_s=args.timeout_s,
            model=model,
            reasoning_effort=reasoning_effort,
        )
    except Exception as exc:
        eprint(str(exc))
        return 1

    write_session_id(repo_root, result.session_id)
    try_promote_exec_session_to_cli(result.session_id)

    sys.stdout.write(result.reply.rstrip() + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
