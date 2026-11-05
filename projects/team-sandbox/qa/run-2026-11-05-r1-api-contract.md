# AC 运行报告 — team-sandbox R1（api-contract 修复）

> **STATUS PASS**（以 Round B 发布候选判定；Round A 作为判别力证据）。
> 判定人：qa 席位 ｜ 执行：qa-click worker（subagent，与用例作者不同）｜ 用例表：`qa/AC-PACK.md` v1.2
> 证据链：worker 原始回执（由 Lead 转交）+ 31 张截图（`notes/qa/screenshots/`）+ qa 独立 SHA/文件哈希复核。
> 范围声明：本轮 T-001 范围（空标题 400、最新在前、20 字符上限）**PASS**；AC-12（畸形请求体导致连接断开）为**范围外已知缺陷**，仅记 `warn_items`。

## 1. 结论

| 项 | 结论 |
|---|---|
| 最终判定 | `STATUS PASS` |
| 发布候选 | `fix/api-contract-20261105` @ `b824fe40655343c1f71ae031c04ae048597bc0da` |
| BLOCK 通过率 | Round B 8/8 BLOCK 用例全过（AC-01/02/03/04/05/08/09/11） |
| WARN | AC-06/07/10 通过；**AC-12 失败**（范围外已知缺陷，R2 候选） |
| `blocked_items` | 无 |
| `warn_items` | `AC-12` |
| 判别力 | Round A 的 BLOCK 失败项 = AC-02/03/04/05/09/11，与 AC-PACK §3 预期逐条一致；无 `unverified-guard` |

## 2. 被测版本与环境（qa 独立复核）

| 轮次 | 被测目录 | 分支 | HEAD | 端口 | `app/server.py` sha256 |
|---|---|---|---|---|---|
| A | `<PROJECT_REPO>` | `main` | `db39d79219c63a2ff596a2fc14652f6756a101a5` | 8773 | `6cd786b7ab1fb286888b14407cff95ed2f206c9b7859b91fa5f4c784fa60f263` |
| B | `<WORKTREE>` | `fix/api-contract-20261105` | `b824fe40655343c1f71ae031c04ae048597bc0da` | 8774 | `3d66f7d4fa254a4c3962bec6fee683aba957b9bf26ef56111a17da55d7c4c518` |

- qa 复核（只读，未改动产品仓库）：`git -C <repo> rev-parse HEAD` 与 `shasum -a 256 app/server.py` 均复现上表；
  两工作区 `git status --porcelain` 为空（干净基线）。
- 环境：Python stdlib 服务，内存存储（进程重启即清空），浏览器 `mcp__playwright-host__browser_*` headless，
  两轮各自独立端口。Round A 截图时间窗 21:05–21:13；Round B 21:15–21:33。

## 3. Round A — 未修复 `main`（判别力验证）

判定：`FAIL`（符合 AC-PACK §3 预期）。

| ID | 严重度 | AC-PACK 预期 | 实际（按 worker 回执 + 截图） | 结果 | 截图 |
|---|---|---|---|---|---|
| AC-01 | BLOCK | PASS | `POST` 201，`milk` 入列 | PASS | `2026-11-05-2105-AC-01-1.png` |
| AC-02 | BLOCK | **FAIL** | 列表 `milk, bread`（旧在前），`items[0]=milk` ≠ `bread` | **FAIL** | `2026-11-05-2105-AC-02-1.png` |
| AC-03 | BLOCK | **FAIL** | 空标题 `POST` 返回 201，列表新增空标题行，`#error` 为空 | **FAIL** | `2026-11-05-2106-AC-03-1.png` |
| AC-04 | BLOCK | **FAIL** | 纯空白同样 201 并创建空条目 | **FAIL** | `2026-11-05-2106-AC-04-1.png` |
| AC-05 | BLOCK | **FAIL** | 接口层空标题 201（未返回 400 `title required`） | **FAIL** | `2026-11-05-2107-AC-05-1.png` |
| AC-06 | WARN | **FAIL**（WARN） | `{}`（缺 `title`）同样 201 创建空条目 | FAIL（WARN） | `2026-11-05-2107-AC-06-1.png` |
| AC-07 | WARN | PASS | 非法 JSON 返回 400 且 `error` 字段存在 | PASS | `2026-11-05-2108-AC-07-1.png` |
| AC-08 | BLOCK | PASS | 20 字符 201 创建成功 | PASS | `2026-11-05-2109-AC-08-1.png` |
| AC-09 | BLOCK | **FAIL** | 21 字符仍 201 且入列（未校验上限） | **FAIL** | `2026-11-05-2109-AC-09-1.png` |
| AC-10 | WARN | PASS | `"  milk  "` → 存为 `milk` | PASS | `2026-11-05-2110-AC-10-1.png` |
| AC-11 | BLOCK | **FAIL** | 3 条顺序 `milk, bread, eggs`（旧在前）；勾选的是第一行 `milk` 而非 `eggs` | **FAIL** | `2026-11-05-2111-AC-11-1.png`、`2026-11-05-2112-AC-11-2.png`、`2026-11-05-2112-AC-11-3.png`、`2026-11-05-2113-AC-11-4.png` |
| AC-12 | WARN | **FAIL**（WARN） | 畸形体：`AttributeError`，连接断开、无 JSON 错误体 | FAIL（WARN） | `2026-11-05-2113-AC-12-1.png` |

