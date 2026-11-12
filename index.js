/**
 * Run the selected skill's own session-start injector and insert its stdout.
 * Connection settings, credentials, and cache behavior belong to the skill.
 */
import { execFile } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import Schema from '@deepseek-ai/schemastery'

const execFileAsync = promisify(execFile)

export const inject = ['skills', 'agents']
export const name = 'skill-preload'

/** Skill names found in the usual user skill directories, for the picker. */
function scanSkills() {
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  const agents = process.env.DSH_AGENTS_HOME ?? join(homedir(), '.agents')
  const names = new Set()
  for (const dir of [join(agents, 'skills'), join(home, 'skills'), join(homedir(), '.claude', 'skills')]) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if ((entry.isDirectory() || entry.isSymbolicLink()) && existsSync(join(dir, entry.name, 'SKILL.md'))) names.add(entry.name)
      }
    } catch { /* directory absent */ }
  }
  return [...names].sort()
}

export const Config = Schema.object({
  skill: Schema.string().default('preload').volatile().description('Skill whose scripts/inject.py supplies the opening context.'),
  available: Schema.array(Schema.string()).default(scanSkills()).volatile().description('Skills found on disk when the plugin loaded (read-only hint for the picker).'),
})

const FAIL = (why) => `STARTUP-BUNDLE UNAVAILABLE: preload injection failed (${why}). Call the MCPHub startup-bundle tool manually before the user's task.`

function notify(agent, text) {
  agent.inject({ role: 'user', content: [{ type: 'text', text }], source: { kind: 'skill-preload' } })
}

export function apply(ctx, config) {
  ctx.on('agent/created', async ({ agent, signal }) => {
    const skillName = String(config.skill.get() ?? 'preload').trim()
    if (!skillName || agent.session.header.origin === 'subagent') return

    try {
      const cwd = agent.session.header.cwd
      const skill = await ctx.skills.get(skillName, { cwd, signal, scope: agent })
      if (!skill?.path) {
        ctx.logger.warn('skill-preload: skill %s has no local instruction path', skillName)
        notify(agent, FAIL(`skill ${skillName} not found`))
        return
      }

      const script = join(dirname(skill.path), 'scripts', 'inject.py')
      if (!existsSync(script)) {
        ctx.logger.warn('skill-preload: %s does not provide scripts/inject.py', skillName)
        notify(agent, FAIL('no scripts/inject.py'))
        return
      }

      const { stdout } = await execFileAsync('python3', [script], {
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
        signal,
      })
      if (!stdout.trim()) {
        ctx.logger.warn('skill-preload: %s injector returned empty output', skillName)
        notify(agent, FAIL('empty injector output'))
        return
      }

      agent.inject({
        role: 'user',
        content: [{ type: 'text', text: stdout }],
        source: { kind: 'skill-preload' },
      })
    } catch (error) {
      ctx.logger.warn('skill-preload: failed to run %s injector: %o', skillName, error)
      try { notify(agent, FAIL('injector error')) } catch { /* agent gone */ }
    }
  })
}
