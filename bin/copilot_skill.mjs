#!/usr/bin/env node

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const COMMANDS = ["chat", "plan", "review"];
export const DEFAULT_TIMEOUT_S = 180;
export const DEFAULT_REPO_READ_TIMEOUT_S = 600;
export const VERBATIM_BEGIN = "<<<USER_MESSAGE_VERBATIM_BEGIN>>>";
export const VERBATIM_END = "<<<USER_MESSAGE_VERBATIM_END>>>";
export const CONTEXT_MODES = ["provided", "repo-read"];
export const MODEL_FAMILY_MAP = {
  claude: "Claude Sonnet 4.6",
  gemini: "Gemini 2.5 Pro",
};

const COMMAND_SET = new Set(COMMANDS);
const CONTEXT_MODE_SET = new Set(CONTEXT_MODES);
const MODEL_FAMILY_SET = new Set(Object.keys(MODEL_FAMILY_MAP));

export function usage() {
  return [
    "usage: copilot-skill [-h] [--cwd DIR] [--timeout-s SECONDS] [--model MODEL] [--context-mode MODE] [--list-model-options] {chat,plan,review}",
    "",
    "positional arguments:",
    "  {chat,plan,review}   Review mode to run.",
    "",
    "options:",
    "  -h, --help           Show this help message and exit.",
    "  --cwd DIR            Working directory for the Copilot CLI invocation.",
    "  --timeout-s SECONDS  Copilot CLI timeout in seconds (default: 180, repo-read: 600).",
    "  --model MODEL        Optional model override for this call.",
    "  --context-mode MODE  Context mode: provided or repo-read.",
    "  --model-family NAME  Model family alias: claude or gemini.",
    "  --list-model-options Query Copilot CLI for Claude/Gemini model ids and exit.",
    "",
    "examples:",
    "  copilot-skill review < message.txt",
    "  copilot-skill-plan --cwd . < message.txt",
  ].join("\n");
}

function parseLongOption(arg, name) {
  if (arg === name) {
    return { matched: true, inlineValue: null };
  }

  const prefix = `${name}=`;
  if (arg.startsWith(prefix)) {
    return { matched: true, inlineValue: arg.slice(prefix.length) };
  }

  return { matched: false, inlineValue: null };
}

function requireOptionValue(argv, index, option, inlineValue) {
  if (inlineValue !== null) {
    if (!inlineValue) {
      throw new Error(`Option ${option} requires a value.`);
    }
    return { value: inlineValue, nextIndex: index };
  }

  const nextIndex = index + 1;
  if (nextIndex >= argv.length) {
    throw new Error(`Option ${option} requires a value.`);
  }

  return { value: argv[nextIndex], nextIndex };
}

