# Harness Sync

`.harness/`에 정의한 skills, agents, commands, root instructions를 Cursor, Claude Code, Codex에 sync하는 도구입니다.

Extension 문서는 [`extension/README.md`](extension/README.md)에 포함되어 있으며, 설치된 extension에서는 **Harness Sync → Docs** 또는 Command Palette **Harness Sync: Open Documentation**으로 볼 수 있습니다.

## Project layout

```
.harness/
├── AGENTS.md       # root agent instructions
├── skills/*.md     # agent skills
├── agents/*.md     # subagents
└── commands/*.md   # slash commands
```

**Init**으로 위 구조의 빈 폴더와 템플릿을 생성할 수 있습니다.

## Sync

- **Sync all** — 켜져 있는(ON) 플랫폼 전체에 `.harness/` 내용을 복사합니다.
- **Sync** (플랫폼별) — 해당 플랫폼만 sync합니다.

`.harness/`를 수정한 뒤에는 다시 sync해야 각 플랫폼 경로의 파일이 갱신됩니다.

### Install locations (project scope)

| Kind | Cursor | Claude Code | Codex |
|------|--------|-------------|-------|
| Root | `AGENTS.md` | `CLAUDE.md` | `AGENTS.md` |
| Skills | `.cursor/skills/` | `.claude/skills/` | `.agents/skills/` |
| Agents | `.cursor/agents/` | `.claude/agents/` | `.codex/agents/` |
| Commands | `.cursor/commands/` | `.claude/commands/` | `.codex/prompts/` |

## VS Code settings

Settings → **Harness Sync** (`harnessSync.*`)

| Setting | Default | Description |
|---------|---------|-------------|
| `harnessSync.projectRoot` | workspace folder | sync 대상 프로젝트 루트 |
| `harnessSync.harnessRoot` | same as project | `.harness/`가 있는 루트 (비우면 project root) |
| `harnessSync.scope` | `project` | `project` = 프로젝트 폴더, `user` = 홈 디렉터리 |
| `harnessSync.targets.cursor` | `true` | Cursor sync 포함 여부 |
| `harnessSync.targets.claude` | `true` | Claude Code sync 포함 여부 |
| `harnessSync.targets.codex` | `true` | Codex sync 포함 여부 |
