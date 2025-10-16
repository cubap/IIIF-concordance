import { wordSort } from '../utils/wordUtils.js'
import { suppressModal } from './imageViewer.js'

/**
 * Renders the word list based on current filters and sorting.
 * @param {Object} annotationData - The annotation data containing words
 * @param {HTMLFormElement} form - The filter form
 */
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
  
  let list = Object.keys(annotationData.words).filter(x => x).sort(wordSort)
  if (list.length === 0) {
    return
  }
  
  // Set max values for sliders
  form.wordLength.setAttribute("max", list.reduce((a, b) => Math.max(a, b.length), 10))
  form.occurs.setAttribute("max", list.reduce((a, b) => Math.max(a, annotationData.words[b].length), 10))
  
  // Apply sorting
  switch (sort) {
    case "smallest":
      list = list.sort((a, b) => annotationData.words[a].length - annotationData.words[b].length)
      break
    case "largest":
      list = list.sort((a, b) => annotationData.words[b].length - annotationData.words[a].length)
      break
    default:
      break
  }
  
  // Build list HTML
  let listUL = ``
  let odd = true
  for (const w of list) {
    if (length > w.length || occurs > annotationData.words[w].length) {
      continue
    }
    listUL += `<li ${!(odd = !odd) && `class="odd"` || ``}><a data-word="${w}">${w} <badge>(${annotationData.words[w].length})</badge></a></li>`
  }
  
  if (listUL.indexOf("<li") > -1) {
    occurrences.innerHTML = listUL
    
    // Attach click handlers
    for (const node of occurrences.getElementsByTagName("a")) {
      const word = node.getAttribute("data-word")
      node.onclick = () => {
        // Remove active state from all elements
        document.querySelectorAll("[active]").forEach(elem => elem.removeAttribute("active"))
        node.setAttribute("active", true)
        
        // Scroll to term in concordance
        const term = document.querySelector('[name="' + word + '"]')
        term.scrollIntoView({ behavior: 'smooth' })
        term.children[0].setAttribute("active", true)
      }
    }
    
    // Update concordance visibility based on filters
    for (const node of concordance.getElementsByTagName("a")) {
      const wLength = parseInt(node.getAttribute("data-word-length"))
      const wOccurs = parseInt(node.getAttribute("data-occurs"))
      if (length > wLength || occurs > wOccurs) {
        node.style.display = "none"
      } else {
        node.style.display = "block"
      }
    }
  }
}

/**
 * Filters the word list based on search input.
 * @param {Object} annotationData - The annotation data
 * @param {HTMLFormElement} form - The filter form
 */
export const filterWordList = (annotationData, form) => {
  const occurrences = document.getElementById('occurrences')
  const concordance = document.getElementById('concordance')
  
  const search = form.filter.value.toLowerCase()
  const searchin = form.searchin.checked
  
  // Update label
  document.querySelector("[for='searchin']").textContent = searchin ? "Contains:" : "Starts with:"
  
  const test = (val) => {
    return searchin ? val.indexOf(search) === -1 : val.indexOf(search) !== 0
  }
  
  // Filter word list
  let odd = true
  for (const node of occurrences.getElementsByTagName("a")) {
    if (test(node.firstChild.textContent.toLowerCase())) {
      node.parentElement.style.display = "none"
    } else {
      node.parentElement.style.display = "block"
      if (odd) {
        node.parentElement.classList.add("odd")
      } else {
        node.parentElement.classList.remove("odd")
      }
      odd = !odd
    }
  }
  
  // Filter concordance
  for (const node of concordance.getElementsByTagName("a")) {
    if (test(node.getAttribute("name").toLowerCase())) {
      node.style.display = "none"
    } else {
      node.style.display = "block"
    }
  }
}
