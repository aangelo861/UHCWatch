/**
 * Take a snapshot of the WHO/Europe UHC Watch API.
 *
 *   node src/fetch.mjs
 *
 * Reads the public DHIS2 API behind https://apps.who.int/dhis2/uhcwatch and
 * writes data/snapshot.json: the values for every data element in the
 * catalog, the 53 countries of the WHO European Region, UHC Watch's own
 * country summaries and recommendations, its information notes and its
 * break-in-series records. The build reads only this file.
 *
 * Nothing is written unless every request succeeds.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { API_BASE, REGION_GROUP, FIRST_YEAR, requiredElements } from './lib/catalog.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'data', 'snapshot.json')

const PROGRAMS = { country: 'xgaF9UtfrzK', notes: 'CXVECIdnmM1', breaks: 'uoOqwxmquTH' }
const EVENT_FIELDS = 'event,orgUnit,orgUnitName,eventDate,dataValues[dataElement,value]'
// Country groups offered as peer groups, by their code in the API
const GROUP_CODES = ['EUROPEAN_UNION_EU', 'EU_CANDIDATE_COUNTRIES', 'WESTERN_BALKANS', 'EASTERN_EUROPE_AND_CENTRAL_ASIA_EECA']

async function get(pathAndQuery, attempt = 1) {
  const url = `${API_BASE}/${pathAndQuery}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'uhc-watch-dashboards snapshot' }, redirect: 'manual' })
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 1500 * attempt))
      return get(pathAndQuery, attempt + 1)
    }
    throw new Error(`${err.message} for ${url.slice(0, 160)}`)
  }
}

/** Data element id → name with the program prefix removed, for one program's events. */
async function elementNames(ids) {
  const out = new Map()
  const list = [...ids]
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100)
    const res = await get(`dataElements.json?paging=false&fields=id,name&filter=id:in:[${chunk.join(',')}]`)
    for (const de of res.dataElements) out.set(de.id, de.name.replace(/^UHCW_/, ''))
  }
  return out
}

async function events(program) {
  const res = await get(`events.json?program=${program}&paging=false&fields=${EVENT_FIELDS}`)
  const ids = new Set(res.events.flatMap((e) => e.dataValues.map((d) => d.dataElement)))
  const names = await elementNames(ids)
  return res.events.map((e) => ({
    orgUnit: e.orgUnit,
    orgUnitName: e.orgUnitName,
    values: Object.fromEntries(e.dataValues.map((d) => [names.get(d.dataElement) || d.dataElement, d.value]))
  }))
}

function countryText(values) {
  const pick = (prefix, kind) => {
    const out = []
    for (let n = 1; n <= 15; n++) {
      const title = values[`Recommendation_${prefix}_title${n}`]
      const text = values[`Recommendation_${prefix}_text${n}`]
      if (title || text) out.push({ title: title || '', text: text || '' })
    }
    // Countries without a write-up yet carry a single placeholder title
    return kind === 'gaps' ? out.filter((g) => g.text) : out.filter((r) => r.title && !/coming soon/i.test(r.title))
  }
  return {
    currency: values['Country Currency'] || null,
    summary: values['Country Summary'] || null,
    gaps: pick('gaps', 'gaps'),
    gapsSource: values.Recommendation_gaps_sourceText || null,
    recommendations: pick('FinProtec', 'recs'),
    recommendationsSource: values.Recommendation_FinProtec_sourceText || null
  }
}

/** Stable, diff-friendly JSON: one series per line. */
function serialise(snapshot) {
  const { elements, ...rest } = snapshot
  const head = JSON.stringify(rest, null, 1)
  const lines = []
  for (const dx of Object.keys(elements).sort()) {
    const el = elements[dx]
    const cocs = Object.keys(el.cocs).sort()
    const cocLines = cocs.map((coc) => {
      const byCountry = el.cocs[coc]
      const rows = Object.keys(byCountry).sort().map((iso) => `    ${JSON.stringify(iso)}: ${JSON.stringify(byCountry[iso])}`)
      return `   ${JSON.stringify(coc)}: {\n${rows.join(',\n')}\n   }`
    })
    lines.push(`  ${JSON.stringify(dx)}: {"name": ${JSON.stringify(el.name)}, "cocs": {\n${cocLines.join(',\n')}\n  }}`)
  }
  return `${head.slice(0, head.lastIndexOf('}')).trimEnd()},\n "elements": {\n${lines.join(',\n')}\n }\n}\n`
}

