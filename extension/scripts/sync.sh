#!/usr/bin/env bash
# Sync skills, subagents, and commands from .harness/ into Cursor, Claude Code, and Codex.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: sync.sh [options]

Registers harness definitions for Cursor, Claude Code, and Codex.

Sources:
  <harness>/.harness/skills/*.md     → agent skills
  <harness>/.harness/agents/*.md     → subagents
  <harness>/.harness/commands/*.md   → slash commands
  <harness>/.harness/AGENTS.md       → root agent instructions

Options:
  --harness DIR     Project root containing .harness/ (required when run from HSync)
  --project DIR     Project root — install targets (default: same as --harness)
  --scope SCOPE     project | user (default: project)
  --kind KIND       skills | agents | commands | root | all (default: all)
  --target TARGET   cursor | claude | codex | all (default: all)
  --prune           Remove targets not present in .harness/
  --dry-run         Print actions without writing
  -h, --help        Show this help

Install locations (project scope, default):

Skills:
  Cursor:  <project>/.cursor/skills/<name>/SKILL.md
  Claude:  <project>/.claude/skills/<name>/SKILL.md
  Codex:   <project>/.agents/skills/<name>/SKILL.md

Subagents:
  Cursor:  <project>/.cursor/agents/<name>.md
  Claude:  <project>/.claude/agents/<name>.md
  Codex:   <project>/.codex/agents/<name>.toml  (generated from .md)

Commands:
  Cursor:  <project>/.cursor/commands/<name>.md
  Claude:  <project>/.claude/commands/<name>.md
  Codex:   <project>/.codex/prompts/<name>.md

Root document (from .harness/AGENTS.md):
  Cursor:  <project>/AGENTS.md
  Claude:  <project>/CLAUDE.md
  Codex:   <project>/AGENTS.md

User scope (--scope user) uses ~/.cursor, ~/.claude, ~/.agents, ~/.codex instead.
EOF
}

HARNESS_ROOT=""
PROJECT_ROOT=""
SCOPE="project"
KIND="all"
TARGET="all"
PRUNE=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --harness)
      HARNESS_ROOT="${2:?}"
      shift 2
      ;;
    --project)
      PROJECT_ROOT="${2:?}"
      shift 2
      ;;
    --scope)
      SCOPE="${2:?}"
      shift 2
      ;;
    --kind)
      KIND="${2:?}"
      shift 2
      ;;
    --target)
      TARGET="${2:?}"
      shift 2
      ;;
    --prune)
      PRUNE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "$HARNESS_ROOT" ]]; then
  HARNESS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi
if [[ -z "$PROJECT_ROOT" ]]; then
  PROJECT_ROOT="$HARNESS_ROOT"
fi
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"

SKILLS_SRC="${HARNESS_ROOT}/.harness/skills"
AGENTS_SRC="${HARNESS_ROOT}/.harness/agents"
COMMANDS_SRC="${HARNESS_ROOT}/.harness/commands"
ROOT_SRC="${HARNESS_ROOT}/.harness/AGENTS.md"

case "$SCOPE" in
  project | user) ;;
  *)
    echo "Invalid --scope: $SCOPE (use project or user)" >&2
    exit 1
    ;;
esac

case "$KIND" in
  skills | agents | commands | root | all) ;;
  *)
    echo "Invalid --kind: $KIND" >&2
    exit 1
    ;;
esac

case "$TARGET" in
  cursor | claude | codex | all) ;;
  *)
    echo "Invalid --target: $TARGET" >&2
    exit 1
    ;;
esac

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] '
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

should_target() {
  local platform="$1"
  [[ "$TARGET" == "all" || "$TARGET" == "$platform" ]]
}

should_kind() {
  local k="$1"
  [[ "$KIND" == "all" || "$KIND" == "$k" ]]
}

validate_name() {
  local name="$1"
  local file="$2"
  if [[ ! "$name" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]] && [[ ! "$name" =~ ^[a-z0-9]$ ]]; then
    echo "Invalid name '$name' in $file (use lowercase letters, numbers, hyphens)" >&2
    return 1
  fi
}

extract_frontmatter_field() {
  local file="$1"
  local field="$2"
  awk -v field="$field" '
    BEGIN { in_fm=0 }
    /^---$/ {
      if (in_fm) { exit }
      in_fm=1
      next
    }
    in_fm {
      if ($0 ~ "^" field ":[[:space:]]*") {
        sub("^" field ":[[:space:]]*", "")
        gsub(/[[:space:]]+$/, "")
        print
        exit
      }
    }
  ' "$file"
}

extract_name() {
  local file="$1"
  local name
  name="$(extract_frontmatter_field "$file" "name")"
  if [[ -z "$name" ]]; then
    name="$(basename "$file" .md)"
  fi
  validate_name "$name" "$file"
  printf '%s' "$name"
}

install_path() {
  local platform="$1"
  local kind="$2"
  if [[ "$SCOPE" == "user" ]]; then
    case "${platform}:${kind}" in
      cursor:skills) printf '%s' "${HOME}/.cursor/skills" ;;
      claude:skills) printf '%s' "${HOME}/.claude/skills" ;;
      codex:skills) printf '%s' "${HOME}/.agents/skills" ;;
      cursor:agents) printf '%s' "${HOME}/.cursor/agents" ;;
      claude:agents) printf '%s' "${HOME}/.claude/agents" ;;
      codex:agents) printf '%s' "${HOME}/.codex/agents" ;;
      cursor:commands) printf '%s' "${HOME}/.cursor/commands" ;;
      claude:commands) printf '%s' "${HOME}/.claude/commands" ;;
      codex:commands) printf '%s' "${HOME}/.codex/prompts" ;;
    esac
  else
    case "${platform}:${kind}" in
      cursor:skills) printf '%s' "${PROJECT_ROOT}/.cursor/skills" ;;
      claude:skills) printf '%s' "${PROJECT_ROOT}/.claude/skills" ;;
      codex:skills) printf '%s' "${PROJECT_ROOT}/.agents/skills" ;;
      cursor:agents) printf '%s' "${PROJECT_ROOT}/.cursor/agents" ;;
      claude:agents) printf '%s' "${PROJECT_ROOT}/.claude/agents" ;;
      codex:agents) printf '%s' "${PROJECT_ROOT}/.codex/agents" ;;
      cursor:commands) printf '%s' "${PROJECT_ROOT}/.cursor/commands" ;;
      claude:commands) printf '%s' "${PROJECT_ROOT}/.claude/commands" ;;
      codex:commands) printf '%s' "${PROJECT_ROOT}/.codex/prompts" ;;
    esac
  fi
}

install_copy() {
  local src="$1"
  local dest="$2"
  run mkdir -p "$(dirname "$dest")"
  run cp -f "$src" "$dest"
}

install_skill() {
  local platform="$1"
  local name="$2"
  local src="$3"
  local root dest
  root="$(install_path "$platform" "skills")"
  dest="${root}/${name}/SKILL.md"
  install_copy "$src" "$dest"
  echo "  [${platform}] ${dest}"
}

generate_codex_agent_toml() {
  local src="$1"
  local dest="$2"
  local tmp
  tmp="$(mktemp)"
  awk -v src="$src" '
    BEGIN {
      in_fm=0
      fm_done=0
      name=""
      description=""
      model=""
      readonly=""
      sandbox=""
    }
    /^---$/ {
      if (in_fm && !fm_done) {
        fm_done=1
        in_fm=0
        next
      }
      if (!in_fm) {
        in_fm=1
        next
      }
    }
    in_fm && !fm_done {
      if ($0 ~ /^name:[[:space:]]*/) {
        sub(/^name:[[:space:]]*/, "")
        gsub(/[[:space:]]+$/, "")
        name=$0
      } else if ($0 ~ /^description:[[:space:]]*/) {
        sub(/^description:[[:space:]]*/, "")
        gsub(/[[:space:]]+$/, "")
        description=$0
      } else if ($0 ~ /^model:[[:space:]]*/) {
        sub(/^model:[[:space:]]*/, "")
        gsub(/[[:space:]]+$/, "")
        model=$0
      } else if ($0 ~ /^readonly:[[:space:]]*/) {
        sub(/^readonly:[[:space:]]*/, "")
        gsub(/[[:space:]]+$/, "")
        readonly=$0
      } else if ($0 ~ /^sandbox_mode:[[:space:]]*/) {
        sub(/^sandbox_mode:[[:space:]]*/, "")
        gsub(/[[:space:]]+$/, "")
        sandbox=$0
      }
      next
    }
    fm_done {
      body = body $0 "\n"
    }
    END {
      if (name == "") {
        n = src
        sub(/.*\//, "", n)
        sub(/\.md$/, "", n)
        name = n
      }
      if (description == "") {
        print "Missing description in " src > "/dev/stderr"
        exit 1
      }
      if (readonly ~ /^(true|yes|1)$/i && sandbox == "") {
        sandbox = "read-only"
      }
      gsub(/\\/, "\\\\", name)
      gsub(/"/, "\\\"", name)
      gsub(/\\/, "\\\\", description)
      gsub(/"/, "\\\"", description)
      print "name = \"" name "\""
      print "description = \"" description "\""
      if (model != "" && tolower(model) != "inherit") {
        gsub(/\\/, "\\\\", model)
        gsub(/"/, "\\\"", model)
        print "model = \"" model "\""
      }
      if (sandbox != "") {
        gsub(/\\/, "\\\\", sandbox)
        gsub(/"/, "\\\"", sandbox)
        print "sandbox_mode = \"" sandbox "\""
      }
      print "developer_instructions = \"\"\""
      printf "%s", body
      if (body !~ /\n$/) print ""
      print "\"\"\""
    }
  ' "$src" >"$tmp"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] generate ${dest} from ${src}"
    rm -f "$tmp"
  else
    run mkdir -p "$(dirname "$dest")"
    run mv "$tmp" "$dest"
  fi
}

