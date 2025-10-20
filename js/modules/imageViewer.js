import { getCanvas } from './iiif.js'

const formatLineNumber = (lineNumber) =>
  lineNumber !== 'false' ? `line ${lineNumber}` : ''

export const createPeekWindow = (element) => {
  const lineNumber = formatLineNumber(element.getAttribute('data-index'))

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

const createLineCard = (el) => {
  const lineNumber = formatLineNumber(el.getAttribute('data-index'))
  const label = el.getAttribute('title')
  const src = el.getAttribute('data-source')
  const quote = el.textContent

  return `<card> ${label} (${lineNumber})
    <div>
      <img selector="${src}">
    </div>
    <span class="line-quote">&ldquo;${quote}&rdquo;</span>
  </card>`
}

export const createPeekLinesWindow = (element) => {
  const dd = element.getElementsByTagName('dd')
  const lines = Array.from(dd).map(createLineCard).join('')

  return `<a onclick="modal.style.display='none';"><i class="fa-close fa pull-right"></i></a>
    <header>
      <h4>${element.getAttribute('name')}</h4>
    </header>
    ${lines}`
}

const normalizeUrl = (s) => (s ?? '').replace(/^https?:/, '').replace(/\/$/, '')

const showNoImageNote = (imgElement) => {
  imgElement.nextElementSibling?.remove()
  imgElement.insertAdjacentHTML('afterend', '<div class="no-image">no image</div>')
  imgElement.style.display = 'none'
  return false
}

const findCanvasInManifest = (sourceUrl, manifest) => {
  const sequences = manifest.getSequences?.() ?? []

  for (const seq of sequences) {
    const canvases = seq.getCanvases?.() ?? []

    for (const c of canvases) {
      const canvasId = c.id ?? c['@id'] ?? ''
      if (normalizeUrl(canvasId) === normalizeUrl(sourceUrl)) {
        return c
      }
    }
  }

  return null
}

const getImageResource = (canvas) => {
  const images = canvas.getImages?.() ?? canvas.images ?? []
  let imageResource = images[0]?.getResource?.() ?? images[0]?.resource

  if (imageResource || typeof canvas.getContent !== 'function') {
    return imageResource
  }

  const content = canvas.getContent()
  const firstAnno = Array.isArray(content) && content.length ? content[0] : null
  const bodies = firstAnno?.getBody?.() ?? []
  const body = Array.isArray(bodies) && bodies.length ? bodies[0] : null

  return body ?? imageResource
}

const setupCanvas = (hiddenCanvas, ctx, targ, pos, scale, imgElement, src) => {
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
  }
}

export const imgFromSelector = (imgElement, selector, manifest) => {
  if (!selector) {
    return showNoImageNote(imgElement)
  }

  let selectURL
  try {
    selectURL = new URL(selector, window.location.href)
  } catch {
    return showNoImageNote(imgElement)
  }

  const sourceUrl = selectURL.href.split('#')[0]
  const canvas = findCanvasInManifest(sourceUrl, manifest) ?? getCanvas(selector, manifest)

  const xywh = new URLSearchParams(selectURL.hash.slice(1)).get('xywh')
  const canvasWidth = canvas?.getWidth?.() ?? canvas?.width
  const canvasHeight = canvas?.getHeight?.() ?? canvas?.height
  const pos = xywh?.length
    ? xywh.split(',').map((a) => parseInt(a))
    : [0, 0, canvasWidth, canvasHeight].map((a) => parseInt(a))

  if (!canvasHeight) {
    return showNoImageNote(imgElement)
  }

  const hiddenCanvas = document.createElement('canvas')
  hiddenCanvas.width = pos[2]
  hiddenCanvas.height = pos[3]
  const ctx = hiddenCanvas.getContext('2d')
  const img = new Image()

  const imageResource = getImageResource(canvas)
  const src = imageResource?.id ?? imageResource?.['@id'] ?? ''

  const loaded = (e) => {
    const targ = e.target
    imgElement.nextElementSibling?.remove()
    imgElement.style.display = 'block'

    const scale = targ.naturalWidth / canvasWidth
    setupCanvas(hiddenCanvas, ctx, targ, pos, scale, imgElement, src)
    targ.removeEventListener(e.type, loaded)
  }

  img.onload = loaded
  img.onerror = () => {
    imgElement.onload = loaded
    imgElement.src = src
  }
  img.crossOrigin = 'anonymous'
  img.src = src
}

export const handleLinePeek = (event, manifest) => {
  event.preventDefault()
  const modal = document.getElementById('modal')
  modal.innerHTML = createPeekWindow(event.detail.target)
  const imgElement = modal.getElementsByTagName('img')[0]
  imgFromSelector(imgElement, imgElement.getAttribute('selector'), manifest)
  // Position modal relative to the clicked line element within #concordance using bounding rects
  const anchor = event.detail.target
  const concordance = document.getElementById('concordance')
  const anchorRect = anchor.getBoundingClientRect()
  const concRect = concordance.getBoundingClientRect()
  modal.style.top = `${anchorRect.bottom - concRect.top}px`
  modal.style.left = `${anchorRect.left - concRect.left}px`
  modal.style.display = 'block'
}

export const handleWordPeek = (event, manifest) => {
  event.preventDefault()
  const modal = document.getElementById('modal')
  modal.innerHTML = createPeekLinesWindow(event.detail.target)
  const imgs = modal.getElementsByTagName('img')
  Array.from(imgs).forEach((el) => imgFromSelector(el, el.getAttribute('selector'), manifest))
  // Position modal relative to the clicked word anchor within #concordance using bounding rects
  const anchor = event.detail.target
  const concordance = document.getElementById('concordance')
  const anchorRect = anchor.getBoundingClientRect()
  const concRect = concordance.getBoundingClientRect()
  modal.style.top = `${anchorRect.bottom - concRect.top}px`
  modal.style.left = `${anchorRect.left - concRect.left}px`
  modal.style.display = 'block'
}

export const suppressModal = () => {
  const modal = document.getElementById('modal')
  modal.style.display = 'none'
}
