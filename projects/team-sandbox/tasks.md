# Tasks — team-sandbox

> 任务板。一张卡 = 一个可验收的交付单位。字段名固定（由 `pm` 席位定义，其它席位不得分叉）。
> 状态词表固定：`Todo` · `In Progress` · `Blocked` · `Review` · `Done`。
> **`Blocked` 是旁路状态，不是终点**：必须同时写 `Blocked by: <席位或人> — needs <具体需求>`，
> 并把问题放进 `Note:`。`Blocked by:` 为空的 Blocked 卡是缺陷卡。
> 代码路径以产品仓库 `team-sandbox` 根为基准。

## 卡片格式

```markdown
## T-001 <祈使句标题>
- Id: T-001
- Status: Todo
- Owner: unowned | pm | englead | audit | qa
- Scope: <本卡可写的仓库相对路径>
- Ports: <englead 分配，如 3000-3099；无服务则写 none>
- Depends on: none
- Blocked by: none
- Acceptance: <二值、可判定的完成条件>
- Note: <上下文；卡住时这里放问题>
```

规则：
- `Id:` 与 `Owner:` 必填，缺一即 malformed，不得创建。
- `Done` 必须已有证据（账本、`qa/` 或仓库里能看到），否则停在 `Review`。
- 同一张卡只能有一个 `Owner`；需要两人协作就拆卡，或按文件切分 `Scope`。
- 本表只到「粗卡」级；拆到 worker 级（分支/worktree/端口细分配）是 `englead` 的事。

---

## T-001 修复 /api/todos 三处契约偏差（空标题 400、列表最新在前、标题 20 字符上限）并补自动化测试

- Id: T-001
- Status: Done
- Owner: englead
- Scope: 产品仓库 `team-sandbox`：`app/server.py`、`tests/test_api.py`（以产品仓库根为基准）；覆盖标题长度校验（≤20 字符，超限 → `400 {"error":"title too long"}`）
- Ports: 8770-8779（`englead` 分配，点击验证用；pytest 自身用临时端口）
- Depends on: none
- Blocked by: none
- Acceptance: `bash scripts/ci.sh --fast` 退出码 0；`tests/test_api.py` 新增用例断言：(a) `POST /api/todos` 传 `{"title": ""}` 与 `{"title": "   "}` 均返回 `400`、响应体为 `{"error": "title required"}`，且随后 `GET /api/todos` 条目数不变；(b) 依次创建 A、B 后 `GET /api/todos` 返回顺序为 `[B, A]`（最新在前）；(c) 20 字符标题 → `201` 且条目 `title` 长度 20，21 字符标题 → `400` + `{"error": "title too long"}` 且不创建条目。条件 (a)(b)(c) 全部断言通过 = PASS，任一失败 = FAIL。
- Note: 两处缺陷同属 `docs/API.md` 的 `GET`/`POST` 行为面，故合为一张卡；契约依据 `docs/API.md:7`（最新在前）与 `docs/API.md:17`（空标题 400 且不建条目）。**范围经 Lead 裁决扩大（2026-11-05，选 A）**：标题 20 字符上限并入本卡，依据 `notes/audit/R1.md` BLOCK-1（D1），契约 `docs/API.md:30`。**收口证据（2026-11-05）**：合并提交 `75a3e74`（`--no-ff`，父 `db39d79` + `b824fe4`）；开发提交 `b824fe4`（2 文件 `+71/−1`）；分支 `fix/api-contract-20261105` 与 worktree 已删除；合并后主仓 `ci.sh --full` **PASS**、pytest **11 passed**；QA `STATUS PASS`（Round B BLOCK 8/8）、G2 `VERDICT: PASS`。G1 曾因会话能力受阻，由 Lead 代派（详见 `iterations/R1-2026-11-05.md`）。
