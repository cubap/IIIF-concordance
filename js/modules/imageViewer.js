import { getCanvas } from './iiif.js'

/**
 * Creates a modal window for viewing a single line with its image.
 * @param {HTMLElement} element - The element containing line data
 * @returns {string} HTML string for modal
 */
export const createPeekWindow = (element) => {
  let lineNumber = element.getAttribute('data-index')
  lineNumber = lineNumber !== 'false' ? `line ${lineNumber}` : ''

  return `<a onclick="modal.style.display='none';"><i class="fa-close fa pull-right"></i></a>
    <header>
      <h4>${element.getAttribute('title')}</h4>
      <small>${lineNumber}</small>
    </header>
    <div>
      <img selector="${element.getAttribute('data-source')}">
    </div>
    <span class="line-quote">&ldquo;${element.textContent}&rdquo;</span>
  </div>`
}

/**
 * Creates a modal window for viewing multiple lines with images.
 * @param {HTMLElement} element - The element containing word data
 * @returns {string} HTML string for modal
 */
export const createPeekLinesWindow = (element) => {
  const dd = element.getElementsByTagName('dd')
  const lines = Array.from(dd).reduce((a, el) => {
    let lineNumber = el.getAttribute('data-index')
    lineNumber = lineNumber !== 'false' ? `line ${lineNumber}` : ''
    const label = el.getAttribute('title')
    const src = el.getAttribute('data-source')
    const quote = el.textContent

    return (a += `<card> ${label} (${lineNumber})
      <div>
        <img selector="${src}">
      </div>
      <span class="line-quote">&ldquo;${quote}&rdquo;</span>
    </card>`)
  }, '')

  return `<a onclick="modal.style.display='none';"><i class="fa-close fa pull-right"></i></a>
    <header>
      <h4>${element.getAttribute('name')}</h4>
    </header>
    ${lines}`
}

/**
 * Loads an image from a IIIF canvas selector into an img element.
 * @param {HTMLImageElement} imgElement - Target image element
 * @param {string} selector - IIIF selector URL
 * @param {Object} manifest - IIIF manifest
 */