export function parseArgs(argv) {
  let command = null;
  let cwd = null;
  let timeoutS = null;
  let timeoutExplicit = false;
  let model = null;
  let contextMode = "provided";
  let modelFamily = null;
  let listModelOptions = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }

    if (arg === "--list-model-options") {
      listModelOptions = true;
      continue;
    }

    if (COMMAND_SET.has(arg)) {
      if (command !== null) {
        throw new Error(`Only one command is allowed. Received both "${command}" and "${arg}".`);
      }
      command = arg;
      continue;
    }

    const cwdOption = parseLongOption(arg, "--cwd");
    if (cwdOption.matched) {
      const { value, nextIndex } = requireOptionValue(argv, index, "--cwd", cwdOption.inlineValue);
      cwd = value;
      index = nextIndex;
      continue;
    }

    const timeoutOption = parseLongOption(arg, "--timeout-s");
    if (timeoutOption.matched) {
      const { value, nextIndex } = requireOptionValue(
        argv,
        index,
        "--timeout-s",
        timeoutOption.inlineValue,
      );
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Option --timeout-s must be a positive integer. Received "${value}".`);
      }
      timeoutS = parsed;
      timeoutExplicit = true;
      index = nextIndex;
      continue;
    }

    const modelOption = parseLongOption(arg, "--model");
    if (modelOption.matched) {
      const { value, nextIndex } = requireOptionValue(
        argv,
        index,
        "--model",
        modelOption.inlineValue,
      );
      model = value;
      index = nextIndex;
      continue;
    }

    const contextModeOption = parseLongOption(arg, "--context-mode");
    if (contextModeOption.matched) {
      const { value, nextIndex } = requireOptionValue(
        argv,
        index,
        "--context-mode",
        contextModeOption.inlineValue,
      );
      const normalized = value.trim().toLowerCase();
      if (!CONTEXT_MODE_SET.has(normalized)) {
        throw new Error(
          `Option --context-mode must be one of: ${CONTEXT_MODES.join(", ")}. Received "${value}".`,
        );
      }
      contextMode = normalized;
      index = nextIndex;
      continue;
    }

    const modelFamilyOption = parseLongOption(arg, "--model-family");
    if (modelFamilyOption.matched) {
      const { value, nextIndex } = requireOptionValue(
        argv,
        index,
        "--model-family",
        modelFamilyOption.inlineValue,
      );
      const normalized = value.trim().toLowerCase();
      if (!MODEL_FAMILY_SET.has(normalized)) {
        throw new Error(
          `Option --model-family must be one of: ${Array.from(MODEL_FAMILY_SET).join(", ")}. Received "${value}".`,
        );
      }
      modelFamily = normalized;
      index = nextIndex;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (model !== null && modelFamily !== null) {
    throw new Error("Use either --model or --model-family, not both.");
  }

  if (!timeoutExplicit) {
    timeoutS = contextMode === "repo-read" ? DEFAULT_REPO_READ_TIMEOUT_S : DEFAULT_TIMEOUT_S;
  }

  if (help) {
    return { help, command, cwd, timeoutS, model, contextMode, modelFamily, listModelOptions };
  }

  if (!listModelOptions && command === null) {
    throw new Error(`Missing command. Use one of: ${COMMANDS.join(", ")}`);
  }

  return { help, command, cwd, timeoutS, model, contextMode, modelFamily, listModelOptions };
}

export function resolveModelSelection({ model, modelFamily }) {
  if (model !== null) {
    return model;
  }

  if (modelFamily !== null) {
    return MODEL_FAMILY_MAP[modelFamily];
  }

  return null;
}

export function parseModelOptionsFromHelpConfig(helpText) {
  const lines = helpText.replace(/\r\n/g, "\n").split("\n");
  const modelIds = [];
  let inModelSection = false;

  for (const line of lines) {
    if (!inModelSection) {
      if (line.startsWith("  `model`:")) {
        inModelSection = true;
      }
      continue;
    }

    if (line.startsWith("  `") && !line.startsWith("  `model`:")) {
      break;
    }

    const match = line.match(/"([^"]+)"/);
    if (match) {
      modelIds.push(match[1]);
    }
  }

  const filtered = modelIds.filter((id) => id.startsWith("claude-") || id.startsWith("gemini-"));
  const unique = [...new Set(filtered)];

  return {
    source: "copilot help config",
    claude: unique.filter((id) => id.startsWith("claude-")).map((id) => formatModelOption(id)),
    gemini: unique.filter((id) => id.startsWith("gemini-")).map((id) => formatModelOption(id)),
  };
}

