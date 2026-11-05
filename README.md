# 五人 Agent 团队（单会话模式）

一个会话里由 Lead 拉起 **5 个固定角色队友**，靠文件驱动的团队规范协作。
不依赖 Agent Preset，也不需要安装任何插件。

## 怎么用（新会话三步）

1. 新开会话，工作目录指向本项目。
2. 发一句话给 Lead：

   ```
   按 <TEAM_DIR>/team/TEAM_PROMPT.md 初始化五人团队，然后汇报报到结果
   ```

3. Lead 会建 5 条任务 → 按 `ROLE_PROMPTS.md` 逐个 `spawn_teammate` → 等回执 → 把报到结论写进 `team/BOARD.md`。

之后的活都同一句派：**「把 <目标> 建成任务派给对应角色」**。

## 五个固定角色

| 角色 | 职责 | 写入范围 |
|---|---|---|
| `pm` | 项目账本管理员：立项、拆卡、分派、追状态、升级阻塞 | `team/BOARD.md`、`projects/**` |
| `englead` | 代码域执行与评审：拆解 → 实现 → 自检 → 交 Review | 按任务卡指定的代码与本地配置 |
| `audit` | 全树审计：研究全仓 → 每个 area 至多一次 cleanup | 审计分支、`team/notes/audit-*.md` |
| `qa` | 验收门：AC 包 → `PASS \| FAIL \| BLOCKED` | `projects/<name>/qa/**` |
| `tinkabot` | 插件封装：API → bundle，本地证明后才谈发布 | `plugins/**`、`team/skills/tinkabot/**` |

## 目录

```
team/
├── TEAM_PROMPT.md      # 团队规范 + 初始化流程 + 通用 spawn 模板 + 角色表
├── ROLE_PROMPTS.md     # 五角色全文（职责/边界/写入范围/验收/技能/文档责任）
├── DOC_PROTOCOL.md     # 文档管理机制（SSOT 分层 / 四态分离 / 裁决留痕 / 防膨胀）
├── BOARD.md            # 任务板归档（Lead 维护）
├── PLUGIN_DESIGN.md    # dsh-team-bot 自动建团设计（待审核）
├── personas/<id>.md    # 人格与常驻记忆（队友开工前读一次）
└── skills/<id>/...     # 角色技能（可执行流程：When to use / Procedure / Output / Failure）
projects/               # 项目账本：_template/ 含 project/STATUS/tasks/DECISIONS/ITERATIONS
routines/               # 例行程序（schedule_create 参数形状）
```

## 三条硬约束

1. **只有 Lead 能 spawn 和 interrupt。** 队友可以互相 `send_message`，但需要更多人手只能把方案交回 Lead。
2. **队友共享同一个工作目录和同一套工具。** 角色差异完全靠 prompt + `team/personas/` + `team/skills/` 表达；
   队友不能各自换模型。
3. **写作用域按文件切。** 两个角色写同一个文件就是冲突，冲突由 Lead 仲裁。

## 和上一版（Agent Preset）的区别

上一版把 5 个角色做成了 5 个 preset（每次新建会话选一个），已按你的要求**回滚并从 profile 卸载**。
这一版是「一个会话、一个 Lead、五个持久队友」：换会话就按 `TEAM_PROMPT.md` 重建，
角色定义活在文件里而不是会话历史里。
