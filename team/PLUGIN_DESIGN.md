# `dsh-team-bot` 设计（待审核）

> 状态：**设计稿，未实施**。审核通过后再建包、再安装。
> 目标：一个名为 `dsh-team-bot` 的 Agent Preset，选中它开一个会话，**自动**出现 4 个固定角色队友
> 和 5 条对应的任务板任务；同时具备可开发、可验证、可回滚的运行环境。

---

## 1. 目标与非目标

**目标**
1. Preset id = `dsh-team-bot`，插件包名 = `dsh-team-bot`（同一个名字，两处引用）。
2. 选中该 preset 的新会话，**首轮自动**建好团队：4 条任务板任务 + 4 个 teammate，顺序固定。
3. 团队规范、角色文本、文档机制继续从 `team/` 读（**提示词不硬编码进插件**，只硬编码"去哪读"）。
4. 可开发：改 JS 不改包结构，重装即可生效；有验证清单。

**非目标**
- 不做 5 个独立 preset（那是上一版被否掉的方案）。
- 不让队友拥有不同模型或不同工具集（DSH 硬约束：队友继承 Lead 的 preset）。
- 不替代 `TEAM_PROMPT.md` 的人工初始化流程——自动建团是**加速**，不是唯一入口。

---

## 2. 包结构

```
team/dsh-team-bot/
├── package.json          # name: "dsh-team-bot"  dsh.bundle.patch → ./cordis.patch.yml
├── cordis.patch.yml      # 1 个 preset 声明 + 1 个 host 插件行
├── index.js              # 自动建团插件（纯 ESM，无构建、无依赖）
├── README.md             # 安装 / 开发 / 验证 / 回滚
└── scripts/
    ├── install.sh        # 装进当前 desktop profile
    └── verify.sh         # 验证 preset 已激活
```

`package.json` 关键字段：

```json
{
  "name": "dsh-team-bot",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

> 为什么不写 TypeScript：这个插件只用 `ctx` 上的既有服务，没有类型收益；纯 ESM 省掉构建步骤，
> 改完直接重装就生效，更适合快速迭代。**不导出 `Config`**——避免依赖 `@deepseek-ai/schemastery`，
> 配置一律从 `team/` 目录读。

---

## 3. `cordis.patch.yml` 组成

```yaml
# 1) host 层：自动建团插件（顶层行，全局只一份）
- insert:
    - id: team-bootstrap
      name: dsh-team-bot
      config:
        teamDir: <TEAM_DIR>/team
        autoBootstrap: true

# 2) preset 声明：出现在「新建会话」的角色选择里
    - id: preset-dsh-team-bot
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: dsh-team-bot
        name: DSH Team Bot
        description: 一个会话 + 四个固定角色队友（pm/englead/audit/qa），首轮自动建团。
        order: 0
        plugins:
          - id: persona
            name: '@deepseek-ai/dsh-persona'
            config:
              prefix: <lead 人格，来自 team/personas/lead.md>
          - id: agent-instructions
            name: '@deepseek-ai/dsh-agent-instructions'
            config: { maxBytes: 65536 }
          - id: time-context
            name: '@deepseek-ai/dsh-time-context'
          # 代码图谱：codegraph serve --mcp（stdio），给所有 worker 提供
          # mcp__codegraph__query / explore / node / callers / callees / impact / affected
          - id: mcp-codegraph
            name: '@deepseek-ai/dsh-mcp-client'
            config:
              serverName: codegraph
              transport: stdio
              command: codegraph
              args: ["serve", "--mcp"]
          # 工具：与 standard 一致（bash/fs/fs-search/jobs/schedule/skill/todo/ask-user/web/present）
          # + compaction group + delegation group + plan-mode
          # 团队九件套由 host 层 team bundle 提供，这里不重复声明
```

> **人格来源**：预设的 persona `prefix` 需要一段固定文本。生成方式：安装时由 `scripts/install.sh`
> 读 `team/personas/lead.md` 贴进 YAML（或直接把文本内联，改人格时改 YAML 再重装）。
> 计划新增 `team/personas/lead.md`——Lead 也是角色，应该有自己的记忆与准则。

---

## 4. 自动建团逻辑

### 4.1 触发与守卫

```
on 'agent/created'(agent):
  # 守卫 1：只处理本 preset 的会话
  if composedPreset(agent.ctx) !== 'dsh-team-bot' → return
  # 守卫 2：只处理 Lead（队友的 membership.role === 'teammate'）
  m = agentTeams.tryMembership(agent)
  if m?.role !== 'lead' → return
  # 守卫 3：幂等——已经有成员就不再建（重进会话/热重载都安全）
  if agentTeams.listMembers(agent).length > 0 → return
  # 守卫 4：同一个 Session 只尝试一次（进程内 Set，防重入）
  if bootstrapped.has(agent.id) → return
  bootstrapped.add(agent.id)

  # 延迟到本轮边界之后，避免与 Agent 创建过程重入
  ctx.timeout(0) → bootstrap(agent)
