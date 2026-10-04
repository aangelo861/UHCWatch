/**
 * What the site shows: themes, indicators and the breakdowns on country
 * briefings. Every entry names the UHC Watch data element (`dx`) it reads and,
 * where the element is disaggregated, the category (`coc`) by its label.
 *
 * The wording is written for policy advisors. `meaning` paraphrases the UHC
 * Watch information note for the indicator (kept verbatim under `noteKey`).
 */

export const API_BASE = 'https://apps.who.int/dhis2/uhcwatch/api'
export const UHCW_SITE = 'https://apps.who.int/dhis2/uhcwatch'
// Organisation unit group: the 53 countries of the WHO European Region
export const REGION_GROUP = 'aN3rzQZhM4i'
export const FIRST_YEAR = 2000
// UHC Watch says the household budget surveys of these countries cannot be
// compared with the others (see the catastrophic spending information note).
export const HBS_NOT_COMPARABLE = ['NLD', 'NOR']

export const THEMES = [
  {
    key: 'hardship',
    title: 'Financial hardship',
    question: 'How many households face financial hardship from paying for health care?'
  },
  {
    key: 'unmet',
    title: 'Unmet need',
    question: 'Who goes without care because of cost, distance or waiting time?'
  },
  {
    key: 'oop',
    title: 'Out-of-pocket payments',
    question: 'How much do people pay out of pocket for health care?'
  },
  {
    key: 'spending',
    title: 'Public spending on health',
    question: 'How much does government spend on health?'
  },
  {
    key: 'coverage',
    title: 'Population coverage',
    question: 'Who is entitled to publicly financed health care?'
  }
]

const HBS = 'UHC Watch analysis of household budget surveys'
const SILC = 'Eurostat, EU statistics on income and living conditions (EU-SILC)'
const EHIS = 'Eurostat, European health interview survey (EHIS)'
const GHED = 'WHO Global Health Expenditure Database'

/**
 * Indicators with a page of their own (one value per country and year).
 * better: 'lower' | 'higher' | null (no direction).
 * hbs: true when Netherlands and Norway are not comparable.
 */
