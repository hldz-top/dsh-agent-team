# 四人 Agent 团队（单会话模式）

一个会话里由 Lead 拉起 **4 个固定角色队友**，靠文件驱动的团队规范协作。
不依赖 Agent Preset，也不需要安装任何插件。

## 怎么用（新会话三步）

1. 新开会话，工作目录指向本项目。
2. 发一句话给 Lead：

   ```
   按 <TEAM_DIR>/team/TEAM_PROMPT.md 初始化四人团队，然后汇报报到结果
   ```

3. Lead 会建 5 条任务 → 按 `ROLE_PROMPTS.md` 逐个 `spawn_teammate` → 等回执 → 把报到结论写进 `team/BOARD.md`。

之后的活都同一句派：**「把 <目标> 建成任务派给对应角色」**。

## 四个固定角色

| 角色 | 职责 | 写入范围 |
|---|---|---|
| `pm` | 项目账本管理员：**建粗卡**、追状态、升级阻塞 | `team/BOARD.md`、`projects/**` |
| `englead` | **开发线负责人**：拆细卡 → 派 dev worker → 审查 → 汇总（**不写代码**） | `projects/**/notes/englead/` |
| `audit` | 全树审计：研究全仓 → 每个 area 至多一次 cleanup（走轻量门） | 审计分支、`projects/**/notes/audit/` |
| `qa` | **验收线负责人**：AC 包 → 派 qa worker → 判定 + UI 回归窗口 | `projects/<name>/qa/**` |

## 目录

```
team/
├── TEAM_PROMPT.md      # 团队规范 + 初始化流程 + 通用 spawn 模板 + 角色表
├── ROLE_PROMPTS.md     # 四角色全文（职责/边界/写入范围/验收/技能/文档责任）
├── DOC_PROTOCOL.md     # 文档管理机制（SSOT 分层 / 四态分离 / 裁决留痕 / 防膨胀）
├── BOARD.md            # 任务板归档（Lead 维护）
├── PLUGIN_DESIGN.md    # dsh-team-bot 自动建团设计（待审核）
├── personas/<id>.md    # 人格与常驻记忆（队友开工前读一次）
└── skills/<id>/...     # 角色技能（可执行流程：When to use / Procedure / Output / Failure）
projects/               # 项目账本：_template/ 含 project/STATUS/tasks/DECISIONS/ITERATIONS
routines/               # 例行程序（schedule_create 参数形状）
```

## 环境事实（踩过的坑，别再踩）

| 项 | 事实 | 结论 |
|---|---|---|
| `@deepseek-ai/dsh-experimental-forge-bundle` | 从 npm 装进来的是 **0.2.2-alpha.2**，DSH 运行时是 **0.2.2-rc.1** → 版本错配不兼容。官方包标 `not-removable`/`management-required`，说明它属于安装包自带集合，不该从 npm 单独装。已用 `set_bundle {enabled:false}` 关掉并从 bundles 列表移除 | **不要再装** |
| playwright MCP（`playwright-host`，端口 18081） | 已交给 **launchd LaunchAgent** 托管（`~/Library/LaunchAgents/local.playwright.mcp.plist`）：开机自启、挂了自动拉起，**不再受 DSH 重启影响** | 无需手动启动 |
| codegraph | CLI 可用（`codegraph ... -p <主仓>`）；`serve --mcp` **未接入 DSH** | 走 CLI |

playwright MCP 的运维命令：

```bash
# 状态
launchctl list | grep playwright; lsof -nP -iTCP:18081 -sTCP:LISTEN

# 重启（改配置后）
launchctl kickstart -k gui/$(id -u)/local.playwright.mcp

# 停用 / 恢复
launchctl bootout  gui/$(id -u) ~/Library/LaunchAgents/local.playwright.mcp.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/local.playwright.mcp.plist

# 日志
tail -f /tmp/playwright-mcp.log
```

> 注意：LaunchAgent 里钉的是当前 nvm node 的绝对路径。**升级 Node 后要改 plist 里的路径**，否则 launchd 起不来。

## 通读顺序（约 45 分钟）

| # | 文档 | 读它回答什么 | 时间 |
|---|---|---|---|
| 1 | `README.md` | 这是什么、怎么用、边界在哪 | 5 min |
| 2 | `team/TEAM_PROMPT.md` | 团队怎么建、怎么协作、红线是什么、怎么用工具 | 10 min |
| 3 | `team/ROLE_PROMPTS.md` | 四个角色各自的职责/边界/验收 + 临时 worker 定义 | 10 min |
| 4 | `team/DEV_PIPELINE.md` | 开发六道门、隔离与端口、自检、codeGraph、止损、合并 | 15 min |
| 5 | `team/DOC_PROTOCOL.md` | 事实写哪个文件、四态分离、裁决留痕、防膨胀 | 8 min |
| 6 | `projects/_template/` | 账本五件套 + UI 待验证队列的标准形状 | 3 min |
| 7 | `team/skills/**` | 各角色的可执行流程（按需查，不必通读） | 按需 |
| 8 | `team/PLUGIN_DESIGN.md` | `dsh-team-bot` 自动建团设计（**待审核，未实施**） | 5 min |

## 三条硬约束

1. **只有 Lead 能 spawn 和 interrupt。** 队友可以互相 `send_message`，但需要更多人手只能把方案交回 Lead。
2. **队友共享同一个工作目录和同一套工具。** 角色差异完全靠 prompt + `team/personas/` + `team/skills/` 表达；
   队友不能各自换模型。
3. **写作用域按文件切。** 两个角色写同一个文件就是冲突，冲突由 Lead 仲裁。

## 和上一版（Agent Preset）的区别

上一版把 5 个角色做成了 5 个 preset（每次新建会话选一个），已按你的要求**回滚并从 profile 卸载**。
这一版是「一个会话、一个 Lead、四个持久队友」：换会话就按 `TEAM_PROMPT.md` 重建，
角色定义活在文件里而不是会话历史里。
