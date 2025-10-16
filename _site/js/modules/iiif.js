import { addWordsToData } from '../utils/wordUtils.js'

/**
 * Extracts lines and words from IIIF manifest sequences.
 * @param {Object} sequence - IIIF sequence object
 * @param {Object} annotationData - Data structure to populate
 * @param {Object} manifest - Full manifest for reference
 * @returns {Promise} Promise that resolves when all annotations are processed
 */
export const extractLines = (sequence, annotationData, manifest) => {
  const promises = []
  
  sequence.canvases.forEach(canvas => {
    const texts = []
    if (!canvas.otherContent) {
      return true
    } // TODO: add P3 "annotations"
    
    canvas.otherContent.forEach((other, i) => {
      if (!other.resources) {
        promises.push(fetch(other["@id"] ?? other).then(response => response.json()).catch(() => []))
        return true
      }
      
      other.resources.forEach((container, index) => {
        const resource = container.resource
        if (resource["@type"].includes("cnt:ContentAsText")) {
          const line = resource['cnt:chars'] ?? resource.chars
          if (!line) {
            return true
          }
          texts.push(line)
          const target = container.on ?? container.target
          const thisCanvas = canvas.label ? canvas : getCanvas(target, manifest)
          addWordsToData(
            line, 
            target, 
            index + 1, 
            thisCanvas?.label || "[unlabeled " + i + "]",
            annotationData.words,
            annotationData.index
          )
        }
      })
    })
    annotationData.pages.push(texts.join("\n"))
  })
  
  return Promise.all(promises)
}

/**
 * Finds a canvas in the manifest by query string.
 * @param {string} query - Query string to match
 * @param {Object} manifest - IIIF manifest
 * @returns {Object} Canvas object or empty object
 */
export const getCanvas = (query, manifest) => {
  for (const seq of manifest.sequences) {
    for (const c of seq.canvases) {
      const cheapHack = c["@id"].replace(/^https?:/, '') // http(s) mismatch fix
      try {
        if (query.indexOf(cheapHack) > -1) {
          return c
        }
      } catch (err) {
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
    return await response.json()
  } catch (error) {
    console.error('Failed to load manifest:', error)
    return { sequences: [] }
  }
}
