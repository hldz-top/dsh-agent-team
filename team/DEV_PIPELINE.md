# 开发流水线（DEV_PIPELINE）

> 适用范围：任何**开发性质**的任务（改代码、加功能、修 bug）。纯文档/调研/配置任务不走本流水线。
> 一句话：**一个任务一个分支一个 worktree，一个 worker 独占；审查过了才提交，QA 用例全绿才合并。**

---

## 1. 六道门（G0 → G6）

```
G0 立项 ──► G1 隔离开发 ──► G2 独立审查 ──► G3 提交 ──► G4 QA 生成用例 ──► G5 页面点击验证 ──► G6 合并收口
   pm          dev worker        reviewer        dev worker      qa worker          qa worker         lead
```

| 门 | 谁做 | 产物 | 不通过会怎样 |
|---|---|---|---|
| **G0 立项** | `pm` | 任务卡：`Scope / Acceptance / 分支名 / worktree 名` | 验收不可判定 → 不许开工 |
| **G1 隔离开发** | `dev worker` | 独立分支 + 独立 worktree 里的改动 | 自测失败 → 自己修，不进 G2 |
| **G2 独立审查** | `reviewer`（由 Lead 派 `subagent`，不是作者本人） | `PASS` 或 `CHANGES` + 问题清单 | `CHANGES` → 回 G1，附逐条问题 |
| **G3 提交** | `dev worker` | 分支上的提交（审查通过后才 commit） | — |
| **G4 QA 生成用例** | `qa worker`（`qa` 用 `subagent` 起） | 正向 / 反向 / 边界 / 全流程 四类用例 + 可执行测试 | 用例覆盖不足 → 打回补 |
| **G5 页面点击验证** | `qa worker` | 逐用例点击结果 + 截图证据 + `PASS/FAIL` | 任一 FAIL → 回 G1 |
| **G6 合并收口** | `lead` | 合并到主分支 + 删开发分支 + 删 worktree + 账本更新 | 门禁未全绿 → 不合并 |

**硬规则：G2 的审查者不能是 G1 的作者；G6 的执行者不能是 G1 的作者。** 谁开发谁不验收、谁不合并。

---

## 2. G1：隔离开发（核心）

### 2.1 隔离单元

| 概念 | 约定 | 例子 |
|---|---|---|
| 分支名 | `<type>/<slug>-<yyyymmdd>` | `feat/login-retry-20261105`、`fix/null-pointer-20261105` |
| worktree 名 | `<slug>`（与分支同名，落在仓库同级 `../wt-<slug>`） | `../wt-login-retry` |
| 一个任务 | 恰好一个分支 + 一个 worktree | 禁止两个任务共用一个 worktree |

### 2.2 创建（worker 自己执行第一步）

优先用原生工具；不可用时退回 `bash` + `working_directory`：

```text
# 首选（一条命令建分支+worktree 并把本会话切进去）
create_worktree { name: "<slug>", from: "main" }

# 兜底
bash: git fetch origin && git worktree add ../wt-<slug> -b <type>/<slug>-<yyyymmdd> origin/main
working_directory { cd: "../wt-<slug>" }
```

**验证隔离生效**（worker 回执里必须贴）：`pwd` 是 worktree 路径、`git rev-parse --abbrev-ref HEAD` 是自己的分支。

### 2.3 并发上限

团队 `maxMembers = 8`，五个固定角色占 5 个 → **最多 3 个并发 dev worker**。
超过 3 个的卡在任务板排队，`blocked_by` 指向当前在跑的卡，不硬塞。

### 2.4 worker 边界

- 只改自己卡里的 `Scope`；跨文件需求 → 回 Lead 拆卡。
- 不 push、不 merge、不切回主分支。
- 自测：改什么跑什么（lint / typecheck / 相关测试），命令与输出进回执。

---

## 3. G2：独立审查

审查者由 Lead 用 `subagent` 起（一次性，不占团队名额），prompt 里必须给：
分支名、diff 范围、卡里的 `Acceptance`、以及本仓库的编码规范。

**两轴审查**（缺一不可）：

| 轴 | 看什么 | 不通过判据 |
|---|---|---|
| 标准轴 | 是否符合本仓库既有风格/规范 | 引用了不存在的约定、风格不一致 |
| 规格轴 | 是否满足卡上的 `Acceptance` | 少做、多做、做偏 |

输出格式固定：

```
VERDICT: PASS | CHANGES
- [BLOCK] <问题> — <文件:行> — <怎么改>
- [WARN]  <问题> — <文件:行>
```

`CHANGES` 必须逐条可执行；`WARN` 不阻塞合并但要在 G6 记录。

---

## 4. G4：QA 生成用例（由 qa 的 worker 做）

`qa` 是固定角色，**不能 spawn 队友**，所以用 `subagent` 起一个 worker：

```
qa → subagent(prompt = 生成用例的完整任务, cwd = 该任务 worktree)
```

### 4.1 四类用例，一类都不能少

| 类别 | 覆盖什么 | 最少条数 |
|---|---|---|
| **正向** | 主流程按预期走通 | 覆盖每个新增/改动的行为点 |
| **反向** | 非法输入、越权、错误状态、依赖失败 | 每个失败分支至少 1 条 |
| **边界** | 空值 / 最小值 / 最大值 / 超长 / 并发临界 / 时区与精度 | 每个数值或集合参数至少 2 条 |
| **全流程** | 从入口到落库/展示的端到端串联 | 至少 1 条，含前置数据准备与清理 |

