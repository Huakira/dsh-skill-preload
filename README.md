# dsh-skill-preload

> 个人自用插件，代码和文档由 AI 参与编写，不承诺维护。使用前请先备份 DSH 配置。

DeepSeek Harness (DSH) 插件：在会话开始、恢复、清空或压缩后，运行所选技能自带的 `scripts/inject.py`，把标准输出直接注入上下文。默认选择 `preload`，模型不需要再调用 `startup-bundle` 工具。

A DSH plugin that runs the selected skill's `scripts/inject.py` on session lifecycle events and directly injects its stdout. It defaults to `preload`.

## 职责边界 / Responsibilities

- 插件只选择技能、找到该技能的注入脚本并执行。
- MCPHub 地址、专用只读令牌、缓存位置、联网失败后的回退，全部由 preload 技能自己的脚本管理。
- 插件配置里没有地址、令牌、缓存目录或触发时机。
- 子代理会话不注入，避免每个子任务都重复携带完整开场包。

## 安装 / Install

```bash
dsh plugin add /path/to/dsh-skill-preload      # 本地目录
# 或在 Plugins 页 → Add plugin → 填本目录或 Git 地址
```

需要系统可用的 `python3`；注入脚本只使用 Python 标准库。

## 配置 / Configuration

安装后在 **Plugins 页 → 技能预加载 → Configure** 中选择一个技能，默认 `preload`。改动立即保存，对之后发生的会话生命周期事件生效。

所选技能必须有：

```text
<skill-directory>/
├── SKILL.md
└── scripts/
    └── inject.py
```

`inject.py` 应把要注入的文本写到标准输出。preload 的实现成功时原样输出 MCPHub 开场包并覆盖缓存，失败时输出上次缓存；没有缓存才输出 MCP 工具回退提示。

也可以直接在 profile 的 `cordis.patch.yml` 里写：

```yaml
- insert:
    - id: skill-preload
      name: '@local/dsh-skill-preload'
      config:
        skill: preload
```

“可选技能”列表来自加载时扫描 `~/.agents/skills`、`~/.dsh/skills`、`~/.claude/skills`；新装技能后需重新加载插件才会出现在列表中。

## License

MIT
