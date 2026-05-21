import * as vscode from "vscode";
import { getHarnessConfiguration, onConfigChange, initProjectHarness, hasHarnessSource, harnessSourceIsEmpty } from "./config";
import { RegistrationsTreeProvider } from "./registrationsTree";
import {
  openHarnessSettingsPanel,
  openHarnessDocs,
  SettingsWebviewProvider,
} from "./settingsWebview";
import { runHarnessSync, runHarnessSyncForTarget } from "./sync";
import type { Platform } from "./types";
import { PLATFORM_LABELS } from "./paths";

export function activate(context: vscode.ExtensionContext): void {
  const treeProvider = new RegistrationsTreeProvider(context);
  const settingsProvider = new SettingsWebviewProvider(context);

  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusItem.text = "$(symbol-structure) AgentSync";
  statusItem.tooltip = "Open AgentSync settings";
  statusItem.command = "agentsync.openSettingsTab";
  statusItem.show();

  context.subscriptions.push(
    statusItem,
    vscode.window.registerTreeDataProvider(
      "agentsync.registrations",
      treeProvider
    ),
    vscode.window.registerWebviewViewProvider(
      SettingsWebviewProvider.viewType,
      settingsProvider
    ),
    vscode.commands.registerCommand("agentsync.sync", async () => {
      try {
        const config = getHarnessConfiguration(context);
        await runHarnessSync(config);
        treeProvider.refresh();
        settingsProvider.refresh();
        vscode.window.showInformationMessage(
          "AgentSync completed."
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`AgentSync failed: ${message}`);
      }
    }),
    vscode.commands.registerCommand(
      "agentsync.syncTarget",
      async (platform: Platform) => {
        try {
          const config = getHarnessConfiguration(context);
          await runHarnessSyncForTarget(config, platform);
          treeProvider.refresh();
          settingsProvider.refresh();
          const label = PLATFORM_LABELS[platform] ?? platform;
          vscode.window.showInformationMessage(`${label} sync completed.`);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`AgentSync failed: ${message}`);
        }
      }
    ),
    vscode.commands.registerCommand("agentsync.refresh", () => {
      treeProvider.refresh();
      settingsProvider.refresh();
    }),
    vscode.commands.registerCommand("agentsync.showPanel", async () => {
      await vscode.commands.executeCommand("workbench.view.extension.agentsync");
    }),
    vscode.commands.registerCommand("agentsync.openSettingsTab", () => {
      openHarnessSettingsPanel(context, () => {
        treeProvider.refresh();
        settingsProvider.refresh();
      });
    }),
    vscode.commands.registerCommand("agentsync.openDocs", () => {
      openHarnessDocs(context);
    }),
    vscode.commands.registerCommand("agentsync.initProject", async () => {
      try {
        const config = getHarnessConfiguration(context);
        if (!config.projectRoot) {
          throw new Error("워크스페이스 폴더를 열어 주세요.");
        }

        if (hasHarnessSource(config) && !harnessSourceIsEmpty(config)) {
          const confirmed = await vscode.window.showWarningMessage(
            ".harness/에 기존 정의가 있습니다. Init을 실행하면 기존 데이터가 삭제될 수 있습니다. 계속할까요?",
            { modal: true },
            "Init"
          );
          if (confirmed !== "Init") {
            return;
          }
        }

        await initProjectHarness(config.projectRoot);
        treeProvider.refresh();
        settingsProvider.refresh();
        vscode.window.showInformationMessage(
          ".harness/ 폴더를 생성했습니다. skills/와 agents/에 정의를 추가한 뒤 Sync하세요."
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`AgentSync init failed: ${message}`);
      }
    }),
    vscode.commands.registerCommand("agentsync.openItem", async (filePath: string) => {
      if (!filePath) {
        return;
      }
      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);
    }),
    onConfigChange(() => {
      treeProvider.refresh();
      settingsProvider.refresh();
    })
  );

  treeProvider.refresh();
}

export function deactivate(): void {}
