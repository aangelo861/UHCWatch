/**
 * Countries: the A to Z list and one briefing per country.
 *
 * A briefing follows the same order every time: key figures → UHC Watch's
 * summary → one collapsible block per question (each opens with the takeaway,
 * then the charts) → gaps in coverage and recommendations in UHC Watch's own
 * words → sources.
 */
import * as h from '../lib/html.mjs'
import { INDICATORS, BREAKDOWNS, QUINTILES, CARE_TYPES, HBS_NOT_COMPARABLE, UHCW_SITE, indicator } from '../lib/catalog.mjs'
import { COLORS } from '../lib/context.mjs'
import { renderText, renderInline } from '../lib/markdown.mjs'
import { fmt } from '../lib/data.mjs'

const [C1, C2, C3] = COLORS.series
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1)

export function buildCountriesIndex(ctx) {
  const { site, countries, db } = ctx
  const page = { url: site.urls.countries, title: 'Countries', navKey: 'countries' }
  const href = (to) => site.href(page.url, to)
  const cata = indicator('catastrophic-health-spending')
  const oop = indicator('out-of-pocket-share-of-health-spending')

  const rows = h.navRows(
    countries.map((c) => {
      const a = db.latest(cata.dx, c.iso)
      const b = db.latest(oop.dx, c.iso)
      const bits = []
      if (a) bits.push(`Catastrophic health spending ${fmt(a.value)}% (${a.year})`)
      if (b) bits.push(`out-of-pocket share ${fmt(b.value)}% (${b.year})`)
      return { text: h.esc(c.display), href: href(site.urls.country(c.slug)), description: bits.join(' · '), filterText: `${c.name} ${c.iso}` }
    }),
    { label: 'Countries' }
  )

  const content = `
<h1 class="nhsuk-heading-l">Countries</h1>
<p>Open a briefing for any of the ${countries.length} countries of the WHO European Region.</p>
<form class="app-picker" role="search">
  <div class="nhsuk-form-group">
    <label class="nhsuk-label nhsuk-label--s" for="filter">Filter by country name</label>
    <input class="nhsuk-input app-picker__control" id="filter" type="search" autocomplete="off" enterkeyhint="search" data-filter>
  </div>
</form>
${rows}
<p class="app-filter__empty" data-filter-empty hidden>No country matches. Check the spelling or clear the filter.</p>
`
  return { page, html: h.layout({ site, page, content, snapshotDate: ctx.snapshotDate }) }
}

export function buildCountryPages(ctx) {
  return ctx.countries.map((c, i) => buildCountry(ctx, c, ctx.countries[i - 1], ctx.countries[i + 1]))
}

