# Tasks — <project-name>

> 任务板。一张卡 = 一个可验收的交付单位。字段名固定（由 `pm` 席位定义，其它席位不得分叉）。
> 状态词表固定：`Todo` · `In Progress` · `Blocked` · `Review` · `Done`。
> **`Blocked` 是旁路状态，不是终点**：必须同时写 `Blocked by: <席位或人> — needs <具体需求>`，
> 并把问题放进 `Note:`。`Blocked by:` 为空的 Blocked 卡是缺陷卡。

## 卡片格式

```markdown
## T-001 <祈使句标题>
- Id: T-001
- Status: Todo
- Owner: unowned | pm | englead | audit | qa
- Scope: <本卡可写的仓库相对路径>
- Depends on: none
- Blocked by: none
- Acceptance: <二值、可判定的完成条件>
- Note: <上下文；卡住时这里放问题>
```

规则：
- `Id:` 与 `Owner:` 必填，缺一即 malformed，不得创建。
- `Done` 必须已有证据（账本、`qa/` 或仓库里能看到），否则停在 `Review`。
- 同一张卡只能有一个 `Owner`；需要两人协作就拆卡，或按文件切分 `Scope`。

---

## T-001 <第一张卡的标题>

- Id: T-001
- Status: Todo
- Owner: unowned
- Scope: `<path>`
- Depends on: none
- Blocked by: none
- Acceptance: <条件>
- Note: —

## T-002 <第二张卡的标题>

- Id: T-002
- Status: Todo
- Owner: unowned
- Scope: `<path>`
- Depends on: T-001
- Blocked by: none
- Acceptance: <条件>
- Note: —