export const INDICATORS = [
  {
    key: 'catastrophic-health-spending',
    theme: 'hardship',
    dx: 'WmOGqGcov4f',
    title: 'Households with catastrophic health spending',
    short: 'Catastrophic health spending',
    unit: '% of households',
    better: 'lower',
    hbs: true,
    headline: true,
    meaning:
      'Households whose out-of-pocket payments are more than 40% of their capacity to pay for health care. They may no longer be able to afford other basic needs such as food, housing and utilities.',
    source: HBS,
    noteKey: 'Indicator_FH_Catastrophic_Spending',
    breakKey: 'FH_Catastrophic_Spending'
  },
  {
    key: 'impoverishing-health-spending',
    theme: 'hardship',
    dx: 'WmE7EPNIqke',
    title: 'Households with impoverishing health spending',
    short: 'Impoverishing health spending',
    unit: '% of households',
    better: 'lower',
    hbs: true,
    headline: true,
    meaning:
      'Households pushed below the basic needs line by out-of-pocket payments (impoverished), or already below it and pushed further (further impoverished).',
    source: HBS,
    noteKey: 'Indicator_FH_Impoverishing_Spending',
    breakKey: 'FH_Impoverishing_Spending'
  },
  {
    key: 'unmet-need-health-care',
    theme: 'unmet',
    dx: 'CQq6HWprR0p',
    title: 'Unmet need for health care',
    short: 'Unmet need for health care',
    unit: '% of people',
    better: 'lower',
    headline: true,
    meaning:
      'People aged 16 and over who needed health care but did not get it because of cost, distance or waiting time.',
    source: SILC,
    noteKey: 'Indicator_UM_Health',
    breakKey: 'UM_Health'
  },
  {
    key: 'unmet-need-dental-care',
    theme: 'unmet',
    dx: 'Wm2v9VGGSuK',
    title: 'Unmet need for dental care',
    short: 'Unmet need for dental care',
    unit: '% of people',
    better: 'lower',
    headline: true,
    meaning:
      'People aged 16 and over who needed dental care but did not get it because of cost, distance or waiting time.',
    source: SILC,
    noteKey: 'Indicator_UM_Dental',
    breakKey: 'UM_Dental'
  },
  {
    key: 'unmet-need-prescribed-medicines',
    theme: 'unmet',
    dx: 'GyiW7dS7BIl',
    title: 'Unmet need for prescribed medicines due to cost',
    short: 'Unmet need for prescribed medicines',
    unit: '% of people needing care',
    better: 'lower',
    meaning:
      'People aged 15 and over who needed a prescribed medicine but could not afford it, as a share of people reporting a need for care. Surveyed in 2014 and 2019 only.',
    source: EHIS,
    noteKey: 'Indicator_UM_Prescribed'
  },
  {
    key: 'out-of-pocket-share-of-health-spending',
    theme: 'oop',
    dx: 'S8OMD0f9IZp',
    title: 'Out-of-pocket payments as a share of current spending on health',
    short: 'Out-of-pocket share of health spending',
    unit: '% of current spending on health',
    better: 'lower',
    headline: true,
    meaning:
      'The part of a country’s current spending on health that people pay themselves at the point of use. The higher it is, the more the health system relies on payments by people who are ill.',
    source: GHED,
    noteKey: 'Indicator_HS_Payments',
    breakKey: 'HS_Payments'
  },
  {
    key: 'out-of-pocket-share-of-household-budget',
    theme: 'oop',
    dx: 'KEArMA9jlw6',
    title: 'Out-of-pocket payments as a share of household spending',
    short: 'Out-of-pocket share of household budget',
    unit: '% of household consumption',
    better: 'lower',
    hbs: true,
    meaning:
      'Out-of-pocket payments for health care as a share of everything a household consumes (the household budget), averaged across all households.',
    source: HBS,
    noteKey: 'Indicator_Ho_Payments_Quintile',
    breakKey: 'Ho_Payments_Quintile'
  },
  {
    key: 'public-spending-share-of-gdp',
    theme: 'spending',
    dx: 'qO6diSOTqhL',
    title: 'Public spending on health as a share of GDP',
    short: 'Public spending on health, share of GDP',
    unit: '% of GDP',
    better: 'higher',
    headline: true,
    meaning:
      'Spending on health through compulsory schemes (government budgets and social health insurance) as a share of gross domestic product.',
    source: GHED,
    noteKey: 'Indicator_HS_Public_Spending_GDP',
    breakKey: 'HS_Public_Spending_GDP'
  },
  {
    key: 'public-spending-share-of-government-spending',
    theme: 'spending',
    dx: 'aYK8f4GuHBP',
    title: 'Public spending on health as a share of government spending',
    short: 'Health’s share of government spending',
    unit: '% of government spending',
    better: 'higher',
    meaning:
      'How much of total government spending goes to health. It shows the priority given to health when public budgets are set.',
    source: GHED,
    noteKey: 'Indicator_HS_Public_Spending',
    breakKey: 'HS_Public_Spending'
  },
  {
    key: 'public-share-of-health-spending',
    theme: 'spending',
    dx: 'yOmEYW4OgYj',
    title: 'Public spending as a share of current spending on health',
    short: 'Public share of health spending',
    unit: '% of current spending on health',
    better: 'higher',
    meaning:
      'The part of current spending on health that comes from compulsory schemes (government budgets and social health insurance) rather than from households or voluntary insurance.',
    source: GHED,
    noteKey: 'Indicator_HS_Public_Spending_Current',
    breakKey: 'HS_Public_Spending_Current'
  },
  {
    key: 'voluntary-health-insurance-share-of-health-spending',
    theme: 'spending',
    dx: 'ygo5a7mdudU',
    title: 'Voluntary health insurance as a share of current spending on health',
    short: 'Voluntary health insurance share',
    unit: '% of current spending on health',
    better: null,
    meaning:
      'The part of current spending on health paid through voluntary health insurance. A larger share is neither good nor bad in itself; what matters is who it covers and what gaps it fills.',
    source: GHED,
    noteKey: 'Indicator_HS_Voluntary_Spending',
    breakKey: 'HS_Voluntary_Spending'
  },
  {
    key: 'population-entitled-to-publicly-financed-care',
    theme: 'coverage',
    dx: 'CGk1OOt70Dz',
    title: 'Population entitled to publicly financed health care',
    short: 'Population coverage',
    unit: '% of the population',
    better: 'higher',
    headline: true,
    meaning:
      'The share of the population entitled to publicly financed health care. People left out are typically those whose entitlement depends on paying contributions or on residence status.',
    source: 'UHC Watch, from national sources',
    noteKey: 'Indicator_Co_Population_Coverage',
    // Entitlement rules change rarely, so the same value in successive years is real
    stable: true
  }
]

