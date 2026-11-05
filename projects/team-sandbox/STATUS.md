# team-sandbox · 状态（STATUS）

> **这是什么**：项目**现在**是什么样。只写现状，不写待办、不写做法。
> 维护：`pm` ｜ 每轮结束必须更新；状态变化时随时更新。
> 最后验证：2026-11-05 21:40 ｜ 维护者：pm

## 1. 当前状态

| 项 | 值 |
|---|---|
| 阶段 | 已交付（R1 已合并） |
| 阻塞数 | 0 |
| 本轮 | R1（已收口） |

一句话：R1 已收口——合并提交 `75a3e74`（`--no-ff`，父 `db39d79` + `b824fe4`）已进 `main`，合并后主仓 `ci.sh --full` **PASS**、pytest **11 passed**；三处契约偏差（空标题 400、列表倒序、标题 20 字符上限）全部修复，QA `STATUS PASS`、G2 `VERDICT: PASS`。R2 未立项，候选见 `iterations/R1-2026-11-05.md`「遗留」。

## 2. 基线数字

> 验收用数字。每次更新必须写验证时间，否则不可信。

| 指标 | 当前 | 基线 | 最后验证 |
|---|---|---|---|
| pytest 通过数（用例数） | 11 passed（11 条） | 4 → 11 | 2026-11-05 21:40（`.ci/test.log`；pm 引用未执行） |
| `ci.sh --full`（合并后主仓） | PASS | PASS | 2026-11-05 21:40（`.ci/*.log`） |
| ruff lint 错误 | 0 | 0 | 2026-11-05 21:40（`.ci/lint.log`） |

## 3. 已知偏差

> 与预期不一致但**已接受**的事实。一条一行，带原因和判据。

| 偏差 | 原因 | 判据/证据 | 何时复看 |
|---|---|---|---|
| 平台约束：线头会话 `subagent` 委派深度=1、工作区沙箱仅限团队资料目录，G1 只能由 Lead 代派 worker | 会话能力，非任务问题（R1 已用 Lead 代派绕过） | `iterations/R1-2026-11-05.md`「遗留」第 5 项；`notes/englead/2026-11-05-r1-api-contract-handoff.md` §2.3 | R2 开工前；要验证「线头派工」需重开会话使 `maxDepth=2` 生效 |
| audit BLOCK-2（D2）：非对象 JSON 体（`[]`、`"abc"`）或非字符串 title（`123`、`["a"]`）在 `do_POST` 抛 `AttributeError`，连接被直接断开，既无 500 也无 `{"error": ...}`——违反 `API.md:31` 错误体形状 | **R2 候选**（Lead 2026-11-05 裁决不并入 R1；QA 已记为 `warn_items: [AC-12]`） | `notes/audit/R1.md` §1 D2（code-true）；`qa/run-2026-11-05-r1-api-contract.md` §7 footer | R2 立项时立卡修复 |

## 4. 已关闭（不要重开）

> 已经查清/修好/裁决掉的事。报到或接手时**不要重新调查**，除非新证据。

- R1 三处契约偏差（空标题 `400`、列表最新在前、标题 20 字符上限，含 audit BLOCK-1/D1）— 关闭于 2026-11-05，依据合并 `75a3e74` + 合并后 `ci.sh --full` PASS（11 passed）+ QA `STATUS PASS`（Round B BLOCK 8/8，`qa/run-2026-11-05-r1-api-contract.md`）。
- G1 会话能力阻断（worktree 不可建、`subagent` 深度 0）— 2026-11-05 由 Lead 代派 worker 绕过；根因平台约束仍在，见 §3。

## 5. 更新记录

| 时间 | 谁 | 改了什么 |
|---|---|---|
| 2026-11-05 20:52 | pm | 建账本；STATUS 初版，基线引自 `.ci/` 20:49 的日志 |
| 2026-11-05 20:54 | pm | 并入 englead 交接（G1 受阻、Ports 8770-8779）与 qa AC-09 口径冲突；`T-001` → `Blocked`，阻塞数 1 |
| 2026-11-05 20:57 | pm | 并入 audit R1 体检结论（13 条契约偏差，BLOCK 2 条：D1/D2）；均 R1 范围外，R2 候选 |
| 2026-11-05 21:00 | pm | Lead 裁决选 A：D1（20 字符上限）并入 `T-001`（Scope/Acceptance(c)/Note 更新，DECISIONS 追加）；D2 标注 R2 候选；`project.md` 成功标准同步 |
| 2026-11-05 21:40 | pm | R1 收口：`T-001` → `Done`（合并 `75a3e74`，`ci.sh --full` PASS，11 passed）；基线 4→11；D1 移 §4；ITERATIONS 增 R1 行并链单轮记录；`team/BOARD.md` R1 行更新 |