- `blocked_items`（Round A）：`AC-02/03/04/05/09/11`；`warn_items`：`AC-06/12`。
- 判别力结论：预期 FAIL 的 6 条 BLOCK 全部 FAIL，预期 PASS 的 2 条 BLOCK 全部 PASS —— 用例有效。

## 4. Round B — 修复分支 `b824fe4`

判定：`PASS`。

| ID | 严重度 | 实际（按 worker 回执 + 截图） | 结果 | 截图 |
|---|---|---|---|---|
| AC-01 | BLOCK | `POST` 201，`milk` 入列，`done=false` | PASS | `2026-11-05-2115-AC-01-1.png` |
| AC-02 | BLOCK | `items[0]=bread`、`items[1]=milk`（最新在前） | PASS | `2026-11-05-2115-AC-02-1.png` |
| AC-03 | BLOCK | 400 `title required`，无新条目，`#error` 显示 `title required` | PASS | `2026-11-05-2116-AC-03-1.png` |
| AC-04 | BLOCK | 纯空白同样 400 `title required`，条数不变 | PASS | `2026-11-05-2117-AC-04-1.png` |
| AC-05 | BLOCK | 接口层 400 `title required` | PASS | `2026-11-05-2117-AC-05-1.png` |
| AC-06 | WARN | 缺 `title` 字段 → 400 `title required`（修复顺带覆盖） | PASS | `2026-11-05-2117-AC-06-1.png` |
| AC-07 | WARN | 非法 JSON 400，响应为 `{ "error": "<code>" }` 形状 | PASS | `2026-11-05-2118-AC-07-1.png` |
| AC-08 | BLOCK | 20 字符 201，`title.length===20` | PASS | `2026-11-05-2119-AC-08-1.png` |
| AC-09 | BLOCK | 21 字符 400 `title too long`，列表仍 3 条、21 字符未入列 | PASS | `2026-11-05-2121-AC-09-1.png` |
| AC-10 | WARN | `"  milk  "` → `milk`（trim 保持） | PASS | `2026-11-05-2124-AC-10-1.png` |
| AC-11 | BLOCK | 顺序 `eggs, bread, milk`；勾选 `eggs` → `done=true`、`li.done`；刷新后顺序与勾选保持；恰 3 条（重跑，见 §5.1） | PASS | `2026-11-05-2130-AC-11-1r.png`、`2026-11-05-2132-AC-11-2.png`、`2026-11-05-2133-AC-11-3.png`、`2026-11-05-2133-AC-11-4.png` |
| AC-12 | WARN | 畸形请求体仍触发连接断开（无 JSON 错误体）——范围外已知缺陷 | FAIL（WARN） | `2026-11-05-2133-AC-12-1.png` |

- `blocked_items`：无；`warn_items`：`AC-12`。
- 判定：BLOCK 全过、WARN 已列明、SHA/文件哈希可核对、截图齐全 → `PASS`。

## 5. 事故与证据完整性记录

### 5.1 Round B AC-11 首跑被 Lead 复核污染（作废重跑；qa 接受）

