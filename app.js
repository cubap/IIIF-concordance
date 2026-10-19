import { normalize, detectVersion, normalizeAnnotation, getLabel } from './iiif.js'
import { parseQuery, buildUrl } from './query.js'
import { getInboxes, saveInboxes, getOptIn, setOptIn, queryInbox } from './ldn.js'
import { escapeHtml, sanitizeHtml, parseXYWH, cropImage } from './utils.js'
import { wordSort, addWordsToData } from './wordUtils.js'

const DEFAULT_INBOX = 'https://inbox.rerum.io/messages'

async function fetchJSON(uri) {
  if (/^http:\/\//i.test(uri)) {
    throw new Error('HTTP sources are not supported; use an HTTPS URI.')
  }
  const res = await fetch(uri)
  if (!res.ok) throw new Error(`Failed to load ${uri}: ${res.status} ${res.statusText}`)
  return res.json()
}

const safeFetchJSON = async (uri) => {
  try {
    return await fetchJSON(uri)
  } catch {
    return null
  }
}

const normalizeUri = (uri) => uri.replace(/^https?:/, '')

const extractPageUri = (item) => (typeof item === 'string' ? item : (item?.id ?? item?.['@id']))

const isCollectionType = (p) => {
  if (typeof p === 'string') return true
  const t = p?.type
  return Array.isArray(t)
    ? t.includes('AnnotationCollection') || t.includes('Collection')
    : t === 'AnnotationCollection' || t === 'Collection'
}

const extractTargetCanvasId = (annotation) => {
  let target = annotation.target
  if (typeof target === 'object') {
    target = target.source ?? target.id ?? target['@id']
  }
  return typeof target === 'string' ? target.split('#')[0] : null
}

const debounce = (fn, delay = 300) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

const sortWords = (list, sortType, words) => {
  const sorters = {
    smallest: (a, b) => words[a].length - words[b].length,
    largest: (a, b) => words[b].length - words[a].length,
  }
  return sorters[sortType] ? list.sort(sorters[sortType]) : list
}

const markupWordOccurrence = (word, data) => {
  const start = data.pos
  const end = data.pos + word.length
  return `${data.line.substring(0, start)}<mark>${data.line.substring(start, end)}</mark>${data.line.substring(end)}`
}

class ConcordanceViewer extends HTMLElement {
  constructor() {
    super()
    this.state = {
      resource: null,
      canvasIndex: -1, // -1 = all canvases
      language: 'en',
      loading: false,
      error: null,
      ldn: { results: [], included: new Set(), checked: false },
      shareOpen: false,
      settingsOpen: false,
      region: null,
      focusAnnotation: null,
      searchy: '',
      searchin: false,
      wordLength: 1,
      occurs: 1,
      sorting: '',
      words: {},
      index: {},
      pages: [],
    }
    this.onPopState = () => this.init()
    this.onMessage = (event) => this.handleMessage(event)
    this.onLineSelected = (event) => this.handleLinePeek(event)
    this.onWordSelected = (event) => this.handleWordPeek(event)
  }

  connectedCallback() {
    this.addEventListener('click', this.onClick)
    this.addEventListener('change', this.onChange)
    this.addEventListener('input', this.onInput)
    window.addEventListener('popstate', this.onPopState)
    window.addEventListener('message', this.onMessage)
    window.addEventListener('line:selected', this.onLineSelected)
    window.addEventListener('word:selected', this.onWordSelected)
    this.debouncedSearch = debounce(() => {
      const el = this.querySelector('[data-action="search-input"]')
      if (!el) return
      this.state.searchy = el.value
      this.filterWordList()
    })
    this.debouncedWordLength = debounce(() => {
      const el = this.querySelector('[data-action="word-length"]')
      if (!el) return
      this.state.wordLength = parseInt(el.value, 10) || 1
      this.renderWordList()
    })
    this.debouncedOccurs = debounce(() => {
      const el = this.querySelector('[data-action="occurs"]')
      if (!el) return
      this.state.occurs = parseInt(el.value, 10) || 1
      this.renderWordList()
    })
    this.init()
  }

  disconnectedCallback() {
    window.removeEventListener('popstate', this.onPopState)
    window.removeEventListener('message', this.onMessage)
    window.removeEventListener('line:selected', this.onLineSelected)
    window.removeEventListener('word:selected', this.onWordSelected)
  }

  async init() {
    const q = parseQuery()
    if (q.iiifContent) {
      await this.loadResource(q.iiifContent, q)
    } else if (q.manifest) {
      await this.loadResource(q.manifest, q)
    } else {
      this.render()
    }
  }