export const imgFromSelector = (imgElement, selector, manifest) => {
  const note = '<div class="no-image">no image</div>'

  if (!selector) {
    if (imgElement.nextElementSibling) {
      imgElement.nextElementSibling.remove()
    }
    imgElement.insertAdjacentHTML('afterend', note)
    imgElement.style.display = 'none'
    return false
  }

  // Resolve selector URL and match canvas by its id (P2 or P3)
  const normalize = (s) => (s || '').replace(/^https?:/, '').replace(/\/$/, '')
  let selectURL
  try {
    selectURL = new URL(selector, window.location.href)
  } catch {
    if (imgElement.nextElementSibling) imgElement.nextElementSibling.remove()
    imgElement.insertAdjacentHTML('afterend', note)
    imgElement.style.display = 'none'
    return false
  }
  const sourceUrl = selectURL.href.split('#')[0]

  let canvas = null
  const sequences = manifest.getSequences ? manifest.getSequences() : []
  for (const seq of sequences) {
    const canvases = seq.getCanvases ? seq.getCanvases() : []
    for (const c of canvases) {
      const canvasId = c.id || c['@id'] || ''
      if (normalize(canvasId) === normalize(sourceUrl)) {
        canvas = c
        break
      }
    }
    if (canvas) break
  }
  // Fallback: looser match using existing helper
  if (!canvas) {
    canvas = getCanvas(selector, manifest)
  }

  let xywh = selectURL.hash.substr(1)
  xywh = new URLSearchParams(xywh).get('xywh')
  const canvasWidth = canvas?.getWidth ? canvas.getWidth() : canvas?.width
  const canvasHeight = canvas?.getHeight ? canvas.getHeight() : canvas?.height
  const pos = xywh?.length
    ? xywh.split(',').map((a) => parseInt(a))
    : [0, 0, canvasWidth, canvasHeight].map((a) => parseInt(a))

  if (!canvasHeight) {
    if (imgElement.nextElementSibling) imgElement.nextElementSibling.remove()
    imgElement.insertAdjacentHTML('afterend', note)
    imgElement.style.display = 'none'
    return false
  }

  const hiddenCanvas = document.createElement('canvas')
  hiddenCanvas.width = pos[2]
  hiddenCanvas.height = pos[3]
  const ctx = hiddenCanvas.getContext('2d')
  const img = new Image()

  // Get image resource - Manifesto normalizes this
  const images = canvas.getImages ? canvas.getImages() : canvas.images || []
  let imageResource = images[0]?.getResource ? images[0].getResource() : images[0]?.resource
  // P3 content: try getContent()[0].getBody()[0]
  if (!imageResource && typeof canvas.getContent === 'function') {
    const content = canvas.getContent()
    const firstAnno = Array.isArray(content) && content.length ? content[0] : null
    const bodies = firstAnno && typeof firstAnno.getBody === 'function' ? firstAnno.getBody() : []
    const body = Array.isArray(bodies) && bodies.length ? bodies[0] : null
    imageResource = body || imageResource
  }
  const src = imageResource?.id || imageResource?.['@id'] || ''

  const loaded = (e) => {
    const targ = e.target
    if (imgElement.nextElementSibling) {
      imgElement.nextElementSibling.remove()
    }
    imgElement.style.display = 'block'
    const scale = targ.naturalWidth / canvasWidth
    ctx.drawImage(
      targ,
      pos[0] * scale,
      pos[1] * scale,
      pos[2] * scale,
      pos[3] * scale,
      0,
      0,
      hiddenCanvas.width,
      hiddenCanvas.height
    )

    try {
      imgElement.setAttribute('src', hiddenCanvas.toDataURL())
      imgElement.onclick = () => window.open(src, '_blank')
    } catch {
      // Doesn't serve CORS images, load canvas itself
      imgElement.insertAdjacentElement('afterend', hiddenCanvas)
      imgElement.style.display = 'none'
      hiddenCanvas.style.width = '100%'
      hiddenCanvas.style.maxWidth = '100%'
      hiddenCanvas.style.maxHeight = '100%'
      ctx.drawImage(
        targ,
        pos[0] * scale,
        pos[1] * scale,
        pos[2] * scale,
        pos[3] * scale,
        0,
        0,
        hiddenCanvas.width,
        hiddenCanvas.height
      )
      hiddenCanvas.onclick = () => window.open(src, '_blank')
    } finally {
      targ.removeEventListener(e.type, loaded)
    }
  }

  img.onload = loaded
  img.onerror = () => {
    // CORS issue, load tainted canvas
    imgElement.onload = loaded
    imgElement.src = src
  }
  img.crossOrigin = 'anonymous'
  img.src = src
}

/**
 * Shows the modal with peek content.
 * @param {CustomEvent} event - Custom event with detail.target
 * @param {Object} manifest - IIIF manifest
 */
export const handleLinePeek = (event, manifest) => {
  event.preventDefault()
  const modal = document.getElementById('modal')
  modal.innerHTML = createPeekWindow(event.detail.target)
  const imgElement = modal.getElementsByTagName('img')[0]
  imgFromSelector(imgElement, imgElement.getAttribute('selector'), manifest)
  modal.style.display = 'block'
}

/**
 * Shows the modal with multiple lines peek content.
 * @param {CustomEvent} event - Custom event with detail.target
 * @param {Object} manifest - IIIF manifest
 */
export const handleWordPeek = (event, manifest) => {
  event.preventDefault()
  const modal = document.getElementById('modal')
  modal.innerHTML = createPeekLinesWindow(event.detail.target)
  const imgs = modal.getElementsByTagName('img')
  Array.from(imgs).forEach((el) => imgFromSelector(el, el.getAttribute('selector'), manifest))
  modal.style.display = 'block'
}

/**
 * Closes the modal.
 */
export const suppressModal = () => {
  const modal = document.getElementById('modal')
  modal.style.display = 'none'
}
