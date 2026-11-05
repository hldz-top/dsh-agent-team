# AC-PACK — team-sandbox R1 验收用例包

> 版本 `v1.2`（2026-11-05）。这是"人怎么验"的清单，不是自动化测试代码；pytest 由 dev worker 产出，不属于本包。
> 用例作者：**qa 席位**；执行者：**qa-click worker（subagent）**。作者与执行者必须是不同 worker。
>
> 变更（v1.1 → v1.2，执行前定稿）：按 Lead 最终裁决，AC-09「21 字符上限」**恢复 `BLOCK`**
> （该上限已并入本轮 T-001 Scope）；新增 **AC-12**（非对象 JSON 体 / 非字符串 `title` 导致连接
> 断开）标 `WARN` + 范围外已知缺陷；AC-06 维持 `WARN`。**所有期望值自 v1 起未改。**

| 项 | 值 |
|---|---|
| pack_version | `v1.2` |
| 契约事实源 | team-sandbox `docs/API.md`，sha256 `66c61899690510bc388e45cf966bbd4c41211238d811fb1f212016d8e7b853ad` |
| Round A 基线（未修复） | `main` @ `db39d79219c63a2ff596a2fc14652f6756a101a5` |
| Round B 基线（已修复） | 修复分支 `fix/api-contract-*`（分支名/commit 由 englead 提供，执行时记录实际 SHA） |
| 执行环境 | `http://127.0.0.1:<port>`，端口必须在 **8770-8779** 段内 |
| 截图目录 | `projects/team-sandbox/notes/qa/screenshots/` |
| 判定词表 | `PASS` \| `FAIL` \| `BLOCKED`，只有这三个词 |

## 0. 判定语义

- `PASS`：全部 `BLOCK` 用例通过，`WARN` 用例通过或已列明。
- `FAIL`：任一 `BLOCK` 用例未通过（期望 vs 实际不符）。`WARN` 失败不阻塞发布，但必须列出。
- `BLOCKED`：**拿不到证据**——服务起不来、浏览器通道不可用、SHA 取不到、缺少截图；
  不允许用 `BLOCKED` 掩盖已观察到的失败。
- 严重度：`BLOCK` = 阻塞发布；`WARN` = 记录在案不阻塞。**软通过一律视为伪造证据。**
- 禁止改期望值凑绿；用例表版本锁定为 `v1.2`，执行期间不得修改本文件。

## 0.1 范围声明（Lead 裁决，2026-11-05）

本轮绑定卡 T-001 的 Scope 含三处偏差：**空/纯空白标题必须 400**、**列表必须最新在前**、
**标题 20 字符上限（超限 400）**。`docs/API.md` 是契约事实源，以下项不在本轮 Scope：

- **AC-12（新增，`WARN`）**：非对象 JSON 体（`[]` / `"abc"`）或非字符串 `title`（`123`）会让
  `do_POST` 抛 `AttributeError`、连接直接断开（实测 `RemoteDisconnected`），既无 500 也无
  `{"error":...}`，违反 `docs/API.md:31`（错误响应都应是 `{ "error": "<code>" }`）。
  这是 audit 体检发现、**不在本轮 Scope**：Round A/B 均预期 FAIL 但只进 `warn_items` 并写下轮候选，
  **不阻塞**本轮判定。
- `AC-06`（缺 `title` 字段）、`AC-07`（非法 JSON 的 error code 值）、`AC-10`（trim 存储形态）：
  契约只覆盖"去空白后为空"或只约定错误形状，属灰度项，一律 `WARN`。
- `AC-08`（20 字符应通过）与 `AC-09`（21 字符 → 400）均保留 `BLOCK`：上限已并入本轮 Scope，
  两轮都必须 PASS。
- 以上分级只改**严重度**（是否阻塞本轮发布），**没有任何期望值被修改**。

## 1. 执行约定（worker 必须遵守）

1. 起服务：`bash` 中 `cd <PROJECT_REPO>`（Round A）或 worktree（Round B）→
   `python3 app/server.py <port>` 后台运行；就绪判据：`GET /api/todos` 返回 200。
