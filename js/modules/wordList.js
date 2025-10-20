import { wordSort } from '../utils/wordUtils.js'
import { suppressModal } from './imageViewer.js'

const sortWords = (list, sortType, words) => {
  const sorters = {
    smallest: (a, b) => words[a].length - words[b].length,
    largest: (a, b) => words[b].length - words[a].length,
  }

  return sorters[sortType] ? list.sort(sorters[sortType]) : list
}

const createWordListItem = (word, count, isOdd) => {
  const oddClass = isOdd ? 'class="odd"' : ''
  return `<li ${oddClass}><a data-word="${word}">${word} <badge>(${count})</badge></a></li>`
}

const setupWordClickHandler = (node, word) => {
  node.onclick = () => {
    document.querySelectorAll('[active]').forEach((elem) => elem.removeAttribute('active'))
    node.setAttribute('active', true)

    const term = document.querySelector(`[name="${word}"]`)
    term.scrollIntoView({ behavior: 'smooth' })
    term.children[0].setAttribute('active', true)
  }
}

const updateConcordanceVisibility = (concordance, length, occurs) => {
  for (const node of concordance.getElementsByTagName('a')) {
    const wLength = parseInt(node.getAttribute('data-word-length'))
    const wOccurs = parseInt(node.getAttribute('data-occurs'))
    node.style.display = length > wLength || occurs > wOccurs ? 'none' : 'block'
  }
}

export const renderWordList = (annotationData, form) => {
  suppressModal()

  const lengthDisplay = document.getElementById('lengthDisplay')
  const occursDisplay = document.getElementById('occursDisplay')
  const occurrences = document.getElementById('occurrences')
  const concordance = document.getElementById('concordance')
  const sorting = document.getElementById('sorting')

  lengthDisplay.value = form.wordLength.value
  occursDisplay.value = form.occurs.value

  const sort = sorting.value
  const length = parseInt(form.wordLength.value)
  const occurs = parseInt(form.occurs.value)

  let list = Object.keys(annotationData.words).filter((x) => x).sort(wordSort)

  if (!list.length) return

  form.wordLength.setAttribute('max', list.reduce((a, b) => Math.max(a, b.length), 10))
  form.occurs.setAttribute('max', list.reduce((a, b) => Math.max(a, annotationData.words[b].length), 10))

  list = sortWords(list, sort, annotationData.words)

  let listUL = ''
  let odd = true

  for (const w of list) {
    if (length > w.length || occurs > annotationData.words[w].length) continue

    listUL += createWordListItem(w, annotationData.words[w].length, !(odd = !odd))
  }

  if (!listUL.includes('<li')) return

  occurrences.innerHTML = listUL

  for (const node of occurrences.getElementsByTagName('a')) {
    const word = node.getAttribute('data-word')
    setupWordClickHandler(node, word)
  }

  updateConcordanceVisibility(concordance, length, occurs)
}

const createSearchTest = (search, searchin) =>
  searchin ? (val) => !val.includes(search) : (val) => !val.startsWith(search)

const updateOccurrenceVisibility = (occurrences, test) => {
  let odd = true

  for (const node of occurrences.getElementsByTagName('a')) {
    const shouldHide = test(node.firstChild.textContent.toLowerCase())
    node.parentElement.style.display = shouldHide ? 'none' : 'block'

    if (shouldHide) continue

    node.parentElement.classList.toggle('odd', odd)
    odd = !odd
  }
}

const updateConcordanceFilter = (concordance, test) => {
  for (const node of concordance.getElementsByTagName('a')) {
    const shouldHide = test(node.getAttribute('name').toLowerCase())
    node.style.display = shouldHide ? 'none' : 'block'
  }
}

export const filterWordList = (annotationData, form) => {
  const occurrences = document.getElementById('occurrences')
  const concordance = document.getElementById('concordance')

  const search = form.filter.value.toLowerCase()
  const searchin = form.searchin.checked

  document.querySelector('[for="searchin"]').textContent = searchin ? 'Contains:' : 'Starts with:'

  const test = createSearchTest(search, searchin)

  updateOccurrenceVisibility(occurrences, test)
  updateConcordanceFilter(concordance, test)
}
