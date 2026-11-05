#!/usr/bin/env node
/**
 * Validate team-bundle/cordis.patch.yml before installing it.
 *
 *   node scripts/validate-bundle.mjs
 *
 * Checks: YAML parses, every declaration has the required preset fields, plugin
 * rows carry id+name, group rows carry a config list, `!!js` only appears on
 * `disabled`, and per-seat skill dirs exist. Exit code 1 on any failure.
 *
 * Parsing uses the first available YAML reader — python3 + PyYAML, or a js-yaml
 * copy from the Desktop app — so the workspace needs no dependencies.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PATCH = path.join(ROOT, 'team-bundle', 'cordis.patch.yml')
const require = createRequire(import.meta.url)

const PYYAML = `import json, sys, yaml
with open(sys.argv[1], 'r', encoding='utf-8') as handle:
    print(json.dumps(yaml.safe_load(handle)))
`

const JS_YAML_CANDIDATES = [
  path.join(process.env.DSH_RUNTIME_NODE_MODULES ?? '/nonexistent', 'js-yaml'),
  '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/js-yaml',
]

function parseYaml(text) {
  // `!!js` is a Loader tag no generic parser knows; its value is runtime-only.
  const parseable = text.replace(/!!js [^\n]*/g, 'null')
  const tmp = path.join(os.tmpdir(), `dsh-team-patch-${process.pid}.yml`)
  fs.writeFileSync(tmp, parseable, 'utf8')
  try {
    try {
      const out = execFileSync('python3', ['-c', PYYAML, tmp], { encoding: 'utf8', maxBuffer: 64 << 20 })
      return JSON.parse(out)
    } catch (pythonError) {
      for (const candidate of JS_YAML_CANDIDATES) {
        try {
          const yaml = require(candidate)
          return yaml.load(parseable)
        } catch {
          /* try next reader */
        }
      }
      throw new Error(`no YAML reader available (python3+PyYAML and js-yaml both failed)\n${pythonError.message}`)
    }
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

const failures = []
const fail = (message) => failures.push(message)

if (!fs.existsSync(PATCH)) {
  console.error(`missing ${path.relative(ROOT, PATCH)} — run: node scripts/build-bundle.mjs`)
  process.exit(1)
}

const raw = fs.readFileSync(PATCH, 'utf8')

let patch
try {
  patch = parseYaml(raw)
} catch (error) {
  console.error(`YAML parse failed: ${error.message}`)
  process.exit(1)
}

if (!Array.isArray(patch)) fail('patch root must be a YAML array')

const seen = new Set()
let presetCount = 0
let pluginCount = 0

function checkRow(row, where) {
  if (!row || typeof row !== 'object') return fail(`${where}: row is not a mapping`)
  if (!row.id) fail(`${where}: missing id`)
  if (!row.name) fail(`${where}: missing name`)
  if (row.group === true && !Array.isArray(row.config)) fail(`${where}: group row needs a config array`)
  if (Array.isArray(row.config)) for (const child of row.config) checkRow(child, `${where}/${row.id}`)
}

for (const [index, entry] of (patch ?? []).entries()) {
  if (!entry?.insert || !Array.isArray(entry.insert)) {
    fail(`entry[${index}]: expected an insert list`)
    continue
  }
  for (const row of entry.insert) {
    if (row.name !== '@deepseek-ai/dsh-agent-preset') {
      fail(`entry[${index}]: unexpected row ${row.name}`)
      continue
    }
    presetCount++
    const c = row.config ?? {}
    for (const key of ['id', 'name', 'description', 'order']) {
      if (c[key] === undefined || c[key] === '') fail(`${row.id}: config.${key} is required`)
    }
    if (seen.has(c.id)) fail(`duplicate preset id "${c.id}"`)
    seen.add(c.id)
    if (!Array.isArray(c.plugins) || c.plugins.length === 0) fail(`${row.id}: config.plugins must be a non-empty list`)
    for (const child of c.plugins ?? []) {
      pluginCount++
      checkRow(child, row.id)
      const dirs = child?.config?.customSkillDirs
      if (Array.isArray(dirs)) {
        for (const dir of dirs) {
          if (!path.isAbsolute(dir)) fail(`${row.id}/${child.id}: customSkillDirs entries must be absolute`)
          else if (!fs.existsSync(dir)) fail(`${row.id}/${child.id}: missing skill dir ${dir}`)
        }
      }
      if (child?.id === 'persona') {
        const prefix = child?.config?.prefix
        if (typeof prefix !== 'string' || prefix.length < 200) fail(`${row.id}/persona: prefix looks empty or truncated`)
      }
    }
  }
}

// `!!js` must only guard `disabled`.
for (const [n, line] of raw.split('\n').entries()) {
  if (line.includes('!!js') && !/^\s*disabled:/.test(line)) {
    fail(`line ${n + 1}: !!js is only allowed on disabled — "${line.trim()}"`)
  }
}

if (presetCount === 0) fail('no preset declarations found')

if (failures.length) {
  console.error(`FAIL ${failures.length} problem(s):`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}

console.log(`OK  ${presetCount} preset(s), ${pluginCount} plugin row(s), ${raw.split('\n').length} lines`)
console.log(`    ids: ${[...seen].join(', ')}`)
