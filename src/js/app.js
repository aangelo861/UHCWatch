/* Site-wide behaviour.

   - Collapsible blocks (details.app-reveal): open the block that contains the
     anchor a link points to, and open every block before printing.
   - "Your country": the last country briefing opened, or the country chosen
     on an indicator page, is remembered in this browser only and put in
     focus on every ranking. Nothing is sent anywhere.
   - The country picker on the homepage and the filter on the countries page. */
(function () {
  // Collapsible blocks -------------------------------------------------------
  function openAround(el) {
    if (!el) return
    if (el.tagName === 'DETAILS') el.open = true
    var d = el.parentElement ? el.parentElement.closest('details') : null
    while (d) {
      d.open = true
      d = d.parentElement ? d.parentElement.closest('details') : null
    }
  }

  function openForHash(hash) {
    if (!hash || hash.length < 2) return
    var id
    try { id = decodeURIComponent(hash.slice(1)) } catch (e) { id = hash.slice(1) }
    var el = document.getElementById(id)
    if (!el) return
    openAround(el)
    el.scrollIntoView({ block: 'start' })
  }

  if (window.location.hash) openForHash(window.location.hash)
  window.addEventListener('load', function () {
    if (window.location.hash) setTimeout(function () { openForHash(window.location.hash) }, 50)
  })
  window.addEventListener('hashchange', function () { openForHash(window.location.hash) })

  var openedForPrint = []
  window.addEventListener('beforeprint', function () {
    openedForPrint = []
    Array.prototype.forEach.call(document.querySelectorAll('details.app-reveal:not([open]), details.app-chart__details:not([open])'), function (d) {
      d.open = true
      openedForPrint.push(d)
    })
  })
  window.addEventListener('afterprint', function () {
    openedForPrint.forEach(function (d) { d.open = false })
    openedForPrint = []
  })

  // Your country -------------------------------------------------------------
  var KEY = 'uhcw.country'
  var pref = {
    get: function () { try { return window.localStorage.getItem(KEY) || '' } catch (e) { return '' } },
    set: function (iso) { try { if (iso) window.localStorage.setItem(KEY, iso); else window.localStorage.removeItem(KEY) } catch (e) { /* private mode */ } }
  }
  window.UHCPref = pref

  var pageCountry = document.body.getAttribute('data-country')
  if (pageCountry) pref.set(pageCountry)

  // Homepage picker: choose a country, open its briefing
  var picker = document.querySelector('[data-country-picker]')
  if (picker) {
    var pickerSelect = picker.querySelector('select')
    var remembered = pref.get()
    if (remembered) {
      Array.prototype.forEach.call(pickerSelect.options, function (o) {
        if (o.getAttribute('data-iso') === remembered) pickerSelect.value = o.value
      })
    }
    picker.addEventListener('submit', function (ev) {
      if (!pickerSelect.value) return // falls through to the countries page
      ev.preventDefault()
      window.location.href = pickerSelect.value
    })
  }

  // Countries page: filter the list as you type
  var filter = document.querySelector('[data-filter]')
  if (filter) {
    var rows = document.querySelectorAll('[data-filter-text]')
    var empty = document.querySelector('[data-filter-empty]')
    var normalise = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }
    var applyFilter = function () {
      var q = normalise(filter.value.trim())
      var shown = 0
      Array.prototype.forEach.call(rows, function (row) {
        var match = !q || normalise(row.getAttribute('data-filter-text')).indexOf(q) >= 0
        row.hidden = !match
        if (match) shown++
      })
      if (empty) empty.hidden = shown > 0
    }
    filter.addEventListener('input', applyFilter)
    filter.form && filter.form.addEventListener('submit', function (ev) { ev.preventDefault() })
    applyFilter()
  }

  // Indicator pages: put one country in focus on the ranking and the trend
  var focusSelect = document.querySelector('[data-focus-select]')
  if (focusSelect) {
    var sentences = {}
    var sentenceData = document.getElementById('focus-sentences')
    if (sentenceData) { try { sentences = JSON.parse(sentenceData.textContent) } catch (e) { sentences = {} } }
    var summary = document.querySelector('[data-focus-summary]')
    var legendItem = document.querySelector('[data-focus-legend]')

    var applyFocus = function (iso) {
      Array.prototype.forEach.call(document.querySelectorAll('.app-bars[data-focusable]'), function (list) {
        var found = false
        Array.prototype.forEach.call(list.querySelectorAll('.app-bars__row'), function (row) {
          var on = Boolean(iso) && row.getAttribute('data-iso') === iso
          row.classList.toggle('is-focus', on)
          if (on) { row.setAttribute('aria-current', 'true'); found = true } else row.removeAttribute('aria-current')
        })
        list.classList.toggle('app-bars--focus', found)
      })
      Array.prototype.forEach.call(document.querySelectorAll('[data-chart]'), function (plot) {
        if (plot._chartData && plot._chartData.kind === 'focus') {
          plot._chartData.focus = iso || null
          window.UHCCharts.redraw(plot)
        }
      })
      if (summary) {
        summary.textContent = iso ? (sentences[iso] || 'No data for this country on this indicator.') : ''
        summary.hidden = !iso
      }
      if (legendItem) {
        var option = focusSelect.options[focusSelect.selectedIndex]
        legendItem.hidden = !iso || !sentences[iso]
        var name = legendItem.querySelector('[data-focus-name]')
        if (name && option) name.textContent = option.textContent
      }
    }

    var start = pref.get()
    if (start && focusSelect.querySelector('option[value="' + start + '"]')) focusSelect.value = start
    focusSelect.addEventListener('change', function () {
      pref.set(focusSelect.value)
      applyFocus(focusSelect.value)
    })
    // Charts mount on DOMContentLoaded too; run after them
    var run = function () { applyFocus(focusSelect.value) }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 0) })
    else setTimeout(run, 0)
  }
})()
