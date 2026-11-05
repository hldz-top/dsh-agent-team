#!/usr/bin/env node
/**
 * Build team-bundle/cordis.patch.yml from the agent/skill sources.
 *
 *   node scripts/build-bundle.mjs
 *
 * Source of truth:
 *   agents/<id>.md          -> one `@deepseek-ai/dsh-agent-preset` declaration
 *   skills/<id>/**          -> mounted per-seat through `customSkillDirs`
 *   skills/_team/**         -> shared by every seat
 *
 * Never edit the generated patch by hand.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const AGENTS_DIR = path.join(ROOT, 'agents')
const SKILLS_DIR = path.join(ROOT, 'skills')
const OUT_FILE = path.join(ROOT, 'team-bundle', 'cordis.patch.yml')

/** Role-specific capability switches. */
const ROLE = {
  pm: { plan: true, goal: true },
  audit: { plan: false, goal: true },
  englead: { plan: true, goal: true },
  qa: { plan: false, goal: false },
  tinkabot: { plan: true, goal: false },
}

/** Wrapper for a Loader `!!js` expression emitted verbatim. */
class Raw {
  constructor(value) {
    this.value = value
  }
}
const PLATFORM_BASH = new Raw("!!js process.platform === 'win32'")
const PLATFORM_PWSH = new Raw("!!js process.platform !== 'win32'")

const PLAN_SECTION = `You are in plan mode. Stay in plan mode until the owner approves your plan through exit_plan_mode or switches the session mode. Imperative language to build something means plan it, not do it: explore first with reads, searches and analysis, then submit one decision-complete plan (goal, success criteria, changes by area, risks, tests, assumptions) through exit_plan_mode as the only and final tool call of that response. A conversational "yes" approves nothing. If the review channel is unavailable, stay in plan mode and ask the owner to switch modes manually.`

// ---------------------------------------------------------------- frontmatter

function unquote(v) {
  const t = v.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1)
  }
  return t
}

function parseFrontmatter(source, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  if (!match) throw new Error(`${file}: missing YAML frontmatter`)
  const lines = match[1].split(/\r?\n/)
  const data = {}
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) {
      i++
      continue
    }
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!kv) throw new Error(`${file}: bad frontmatter line "${line}"`)
    const key = kv[1]
    let rest = kv[2].trim()

    if (rest === '>-' || rest === '>' || rest === '|') {
      i++
      const buf = []
      while (i < lines.length && (/^\s+/.test(lines[i]) || lines[i].trim() === '')) {
        buf.push(lines[i].replace(/^\s{2}/, '').replace(/\s+$/, ''))
        i++
      }
      const joined = buf.join('\n').replace(/\n+$/, '')
      data[key] = rest === '|' ? joined : joined.replace(/\s+/g, ' ').trim()
      continue
    }

    if (rest === '') {
      i++
      const arr = []
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        arr.push(unquote(lines[i].replace(/^\s*-\s+/, '')))
        i++
      }
      data[key] = arr
      continue
    }

    data[key] = unquote(rest)
    i++
  }
  return { data, body: source.slice(match[0].length).trim() }
}

// ---------------------------------------------------------------- YAML emitter

const SAFE_PLAIN = /^[A-Za-z0-9_][A-Za-z0-9_./@:+-]*$/
const RESERVED = /^(true|false|null|yes|no|on|off|~|-?\d+(\.\d+)?)$/i

function scalar(value) {
  if (value instanceof Raw) return value.value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const s = String(value)
  if (s.includes('\n')) throw new Error(`scalar() received multi-line value: ${s.slice(0, 40)}`)
  if (!s.length) return "''"
  if (SAFE_PLAIN.test(s) && !RESERVED.test(s)) return s
  return JSON.stringify(s)
}

function block(value, indent) {
  const pad = ' '.repeat(indent)
  return '\n' + value
    .split('\n')
    .map((line) => (line.length ? pad + line : ''))
    .join('\n')
}

