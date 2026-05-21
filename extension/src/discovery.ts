import * as fs from "fs";
import * as path from "path";
import type {
  HarnessConfig,
  HarnessItem,
  HarnessSource,
  Kind,
  Platform,
  PlatformRegistrations,
} from "./types";
import { harnessSourceDir, installDir, rootDocumentInstallPath } from "./paths";

export function readHarnessSource(config: HarnessConfig): HarnessSource {
  return {
    skills: listSourceItems(config, "skills"),
    agents: listSourceItems(config, "agents"),
    commands: listSourceItems(config, "commands"),
    rootDocument: readHarnessRootDocument(config),
  };
}

export function readAllRegistrations(
  config: HarnessConfig,
  platforms: Platform[]
): PlatformRegistrations[] {
  return platforms.map((platform) => ({
    platform,
    skills: listInstalledSkills(platform, config),
    agents: listInstalledAgents(platform, config),
    commands: listInstalledCommands(platform, config),
    rootDocument: readInstalledRootDocument(platform, config),
  }));
}

function readHarnessRootDocument(config: HarnessConfig): HarnessItem | null {
  const filePath = path.join(config.harnessSourceDir, "AGENTS.md");
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return {
    name: "AGENTS.md",
    description: "Root agent instructions (source)",
    filePath,
  };
}

function readInstalledRootDocument(
  platform: Platform,
  config: HarnessConfig
): HarnessItem | null {
  if (!config.projectRoot) {
    return null;
  }
  const filePath = rootDocumentInstallPath(platform, config);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const fileName = path.basename(filePath);
  return {
    name: fileName,
    description: "Root agent instructions",
    filePath,
    linked: isSymlink(filePath),
  };
}

function listSourceItems(config: HarnessConfig, kind: Kind): HarnessItem[] {
  const dir = harnessSourceDir(config, kind);
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const filePath = path.join(dir, file);
      const meta = parseFrontmatter(fs.readFileSync(filePath, "utf8"));
      return {
        name: meta.name ?? path.basename(file, ".md"),
        description: meta.description,
        filePath,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function listInstalledSkills(
  platform: Platform,
  config: HarnessConfig
): HarnessItem[] {
  const root = installDir(platform, "skills", config);
  if (!fs.existsSync(root)) {
    return [];
  }

  const items: HarnessItem[] = [];
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    if (!e.isDirectory()) {
      continue;
    }
    const skillFile = path.join(root, e.name, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      continue;
    }
    const meta = parseFrontmatter(fs.readFileSync(skillFile, "utf8"));
    items.push({
      name: e.name,
      description: meta.description,
      filePath: skillFile,
      linked: isSymlink(skillFile),
    });
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

function listInstalledAgents(
  platform: Platform,
  config: HarnessConfig
): HarnessItem[] {
  const root = installDir(platform, "agents", config);
  if (!fs.existsSync(root)) {
    return [];
  }

  const ext = platform === "codex" ? ".toml" : ".md";

  return fs
    .readdirSync(root)
    .filter((f) => f.endsWith(ext))
    .map((file) => {
      const filePath = path.join(root, file);
      const content = fs.readFileSync(filePath, "utf8");
      const meta =
        platform === "codex"
          ? parseTomlFields(content)
          : parseFrontmatter(content);
      return {
        name: meta.name ?? path.basename(file, ext),
        description: meta.description,
        filePath,
        linked: platform !== "codex" && isSymlink(filePath),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function listInstalledCommands(
  platform: Platform,
  config: HarnessConfig
): HarnessItem[] {
  const root = installDir(platform, "commands", config);
  if (!fs.existsSync(root)) {
    return [];
  }

  return fs
    .readdirSync(root)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const filePath = path.join(root, file);
      const meta = parseFrontmatter(fs.readFileSync(filePath, "utf8"));
      return {
        name: meta.name ?? path.basename(file, ".md"),
        description: meta.description,
        filePath,
        linked: isSymlink(filePath),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseFrontmatter(content: string): {
  name?: string;
  description?: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  const block = match[1];
  const name = block.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = block.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  return { name, description };
}

function parseTomlFields(content: string): {
  name?: string;
  description?: string;
} {
  const name = content.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
  const description = content.match(/^description\s*=\s*"([^"]+)"/m)?.[1];
  return { name, description };
}

function isSymlink(filePath: string): boolean {
  try {
    return fs.lstatSync(filePath).isSymbolicLink();
  } catch {
    return false;
  }
}