### 4.2 用例规格（先写表，再写代码）

```markdown
| ID | 类别 | 前置 | 步骤 | 期望 | 断言点 |
|---|---|---|---|---|---|
| AC-01 | 正向 | ... | ... | ... | <DOM 选择器 / 接口字段 / DB 字段> |
```

- `断言点` 必须是**可程序化判定**的：DOM 选择器、接口字段、DB 行。禁止写"页面显示正常"。
- 用例表与测试代码同目录：`projects/<p>/qa/AC-PACK.md`（表）+ 仓库内测试文件（代码）。

### 4.3 用例自身也要可信

- 每条用例先跑一遍**在未修复分支上应失败**（反向验证），确认真能抓到问题；
  做不到就在报告里标 `unverified-guard`。
- 禁止为了让用例变绿而改期望值。

---

## 5. G5：页面点击验证

前提：被测应用**已在本地起起来**（worker 负责启动并记录 PID/端口/健康检查结果）。

| 步骤 | 做法 | 证据 |
|---|---|---|
| 1. 起服务 | `bash` 后台起 dev server，等端口就绪 | 端口号 + `/health` 或首页 200 |
| 2. 打开页面 | 浏览器自动化打开目标 URL | 截图 1（初始态） |
| 3. 逐用例点击 | 按 AC 表顺序点击/输入/提交 | 每步一张截图或一条断言日志 |
| 4. 断言 | 对照 `断言点` 判定 | FAIL 项给「期望 vs 实际」 |
| 5. 收尾 | 关服务、清理测试数据 | 清理命令 |

**一律 headless**：不弹有头窗口抢占桌面。每张截图落 `notes/qa/screenshots/YYYY-MM-DD-HHmm-<场景>-<序号>.png`。

---

## 6. G6：合并收口（Lead 执行）

只有 G2 `PASS` + G4 用例齐四类 + G5 全绿，三份证据同时到位才允许合并。

```bash
# 1) 确认门禁证据都在（Lead 只读核对）
#    审查报告: PASS | QA 用例表: 四类齐全 | 点击验证: 全 PASS 且有截图

# 2) 合并（一个任务一个提交，保持主干线性）
git switch main && git pull --ff-only
git merge --no-ff <type>/<slug>-<yyyymmdd> -m "<type>(<scope>): <中文摘要>"

# 3) 收口：删分支 + 删 worktree
git worktree remove ../wt-<slug> --force
git branch -d <type>/<slug>-<yyyymmdd>
git push origin main            # 需要用户已授权推送

# 4) 账本
#    pm: 卡 → Done（附合并提交 SHA）；STATUS.md 基线数字；ITERATIONS.md 加行
```

合并失败（冲突）→ 不自行解决，回 G1 让作者基于最新 main 处理。

---

## 7. 失败与打回

| 场景 | 动作 |
|---|---|
| G1 自测失败 | worker 自己修，不回给 Lead |
| G2 返回 `CHANGES` | 回 G1；同一问题**两轮**未解决 → 报 Lead 换方案，不许第三轮硬改 |
| G4 用例覆盖不足 | 打回补用例，不进入 G5 |
| G5 出现 FAIL | 回 G1；修复后 **G4/G5 全量重跑**，不许只跑失败项 |
| 超过 2 次尝试仍失败 | 停，`STATUS BLOCKED` + 错误原文 + 已排除项，上报 Lead |

---

## 8. 当前能力实测（决定这套能不能真跑）

| 能力 | 状态 | 说明 |
|---|---|---|
| 独立分支 + 独立 worktree | ✅ 可用 | `create_worktree` 工具在会话工具集里；兜底 `bash git worktree add` + `working_directory` |
| 并发 worker | ⚠️ 上限 3 | 团队 `maxMembers=8`，五个固定角色后剩 3 个名额 |
| 独立审查（subagent） | ✅ 可用 | `subagent` 工具在工具集里 |
| QA 生成测试用例 | ✅ 可用 | qa 用 `subagent` 起 worker；写测试代码是普通文件操作 |
| **页面点击验证** | ❌ **当前不可用** | 浏览器 MCP（playwright-host）**未启动**：端口 18081 无监听，工具集里没有 `mcp__playwright-host__*` |
| 合并 + 删分支 | ✅ 可用 | `bash git`；需用户授权推送 |

**页面点击验证的恢复办法**（启动一次即可，重启机器后需重跑）：

```bash
nohup npx -y @playwright/mcp@latest --port 18081 --host 127.0.0.1 > /tmp/playwright-host.log 2>&1 &
# 等 5–10 秒后确认监听
lsof -nP -iTCP:18081 -sTCP:LISTEN
```

启动后 DSH 的 MCP 客户端需要重连才会注册工具（重开会话或重启 Host）。
**在它恢复之前，G5 只能降级为「接口级验证 + 手工截图」，且必须在报告里标 `G5-DEGRADED`。**

---

## 9. 与其它协议的关系

| 文档 | 关系 |
|---|---|
| `TEAM_PROMPT.md` §4.8 | 流水线的规则摘要与派工口径 |
| `ROLE_PROMPTS.md` | 每个角色在流水线里的职责与产物 |
| `DOC_PROTOCOL.md` | 流水线产生的证据怎么落盘（`notes/` 四类、`qa/` 命名） |
| 任务卡 `Scope` | 与 worktree 边界一一对应；`Scope` 重叠 = 拆卡 |
