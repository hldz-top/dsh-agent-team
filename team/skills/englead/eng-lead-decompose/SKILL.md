---
name: eng-lead-decompose
description: >-
  Use when a coarse card from pm must become parallel work: split it into
  worker-sized units with disjoint write scopes, then dispatch one dev worker
  per unit into its own branch, worktree and port range.
---

# 把粗卡拆成 worker 单元并派工

`englead` **不写代码**。这个技能把 `pm` 的粗卡拆成 worker 级单元，每个单元派一个
`subagent`（`dev worker`）在**自己的分支 + worktree + 端口段**里做。

## When to use

- `pm` 给了一张粗卡，需要落到"一个 worker 能独立完成"的粒度。
- 一个 area 没有卡，或一张卡跨了多个可独立交付的区域。
- 卡太大、没有单条验收能覆盖，导致无法一次审查。

## Procedure

### A. 先看清楚

1. `read` 账本：`projects/<name>/project.md`、`tasks.md`、相关 `notes/`。
2. `codegraph explore "<区域>" -p <主仓>` 和 `codegraph impact <关键符号> -p <主仓>`——
   先知道这块代码的调用链和影响面，再决定怎么切。**没查过图不要拆卡。**
3. `team_task_list` + `team_task_get` 清点已有卡：能扩就扩，不要重复建卡。

### B. 按写作用域拆（不按阶段拆）

4. 一张卡 = **一组互不重叠的文件/目录**，写进 `Scope:`。两张卡要改同一个文件 → 合并成一张，
   或在文件边界上切开并说明。
5. 给每张卡分配：
   - 分支名 `<type>/<slug>-<yyyymmdd>`
   - worktree 名 `<slug>`（落 `<仓库根>/../wt-<slug>`）
   - **端口段** `Ports:`（两个在跑的卡不许重叠；最小分配 `3000-3099`/`3100-3199`/`3200-3299`）
6. `team_task_create` 建卡（`subject` / `description` / `write_scopes` / `blocked_by`），
   `Status: Todo`，`Owner` 留空等 worker 认领或由你指派。

### C. 派工（每单元一个 subagent）

7. 先建隔离环境：`bash: git fetch origin && git worktree add ../wt-<slug> -b <branch> origin/main`。
8. 用 `subagent` 起 `dev worker`，**`cwd` 必须指向该 worktree**。prompt 必须自包含（worker 不继承你的上下文）：

```text
你是 <项目> 的 dev worker，任务卡 <卡 id>。

【工作目录】<worktree 绝对路径>（只在这里改文件，别出去）
【分支】<branch>（已创建，不要切分支、不要 push、不要 merge）
【端口段】<Ports>
【目标】<一句话>
【允许改的范围】<文件/目录清单>
【验收标准】<1-3 条可判定>
【必须产出】代码 + pytest 单测（正向/反向各一条）+ 页面改动配 e2e
【自检】改完必须跑：<仓库实际的 lint/typecheck/测试命令>；红了自己修，不许交红结果
【查图】改前用 codegraph explore/impact -p <主仓> 摸影响面，回执里贴结论
【端口】用 .env.local 覆盖（不进提交）；e2e 的 baseURL 从 E2E_BASE_URL 读
【止损】20 分钟 / 40 轮封顶；同一命令失败 3 次即停并报告；同一问题方案最多试 2 次
【提交】审查通过后再 commit，格式 `<type>(<scope>): 中文摘要`
【回执】改动文件 / 新增测试 / 自检原始输出 / 影响面结论 / 剩余风险
```

9. 把 `worker` 的 id、分支、worktree、端口段写回卡里（`team_task_update`，带当前 revision）。
10. 拆到"每张卡都能被独立审查、独立合并"为止；再拆就是过度设计。

## Output

- 一张拆解表：`卡 id | 分支 | worktree | Ports | 验收 | worker id`。
- 每个单元一个 `subagent`，`cwd` 指向各自 worktree。
- 卡上记录齐全，别人接手不需要问你。

## Failure handling

- 作用域无法切干净 → 保持一张卡，明说原因；并行改同一文件必然冲突。
- 账本与需求矛盾 → 卡标 `Status: Blocked` + 具体矛盾点，`ask_user_question` 问 owner。
- worker 起不来或早早停下 → 看它交回的内容，用 `send_message` 补一股更短的指令；
  还是不行就换一个 worker，并在卡上记录第一次失败的原因。
- **不许留孤儿卡**：每张 `Todo` 卡都必须有明确的下一步（谁做、何时做）。

## References

- `team/DEV_PIPELINE.md` §2（隔离单元、自检门、端口、止损）
- `team/skills/englead/eng-lead-chase/SKILL.md` — 派工之后怎么追
