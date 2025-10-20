import { wordSort } from '../utils/wordUtils.js'
import { debounce } from '../utils/debounce.js'
import { extractLines } from './iiif.js'
import { renderWordList, filterWordList } from './wordList.js'
import { handleLinePeek, handleWordPeek } from './imageViewer.js'

const createSequenceFromCanvases = (canvases) => {
  const canvasArray = Array.isArray(canvases) ? canvases : [canvases]
  return { getCanvases: () => canvasArray }
}

const setupEventHandlers = (annotationData, form, sorting, manifest) => {
  sorting.oninput = () => renderWordList(annotationData, form)
  form.filter.oninput = debounce(() => filterWordList(annotationData, form), 300)
  form.searchin.oninput = debounce(() => filterWordList(annotationData, form), 300)
  form.wordLength.oninput = debounce(() => renderWordList(annotationData, form), 300)
  form.occurs.oninput = debounce(() => renderWordList(annotationData, form), 300)

  window.addEventListener('line:selected', (e) => handleLinePeek(e, manifest))
  window.addEventListener('word:selected', (e) => handleWordPeek(e, manifest))
}

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

const renderIndex = (annotationData, form) => {
  const indices = document.getElementById('indices')
  const tmpl = Object.keys(annotationData.index)
    .sort()
    .map((char) => `<a class="indices" data-index="${char}">${char}</a>`)
    .join('')

  if (!tmpl.length) return

  indices.innerHTML = tmpl

  Array.from(indices.getElementsByClassName('indices')).forEach((elem) => {
    elem.onclick = (event) => {
      form.filter.value = event.target.getAttribute('data-index')
      filterWordList(annotationData, form)
    }
  })
}

const renderConcordance = (annotationData, form) => {
  const concordance = document.getElementById('concordance')
  const concordanceHTML = buildConcordance(annotationData)

  if (!concordanceHTML.length) return

  concordance.innerHTML = concordanceHTML

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

export const initializeConcordance = async (manifest, injectedCanvases = null) => {
  const form = document.forms.listOptions
  const sorting = document.getElementById('sorting')

  const annotationData = {
    pages: [],
    words: {},
    index: {},
  }

  const sequences = manifest?.getSequences?.() ?? []

  if (!sequences.length) {
    document.getElementById('concordance').innerHTML =
      '<p style="text-align: center; padding: 2rem;">No sequences found in this manifest.</p>'
    return
  }

  const promises = injectedCanvases
    ? [extractLines(createSequenceFromCanvases(injectedCanvases), annotationData, manifest)]
    : sequences.map((sequence) => extractLines(sequence, annotationData, manifest))

  await Promise.all(promises)

  setupEventHandlers(annotationData, form, sorting, manifest)
  renderConcordance(annotationData, form)
}