  onClick(event) {
    const el = event.target.closest('[data-action]')
    if (!el) return
    const action = el.dataset.action
    if ((action === 'close-share' || action === 'close-settings') && event.target !== el) return
    switch (action) {
      case 'load-input':
        this.loadFromInput()
        break
      case 'toggle-search-mode':
        this.state.searchin = !this.state.searchin
        this.filterWordList()
        break
      case 'set-index':
        this.state.searchy = el.dataset.index || ''
        const input = this.querySelector('[data-action="search-input"]')
        if (input) input.value = this.state.searchy
        this.filterWordList()
        break
      case 'word-scroll':
        this.scrollToWord(el.dataset.word, el)
        break
      case 'line-selected':
        this.onLineClick(el)
        break
      case 'word-selected':
        event.preventDefault()
        this.onWordClick(el)
        break
      case 'close-peek':
        this.suppressModal()
        break
      case 'open-share':
        this.state.shareOpen = true
        this.renderModals()
        break
      case 'close-share':
        this.state.shareOpen = false
        this.renderModals()
        break
      case 'open-settings':
        this.state.settingsOpen = true
        this.renderModals()
        break
      case 'close-settings':
        this.state.settingsOpen = false
        this.renderModals()
        break
      case 'add-inbox':
        this.addInbox()
        break
      case 'remove-inbox':
        this.removeInbox(el.dataset.inbox)
        break
      case 'include-ldn':
        this.includeLdn(el.dataset.anno)
        break
      case 'copy-bounded':
      case 'copy-full':
      case 'copy-deep':
        this.copyLink(el.dataset.url)
        break
      case 'download-crop':
        this.downloadCrop()
        break
      case 'clear':
        this.clear()
        break
      case 'select-annotation':
        this.selectAnnotation(el.dataset.anno || null)
        break
    }
  }

  onChange(event) {
    const el = event.target
    if (el.matches('[data-action="canvas-select"]')) {
      this.selectCanvas(el.value)
    } else if (el.matches('[data-action="set-language"]')) {
      this.state.language = el.value
      this.render()
    } else if (el.matches('[data-action="ldn-optin"]')) {
      setOptIn(el.checked)
      if (el.checked) this.checkLdn()
    }
  }

  onInput(event) {
    const el = event.target
    if (el.matches('[data-action="search-input"]')) {
      this.debouncedSearch()
    } else if (el.matches('[data-action="word-length"]')) {
      this.debouncedWordLength()
    } else if (el.matches('[data-action="occurs"]')) {
      this.debouncedOccurs()
    }
  }

  loadFromInput() {
    const input = this.querySelector('#resource-input')
    const uri = input && input.value.trim()
    if (uri) this.loadResource(uri, {})
  }

  async loadResource(uri, query = {}) {
    this.state.loading = true
    this.state.error = null
    this.state.region = query.region || null
    this.state.focusAnnotation = query.annotation || null
    this.render()
    try {
      const data = await fetchJSON(uri)
      const resource = normalize(data)
      // Keep the requested URI as the canonical id: the resource's declared
      // @id may not be fetchable (e.g. T-PEN's /manifest/4080/manifest.json
      // returns an empty body), and shareable URLs must point at a working URI.
      this.state.resource = { ...resource, id: uri }
      this.state.canvasIndex = -1
      if (resource.type === 'Collection') {
        this.updateUrl()
        this.render()
        return
      }
      if (
        resource.type === 'Annotation' ||
        resource.type === 'AnnotationPage' ||
        resource.type === 'AnnotationCollection'
      ) {
        await this.resolveAnnotationResource(resource)
      } else {
        await this.loadExternalAnnotations(resource)
      }
      if (query.canvas) this.selectCanvas(query.canvas, { silent: true })
      this.refresh()
      this.focusAnnotationElement()
      this.checkLdn()
    } catch (err) {
      this.state.error = err.message || String(err)
    } finally {
      this.state.loading = false
    }
    this.render()
  }

  async resolveAnnotationResource(resource) {
    const annos = (resource.annotations || []).filter((a) => !a.external)
    const external = (resource.annotations || []).filter((a) => a.external)
    const byTarget = new Map()
    for (const a of annos) {
      if (!a.target) continue
      const key = a.target.split('#')[0]
      if (!byTarget.has(key)) byTarget.set(key, [])
      byTarget.get(key).push(a)
    }
    const canvases = []
    for (const [uri, list] of byTarget) {
      try {
        const data = await fetchJSON(uri)
        const res = normalize(data)
        if (res.type === 'Canvas') {
          const c = res.canvases[0]
          c.annotations.push(...list)
          canvases.push(c)
        } else if (res.type === 'Manifest') {
          const c = res.canvases.find((cv) => cv.id === uri) || res.canvases[0]
          if (c) {
            c.annotations.push(...list)
            canvases.push(c)
          }
        }
      } catch {
        /* skip unresolvable targets */
      }
    }
    for (const ext of external) {
      try {
        const data = await fetchJSON(ext.external)
        const res = normalize(data)
        for (const a of res.annotations || []) {
          if (!a.target) continue
          const key = a.target.split('#')[0]
          const c = canvases.find((cv) => cv.id === key)
          if (c) c.annotations.push(a)
        }
      } catch {
        /* skip */
      }
    }
    this.state.resource = { ...resource, canvases }
  }

  async loadExternalAnnotations(resource) {
    for (const canvas of resource.canvases || []) {
      for (const uri of canvas.externalAnnotations || []) {
        try {
          const data = await fetchJSON(uri)
          const page = normalize(data)
          for (const a of page.annotations || []) {
            if (!a.external) canvas.annotations.push(a)
          }
        } catch {
          /* skip */
        }
      }
    }
  }

  selectCanvas(value, opts = {}) {
    const canvases = this.state.resource?.canvases || []
    let index = -1
    if (value === '' || value === 'all') index = -1
    else if (/^\d+$/.test(value)) index = parseInt(value, 10)
    else index = canvases.findIndex((c) => c.id === value)
    if (index >= canvases.length) index = -1
    this.state.canvasIndex = index
    if (!opts.silent) {
      this.state.region = null
      this.state.focusAnnotation = null
      this.refresh()
      this.checkLdn()
    }
  }

