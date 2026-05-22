import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as vscode from "vscode";
import type { HarnessConfig, Platform } from "./types";
import {
  getEnabledPlatforms,
  hasHarnessSource,
  harnessSourceIsEmpty,
} from "./config";

const execFileAsync = promisify(execFile);

function validateSyncPreconditions(config: HarnessConfig): void {
  if (!config.projectRoot) {
    throw new Error("워크스페이스 폴더를 열어 주세요.");
  }

  if (!hasHarnessSource(config)) {
    throw new Error(
      "프로젝트에 .harness/ 폴더가 없습니다. Harness Sync: Init .harness in Project를 실행하세요."
    );
  }

  if (harnessSourceIsEmpty(config)) {
    throw new Error(
      ".harness/skills, .harness/agents, .harness/commands, 또는 .harness/AGENTS.md를 추가하세요."
    );
  }

  if (!fs.existsSync(config.syncScriptPath)) {
    throw new Error(`sync.sh를 찾을 수 없습니다: ${config.syncScriptPath}`);
  }
}

async function executeSync(
  config: HarnessConfig,
  targets: Platform[]
): Promise<void> {
  const projectRoot = config.projectRoot;
  const title =
    targets.length === 1 ? `Harness Sync (${targets[0]})` : "Harness Sync";

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false,
    },
    async () => {
      for (const target of targets) {
        await execFileAsync("bash", buildArgs(config, target, projectRoot), {
          cwd: config.harnessRoot,
        });
      }
    }
  );
}

export async function runHarnessSync(
  config: HarnessConfig
): Promise<void> {
  validateSyncPreconditions(config);

  const targets = getEnabledPlatforms(config);
  if (targets.length === 0) {
    throw new Error("설정에서 최소 하나의 AI 플랫폼을 켜 주세요.");
  }

  await executeSync(config, targets);
}

export async function runHarnessSyncForTarget(
  config: HarnessConfig,
  target: Platform
): Promise<void> {
  validateSyncPreconditions(config);
  await executeSync(config, [target]);
}

function buildArgs(
  config: HarnessConfig,
  target: Platform,
  projectRoot: string
): string[] {
  return [
    config.syncScriptPath,
    "--harness",
    config.harnessRoot,
    "--project",
    projectRoot,
    "--scope",
    config.scope,
    "--target",
    target,
  ];
}
