# Grok Bot 式 Agent 团队（DeepSeek Harness）

把 Grok Bot 的"成员制 bot + 团队协作"落成 DSH 原生机制：**5 个 Agent Preset**（身份层）
+ **Agent Teams**（协作层）+ **本地 Markdown 账本**（项目层）。

## 1. 架构：为什么是三层

Grok Bot 里"bot"同时是身份、技能包、集成、例行程序。DSH 把这些拆在不同层次，且
`spawn_teammate` **不能指定 preset 或模型**——队友继承 Lead 会话的 preset。所以不能
"在一个团队会话里塞 5 个不同人格"，必须分层：

```
┌ 身份层 ───────────────────────────────────────────────┐
│ 5 个 Agent Preset：pm / audit / englead / qa / tinkabot │
│ 每个 preset = persona(记忆) + 技能目录 + 工具集          │
│ 你「新建会话」时选一个角色 → 就是那个 bot 在你的席位上工作 │
└───────────────────────────────────────────────────────┘
┌ 协作层 ───────────────────────────────────────────────┐
│ Agent Teams：spawn_teammate / send_message / wait_agent │
│ 共享任务板：team_task_*(owner, blocked_by, revision)    │
│ 任一席位在自己的会话里可当 Lead，拉同名 preset 的队友并行 │
└───────────────────────────────────────────────────────┘
┌ 项目层 ───────────────────────────────────────────────┐
│ projects/<name>/：project.md + tasks.md + qa/ + notes/  │
│ 跨 bot 调度 = 认领制（任务卡 + 定时巡场），不是编排器     │
└───────────────────────────────────────────────────────┘
```

## 2. 成员

| preset id | 名称 | 席位职责 | 专属技能 |
|---|---|---|---|
| `pm` | Projects Manager | 立项、拆卡、分派、追状态、升级阻塞；**不亲自做专业工作** | `pm-project-ops` |
| `audit` | Nightly Audit Engineer | 夜间整树研究 + 每个 area 一个 cleanup | `audit-codebase-research`、`audit-one-cleanup-per-area` |
| `englead` | Engineering Lead | 拥有闭环：拆解 → 派工 → 追 CI → 摘要 | `eng-lead-decompose`、`eng-lead-chase`、`eng-lead-digest` |
| `qa` | QA Bot | AC 包 → BLOCK/WARN → `PASS \| FAIL \| BLOCKED` | `qa-ac-fail-gate`、`qa-adhd-response` |
| `tinkabot` | tinkabot | 把 API 封成 bundle（MCP + skills），本地证明后再谈发布 | `tinkabot-wrap-api-as-plugin`、`tinkabot-publish-plugin` |

所有席位额外共享 `skills/_team/team-protocol`（账本、认领、团队工具的协作契约）。

## 3. 目录

| Path | 作用 | 谁写 |
|---|---|---|
| `TEMPLATE.md` | 源文件格式契约 | Lead |
| `agents/<id>.md` | 人格 + 记忆 + 操作准则（**源**） | 各席位 |
| `skills/<id>/<skill>/SKILL.md` | 席位专属技能 | 各席位 |
| `skills/_team/team-protocol/SKILL.md` | 共享协作契约 | Lead |
| `scripts/build-bundle.mjs` | 源 → `team-bundle/cordis.patch.yml` | Lead |
| `scripts/validate-bundle.mjs` | 安装前校验 | Lead |
| `team-bundle/` | **产物**，可安装的 DSH bundle | 生成，勿手改 |
| `projects/<name>/` | 项目账本（`_template/` 是脚手架） | 各席位 |
| `routines/` | 例行程序的 schedule_create 参数形状 | Lead |

## 4. 快速开始

```bash
cd <TEAM_DIR>

node scripts/build-bundle.mjs      # 生成 team-bundle/cordis.patch.yml
node scripts/validate-bundle.mjs   # 校验：YAML、preset 字段、技能目录、!!js 位置
```

安装（在 DSH 会话里对 Lead 说，或直接调工具）：

```
plugin_manager {
  action: "install_bundle",
  target: "<TEAM_DIR>/team-bundle"
}
```

装完在 **新建会话 → 角色选择** 里会多出这 5 个 bot（和 standard/ptc/minimal/cordis 并列）。
安装需要 Full access 或审批：bundle 声明会以 YAML 形式在 Host 进程里执行插件。

> **当前状态：已安装并启用**（`@local/dsh-grok-team@1.0.0`，见第 9 节验证记录）。
> 已有会话保留启动时的插件版本；要看到新的 5 个角色，请刷新页面后**新建会话**。

