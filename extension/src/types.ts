export type Platform = "cursor" | "claude" | "codex";
export type Scope = "project" | "user";
export type Kind = "skills" | "agents" | "commands";
export type RemovableKind = Kind | "root";

export interface HarnessConfig {
  projectRoot: string;
  harnessRoot: string;
  harnessSourceDir: string;
  syncScriptPath: string;
  scope: Scope;
  targets: Record<Platform, boolean>;
}

export interface HarnessItem {
  name: string;
  description?: string;
  filePath: string;
  linked?: boolean;
}

export interface PlatformRegistrations {
  platform: Platform;
  skills: HarnessItem[];
  agents: HarnessItem[];
  commands: HarnessItem[];
  rootDocument: HarnessItem | null;
}

export interface HarnessSource {
  skills: HarnessItem[];
  agents: HarnessItem[];
  commands: HarnessItem[];
  rootDocument: HarnessItem | null;
}
