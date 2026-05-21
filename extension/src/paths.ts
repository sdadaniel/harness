import * as os from "os";
import * as path from "path";
import type { HarnessConfig, Kind, Platform } from "./types";

export function installDir(
  platform: Platform,
  kind: Kind,
  config: HarnessConfig
): string {
  const base =
    config.scope === "user" ? os.homedir() : config.projectRoot;

  if (config.scope === "user") {
    switch (`${platform}:${kind}`) {
      case "cursor:skills":
        return path.join(base, ".cursor", "skills");
      case "claude:skills":
        return path.join(base, ".claude", "skills");
      case "codex:skills":
        return path.join(base, ".agents", "skills");
      case "cursor:agents":
        return path.join(base, ".cursor", "agents");
      case "claude:agents":
        return path.join(base, ".claude", "agents");
      case "codex:agents":
        return path.join(base, ".codex", "agents");
      case "cursor:commands":
        return path.join(base, ".cursor", "commands");
      case "claude:commands":
        return path.join(base, ".claude", "commands");
      case "codex:commands":
        return path.join(base, ".codex", "prompts");
    }
  }

  switch (`${platform}:${kind}`) {
    case "cursor:skills":
      return path.join(base, ".cursor", "skills");
    case "claude:skills":
      return path.join(base, ".claude", "skills");
    case "codex:skills":
      return path.join(base, ".agents", "skills");
    case "cursor:agents":
      return path.join(base, ".cursor", "agents");
    case "claude:agents":
      return path.join(base, ".claude", "agents");
    case "codex:agents":
      return path.join(base, ".codex", "agents");
    case "cursor:commands":
      return path.join(base, ".cursor", "commands");
    case "claude:commands":
      return path.join(base, ".claude", "commands");
    case "codex:commands":
      return path.join(base, ".codex", "prompts");
    default:
      return base;
  }
}

export function harnessSourceDir(
  config: HarnessConfig,
  kind: Kind
): string {
  return path.join(config.harnessSourceDir, kind);
}

export function harnessRootDocumentSourcePath(config: HarnessConfig): string {
  return path.join(config.harnessSourceDir, "AGENTS.md");
}

export function rootDocumentInstallPath(
  platform: Platform,
  config: HarnessConfig
): string {
  const fileName = platform === "claude" ? "CLAUDE.md" : "AGENTS.md";
  return path.join(config.projectRoot, fileName);
}

export const ROOT_DOCUMENT_TARGET_LABELS: Record<Platform, string> = {
  cursor: "AGENTS.md",
  claude: "CLAUDE.md",
  codex: "AGENTS.md",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  cursor: "Cursor",
  claude: "Claude Code",
  codex: "Codex",
};
