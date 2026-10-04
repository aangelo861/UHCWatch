/**
 * What every page builder needs: the snapshot, country names and URLs, the
 * chart colours, and standings and yearly medians worked out once.
 */
import { INDICATORS, HBS_NOT_COMPARABLE } from './catalog.mjs'
import { median, slug, ordinal, fmt } from './data.mjs'

// Chart colours (NHS palette). The order is fixed: it was chosen with the
// dataviz palette validator so neighbours stay distinct for colour-blind
// readers. See the README before changing it.
export const COLORS = {
  series: ['#005eb8', '#ed8b00', '#ae2573', '#41b6e6', '#78be20', '#00a499'],
  // Near-black, so the median line cannot be mistaken for the country's blue
  median: '#212b32'
}

const SHORT_NAMES = { 'Netherlands (Kingdom of the)': 'Netherlands' }

export function createContext({ site, db }) {
  const { snapshot } = db
  const date = new Date(snapshot.fetchedAt)
  const snapshotDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  const countries = snapshot.countries.map((c) => ({ ...c, display: SHORT_NAMES[c.name] || c.name, slug: slug(c.name) }))
  const byIso = new Map(countries.map((c) => [c.iso, c]))
  const slugs = new Set(countries.map((c) => c.slug))
  if (slugs.size !== countries.length) throw new Error('Two countries share a URL slug')

  const standings = new Map(INDICATORS.map((i) => [i.key, db.standing(i)]))

  /** Median across comparable countries for each year most of them report. */
  const yearMedians = new Map(
    INDICATORS.map((ind) => {
      const comparable = countries.filter((c) => !(ind.hbs && HBS_NOT_COMPARABLE.includes(c.iso)))
      const withData = comparable.filter((c) => db.series(ind.dx, c.iso).length)
      const byYear = new Map()
      for (const c of withData) for (const [y, v] of db.series(ind.dx, c.iso)) byYear.set(y, [...(byYear.get(y) || []), v])
      const need = Math.max(8, Math.ceil(withData.length * 0.6))
      const points = [...byYear.entries()]
        .filter(([, vals]) => vals.length >= need)
        .sort((a, b) => a[0] - b[0])
        .map(([y, vals]) => [y, Number(median(vals.sort((a, b) => a - b)).toFixed(2))])
      // Survey-based indicators reach that level in a year or two at most: no line
      return [ind.key, points.length >= 8 ? points : []]
    })
  )

  /** "5.7% of households", "7.2% of GDP": no space before a unit that starts with %. */
  const withUnit = (value, unit) => `${fmt(value)}${unit.startsWith('%') ? '' : ' '}${unit}`

  /** "23rd lowest of 42 countries" – a position, not a judgement. */
  function rankText(ind, row, standing) {
    if (!row.comparable) return 'not comparable with other countries'
    // Lists run lowest first when lower is better, otherwise highest first.
    // Count from whichever end is nearer: "3rd highest", not "40th lowest".
    const [near, far] = ind.better === 'lower' ? ['lowest', 'highest'] : ['highest', 'lowest']
    const fromStart = row.rank <= row.rankFromEnd
    const n = fromStart ? row.rank : row.rankFromEnd
    return `${row.tied ? 'joint ' : ''}${n === 1 ? '' : `${ordinal(n)} `}${fromStart ? near : far} of ${standing.ranked} countries`
  }

  return {
    site,
    db,
    snapshot,
    snapshotDate,
    countries,
    country: (iso) => byIso.get(iso),
    standing: (ind) => standings.get(ind.key),
    yearMedian: (ind) => yearMedians.get(ind.key),
    rankText,
    withUnit,
    fmt
  }
}
