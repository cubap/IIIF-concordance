import { addWordsToData } from '../utils/wordUtils.js'

export const extractLines = async (sequence, annotationData, manifest) => {
  const canvases = sequence.getCanvases ? sequence.getCanvases() : []
  
  for (const canvas of canvases) {
    const texts = []
    
    const hasInjected = canvas.__injectedAnnotations && Array.isArray(canvas.__injectedAnnotations)
    
    let annotationLists = []
    
    if (hasInjected) {
      annotationLists = canvas.__injectedAnnotations.map(page => ({
        __rawJson: page,
        getItems: () => page.items || [],
        type: page.type
      }))
    } else {
      annotationLists = canvas.__jsonld?.otherContent ?? []
      if (canvas.getAnnotationLists && canvas.getAnnotationLists().length) {
        annotationLists = canvas.getAnnotationLists()
      } else if (canvas.getAnnotations && canvas.getAnnotations().length) {
        annotationLists = canvas.getAnnotations()
      }
    }
    
    for (const [i, annoList] of annotationLists.entries()) {
      const annotations = annoList.getAnnotations
        ? annoList.getAnnotations()
        : annoList.getItems
          ? annoList.getItems()
          : annoList.resources ?? annoList.annotations ?? annoList.__rawJson?.items ?? []
      
      for (const [index, annotation] of annotations.entries()) {
        let bodies
        if (typeof annotation.getBody === 'function') {
          bodies = annotation.getBody()
        } else {
          let b = annotation.body ?? annotation.resource ?? null
          if (!b) {
            try {
              const annoId = new URL(annotation.id ?? annotation['@id'] ?? annotation)
              const response = await fetch(annoId.toString())
              if (response.ok) {
                const data = await response.json()
                b = data.body ?? data.resource ?? null
              }
            } catch (err) {
            }
          }
          bodies = Array.isArray(b) ? b : b ? [b] : []
        }
        const body = Array.isArray(bodies)
          ? bodies.find((b) => typeof b.getValue === 'function' || b.value || b.chars) || bodies[0]
          : bodies
        if (!body) {
          continue
        }
        
        const line =
          typeof body.getValue === 'function' ? body.getValue() : (body.value ?? body.chars ?? body['cnt:chars'] ?? '')
        if (!line) {
          continue
        }
        texts.push(line)
        
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
      }
    }
    
    annotationData.pages.push(texts.join('\n'))
  }
}

const normalizeTargetToSelector = (target, canvas) => {
  try {
    if (!target) return ''
    if (typeof target === 'string') return target
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
        return `${src}#xywh=${px},${py},${pw},${ph}`
      }
      return `${src}#xywh=${xy}`
    }
    return String(src)
  } catch {
    return typeof target === 'string' ? target : ''
  }
}

export const getCanvas = (query, manifest) => {
  const sequences = manifest.getSequences ? manifest.getSequences() : []
  for (const seq of sequences) {
    const canvases = seq.getCanvases ? seq.getCanvases() : []
    for (const c of canvases) {
      const canvasId = c.id || c['@id'] || ''
      const cheapHack = canvasId.replace(/^https?:/, '')
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

export const loadManifest = async (url) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const manifestJson = await response.json()
    const mf =
      (typeof window !== 'undefined' ? window.manifesto : undefined) ?? globalThis.manifesto
    if (!mf || typeof mf.parseManifest !== 'function') {
      return null
    }
    const manifest = mf.parseManifest(manifestJson)
    return manifest
  } catch (error) {
    return null
  }
}

export const loadAnnotationPage = async (url) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    return null
  }
}
