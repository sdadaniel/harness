# HSync

`.harness/`에 정의한 skills, agents, commands, root instructions를 Cursor, Claude Code, Codex에 sync하는 VS Code/Cursor extension입니다.

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

Settings → **HSync** (`hSync.*`)

| Setting | Default | Description |
|---------|---------|-------------|
| `hSync.projectRoot` | workspace folder | sync 대상 프로젝트 루트 |
| `hSync.harnessRoot` | same as project | `.harness/`가 있는 루트 (비우면 project root) |
| `hSync.scope` | `project` | `project` = 프로젝트 폴더, `user` = 홈 디렉터리 |
| `hSync.targets.cursor` | `true` | Cursor sync 포함 여부 |
| `hSync.targets.claude` | `true` | Claude Code sync 포함 여부 |
| `hSync.targets.codex` | `true` | Codex sync 포함 여부 |

## Commands

| Command | Description |
|---------|-------------|
| **HSync: Open Settings Tab** | Settings UI 열기 |
| **HSync: Init .harness in Project** | `.harness/` 생성 |
| **HSync: Sync Skills & Agents** | ON인 플랫폼 전체 sync |
| **HSync: Open Documentation** | 이 문서 열기 |

Settings UI에서 **Docs** 버튼으로도 이 문서를 열 수 있습니다.
