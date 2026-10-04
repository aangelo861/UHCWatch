/**
 * Read access to data/snapshot.json: series, latest values, medians and ranks.
 * All country keys are ISO 3166 alpha-3 codes.
 */
import fs from 'node:fs'
import { HBS_NOT_COMPARABLE, requiredElements } from './catalog.mjs'

export function loadSnapshot(file) {
  if (!fs.existsSync(file)) throw new Error(`Snapshot not found: ${file}. Run \`npm run fetch\` first.`)
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'))
  const flags = requiredElements()
  for (const dx of flags.keys()) {
    if (!snapshot.elements[dx]) throw new Error(`Snapshot has no data element ${dx}. Run \`npm run fetch\` to refresh it.`)
  }
  const countries = new Map(snapshot.countries.map((c) => [c.iso, c]))

  /** [[year, value], …] for one country, oldest first. Empty when there is no data. */
  function series(dx, iso, coc = 'default') {
    const raw = snapshot.elements[dx]?.cocs?.[coc]?.[iso] || []
    if (!flags.get(dx)?.dedupe) return raw
    // Filled-forward element: keep the first year of each run of equal values
    return raw.filter((p, i) => i === 0 || p[1] !== raw[i - 1][1])
  }

  /** { year, value } of the most recent point, or null. */
  function latest(dx, iso, coc = 'default') {
    const s = series(dx, iso, coc)
    return s.length ? { year: s[s.length - 1][0], value: s[s.length - 1][1] } : null
  }

  /** Value in a given year, or null. */
  function at(dx, iso, year, coc = 'default') {
    const p = series(dx, iso, coc).find((x) => x[0] === year)
    return p ? p[1] : null
  }

  /**
   * Latest value per country for an indicator, sorted best first (or highest
   * first when the indicator has no direction). Countries UHC Watch says are
   * not comparable are flagged and left out of ranks and the median.
   */
  function standing(ind) {
    const rows = []
    for (const c of snapshot.countries) {
      const l = latest(ind.dx, c.iso)
      if (!l) continue
      rows.push({ iso: c.iso, name: c.name, year: l.year, value: l.value, comparable: !(ind.hbs && HBS_NOT_COMPARABLE.includes(c.iso)) })
    }
    const dir = ind.better === 'lower' ? 1 : -1
    rows.sort((a, b) => dir * (a.value - b.value) || a.name.localeCompare(b.name, 'en'))
    const ranked = rows.filter((r) => r.comparable)
    ranked.forEach((r, i) => {
      // Ties share the better rank
      r.rank = i > 0 && ranked[i - 1].value === r.value ? ranked[i - 1].rank : i + 1
    })
    // The same position counted from the other end of the list
    for (let i = ranked.length - 1; i >= 0; i--) {
      const r = ranked[i]
      r.rankFromEnd = i < ranked.length - 1 && ranked[i + 1].value === r.value ? ranked[i + 1].rankFromEnd : ranked.length - i
      r.tied = (i > 0 && ranked[i - 1].value === r.value) || (i < ranked.length - 1 && ranked[i + 1].value === r.value)
    }
    const values = ranked.map((r) => r.value).sort((a, b) => a - b)
    return { rows, ranked: ranked.length, median: median(values), min: values[0], max: values[values.length - 1] }
  }

  return { snapshot, countries, series, latest, at, standing }
}

export function median(sorted) {
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** 1 decimal place below 100, none from 100; minus sign and no trailing zero noise. */
export function fmt(value, decimals = 1) {
  if (value == null || Number.isNaN(value)) return '–'
  const d = Math.abs(value) >= 100 ? Math.min(decimals, 1) : decimals
  return value.toFixed(d).replace(/^-/, '−')
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

/** URL slug for a country name: "Netherlands (Kingdom of the)" → "netherlands". */
export function slug(name) {
  return name
    .replace(/\(.*?\)/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
