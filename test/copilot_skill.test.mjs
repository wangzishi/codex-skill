import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, chmod, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import {
  CONTEXT_MODES,
  DEFAULT_REPO_READ_TIMEOUT_S,
  DEFAULT_TIMEOUT_S,
  MODEL_FAMILY_MAP,
  buildPrompt,
  formatModelOption,
  parseArgs,
  parseModelOptionsFromHelpConfig,
  queryModelOptions,
  resolveWorkingDirectory,
  resolveModelSelection,
  runCopilot,
  splitVerbatim,
} from "../bin/copilot_skill.mjs";

const SAMPLE_INPUT = `<<<USER_MESSAGE_VERBATIM_BEGIN>>>
Implement this feature exactly.
<<<USER_MESSAGE_VERBATIM_END>>>

## Agent context
- Current approach: keep the API stable
`;

async function makeStubCommand(t, behavior = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "copilot-skill-test-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const scriptPath = path.join(root, "copilot-stub.js");
  const wrapperPath =
    process.platform === "win32"
      ? path.join(root, "copilot-stub.ps1")
      : path.join(root, "copilot-stub");
  const logPath = path.join(root, "stub-log.json");

  const script = String.raw`
const fs = require("node:fs");

let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  stdin += chunk;
});
process.stdin.on("end", () => {
  const payload = {
    argv: process.argv.slice(2),
    stdin,
  };
  fs.writeFileSync(process.env.STUB_LOG_PATH, JSON.stringify(payload), "utf8");

  const delayMs = Number.parseInt(process.env.STUB_DELAY_MS || "0", 10);
  const exitCode = Number.parseInt(process.env.STUB_EXIT_CODE || "0", 10);
  const stdout = process.env.STUB_STDOUT || "stub ok";
  const stderr = process.env.STUB_STDERR || "";

  setTimeout(() => {
    if (stderr) {
      process.stderr.write(stderr);
    }
    if (stdout) {
      process.stdout.write(stdout);
    }
    process.exit(exitCode);
  }, delayMs);
});
`;

  const wrapper =
    process.platform === "win32"
      ? `$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& node (Join-Path $ScriptDir "copilot-stub.js") @args
exit $LASTEXITCODE
`
      : `#!/usr/bin/env sh\nexec node "$(dirname "$0")/copilot-stub.js" "$@"\n`;

  await writeFile(scriptPath, script, "utf8");
  await writeFile(wrapperPath, wrapper, "utf8");
  if (process.platform !== "win32") {
    await chmod(wrapperPath, 0o755);
  }

  return {
    bin: wrapperPath,
    env: {
      ...process.env,
      STUB_LOG_PATH: logPath,
      STUB_STDOUT: behavior.stdout ?? "stub ok",
      STUB_STDERR: behavior.stderr ?? "",
      STUB_EXIT_CODE: String(behavior.exitCode ?? 0),
      STUB_DELAY_MS: String(behavior.delayMs ?? 0),
    },
    logPath,
    root,
  };
}

function spawnAndCollect(command, args, { cwd, env, stdin }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    proc.on("error", reject);
    proc.on("close", (code) => resolve({ code, stdout, stderr }));
    proc.stdin.end(stdin);
  });
}

test("parseArgs accepts defaults and command-last wrappers", () => {
  assert.deepEqual(parseArgs(["review"]), {
    help: false,
    command: "review",
    cwd: null,
    timeoutS: DEFAULT_TIMEOUT_S,
    model: null,
    contextMode: "provided",
    modelFamily: null,
    listModelOptions: false,
  });

  assert.deepEqual(
    parseArgs(["--cwd", ".", "--timeout-s", "42", "--model", "gpt-5.2", "plan"]),
    {
      help: false,
      command: "plan",
      cwd: ".",
      timeoutS: 42,
      model: "gpt-5.2",
      contextMode: "provided",
      modelFamily: null,
      listModelOptions: false,
    },
  );

  assert.deepEqual(parseArgs(["--context-mode", "repo-read", "--model-family", "claude", "chat"]), {
    help: false,
    command: "chat",
    cwd: null,
    timeoutS: DEFAULT_REPO_READ_TIMEOUT_S,
    model: null,
    contextMode: "repo-read",
    modelFamily: "claude",
    listModelOptions: false,
  });

  assert.deepEqual(parseArgs(["--list-model-options"]), {
    help: false,
    command: null,
    cwd: null,
    timeoutS: DEFAULT_TIMEOUT_S,
    model: null,
    contextMode: "provided",
    modelFamily: null,
    listModelOptions: true,
  });
});

