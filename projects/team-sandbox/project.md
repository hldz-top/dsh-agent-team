# team-sandbox

- Id: team-sandbox
- Status: active
- Owner: 用户
- Goal: 修复 team-sandbox 与 docs/API.md 契约不符的两处缺陷——空标题必须 400、列表必须最新在前——并补齐自动化测试。
- Success criteria:
  - `bash scripts/ci.sh --fast` 退出码 0（lint / format / typecheck / pytest 四项全 PASS）。
  - `POST /api/todos` 收到去空白后为空的标题（`""`、`"   "`）返回 `400`、响应体 `{"error": "title required"}`，且不新增条目。
  - 连续创建 A、B 后 `GET /api/todos` 返回 `[B, A]`，即最新在前（按创建时间倒序）。
  - `POST /api/todos` 标题 20 字符通过（`201`），21 字符 → `400` + `{"error": "title too long"}` 且不建条目。
  - `tests/test_api.py` 新增 pytest 用例覆盖上述两条契约；不引入第三方运行依赖。
- Areas:
  - api — `app/server.py` — `englead`
  - api-tests — `tests/test_api.py` — `englead`
  - acceptance — `projects/team-sandbox/qa/` — `qa`
- Decisions:
  - 只引用，不复制：见 `DECISIONS.md`（2026-11-05 立项与契约口径）。

## 仓库与基准

- 产品仓库：`team-sandbox`（相对团队资料目录为 `../team-sandbox`）。
- 契约事实源：产品仓库内 `docs/API.md`；代码行为与契约冲突时以契约为准。
- 本账本中的代码路径均以**产品仓库根**为基准；账本自身路径以团队资料目录为基准。
- 后端保持 Python stdlib，不新增运行依赖；pytest 仅作开发依赖。