2. 浏览器：只用 `mcp__playwright-host__browser_*`，**一律 headless**；不弹有头窗口。
3. 每步截图落 `projects/team-sandbox/notes/qa/screenshots/YYYY-MM-DD-HHmm-<场景>-<序号>.png`，
   `<场景>` 用用例 ID（如 `AC-03`）；无截图 = 无证据。
4. 页面固定选择器（本轮前端不改，以下均以 `main` 的 `app/static/index.html` 为准）：

   | 元素 | 选择器 |
   |---|---|
   | 标题输入框 | `#title` |
   | 提交按钮 | `#add` |
   | 错误提示 | `#error`（textContent 应为后端 `error` code） |
   | 列表容器 | `#list` |
   | 单条待办 | `#list li`（`data-id` = 条目 id） |
   | 标题文本 | `#list li .title` |
   | 完成勾选框 | `#list li input[type="checkbox"]` |
   | 已完成 class | `li.done` |

5. 状态基线：服务是**内存存储**，进程重启即清空。用例断言一律相对于「该用例开始时」的状态：
   先 `GET /api/todos` 记 `N = items.length`，再断言 `N + 增量`；不依赖种子数据。
6. API 层断言可用 `bash` + `curl` 或页面内 `fetch`；两者都算接口字段证据。
7. 按用例 ID 升序执行（AC-01 → AC-12；AC-12 在表中列于反向组，但按 ID 最后执行）。每个用例执行后
   立即记录：`实际值`、`PASS/FAIL`、截图路径。失败**不要中断整轮**，继续跑完后统一汇总
   （服务崩溃 / 浏览器不可用除外）。
8. 跑完 `kill` 服务，确认端口释放。

## 2. 用例总表

| 类别 | 条数 | 严重度构成 | 覆盖 |
|---|---|---|---|
| 正向 | 2 | BLOCK 2 | 合法创建、最新在前 |
| 反向 | 6 | BLOCK 3 + WARN 3 | 空标题、纯空白、缺字段、非法 JSON、畸形请求体 |
| 边界 | 3 | BLOCK 2 + WARN 1 | 20 字符、21 字符、首尾空白 trim |
| 全流程 | 1 | BLOCK 1 | 创建 3 条 → 顺序 → 勾选 → 刷新保持 |

共 12 条：`BLOCK` 8 条（AC-01/02/03/04/05/08/09/11），`WARN` 4 条（AC-06/07/10/12）。

### 2.1 正向（2 条）

| ID | 类别 | 严重度 | 前置 | 步骤 | 期望 | 断言点 |
|---|---|---|---|---|---|---|
| AC-01 | 正向 | BLOCK | 服务已就绪；页面已打开 `http://127.0.0.1:<port>/` | 1) `#title` 填 `milk` 2) 点 `#add` 3) 等列表刷新 | 创建成功（201），列表出现 `milk`，`done=false` | 最近一次 `POST /api/todos` 响应 `status==201` 且 `body.title=="milk"`、`body.done==false`；`#list li .title` 中存在文本 `milk`；`GET /api/todos` 中 `items.some(i => i.title==="milk" && i.done===false)` |
| AC-02 | 正向 | BLOCK | 当次运行内已存在一条较早创建的 `milk`（AC-01 的产物即可） | 1) `#title` 填 `bread` 2) 点 `#add` 3) 读列表与接口 | 最新创建的排在最前：`bread` 在 `milk` 之前 | `GET /api/todos` 满足 `items[0].title==="bread"` 且 `items[1].title==="milk"`；`#list li:nth-child(1) .title` 文本 `=="bread"` |

### 2.2 反向（6 条）

