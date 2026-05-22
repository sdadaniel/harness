import * as vscode from "vscode";
import type { HarnessConfig, HarnessItem, Kind, Platform } from "./types";
import {
  getHarnessConfiguration,
  getEnabledPlatforms,
  hasHarnessSource,
} from "./config";
import { readAllRegistrations, readHarnessSource } from "./discovery";
import { PLATFORM_LABELS, ROOT_DOCUMENT_TARGET_LABELS } from "./paths";

type TreeNode =
  | { type: "source-root" }
  | { type: "source-kind"; kind: Kind }
  | { type: "source-root-doc" }
  | { type: "source-item"; item: HarnessItem }
  | { type: "platform"; platform: Platform }
  | { type: "platform-kind"; platform: Platform; kind: Kind }
  | { type: "platform-root-doc"; platform: Platform }
  | { type: "platform-item"; item: HarnessItem };

const KIND_LABELS: Record<Kind, string> = {
  skills: "Skills",
  agents: "Agents",
  commands: "Commands",
};

const KIND_ICONS: Record<Kind, string> = {
  skills: "book",
  agents: "person",
  commands: "terminal",
};

const SOURCE_KINDS: Kind[] = ["skills", "agents", "commands"];

function sourceItems(source: ReturnType<typeof readHarnessSource>, kind: Kind) {
  return source[kind];
}

function installedItems(
  regs: ReturnType<typeof readAllRegistrations>[number],
  kind: Kind
) {
  return regs[kind];
}

