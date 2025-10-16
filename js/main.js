import { loadManifest } from './modules/iiif.js'
import { initializeConcordance } from './modules/concordance.js'

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
      '<p style="text-align: center; padding: 2rem;">Please provide a manifest URL using the ?manifest= parameter</p>'
    return
  }

  const manifest = await loadManifest(manifestUrl)

  if (!manifest) {
    document.getElementById('concordance').innerHTML =
      '<p style="text-align: center; padding: 2rem; color: red;">Failed to load manifest. Please check the URL and try again.</p>'
    return
  }

  await initializeConcordance(manifest)
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