test("parseArgs uses repo-read timeout defaults only when --timeout-s is omitted", () => {
  assert.equal(parseArgs(["--context-mode", "repo-read", "chat"]).timeoutS, DEFAULT_REPO_READ_TIMEOUT_S);
  assert.equal(parseArgs(["chat", "--context-mode", "repo-read"]).timeoutS, DEFAULT_REPO_READ_TIMEOUT_S);
  assert.equal(parseArgs(["--context-mode", "provided", "chat"]).timeoutS, DEFAULT_TIMEOUT_S);
  assert.equal(parseArgs(["--context-mode", "provided", "--timeout-s", "600", "chat"]).timeoutS, 600);
  assert.equal(parseArgs(["--context-mode", "repo-read", "--timeout-s", "300", "chat"]).timeoutS, 300);
  assert.equal(parseArgs(["--context-mode", "repo-read", "--timeout-s", "1", "chat"]).timeoutS, 1);
  assert.equal(parseArgs(["--timeout-s", "300", "--context-mode", "repo-read", "chat"]).timeoutS, 300);
});

test("parseArgs rejects bad input", () => {
  assert.deepEqual(CONTEXT_MODES, ["provided", "repo-read"]);
  assert.throws(() => parseArgs([]), /Missing command/);
  assert.throws(() => parseArgs(["--timeout-s", "0", "chat"]), /positive integer/);
  assert.throws(() => parseArgs(["chat", "review"]), /Only one command/);
  assert.throws(() => parseArgs(["--context-mode", "full", "chat"]), /must be one of/);
  assert.throws(() => parseArgs(["--model-family", "openai", "chat"]), /must be one of/);
  assert.throws(() => parseArgs(["--model", "gpt-5.4", "--model-family", "claude", "chat"]), /not both/);
});

test("resolveModelSelection prefers exact model and maps families", () => {
  assert.equal(resolveModelSelection({ model: "GPT-5.4", modelFamily: null }), "GPT-5.4");
  assert.equal(resolveModelSelection({ model: null, modelFamily: "claude" }), MODEL_FAMILY_MAP.claude);
  assert.equal(resolveModelSelection({ model: null, modelFamily: "gemini" }), MODEL_FAMILY_MAP.gemini);
  assert.equal(resolveModelSelection({ model: null, modelFamily: null }), null);
});

test("formatModelOption converts ids to user-facing labels", () => {
  assert.deepEqual(formatModelOption("claude-sonnet-4.6"), {
    id: "claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    family: "claude",
  });
  assert.deepEqual(formatModelOption("gemini-3.1-pro"), {
    id: "gemini-3.1-pro",
    label: "Gemini 3.1 Pro",
    family: "gemini",
  });
});