async function main() {
  const required = requiredElements()
  const thisYear = new Date().getUTCFullYear()
  const periods = Array.from({ length: thisYear - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i)

  console.log('Reading the UHC Watch API …')
  const info = await get('system/info.json')

  const ous = (await get(`organisationUnits.json?paging=false&filter=organisationUnitGroups.id:eq:${REGION_GROUP}&fields=id,name,code`)).organisationUnits
  if (ous.length < 50) throw new Error(`Expected the 53 countries of the WHO European Region, got ${ous.length}`)
  const isoById = new Map(ous.map((o) => [o.id, o.code]))

  const groupsRes = await get('organisationUnitGroups.json?paging=false&fields=id,name,code,organisationUnits[id]')
  const groups = groupsRes.organisationUnitGroups
    .filter((g) => GROUP_CODES.includes(g.code))
    .map((g) => ({ code: g.code, name: g.name, members: g.organisationUnits.map((o) => isoById.get(o.id)).filter(Boolean).sort() }))
    .sort((a, b) => GROUP_CODES.indexOf(a.code) - GROUP_CODES.indexOf(b.code))

  // Values: every required data element, every category, every country and year
  const dxIds = [...required.keys()]
  const analytics = await get(
    `analytics.json?dimension=dx:${dxIds.join(';')}&dimension=co&dimension=ou:OU_GROUP-${REGION_GROUP}&dimension=pe:${periods.join(';')}&skipMeta=false&displayProperty=NAME`
  )
  const items = analytics.metaData.items
  const col = Object.fromEntries(analytics.headers.map((h, i) => [h.name, i]))
  const elements = {}
  for (const row of analytics.rows) {
    const dx = row[col.dx]
    const coc = (items[row[col.co]]?.name || row[col.co]).trim()
    const iso = isoById.get(row[col.ou])
    const value = Number(row[col.value])
    if (!iso || !Number.isFinite(value)) continue
    const el = (elements[dx] ||= { name: (items[dx]?.name || dx).replace(/^UHCW_/, '').trim(), cocs: {} })
    ;((el.cocs[coc] ||= {})[iso] ||= []).push([Number(row[col.pe]), value])
  }
  for (const el of Object.values(elements)) for (const byCountry of Object.values(el.cocs)) for (const s of Object.values(byCountry)) s.sort((a, b) => a[0] - b[0])

  const missing = dxIds.filter((dx) => !elements[dx])
  if (missing.length) throw new Error(`No values returned for data element(s): ${missing.join(', ')}`)

  // UHC Watch fills some data elements forward (a year without new data
  // repeats the last value). The catalog must mark those with dedupe: true.
  for (const dx of dxIds) {
    const all = Object.values(elements[dx].cocs).flatMap((c) => Object.values(c)).filter((s) => s.length > 1)
    const repeated = all.filter((s) => s[s.length - 1][1] === s[s.length - 2][1]).length
    const { dedupe, stable } = required.get(dx)
    if (all.length >= 10 && repeated / all.length >= 0.5 && !dedupe && !stable) {
      console.warn(`  ! ${dx} (${elements[dx].name}) looks filled forward: ${repeated} of ${all.length} series end on a repeated value. Mark it dedupe (or stable, if repeats are real) in src/lib/catalog.mjs.`)
    }
  }

  // Country text: UHC Watch summaries, gaps in coverage and recommendations
  const text = {}
  for (const e of await events(PROGRAMS.country)) {
    const iso = isoById.get(e.orgUnit)
    if (iso) text[iso] = countryText(e.values)
  }

  // Information notes (one event holding every note)
  const noteEvents = await events(PROGRAMS.notes)
  const notes = {}
  for (const e of noteEvents) for (const [k, v] of Object.entries(e.values)) notes[k.replace(/^InfoNotes_/, '')] = v

  // Breaks in series: country, year(s), wording and the charts they apply to
  const breaks = []
  for (const e of await events(PROGRAMS.breaks)) {
    const v = Object.fromEntries(Object.entries(e.values).map(([k, val]) => [k.replace(/^BreakInSeries_/, ''), val]))
    const iso = isoById.get(v.Country)
    if (!iso) continue
    breaks.push({
      country: iso,
      years: String(v.Year || '').split(/[;,]\s*/).map(Number).filter(Boolean),
      description: v.Description || '',
      applies: Object.keys(v).filter((k) => v[k] === 'true').sort()
    })
  }
  breaks.sort((a, b) => a.country.localeCompare(b.country) || a.years[0] - b.years[0])

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    source: {
      api: API_BASE,
      platform: info.systemName,
      version: info.version,
      analyticsUpdated: info.lastAnalyticsTableSuccess
    },
    countries: ous.map((o) => ({ iso: o.code, name: o.name, ...(text[o.code] || {}) })).sort((a, b) => a.name.localeCompare(b.name, 'en')),
    groups,
    notes: Object.fromEntries(Object.entries(notes).sort(([a], [b]) => a.localeCompare(b))),
    breaks,
    elements
  }

  const json = serialise(snapshot)
  JSON.parse(json) // the hand-rolled layout must still be valid JSON
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, json)
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${analytics.rows.length} values, ${ous.length} countries, ${dxIds.length} data elements (${(json.length / 1024).toFixed(0)} KB).`)
  console.log(`UHC Watch analytics last updated ${info.lastAnalyticsTableSuccess}.`)
}

main().catch((err) => {
  console.error(`Snapshot failed, data/snapshot.json left unchanged: ${err.message}`)
  process.exit(1)
})