// Category labels as the API returns them (trimmed)
const Q = { poorest: 'Poorest', q2: '2nd', q3: '3rd', q4: '4th', richest: 'Richest' }
export const QUINTILES = [
  { coc: Q.poorest, label: 'Poorest fifth' },
  { coc: Q.q2, label: '2nd' },
  { coc: Q.q3, label: '3rd' },
  { coc: Q.q4, label: '4th' },
  { coc: Q.richest, label: 'Richest fifth' }
]
export const CARE_TYPES = ['Medicines', 'Medical products', 'Outpatient care', 'Dental care', 'Diagnostic tests', 'Inpatient care']

/**
 * Breakdowns shown on country briefings. `dedupe` marks data elements that
 * UHC Watch fills forward (a year without a survey repeats the previous
 * value); repeats are dropped so only surveyed years are shown.
 */
export const BREAKDOWNS = {
  // UHC Watch stores each fifth's contribution to the national figure (the
  // five add up to it). Each fifth holds 20% of households, so the share of
  // households affected within a fifth is the contribution × 5 – the sum UHC
  // Watch itself uses for the poorest fifth (indicator WRiCOxrLDOS).
  cataByQuintile: { dx: 'eEmQgI32ETw', cocs: QUINTILES.map((q) => q.coc), scale: 5, label: 'Households with catastrophic health spending within each consumption fifth (UHC Watch contribution × 5)', breakKey: 'FH_Spending_Quintile' },
  cataByCare: { dx: 'SGOARUeHmhb', cocs: CARE_TYPES, breakKey: 'FH_Spending_Type' },
  impoverished: { dx: 'CMKOYzqDIZD' },
  furtherImpoverished: { dx: 'OQ4P2FX0ApA' },
  unmetHealthByQuintile: { dx: 'Ks2z3Tx4SE5', cocs: [Q.poorest, Q.richest], breakKey: 'UM_Health_Quintile' },
  unmetDentalByQuintile: { dx: 'a2zFSqU1Zsb', cocs: [Q.poorest, Q.richest], breakKey: 'UM_Dental_Quintile' },
  unmetHealthUnder25: { dx: 'ER9a1Hsht0g' },
  unmetHealth65: { dx: 'COYhXNaR62J' },
  unmetDentalUnder25: { dx: 'a9BMBz5F1s6' },
  unmetDental65: { dx: 'CqwZui9SRJF' },
  unmetMedsPoorest: { dx: 'f3t7eoXUzn8' },
  unmetMedsRichest: { dx: 'dVcHTdCFpNv' },
  unmetMedsUnder25: { dx: 'xm098yOPFlh' },
  unmetMeds65: { dx: 'Kq0QsqIAaUd' },
  oopBudgetByQuintile: { dx: 'CUeuNstxvrO', cocs: QUINTILES.map((q) => q.coc), dedupe: true },
  oopByCare: { dx: 'iuywua9IeiM', cocs: CARE_TYPES, breakKey: 'Ho_Breakdown_OOP' }
}

/** Every data element the snapshot needs, with the fill-forward flag. */
export function requiredElements() {
  const out = new Map()
  for (const i of INDICATORS) out.set(i.dx, { dedupe: Boolean(i.dedupe), stable: Boolean(i.stable) })
  for (const b of Object.values(BREAKDOWNS)) out.set(b.dx, { dedupe: Boolean(b.dedupe), stable: Boolean(b.stable) })
  return out
}

export const indicator = (key) => {
  const i = INDICATORS.find((x) => x.key === key)
  if (!i) throw new Error(`Unknown indicator ${key}`)
  return i
}
export const theme = (key) => THEMES.find((t) => t.key === key)
