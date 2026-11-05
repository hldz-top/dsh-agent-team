# 例行程序：夜间代码质量审计（04:00）

DSH 没有 Grok Bot 的"自动化任务"面板；等价物是 Host 级 `schedule` 服务 + `schedule_create`
工具。定时任务会**继承创建它的那个会话的 preset 与工作目录**，所以必须在 `audit` 席位的
会话里创建，才会以 Nightly Audit Engineer 的身份醒来。

## 1. 在哪创建

在 Web 里新建会话 → 角色选 **Nightly Audit Engineer** → 工作目录选目标仓库 → 让 bot 执行：

```
创建这个团队的夜间审计例行程序。用 schedule_create：
- title: 夜间代码质量审计
- target: new            （每晚开一个新会话，保留历史可追溯）
- rrule 两行：
    DTSTART;TZID=Asia/Taipei:20261106T040000
    RRULE:FREQ=DAILY
- prompt: 见下方
```

## 2. prompt 正文（可直接粘贴）

```text
Status: TODO — nightly code-quality audit

You are the Nightly Audit Engineer waking on schedule. Do this pass:

1. Read projects/<name>/project.md and tasks.md. If no project is bound to this repo,
   ask the owner once which project this is, then stop for tonight (STATUS BLOCKED).
2. Research the whole tree before proposing anything: git log --oneline -30,
   git status, then read/grep/glob over the areas listed in project.md.
3. Write findings to projects/<name>/notes/audit-YYYY-MM-DD.md as a list of areas,
   each with evidence (file:line) and a one-line verdict: clean | cleanup | root-cause.
4. Ship ONE cleanup per area, largest-friction area first. Each cleanup:
   - its own branch and its own commit (never one combined diff)
   - a task card in tasks.md with Status: Review and the diff summary
   - net-new lines must be justified in one sentence; reuse/delete wins ties
5. If a fix keeps spawning adjacent findings in one subsystem, stop patching it.
   Record the churn signal in the notes file and propose a structural fix instead.
6. If nothing is worth shipping, write "no cleanup warranted" with the evidence and
   stay quiet. Do not manufacture work.

Never touch production config, never push, never merge. Report only a 5-line digest:
areas scanned, cleanups shipped, churn signals, blocked-on-owner, next candidate.
```

## 3. 创建后必须做的两件事

1. `schedule_list` 确认 `nextOccurrence` 是本地 04:00（时区写错是最常见的事故）。
2. 首次投递时让 bot **先问 owner 跑不跑**——owner 的原始要求是 "asks when to run before
   it starts"。要改时间就用 `schedule_edit`，不要重新创建一个。

## 4. 其它成员的例行程序形状

| 席位 | 触发 | target | rrule |
|---|---|---|---|
| `englead` | 工作日 09:00 巡场 + 每日摘要 | `new` | `DTSTART;TZID=Asia/Taipei:20261106T090000` + `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` |
| `qa` | 合并后 fail-gate | `new_once`（同一会话连续追） | 无固定时间；由 englead 在任务卡进入 `Review` 时 `send_message` 唤醒 |

> `qa` 的 post-merge gate 在 DSH 里没有 GitHub PR 监听器。落地方式：`englead` 在合并提交后
> 把卡移到 `Review` 并 `send_message` 给 qa；qa 用 bash 比对 `git rev-parse HEAD` 与部署地址
> 返回的 SHA，不一致就 `STATUS BLOCKED`。
