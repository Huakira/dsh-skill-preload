/**
 * Preload skills: inject the full body of configured skills into every new
 * session, so the model starts with them without having to call the skill tool.
 *
 * The fields are volatile: they are edited from the Plugins page (client.js)
 * and take effect for the next session without restarting the plugin.
 */
import { createRequire } from 'node:module'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// The bundle is linked from outside the profile, so resolve schemastery (the
// Config schema library every DSH profile ships) from the profile directory.
const profileDir = process.env.DSH_PROFILE_DIR ?? join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'profiles', process.env.DSH_PROFILE ?? 'default')
const schemaEntry = createRequire(join(profileDir, 'package.json')).resolve('@deepseek-ai/schemastery')
const Schema = (await import(pathToFileURL(schemaEntry).href)).default

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
  skills: Schema.array(Schema.string()).default(['preload']).volatile().description('Skill names to preload, in order.'),
  on: Schema.array(Schema.union(['startup', 'resume', 'clear', 'compact'])).default(['startup', 'clear']).volatile().description('Session start sources that trigger preloading.'),
  subagents: Schema.boolean().default(false).volatile().description('Also preload for subagent sessions.'),
  available: Schema.array(Schema.string()).default(scanSkills()).volatile().description('Skills found on disk when the plugin loaded (read-only hint for the picker).'),
})

export function apply(ctx, config) {
  ctx.on('agent/created', async ({ agent, source, signal }) => {
    const skills = (config.skills.get() ?? []).filter(s => typeof s === 'string' && s.trim()).map(s => s.trim())
    if (skills.length === 0) return
    if (!(config.on.get() ?? []).includes(source)) return
    if (config.subagents.get() !== true && agent.session.header.origin === 'subagent') return

    const cwd = agent.session.header.cwd
    const blocks = []
    for (const skillName of skills) {
      try {
        const skill = await ctx.skills.get(skillName, { cwd, signal })
        if (skill === undefined) {
          ctx.logger.warn('skill-preload: skill %s not found', skillName)
          continue
        }
        const body = String(skill.content).replaceAll('</system-reminder>', '<\\/system-reminder>')
        blocks.push(`<skill_content name="${skill.name}">\n${body}\n</skill_content>`)
      } catch (error) {
        ctx.logger.warn('skill-preload: failed to load %s: %o', skillName, error)
      }
    }
    if (blocks.length === 0) return

    const text = [
      '<system-reminder>',
      'Preloaded skills (full text below). Follow them. If they tell you to load other skills, do that first.',
      '',
      blocks.join('\n\n'),
      '</system-reminder>',
    ].join('\n')

    agent.inject({
      role: 'user',
      content: [{ type: 'text', text }],
      source: { kind: 'skill-preload' },
    })
  })
}