install_agent() {
  local platform="$1"
  local name="$2"
  local src="$3"
  local root dest
  root="$(install_path "$platform" "agents")"
  if [[ "$platform" == "codex" ]]; then
    dest="${root}/${name}.toml"
    generate_codex_agent_toml "$src" "$dest"
  else
    dest="${root}/${name}.md"
    install_copy "$src" "$dest"
  fi
  echo "  [${platform}] ${dest}"
}

install_command() {
  local platform="$1"
  local name="$2"
  local src="$3"
  local root dest
  root="$(install_path "$platform" "commands")"
  dest="${root}/${name}.md"
  install_copy "$src" "$dest"
  echo "  [${platform}] ${dest}"
}

prune_skill_dirs() {
  local platform="$1"
  shift
  local -a keep=("$@")
  local root name dir
  root="$(install_path "$platform" "skills")"
  [[ -d "$root" ]] || return 0
  for dir in "$root"/*; do
    [[ -d "$dir" ]] || continue
    name="$(basename "$dir")"
    local found=0
    for k in "${keep[@]}"; do
      [[ "$k" == "$name" ]] && found=1 && break
    done
    if [[ "$found" -eq 0 ]]; then
      echo "  [${platform}] prune ${dir}"
      run rm -rf "$dir"
    fi
  done
}

prune_agent_files() {
  local platform="$1"
  shift
  local -a keep=("$@")
  local root name file ext
  root="$(install_path "$platform" "agents")"
  [[ -d "$root" ]] || return 0
  if [[ "$platform" == "codex" ]]; then
    ext="toml"
  else
    ext="md"
  fi
  for file in "$root"/*."${ext}"; do
    [[ -f "$file" ]] || continue
    name="$(basename "$file" ".${ext}")"
    local found=0
    for k in "${keep[@]}"; do
      [[ "$k" == "$name" ]] && found=1 && break
    done
    if [[ "$found" -eq 0 ]]; then
      echo "  [${platform}] prune ${file}"
      run rm -f "$file"
    fi
  done
}

prune_command_files() {
  local platform="$1"
  shift
  local -a keep=("$@")
  local root name file
  root="$(install_path "$platform" "commands")"
  [[ -d "$root" ]] || return 0
  for file in "$root"/*.md; do
    [[ -f "$file" ]] || continue
    name="$(basename "$file" .md)"
    local found=0
    for k in "${keep[@]}"; do
      [[ "$k" == "$name" ]] && found=1 && break
    done
    if [[ "$found" -eq 0 ]]; then
      echo "  [${platform}] prune ${file}"
      run rm -f "$file"
    fi
  done
}

sync_skills() {
  local -a files=()
  local -a names=()
  shopt -s nullglob
  files=("${SKILLS_SRC}"/*.md)
  shopt -u nullglob

  if [[ ! -d "$SKILLS_SRC" ]]; then
    echo "Skills directory not found: ${SKILLS_SRC}" >&2
    return 1
  fi
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No skills in ${SKILLS_SRC}"
    return 0
  fi

  echo "== Skills (${SKILLS_SRC}) =="
  for skill_file in "${files[@]}"; do
    local name src_abs
    name="$(extract_name "$skill_file")" || return 1
    names+=("$name")
    src_abs="$(cd "$(dirname "$skill_file")" && pwd)/$(basename "$skill_file")"
    echo "→ ${name}"
    for platform in cursor claude codex; do
      if should_target "$platform"; then
        install_skill "$platform" "$name" "$src_abs"
      fi
    done
    echo
  done

  if [[ "$PRUNE" -eq 1 ]]; then
    echo "Pruning stale skills..."
    for platform in cursor claude codex; do
      if should_target "$platform"; then
        prune_skill_dirs "$platform" "${names[@]}"
      fi
    done
  fi

  echo "Registered ${#names[@]} skill(s)."
}

sync_agents() {
  local -a files=()
  local -a names=()
  shopt -s nullglob
  files=("${AGENTS_SRC}"/*.md)
  shopt -u nullglob

  if [[ ! -d "$AGENTS_SRC" ]]; then
    echo "Agents directory not found: ${AGENTS_SRC}" >&2
    return 1
  fi
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No agents in ${AGENTS_SRC}"
    return 0
  fi

  echo "== Agents (${AGENTS_SRC}) =="
  for agent_file in "${files[@]}"; do
    local name src_abs
    name="$(extract_name "$agent_file")" || return 1
    names+=("$name")
    src_abs="$(cd "$(dirname "$agent_file")" && pwd)/$(basename "$agent_file")"
    echo "→ ${name}"
    for platform in cursor claude codex; do
      if should_target "$platform"; then
        install_agent "$platform" "$name" "$src_abs"
      fi
    done
    echo
  done

  if [[ "$PRUNE" -eq 1 ]]; then
    echo "Pruning stale agents..."
    for platform in cursor claude codex; do
      if should_target "$platform"; then
        prune_agent_files "$platform" "${names[@]}"
      fi
    done
  fi

  echo "Registered ${#names[@]} agent(s)."
}

sync_commands() {
  local -a files=()
  local -a names=()
  shopt -s nullglob
  files=("${COMMANDS_SRC}"/*.md)
  shopt -u nullglob

  if [[ ! -d "$COMMANDS_SRC" ]]; then
    echo "Commands directory not found: ${COMMANDS_SRC}" >&2
    return 1
  fi
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No commands in ${COMMANDS_SRC}"
    return 0
  fi

  echo "== Commands (${COMMANDS_SRC}) =="
  for command_file in "${files[@]}"; do
    local name src_abs
    name="$(extract_name "$command_file")" || return 1
    names+=("$name")
    src_abs="$(cd "$(dirname "$command_file")" && pwd)/$(basename "$command_file")"
    echo "→ ${name}"
    for platform in cursor claude codex; do
      if should_target "$platform"; then
        install_command "$platform" "$name" "$src_abs"
      fi
    done
    echo
  done

  if [[ "$PRUNE" -eq 1 ]]; then
    echo "Pruning stale commands..."
    for platform in cursor claude codex; do
      if should_target "$platform"; then
        prune_command_files "$platform" "${names[@]}"
      fi
    done
  fi

  echo "Registered ${#names[@]} command(s)."
}

root_dest_name() {
  local platform="$1"
  case "$platform" in
    claude) printf '%s' "CLAUDE.md" ;;
    *) printf '%s' "AGENTS.md" ;;
  esac
}

root_dest_path() {
  local platform="$1"
  printf '%s/%s' "$PROJECT_ROOT" "$(root_dest_name "$platform")"
}

install_root_document() {
  local platform="$1"
  local src="$2"
  local dest
  dest="$(root_dest_path "$platform")"
  install_copy "$src" "$dest"
  echo "  [${platform}] ${dest}"
}

sync_root() {
  if [[ ! -f "$ROOT_SRC" ]]; then
    echo "No root document at ${ROOT_SRC}"
    return 0
  fi

  local src_abs
  src_abs="$(cd "$(dirname "$ROOT_SRC")" && pwd)/$(basename "$ROOT_SRC")"

  echo "== Root document (${ROOT_SRC}) =="
  echo "→ AGENTS.md"
  for platform in cursor claude codex; do
    if should_target "$platform"; then
      install_root_document "$platform" "$src_abs"
    fi
  done
  echo
  echo "Registered root document."
}

echo "HSync: ${HARNESS_ROOT}"
echo "Project: ${PROJECT_ROOT}"
echo "Scope:   ${SCOPE}"
echo "Kind:    ${KIND}"
echo "Target:  ${TARGET}"
echo

if should_kind skills; then
  sync_skills
  echo
fi

if should_kind agents; then
  sync_agents
  echo
fi

if should_kind commands; then
  sync_commands
  echo
fi

if should_kind root; then
  sync_root
fi

echo "Done."
