window.__ModuleLoader__.load({
  id: '@local/dsh-skill-preload',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const KEY = '@local/dsh-skill-preload#skill-preload';

    const zh = (navigator.language || '').toLowerCase().startsWith('zh');
    const T = zh ? {
      summary: '选择每个新会话开始时自动加载的技能。',
      loading: '加载中…',
      unavailable: '该插件当前未加载，无法配置。',
      readOnly: '当前配置为只读。',
      selected: '预加载（按顺序注入）',
      none: '尚未选择任何技能',
      pick: '可选技能',
      filter: '筛选…',
      add: '添加',
      addPlaceholder: '手动输入技能名',
      missing: '磁盘上未找到',
      up: '上移', down: '下移', remove: '移除',
      when: '触发时机',
      sources: { startup: '新会话', resume: '恢复会话', clear: '清空上下文后', compact: '压缩上下文后' },
      subagents: '子代理会话也预加载',
      failed: '保存失败，已恢复为服务器上的值。',
      hint: '修改立即保存，对之后新建的会话生效。',
    } : {
      summary: 'Choose the skills that are loaded automatically at the start of every new session.',
      loading: 'Loading…',
      unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
      readOnly: 'The configuration is read-only.',
      selected: 'Preloaded (injected in this order)',
      none: 'No skills selected',
      pick: 'Available skills',
      filter: 'Filter…',
      add: 'Add',
      addPlaceholder: 'Type a skill name',
      missing: 'not found on disk',
      up: 'Move up', down: 'Move down', remove: 'Remove',
      when: 'When to preload',
      sources: { startup: 'New session', resume: 'Resumed session', clear: 'After clearing', compact: 'After compaction' },
      subagents: 'Also preload for subagent sessions',
      failed: 'Saving failed; showing the values stored on the host.',
      hint: 'Changes save immediately and apply to sessions created afterwards.',
    };

    const css = {
      root: { display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0', color: 'var(--dsw-alias-label-primary)', fontSize: 13 },
      h: { margin: 0, fontSize: 13, fontWeight: 600 },
      box: { border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: 8, overflow: 'hidden' },
      row: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderTop: '0.5px solid var(--dsw-alias-border-l2)' },
      first: { borderTop: 'none' },
      name: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      muted: { opacity: 0.6, fontSize: 12 },
      btn: { font: 'inherit', padding: '2px 8px', border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: 6, background: 'transparent', color: 'inherit', cursor: 'pointer' },
      input: { font: 'inherit', padding: '4px 8px', border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: 6, background: 'transparent', color: 'inherit', minWidth: 0, flex: 1 },
      list: { maxHeight: 260, overflowY: 'auto' },
      label: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
    };

    function Section({ title, children }) {
      return h('section', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, h('h3', { style: css.h }, title), children);
    }

    function Page({ form }) {
      const [filter, setFilter] = React.useState('');
      const [manual, setManual] = React.useState('');
      const [error, setError] = React.useState(false);
      const state = form && form.state;
      if (!state || state.status === 'loading') return h('div', { style: css.muted }, T.loading);
      if (state.status === 'unavailable' || !state.value) return h('div', { style: css.muted }, T.unavailable);

      const value = state.value;
      const skills = Array.isArray(value.skills) ? value.skills : [];
      const on = Array.isArray(value.on) ? value.on : [];
      const available = Array.isArray(value.available) ? value.available : [];
      const writable = state.writable !== false;

      const save = async (field, next) => {
        setError(false);
        try {
          const ok = await form.mutate([{ op: 'set', path: [field], value: next }], state.revision);
          if (!ok) setError(true);
        } catch { setError(true); }
      };
      const setSkills = (next) => save('skills', next);
      const toggle = (name) => setSkills(skills.includes(name) ? skills.filter(s => s !== name) : [...skills, name]);
      const move = (i, d) => {
        const j = i + d;
        if (j < 0 || j >= skills.length) return;
        const next = skills.slice();
        [next[i], next[j]] = [next[j], next[i]];
        setSkills(next);
      };
      const addManual = () => {
        const n = manual.trim();
        if (!n || skills.includes(n)) { setManual(''); return; }
        setManual('');
        setSkills([...skills, n]);
      };
      const q = filter.trim().toLowerCase();
      const shown = available.filter(n => !q || n.toLowerCase().includes(q));

      return h('div', { style: css.root },
        h('div', { style: css.muted }, T.hint),
        !writable ? h('div', { style: css.muted, role: 'status' }, T.readOnly) : null,
        error ? h('div', { style: { color: 'var(--dsw-alias-label-error, #d1242f)' }, role: 'alert' }, T.failed) : null,

        h(Section, { title: T.selected },
          h('div', { style: css.box },
            skills.length === 0
              ? h('div', { style: { ...css.row, ...css.first, ...css.muted } }, T.none)
              : skills.map((name, i) => h('div', { key: name, style: i === 0 ? { ...css.row, ...css.first } : css.row },
                  h('span', { style: css.name }, name),
                  !available.includes(name) ? h('span', { style: css.muted }, T.missing) : null,
                  h('button', { type: 'button', style: css.btn, disabled: !writable || i === 0, title: T.up, 'aria-label': T.up, onClick: () => move(i, -1) }, '↑'),
                  h('button', { type: 'button', style: css.btn, disabled: !writable || i === skills.length - 1, title: T.down, 'aria-label': T.down, onClick: () => move(i, 1) }, '↓'),
                  h('button', { type: 'button', style: css.btn, disabled: !writable, title: T.remove, 'aria-label': T.remove, onClick: () => toggle(name) }, '✕'))))),

        h(Section, { title: T.pick },
          h('input', { style: css.input, value: filter, placeholder: T.filter, onChange: e => setFilter(e.target.value) }),
          h('div', { style: { ...css.box, ...css.list } },
            shown.map((name, i) => h('label', { key: name, style: { ...css.row, ...(i === 0 ? css.first : null), cursor: 'pointer' } },
              h('input', { type: 'checkbox', checked: skills.includes(name), disabled: !writable, onChange: () => toggle(name) }),
              h('span', { style: css.name }, name)))),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('input', { style: css.input, value: manual, placeholder: T.addPlaceholder, disabled: !writable,
              onChange: e => setManual(e.target.value),
              onKeyDown: e => { if (e.key === 'Enter') addManual(); } }),
            h('button', { type: 'button', style: css.btn, disabled: !writable || !manual.trim(), onClick: addManual }, T.add))),

        h(Section, { title: T.when },
          ['startup', 'resume', 'clear', 'compact'].map(src => h('label', { key: src, style: css.label },
            h('input', { type: 'checkbox', checked: on.includes(src), disabled: !writable,
              onChange: () => save('on', on.includes(src) ? on.filter(s => s !== src) : [...on, src]) }),
            T.sources[src])),
          h('label', { style: css.label },
            h('input', { type: 'checkbox', checked: value.subagents === true, disabled: !writable,
              onChange: () => save('subagents', value.subagents !== true) }),
            T.subagents)));
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
