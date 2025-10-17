import { loadManifest, loadAnnotationPage } from './modules/iiif.js'
import { initializeConcordance } from './modules/concordance.js'

// Store current manifest globally for postMessage handling
let currentManifest = null

/**
 * Main application initialization.
 * Loads IIIF manifest from URL parameter and initializes concordance.
 */
const init = async () => {
  const params = new URLSearchParams(window.location.search)
  const manifestUrl = params.get('manifest')

  if (!manifestUrl) {
    console.warn('No manifest URL provided in query parameters')
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

/**
 * Sets up postMessage listener for iframe communication
 */
const setupMessageListener = () => {
  window.addEventListener('message', async (event) => {
    const data = event.data
    
    // Look for messages containing ANNOTATIONPAGE
    if (!data || typeof data.type !== 'string') return
    
    if (data.type.includes('ANNOTATIONPAGE')) {
      console.log('Received AnnotationPage message:', data)
      
      try {
        // Load the manifest if not already loaded
        if (!currentManifest && data.manifest) {
          currentManifest = await loadManifest(data.manifest)
          if (!currentManifest) {
            console.error('Failed to load manifest from message:', data.manifest)
            return
          }
        }
        
        // Load and process the AnnotationPage
        if (data.annotationPage) {
          await handleAnnotationPageMessage(data)
        }
      } catch (error) {
        console.error('Error processing AnnotationPage message:', error)
      }
    }
  })
  
  console.log('PostMessage listener initialized for AnnotationPage updates')
}

/**
 * Handles incoming AnnotationPage messages
 * @param {Object} data - Message data containing manifest, canvas, annotationPage, annotation
 */
const handleAnnotationPageMessage = async (data) => {
  const { annotationPage } = data
  
  // Load the AnnotationPage
  const annoPageData = await loadAnnotationPage(annotationPage)
  
  if (!annoPageData) {
    console.error('Failed to load AnnotationPage:', annotationPage)
    return
  }
  
  // The AnnotationPage should have a partOf pointing to the AnnotationCollection
  if (!annoPageData.partOf) {
    console.warn('AnnotationPage has no partOf collection, processing single page only')
    await rebuildConcordanceFromAnnotations([annoPageData])
    return
  }
  
  // Load the AnnotationCollection (partOf may be string, object, or array)
  const candidates = Array.isArray(annoPageData.partOf) ? annoPageData.partOf : [annoPageData.partOf].filter(Boolean)

  const chosen = candidates.find(p => {
    if (typeof p === 'string') return true
    const t = p?.type
    return Array.isArray(t) ? t.includes('AnnotationCollection') || t.includes('Collection') : t === 'AnnotationCollection' || t === 'Collection'
  }) ?? candidates[0]

  const collectionUri = typeof chosen === 'string' ? chosen : chosen?.id ?? chosen?.['@id']

  if (!collectionUri) {
    console.error('Unable to resolve AnnotationCollection URI from partOf', annoPageData.partOf)
    return
  }
  console.log('Loading AnnotationCollection:', collectionUri)
  const collection = await loadAnnotationPage(collectionUri)
  
  if (!collection) {
    console.error('Failed to load AnnotationCollection')
    return
  }
  
  // AnnotationCollections may have items array OR use first/last/next pagination
  let annotationPages = []
  
  if (collection.items && Array.isArray(collection.items)) {
    // Direct items array
    console.log(`AnnotationCollection has ${collection.items.length} items directly`)
    annotationPages = await Promise.all(
      collection.items.map(async (item) => {
        const pageUri = typeof item === 'string' ? item : item.id || item['@id']
        return await loadAnnotationPage(pageUri)
      })
    )
  } else if (collection.first) {
    // Paginated collection - walk through first/next links
    const total = collection.total || 0
    console.log(`AnnotationCollection is paginated with total: ${total}`)
    
    let currentPageUri = typeof collection.first === 'string' 
      ? collection.first 
      : collection.first?.id || collection.first?.['@id']
    
    let pageCount = 0
    const maxPages = total || 100 // Safety limit
    
    while (currentPageUri && pageCount < maxPages) {
      const page = await loadAnnotationPage(currentPageUri)
      if (page && page.items) {
        annotationPages.push(page)
        pageCount++
        
        // Get next page URI
        if (page.next) {
          currentPageUri = typeof page.next === 'string' 
            ? page.next 
            : page.next?.id || page.next?.['@id']
        } else {
          currentPageUri = null // No more pages
        }
      } else {
        console.error('Failed to load page:', currentPageUri)
        break
      }
    }
    
    console.log(`Loaded ${pageCount} pages by walking through pagination`)
  } else {
    console.error('AnnotationCollection has neither items array nor first/last pagination')
    return
  }
  
  const validPages = annotationPages.filter(p => p && p.items)
  console.log(`Loaded ${validPages.length} valid AnnotationPages with annotations`)
  
  if (validPages.length === 0) {
    console.warn('No valid AnnotationPages found in collection')
    return
  }
  
  // Rebuild concordance from the collection
  await rebuildConcordanceFromAnnotations(validPages)
}

/**
 * Rebuilds the concordance from a collection of AnnotationPages
 * @param {Array} annotationPages - Array of AnnotationPage objects
 */
const rebuildConcordanceFromAnnotations = async (annotationPages) => {
  if (!currentManifest) {
    console.error('No manifest loaded, cannot rebuild concordance')
    return
  }
  
  // Extract all unique canvas IDs targeted by the annotations
  const canvasIds = new Set()
  
  annotationPages.forEach(page => {
    if (!page || !page.items) return
    
    page.items.forEach(annotation => {
      // Extract canvas ID from target
      let target = annotation.target
      if (typeof target === 'object') {
        target = target.source || target.id || target['@id']
      }
      
      if (typeof target === 'string') {
        // Remove fragment/selector to get canvas ID
        const canvasId = target.split('#')[0]
        canvasIds.add(canvasId)
      }
    })
  })
  
  console.log(`Found ${canvasIds.size} unique canvases targeted by annotations`)
  
  // Build a map of canvas ID -> AnnotationPages for that canvas
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
  
  // Find all canvases in the manifest that are targeted
  const sequences = currentManifest.getSequences ? currentManifest.getSequences() : []
  const targetedCanvases = []
  
  for (const seq of sequences) {
    const canvases = seq.getCanvases ? seq.getCanvases() : []
    for (const c of canvases) {
      const cId = c.id || c['@id'] || ''
      const normalizedId = cId.replace(/^https?:/, '')
      
      // Check if this canvas is targeted by any annotations
      for (const canvasId of canvasIds) {
        const normalizedTargetId = canvasId.replace(/^https?:/, '')
        if (normalizedId === normalizedTargetId || cId === canvasId) {
          // Inject the annotation pages for this canvas
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
  
  console.log(`Found ${targetedCanvases.length} canvases in manifest with annotations`)
  
  if (targetedCanvases.length === 0) {
    console.warn('No matching canvases found in manifest for annotations')
    return
  }
  
  // Create a derivative manifest with only the targeted canvases
  // We'll pass the injected canvases to initializeConcordance
  await initializeConcordance(currentManifest, targetedCanvases)
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
