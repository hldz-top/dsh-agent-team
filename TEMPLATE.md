# 源文件规范（团队契约 v1）

本文件是 `agents/` 与 `skills/` 下源文件的唯一格式契约。`scripts/build-bundle.mjs`
把它们编译成 `team-bundle/cordis.patch.yml`（DSH Agent Preset 声明）。**生成物不要手改。**

语言约定：
- `agents/*.md` 正文、`skills/**/SKILL.md` 正文 → **英文**（作为 system prompt / 技能正文，英文更稳定）。
- 人类可读的交付物（README、项目账本）→ 中文。
- 每个 persona 必须包含一行语言约束：`Reply in the user's language; this owner writes Chinese.`

---

## 1. `agents/<bot>.md`

### 1.1 Frontmatter（必填，字段名严格按此拼写）

```yaml
---
id: pm                        # 小写字母/数字/连字符；同时是 preset id 与 skills/<id>/ 目录名
name: Projects Manager        # 显示名，出现在新建会话的角色选择里
description: >-               # 一句话"它做什么"，≤ 200 字符，会显示在 UI
  Runs the team's projects from a local task ledger ...
order: 10                     # 名册排序，10/20/30/40/50
skills:                       # 本 bot 专属技能目录名，必须与 skills/<id>/<name>/ 对应
  - pm-project-ops
---
```

### 1.2 正文段落（顺序固定，标题逐字使用）

```markdown
# Identity

1–3 句。你是谁；**你的席位边界**（明确写"你不做 X"——这是防止越权的关键）。
必须含一行：`Reply in the user's language; this owner writes Chinese.`

# Standing memory

从源材料「记忆」段落逐条搬运，保留原语义，可压缩措辞但不得丢事实。
每条以 `- ` 开头，5–12 条。这是常驻上下文，越短越好——只留会改变决策的内容。

# Operating rules

可执行、可判定的准则，3–8 条。写成 "If <条件> then <动作>." / "Never <行为>."
不要写空话（"要高质量"）。必须有至少一条关于"什么时候停下来问人"。

# Output style

输出约束，2–5 条。例如先给结论、不要前言、多步任务先编号、
状态用 `PASS | FAIL | BLOCKED` 之类的固定词表。
```

**persona 长度上限：正文 ≤ 90 行。** 超了就说明你在写文档而不是写人格。

---

## 2. `skills/<bot>/<skill-name>/SKILL.md`

### 2.1 Frontmatter

```yaml
---
name: pm-project-ops          # 与目录名一致，小写连字符
description: >-               # ≤ 240 字符。必须是"做什么 + 什么时候用"，这是模型唯一的发现线索
  Use when creating or running a project in the local ledger: project rows, task
  cards, staffing, and claiming work.
---
```

可选字段：`whenToUse`（更长的触发说明）、`user-invocable: false`（只给模型用）。

### 2.2 正文段落（顺序固定）

```markdown
# <技能标题>

## When to use
触发条件，2–4 条。写"证据"而不是"感觉"：什么文件/什么事件出现时用。

## Procedure
编号步骤。每步必须是**可执行动作**：读哪个文件、写哪个文件、跑什么命令、用什么模板。

## Output
产物的确切形状：文件路径、必填字段、状态词表（如 `PASS | FAIL | BLOCKED`）。

## Failure handling
失败/阻塞时怎么办：写 `STATUS BLOCKED` + 原因 + 需要谁提供什么。禁止编造。

## References
相关文件路径（可选）。需要时再读，不要把内容抄进技能。
```

**技能 ≤ 120 行。** 它是操作手册，不是论文；超出部分拆成 `references/` 子文件。

---

## 3. 编写纪律

1. **不要发明机制。** DSH 里没有的东西（Cloud Agent、Notion channel、Marketplace 提交）写成
   "在本地等价物上怎么做"，并在技能里点名用哪个工具（`read`/`write`/`bash`/`team_task_*`）。
2. **工具名要真实。** 只能出现本仓库实际存在的工具：`read` `write` `edit` `bash` `glob`
   `grep` `job_output` `todo_write` `ask_user_question` `skill` `spawn_teammate` `send_message`
   `list_agents` `wait_agent` `interrupt_agent` `team_task_create` `team_task_list`
   `team_task_get` `team_task_update` `schedule_create` `schedule_list` `schedule_edit`
   `present` `plugin_manager`（仅 `install_bundle` / `list_bundles`）。
3. **路径用仓库相对路径**（如 `projects/<name>/tasks.md`），不要写 `/Users/...` 绝对路径。
4. **占位符用尖括号**：`<product>`、`<project>`、`<owner>`。
5. 交付前自查：frontmatter 能被 YAML 解析；`skills` 里列的每个目录都存在；没有 TODO 残留。
