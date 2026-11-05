---
name: doc-discipline
description: >-
  Use before writing or updating any team or project document: deciding which file
  owns a fact, recording a decision, closing an iteration, or judging whether a
  one-off note belongs in the repo at all.
---

# 文档纪律

把事实写进正确的文件，并让下一个会话的人能直接接手。
完整机制见 `team/DOC_PROTOCOL.md`；本技能是它的可执行版本。

## When to use

- 你要写/改 `STATUS.md`、`tasks.md`、`DECISIONS.md`、`ITERATIONS.md`、`iterations/*.md` 之前。
- 你刚得出一个结论，正想"找个地方记一下"时 —— 先判断它属于哪一类。
- 一轮结束，需要收口时。
- 你想新建一个文档时（先问：能不能并入已有文件？）。

## Procedure

### A. 落笔前先分类（四态）

1. 这是**现状**吗（现在是什么样）→ `STATUS.md`。
2. 这是**待办**吗（还要做什么）→ `tasks.md`（不写进 STATUS）。
3. 这是**做法**吗（以后怎么做）→ 对应 skill 的章节（不新建文档）。
4. 这是**证据**吗（为什么这么判断）→ `notes/<role>/YYYY-MM-DD-<slug>.md`。

判断不了 → 大概率是"证据"，放 `notes/`；如果连证据都不算，**不写**。

### B. 找归属文件

1. 查 `DOC_PROTOCOL.md` §2.3 归属表。
2. 不是你的文件 → `send_message` 给维护者（项目区五件套归 `pm`），不要另写一份。
3. 同一个事实已经有归属 → **更新它**，不要在新地方复述。

### C. 写裁决（只有 pm 写 DECISIONS）

1. 追加一行：`| YYYY-MM-DD | <可判定规则> | 用户/lead | <取代的旧日期或 —> |`。
2. 规则必须是可判定的（"禁止 X"/"X 必须是 Y"），不是"注意 X"。
3. 推翻旧口径时，旧行**保留**，在新行「取代」列写旧日期。
4. 例外单独一行，不要藏在句子里。

### D. 收口一轮（Lead + pm 配合）

1. Lead 写 `iterations/R<n>-YYYY-MM-DD.md`：目标 / 派工 / 产出 / 证据 / 遗留 / 本轮裁决。
2. pm 更新 `ITERATIONS.md` 加一行（含遗留）；`STATUS.md` 更新基线数字 + 最后验证时间 + 偏差。
3. pm 做 30 秒体检：`notes/` 里有没有第 5 类文件？有就并入对应文档后删除。
4. `BOARD.md` 归档本轮。

### E. 新建文档前的三问

1. 能不能并入已有文件的某一节？能 → 不要新建。
2. 它是四类之一吗（事故复盘/规则变更/跨人交接/被长期文档引用的证据）？不是 → 不要新建。
3. 30 天后还会有人读它吗？不会 → 不要新建。

三问全过才建，并在 `DOC_PROTOCOL.md` §2 的表里登记归属。

## Output

- 改动集中在**一个**归属文件；commit/报告里写清"改了哪个文件、属于四态中的哪一态"。
- 裁决行必须四要素齐全：日期 / 内容 / 来源 / 取代。
- 状态类更新必须带**验证时间**，否则视为无效更新。

## Failure handling

- 不确定归属 → 问 Lead，不要猜；猜错会产生第二份真相。
- 发现两个文件写了同一事实 → 以 SSOT 为准，修正引用方，并在回执里点名报告这处重复。
- 文档与代码事实冲突 → 事实优先，记进 `STATUS.md` §3「已知偏差」，并报 Lead 请用户裁决。
- 明确不该记的东西（一次性过程、聊天结论、未验证猜测）→ 不写；回执里说明"判定为一次性，未落盘"。

## References

- `team/DOC_PROTOCOL.md` — 完整机制（SSOT 表 / 四态 / 防膨胀规则 / 命名约定）
- `projects/_template/` — 五个文件的标准形状
