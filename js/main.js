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
    
    if (data.type.includes('ANNOTATIONPAGE')) {
      try {
        if (!currentManifest && data.manifest) {
          currentManifest = await loadManifest(data.manifest)
          if (!currentManifest) {
            return
          }
        }
        
        if (data.annotationPage) {
          await handleAnnotationPageMessage(data)
        }
      } catch (error) {
      }
    }
  })
}

const handleAnnotationPageMessage = async (data) => {
  const { annotationPage } = data
  
  const annoPageData = await loadAnnotationPage(annotationPage)
  
  if (!annoPageData) {
    return
  }
  
  if (!annoPageData.partOf) {
    await rebuildConcordanceFromAnnotations([annoPageData])
    return
  }
  
  const candidates = Array.isArray(annoPageData.partOf) ? annoPageData.partOf : [annoPageData.partOf].filter(Boolean)

  const chosen = candidates.find(p => {
    if (typeof p === 'string') return true
    const t = p?.type
    return Array.isArray(t) ? t.includes('AnnotationCollection') || t.includes('Collection') : t === 'AnnotationCollection' || t === 'Collection'
  }) ?? candidates[0]

  const collectionUri = typeof chosen === 'string' ? chosen : chosen?.id ?? chosen?.['@id']

  if (!collectionUri) {
    return
  }

  const collection = await loadAnnotationPage(collectionUri)
  
  if (!collection) {
    return
  }
  
  let annotationPages = []
  
  if (collection.items && Array.isArray(collection.items)) {
    annotationPages = await Promise.all(
      collection.items.map(async (item) => {
        const pageUri = typeof item === 'string' ? item : item.id || item['@id']
        return await loadAnnotationPage(pageUri)
      })
    )
  } else if (collection.first) {
    const total = collection.total || 0
    
    let currentPageUri = typeof collection.first === 'string' 
      ? collection.first 
      : collection.first?.id || collection.first?.['@id']
    
    let pageCount = 0
    const maxPages = total || 100
    
    while (currentPageUri && pageCount < maxPages) {
      const page = await loadAnnotationPage(currentPageUri)
      if (page && page.items) {
        annotationPages.push(page)
        pageCount++
        
        if (page.next) {
          currentPageUri = typeof page.next === 'string' 
            ? page.next 
            : page.next?.id || page.next?.['@id']
        } else {
          currentPageUri = null
        }
      } else {
        break
      }
    }
  } else {
    return
  }
  
  const validPages = annotationPages.filter(p => p && p.items)
  
  if (validPages.length === 0) {
    return
  }
  
  await rebuildConcordanceFromAnnotations(validPages)
}

const rebuildConcordanceFromAnnotations = async (annotationPages) => {
  if (!currentManifest) {
    return
  }
  
  const canvasIds = new Set()
  
  annotationPages.forEach(page => {
    if (!page || !page.items) return
    
    page.items.forEach(annotation => {
      let target = annotation.target
      if (typeof target === 'object') {
        target = target.source || target.id || target['@id']
      }
      
      if (typeof target === 'string') {
        const canvasId = target.split('#')[0]
        canvasIds.add(canvasId)
      }
    })
  })
  
  const canvasAnnotations = new Map()
  
  annotationPages.forEach(page => {
    if (!page || !page.items) return
    
    page.items.forEach(annotation => {
      let target = annotation.target
      if (typeof target === 'object') {
        target = target.source || target.id || target['@id']
      }
      
      if (typeof target === 'string') {
        const canvasId = target.split('#')[0]
        
        if (!canvasAnnotations.has(canvasId)) {
          canvasAnnotations.set(canvasId, [])
        }
        canvasAnnotations.get(canvasId).push(page)
      }
    })
  })
  
  const sequences = currentManifest.getSequences ? currentManifest.getSequences() : []
  const targetedCanvases = []
  
  for (const seq of sequences) {
    const canvases = seq.getCanvases ? seq.getCanvases() : []
    for (const c of canvases) {
      const cId = c.id || c['@id'] || ''
      const normalizedId = cId.replace(/^https?:/, '')
      
      for (const canvasId of canvasIds) {
        const normalizedTargetId = canvasId.replace(/^https?:/, '')
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
  
  if (targetedCanvases.length === 0) {
    return
  }
  
  await initializeConcordance(currentManifest, targetedCanvases)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
