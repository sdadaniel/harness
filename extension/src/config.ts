import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import type { HarnessConfig, Platform } from "./types";

const PLATFORMS: Platform[] = ["cursor", "claude", "codex"];

export function getHarnessConfiguration(
  context: vscode.ExtensionContext
): HarnessConfig {
  const cfg = vscode.workspace.getConfiguration("agentsync");
  const projectRoot = resolveProjectRoot(cfg.get<string>("projectRoot", ""));
  const harnessRoot = resolveHarnessRoot(
    cfg.get<string>("harnessRoot", ""),
    projectRoot
  );

  return {
    projectRoot,
    harnessRoot,
    harnessSourceDir: path.join(harnessRoot, ".harness"),
    syncScriptPath: resolveSyncScriptPath(context, projectRoot, harnessRoot),
    scope: cfg.get<"project" | "user">("scope", "project"),
    targets: {
      cursor: cfg.get<boolean>("targets.cursor", true),
      claude: cfg.get<boolean>("targets.claude", true),
      codex: cfg.get<boolean>("targets.codex", true),
    },
  };
}

export function getEnabledPlatforms(config: HarnessConfig): Platform[] {
  return PLATFORMS.filter((p) => config.targets[p]);
}

export function hasHarnessSource(config: HarnessConfig): boolean {
  if (!config.harnessRoot) {
    return false;
  }
  return fs.existsSync(config.harnessSourceDir);
}

export function harnessSourceIsEmpty(config: HarnessConfig): boolean {
  if (!hasHarnessSource(config)) {
    return true;
  }
  const skillsDir = path.join(config.harnessSourceDir, "skills");
  const agentsDir = path.join(config.harnessSourceDir, "agents");
  const commandsDir = path.join(config.harnessSourceDir, "commands");
  const skills = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir).filter((f) => f.endsWith(".md"))
    : [];
  const agents = fs.existsSync(agentsDir)
    ? fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"))
    : [];
  const commands = fs.existsSync(commandsDir)
    ? fs.readdirSync(commandsDir).filter((f) => f.endsWith(".md"))
    : [];
  return skills.length === 0 && agents.length === 0 && commands.length === 0 &&
    !fs.existsSync(path.join(config.harnessSourceDir, "AGENTS.md"));
}

export async function setTargetEnabled(
  platform: Platform,
  enabled: boolean
): Promise<void> {
  const cfg = vscode.workspace.getConfiguration("agentsync");
  await cfg.update(
    `targets.${platform}`,
    enabled,
    vscode.ConfigurationTarget.Workspace
  );
}

export async function initProjectHarness(projectRoot: string): Promise<void> {
  const harnessDir = path.join(projectRoot, ".harness");
  fs.mkdirSync(path.join(harnessDir, "skills"), { recursive: true });
  fs.mkdirSync(path.join(harnessDir, "agents"), { recursive: true });
  fs.mkdirSync(path.join(harnessDir, "commands"), { recursive: true });

  const readmePath = path.join(harnessDir, "README.md");
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(
      readmePath,
      `# AgentSync

Define project-specific skills, agents, commands, and root instructions here.

- \`AGENTS.md\` — root agent instructions (synced to AGENTS.md / CLAUDE.md)
- \`skills/*.md\` — agent skills
- \`agents/*.md\` — subagents
- \`commands/*.md\` — slash commands (/name)

Run **AgentSync: Sync Skills & Agents** to install into Cursor, Claude Code, and Codex.
`,
      "utf8"
    );
  }

  const agentsMdPath = path.join(harnessDir, "AGENTS.md");
  if (!fs.existsSync(agentsMdPath)) {
    fs.writeFileSync(
      agentsMdPath,
      `# Project Agent Instructions

Persistent instructions for AI agents working in this repository.

## Conventions

- 

## Verification

- 
`,
      "utf8"
    );
  }
}

function resolveProjectRoot(override: string): string {
  if (override.trim()) {
    return path.resolve(override);
  }
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return "";
  }
  return folder.uri.fsPath;
}

function resolveHarnessRoot(override: string, projectRoot: string): string {
  if (override.trim()) {
    return path.resolve(override);
  }
  return projectRoot;
}

function resolveSyncScriptPath(
  context: vscode.ExtensionContext,
  projectRoot: string,
  harnessRoot: string
): string {
  const candidates = [
    path.join(context.extensionPath, "scripts", "sync.sh"),
    path.join(context.extensionPath, "bundled", "script", "sync.sh"),
    path.join(harnessRoot, "script", "sync.sh"),
    path.join(projectRoot, "script", "sync.sh"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(context.extensionPath, "scripts", "sync.sh");
}

export function onConfigChange(
  listener: () => void
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("agentsync")) {
      listener();
    }
  });
}
