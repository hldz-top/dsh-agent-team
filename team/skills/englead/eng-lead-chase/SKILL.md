---
name: eng-lead-chase
description: >-
  Use during a work round: check every in-flight worker unit, run the card's
  proof command yourself, review the result as the non-author, and enforce the
  stop-loss limits instead of retrying.
---

# 追工、审查与止损

`englead` 的日常：worker 在跑 → 跑检查 → 审查 → 放行或打回。**自己是审查者，不写代码。**

## When to use

- 一轮里已经有 worker 在跑（或刚跑完）。
- 有卡停在 `In Progress` / `Review` / `Blocked`。
- worker 超时、反复失败、或交回的东西看起来不对。

## Procedure

### A. 看现状

1. `team_task_list` 过滤 `In Progress` / `Review` / `Blocked`，逐张 `team_task_get`。
   **卡是唯一事实源**，worker 的口头结论不算。
2. 对每张在跑的卡：它对应的 worktree 里有没有文件变动（`bash: git -C <worktree> status --short`）。
   没有变动 + 没有新消息 = 可能卡死。

### B. 亲自跑检查（只读，属于验收不属于施工）

3. 进入 worker 的 worktree，跑卡上写的命令：lint / typecheck / 测试。
   把**确切命令 + 原始输出**写回卡里。
4. 用 `codegraph impact <symbol> -p <主仓>` 核对 worker 声称的影响面是否属实；
   影响面明显漏了 → 直接打回。

### C. 审查（G2）

5. 读 diff：`bash: git -C <worktree> diff origin/main --stat` 再逐文件读。
   两轴判断——**标准轴**（是否符合仓库既有风格与约定）+ **规格轴**（是否满足 `Acceptance`）。
6. **测试也要审**：新增行为有没有测试、断言是否有效、是不是只在 happy path 上通过。
   没有测试的改动不收。
7. 结论只有两种：

```
VERDICT: PASS
- [WARN] <可接受的问题> — <文件:行>

VERDICT: CHANGES
- [BLOCK] <问题> — <文件:行> — <怎么改>
```

8. `PASS` → 让 worker 在自己 worktree 里 commit（格式 `<type>(<scope>): 中文摘要`），
   卡移到 `Review`，等 qa 的验收用例与点击验证。
9. `CHANGES` → `send_message` 给该 worker，逐条列出问题。**同一张卡最多 2 轮**。

### D. 止损（必须执行，不许"再试一次"）

10. 触及任一条即停：worker 单次 **20 分钟 / 40 轮**；同命令失败 **3 次**；同问题方案 **2 次**；
    单卡累计 **2 小时**；卡停 `In Progress` **24 小时**无产出。
11. 停下后：保留 worktree 里的产物不删，卡上记清 `worker-timeout` + 停在哪一步，
    由你决定续做、换 worker 还是拆卡。**不许静默丢弃，也不许提交半成品。**

### E. 汇总

12. 给 Lead 一行一卡：`<卡 id> <状态> <分支> <下一步>`。
13. 只有三种情况 ping owner：blocked / 可合并 / 已完成。其余进摘要。

## Output

- 每卡：检查命令 + 原始输出 + `VERDICT` + 提交 SHA。
- 打回意见逐条可执行（改什么、在哪、怎么算改好），不接受"再优化一下"。
- 止损记录：谁、停了多久、停在哪一步、产物在哪。

## Failure handling

- 检查命令本身跑不起来（缺依赖/端口占着）→ 先排除环境，再判断是不是代码问题；
  环境问题记 `env:` 前缀，别把环境问题算成代码失败。
- 同一处第 3 次打回 → 停，换方案或上报 Lead，**不许第 3 次改同一处**。
- worker 失联/超时 → 保留产物、换 worker 重派，第一轮的失败原因写进卡，避免下一个人重复踩。
- 卡的状态与仓库事实对不上 → 以仓库为准，改卡，并在给 Lead 的汇报里点名这处不一致。

## References

- `team/DEV_PIPELINE.md` §2.8（止损数值）、§3（G2 审查）、§7（打回规则）
- `team/skills/englead/eng-lead-decompose/SKILL.md` — 卡是怎么拆出来的
