import * as vscode from "vscode";
import type { Kind, RemovableKind, Platform, PlatformRegistrations } from "./types";
import {
  getHarnessConfiguration,
  hasHarnessSource,
  onConfigChange,
  setTargetEnabled,
} from "./config";
import { readAllRegistrations, readHarnessSource } from "./discovery";
import { PLATFORM_LABELS, ROOT_DOCUMENT_TARGET_LABELS } from "./paths";
import { removeInstalledItem } from "./remove";

function getNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 16; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function renderSettingsHtml(webview: vscode.Webview): string {
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <style>
    :root {
      --gap: 10px;
      --pad: 14px;
      --radius: 8px;
    }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: var(--pad);
      margin: 0;
      box-sizing: border-box;
    }
    h2 {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--vscode-descriptionForeground);
      margin: 0 0 var(--gap);
    }
    h2.section-gap { margin-top: 20px; }
    .notice {
      padding: 10px 12px;
      margin-bottom: 12px;
      border-radius: var(--radius);
      background: var(--vscode-inputValidation-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      font-size: 12px;
      line-height: 1.5;
    }
    .card {
      margin-bottom: 12px;
      padding: 10px 12px;
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: var(--radius);
      background: var(--vscode-sideBar-background);
    }
    .card.disabled { opacity: 0.55; }
    .platform-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-widget-border, transparent);
    }
    .section-row {
      display: grid;
      grid-template-columns: minmax(72px, 28%) 1fr;
      gap: 8px 14px;
      align-items: start;
      padding: 8px 0;
      border-top: 1px solid var(--vscode-widget-border, transparent);
    }
    .section-row:first-child {
      border-top: none;
      padding-top: 0;
    }
    .section-label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--vscode-descriptionForeground);
      margin: 2px 0 0;
      line-height: 1.4;
    }
    .section-content {
      min-width: 0;
    }
    .empty {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }
    .item-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 7px 0;
      border-top: 1px solid var(--vscode-widget-border, transparent);
    }
    .item-row:first-of-type { border-top: none; padding-top: 0; }
    .item-body { flex: 1; min-width: 0; }
    .item-name {
      display: block;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.4;
    }
    .item-desc {
      display: block;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.45;
      margin-top: 2px;
    }
    .platform-info strong { display: block; font-size: 13px; }
    .platform-info span {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .platform-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
      margin: 0;
    }
    .switch .slider {
      position: absolute;
      inset: 0;
      cursor: pointer;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: 10px;
      transition: background 0.15s ease;
    }
    .switch .slider::before {
      content: "";
      position: absolute;
      height: 14px;
      width: 14px;
      left: 2px;
      top: 2px;
      background: var(--vscode-foreground);
      opacity: 0.55;
      border-radius: 50%;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }
    .switch input:checked + .slider {
      background: var(--vscode-button-background);
      border-color: transparent;
    }
    .switch input:checked + .slider::before {
      transform: translateX(16px);
      background: var(--vscode-button-foreground);
      opacity: 1;
    }
    .switch input:focus-visible + .slider {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 1px;
    }
    button.sync-target {
      min-width: 52px;
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: var(--gap);
    }
    .section-header h2 {
      margin: 0;
    }
    .toolbar {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 8px;
      flex-shrink: 0;
    }
    button.action {
      width: auto;
      padding: 8px 12px;
      border: none;
      border-radius: var(--radius);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
    }
    button.action.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.delete {
      flex-shrink: 0;
      padding: 4px 8px;
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: 4px;
      background: transparent;
      color: var(--vscode-errorForeground);
      cursor: pointer;
      font-size: 11px;
    }
    button.delete:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="section-header">
    <h2>Project source (.harness)</h2>
    <div class="toolbar">
      <button class="action" id="sync">Sync all</button>
      <button class="action secondary" id="init">Init</button>
      <button class="action secondary" id="docs">Docs</button>
    </div>
  </div>

  <div id="notice" hidden class="notice"></div>

  <div id="source"></div>

  <h2 class="section-gap">Sync targets</h2>
  <div id="platforms"></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const platforms = [
      { id: 'cursor', label: 'Cursor', hint: 'AGENTS.md · .cursor/skills · agents · commands' },
      { id: 'claude', label: 'Claude Code', hint: 'CLAUDE.md · .claude/skills · agents · commands' },
      { id: 'codex', label: 'Codex', hint: 'AGENTS.md · .agents/skills · .codex/agents · prompts' },
    ];

    function renderSource(source, state) {
      const root = document.getElementById('source');
      root.innerHTML = '';

      if (!state.hasHarnessSource) {
        root.innerHTML = '<div class="card"><div class="empty">No .harness/ folder yet.</div></div>';
        return;
      }

      const card = document.createElement('div');
      card.className = 'card';
      card.appendChild(renderRootSection('Root document (source)', source.rootDocument, null));
      card.appendChild(renderItemSection('Skills', source.skills, null));
      card.appendChild(renderItemSection('Agents', source.agents, null));
      card.appendChild(renderItemSection('Commands', source.commands, null));
      root.appendChild(card);
    }

    function renderSectionRow(label, buildContent) {
      const row = document.createElement('div');
      row.className = 'section-row';

      const heading = document.createElement('strong');
      heading.className = 'section-label';
      heading.textContent = label;

      const content = document.createElement('div');
      content.className = 'section-content';
      buildContent(content);

      row.appendChild(heading);
      row.appendChild(content);
      return row;
    }

    function renderRootSection(title, item, platform) {
      return renderSectionRow(title, (content) => {
        if (!item) {
          const empty = document.createElement('div');
          empty.className = 'empty';
          empty.textContent = 'none — add .harness/AGENTS.md';
          content.appendChild(empty);
          return;
        }

        content.appendChild(renderItemRow(item, platform, 'root'));
      });
    }

    function renderPlatforms(registrations, targets) {
      const root = document.getElementById('platforms');
      root.innerHTML = '';

      for (const p of platforms) {
        const on = targets[p.id];
        const reg = registrations.find((r) => r.platform === p.id);
        const block = document.createElement('div');
        block.className = 'card' + (on ? '' : ' disabled');

        const header = document.createElement('div');
        header.className = 'platform-header';

        const info = document.createElement('div');
        info.className = 'platform-info';
        info.innerHTML = \`
          <strong>\${p.label}</strong>
          <span>\${p.hint}</span>
        \`;

        const actions = document.createElement('div');
        actions.className = 'platform-actions';

        const syncBtn = document.createElement('button');
        syncBtn.className = 'sync-target';
        syncBtn.textContent = 'Sync';
        syncBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'syncTarget', platform: p.id });
        });

        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'switch';
        toggleLabel.title = on ? 'Enabled' : 'Disabled';

        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = on;
        toggleInput.setAttribute('aria-label', \`\${p.label} sync target\`);
        toggleInput.addEventListener('change', () => {
          vscode.postMessage({
            type: 'toggle',
            platform: p.id,
            enabled: toggleInput.checked,
          });
        });

        const slider = document.createElement('span');
        slider.className = 'slider';

        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(slider);

        actions.appendChild(syncBtn);
        actions.appendChild(toggleLabel);
        header.appendChild(info);
        header.appendChild(actions);
        block.appendChild(header);

        if (reg) {
          block.appendChild(renderRootSection(\`Root document (\${reg.rootTarget})\`, reg.rootDocument, reg.platform));
          block.appendChild(renderItemSection('Skills', reg.skills, reg.platform));
          block.appendChild(renderItemSection('Agents', reg.agents, reg.platform));
          block.appendChild(renderItemSection('Commands', reg.commands, reg.platform));
        }

        root.appendChild(block);
      }
    }

    function renderItemSection(label, items, platform) {
      return renderSectionRow(label, (content) => {
        if (!items.length) {
          const empty = document.createElement('div');
          empty.className = 'empty';
          empty.textContent = 'none';
          content.appendChild(empty);
          return;
        }

        for (const item of items) {
          content.appendChild(renderItemRow(item, platform, label.toLowerCase()));
        }
      });
    }

    function renderItemRow(item, platform, kind) {
      const row = document.createElement('div');
      row.className = 'item-row';

      const body = document.createElement('div');
      body.className = 'item-body';
      body.innerHTML = \`
        <span class="item-name">\${item.name}</span>
        \${item.description ? \`<span class="item-desc">\${item.description}</span>\` : ''}
      \`;
      row.appendChild(body);

      if (platform) {
        const del = document.createElement('button');
        del.className = 'delete';
        del.textContent = 'Delete';
        del.addEventListener('click', () => {
          vscode.postMessage({
            type: 'delete',
            platform,
            kind,
            name: item.name,
            filePath: item.filePath,
          });
        });
        row.appendChild(del);
      }

      return row;
    }

    function renderNotice(state) {
      const notice = document.getElementById('notice');
      if (!state.hasHarnessSource) {
        notice.hidden = false;
        notice.textContent =
          'This project has no .harness/ folder yet. Click Init or add skills/agents under .harness/.';
        return;
      }
      if (state.sourceEmpty) {
        notice.hidden = false;
        notice.textContent =
          '.harness/ exists but has no definitions yet. Add AGENTS.md or .md files under skills/, agents/, or commands/.';
        return;
      }
      notice.hidden = true;
    }

    window.addEventListener('message', (e) => {
      if (e.data.type === 'state') {
        renderNotice(e.data);
        renderSource(e.data.source, e.data);
        renderPlatforms(e.data.registrations, e.data.targets);
      }
    });

    document.getElementById('sync').addEventListener('click', () => {
      vscode.postMessage({ type: 'sync' });
    });
    document.getElementById('init').addEventListener('click', () => {
      vscode.postMessage({ type: 'init' });
    });
    document.getElementById('docs').addEventListener('click', () => {
      vscode.postMessage({ type: 'openDocs' });
    });
  </script>
</body>
</html>`;
}

function mapItems(items: { name: string; description?: string; filePath: string }[]) {
  return items.map((item) => ({
    name: item.name,
    description: item.description,
    filePath: item.filePath,
  }));
}

function mapRootDocument(
  item: { name: string; description?: string; filePath: string } | null
) {
  if (!item) {
    return null;
  }
  return {
    name: item.name,
    description: item.description,
    filePath: item.filePath,
  };
}

function postSettingsState(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
): void {
  const config = getHarnessConfiguration(context);
  const source = readHarnessSource(config);
  const registrations: PlatformRegistrations[] = readAllRegistrations(
    config,
    (["cursor", "claude", "codex"] as Platform[])
  );

  webview.postMessage({
    type: "state",
    targets: config.targets,
    hasHarnessSource: hasHarnessSource(config),
    sourceEmpty:
      source.skills.length === 0 &&
      source.agents.length === 0 &&
      source.commands.length === 0 &&
      !source.rootDocument,
    source: {
      skills: mapItems(source.skills),
      agents: mapItems(source.agents),
      commands: mapItems(source.commands),
      rootDocument: mapRootDocument(source.rootDocument),
    },
    registrations: registrations.map((reg) => ({
      platform: reg.platform,
      rootTarget: ROOT_DOCUMENT_TARGET_LABELS[reg.platform],
      skills: mapItems(reg.skills),
      agents: mapItems(reg.agents),
      commands: mapItems(reg.commands),
      rootDocument: mapRootDocument(reg.rootDocument),
    })),
  });
}

function bindSettingsWebview(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  onRefresh?: () => void
): void {
  webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === "toggle" && typeof msg.platform === "string") {
      await setTargetEnabled(msg.platform as Platform, Boolean(msg.enabled));
      postSettingsState(webview, context);
      onRefresh?.();
    }
    if (msg.type === "sync") {
      await vscode.commands.executeCommand("harnessSync.sync");
      postSettingsState(webview, context);
      onRefresh?.();
    }
    if (msg.type === "syncTarget" && typeof msg.platform === "string") {
      await vscode.commands.executeCommand(
        "harnessSync.syncTarget",
        msg.platform
      );
      postSettingsState(webview, context);
      onRefresh?.();
    }
    if (msg.type === "init") {
      await vscode.commands.executeCommand("harnessSync.initProject");
      postSettingsState(webview, context);
      onRefresh?.();
    }
    if (msg.type === "openDocs") {
      await openHarnessDocs(context);
    }
    if (msg.type === "delete") {
      const platform = msg.platform as Platform;
      const kind = msg.kind as RemovableKind;
      const name = String(msg.name ?? "");
      const filePath = String(msg.filePath ?? "");
      const label = PLATFORM_LABELS[platform] ?? platform;

      const kindLabel =
        kind === "skills"
          ? "skill"
          : kind === "agents"
            ? "agent"
            : kind === "commands"
              ? "command"
              : "root document";

      const confirmed = await vscode.window.showWarningMessage(
        `${label}에서 "${name}" ${kindLabel}를 삭제할까요?`,
        { modal: true },
        "Delete"
      );
      if (confirmed !== "Delete") {
        return;
      }

      try {
        removeInstalledItem(filePath, kind);
        postSettingsState(webview, context);
        onRefresh?.();
        vscode.window.showInformationMessage(
          `${label}에서 "${name}"을(를) 삭제했습니다.`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Delete failed: ${message}`);
      }
    }
  });
}

export function openHarnessDocs(context: vscode.ExtensionContext): Thenable<void> {
  const readmeUri = vscode.Uri.joinPath(context.extensionUri, "README.md");
  return vscode.commands.executeCommand("markdown.showPreview", readmeUri);
}

let settingsPanel: vscode.WebviewPanel | undefined;

export function openHarnessSettingsPanel(
  context: vscode.ExtensionContext,
  onRefresh?: () => void
): void {
  if (settingsPanel) {
    settingsPanel.reveal(vscode.ViewColumn.One);
    postSettingsState(settingsPanel.webview, context);
    return;
  }

  settingsPanel = vscode.window.createWebviewPanel(
    "harnessSync.settingsPanel",
    "Harness Sync Settings",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [context.extensionUri],
      retainContextWhenHidden: true,
    }
  );

  settingsPanel.webview.html = renderSettingsHtml(settingsPanel.webview);
  bindSettingsWebview(settingsPanel.webview, context, onRefresh);
  postSettingsState(settingsPanel.webview, context);

  settingsPanel.onDidDispose(() => {
    settingsPanel = undefined;
  });
}

export class SettingsWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "harnessSync.settings";

  private view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {
    onConfigChange(() => this.postState()).dispose();
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView
  ): void | Thenable<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    bindSettingsWebview(webviewView.webview, this.context, () =>
      this.refresh()
    );

    webviewView.webview.html = renderSettingsHtml(webviewView.webview);
    this.postState();
  }

  refresh(): void {
    if (this.view) {
      this.view.webview.html = renderSettingsHtml(this.view.webview);
      this.postState();
    }
    if (settingsPanel) {
      postSettingsState(settingsPanel.webview, this.context);
    }
  }

  private postState(): void {
    if (this.view) {
      postSettingsState(this.view.webview, this.context);
    }
  }
}
