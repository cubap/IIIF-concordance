import { addWordsToData } from '../utils/wordUtils.js'

const getAnnotationLists = (canvas) => {
  if (canvas.__injectedAnnotations && Array.isArray(canvas.__injectedAnnotations)) {
    return canvas.__injectedAnnotations.map((page) => ({
      __rawJson: page,
      getItems: () => page.items ?? [],
      type: page.type,
    }))
  }

  const fallbackLists = canvas.__jsonld?.otherContent ?? []
  return canvas.getAnnotationLists?.().length
    ? canvas.getAnnotationLists()
    : canvas.getAnnotations?.().length
      ? canvas.getAnnotations()
      : fallbackLists
}

const getAnnotations = (annoList) =>
  annoList.getAnnotations?.() ??
  annoList.getItems?.() ??
  annoList.resources ??
  annoList.annotations ??
  annoList.__rawJson?.items ??
  []

const fetchAnnotationBody = async (annotation) => {
  try {
    const annoId = new URL(annotation.id ?? annotation['@id'] ?? annotation)
    const response = await fetch(annoId.toString())
    if (!response.ok) return null
    const data = await response.json()
    return data.body ?? data.resource ?? null
  } catch {
    return null
  }
}

const getAnnotationBodies = async (annotation) => {
  if (typeof annotation.getBody === 'function') {
    return annotation.getBody()
  }

  let b = annotation.body ?? annotation.resource ?? null
  if (!b) {
    b = await fetchAnnotationBody(annotation)
  }

  return Array.isArray(b) ? b : b ? [b] : []
}

const findTextBody = (bodies) => {
  if (!Array.isArray(bodies)) return bodies
  return bodies.find((b) => typeof b.getValue === 'function' || b.value || b.chars) ?? bodies[0]
}

const extractTextValue = (body) =>
  typeof body.getValue === 'function'
    ? body.getValue()
    : body.value ?? body.chars ?? body['cnt:chars'] ?? ''

const getAnnotationTarget = (annotation) =>
  typeof annotation.getTarget === 'function'
    ? annotation.getTarget()
    : annotation.target ?? annotation.on

const getCanvasLabel = (canvas, index) =>
  canvas?.label ?? canvas?.getDefaultLabel?.() ?? `[unlabeled ${index}]`

export const extractLines = async (sequence, annotationData, manifest) => {
  const canvases = sequence.getCanvases?.() ?? []

  for (const canvas of canvases) {
    const texts = []
    const annotationLists = getAnnotationLists(canvas)

    for (const [i, annoList] of annotationLists.entries()) {
      const annotations = getAnnotations(annoList)

      for (const [index, annotation] of annotations.entries()) {
        const bodies = await getAnnotationBodies(annotation)
        const body = findTextBody(bodies)
        if (!body) continue

        const line = extractTextValue(body)
        if (!line) continue

        texts.push(line)

        const rawTarget = getAnnotationTarget(annotation)
        const selectorUrl = normalizeTargetToSelector(rawTarget, canvas)
        const thisCanvas = canvas.label ? canvas : getCanvas(selectorUrl, manifest)

        addWordsToData(
          line,
          selectorUrl,
          index + 1,
          getCanvasLabel(thisCanvas, i),
          annotationData.words,
          annotationData.index
        )
      }
    }

    annotationData.pages.push(texts.join('\n'))
  }
}

const convertPercentToPixel = (percent, dimension) => Math.round((percent / 100) * dimension)

const processXywhSelector = (value, canvas, src) => {
  let xy = value.split('=')[1]

  if (xy.startsWith('pixel:')) {
    return `${src}#xywh=${xy.replace(/^pixel:/, '')}`
  }

  if (!xy.startsWith('percent:')) {
    return `${src}#xywh=${xy}`
  }

  const [px, py, pw, ph] = xy.replace(/^percent:/, '').split(',').map(parseFloat)
  const cw = canvas?.getWidth?.() ?? canvas?.width
  const ch = canvas?.getHeight?.() ?? canvas?.height

  if (!cw || !ch) {
    return `${src}#xywh=${px},${py},${pw},${ph}`
  }

  const x = convertPercentToPixel(px, cw)
  const y = convertPercentToPixel(py, ch)
  const w = convertPercentToPixel(pw, cw)
  const h = convertPercentToPixel(ph, ch)

  return `${src}#xywh=${x},${y},${w},${h}`
}

const normalizeTargetToSelector = (target, canvas) => {
  try {
    if (!target) return ''
    if (typeof target === 'string') return target

    const src = target.source ?? target.id ?? ''
    if (!src) return ''

    const value = target.selector?.value ?? ''
    if (!value.startsWith('xywh=')) return String(src)

    return processXywhSelector(value, canvas, src)
  } catch {
    return typeof target === 'string' ? target : ''
  }
}

export const getCanvas = (query, manifest) => {
  const sequences = manifest.getSequences?.() ?? []

  for (const seq of sequences) {
    const canvases = seq.getCanvases?.() ?? []

    for (const c of canvases) {
      const canvasId = c.id ?? c['@id'] ?? ''
      const normalizedId = canvasId.replace(/^https?:/, '')

      try {
        if (query.indexOf(normalizedId) > -1) {
          return c
        }
      } catch {
        continue
      }
    }
  }

  return {}
}

export const loadManifest = async (url) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const manifestJson = await response.json()
    const mf = (typeof window !== 'undefined' ? window.manifesto : undefined) ?? globalThis.manifesto

    if (!mf?.parseManifest) return null

    return mf.parseManifest(manifestJson)
  } catch {
    return null
  }
}

export const loadAnnotationPage = async (url) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch {
    return null
  }
}
