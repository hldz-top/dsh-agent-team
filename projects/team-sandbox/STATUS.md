# team-sandbox · 状态（STATUS）

> **这是什么**：项目**现在**是什么样。只写现状，不写待办、不写做法。
> 维护：`pm` ｜ 每轮结束必须更新；状态变化时随时更新。
> 最后验证：2026-11-05 20:49 ｜ 维护者：pm

## 1. 当前状态

| 项 | 值 |
|---|---|
| 阶段 | 立项 |
| 阻塞数 | 1 |
| 本轮 | R1 |

一句话：账本已建、粗卡 `T-001` 归 `englead`；仓库基线 4 个测试全绿，但三处契约偏差（空标题、列表顺序、标题 20 字符上限）仍在，且 G1 因会话能力受阻（worktree 不可建、`subagent` 委派深度 0），R1 尚未进入修复。

## 2. 基线数字

> 验收用数字。每次更新必须写验证时间，否则不可信。

| 指标 | 当前 | 基线 | 最后验证 |
|---|---|---|---|
| pytest 通过数 | 4 | 4/4 | 2026-11-05 20:49（引用 `.ci/test.log`；pm 未执行） |
| `ci.sh --fast` 四项 | PASS | PASS | 2026-11-05 20:49（引用 `.ci/*.log`；pm 未执行） |
| ruff lint 错误 | 0 | 0 | 2026-11-05 20:49（引用 `.ci/lint.log`） |

## 3. 已知偏差

> 与预期不一致但**已接受**的事实。一条一行，带原因和判据。

| 偏差 | 原因 | 判据/证据 | 何时复看 |
|---|---|---|---|
| `POST /api/todos` 未校验标题 20 字符上限（契约要求超限 `400` + `{"error": "title too long"}`） | **已并入 R1 `T-001`**（Lead 2026-11-05 裁决选 A，依据 `notes/audit/R1.md` BLOCK-1）；修复前仍属偏差 | `docs/API.md:30` vs `app/server.py:86`（`do_POST` 只 strip、无长度校验）；`DECISIONS.md` 2026-11-05 范围扩大行 | `T-001` 进入 `Review` 时复验；修好后移入 §4 |
| R1 开发无法启动：工作区不可写产品仓库（worktree 创建被拒）、`subagent` 委派深度 0 | 会话能力，不是任务本身 | `notes/englead/2026-11-05-r1-api-contract-handoff.md` §2.3 原文（`unable to create directory for .git/refs/...`） | Lead 选定解锁方案 A/B/C 后 |
| audit BLOCK-2（D2）：非对象 JSON 体（`[]`、`"abc"`）或非字符串 title（`123`、`["a"]`）在 `do_POST` 抛 `AttributeError`，连接被直接断开，既无 500 也无 `{"error": ...}`——违反 `API.md:31` 错误体形状 | **R2 候选**，不并入 R1（Lead 2026-11-05 裁决） | `notes/audit/R1.md` §1 D2（code-true，实测 `RemoteDisconnected`）；`docs/API.md:31` | R2 立项时立卡修复 |

## 4. 已关闭（不要重开）

- （暂无）

## 5. 更新记录

| 时间 | 谁 | 改了什么 |
|---|---|---|
| 2026-11-05 20:52 | pm | 建账本；STATUS 初版，基线引自 `.ci/` 20:49 的日志 |
| 2026-11-05 20:54 | pm | 并入 englead 交接（G1 受阻、Ports 8770-8779）与 qa AC-09 口径冲突；`T-001` → `Blocked`，阻塞数 1 |
| 2026-11-05 20:57 | pm | 并入 audit R1 体检结论（13 条契约偏差，BLOCK 2 条：D1/D2）；均 R1 范围外，R2 候选 |
| 2026-11-05 21:00 | pm | Lead 裁决选 A：D1（20 字符上限）并入 `T-001`（Scope/Acceptance(c)/Note 更新，DECISIONS 追加）；D2 标注 R2 候选；`project.md` 成功标准同步 |
