#!/usr/bin/env bash
# ============================================================================
# 本地 CI 单一入口（模板）
#
# 用法：
#   bash scripts/ci.sh --fast      # 开发自检：lint + typecheck + 受影响测试（G1/G2 用）
#   bash scripts/ci.sh --full      # 合并门禁：受检 + 全量测试 + e2e（G6 用）
#   bash scripts/ci.sh --fast --json
#
# 规则：
#   1. 这是**唯一检查入口**。worker、englead、Lead 都跑它，结果才可比。
#   2. 命令必须与平台 CI（GitLab CI / GitHub Actions）一致，或直接调用同一批脚本，
#      避免「本地绿、平台红」。
#   3. 失败即非零退出。任何一项失败不继续跑后续项（早失败比全跑更省时间）。
#   4. 报告落 .ci/ 且**不进版本库**（.gitignore 里加 `.ci/`）。
#
# 落地时把 §适配 段改成你们仓库的真实命令，其余不用动。
# ============================================================================
set -uo pipefail

MODE="fast"
JSON=0
for arg in "$@"; do
  case "$arg" in
    --fast) MODE="fast" ;;
    --full) MODE="full" ;;
    --json) JSON=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 2
STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT_DIR="$ROOT/.ci"
REPORT="$REPORT_DIR/report-$STAMP.json"
mkdir -p "$REPORT_DIR"

PASS=0
FAILED=""
declare -a RESULTS=()

# ---------------------------------------------------------------------------
# 执行一项检查：名字 + 命令
# ---------------------------------------------------------------------------
run() {
  local name="$1"; shift
  printf '▶ %-28s ' "$name"
  local log="$REPORT_DIR/$(echo "$name" | tr ' /' '__').log"
  if "$@" >"$log" 2>&1; then
    printf 'PASS\n'
    RESULTS+=("$(printf '{"step":"%s","status":"pass"}' "$name")")
  else
    printf 'FAIL  (log: %s)\n' "${log#$ROOT/}"
    tail -n 20 "$log" | sed 's/^/    /'
    RESULTS+=("$(printf '{"step":"%s","status":"fail","log":"%s"}' "$name" "${log#$ROOT/}")")
    FAILED="$FAILED $name"
  fi
}

# ---------------------------------------------------------------------------
# §适配：按仓库实际情况改写下面四个函数
# ---------------------------------------------------------------------------
has() { command -v "$1" >/dev/null 2>&1; }
is_node() { [ -f package.json ]; }
is_python() { [ -f pyproject.toml ] || [ -f requirements.txt ]; }

lint() {
  if is_node; then
    if   has pnpm; then pnpm -s lint
    elif has npm;  then npm run -s lint
    fi
  elif is_python; then
    ruff check . && ruff format --check .
  fi
}

typecheck() {
  if is_node;    then pnpm -s typecheck 2>/dev/null || npx --no-install tsc --noEmit
  elif is_python; then has mypy && mypy . || true   # 仓库没配 mypy 就跳过，不阻塞
  fi
}

# fast：只跑受影响测试（有 codegraph 索引时）；full：全量
unit_test() {
  local files=""
  if [ "$MODE" = "fast" ] && has codegraph && codegraph status -p "$ROOT" >/dev/null 2>&1; then
    files="$(git diff --name-only origin/main...HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|py)$' || true)"
    if [ -n "$files" ]; then
      codegraph affected $files -p "$ROOT" 2>/dev/null | grep -Eo '[^ ]+\.(ts|tsx|js|jsx|py)' | sort -u > "$REPORT_DIR/affected.txt" || true
    fi
  fi
  if [ -s "$REPORT_DIR/affected.txt" ]; then
    if is_node;    then pnpm -s test -- $(tr '\n' ' ' < "$REPORT_DIR/affected.txt")
    elif is_python; then pytest $(tr '\n' ' ' < "$REPORT_DIR/affected.txt")
    fi
  else
    if is_node;    then pnpm -s test
    elif is_python; then pytest -q
    fi
  fi
}

e2e() {
  [ "$MODE" = "full" ] || return 0
  if is_node && [ -f playwright.config.ts -o -f playwright.config.js ]; then
    E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:${CI_PORT:-3000}}" npx playwright test
  fi
}

# ---------------------------------------------------------------------------
# 主流程（顺序固定：静态检查 → 类型 → 测试 → e2e）
# ---------------------------------------------------------------------------
echo "CI mode=$MODE root=$ROOT"
run "lint"      lint
[ -n "$FAILED" ] || run "typecheck" typecheck
[ -n "$FAILED" ] || run "unit-test" unit_test
[ -n "$FAILED" ] || run "e2e"       e2e

STATUS="pass"; [ -n "$FAILED" ] && STATUS="fail"
if [ "$JSON" = "1" ]; then
  printf '{"status":"%s","mode":"%s","commit":"%s","steps":[%s]}\n' \
    "$STATUS" "$MODE" "$(git rev-parse --short HEAD 2>/dev/null || echo none)" \
    "$(IFS=,; echo "${RESULTS[*]}")"
else
  echo
  if [ "$STATUS" = "pass" ]; then
    echo "CI PASS ($MODE)"
  else
    echo "CI FAIL ($MODE) — 失败项:$FAILED"
  fi
fi
[ "$STATUS" = "pass" ] || exit 1