  refresh() {
    this.updateUrl()
    this.render()
    this.focusAnnotationElement()
  }

  selectAnnotation(id) {
    this.state.focusAnnotation = id || null
    this.updateUrl()
    for (const el of this.querySelectorAll('[data-anno]')) {
      el.classList.toggle('focused', !!id && el.dataset.anno === id)
    }
    this.focusAnnotationElement()
  }

  updateUrl() {
    const r = this.state.resource
    if (!r) return
    const params = { 'iiif-content': r.id, manifest: null }
    if (this.state.canvasIndex >= 0) {
      const c = (r.canvases || [])[this.state.canvasIndex]
      if (c && c.id) params.canvas = c.id
    }
    if (this.state.region) params.region = this.state.region
    if (this.state.focusAnnotation) params.annotation = this.state.focusAnnotation
    history.pushState({}, '', buildUrl(window.location.href, params))
  }

  focusAnnotationElement() {
    if (!this.state.focusAnnotation) return
    const el = this.querySelector(`[data-anno="${CSS.escape(this.state.focusAnnotation)}"]`)
    if (el) this.smoothScrollTo(el)
  }

  smoothScrollTo(el) {
    const scroller = this.scrollContainer(el)
    const rect = el.getBoundingClientRect()
    const sRect = scroller.getBoundingClientRect()
    const viewport = scroller === document.scrollingElement ? window.innerHeight : sRect.height
    const target = scroller.scrollTop + rect.top - sRect.top - viewport / 2 + rect.height / 2
    const start = scroller.scrollTop
    const delta = target - start
    if (Math.abs(delta) < 1) return
    if (this._scrollAnim) cancelAnimationFrame(this._scrollAnim)
    const duration = Math.min(500, Math.max(200, Math.abs(delta) * 0.4))
    const t0 = performance.now()
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      scroller.scrollTop = start + delta * ease(p)
      if (p < 1) this._scrollAnim = requestAnimationFrame(step)
      else this._scrollAnim = null
    }
    this._scrollAnim = requestAnimationFrame(step)
  }

  scrollContainer(el) {
    let node = el.parentElement
    while (node && node !== document.body) {
      const style = getComputedStyle(node)
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight)
        return node
      node = node.parentElement
    }
    return document.scrollingElement || document.documentElement
  }

  async checkLdn() {
    if (!getOptIn()) return
    const r = this.state.resource
    if (!r) return
    const canvas = this.currentCanvas()
    const targets = [r.id]
    if (canvas && canvas.id) targets.push(canvas.id)
    const results = []
    for (const inbox of getInboxes()) {
      for (const target of targets) {
        try {
          const messages = await queryInbox(inbox, target)
          for (const m of messages) {
            const res = normalize(m)
            if (
              res.type === 'Annotation' ||
              res.type === 'AnnotationPage' ||
              res.type === 'AnnotationCollection'
            ) {
              for (const a of res.annotations || []) {
                if (!a.external) results.push({ ...a, source: 'ldn' })
              }
            }
          }
        } catch {
          /* skip unreachable inboxes */
        }
      }
    }
    this.state.ldn.results = results
    this.state.ldn.checked = true
    this.render()
  }

  includeLdn(annoId) {
    const anno = this.state.ldn.results.find((a) => a.id === annoId)
    if (!anno) return
    const target = anno.target ? anno.target.split('#')[0] : null
    const canvas =
      (this.state.resource?.canvases || []).find((c) => c.id === target) || this.currentCanvas()
    if (!canvas) return
    if (!canvas.annotations.some((a) => a.id === annoId)) {
      canvas.annotations.push({ ...anno, source: 'ldn' })
    }
    this.state.ldn.included.add(annoId)
    this.refresh()
  }

  getFocusedAnnotation() {
    if (!this.state.focusAnnotation) return null
    return this.allAnnotations().find((a) => a.id === this.state.focusAnnotation) || null
  }

  async copyLink(url) {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
  }

  async downloadCrop() {
    const anno = this.getFocusedAnnotation()
    if (!anno || !anno.selector || !anno.canvas) return
    const image = (anno.canvas.images || [])[0]
    if (!image) return
    const xywh = parseXYWH(anno.selector)
    if (!xywh) return
    const result = await cropImage(image.id, anno.canvas.width, anno.canvas.height, xywh)
    if (!result.dataUrl) return
    const a = document.createElement('a')
    a.href = result.dataUrl
    a.download = 'annotation.png'
    a.click()
  }

  addInbox() {
    const input = this.querySelector('#new-inbox-input')
    const uri = input && input.value.trim()
    if (!uri) return
    const inboxes = getInboxes()
    if (!inboxes.includes(uri)) {
      inboxes.push(uri)
      saveInboxes(inboxes)
    }
    this.renderModals()
  }

  removeInbox(uri) {
    const inboxes = getInboxes().filter((i) => i !== uri)
    saveInboxes(inboxes.length ? inboxes : [DEFAULT_INBOX])
    this.renderModals()
  }

  clear() {
    this.state.resource = null
    this.state.error = null
    this.state.region = null
    this.state.focusAnnotation = null
    this.state.canvasIndex = -1
    this.state.searchy = ''
    this.state.words = {}
    this.state.index = {}
    this.state.ldn = { results: [], included: new Set(), checked: false }
    history.pushState({}, '', window.location.pathname)
    this.render()
  }

  getLanguages(r) {
    const d = r.descriptions
    if (Array.isArray(d)) return d.map((o) => o['@language'] || o.language).filter(Boolean)
    if (d && typeof d === 'object' && !Array.isArray(d)) return Object.keys(d)
    return []
  }

  currentDescription(r) {
    const d = r.descriptions
    if (Array.isArray(d) && d.length) {
      const match = d.find((o) => (o['@language'] || o.language) === this.state.language)
      return getLabel({ label: match ? (match['@value'] ?? match.value ?? match) : d[0] })
    }
    if (
      d &&
      typeof d === 'object' &&
      !Array.isArray(d) &&
      d[this.state.language] !== null &&
      d[this.state.language] !== undefined
    ) {
      return getLabel({ label: d[this.state.language] })
    }
    return r.description
  }

  currentCanvas() {
    const canvases = this.state.resource?.canvases || []
    if (this.state.canvasIndex >= 0) return canvases[this.state.canvasIndex] || null
    const focused = this.getFocusedAnnotation()
    if (focused && focused.canvas) return focused.canvas
    return canvases[0] || null
  }

  allAnnotations() {
    const out = []
    for (const c of this.state.resource?.canvases || []) {
      for (const a of c.annotations || []) {
        if (a.external) continue
        out.push({ ...a, canvas: c })
      }
    }
    return out
  }

  render() {
    const s = this.state
    if (s.loading) {
      this.innerHTML = '<div class="container"><p>Loading…</p></div>'
      return
    }
    if (!s.resource) {
      this.innerHTML = this.landingTemplate()
      return
    }
    if (s.resource.type === 'Collection') {
      this.innerHTML = this.collectionTemplate()
      return
    }
    this.innerHTML = this.viewerTemplate()
    if (s.region) this.hydrateCrops()
    else this.renderConcordance()
  }

  renderModals() {
    const root = this.querySelector('#modal-root')
    if (!root) return
    root.innerHTML =
      (this.state.shareOpen ? this.shareModalTemplate() : '') +
      (this.state.settingsOpen ? this.settingsModalTemplate() : '')
  }

  landingTemplate() {
    const s = this.state
    return `<div class="container">
      <div class="row">
        <input type="url" id="resource-input" placeholder="Paste or type a URI for any Manifest" class="six columns">
        <button class="button" data-action="load-input">Load it</button>
      </div>
      <p>or try these examples:</p>
      <a class="button" href="?iiif-content=${encodeURIComponent('https://t-pen.org/TPEN/manifest/4080')}">T-PEN (unauthorized)</a>
      <a class="button" href="?iiif-content=${encodeURIComponent('https://tpen-project-examples.habesoftware.app/Bzommar_pretty_pictures/manifest.json')}">Bzommar (TPEN)</a>
      ${s.error ? `<p class="alert alert-danger">${escapeHtml(s.error)}</p>` : ''}
    </div>`
  }

  collectionTemplate() {
    const s = this.state
    const r = s.resource
    return `<div class="container">
      <div class="note u-see-thru">
        <h3 class="note-header text">${escapeHtml(r.label || '[ no label ]')}
          <button title="clear" class="button" data-action="clear"><i class="fa fa-bomb"></i></button>
        </h3>
        <div class="note-block">
          ${(r.manifests || []).map((m) => `<p><a href="?iiif-content=${encodeURIComponent(m.id)}">${escapeHtml(m.label || m.id)}</a></p>`).join('') || '<p>[ no manifests ]</p>'}
        </div>
      </div>
    </div>`
  }

  viewerTemplate() {
    const s = this.state
    const r = s.resource
    const canvases = r.canvases || []
    const languages = this.getLanguages(r)
    return `<div class="container">
      <div class="note u-see-thru">
        <h3 class="note-header text">${escapeHtml(r.label || '[ no label ]')}
          <button title="clear" class="button" data-action="clear"><i class="fa fa-bomb"></i></button>
        </h3>
        <div class="note-block text">
          ${escapeHtml(this.currentDescription(r))}
          ${this.currentDescription(r) ? '' : '<code>[ no description ]</code>'}
          ${languages.length ? `<div class="btn-group u-full-width" data-toggle="buttons">${languages.map((l) => `<label class="btn btn-info ${s.language === l ? 'active' : ''}"><input type="radio" data-action="set-language" value="${escapeHtml(l)}" ${s.language === l ? 'checked' : ''}>${escapeHtml(l)}</label>`).join('')}</div>` : ''}
        </div>
        ${r.metadata.length ? `<div class="note-block" style="max-height: 12rem;overflow: auto;"><dl>${r.metadata.map((m) => `<dt>${escapeHtml(m.label)}</dt><dd class="text">${sanitizeHtml(m.value)}</dd>`).join('')}</dl></div>` : ''}
        <div class="btn-group note-footer">
          <select data-action="canvas-select">
            <option value="" ${s.canvasIndex === -1 ? 'selected' : ''}>All canvases</option>
            ${canvases.map((c, i) => `<option value="${escapeHtml(c.id || i)}" ${i === s.canvasIndex ? 'selected' : ''}>${escapeHtml(c.label || c.id || i)}</option>`).join('')}
          </select>
          <button role="button" data-action="open-share" title="Share"><i class="fa fa-share-alt"></i></button>
          <button role="button" data-action="open-settings" title="Settings"><i class="fa fa-cog"></i></button>
        </div>
      </div>
      ${s.region ? this.regionTemplate() : this.concordanceTemplate()}
      ${this.ldnPanelTemplate()}
      <div id="modal-root"></div>
    </div>`
  }

  concordanceTemplate() {
    const s = this.state
    return `<div class="concordance-toolbar">
      <div class="form-group">
        <label>minimum word length
          <input type="range" step="1" min="1" max="10" value="${s.wordLength}" data-action="word-length">
          <output id="lengthDisplay">${s.wordLength}</output>
        </label>
        <label>minimum word occurrence
          <input type="range" step="1" min="1" max="10" value="${s.occurs}" data-action="occurs">
          <output id="occursDisplay">${s.occurs}</output>
        </label>
      </div>
      <div class="form-group">
        <label class="button" data-action="toggle-search-mode" title="Click to search anywhere within the term">${s.searchin ? 'Contains:' : 'Starts with:'}</label>
        <input data-action="search-input" placeholder="Type to Filter" type="text" value="${escapeHtml(s.searchy)}">
      </div>
      <div class="form-group">
        <label>sort list
          <select data-action="sorting">
            <option value="" ${s.sorting === '' ? 'selected' : ''}>no sorting</option>
            <option value="largest" ${s.sorting === 'largest' ? 'selected' : ''}>most first</option>
            <option value="smallest" ${s.sorting === 'smallest' ? 'selected' : ''}>fewest first</option>
          </select>
        </label>
      </div>
    </div>
    <div id="indices"></div>
    <row id="entries">
      <div id="wordList">
        <header>terms list</header>
        <ul id="occurrences"></ul>
      </div>
      <div id="lines">
        <header>lines</header>
        <dl id="concordance"></dl>
        <div id="modal"></div>
      </div>
    </row>`
  }

  regionTemplate() {
    const s = this.state
    const canvas = this.currentCanvas()
    const image = (canvas && canvas.images && canvas.images[0]) || null
    if (!image) return '<p>[ no image found for this canvas ]</p>'
    return `<div class="region-view">
      <canvas data-crop="${escapeHtml(s.region)}" data-image="${escapeHtml(image.id)}" data-width="${canvas.width}" data-height="${canvas.height}" class="region-canvas"></canvas>
      <p>Provenance: <a href="${escapeHtml(buildUrl(window.location.href, { 'iiif-content': s.resource.id, manifest: null }))}">view the full resource</a></p>
    </div>`
  }

  ldnPanelTemplate() {
    const s = this.state
    if (!s.ldn.checked || !s.ldn.results.length) return ''
    return `<div class="ldn-panel note">
      <div class="note-header">LDN Inbox results (${s.ldn.results.length})</div>
      <div class="note-block">
        ${s.ldn.results
          .map(
            (a) => `<div class="ldn-result">
          <span class="text">${sanitizeHtml(a.text || a.id || '[ no text ]')}</span>
          ${s.ldn.included.has(a.id) ? '<em>included</em>' : `<button role="button" data-action="include-ldn" data-anno="${escapeHtml(a.id || '')}">Include</button>`}
        </div>`
          )
          .join('')}
      </div>
    </div>`
  }

  shareModalTemplate() {
    const s = this.state
    const r = s.resource
    const anno = this.getFocusedAnnotation()
    const canvas = anno ? anno.canvas : this.currentCanvas()
    const base = { 'iiif-content': r.id, manifest: null }
    if (canvas && canvas.id) base.canvas = canvas.id
    const fullUrl =
      anno && anno.id
        ? buildUrl(window.location.href, { ...base, annotation: anno.id })
        : buildUrl(window.location.href, base)
    const boundedUrl =
      anno && anno.selector
        ? buildUrl(window.location.href, { ...base, region: anno.selector, annotation: anno.id })
        : null
    const deepUrl =
      anno && anno.id
        ? buildUrl(window.location.href, { 'iiif-content': anno.id, manifest: null })
        : null
    return `<div class="modal-overlay" data-action="close-share">
      <div class="modal">
        <h3>Share</h3>
        <p>${anno ? `Annotation: <code>${escapeHtml(anno.id || '')}</code>` : 'Current resource'}</p>
        ${
          boundedUrl
            ? `<div class="share-option">
          <strong>Bounded area as image</strong>
          <input readonly value="${escapeHtml(boundedUrl)}">
          <button role="button" data-action="copy-bounded" data-url="${escapeHtml(boundedUrl)}">Copy</button>
          <button role="button" data-action="download-crop">Download PNG</button>
          <small>Provenance: <a href="${escapeHtml(buildUrl(window.location.href, base))}">full resource</a></small>
        </div>`
            : ''
        }
        <div class="share-option">
          <strong>${anno ? 'Full resource with annotation selected' : 'Full resource'}</strong>
          <input readonly value="${escapeHtml(fullUrl)}">
          <button role="button" data-action="copy-full" data-url="${escapeHtml(fullUrl)}">Copy</button>
        </div>
        ${
          deepUrl
            ? `<div class="share-option">
          <strong>Deep link to annotation</strong>
          <input readonly value="${escapeHtml(deepUrl)}">
          <button role="button" data-action="copy-deep" data-url="${escapeHtml(deepUrl)}">Copy</button>
        </div>`
            : ''
        }
        <button role="button" data-action="close-share">Close</button>
      </div>
    </div>`
  }

  settingsModalTemplate() {
    const inboxes = getInboxes()
    return `<div class="modal-overlay" data-action="close-settings">
      <div class="modal">
        <h3>Settings</h3>
        <label><input type="checkbox" data-action="ldn-optin" ${getOptIn() ? 'checked' : ''}> Include annotations from LDN inboxes</label>
        <h4>LDN Inboxes</h4>
        <ul class="inbox-list">
          ${inboxes.map((i) => `<li>${escapeHtml(i)} <button role="button" data-action="remove-inbox" data-inbox="${escapeHtml(i)}">×</button></li>`).join('')}
        </ul>
        <div class="row">
          <input type="url" id="new-inbox-input" placeholder="https://inbox.rerum.io/messages" class="six columns">
          <button role="button" data-action="add-inbox">Add</button>
        </div>
        <button role="button" data-action="close-settings">Close</button>
      </div>
    </div>`
  }

  async hydrateCrops(root = this) {
    for (const el of root.querySelectorAll('[data-crop]')) {
      const xywh = parseXYWH(el.dataset.crop)
      if (!xywh) continue
      const imageId = el.dataset.image
      const width = parseFloat(el.dataset.width)
      const height = parseFloat(el.dataset.height)
      if (!imageId || !width || !height) continue
      const result = await cropImage(imageId, width, height, xywh)
      if (result.dataUrl) {
        const img = document.createElement('img')
        img.src = result.dataUrl
        img.alt = ''
        el.replaceWith(img)
      } else if (result.canvas) {
        result.canvas.style.width = '100%'
        result.canvas.style.maxWidth = '100%'
        result.canvas.style.maxHeight = '100%'
        el.replaceWith(result.canvas)
      }
    }
  }

  renderConcordance() {
    const concordance = this.querySelector('#concordance')
    if (!concordance) return
    const html = this.buildConcordance()
    if (!html.length) {
      concordance.innerHTML = '<p style="text-align:center;padding:2rem;">[ no words found ]</p>'
      return
    }
    concordance.innerHTML = html
    this.renderIndex()
    this.renderWordList()
    this.filterWordList()
  }

  buildConcordance() {
    const s = this.state
    const dict = {}
    const index = {}
    const canvases = s.resource?.canvases || []
    const selected = s.canvasIndex >= 0 ? [canvases[s.canvasIndex]] : canvases
    for (const canvas of selected) {
      if (!canvas) continue
      const annos = (canvas.annotations || []).filter((a) => !a.external)
      annos.forEach((a, i) => {
        const line = sanitizeHtml(a.text || '')
        if (!line) return
        const image = (canvas.images || [])[0]
        addWordsToData(
          line,
          a.target || '',
          i + 1,
          canvas.label || `[unlabeled ${i}]`,
          dict,
          index,
          {
            canvasId: canvas.id,
            annoId: a.id,
            xywh: a.selector || '',
            image: image ? image.id : '',
            width: canvas.width || 0,
            height: canvas.height || 0,
          }
        )
      })
    }
    s.words = dict
    s.index = index
    const words = Object.keys(dict)
      .filter((x) => x)
      .sort(wordSort)
    let tmpl = ''
    words.forEach((word) => {
      const data = dict[word]
      tmpl += `<a name="${escapeHtml(word)}" data-word-length="${word.length}" data-occurs="${data.length}">
        <dt>${escapeHtml(word)} <badge>(${data.length})</badge></dt>
        ${data.map((w) => `<dd data-action="line-selected" data-source="${escapeHtml(w.source)}" data-index="${w.lineNumber}" title="${escapeHtml(w.label)}" data-anno="${escapeHtml(w.annoId)}" data-canvas="${escapeHtml(w.canvasId)}" data-crop="${escapeHtml(w.xywh)}" data-image="${escapeHtml(w.image)}" data-width="${w.width}" data-height="${w.height}">${markupWordOccurrence(word, w)}</dd>`).join('')}
      </a>`
    })
    return tmpl
  }

  renderIndex() {
    const indices = this.querySelector('#indices')
    if (!indices) return
    const tmpl = Object.keys(this.state.index)
      .sort()
      .map(
        (char) =>
          `<a class="indices" data-action="set-index" data-index="${escapeHtml(char)}">${escapeHtml(char)}</a>`
      )
      .join('')
    indices.innerHTML = tmpl
  }

  renderWordList() {
    this.suppressModal()
    const s = this.state
    const lengthDisplay = this.querySelector('#lengthDisplay')
    const occursDisplay = this.querySelector('#occursDisplay')
    const occurrences = this.querySelector('#occurrences')
    const concordance = this.querySelector('#concordance')
    if (!lengthDisplay || !occursDisplay || !occurrences || !concordance) return

    lengthDisplay.value = s.wordLength
    occursDisplay.value = s.occurs

    const sort = s.sorting
    const length = s.wordLength
    const occurs = s.occurs

    let list = Object.keys(s.words)
      .filter((x) => x)
      .sort(wordSort)
    if (!list.length) {
      occurrences.innerHTML = ''
      return
    }

    const maxLength = list.reduce((a, b) => Math.max(a, b.length), 10)
    const maxOccurs = list.reduce((a, b) => Math.max(a, s.words[b].length), 10)
    const lengthInput = this.querySelector('[data-action="word-length"]')
    const occursInput = this.querySelector('[data-action="occurs"]')
    if (lengthInput) lengthInput.setAttribute('max', maxLength)
    if (occursInput) occursInput.setAttribute('max', maxOccurs)

    list = sortWords(list, sort, s.words)

    let listUL = ''
    let odd = true
    for (const w of list) {
      if (length > w.length || occurs > s.words[w].length) continue
      listUL += `<li ${odd ? 'class="odd"' : ''}><a data-action="word-scroll" data-word="${escapeHtml(w)}">${escapeHtml(w)} <badge>(${s.words[w].length})</badge></a></li>`
      odd = !odd
    }

    if (!listUL.includes('<li')) {
      occurrences.innerHTML = ''
      return
    }
    occurrences.innerHTML = listUL
    this.filterWordList()
  }

  filterWordList() {
    const s = this.state
    const occurrences = this.querySelector('#occurrences')
    const concordance = this.querySelector('#concordance')
    if (!occurrences || !concordance) return
    const search = s.searchy.toLowerCase()
    const searchin = s.searchin
    const label = this.querySelector('[data-action="toggle-search-mode"]')
    if (label) label.textContent = searchin ? 'Contains:' : 'Starts with:'
    const test = searchin ? (val) => !val.includes(search) : (val) => !val.startsWith(search)
    this.updateOccurrenceVisibility(occurrences, test)
    this.updateConcordanceFilter(concordance, test)
  }

  updateOccurrenceVisibility(occurrences, test) {
    const s = this.state
    let odd = true
    for (const node of occurrences.getElementsByTagName('a')) {
      const word = node.getAttribute('data-word')
      const wLength = word.length
      const wOccurs = s.words[word] ? s.words[word].length : 0
      const hideByCount = s.wordLength > wLength || s.occurs > wOccurs
      const hideBySearch = test(word.toLowerCase())
      const shouldHide = hideByCount || hideBySearch
      node.parentElement.style.display = shouldHide ? 'none' : 'block'
      if (shouldHide) continue
      node.parentElement.classList.toggle('odd', odd)
      odd = !odd
    }
  }

  updateConcordanceFilter(concordance, test) {
    const s = this.state
    for (const node of concordance.getElementsByTagName('a')) {
      const wLength = parseInt(node.getAttribute('data-word-length'))
      const wOccurs = parseInt(node.getAttribute('data-occurs'))
      const hideByCount = s.wordLength > wLength || s.occurs > wOccurs
      const hideBySearch = test(node.getAttribute('name').toLowerCase())
      node.style.display = hideByCount || hideBySearch ? 'none' : 'block'
    }
  }

  scrollToWord(word, node) {
    this.querySelectorAll('[active]').forEach((elem) => elem.removeAttribute('active'))
    if (node) node.setAttribute('active', true)
    const term = this.querySelector(`[name="${CSS.escape(word)}"]`)
    if (!term) return
    term.scrollIntoView({ behavior: 'smooth' })
    const dt = term.children[0]
    if (dt) dt.setAttribute('active', true)
  }

  onLineClick(el) {
    const target = el.tagName === 'DD' ? el : el.closest('DD')
    if (!target) return
    const ev = new CustomEvent('line:selected', {
      detail: { target, source: target.getAttribute('data-source'), text: target.textContent },
    })
    window.top.dispatchEvent(ev)
    const annoId = target.getAttribute('data-anno')
    if (annoId) this.selectAnnotation(annoId)
  }

  onWordClick(el) {
    const target = el.tagName === 'A' ? el : el.closest('A')
    if (!target) return
    const ev = new CustomEvent('word:selected', {
      detail: { target, source: target.getAttribute('data-source') },
    })
    window.top.dispatchEvent(ev)
  }

  handleLinePeek(event) {
    event.preventDefault()
    const modal = this.querySelector('#modal')
    if (!modal) return
    modal.innerHTML = this.createPeekWindow(event.detail.target)
    this.hydrateCrops(modal)
    const anchor = event.detail.target
    const concordance = this.querySelector('#concordance')
    if (!concordance) return
    const anchorRect = anchor.getBoundingClientRect()
    const concRect = concordance.getBoundingClientRect()
    modal.style.top = `${anchorRect.bottom - concRect.top}px`
    modal.style.left = `${anchorRect.left - concRect.left}px`
    modal.style.display = 'block'
  }

  handleWordPeek(event) {
    event.preventDefault()
    const modal = this.querySelector('#modal')
    if (!modal) return
    modal.innerHTML = this.createPeekLinesWindow(event.detail.target)
    this.hydrateCrops(modal)
    const anchor = event.detail.target
    const concordance = this.querySelector('#concordance')
    if (!concordance) return
    const anchorRect = anchor.getBoundingClientRect()
    const concRect = concordance.getBoundingClientRect()
    modal.style.top = `${anchorRect.bottom - concRect.top}px`
    modal.style.left = `${anchorRect.left - concRect.left}px`
    modal.style.display = 'block'
  }

  createPeekWindow(element) {
    const lineNumber =
      element.getAttribute('data-index') !== 'false'
        ? `line ${element.getAttribute('data-index')}`
        : ''
    return `<a data-action="close-peek"><i class="fa fa-close pull-right"></i></a>
      <header>
        <h4>${escapeHtml(element.getAttribute('title'))}</h4>
        <small>${lineNumber}</small>
      </header>
      <div>
        <canvas data-crop="${escapeHtml(element.getAttribute('data-crop'))}" data-image="${escapeHtml(element.getAttribute('data-image'))}" data-width="${element.getAttribute('data-width')}" data-height="${element.getAttribute('data-height')}" class="crop-canvas"></canvas>
      </div>
      <span class="line-quote">&ldquo;${escapeHtml(element.textContent)}&rdquo;</span>`
  }

  createPeekLinesWindow(element) {
    const dds = element.getElementsByTagName('dd')
    const lines = Array.from(dds)
      .map((el) => this.createLineCard(el))
      .join('')
    return `<a data-action="close-peek"><i class="fa fa-close pull-right"></i></a>
      <header><h4>${escapeHtml(element.getAttribute('name'))}</h4></header>
      ${lines}`
  }

  createLineCard(el) {
    const lineNumber =
      el.getAttribute('data-index') !== 'false' ? `line ${el.getAttribute('data-index')}` : ''
    const label = el.getAttribute('title')
    const quote = el.textContent
    return `<card> ${escapeHtml(label)} (${lineNumber})
      <div>
        <canvas data-crop="${escapeHtml(el.getAttribute('data-crop'))}" data-image="${escapeHtml(el.getAttribute('data-image'))}" data-width="${el.getAttribute('data-width')}" data-height="${el.getAttribute('data-height')}" class="crop-canvas"></canvas>
      </div>
      <span class="line-quote">&ldquo;${escapeHtml(quote)}&rdquo;</span>
    </card>`
  }

  suppressModal() {
    const modal = this.querySelector('#modal')
    if (modal) modal.style.display = 'none'
  }

  async handleMessage(event) {
    const data = event.data
    if (!data || typeof data.type !== 'string') return
    if (!data.type.includes('ANNOTATIONPAGE')) return
    try {
      if (!this.state.resource && data.manifest) {
        await this.loadResource(data.manifest, {})
      }
      if (data.annotationPage) await this.handleAnnotationPageMessage(data)
    } catch {
      /* ignore malformed messages */
    }
  }

  async handleAnnotationPageMessage(data) {
    const annotationPageRef = data?.annotationPage
    if (!annotationPageRef) return
    const annoPageData = await safeFetchJSON(annotationPageRef)
    if (!annoPageData) return
    if (!annoPageData?.partOf) {
      await this.rebuildConcordanceFromAnnotations([annoPageData])
      return
    }
    const candidates = Array.isArray(annoPageData.partOf)
      ? annoPageData.partOf
      : [annoPageData.partOf].filter(Boolean)
    if (!candidates.length) return
    const chosen = candidates.find(isCollectionType) ?? candidates[0]
    const collectionUri = extractPageUri(chosen)
    if (!collectionUri) return
    const collection = await safeFetchJSON(collectionUri)
    if (!collection) return
    const itemUris = Array.isArray(collection.items)
      ? collection.items.map((item) => extractPageUri(item)).filter(Boolean)
      : []
    if (!itemUris.length && !collection.first) return
    const annotationPages = itemUris.length
      ? await Promise.all(itemUris.map((uri) => safeFetchJSON(uri)))
      : await this.loadPaginatedAnnotationPages(collection)
    const validPages = annotationPages.filter((p) => p?.items)
    if (!validPages.length) return
    await this.rebuildConcordanceFromAnnotations(validPages)
  }

  async loadPaginatedAnnotationPages(collection) {
    const annotationPages = []
    const total = collection.total ?? 0
    const maxPages = total || 100
    let currentPageUri = extractPageUri(collection.first)
    let pageCount = 0
    while (currentPageUri && pageCount < maxPages) {
      const page = await safeFetchJSON(currentPageUri)
      if (!page?.items) break
      annotationPages.push(page)
      pageCount++
      currentPageUri = page.next ? extractPageUri(page.next) : null
    }
    return annotationPages
  }

  async rebuildConcordanceFromAnnotations(annotationPages) {
    const resource = this.state.resource
    if (!resource) return
    const canvasIds = new Set()
    const canvasAnnotations = new Map()
    annotationPages.forEach((page) => {
      if (!page?.items) return
      const version = detectVersion(page)
      page.items.forEach((annotation) => {
        const canvasId = extractTargetCanvasId(annotation)
        if (!canvasId) return
        canvasIds.add(canvasId)
        if (!canvasAnnotations.has(canvasId)) canvasAnnotations.set(canvasId, [])
        canvasAnnotations.get(canvasId).push({ anno: annotation, version })
      })
    })
    const canvases = resource.canvases || []
    let matched = 0
    for (const canvas of canvases) {
      const cId = canvas.id || ''
      const normalizedId = normalizeUri(cId)
      for (const canvasId of canvasIds) {
        const normalizedTargetId = normalizeUri(canvasId)
        if (normalizedId === normalizedTargetId || cId === canvasId) {
          for (const { anno, version } of canvasAnnotations.get(canvasId)) {
            const a = normalizeAnnotation(anno, version)
            if (!canvas.annotations.some((x) => x.id === a.id)) {
              canvas.annotations.push({ ...a, source: 'postMessage' })
            }
          }
          matched++
          break
        }
      }
    }
    if (matched === 0) return
    this.refresh()
  }
}

customElements.define('concordance-viewer', ConcordanceViewer)