export class RegistrationsTreeProvider
  implements vscode.TreeDataProvider<TreeNode>
{
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChange.fire();
  }

  private config(): HarnessConfig {
    return getHarnessConfiguration(this.context);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    switch (element.type) {
      case "source-root": {
        const source = readHarnessSource(this.config());
        const item = new vscode.TreeItem(
          "Project source111 (.harness)",
          hasHarnessSource(this.config())
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None
        );
        item.description = hasHarnessSource(this.config())
          ? `${source.skills.length} skills · ${source.agents.length} agents · ${source.commands.length} commands${source.rootDocument ? " · AGENTS.md" : ""}`
          : "missing";
        item.iconPath = new vscode.ThemeIcon("folder-library");
        if (!hasHarnessSource(this.config())) {
          item.command = {
            command: "harnessSync.initProject",
            title: "Init .harness",
          };
        }
        return item;
      }
      case "source-kind": {
        const source = readHarnessSource(this.config());
        const count = sourceItems(source, element.kind).length;
        const treeItem = new vscode.TreeItem(
          KIND_LABELS[element.kind],
          count > 0
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None
        );
        treeItem.description = String(count);
        treeItem.iconPath = new vscode.ThemeIcon(KIND_ICONS[element.kind]);
        return treeItem;
      }
      case "source-root-doc": {
        const source = readHarnessSource(this.config());
        const item = new vscode.TreeItem(
          "AGENTS.md",
          vscode.TreeItemCollapsibleState.None
        );
        item.description = source.rootDocument ? "defined" : "missing";
        if (source.rootDocument) {
          item.command = {
            command: "harnessSync.openItem",
            title: "Open",
            arguments: [source.rootDocument.filePath],
          };
        }
        item.iconPath = new vscode.ThemeIcon("book");
        return item;
      }
      case "source-item": {
        const item = new vscode.TreeItem(
          element.item.name,
          vscode.TreeItemCollapsibleState.None
        );
        item.description = truncate(element.item.description);
        item.tooltip = element.item.description ?? element.item.filePath;
        item.command = {
          command: "harnessSync.openItem",
          title: "Open",
          arguments: [element.item.filePath],
        };
        item.iconPath = new vscode.ThemeIcon("file");
        return item;
      }
      case "platform": {
        const config = this.config();
        const enabled = config.targets[element.platform];
        const regs = readAllRegistrations(config, [element.platform])[0];
        const item = new vscode.TreeItem(
          PLATFORM_LABELS[element.platform],
          enabled
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None
        );
        if (!enabled) {
          item.description = "disabled";
          item.iconPath = new vscode.ThemeIcon("circle-slash");
        } else if (!config.projectRoot) {
          item.description = "no workspace";
          item.iconPath = new vscode.ThemeIcon("warning");
        } else {
          item.description = `${regs.skills.length} skills · ${regs.agents.length} agents · ${regs.commands.length} commands${regs.rootDocument ? ` · ${regs.rootDocument.name}` : ""}`;
          item.iconPath = new vscode.ThemeIcon("server-environment");
        }
        return item;
      }
      case "platform-kind": {
        const regs = readAllRegistrations(this.config(), [
          element.platform,
        ])[0];
        const count = installedItems(regs, element.kind).length;
        const item = new vscode.TreeItem(
          KIND_LABELS[element.kind],
          count > 0
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None
        );
        item.description =
          count === 0 ? "none installed" : String(count);
        item.iconPath = new vscode.ThemeIcon(KIND_ICONS[element.kind]);
        return item;
      }
      case "platform-root-doc": {
        const regs = readAllRegistrations(this.config(), [
          element.platform,
        ])[0];
        const target = ROOT_DOCUMENT_TARGET_LABELS[element.platform];
        const item = new vscode.TreeItem(
          `Root document (${target})`,
          vscode.TreeItemCollapsibleState.None
        );
        if (regs.rootDocument) {
          item.description = "installed";
          item.command = {
            command: "harnessSync.openItem",
            title: "Open",
            arguments: [regs.rootDocument.filePath],
          };
          item.iconPath = new vscode.ThemeIcon(
            regs.rootDocument.linked ? "link" : "file"
          );
        } else {
          item.description = "not installed";
          item.iconPath = new vscode.ThemeIcon("circle-outline");
        }
        return item;
      }
      case "platform-item": {
        const item = new vscode.TreeItem(
          element.item.name,
          vscode.TreeItemCollapsibleState.None
        );
        item.description = truncate(element.item.description);
        item.tooltip = [
          element.item.description,
          element.item.filePath,
          element.item.linked ? "(symlink)" : undefined,
        ]
          .filter(Boolean)
          .join("\n");
        item.command = {
          command: "harnessSync.openItem",
          title: "Open",
          arguments: [element.item.filePath],
        };
        item.iconPath = new vscode.ThemeIcon(
          element.item.linked ? "link" : "file"
        );
        return item;
      }
    }
  }

  getChildren(element?: TreeNode): TreeNode[] {
    const config = this.config();

    if (!element) {
      const nodes: TreeNode[] = [];
      for (const platform of getEnabledPlatforms(config)) {
        nodes.push({ type: "platform", platform });
      }
      const disabled: Platform[] = (
        ["cursor", "claude", "codex"] as Platform[]
      ).filter((p) => !config.targets[p]);
      for (const platform of disabled) {
        nodes.push({ type: "platform", platform });
      }
      nodes.push({ type: "source-root" });
      return nodes;
    }

    switch (element.type) {
      case "source-root":
        if (!hasHarnessSource(config)) {
          return [];
        }
        return [
          ...SOURCE_KINDS.map((kind) => ({ type: "source-kind" as const, kind })),
          { type: "source-root-doc" as const },
        ];
      case "source-kind": {
        const source = readHarnessSource(config);
        return sourceItems(source, element.kind).map((item) => ({
          type: "source-item" as const,
          item,
        }));
      }
      case "platform":
        if (!config.targets[element.platform] || !config.projectRoot) {
          return [];
        }
        return [
          ...SOURCE_KINDS.map((kind) => ({
            type: "platform-kind" as const,
            platform: element.platform,
            kind,
          })),
          { type: "platform-root-doc" as const, platform: element.platform },
        ];
      case "platform-kind": {
        const regs = readAllRegistrations(config, [element.platform])[0];
        return installedItems(regs, element.kind).map((item) => ({
          type: "platform-item" as const,
          item,
        }));
      }
      default:
        return [];
    }
  }
}

function truncate(text?: string, max = 48): string | undefined {
  if (!text) {
    return undefined;
  }
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
