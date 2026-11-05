# 团队任务板

> **Lead 维护。** 状态机：`pending` → `claimed` → `in_progress` → `complete`（返工 `reopen`）。
> 共享任务板（`team_task_*`）是实时真相；本文件是每轮的人类可读归档。两者不一致时以任务板为准，并由 Lead 回写本文件。

## 当前轮

| 轮次 | 日期 | 团队 | 状态 |
|---|---|---|---|
| R1 | 2026-11-05 | lead + pm / englead / audit / qa | **已收口** — 合并 `75a3e74`（`--no-ff`），`ci.sh --full` PASS，QA `STATUS PASS` |
| R2 | — | — | **未立项**（候选见 R1 记录「遗留」） |

## R1 执行记录

| 任务 | Owner | 目标 | 结果 |
|---|---|---|---|
| `task-6` | pm | 建项目账本五件套 + 粗卡 T-001 | ✅ 账本齐全；T-001 二值验收 |
| `task-7` | englead | 拆卡、审查 G2 | ✅ `VERDICT: PASS`（独立复核：main 版实现 + 新测试 → 5 failed） |
| `task-8` | qa | 四类验收用例 + 判定 | ✅ `STATUS PASS`（12 条：BLOCK 8 / WARN 4） |
| `task-9` | audit | 只读体检 | ✅ 13 条契约偏差，BLOCK 2 |
| G1/G3/G6 | lead（代派） | worktree 开发、提交、合并 | ✅ `b824fe4` → `75a3e74`，分支与 worktree 已删 |

**平台偏差声明**：R1 的 G1 由 **Lead 代派 worker** 执行，原因是 `subagent.maxDepth` 默认 1
（队友不能派 worker）且队友沙箱不覆盖产品仓库。详见 `DEV_PIPELINE` §2.3 与 README「平台约束」。

## 报到记录

> 本轮真正有价值的是**各角色拒绝做了什么**——配合会让流程更快，但结果一文不值。

| 席位 | 关键行为 | 结果 |
|---|---|---|
| `englead` | 无 diff 可审时**拒绝编造** worker 产出，改交可执行的派工包 + 全部复现证据 | BLOCKED（正确） |
| `englead` | 审查时**不采信** worker 的"我跑过了"，自己拉 main 版实现配新测试验证判别力 | 5 failed → PASS 有据 |
| `qa` | **拒绝**拿 englead 的手工复现替代 G5 证据（缺独立执行者与截图） | 坚持补执行通道 |
| `qa` | **拒绝**软通过：AC-12 失败只进 `warn_items`，不塞进 `blocked_items` | 判定诚实 |
| `qa-click worker` | **拒绝**接受被污染的数据，识别外部写入后作废该次并重跑、留档作废帧 | 数据可信 |

### 本轮事故（如实留档）

| 事故 | 原因 | 处置 |
|---|---|---|
| AC-11 Round B 首次作废 | Lead 在 8774（worker 正在用的端口）curl 写入数据，污染被测实例 | 作废重跑；新增 `DEV_PIPELINE §5` 端口隔离规则 |
| worker 取 SHA 失误 | `cd … && … &` 把整链放后台，实际在团队仓库执行拿到 `df0671d` | worker 用 `git -C` 复核 + lsof + server.py sha256 自纠为 `b824fe4`，qa 独立复现确认 |

## 待用户裁决

- **架构选型**：A（Lead 派工，现方案，会话即可用）vs B（线头派工，需 `maxDepth≥2` 且全部会话重建）。
- **R2 是否立项**：首卡候选 = audit BLOCK-2（畸形请求体导致连接断开，违反错误形状契约）。

## 归档

> 每轮结束后把上表移到本节，标明结果（含未完成项）。

### R1（2026-11-05，已收口）

- 单轮记录：`projects/team-sandbox/iterations/R1-2026-11-05.md`
- 合并：`75a3e74`（`--no-ff`）；开发提交 `b824fe4`；主仓合并后 `ci.sh --full` PASS、pytest 11 passed
- 未完成项：无（遗留 5 项已登记，R2 候选）