| ID | 类别 | 严重度 | 前置 | 步骤 | 期望 | 断言点 |
|---|---|---|---|---|---|---|
| AC-03 | 反向 | BLOCK | 记 `N = GET /api/todos items.length`；页面已打开 | 1) `#title` 留空 2) 点 `#add` 3) 等 1s 观察错误区与列表 | 拒绝创建：400 + `title required`；列表条数不变；无空标题条目 | `POST` 响应 `status==400` 且 `body.error=="title required"`；`#error` textContent `=="title required"`；`#list li` 数量 `== N`；`GET items.length==N` 且 `items.every(i => i.title.trim()!=="")` |
| AC-04 | 反向 | BLOCK | 记 `N = items.length`；页面已打开 | 1) `#title` 填 3 个空格 `"   "` 2) 点 `#add` 3) 观察错误区与列表 | 同 AC-03（纯空白等价空标题） | 同 AC-03：status 400、`body.error=="title required"`、`#error=="title required"`、条数仍 `N` |
| AC-05 | 反向 | BLOCK | 记 `N = items.length` | `bash` 直打接口：`curl -s -X POST http://127.0.0.1:<port>/api/todos -H 'Content-Type: application/json' -d '{"title":"   "}'`，记录 HTTP code 与 body | 接口层同样拒绝：400 + `{"error":"title required"}`，不创建 | HTTP `status==400`；`body.error=="title required"`；随后 `GET items.length==N` |
| AC-06 | 反向 | WARN | 记 `N = items.length` | `bash` 直打接口：`-d '{}'`（缺 `title` 字段） | 400 + `title required`，不创建（契约灰度：明文只覆盖"去空白后为空"，缺字段是推论，见 §0.1） | HTTP `status==400`；`body.error=="title required"`；`GET items.length==N`；失败只进 `warn_items` |
| AC-07 | 反向 | WARN | 记 `N = items.length` | `bash` 直打接口：`-d '{bad json'`（非法 JSON） | 400 且响应体是 `{ "error": "<code>" }` 形状（契约只约定形状，未钉死 code 值） | HTTP `status==400`；`body` 为对象且 `typeof body.error==="string"`、长度 `>0`；`GET items.length==N` |
| AC-12 | 反向 | WARN | 记 `N = items.length` | `bash` 对三个畸形请求体各打一次 `POST /api/todos` 并记录 HTTP code/body/退出码：1) `-d '[]'`（非对象 JSON）2) `-d '"abc"'`（非字符串 JSON）3) `-d '{"title":123}'`（非字符串 title） | 三次都必须回 JSON 错误响应且连接不断开（`docs/API.md:31`：所有错误响应都是 `{ "error": "<code>" }`），且不创建条目；**范围外已知缺陷**（见 §0.1） | 每次：连接未断开（无 `RemoteDisconnected`，curl 退出码 `==0`）、HTTP 状态码存在且 `>=400`、`body` 为对象且 `typeof body.error==="string"`；`GET items.length==N`；任一不满足记 FAIL，只进 `warn_items` |

### 2.3 边界（3 条）

| ID | 类别 | 严重度 | 前置 | 步骤 | 期望 | 断言点 |
|---|---|---|---|---|---|---|
| AC-08 | 边界 | BLOCK | 后端新起或记 `N = items.length`；页面已打开 | 1) `#title` 填 `AAAAAAAAAAAAAAAAAAAA`（恰好 20 字符）2) 点 `#add` 3) 读接口响应 | 在上限内，创建成功：201，`title` 长度 20 | `POST` `status==201`；`body.title==="AAAAAAAAAAAAAAAAAAAA"` 且 `body.title.length===20`；`#list li .title` 含该 20 字符文本 |
| AC-09 | 边界 | BLOCK | 记 `N = items.length`；页面已打开 | 1) `#title` 填 `BBBBBBBBBBBBBBBBBBBBB`（21 字符）2) 点 `#add` 3) 观察错误区与列表 | 超限拒绝：400 + `{"error":"title too long"}`，不创建（上限已并入本轮 T-001 Scope） | 最近 `POST` `status==400` 且 `body.error=="title too long"`；`#error` textContent `=="title too long"`；`#list li` 数量 `== N`；`GET items.length==N` |
| AC-10 | 边界 | WARN | 记 `N = items.length`；页面已打开 | 1) `#title` 填 `"  milk  "`（前后各 2 空格）2) 点 `#add` 3) 读接口响应与 DOM | 创建成功且首尾空白被去掉：`title=="milk"`（契约未明文规定非空标题的存储形态，故记 WARN） | `POST` `status==201` 且 `body.title==="milk"`；`#list li .title` 中该条文本 `=="milk"`（无首尾空格）；`GET items.length==N+1` |

