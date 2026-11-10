# dsh-skill-preload

DeepSeek Harness (DSH) 插件：每个新会话开始时，自动把你指定的技能全文注入上下文，模型从第一步就带着这些技能，不必自己去调 `skill` 工具。

A DeepSeek Harness plugin that injects the full text of chosen skills into every new session, so the model starts with them already loaded.

## 为什么需要它 / Why

DSH 不会展开 `AGENTS.md` 里的 `@path` 导入，也没有“自动加载技能”的配置项。把开场技能写在 `AGENTS.md` 里，只是参考内容，模型可以忽略。本插件在 `agent/created` 时用 `agent.inject()` 把技能正文放进第一步，稳定可靠。

## 安装 / Install

```bash
dsh plugin add /path/to/dsh-skill-preload      # 本地目录
# 或在 Plugins 页 → Add plugin → 填本目录或 Git 地址
```

## 配置 / Configuration

安装后在 **Plugins 页 → 技能预加载 → Configure** 里设置，改动立即保存，对之后新建的会话生效：

| 字段 | 默认 | 说明 |
|---|---|---|
| `skills` | `[preload]` | 要预加载的技能名，按顺序注入 |
| `on` | `[startup, clear]` | 触发时机：`startup` / `resume` / `clear` / `compact` |
| `subagents` | `false` | 子代理会话是否也预加载 |

也可以直接在 profile 的 `cordis.patch.yml` 里写：

```yaml
- insert:
    - id: skill-preload
      name: '@local/dsh-skill-preload'
      config:
        skills: [preload]
        on: [startup, clear]
        subagents: false
```

“可选技能”列表来自加载时扫描 `~/.agents/skills`、`~/.dsh/skills`、`~/.claude/skills`；新装技能后需重新加载插件才会出现，也可以手动输入技能名。

## 说明 / Notes

- 模块从 `$DSH_PROFILE_DIR` 解析 `@deepseek-ai/schemastery`（每个 DSH profile 都带），因此以本地目录链接安装也能工作。
- 默认不在 `resume`、`compact` 时注入：历史里已有之前的注入内容，重复注入只会多占上下文。

## License

MIT