function dump(value, indent) {
  const pad = ' '.repeat(indent)
  if (value instanceof Raw) return pad + value.value
  if (Array.isArray(value)) {
    if (!value.length) return pad + '[]'
    return value
      .map((item) => {
        if (item && typeof item === 'object' && !(item instanceof Raw)) {
          const rendered = dump(item, indent + 2).split('\n')
          return pad + '- ' + rendered[0].slice(indent + 2) + (rendered.length > 1 ? '\n' + rendered.slice(1).join('\n') : '')
        }
        return pad + '- ' + scalar(item)
      })
      .join('\n')
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined)
    if (!keys.length) return pad + '{}'
    return keys
      .map((key) => {
        const v = value[key]
        if (typeof v === 'string' && v.includes('\n')) return pad + key + ': |' + block(v, indent + 2)
        if (v && typeof v === 'object' && !(v instanceof Raw)) return pad + key + ':\n' + dump(v, indent + 2)
        return pad + key + ': ' + scalar(v)
      })
      .join('\n')
  }
  return pad + scalar(value)
}

// ---------------------------------------------------------------- composition

function presetPlugins(bot) {
  const role = ROLE[bot.id]
  if (!role) throw new Error(`agents/${bot.id}.md: unknown role id "${bot.id}" (expected ${Object.keys(ROLE).join(', ')})`)

  const seatSkills = path.join(SKILLS_DIR, bot.id)
  if (!fs.existsSync(seatSkills)) throw new Error(`missing skill directory skills/${bot.id}/`)
  const teamSkills = path.join(SKILLS_DIR, '_team')

  const plugins = [
    { id: 'persona', name: '@deepseek-ai/dsh-persona', config: { prefix: bot.persona } },
    { id: 'agent-instructions', name: '@deepseek-ai/dsh-agent-instructions', config: { maxBytes: 65536 } },
    { id: 'time-context', name: '@deepseek-ai/dsh-time-context' },
    { id: 'tool-bash', name: '@deepseek-ai/dsh-tool-bash', disabled: PLATFORM_BASH },
    { id: 'tool-pwsh', name: '@deepseek-ai/dsh-tool-pwsh', disabled: PLATFORM_PWSH },
    { id: 'tool-fs', name: '@deepseek-ai/dsh-tool-fs', config: { applyPatch: false } },
    { id: 'tool-fs-search', name: '@deepseek-ai/dsh-tool-fs-search', config: { sampleOverCapGlobResults: false } },
    { id: 'tool-jobs', name: '@deepseek-ai/dsh-tool-jobs' },
    { id: 'tool-schedule', name: '@deepseek-ai/dsh-tool-schedule' },
    {
      id: 'skill-filesystem',
      name: '@deepseek-ai/dsh-skill-filesystem',
      config: { includeDefaultRoots: true, customSkillDirs: [teamSkills, seatSkills] },
    },
    { id: 'tool-skill', name: '@deepseek-ai/dsh-tool-skill' },
    {
      id: 'compaction',
      name: 'cordis:group',
      group: true,
      isolate: { compaction: true, toolResultPruner: true },
      config: [
        { id: 'compaction-basic', name: '@deepseek-ai/dsh-compaction-basic' },
        { id: 'command-compact', name: '@deepseek-ai/dsh-command-compact' },
        {
          id: 'tool-result-pruner',
          name: '@deepseek-ai/dsh-compaction-tool-result-pruner',
          config: { thresholdChars: 8192, headChars: 4096, tailChars: 1024 },
        },
      ],
    },
    { id: 'tool-ask-user', name: '@deepseek-ai/dsh-tool-ask-user' },
    { id: 'tool-todo', name: '@deepseek-ai/dsh-tool-todo', config: { allowParallelInProgress: true } },
    { id: 'tool-web', name: '@deepseek-ai/dsh-tool-web', config: { fetch: true, searchTimeoutMs: 60000 } },
    { id: 'present', name: '@deepseek-ai/dsh-tool-present' },
    {
      id: 'delegation',
      name: 'cordis:group',
      group: true,
      isolate: { workflowEngine: true },
      config: [
        { id: 'tool-subagent-control', name: '@deepseek-ai/dsh-tool-subagent-control' },
        {
          id: 'tool-subagent',
          name: '@deepseek-ai/dsh-tool-subagent',
          config: { provider: 'spawn', toolName: 'subagent', modelSelection: true, modelDiscovery: true },
        },
        { id: 'tool-subagent-fork', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'fork', toolName: 'subagent_fork' } },
        { id: 'workflow-ptc', name: '@deepseek-ai/dsh-workflow-ptc', config: { provider: 'spawn' } },
        { id: 'tool-workflow', name: '@deepseek-ai/dsh-tool-workflow' },
      ],
    },
  ]

  if (role.plan) {
    plugins.push({
      id: 'planning',
      name: 'cordis:group',
      group: true,
      isolate: { planMode: true },
      config: [{ id: 'plan-mode', name: '@deepseek-ai/dsh-plan-mode', config: { section: PLAN_SECTION } }],
    })
  }

  if (role.goal) {
    plugins.push(
      { id: 'command-goal', name: '@deepseek-ai/dsh-command-goal' },
      { id: 'tool-goal', name: '@deepseek-ai/dsh-tool-goal' },
    )
  }

  return plugins
}

