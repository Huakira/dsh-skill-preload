window.__ModuleLoader__.load({
  id: '@huakirax/dsh-skill-preload',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const KEY = '@huakirax/dsh-skill-preload#skill-preload';

    const zh = (navigator.language || '').toLowerCase().startsWith('zh');
    const T = zh ? {
      summary: '选择提供开场注入脚本的技能。',
      loading: '加载中…',
      unavailable: '该插件当前未加载，无法配置。',
      readOnly: '当前配置为只读。',
      label: '开场技能',
      failed: '保存失败，已恢复为服务器上的值。',
      hint: '默认选择 preload。插件直接注入脚本输出，模型不需要再调用工具。',
      owned: '地址、令牌和缓存由该技能的 scripts/inject.py 自己管理，不在这里配置。',
    } : {
      summary: 'Choose the skill that provides the session-start injector.',
      loading: 'Loading…',
      unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
      readOnly: 'The configuration is read-only.',
      label: 'Opening skill',
      failed: 'Saving failed; showing the value stored on the host.',
      hint: 'Defaults to preload. The plugin injects the script output directly; the model does not call a tool.',
      owned: 'The URL, token, and cache belong to the skill\'s scripts/inject.py and are not configured here.',
    };

    const css = {
      root: { display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0', color: 'var(--dsw-alias-label-primary)', fontSize: 13 },
      muted: { opacity: 0.6, fontSize: 12, lineHeight: 1.5 },
      label: { display: 'flex', flexDirection: 'column', gap: 6 },
      select: { font: 'inherit', padding: '6px 8px', border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: 6, background: 'transparent', color: 'inherit' },
    };

    function Page({ form }) {
      const [error, setError] = React.useState(false);
      const state = form && form.state;
      if (!state || state.status === 'loading') return h('div', { style: css.muted }, T.loading);
      if (state.status === 'unavailable' || !state.value) return h('div', { style: css.muted }, T.unavailable);

      const value = state.value;
      const current = typeof value.skill === 'string' ? value.skill : 'preload';
      const available = Array.isArray(value.available) ? value.available : [];
      const options = available.includes(current) ? available : [current, ...available];
      const writable = state.writable !== false;

      const save = async (skill) => {
        setError(false);
        try {
          const ok = await form.mutate([{ op: 'set', path: ['skill'], value: skill }], state.revision);
          if (!ok) setError(true);
        } catch { setError(true); }
      };

      return h('div', { style: css.root },
        h('div', { style: css.muted }, T.hint),
        h('div', { style: css.muted }, T.owned),
        !writable ? h('div', { style: css.muted, role: 'status' }, T.readOnly) : null,
        error ? h('div', { style: { color: 'var(--dsw-alias-label-error, #d1242f)' }, role: 'alert' }, T.failed) : null,
        h('label', { style: css.label }, T.label,
          h('select', { style: css.select, value: current, disabled: !writable, onChange: event => save(event.target.value) },
            options.map(name => h('option', { key: name, value: name }, name)))));
    }

    function ConfigEntry(props) {
      if (props.view === 'summary') return T.summary;
      return h(Page, { form: props.form });
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
          name: 'plugins.row.config', key: KEY,
        }, ConfigEntry));
      },
    };
  },
});
