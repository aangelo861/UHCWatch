/* Compare countries: up to four countries side by side on every indicator.

   The selection lives in the address (?c=CZE,POL,SVK) so a comparison can be
   bookmarked or sent to a colleague. Each country keeps the colour of the
   slot it was chosen in. All text is inserted with textContent. */
(function () {
  var COLORS = ['#005eb8', '#ed8b00', '#ae2573', '#41b6e6']
  var root = document.body.getAttribute('data-root') || ''
  var out = document.querySelector('[data-compare-output]')
  var status = document.querySelector('[data-compare-status]')
  var selects = Array.prototype.slice.call(document.querySelectorAll('[data-compare-select]'))
  if (!out || !selects.length) return
  var fmt = window.UHCCharts.fmt
  var data = null

  function el(name, className, parent, text) {
    var node = document.createElement(name)
    if (className) node.className = className
    if (text != null) node.textContent = text
    if (parent) parent.appendChild(node)
    return node
  }

  function selected() {
    var seen = {}
    return selects
      .map(function (s, i) { return { iso: s.value, color: COLORS[i] } })
      .filter(function (c) {
        if (!c.iso || seen[c.iso]) return false
        seen[c.iso] = true
        return true
      })
  }

  function fromAddress() {
    var m = window.location.search.match(/[?&]c=([^&]*)/)
    var list = m ? decodeURIComponent(m[1]).split(',').filter(Boolean) : []
    if (!list.length && window.UHCPref && window.UHCPref.get()) list = [window.UHCPref.get()]
    selects.forEach(function (s, i) {
      var iso = list[i] || ''
      s.value = s.querySelector('option[value="' + iso + '"]') ? iso : ''
    })
  }

  function toAddress(chosen) {
    var query = chosen.length ? '?c=' + chosen.map(function (c) { return c.iso }).join(',') : window.location.pathname
    try { window.history.replaceState(null, '', query) } catch (e) { /* file:// */ }
  }

  function latest(points) {
    return points && points.length ? points[points.length - 1] : null
  }

  function render() {
    var chosen = selected()
    toAddress(chosen)
    out.textContent = ''
    if (!chosen.length) {
      status.textContent = 'Choose at least one country to see its figures.'
      return
    }
    var names = chosen.map(function (c) { return data.countries[c.iso].name })
    status.textContent = 'Showing ' + names.join(', ') + '.'

    // One block per indicator: each country's latest figure as a bar in its
    // own colour (which doubles as the key for the lines), then the trend
    data.indicators.forEach(function (ind) {
      var series = chosen
        .map(function (c, i) { return { name: names[i], color: c.color, points: ind.series[c.iso] || [] } })
        .filter(function (s) { return s.points.length })
      var figure = el('figure', 'app-chart', out)
      var caption = el('figcaption', 'app-chart__caption', figure)
      var title = el('h2', 'app-chart__title', caption)
      var link = el('a', '', title, ind.title)
      link.href = root + 'indicator/' + ind.key + '.html'
      el('p', 'app-chart__unit', caption, ind.unit + (ind.better ? ' · ' + ind.better + ' is better' : ''))
      if (!series.length) {
        el('p', 'app-chart__note', figure, 'No data for the countries chosen.')
        return
      }
      var top = Math.max.apply(null, series.map(function (s) { return latest(s.points)[1] }))
      var bars = el('ul', 'app-bars', figure)
      bars.setAttribute('aria-label', ind.title + ', latest figure for each country')
      series.forEach(function (s) {
        var p = latest(s.points)
        var row = el('li', 'app-bars__row', bars)
        var label = el('span', 'app-bars__label', row, s.name)
        el('span', 'app-bars__note', label, String(p[0]))
        var bar = el('span', 'app-bars__bar', el('span', 'app-bars__track', row))
        bar.style.width = (top > 0 ? Math.max(0, (p[1] / top) * 100) : 0).toFixed(2) + '%'
        bar.style.backgroundColor = s.color
        el('span', 'app-bars__value', row, fmt(p[1]))
      })
      var missing = chosen.filter(function (c) { return !(ind.series[c.iso] || []).length }).map(function (c) { return data.countries[c.iso].name })
      var plot = el('div', 'app-chart__plot', figure)
      plot.setAttribute('data-chart', '')
      plot.tabIndex = 0
      plot.setAttribute('role', 'img')
      plot.setAttribute('aria-label', ind.title + ' over time. Line chart; the latest figures are in the list above.')
      window.UHCCharts.mount(plot, { kind: 'line', unit: ind.unit, series: series, breaks: [] })
      if (missing.length) el('p', 'app-chart__note', figure, 'No data: ' + missing.join(', ') + '.')
      var flagged = chosen.filter(function (c) { return (ind.notComparable || []).indexOf(c.iso) >= 0 }).map(function (c) { return data.countries[c.iso].name })
      if (flagged.length) el('p', 'app-chart__note', figure, 'UHC Watch says the household budget survey of ' + flagged.join(' and ') + ' cannot be compared with other countries.')
      el('p', 'app-chart__source', figure, 'Source: ' + ind.source + ', through UHC Watch.')
    })
  }

  selects.forEach(function (s) { s.addEventListener('change', render) })

  status.textContent = 'Loading the figures …'
  fetch(root + 'data/compare.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return res.json()
    })
    .then(function (json) {
      data = json
      fromAddress()
      render()
    })
    .catch(function () {
      status.textContent = 'The figures could not be loaded. Check your connection and reload the page.'
    })
})()