test("parseModelOptionsFromHelpConfig extracts Claude and Gemini ids", () => {
  const helpText = `
Configuration Settings:

  \`model\`: AI model to use for Copilot CLI; can be changed with /model command or --model flag option.
    - "claude-sonnet-4.6"
    - "claude-haiku-4.5"
    - "gemini-2.5-pro"
    - "gpt-5.4"

  \`mouse\`: whether to enable mouse support in alt screen mode; defaults to \`true\`.
`;

  assert.deepEqual(parseModelOptionsFromHelpConfig(helpText), {
    source: "copilot help config",
    claude: [
      { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", family: "claude" },
      { id: "claude-haiku-4.5", label: "Claude Haiku 4.5", family: "claude" },
    ],
    gemini: [{ id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", family: "gemini" }],
  });
});

test("splitVerbatim normalizes newlines and preserves trailing content", () => {
  const parsed = splitVerbatim(
    "<<<USER_MESSAGE_VERBATIM_BEGIN>>>\r\nhello\r\n<<<USER_MESSAGE_VERBATIM_END>>>\r\n\r\nagent",
  );
  assert.equal(
    parsed.verbatim,
    "<<<USER_MESSAGE_VERBATIM_BEGIN>>>\nhello\n<<<USER_MESSAGE_VERBATIM_END>>>\n",
  );
  assert.equal(parsed.rest, "\nagent");
});

test("buildPrompt adds read-only safety header and tool suffix", () => {
  const prompt = buildPrompt("plan", SAMPLE_INPUT);
  assert.match(prompt, /GitHub Copilot CLI acting as a read-only second-opinion reviewer/);
  assert.match(prompt, /Do not modify files, execute commands, use tools/);
  assert.match(prompt, /Minimum clarifying questions for the user/);
  assert.match(prompt, /## Agent context/);
});

test("buildPrompt enables repository reads only in repo-read mode", () => {
  const prompt = buildPrompt("review", SAMPLE_INPUT, "repo-read");
  assert.match(prompt, /You may read and search files within the current working directory/);
  assert.match(prompt, /context_mode=repo-read/);
  assert.match(prompt, /do not modify files, execute commands, or access URLs/i);
});

test("resolveWorkingDirectory validates the directory", async () => {
  const resolved = await resolveWorkingDirectory(".");
  assert.equal(resolved, process.cwd());
  await assert.rejects(() => resolveWorkingDirectory(path.join(process.cwd(), "missing-dir")), /does not exist/);
});

test("runCopilot passes the prompt with -p and forwards model when requested", async (t) => {
  const stub = await makeStubCommand(t, { stdout: "review complete" });
  const reply = await runCopilot({
    cwd: process.cwd(),
    prompt: SAMPLE_INPUT,
    timeoutS: 5,
    model: "gpt-5.2",
    bin: stub.bin,
    env: stub.env,
  });

  assert.equal(reply, "review complete");

  const log = JSON.parse(await readFile(stub.logPath, "utf8"));
  assert.deepEqual(log.argv, [
    "-s",
    "--no-ask-user",
    "--deny-tool=write",
    "--deny-tool=shell",
    "--deny-tool=url",
    "--model",
    "gpt-5.2",
    "-p",
    SAMPLE_INPUT,
  ]);
  assert.equal(log.stdin, "");
});

test("queryModelOptions parses model ids from local Copilot help", async (t) => {
  const stub = await makeStubCommand(t, {
    stdout: `Configuration Settings:\n\n  \`model\`: AI model to use.\n    - "claude-sonnet-4.6"\n    - "gemini-3.1-pro"\n    - "gpt-5.4"\n\n  \`mouse\`: test\n`,
  });

  const result = await queryModelOptions({
    cwd: process.cwd(),
    bin: stub.bin,
    env: stub.env,
  });

  assert.deepEqual(result, {
    source: "copilot help config",
    claude: [{ id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", family: "claude" }],
    gemini: [{ id: "gemini-3.1-pro", label: "Gemini 3.1 Pro", family: "gemini" }],
  });
});

test("runCopilot surfaces stderr on failure", async (t) => {
  const stub = await makeStubCommand(t, {
    exitCode: 9,
    stderr: "permission denied",
    stdout: "",
  });

  await assert.rejects(
    () =>
      runCopilot({
        cwd: process.cwd(),
        prompt: SAMPLE_INPUT,
        timeoutS: 5,
        model: null,
        bin: stub.bin,
        env: stub.env,
      }),
    /permission denied/,
  );
});

test("runCopilot times out cleanly", async (t) => {
  const stub = await makeStubCommand(t, {
    delayMs: 2000,
    stdout: "too late",
  });

  await assert.rejects(
    () =>
      runCopilot({
        cwd: process.cwd(),
        prompt: SAMPLE_INPUT,
        timeoutS: 1,
        model: null,
        bin: stub.bin,
        env: stub.env,
      }),
    /timed out after 1s/,
  );
});

test("PowerShell wrapper runs the fixed plan command", async (t) => {
  if (process.platform !== "win32") {
    t.skip("PowerShell wrapper smoke test is Windows-specific.");
    return;
  }

  const stub = await makeStubCommand(t, { stdout: "wrapper ok" });
  const result = await spawnAndCollect(
    "pwsh",
    ["-NoLogo", "-NoProfile", "-File", path.join(process.cwd(), "bin", "copilot-skill-plan.ps1")],
    {
      cwd: process.cwd(),
      env: {
        ...stub.env,
        COPILOT_BIN: stub.bin,
      },
      stdin: SAMPLE_INPUT,
    },
  );

  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), "wrapper ok");

  const log = JSON.parse(await readFile(stub.logPath, "utf8"));
  assert.equal(log.argv[0], "-s");
  assert.equal(log.argv[1], "--no-ask-user");
  assert.equal(log.argv[2], "--deny-tool=write");
  assert.equal(log.argv[3], "--deny-tool=shell");
  assert.equal(log.argv[4], "--deny-tool=url");
  assert.equal(log.argv[5], "-p");
  assert.match(log.argv.slice(6).join(" "), /origin=copilot-skill tool=plan context_mode=provided/);
});

test("cmd wrapper runs the fixed review command", async (t) => {
  if (process.platform !== "win32") {
    t.skip("cmd wrapper smoke test is Windows-specific.");
    return;
  }

  const stub = await makeStubCommand(t, { stdout: "cmd ok" });
  const result = await spawnAndCollect(
    "cmd.exe",
    ["/d", "/s", "/c", path.join(process.cwd(), "bin", "copilot-skill-review.cmd")],
    {
      cwd: process.cwd(),
      env: {
        ...stub.env,
        COPILOT_BIN: stub.bin,
      },
      stdin: SAMPLE_INPUT,
    },
  );

  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), "cmd ok");
});

test("unix shell wrapper runs the fixed chat command", async (t) => {
  if (process.platform === "win32") {
    t.skip("Unix shell wrapper smoke test is not available on Windows.");
    return;
  }

  const stub = await makeStubCommand(t, { stdout: "shell ok" });
  const result = await spawnAndCollect(
    "sh",
    [path.join(process.cwd(), "bin", "copilot-skill-chat")],
    {
      cwd: process.cwd(),
      env: {
        ...stub.env,
        COPILOT_BIN: stub.bin,
      },
      stdin: SAMPLE_INPUT,
    },
  );

  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), "shell ok");
});