- **事实**：Lead 在 21:32 左右做独立复核时，用 `curl` 在 **8774（worker 的被测实例）** 上创建了
  「第一条」「第二条」两条数据，导致 worker 的 AC-11「恰 3 条」断言失败。worker 判定为外部干扰、
  **作废该次**、重启服务（内存 store 清空）后重跑：`2026-11-05-2130-AC-11-1r.png` 起为重跑证据；
  `2026-11-05-2126-AC-11-1.png` 是作废首跑留下的初始态截图。
- **qa 判定：接受重跑**。理由：① 污染源是 Lead 自身操作，非产品行为；② 作废与重跑在截图时间戳/
  `-1r` 命名上可辨；③ 重跑重启了服务，AC-11 起始态为空列表（内存存储清空），3 条断言在干净实例上成立；
  ④ qa 已独立核对 Round B 的 SHA 与 `server.py` 哈希，重跑确实跑在修复构建上。**不记产品缺陷。**
- 该事故已由 Lead 转为硬规则（「复核与被测实例必须端口隔离」，`team/DEV_PIPELINE.md` §5）。
- 残留风险：非隔离端口下单实例运行仍可能被外部写入；后续轮次建议 worker 与复核者使用不同端口+不同实例。

### 5.2 worker SHA 取错并自曝（复核后采纳 `b824fe4`）

- **事实**：Round B 首次取 SHA 的命令写错（在团队仓库执行），得到 `df0671d`；worker 随即用
  `git -C <worktree> rev-parse HEAD` 复核为 `b824fe4`，并用 `lsof`（进程 cwd）+ `app/server.py` sha256
  （`3d66f7d4…` vs main `6cd786b7…`）自证工作区身份。
- **qa 判定：采纳复核后的 `b824fe4`**。qa 已独立执行 `git rev-parse HEAD` 与 `shasum -a 256 app/server.py`
  复现同样结果（§2），不采用 `df0671d`。worker 主动自曝并提供可复核证据，属可接受的自纠。

### 5.3 证据清点

- 截图 **31 张**全部存在：Round A 15 张（`2105`–`2113`），Round B 16 张（`2115`–`2133`）。
- qa 抽检 7 张关键帧，与回执一致：`2105-AC-02-1`（旧在前）、`2106-AC-03-1`（空标题落库）、
  `2109-AC-09-1`（21 字符落库）、`2113-AC-11-4`（勾错行）、`2121-AC-09-1`（`title too long`）、
  `2133-AC-11-4`（`eggs` 置顶且勾选、刷新后保持）、`2115-AC-01-1`（干净单条）。
- 回执：worker 原始回执由 Lead 转交（本报告逐条"实际"引自该回执）；qa 未重跑、未亲手点页，
  判定依据为回执 + 截图 + 独立 SHA/哈希核对。
- 无 NO-EVIDENCE；无未解释的 FAIL（AC-12 有明确解释，列 R2 候选）。

## 6. 判定依据与残余风险

- PASS 条件（AC-PACK §0/§4）：Round B BLOCK 8/8 通过、WARN 已列明、SHA 与文件哈希可核对、截图齐 —— 满足。
- 判别力：Round A BLOCK 预期 FAIL 6 条全部 FAIL、预期 PASS 2 条全部 PASS，无 `unverified-guard`。
- 残余风险：
  1. **AC-12（R2 候选）**：畸形请求体触发 `AttributeError` 并断开连接（无 JSON 错误体），违反 `docs/API.md:31`；
     不阻塞本轮，但服务健壮性有缺口，建议 R2 立卡。
  2. 内存存储无持久化：只验证了进程内状态；重启/多进程一致性未覆盖。
  3. AC-11 证据依赖一次"污染后重跑"的流程判断（§5.1），已按 Lead 新规则加固，但本轮仍是非隔离端口下的单实例。
  4. 本轮只验证契约三处偏差与基本 CRUD；并发、时区、DELETE、错误码语义未覆盖（AC-PACK §6 已列）。
- 建议：QA 侧不阻塞合并；G6 仍需 englead `G2 PASS` 与 Lead 在干净 checkout 上的 `bash scripts/ci.sh --full`。

## 7. 机读 footer

```yaml
status: PASS
sha: b824fe40655343c1f71ae031c04ae048597bc0da
branch: fix/api-contract-20261105
round_a_sha: db39d79219c63a2ff596a2fc14652f6756a101a5
pack_version: v1.2
blocked_items: []
warn_items: [AC-12]
run_at: '2026-11-05T21:36:19+08:00'
```