function buildCountry(ctx, c, prev, next) {
  const { site, db, snapshot } = ctx
  const page = {
    url: site.urls.country(c.slug),
    title: c.display,
    navKey: 'countries',
    country: c.iso,
    description: `${c.display}: financial hardship, unmet need, out-of-pocket payments and public spending on health, from WHO/Europe UHC Watch data.`
  }
  const href = (to) => site.href(page.url, to)
  const iso = c.iso
  const S = (dx, coc) => db.series(dx, iso, coc)
  const L = (dx, coc) => db.latest(dx, iso, coc)
  const notComparable = HBS_NOT_COMPARABLE.includes(iso)

  const breaksFor = (key) => snapshot.breaks.filter((b) => b.country === iso && b.applies.includes(key))
  const breakYears = (key) => breaksFor(key).flatMap((b) => b.years)
  const breakNotes = (key) => {
    const years = breakYears(key)
    return years.length ? [`Break in series in ${list(years)}: UHC Watch says figures before and after are not comparable.`] : []
  }
  const sourceOf = (ind) => `${ind.source}, through UHC Watch`

  // Key figures --------------------------------------------------------------
  const tiles = INDICATORS.filter((i) => i.headline).map((ind) => {
    const st = ctx.standing(ind)
    const row = st.rows.find((r) => r.iso === iso)
    const base = { label: ind.short, href: href(site.urls.indicator(ind.key)) }
    if (!row) return { ...base, value: null }
    return { ...base, value: row.value, unit: ind.unit, year: row.year, rankText: ctx.rankText(ind, row, st), median: st.median, min: st.min, max: st.max }
  })

  // Financial hardship -------------------------------------------------------
  const cata = indicator('catastrophic-health-spending')
  const impov = indicator('impoverishing-health-spending')
  const cataLatest = L(cata.dx)
  const hardship = []
  if (cataLatest) {
    const year = cataLatest.year
    const quint = QUINTILES.map((q) => ({ label: q.label, value: db.at(BREAKDOWNS.cataByQuintile.dx, iso, year, q.coc) }))
      .filter((r) => r.value != null)
      .map((r) => ({ ...r, value: r.value * BREAKDOWNS.cataByQuintile.scale }))
    const care = CARE_TYPES.map((t) => ({ label: t, value: db.at(BREAKDOWNS.cataByCare.dx, iso, year, t) }))
      .filter((r) => r.value != null)
      .sort((a, b) => b.value - a.value)
    const impovLatest = L(impov.dx)

    const sentences = [`In ${year}, <strong>${fmt(cataLatest.value)}% of households</strong> had catastrophic health spending.`]
    if (quint.length === 5) sentences.push(`In the poorest fifth of households it was ${fmt(quint[0].value)}%; in the richest fifth, ${fmt(quint[4].value)}%.`)
    if (care.length && care[0].value > 0) sentences.push(`Among households with catastrophic spending, ${lower(care[0].label)} accounted for the largest share of out-of-pocket payments (${fmt(care[0].value)}%).`)
    if (impovLatest) sentences.push(`${fmt(impovLatest.value)}% of households were impoverished or further impoverished by out-of-pocket payments (${impovLatest.year}).`)
    hardship.push(takeaway(sentences, notComparable ? `UHC Watch says the household budget survey in ${h.esc(c.display)} cannot be compared with other countries.` : null))

    hardship.push(
      h.chartFigure({
        title: 'Households with catastrophic or impoverishing health spending',
        unit: '% of households',
        series: [
          { name: 'Catastrophic', color: C1, points: S(cata.dx) },
          { name: 'Impoverishing', color: C2, points: S(impov.dx) }
        ],
        breaks: breakYears(cata.breakKey),
        notes: breakNotes(cata.breakKey),
        source: sourceOf(cata)
      })
    )
    if (quint.length) {
      hardship.push(`<h3 class="app-chart__title">Catastrophic health spending by household consumption, ${year}</h3>
<p class="app-chart__unit">% of households in each fifth, from poorest to richest</p>
${h.barList(quint, { label: `Catastrophic health spending by consumption fifth, ${year}` })}
<p class="app-chart__note">Worked out from UHC Watch’s figures: it publishes each fifth’s contribution to the national figure, shown here multiplied by five.</p>`)
    }
    if (care.length) {
      hardship.push(`<h3 class="app-chart__title">What households with catastrophic spending pay for, ${year}</h3>
<p class="app-chart__unit">% of their out-of-pocket payments, by type of care</p>
${h.barList(care, { label: `Out-of-pocket payments in households with catastrophic spending by type of care, ${year}`, max: 100 })}`)
    }
  }

  // Unmet need ----------------------------------------------------------------
  const unmet = []
  const unmetSentences = []
  const careKinds = [
    { ind: indicator('unmet-need-health-care'), word: 'health care', quint: BREAKDOWNS.unmetHealthByQuintile, young: BREAKDOWNS.unmetHealthUnder25, old: BREAKDOWNS.unmetHealth65 },
    { ind: indicator('unmet-need-dental-care'), word: 'dental care', quint: BREAKDOWNS.unmetDentalByQuintile, young: BREAKDOWNS.unmetDentalUnder25, old: BREAKDOWNS.unmetDental65 }
  ]
  const unmetCharts = []
  for (const k of careKinds) {
    const latest = L(k.ind.dx)
    if (!latest) continue
    const year = latest.year
    const poorest = db.at(k.quint.dx, iso, year, 'Poorest')
    const richest = db.at(k.quint.dx, iso, year, 'Richest')
    unmetSentences.push(
      `In ${year}, <strong>${fmt(latest.value)}% of people</strong> had unmet need for ${k.word}${poorest != null && richest != null ? `: ${fmt(poorest)}% in the poorest fifth and ${fmt(richest)}% in the richest` : ''}.`
    )
    unmetCharts.push(
      h.chartFigure({
        title: `Unmet need for ${k.word} due to cost, distance or waiting time`,
        unit: '% of people aged 16 and over',
        series: [
          { name: 'Everyone', color: C1, points: S(k.ind.dx) },
          { name: 'Poorest fifth', color: C2, points: S(k.quint.dx, 'Poorest') },
          { name: 'Richest fifth', color: C3, points: S(k.quint.dx, 'Richest') }
        ],
        breaks: breakYears(k.ind.breakKey),
        notes: breakNotes(k.ind.breakKey),
        source: sourceOf(k.ind)
      })
    )
    const groups = [
      { label: 'Everyone', value: latest.value },
      { label: 'Poorest fifth', value: poorest },
      { label: 'Richest fifth', value: richest },
      { label: 'Under 25', value: db.at(k.young.dx, iso, year) },
      { label: '65 and over', value: db.at(k.old.dx, iso, year) }
    ].filter((r) => r.value != null)
    if (groups.length > 1) {
      unmetCharts.push(`<h3 class="app-chart__title">Who goes without ${k.word}, ${year}</h3>
<p class="app-chart__unit">% of people in each group with unmet need</p>
${h.barList(groups, { label: `Unmet need for ${k.word} by group, ${year}` })}`)
    }
  }
  const meds = indicator('unmet-need-prescribed-medicines')
  const medsLatest = L(meds.dx)
  if (medsLatest) {
    const year = medsLatest.year
    const groups = [
      { label: 'Everyone', value: medsLatest.value },
      { label: 'Poorest fifth', value: db.at(BREAKDOWNS.unmetMedsPoorest.dx, iso, year) },
      { label: 'Richest fifth', value: db.at(BREAKDOWNS.unmetMedsRichest.dx, iso, year) },
      { label: 'Under 25', value: db.at(BREAKDOWNS.unmetMedsUnder25.dx, iso, year) },
      { label: '65 and over', value: db.at(BREAKDOWNS.unmetMeds65.dx, iso, year) }
    ].filter((r) => r.value != null)
    unmetSentences.push(`${fmt(medsLatest.value)}% of people needing care could not afford a prescribed medicine (${year}).`)
    unmetCharts.push(`<h3 class="app-chart__title">Who could not afford a prescribed medicine, ${year}</h3>
<p class="app-chart__unit">% of people aged 15 and over reporting a need for care</p>
${h.barList(groups, { label: `Unmet need for prescribed medicines due to cost by group, ${year}` })}
<p class="app-chart__source">Source: ${sourceOf(meds)}</p>`)
  }
  if (unmetSentences.length) unmet.push(takeaway(unmetSentences), ...unmetCharts)

  // Out-of-pocket payments -----------------------------------------------------
  const oopShare = indicator('out-of-pocket-share-of-health-spending')
  const oopBudget = indicator('out-of-pocket-share-of-household-budget')
  const oop = []
  const oopSentences = []
  const oopShareLatest = L(oopShare.dx)
  if (oopShareLatest) {
    const st = ctx.standing(oopShare)
    oopSentences.push(`Out-of-pocket payments were <strong>${fmt(oopShareLatest.value)}% of current spending on health</strong> in ${oopShareLatest.year}. The median across ${st.ranked} countries is ${fmt(st.median)}%.`)
  }
  const budgetLatest = L(oopBudget.dx)
  if (budgetLatest) oopSentences.push(`Households spent ${fmt(budgetLatest.value)}% of their budget on out-of-pocket payments for health care (${budgetLatest.year}).`)
  if (oopSentences.length) oop.push(takeaway(oopSentences))
  if (oopShareLatest) {
    oop.push(
      h.chartFigure({
        title: 'Out-of-pocket payments as a share of current spending on health',
        unit: oopShare.unit,
        series: [
          { name: c.display, color: C1, points: S(oopShare.dx) },
          { name: 'Median of countries', color: COLORS.median, points: ctx.yearMedian(oopShare) }
        ],
        breaks: breakYears(oopShare.breakKey),
        notes: breakNotes(oopShare.breakKey),
        source: sourceOf(oopShare)
      })
    )
  }
  if (budgetLatest) {
    const year = budgetLatest.year
    const quint = QUINTILES.map((q) => ({ label: q.label, value: db.at(BREAKDOWNS.oopBudgetByQuintile.dx, iso, year, q.coc) })).filter((r) => r.value != null)
    if (quint.length === 5) {
      oop.push(`<h3 class="app-chart__title">Share of the household budget spent out of pocket on health care, ${year}</h3>
<p class="app-chart__unit">% of household consumption in each fifth, from poorest to richest</p>
${h.barList(quint, { label: `Out-of-pocket payments as a share of household consumption by consumption fifth, ${year}` })}`)
    }
    const care = CARE_TYPES.map((t) => ({ label: t, value: db.at(BREAKDOWNS.oopByCare.dx, iso, year, t) }))
      .filter((r) => r.value != null)
      .sort((a, b) => b.value - a.value)
    if (care.length) {
      oop.push(`<h3 class="app-chart__title">What households pay for out of pocket, ${year}</h3>
<p class="app-chart__unit">% of out-of-pocket payments, by type of care</p>
${h.barList(care, { label: `Out-of-pocket payments by type of care, ${year}`, max: 100 })}
<p class="app-chart__source">Source: ${sourceOf(oopBudget)}</p>`)
    }
  }

  // Public spending on health ---------------------------------------------------
  const pubGdp = indicator('public-spending-share-of-gdp')
  const pubGov = indicator('public-spending-share-of-government-spending')
  const pubShare = indicator('public-share-of-health-spending')
  const vhi = indicator('voluntary-health-insurance-share-of-health-spending')
  const spending = []
  const gdpLatest = L(pubGdp.dx)
  if (gdpLatest) {
    const st = ctx.standing(pubGdp)
    const govLatest = L(pubGov.dx)
    const sentences = [`Public spending on health was <strong>${fmt(gdpLatest.value)}% of GDP</strong> in ${gdpLatest.year}. The median across ${st.ranked} countries is ${fmt(st.median)}%.`]
    if (govLatest) sentences.push(`Health took ${fmt(govLatest.value)}% of government spending (${govLatest.year}).`)
    spending.push(takeaway(sentences))
    spending.push(
      h.chartFigure({
        title: 'Public spending on health as a share of GDP',
        unit: pubGdp.unit,
        series: [
          { name: c.display, color: C1, points: S(pubGdp.dx) },
          { name: 'Median of countries', color: COLORS.median, points: ctx.yearMedian(pubGdp) }
        ],
        breaks: breakYears(pubGdp.breakKey),
        notes: breakNotes(pubGdp.breakKey),
        source: sourceOf(pubGdp)
      })
    )
    spending.push(
      h.chartFigure({
        title: 'Public spending on health as a share of government spending',
        unit: pubGov.unit,
        series: [
          { name: c.display, color: C1, points: S(pubGov.dx) },
          { name: 'Median of countries', color: COLORS.median, points: ctx.yearMedian(pubGov) }
        ],
        source: sourceOf(pubGov)
      })
    )
    spending.push(
      h.chartFigure({
        title: 'Who pays for health care',
        unit: '% of current spending on health',
        series: [
          { name: 'Public spending', color: C1, points: S(pubShare.dx) },
          { name: 'Voluntary health insurance', color: C2, points: S(vhi.dx) },
          { name: 'Out-of-pocket payments', color: C3, points: S(oopShare.dx) }
        ],
        notes: ['The three shares do not always add up to 100%: other voluntary schemes make up the rest.'],
        source: sourceOf(pubShare)
      })
    )
  }

  // UHC Watch's own words ---------------------------------------------------------
  const summary = c.summary
    ? h.careCard({
        heading: 'UHC Watch summary',
        hiddenPrefix: null,
        html: `<div class="app-quoted">${renderText(c.summary)}</div>`
      })
    : ''
  const gaps = (c.gaps || []).length
    ? `${c.gaps.map((g) => `<div class="app-recommendation"><h3 class="nhsuk-heading-s app-recommendation__heading">${renderInline(g.title)}</h3>${renderText(g.text)}</div>`).join('\n')}
${c.gapsSource ? `<p class="nhsuk-body-s">${renderInline(c.gapsSource)}</p>` : ''}`
    : ''
  const recs = (c.recommendations || []).length
    ? `<p>UHC Watch’s recommendations for improving financial protection in ${h.esc(c.display)}, in its own words.</p>
${c.recommendations.map((r) => `<div class="app-recommendation"><h3 class="nhsuk-heading-s app-recommendation__heading">${renderInline(r.title)}</h3>${renderText(r.text)}</div>`).join('\n')}
${c.recommendationsSource ? `<div class="nhsuk-body-s app-quoted">${renderText(c.recommendationsSource)}</div>` : ''}`
    : ''

  const blocks = [
    { id: 'financial-hardship', heading: 'How many households face financial hardship?', html: hardship.join('\n') },
    { id: 'unmet-need', heading: 'Who goes without care?', html: unmet.join('\n') },
    { id: 'out-of-pocket-payments', heading: 'How much do people pay out of pocket?', html: oop.join('\n') },
    { id: 'public-spending', heading: 'How much does government spend on health?', html: spending.join('\n') },
    { id: 'gaps-in-coverage', heading: 'Where are the gaps in coverage?', html: gaps },
    { id: 'recommendations', heading: 'What does UHC Watch recommend?', html: recs }
  ].filter((b) => b.html)
  const missing = []
  if (!hardship.length) missing.push('financial hardship')
  if (!unmet.length) missing.push('unmet need')

  const content = `
<h1 class="nhsuk-heading-l"><span class="app-page-caption">Country briefing</span>${h.esc(c.display)}</h1>
<h2 class="nhsuk-heading-m">Key figures</h2>
<p class="nhsuk-body-s">Latest year for each figure. The strip shows where ${h.esc(c.display)} sits between the lowest and highest country; the tick is the median.</p>
${h.keyFigures(tiles)}
${summary}
<div class="app-reveal-group">
${blocks.map((b, i) => h.reveal({ id: b.id, heading: b.heading, html: b.html, open: i === 0 })).join('\n')}
</div>
${missing.length ? h.insetText(`<p>UHC Watch has no figures on ${list(missing)} for ${h.esc(c.display)}.</p>`) : ''}
${h.actionLink({ href: href(`${site.urls.compare}?c=${iso}`), text: `Compare ${h.esc(c.display)} with other countries` })}
${h.sourceNote([
    `<a href="${UHCW_SITE}">UHC Watch</a>, WHO Regional Office for Europe. Data read on ${ctx.snapshotDate}.`,
    `<a href="${href(site.urls.countryCsv(c.slug))}" download>Download the figures on this page (CSV)</a>`,
    `<a href="${href(site.urls.about)}">About the data: sources, definitions and limits</a>`
  ])}
${h.pagination({
    prev: prev && { href: href(site.urls.country(prev.slug)), label: h.esc(prev.display) },
    next: next && { href: href(site.urls.country(next.slug)), label: h.esc(next.display) }
  })}
`
  const html = h.layout({ site, page, content, snapshotDate: ctx.snapshotDate, breadcrumbs: [{ text: 'Countries', href: href(site.urls.countries) }] })
  return { page, html, csv: { url: site.urls.countryCsv(c.slug), text: countryCsv(ctx, c) } }
}

function takeaway(sentences, caution) {
  return `<div class="app-takeaway">
  <p>${sentences.join(' ')}</p>${caution ? `\n  <p class="nhsuk-body-s">${caution}</p>` : ''}
</div>`
}

function list(items) {
  const s = items.map(String)
  return s.length < 2 ? s.join('') : `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}`
}

/** Every figure the briefing draws on, one row per value. */
function countryCsv(ctx, c) {
  const { db } = ctx
  const rows = [['country', 'iso3', 'measure', 'group', 'unit', 'year', 'value']]
  const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  for (const ind of INDICATORS) {
    for (const [y, v] of db.series(ind.dx, c.iso)) rows.push([c.name, c.iso, ind.title, 'All', ind.unit, y, v])
  }
  for (const b of Object.values(BREAKDOWNS)) {
    const name = b.label || ctx.snapshot.elements[b.dx].name
    for (const coc of b.cocs || ['default']) {
      for (const [y, v] of db.series(b.dx, c.iso, coc)) rows.push([c.name, c.iso, name, coc === 'default' ? 'All' : coc, '%', y, Number((v * (b.scale || 1)).toFixed(2))])
    }
  }
  return rows.map((r) => r.map((x) => q(String(x))).join(',')).join('\n') + '\n'
}
