import { wordSort } from '../utils/wordUtils.js'
import { debounce } from '../utils/debounce.js'
import { extractLines } from './iiif.js'
import { renderWordList, filterWordList } from './wordList.js'
import { handleLinePeek, handleWordPeek } from './imageViewer.js'

/**
 * Builds the concordance HTML from annotation data.
 * @param {Object} annotationData - The annotation data
 * @returns {string} HTML string
 */
const buildConcordance = (annotationData) => {
  const dict = annotationData.words
  const words = Object.keys(dict)
    .filter((x) => x)
    .sort(wordSort)
  let tmpl = ''

  words.forEach((word) => {
    const data = dict[word]
    const item = `<a name="${word}" data-word-length="${word.length}" data-occurs="${data.length}">
      <dt>${word} <badge>(${data.length})</badge></dt>
      ${data.map((w) => `<dd data-source="${w.source}" data-index="${w.lineNumber}" title="${w.label}">${markupWordOccurrence(word, w)}</dd>`).join('')}
    </a>`
    tmpl += item
  })

  return tmpl

  function markupWordOccurrence(word, data) {
    const start = data.pos
    const end = data.pos + word.length
    return `${data.line.substring(0, start)}<mark>${data.line.substring(start, end)}</mark>${data.line.substring(end)}`
  }
}

/**
 * Renders the alphabetical index of first letters.
 * @param {Object} annotationData - The annotation data
 * @param {HTMLFormElement} form - The filter form
 */
const renderIndex = (annotationData, form) => {
  const indices = document.getElementById('indices')
  const tmpl = Object.keys(annotationData.index)
    .sort()
    .map((char) => `<a class="indices" data-index="${char}">${char}</a>`)
    .join('')

  if (tmpl.length > 0) {
    indices.innerHTML = tmpl

    // Attach click handlers
    Array.from(indices.getElementsByClassName('indices')).forEach((elem) => {
      elem.onclick = (event) => {
        form.filter.value = event.target.getAttribute('data-index')
        filterWordList(annotationData, form)
      }
    })
  }
}

/**
 * Renders the concordance view with interactive elements.
 * @param {Object} annotationData - The annotation data
 * @param {HTMLFormElement} form - The filter form
 */
const renderConcordance = (annotationData, form) => {
  const concordance = document.getElementById('concordance')
  const concordanceHTML = buildConcordance(annotationData)

  if (concordanceHTML.length > 0) {
    concordance.innerHTML = concordanceHTML

    // Attach click handlers to lines (dd elements)
    const dds = concordance.getElementsByTagName('dd')
    Array.from(dds).forEach((dd) => {
      dd.onclick = (e) => {
        const source = e.target.getAttribute('data-source')
        const target = e.target.tagName === 'DD' ? e.target : e.target.closest('DD')
        const ev = new CustomEvent('line:selected', {
          detail: {
            target,
            source,
            text: target.textContent,
          },
        })
        window.top.dispatchEvent(ev)
      }
    })

    // Attach click handlers to words (a elements)
    const anchors = concordance.getElementsByTagName('a')
    Array.from(anchors).forEach((a) => {
      a.onclick = (e) => {
        if (['DD', 'MARK'].includes(e.target.tagName)) {
          e.preventDefault()
          return false
        }
        const source = e.target.getAttribute('data-source')
        const target = e.target.tagName === 'A' ? e.target : e.target.closest('A')
        const ev = new CustomEvent('word:selected', {
          detail: {
            target,
            source,
          },
        })
        window.top.dispatchEvent(ev)
      }
    })

    renderIndex(annotationData, form)
    renderWordList(annotationData, form)
  }
}

/**
 * Initializes the concordance with data from a IIIF manifest.
 * @param {Object} manifest - IIIF manifest object
 * @param {Object|Array} injectedCanvases - Optional canvas(es) with injected annotations from postMessage
 */
export const initializeConcordance = async (manifest, injectedCanvases = null) => {
  const form = document.forms.listOptions
  const sorting = document.getElementById('sorting')

  // Initialize annotation data
  const annotationData = {
    pages: [],
    words: {},
    index: {},
  }

  // Manifesto: getSequences() works for both P2 and P3
  const sequences = manifest?.getSequences ? manifest.getSequences() : []

  if (sequences.length === 0) {
    console.warn('No sequences found in manifest')
    document.getElementById('concordance').innerHTML =
      '<p style="text-align: center; padding: 2rem;">No sequences found in this manifest.</p>'
    return
  }

  const promises = []
  
  // If we have injected canvases, process only those
  if (injectedCanvases) {
    const canvasArray = Array.isArray(injectedCanvases) ? injectedCanvases : [injectedCanvases]
    console.log(`Processing ${canvasArray.length} canvases with injected annotations`)
    
    // Create a temporary sequence with only the injected canvases
    const tempSequence = {
      getCanvases: () => canvasArray
    }
    
    const promise = extractLines(tempSequence, annotationData, manifest)
    promises.push(promise)
  } else {
    // Normal processing: all sequences
    sequences.forEach((sequence) => {
      const promise = extractLines(sequence, annotationData, manifest)
      promises.push(promise)
    })
  }

  // Wait for all async annotations to load
  await Promise.all(promises)

  // Render the concordance
  renderConcordance(annotationData, form)

  // Attach event handlers with debouncing
  sorting.oninput = () => renderWordList(annotationData, form)
  form.filter.oninput = debounce(() => filterWordList(annotationData, form), 300)
  form.searchin.oninput = debounce(() => filterWordList(annotationData, form), 300)
  form.wordLength.oninput = debounce(() => renderWordList(annotationData, form), 300)
  form.occurs.oninput = debounce(() => renderWordList(annotationData, form), 300)

  // Listen for custom events
  window.addEventListener('line:selected', (e) => handleLinePeek(e, manifest))
  window.addEventListener('word:selected', (e) => handleWordPeek(e, manifest))
}
