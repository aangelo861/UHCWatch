/**
 * Internal link checker for the built site. Verifies that every relative href
 * and src resolves to a file, and that every #fragment resolves to an id.
 */
import fs from 'node:fs'
import path from 'node:path'

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else if (entry.name.endsWith('.html')) out.push(p)
  }
  return out
}

export function checkLinks(outDir) {
  outDir = path.resolve(outDir) // ids are keyed by the same absolute paths that links resolve to
  const files = walk(outDir)
  const ids = new Map()
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8')
    ids.set(f, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])))
  }
  const errors = []
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8')
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const raw = m[1]
      if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(raw)) continue
      const [p, hash] = raw.split('#')
      const target = p ? path.resolve(path.dirname(f), p.split('?')[0]) : f
      if (!fs.existsSync(target)) {
        errors.push(`${path.relative(outDir, f)}: missing target ${raw}`)
        continue
      }
      if (hash && target.endsWith('.html')) {
        const set = ids.get(target)
        if (!set || !set.has(hash)) errors.push(`${path.relative(outDir, f)}: missing anchor #${hash} in ${path.relative(outDir, target)}`)
      }
    }
  }
  return { files: files.length, errors }
}