**改了人格/技能之后**：重新 `build-bundle` → 重新 `install_bundle` → **新建会话**验证。
已有会话保留它启动时的插件版本，旧会话看不到改动。

## 5. 跑一个项目

1. 新建会话，角色选 **Projects Manager**，工作目录选目标仓库。
2. 说清楚目标与成功标准。PM 会 `cp projects/_template/` 建项目目录、写 `project.md`，
   再按 area 拆卡写进 `tasks.md`，并为每张卡建共享任务（`team_task_create`）。
3. 换一个会话，角色选执行席位（如 `englead`），让它 `team_task_list` → 认领 → 干活 →
   把卡移到 `Review`。
4. 需要并行时，由该会话的席位当 Lead：`spawn_teammate` 派工，`wait_agent` 等变化，
   `team_task_update` 收敛状态。Lead 自己不下场做专业工作。
5. QA：角色 `qa`，跑 AC 包 → `projects/<name>/qa/run-YYYY-MM-DD-<slug>.md`。

任务卡格式（字段由 `pm` 定义，别分叉）：
`Id` `Status` `Owner` `Scope` `Depends on` `Blocked by` `Acceptance` `Note`；
状态词表 `Todo · In Progress · Blocked · Review · Done`。

## 6. 例行程序

`routines/nightly-audit.md` 有可直接粘贴的 `schedule_create` 形状（04:00 每日）。
**定时任务继承创建时会话的 preset 与工作目录**——所以必须在目标席位的会话里创建，
否则醒来的不是那个 bot。创建后先用 `schedule_list` 确认时区，首次投递要求 bot 先问 owner。

## 7. 与 Grok Bot 的已知差异

| Grok Bot | 本方案 | 影响 |
|---|---|---|
| bot 绑定模型 | 模型是**会话级**选择 | 同一 bot 可换模型；无法在 preset 里锁死 |
| 一个团队含多种 bot | 队友继承 Lead 的 preset | 异构 bot 并存 = 换会话，不是同一队 |
| Notion Projects/Tasks | 本地 Markdown 账本 | 无多端同步；换来可 diff、可 blame、可离线 |
| Cloud Agent | Agent Teams 队友 | 共享同一 cwd，无 worktree 隔离 |
| GitHub PR / Vercel | 分支+提交+Review 卡；bash 比对 SHA | 无自动 PR 监听，靠 `send_message` 触发 |
| pstack 插件 | 无等价物 | tinkabot 会明说缺席并给替代做法 |
| Marketplace 发布 | 无 | 只能产出本地 bundle |

## 8. 维护

- **单一真源是 `agents/` 和 `skills/`**，`team-bundle/cordis.patch.yml` 永远是生成物。
- 新增席位：按 `TEMPLATE.md` 写 `agents/<id>.md` + `skills/<id>/`，在
  `scripts/build-bundle.mjs` 的 `ROLE` 表里加一行（决定 plan/goal 能力）。
- 生成文件里 `customSkillDirs` 是**绝对路径**。搬动本目录后必须重新 build + 重新 install。
- 想稳定到 `~/.dsh/team/`：整目录搬过去再重建重建即可，逻辑不变。

## 9. 安装验证记录

| 检查项 | 结果 |
|---|---|
| `validate-bundle.mjs` | OK — 5 preset / 94 plugin row / 784 行 |
| bundle 安装 | `@local/dsh-grok-team@1.0.0` → profile bundles 列表末位 |
| Loader 挂载 | `preset-pm` / `preset-audit` / `preset-englead` / `preset-qa` / `preset-tinkabot` 全部 `enabled: true, fiberPhase: active` |
| Config schema | 9 条 `@deepseek-ai/dsh-agent-preset` 条目（原 4 + 新 5）均可查询 |
| 技能目录 | 11 个 `SKILL.md`（10 席位技能 + 1 共享协议），`customSkillDirs` 绝对路径全部存在 |

**尚未验证（需要你操作一次）**：新会话里实际选中某个 bot 后，persona 是否按预期生效、
该席位的技能目录是否只出现在它的目录下。前者看开场自称，后者看 `skill` 工具列出什么。

**回滚**：`plugin_manager { action: "set_bundle", target: "@local/dsh-grok-team", enabled: false }`
（或 `remove_bundle`）。停用不影响仓库里任何文件。

## 10. 版本控制

本仓库已 `git init`（`main` 分支，首个提交 `c8a099c`）。账本之所以可信，是因为它可 diff、
可 blame、可回滚——"只存在于聊天里的状态等于没发生"这条规则依赖于此。
