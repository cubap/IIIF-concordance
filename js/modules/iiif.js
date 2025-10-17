import { addWordsToData } from '../utils/wordUtils.js'

/**
 * Extracts lines and words from IIIF manifest sequences.
 * @param {Object} sequence - IIIF sequence object
 * @param {Object} annotationData - Data structure to populate
 * @param {Object} manifest - Full manifest for reference
 * @returns {Promise} Promise that resolves when all annotations are processed
 */
export const extractLines = (sequence, annotationData, manifest) => {
  // Manifesto sequence/canvas API
  const canvases = sequence.getCanvases ? sequence.getCanvases() : []
  const promises = []
  canvases.forEach((canvas) => {
    const texts = []
    // IIIF Pres 2: otherContent (AnnotationList), Pres 3: annotations (AnnotationPage)
    let annotationLists = canvas.__jsonld?.otherContent ?? []
    if (canvas.getAnnotationLists && canvas.getAnnotationLists().length) {
      annotationLists = canvas.getAnnotationLists()
    } else if (canvas.getAnnotations && canvas.getAnnotations().length) {
      annotationLists = canvas.getAnnotations()
    }
    annotationLists.forEach((annoList, i) => {
      // For P2: annoList.getAnnotations(); for P3: annoList.getItems()
      const annotations = annoList.getAnnotations
        ? annoList.getAnnotations() // P2: AnnotationList
        : annoList.getItems
          ? annoList.getItems() // P3: AnnotationPage
          : annoList.resources ?? annoList.annotations ?? []
      annotations.forEach((annotation, index) => {
        // P2 via Manifesto: annotation is a Manifesto.Annotation with getBody()
        // P3 via AnnotationPage: annotation is a plain object with .body
        let bodies
        if (typeof annotation.getBody === 'function') {
          bodies = annotation.getBody()
        } else {
          const b = annotation.body ?? annotation.resource ?? null
          bodies = Array.isArray(b) ? b : b ? [b] : []
        }
        const body = Array.isArray(bodies)
          ? bodies.find((b) => typeof b.getValue === 'function' || b.value || b.chars) || bodies[0]
          : bodies
        if (!body) return
        // Text extraction: Manifesto handles cnt:chars, chars, value, etc.
        const line =
          typeof body.getValue === 'function' ? body.getValue() : (body.value ?? body.chars ?? body['cnt:chars'] ?? '')
        if (!line) return
        texts.push(line)
        // Target: Manifesto provides getTarget(); normalize to a selector URL string
        const rawTarget =
          typeof annotation.getTarget === 'function'
            ? annotation.getTarget()
            : (annotation.target ?? annotation.on)
        const selectorUrl = normalizeTargetToSelector(rawTarget, canvas)
        const thisCanvas = canvas.label ? canvas : getCanvas(selectorUrl, manifest)
        addWordsToData(
          line,
          selectorUrl,
          index + 1,
          thisCanvas?.label ?? thisCanvas.getDefaultLabel?.() ?? `[unlabeled ${i}]`,
          annotationData.words,
          annotationData.index
        )
      })
    })
    annotationData.pages.push(texts.join('\n'))
  })
  return Promise.all(promises)
}

// Normalize IIIF target (string or SpecificResource) to a selector URL string suitable for new URL()
const normalizeTargetToSelector = (target, canvas) => {
  try {
    if (!target) return ''
    if (typeof target === 'string') return target
    // P3 SpecificResource structure
    const src = target.source || target.id || ''
    const sel = target.selector || {}
    const value = sel.value || ''
    if (!src) return ''
    if (value.startsWith('xywh=')) {
      let xy = value.split('=')[1]
      if (xy.startsWith('pixel:')) {
        xy = xy.replace(/^pixel:/, '')
        return `${src}#xywh=${xy}`
      }
      if (xy.startsWith('percent:')) {
        const [px, py, pw, ph] = xy
          .replace(/^percent:/, '')
          .split(',')
          .map(parseFloat)
        const cw = canvas?.getWidth ? canvas.getWidth() : canvas?.width
        const ch = canvas?.getHeight ? canvas.getHeight() : canvas?.height
        if (cw && ch) {
          const x = Math.round((px / 100) * cw)
          const y = Math.round((py / 100) * ch)
          const w = Math.round((pw / 100) * cw)
          const h = Math.round((ph / 100) * ch)
          return `${src}#xywh=${x},${y},${w},${h}`
        }
        // Fallback: return percent values as-is (imageViewer will likely fail)
        return `${src}#xywh=${px},${py},${pw},${ph}`
      }
      // Already numeric values
      return `${src}#xywh=${xy}`
    }
    // If no value/xywh, return source
    return String(src)
  } catch {
    return typeof target === 'string' ? target : ''
  }
}

/**
 * Finds a canvas in the manifest by query string.
 * @param {string} query - Query string to match
 * @param {Object} manifest - IIIF manifest
 * @returns {Object} Canvas object or empty object
 */
export const getCanvas = (query, manifest) => {
  // Use Manifesto API to get sequences and canvases
  const sequences = manifest.getSequences ? manifest.getSequences() : []
  for (const seq of sequences) {
    const canvases = seq.getCanvases ? seq.getCanvases() : []
    for (const c of canvases) {
      const canvasId = c.id || c['@id'] || ''
      const cheapHack = canvasId.replace(/^https?:/, '') // http(s) mismatch fix
      try {
        if (query.indexOf(cheapHack) > -1) {
          return c
        }
      } catch {
        continue
      }
    }
  }
  return {}
}

/**
 * Loads a IIIF manifest from a URL.
 * @param {string} url - Manifest URL
 * @returns {Promise<Object>} Parsed manifest JSON
 */
export const loadManifest = async (url) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const manifestJson = await response.json()
    // Use Manifesto.js to parse and normalize (loaded globally via CDN)
    const mf =
      (typeof window !== 'undefined' ? window.manifesto : undefined) ?? globalThis.manifesto
    if (!mf || typeof mf.parseManifest !== 'function') {
      console.error('Manifesto library is not available on window. Did the CDN script load?')
      return null
    }
    const manifest = mf.parseManifest(manifestJson)
    return manifest
  } catch (error) {
    console.error('Failed to load manifest:', error)
    return null
  }
}