// ---------------------------------------------------------------- main

function loadSeats() {
  if (!fs.existsSync(AGENTS_DIR)) throw new Error('missing agents/ directory')
  const seatFiles = fs
    .readdirSync(AGENTS_DIR)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .sort()

  if (!seatFiles.length) throw new Error('agents/ has no seat definitions')

  return seatFiles.map((file) => {
    const source = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')
    const { data, body } = parseFrontmatter(source, `agents/${file}`)
    for (const key of ['id', 'name', 'description', 'order']) {
      if (data[key] === undefined || data[key] === '') throw new Error(`agents/${file}: missing "${key}"`)
    }
    if (!/^[a-z0-9-]+$/.test(data.id)) throw new Error(`agents/${file}: id must be lowercase letters, digits, hyphens`)

    const declared = Array.isArray(data.skills) ? data.skills : []
    for (const skill of declared) {
      const skillFile = path.join(SKILLS_DIR, data.id, skill, 'SKILL.md')
      if (!fs.existsSync(skillFile)) throw new Error(`agents/${file}: declares skill "${skill}" but ${path.relative(ROOT, skillFile)} is missing`)
    }

    const header = `You are **${data.name}** (\`${data.id}\`), one of five bot seats on this team.\n\n`
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      order: Number(data.order),
      skills: declared,
      persona: header + body,
      file,
    }
  })
}

function main() {
  const seats = loadSeats()
  seats.sort((a, b) => a.order - b.order)

  const patch = seats.map((seat) => ({
    insert: [
      {
        id: `preset-${seat.id}`,
        name: '@deepseek-ai/dsh-agent-preset',
        config: {
          id: seat.id,
          name: seat.name,
          description: seat.description,
          order: seat.order,
          plugins: presetPlugins(seat),
        },
      },
    ],
  }))

  const banner = [
    '# GENERATED by scripts/build-bundle.mjs — do not edit by hand.',
    '# Source: agents/*.md, skills/<id>/, skills/_team/',
    '#',
    '# Each block declares one Agent Preset (a bot seat). Install this bundle with',
    '#   plugin_manager { action: install_bundle, target: <abs path to team-bundle> }',
    '# then pick a seat in New Session.',
    '',
  ].join('\n')

  const yaml = banner + dump(patch, 0) + '\n'
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, yaml, 'utf8')

  // structural self-check
  const ids = seats.map((s) => s.id)
  if (new Set(ids).size !== ids.length) throw new Error('duplicate seat ids')
  if (/\t/.test(yaml)) throw new Error('generated YAML contains a tab character')

  for (const seat of seats) {
    console.log(
      `preset ${String(seat.order).padStart(3)}  ${seat.id.padEnd(9)} ${seat.name.padEnd(24)} ` +
        `${seat.skills.length} skill dir(s), ${String(seat.persona.split('\n').length).padStart(3)} persona lines`,
    )
  }
  console.log(`\nwrote ${path.relative(ROOT, OUT_FILE)} (${yaml.split('\n').length} lines)`)
  console.log('validate: node scripts/validate-bundle.mjs')
}

main()
