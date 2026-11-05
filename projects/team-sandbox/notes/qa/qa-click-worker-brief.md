# qa-click worker 派工简报（可直接粘进 `subagent` prompt）

> 状态：**待执行通道**。Lead 裁决后照此派工；作者（qa）与执行者（worker）必须不同。
> 配套用例表：`projects/team-sandbox/qa/AC-PACK.md`（`pack_version: v1.2`，执行期间不得修改）。

## 一、共同约束（两轮通用）

1. 你是 `qa-click worker`，只做执行与取证：**不改产品代码、不改 AC-PACK、不 commit、不 merge、不 install**。
2. 产品仓库 `<PROJECT_REPO>`（Round A）或修复 worktree（Round B，路径由 englead 给）。
   只读运行，不写仓库文件（`.ci/`、`__pycache__` 等一概不要产生）。
3. 起服务（后台，记录 PID 与启动输出）：
   ```bash
   cd <被测目录> && python3 app/server.py <port>
   ```
   就绪判据：`curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:<port>/api/todos` 输出 `200`。
   端口段 **8770-8779**：Round A 用 `8773`，Round B 用 `8774`（被占用就换同段内其它端口并记录）。
4. 浏览器只用 `mcp__playwright-host__browser_*`，**一律 headless**；每步截图落
   `projects/team-sandbox/notes/qa/screenshots/YYYY-MM-DD-HHmm-<AC-ID>-<序号>.png`（写绝对路径也可）。
5. 按 `AC-PACK.md` 的 AC-01 → AC-12 升序执行（AC-12 在表中列于反向组，但按 ID 最后跑）；
   断言点照表执行。**禁止改期望值**。失败不中断整轮（服务崩溃/浏览器不可用除外），逐条记录「期望 vs 实际」。
6. 记录被测版本：`git -C <被测目录> rev-parse HEAD`、`git -C <被测目录> status --porcelain`（应为空）。
7. 结束必须 `kill` 服务并确认端口释放；若服务/浏览器异常，返回 `BLOCKED` 并附原始报错，**禁止编造点击结果**。

## 二、Round A（未修复 main）

- 被测目录：`<PROJECT_REPO>`，基线 `main` @ `db39d79219c63a2ff596a2fc14652f6756a101a5`。
- 端口 `8773`。**预期整体 `FAIL`**；判别力基线（AC-PACK §3）：
  BLOCK 预期 PASS＝AC-01/08，BLOCK 预期 FAIL＝AC-02/03/04/05/09/11；
  WARN 预期 PASS＝AC-07/10，WARN 预期 FAIL＝AC-06/12（只进 `warn_items`，其中 AC-12 为范围外已知缺陷）。
- 已知实际基线（englead 手工复现，仅作对照，不作证据）：空标题 `201` 且 `title` 为空；列表 `1,2,3` 正序。
- 若"预期 FAIL"的 BLOCK 项意外 PASS → 标 `unverified-guard` 并上报；若 BLOCK 全部 PASS → 整轮 `BLOCKED`（用例无判别力）。

## 三、Round B（修复分支，等 englead 提供）

- 被测目录：修复 worktree（路径/分支名由 lead 转达）；端口 `8774`。
- 预期：全部 `BLOCK` 用例通过（含 AC-09 20 字符上限）→ 整轮 `PASS`；`WARN` 项（AC-06/07/10/12）列明即可，AC-12 范围外。
- 只按 AC-PACK 断言，**不得**用 Round A 的实际值回调期望。

## 四、交回证据（缺一不可）

- 每条用例一行：`ID | 实际值 | PASS/FAIL | 截图路径`；失败项给「期望 vs 实际」。
- 服务：端口、PID、启动输出、`GET /api/todos` 就绪码、结束后端口已释放的确认。
- 版本：`rev-parse HEAD`、`status --porcelain` 输出。
- 浏览器：MCP 工具名与调用序列（navigate/fill/click/snapshot/network），异常原始报错。
- 汇总：`BLOCKED / PASS / FAIL` 三态之一 + `blocked_items`、`warn_items` 列表。