### 2.4 全流程（1 条）

| ID | 类别 | 严重度 | 前置 | 步骤 | 期望 | 断言点 |
|---|---|---|---|---|---|---|
| AC-11 | 全流程 | BLOCK | **重启服务**确保空列表（内存存储），`GET items.length==0`；页面已打开 | 1) 依次创建 `milk`、`bread`、`eggs`（先 `#title` 再 `#add`）2) 读 `GET /api/todos` 与 DOM 顺序 3) 点 `#list li:nth-child(1) input[type="checkbox"]` 4) 等刷新 5) 用 `browser_navigate` 重新打开同 URL（等价刷新）6) 复查 | 创建 3 条 → 最新在前（`eggs,bread,milk`）→ 勾选第一条变为完成 → 刷新后顺序与完成态保持；全程无第 4 条 | 步骤 2：`GET items.map(i=>i.title)` 恰为 `["eggs","bread","milk"]`；`#list li` 数 `==3`；`#list li:nth-child(1) .title=="eggs"`。步骤 4：`PATCH` 响应 `status==200` 且 `body.done===true`（`body.id` 为 `eggs` 的 id）；`#list li:nth-child(1)` 的 classList 含 `done`；该行 checkbox `checked===true`。步骤 6：刷新后 `#list li` 数 `==3`；第一行仍 `eggs`；checkbox 仍 `checked`；存在 `li.done`；`items.length==3` |

## 3. 判别力基线（Round A 必须复现）

Round A 在**未修复的 `main`** 上跑，预期整体 `FAIL`。逐条预期如下——这是用例有判别力的证据：

| 用例 | Round A 预期 | 说明 |
|---|---|---|
| AC-01 | PASS | 创建功能本身正常 |
| AC-02 | **FAIL** | `main` 按追加返回，`items[0]` 是较早的 `milk`，不是 `bread` |
| AC-03 | **FAIL** | `main` 对空标题返回 201 并创建空条目 |
| AC-04 | **FAIL** | 纯空白 strip 后为空，同样被 201 创建 |
| AC-05 | **FAIL** | 接口层空标题同样 201 创建 |
| AC-06 | **FAIL**（WARN） | 缺 `title` 字段同样 201 创建；契约灰度，失败只进 `warn_items` |
| AC-07 | PASS | 非法 JSON 已返回 400 |
| AC-08 | PASS | `main` 未做长度校验，20 字符可创建 |
| AC-09 | **FAIL** | 21 字符未被拒绝（契约要求 400；上限已并入本轮 Scope） |
| AC-10 | PASS | `main` 已做 trim |
| AC-11 | **FAIL** | 列表顺序为 `milk,bread,eggs`，第 2 步断言失败 |
| AC-12 | **FAIL**（WARN） | 非对象/非字符串请求体触发 `AttributeError`，连接断开、无 JSON 错误体；范围外已知缺陷 |

判定口径：Round A 的 `blocked_items` 只取 **BLOCK 用例** 的失败项（AC-02/03/04/05/09/11），
`warn_items` 取 AC-06/12；整体仍判 `FAIL`（存在 BLOCK 失败）。

硬规则：

- 若 Round A 中任一"预期 FAIL"的 **BLOCK** 用例意外 PASS → 记 `unverified-guard`，该条不能用来说明修复有效，必须查明原因后重跑或上报。
- 若 Round A 中所有"预期 FAIL"的 **BLOCK** 用例全部 PASS → 本轮 `STATUS BLOCKED`（用例失去判别力），不得直接进 Round B。
- 若 Round A 通过的 BLOCK 用例与上表不一致（预期 PASS 却 FAIL）→ 先查环境/服务/端口，再定 `BLOCKED`。
- WARN 项（AC-06/12）预期 FAIL 却 PASS 时只记一笔 note，不影响判定。