function titleCaseSegment(segment) {
  if (/^\d/.test(segment)) {
    return segment;
  }

  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function formatModelOption(id) {
  const label = id
    .split("-")
    .map((segment) => titleCaseSegment(segment))
    .join(" ");
  const family = id.startsWith("claude-") ? "claude" : id.startsWith("gemini-") ? "gemini" : "other";
  return { id, label, family };
}

export async function queryModelOptions({
  cwd,
  bin = process.env.COPILOT_BIN || "copilot",
  env = process.env,
}) {
  const invocation = resolveSpawnInvocation(bin, ["help", "config"]);

  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(invocation.command, invocation.args, {
      cwd,
      env,
      shell: invocation.shell,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    proc.on("error", (error) => {
      if (error && error.code === "ENOENT") {
        reject(new Error(`Copilot CLI executable not found: ${bin}`));
        return;
      }
      reject(new Error(`Failed to launch Copilot CLI: ${error.message}`));
    });

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    proc.on("close", (code) => {
      const cleanStdout = stripAnsi(stdout).trim();
      const cleanStderr = stripAnsi(stderr).trim();

      if (code !== 0) {
        reject(new Error(cleanStderr || `Copilot CLI exited with code ${code}.`));
        return;
      }

      resolve(parseModelOptionsFromHelpConfig(cleanStdout));
    });
  });
}

export function splitVerbatim(stdinText) {
  const text = stdinText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const stripped = text.trimStart();

  if (!stripped.startsWith(VERBATIM_BEGIN)) {
    throw new Error(
      `Input must start with a verbatim user block: ${VERBATIM_BEGIN} ... ${VERBATIM_END}`,
    );
  }

  const offset = text.length - stripped.length;
  const beginIndex = offset;
  const endIndex = text.indexOf(VERBATIM_END, beginIndex);

  if (endIndex === -1) {
    throw new Error(`Missing verbatim end marker: ${VERBATIM_END}`);
  }

  let afterEnd = endIndex + VERBATIM_END.length;
  if (afterEnd < text.length && text.slice(afterEnd, afterEnd + 1) === "\n") {
    afterEnd += 1;
  }

  const verbatim = `${text.slice(beginIndex, afterEnd).replace(/^\n+|\n+$/g, "")}\n`;
  const rest = text.slice(afterEnd);
  return { verbatim, rest };
}

export function safetyHeader(tool, contextMode) {
  const repoReadLines =
    contextMode === "repo-read"
      ? [
          "You may read and search files within the current working directory when that is necessary to answer well.",
          "Do not modify files, execute commands, use shell tools, or access URLs.",
          "Limit yourself to the minimum relevant files and cite repository evidence in your reasoning when useful.",
        ]
      : [
          "Do not modify files, execute commands, use tools, or rely on repository reads beyond the provided context.",
        ];

  return [
    "<<<ROLE_CARD_BEGIN>>>",
    "You are GitHub Copilot CLI acting as a read-only second-opinion reviewer for an AI coding agent.",
    "Treat the verbatim user block as the source of truth for user intent and constraints.",
    "Treat everything after the verbatim block as agent-authored context, questions, plans, or delivery summaries.",
    'Address the AI agent and refer to the human as "the user" (not "you").',
    "Do not ask the end user directly.",
    ...repoReadLines,
    "If additional information is required, list the minimum questions for the agent to ask the user.",
    "Reply in plain text only.",
    "<<<ROLE_CARD_END>>>",
    "",
    "<<<AGENT_MESSAGE_BEGIN>>>",
    `origin=copilot-skill tool=${tool} context_mode=${contextMode}`,
    "You are speaking with an AI coding agent (not the end user).",
    contextMode === "repo-read"
      ? "This invocation is read-only. You may read relevant files inside the working directory, but do not modify files, execute commands, or access URLs."
      : "This invocation is read-only. Do not modify files, execute commands, use tools, or read repository files beyond the provided context.",
    "<<<AGENT_MESSAGE_END>>>",
  ].join("\n");
}

export function toolSuffix(tool) {
  if (tool === "plan") {
    return [
      "Please answer in 4 sections:",
      "1) Missing requirements / misunderstanding risks",
      "2) Key risks & edge cases",
      "3) Minimum clarifying questions for the user",
      "4) Minimal test plan / acceptance checklist",
      "Keep it concise and prioritize blockers over nitpicks.",
    ].join("\n");
  }

  if (tool === "review") {
    return [
      "Please answer in 4 sections:",
      "1) Correctness vs the verbatim user requirements",
      "2) Likely regressions / high-risk areas",
      "3) Missing coverage & minimal tests to add",
      "4) Minimum user confirmations (if any)",
      "Keep it concise and prioritize blockers over nitpicks.",
    ].join("\n");
  }

  return "Reply in English and keep it concise.";
}

export function buildPrompt(tool, stdinText, contextMode = "provided") {
  const { verbatim, rest } = splitVerbatim(stdinText);
  const parts = [verbatim.replace(/\n$/, "")];
  const agentParts = [safetyHeader(tool, contextMode)];
  const restStripped = rest.trim();

  if (restStripped) {
    agentParts.push(restStripped);
  }

  agentParts.push(toolSuffix(tool));
  parts.push(agentParts.join("\n\n"));
  return `${parts.join("\n\n").trim()}\n`;
}

export async function resolveWorkingDirectory(cwdArgument) {
  const resolved = cwdArgument ? path.resolve(cwdArgument) : process.cwd();
  let stats;

  try {
    stats = await fs.stat(resolved);
  } catch {
    throw new Error(`Working directory does not exist: ${resolved}`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`Working directory is not a directory: ${resolved}`);
  }

  return resolved;
}

export async function readStdin(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
  }

  return chunks.join("");
}