```

### 4.2 建团动作（顺序固定）

```
bootstrap(agent):
  1. 读 team/BOARD.md 的当前轮号 R<n>（读不到就 R1）
  2. createTask × 4，subject 前缀带 [R<n>]，write_scopes 取自 ROLE_PROMPTS §3
  3. spawnTeammate × 4，顺序 pm → englead → audit → qa
     - prompt = TEAM_PROMPT §2 模板 + ROLE_PROMPTS 对应段落 + 文档纪律 4 条
     - context = 'fresh'，provider = 'spawn'
  4. 任一步失败 → 记录 diagnostics，不中断后续；失败的成员留给 Lead 用工具兜底重建
```

### 4.3 失败兜底（重要）

自动建团依赖 3 个我**尚未在同一进程里实测过**的事实（见 §6）。因此插件**同时**注册一个模型工具：

```
team_bootstrap(mode: 'status' | 'resume')
  - status：报告"任务建了几条、成员几个、谁失败了"
  - resume：把失败的步骤补齐（幂等，不重复建）
```

即使自动路径失效，用户只要说一句"用 team_bootstrap 补建团队"就能恢复，不会卡死。

### 4.4 用到的服务（已确认存在）

| 服务 | 方法 | 用途 |
|---|---|---|
| `ctx.agentTeams` | `tryMembership` / `listMembers` / `spawnTeammate` / `createTask` | 全部团队操作 |
| `ctx.agentPresets` | `composedPreset` / `presetForSession` | 判断当前 preset |
| `ctx.tools` | `register` | 注册 `team_bootstrap` 兜底工具 |
| `ctx.timeout` | — | 延迟到轮边界 |

`spawnTeammate` 的完整签名已核对：
`{ name, description, prompt: ContentBlock[], context: 'fresh'|'fork', provider: string, signal }`。

---

## 5. 提示词从哪来（不硬编码）

插件只硬编码**三个路径**，文本全部从仓库读：

| 内容 | 来源 |
|---|---|
| Lead 人格 | `team/personas/lead.md` |
| 通用 spawn 模板 | `team/TEAM_PROMPT.md` §2 |
| 角色段落 | `team/ROLE_PROMPTS.md` 各角色节 |
| 文档纪律 | `team/DOC_PROTOCOL.md` §6（四条压缩版） |

好处：改角色文本不用改代码、不用重装；坏处：`team/` 被移动会失效 →
配置项 `teamDir` 显式声明，读不到时**不静默失败**，而是在 `team_bootstrap status` 里报错。

---

## 6. 风险与待验证点（实施时逐个确认）

| # | 风险 | 影响 | 计划 |
|---|---|---|---|
| 1 | `agent/created` 事件在 preset 场景下是否可达 | 自动建团不触发 | 实施时先用最简探针打印事件，再写逻辑 |
| 2 | 能否在 Agent 创建流程中直接 `spawnTeammate`（是否重入） | 建团失败 | 已设计 `ctx.timeout(0)` 延迟 + 兜底工具 |
| 3 | `tryMembership(lead)` 在首次 spawn 前是否已返回 `role:'lead'` | 守卫误判 | 实施时实测；退化为"preset + 空名册"双条件 |
| 4 | 队友继承 preset 后再次触发 `agent/created` | 递归建团 | 守卫 2/3/4 三重防护 + 进程内 Set |
| 5 | `ContentBlock[]` 的构造形状 | prompt 不生效 | 参照 team 工具实现构造纯文本块 |
| 6 | 插件是 host 行还是 preset 内行 | 事件可见性不同 | 计划 host 行（全局一份、事件可见性最大） |

> 任何一项验证失败，都退回"手动初始化 + `team_bootstrap` 工具"，不影响团队本身可用。

---

## 7. 开发运行环境

### 7.1 安装

```bash
cd <TEAM_DIR>/team/dsh-team-bot
bash scripts/install.sh      # 等价于 plugin_manager install_bundle（本地目录，link 依赖）
```

### 7.2 开发循环

改 `index.js` → 重跑 `install.sh`（bundle 是 `link:` 依赖，不需要重装 node_modules）→
**新建会话**验证。已有会话保留旧插件版本。

### 7.3 验证清单

| 步骤 | 期望 |
|---|---|
| 1. `plugin_manager list_plugins` | 出现 `preset-dsh-team-bot`，`enabled: true, fiberPhase: active` |
| 2. 新建会话选 `DSH Team Bot` | 会话开场自称团队 Lead |
| 3. 首轮结束 | 团队面板出现 4 个队友；任务板出现 4 条任务 |
| 4. 对 Lead 说"汇报报到结果" | 4 个队友各自回执，Lead 汇总 |
| 5. `team_bootstrap status` | 报告 5/5 成员、5/5 任务 |

### 7.4 回滚

```bash
# 卸载
plugin_manager { action: "remove_bundle", target: "dsh-team-bot" }
```
仓库文件不动；团队仍可用手动流程（`TEAM_PROMPT.md`）重建。

---

## 8. 交付顺序（审核通过后）

1. 建 `team/personas/lead.md`（Lead 人格与记忆）
2. 建 `team/dsh-team-bot/` 包骨架（package.json + cordis.patch.yml + index.js）
3. 写探针验证风险 #1/#2/#3（先跑通最小事件回显，再写建团逻辑）
4. 实现 `bootstrap` + `team_bootstrap` 兜底工具
5. `install.sh` 安装 → 按 §7.3 逐项验证
6. 把 `TEAM_PROMPT.md` §9 改为"推荐用 `dsh-team-bot` 一键建团，手动流程作为兜底"