## 4. 两轮执行计划

| 轮次 | 被测版本 | 端口 | 预期判定 | 证据 |
|---|---|---|---|---|
| Round A | 主仓 `main`（记录 `git rev-parse HEAD`，须与 `db39d79` 一致或说明差异） | **8773** | `FAIL`；`blocked_items`=AC-02/03/04/05/09/11，`warn_items`=AC-06/12 | 每步截图 + 期望 vs 实际 |
| Round B | 修复分支 `fix/api-contract-20261105`（worktree `<WORKTREE>`；记录实际 SHA） | **8774** | `PASS`；BLOCK 全过（含 AC-09）；AC-06/12 若仍失败只进 `warn_items`（AC-12 固定 known-defect） | 每步截图 + 断言值 |

- 两轮各起一个服务，先 `kill` 前一轮；**不并发**。
- 执行通道由 Lead 拉起 qa-click worker；worker 只用 AC-PACK 作输入，qa 出判定、不抢跑、不自己点。
- 两轮各派一次 qa-click worker（可同一 worker 连跑两轮，也可分两次派）；无论哪种，
  执行者都不能是用例作者。Round B 只按本表断言，不得根据 Round A 的实际值调整期望。
- worker 交回的原始证据：每条用例的实际值、截图路径、服务启动日志、端口、SHA。
- 判定权在 **qa**：worker 只回原始回执，`STATUS` 与 run report 由 qa 出。

## 5. 运行报告（qa 落盘）

路径：`projects/team-sandbox/qa/run-YYYY-MM-DD-<slug>.md`（`<slug>` 形如 `r1-main` / `r1-fix`）。
人读头部：被测版本、SHA、端口、时间、逐条结果表、失败项「期望 vs 实际」、截图路径。
文件尾部 YAML footer：

```yaml
status: PASS | FAIL | BLOCKED
sha: <被测版本 git rev-parse HEAD>
branch: <main 或 fix/api-contract-*>
pack_version: v1.2
blocked_items: [<失败的 BLOCK 用例 ID>]
warn_items: [<失败的 WARN 用例 ID>]
run_at: <ISO-8601 时间戳>
```

判定规则：Round B 全部 `BLOCK` 通过 → 该轮 `PASS`；本任务最终判定取 Round B，同时引用 Round A 作为判别力证据。
报告头部必须写一句范围声明：「本轮 T-001 范围 PASS/FAIL；AC-12（畸形请求体导致连接断开）为范围外已知缺陷，仅记 `warn_items`」。

## 6. 风险与已知噪音

- **内存存储**：服务重启即清空，报告不保留跨进程数据；刷新保持只验证进程内存。
- **favicon 404**：浏览器 console 可能出现 `favicon.ico 404`，属已知噪音，记 `WARN`，不算 FAIL；其余 console error 必须记录并在报告中说明。
- **范围外已知缺陷**：AC-12（非对象 JSON 体 / 非字符串 `title` → `AttributeError`、连接断开）违反 `docs/API.md:31`，但不在本轮 T-001 Scope；只记 `warn_items`/下轮候选，不阻塞本轮 PASS（见 §0.1）。
- **契约灰度**：AC-06（缺字段）、AC-07（非法 JSON 的 `error` code 值）与 AC-10（trim 存储形态）契约未钉死，已降为 `WARN`，不阻塞发布。
- **端口冲突**：8770-8779 内若被占用，换同段内其他端口并在报告中记录；不得换出该段。
- **截图缺失**：任何 FAIL/BLOCKED 判定若无截图，一律按 `BLOCKED` 处理并上报。
- 本包不覆盖：并发写、时区/精度、DELETE 接口、持久化——不在本轮修复范围内，登记为下轮候选。
