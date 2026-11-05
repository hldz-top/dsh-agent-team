# <project-name>

> 复制 `projects/_template/` 到 `projects/<name>/` 后填写。一个项目 = 一个目录。
> 项目卡是唯一真源：聊天里的结论不算数，写进这里才算。
> 字段名由 `pm` 席位定义，其它席位不得分叉。

```
- Id: <name>
- Status: active | paused | shipped | abandoned
- Owner: <human owner>
- Goal: <一句话结果>
- Success criteria:
  - <二值、可判定条件>
- Areas:
  - <area> — <scope> — <owner seat>
- Decisions:
  - <YYYY-MM-DD> <owner 拍板的决定> (<who>)
```

## <project-name>

- Id: <name>
- Status: active
- Owner: <human owner>
- Goal: <这个项目要达成什么；必须包含"怎样算完成">
- Success criteria:
  - <条件 1>
- Areas:
  - <area-1> — `<path>` — `englead`
  - <area-2> — `<path>` — `qa`
- Decisions:
  - <YYYY-MM-DD> 立项（`pm`）

---

## 配套目录

| Path | Holds |
|---|---|
| `projects/<name>/tasks.md` | 任务板：一张卡一个交付单位 |
| `projects/<name>/qa/` | QA 包与运行报告，由 `qa` 席位写 |
| `projects/<name>/notes/` | 研究、日志、非任务的决策 |

每个 area 是一个可独立交付的单位：一个 area 对应一个分支/一次提交，禁止混成一个 diff。