export function stripAnsi(value) {
  return value.replace(/\u001B\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function quoteForCmd(argument) {
  return `"${String(argument).replace(/"/g, '""')}"`;
}

export function resolveSpawnInvocation(bin, args) {
  if (process.platform !== "win32") {
    return { command: bin, args, shell: false };
  }

  const lower = bin.toLowerCase();

  if (lower.endsWith(".ps1")) {
    return {
      command: "powershell.exe",
      args: ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bin, ...args],
      shell: false,
    };
  }

  if (lower.endsWith(".cmd") || lower.endsWith(".bat")) {
    return {
      command: [quoteForCmd(bin), ...args.map(quoteForCmd)].join(" "),
      args: [],
      shell: true,
    };
  }

  return {
    command: bin,
    args,
    shell: false,
  };
}

export async function runCopilot({
  cwd,
  prompt,
  timeoutS,
  model,
  bin = process.env.COPILOT_BIN || "copilot",
  env = process.env,
}) {
  const invocationArgs = [
    "-s",
    "--no-ask-user",
    "--deny-tool=write",
    "--deny-tool=shell",
    "--deny-tool=url",
  ];
  if (model) {
    invocationArgs.push("--model", model);
  }
  invocationArgs.push("-p", prompt);

  const invocation = resolveSpawnInvocation(bin, invocationArgs);

  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let killTimer = null;

    const proc = spawn(invocation.command, invocation.args, {
      cwd,
      env,
      shell: invocation.shell,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const timeoutMs = timeoutS * 1000;
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
      killTimer = setTimeout(() => proc.kill("SIGKILL"), 1000);
    }, timeoutMs);

    proc.on("error", (error) => {
      clearTimeout(timeout);
      if (killTimer) {
        clearTimeout(killTimer);
      }

      if (error && error.code === "ENOENT") {
        reject(new Error(`Copilot CLI executable not found: ${bin}`));
        return;
      }

      reject(new Error(`Failed to launch Copilot CLI: ${error.message}`));
    });

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    proc.on("close", (code, signal) => {
      clearTimeout(timeout);
      if (killTimer) {
        clearTimeout(killTimer);
      }

      if (timedOut) {
        reject(new Error(`Copilot CLI timed out after ${timeoutS}s.`));
        return;
      }

      if (signal) {
        reject(new Error(`Copilot CLI exited unexpectedly with signal ${signal}.`));
        return;
      }

      const cleanStdout = stripAnsi(stdout).trim();
      const cleanStderr = stripAnsi(stderr).trim();

      if (code !== 0) {
        if (/not recognized|not found/i.test(cleanStderr)) {
          reject(new Error(`Copilot CLI executable not found: ${bin}`));
          return;
        }

        reject(new Error(cleanStderr || `Copilot CLI exited with code ${code}.`));
        return;
      }

      if (!cleanStdout) {
        reject(new Error("Copilot CLI returned an empty response."));
        return;
      }

      resolve(cleanStdout);
    });

    proc.stdin.on("error", () => {});
    proc.stdin.end();
  });
}

export async function main(argv = process.argv.slice(2), io = process) {
  let parsed;

  try {
    parsed = parseArgs(argv);
  } catch (error) {
    io.stderr.write(`${error.message}\n\n${usage()}\n`);
    return 1;
  }

  if (parsed.help) {
    io.stdout.write(`${usage()}\n`);
    return 0;
  }

  try {
    const cwd = await resolveWorkingDirectory(parsed.cwd);

    if (parsed.listModelOptions) {
      const options = await queryModelOptions({ cwd });
      io.stdout.write(`${JSON.stringify(options, null, 2)}\n`);
      return 0;
    }

    const stdinText = await readStdin(io.stdin);
    if (!stdinText.trim()) {
      io.stderr.write("Empty input. Provide content via stdin.\n");
      return 2;
    }

    const prompt = buildPrompt(parsed.command, stdinText, parsed.contextMode);
    const reply = await runCopilot({
      cwd,
      prompt,
      timeoutS: parsed.timeoutS,
      model: resolveModelSelection({ model: parsed.model, modelFamily: parsed.modelFamily }),
    });
    io.stdout.write(`${reply.replace(/\s+$/g, "")}\n`);
    return 0;
  } catch (error) {
    io.stderr.write(`${error.message}\n`);
    return 1;
  }
}

const entryUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryUrl !== null && import.meta.url === entryUrl) {
  const exitCode = await main();
  process.exit(exitCode);
}
