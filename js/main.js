import { loadManifest, loadAnnotationPage } from './modules/iiif.js'
import { initializeConcordance } from './modules/concordance.js'

let currentManifest = null

const init = async () => {
  const params = new URLSearchParams(window.location.search)
  const manifestUrl = params.get('manifest')

  if (!manifestUrl) {
    document.getElementById('concordance').innerHTML =
      '<p style="text-align: center; padding: 2rem;">Please provide a manifest URL using the ?manifest= parameter or send a postMessage with manifest data.</p>'
    setupMessageListener()
    return
  }

  const manifest = await loadManifest(manifestUrl)

  if (!manifest) {
    document.getElementById('concordance').innerHTML =
      '<p style="text-align: center; padding: 2rem; color: red;">Failed to load manifest. Please check the URL and try again.</p>'
    return
  }

  currentManifest = manifest
  await initializeConcordance(manifest)
  
  setupMessageListener()
}

const setupMessageListener = () => {
  window.addEventListener('message', async (event) => {
    const data = event.data
    
    if (!data || typeof data.type !== 'string') return
    if (!data.type.includes('ANNOTATIONPAGE')) return
    
    try {
      if (!currentManifest && data.manifest) {
        currentManifest = await loadManifest(data.manifest)
        if (!currentManifest) return
      }
      
      data.annotationPage && await handleAnnotationPageMessage(data)
    } catch (error) {
    }
  })
}

const extractPageUri = (item) => 
  typeof item === 'string' ? item : item?.id ?? item?.['@id']

const isCollectionType = (p) => {
  if (typeof p === 'string') return true
  const t = p?.type
  return Array.isArray(t) 
    ? t.includes('AnnotationCollection') || t.includes('Collection') 
    : t === 'AnnotationCollection' || t === 'Collection'
}

const loadPaginatedAnnotationPages = async (collection) => {
  const annotationPages = []
  const total = collection.total ?? 0
  const maxPages = total || 100
  
  let currentPageUri = extractPageUri(collection.first)
  let pageCount = 0
  
  while (currentPageUri && pageCount < maxPages) {
    const page = await loadAnnotationPage(currentPageUri)
    if (!page?.items) break
    
    annotationPages.push(page)
    pageCount++
    currentPageUri = page.next ? extractPageUri(page.next) : null
  }
  
  return annotationPages
}

const handleAnnotationPageMessage = async data => {
  const annotationPageRef = data?.annotationPage
  if (!annotationPageRef) return

  const annoPageData = await loadAnnotationPage(annotationPageRef)
  if (!annoPageData) return

  if (!annoPageData?.partOf) {
    await rebuildConcordanceFromAnnotations([annoPageData])
    return
  }

  const candidates = Array.isArray(annoPageData.partOf)
    ? annoPageData.partOf
    : [annoPageData.partOf].filter(Boolean)
  if (!candidates.length) return

  const chosen = candidates.find(isCollectionType) ?? candidates[0]
  const collectionUri = extractPageUri(chosen)
  if (!collectionUri) return

  const collection = await loadAnnotationPage(collectionUri)
  if (!collection) return

  const itemUris = Array.isArray(collection.items)
    ? collection.items.map(item => extractPageUri(item)).filter(Boolean)
    : []
  if (!itemUris.length && !collection.first) return

  const annotationPages = itemUris.length
    ? await Promise.all(itemUris.map(loadAnnotationPage))
    : await loadPaginatedAnnotationPages(collection)

  const validPages = annotationPages.filter(p => p?.items)
  if (!validPages.length) return

  await rebuildConcordanceFromAnnotations(validPages)
}

const extractTargetCanvasId = (annotation) => {
  let target = annotation.target
  if (typeof target === 'object') {
    target = target.source ?? target.id ?? target['@id']
  }
  return typeof target === 'string' ? target.split('#')[0] : null
}

const normalizeUri = (uri) => uri.replace(/^https?:/, '')

const rebuildConcordanceFromAnnotations = async (annotationPages) => {
  if (!currentManifest) return
  
  const canvasIds = new Set()
  const canvasAnnotations = new Map()
  
  annotationPages.forEach(page => {
    if (!page?.items) return
    
    page.items.forEach(annotation => {
      const canvasId = extractTargetCanvasId(annotation)
      if (!canvasId) return
      
      canvasIds.add(canvasId)
      
      if (!canvasAnnotations.has(canvasId)) {
        canvasAnnotations.set(canvasId, [])
      }
      canvasAnnotations.get(canvasId).push(page)
    })
  })
  
  const sequences = currentManifest.getSequences?.() ?? []
  const targetedCanvases = []
  
  for (const seq of sequences) {
    const canvases = seq.getCanvases?.() ?? []
    for (const c of canvases) {
      const cId = c.id ?? c['@id'] ?? ''
      const normalizedId = normalizeUri(cId)
      
      for (const canvasId of canvasIds) {
        const normalizedTargetId = normalizeUri(canvasId)
        if (normalizedId === normalizedTargetId || cId === canvasId) {
          const pages = Array.from(new Set(canvasAnnotations.get(canvasId)))
          targetedCanvases.push({
            ...c,
            __injectedAnnotations: pages
          })
          break
        }
      }
    }
  }
  
  if (targetedCanvases.length === 0) return
  
  await initializeConcordance(currentManifest, targetedCanvases)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
