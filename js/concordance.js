function reloadData(manifest = {
    sequences: []
}) {
    // data used by various parts of this closure
    annotationData = {
        pages: [],
        words: {},
        index: {}
    }

    manifest.sequences.forEach(extractLines)
    renderConcordance()
    sorting.oninput = renderWordList

    function renderConcordance() {
        let concordanceHTML = buildConcordance()
        if(concordanceHTML.length > 0) {
            concordance.innerHTML = concordanceHTML
            let dds = concordance.getElementsByTagName("dd")
            let as = concordance.getElementsByTagName("a")
            Array(...dds).map(dd => {
                dd.onclick = e => {
                    let source = e.target.getAttribute("data-source")
                    let target = (e.target.tagName === "DD") ? e.target : e.target.closest("DD")
                    let ev = new CustomEvent("line:selected", {
                        detail: {
                            target: target,
                            source: source,
                            text: target.textContent,
                            // mouse: { x: e.clientX, y: e.clientY }
                        }
                    })
                    window.top.dispatchEvent(ev)
                }
            })
            Array(...as).map(a => {
                a.onclick = e => {
                    if (["DD", "MARK"].includes(e.target.tagName)) {
                        e.preventDefault()
                        return false
                    }
                    let source = e.target.getAttribute("data-source")
                    let target = (e.target.tagName === "A") ? e.target : e.target.closest("A")
                    let ev = new CustomEvent("word:selected", {
                        detail: {
                            target: target,
                            source: source
                        }
                    })
                    window.top.dispatchEvent(ev)
                }
            })
            renderIndex()
            renderWordList()
        }
    }

    function renderIndex() {
        let tmpl = Object.keys(annotationData.index).sort().map(char => `<a class="indices" data-index="${char}">${char}</a>`).join(``)
        if(tmpl.length > 0) {
            indices.innerHTML = tmpl
            Array.from(indices.getElementsByClassName("indices")).forEach(elem => elem.onclick = (event) => {
                document.forms.listOptions.filter.value = event.target.getAttribute("data-index")
                document.forms.listOptions.filter.oninput()
            })
            document.forms.listOptions.filter.oninput = document.forms.listOptions.searchin.oninput = filterWordList
            document.forms.listOptions.wordLength.oninput = document.forms.listOptions.occurs.oninput = renderWordList
        }
    }

    function buildConcordance() {
        var dict = annotationData.words
        let words = Object.keys(dict).filter(x => x).sort(wordSort)
        let tmpl = ``

        words.forEach(word => {
            var data = dict[word]
            var item = `<a name="${word}" data-word-length="${word.length}" data-occurs="${data.length}"><dt>${word} <badge>(${data.length})</badge></dt>
			${ data.map(w => `<dd data-source="${w.source}" data-index="${w.lineNumber}" title="${w.label}">${markupWordOccurrence(word, w)}</dd>`).join("")}`
            tmpl += item + `</a>`
        })

        function markupWordOccurrence(word, data) {
            var start = data.pos
            var end = data.pos + word.length
            var line = `${data.line.substring(0, start)}<mark>${data.line.substring(start, end)}</mark>${data.line.substring(end)}`
            return line
        }

        return tmpl
    }

    function filterWordList(event) {
        let search = document.forms.listOptions.filter.value.toLowerCase()
        let searchin = document.forms.listOptions.searchin.checked
        document.querySelector("[for='searchin']").textContent = searchin ? "Contains:" : "Starts with:"
        let odd = true
        for (let node of occurrences.getElementsByTagName("a")) {
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
        for (let node of concordance.getElementsByTagName("a")) {
            if (test(node.getAttribute("name").toLowerCase())) {
                node.style.display = "none"
            } else {
                node.style.display = "block"
            }
        }

        function test(val) {
            return searchin ? val.indexOf(search) === -1 : val.indexOf(search) !== 0
        }
    }

    /**
     * Sorting function for word orders.
     * @param {String} a 
     * @param {String} b 
     */
    function wordSort(a, b) {
        let i = 0
        let f = 0
        try {
            while (f === 0) {
                let comp = a.match(/\w+/g)[0].toLowerCase().charCodeAt(i) - b.match(/\w+/g)[0].toLowerCase().charCodeAt(i)
                if (isNaN(comp)) {
                    return f
                }
                f = comp
                i++
            }
        } catch (err) {
            // reached end of word
        }
        return f
    }

    function suppressModal() {
        modal.style.display = "none"
    }

    function renderWordList(event) {
        if (event) {
            event.preventDefault()
        }
        suppressModal()
        lengthDisplay.value = document.forms.listOptions.wordLength.value
        occursDisplay.value = document.forms.listOptions.occurs.value
        let sort = sorting.value
        let length = parseInt(document.forms.listOptions.wordLength.value)
        let occurs = parseInt(document.forms.listOptions.occurs.value)
        let listUL = ``
        let list = Object.keys(annotationData.words).filter(x => x).sort(wordSort)
        if (list.length === 0) {
            return
        }
        document.forms.listOptions.wordLength.setAttribute("max", list.reduce((a, b) => Math.max(a, b.length), 10))
        document.forms.listOptions.occurs.setAttribute("max", list.reduce((a, b) => Math.max(a, annotationData.words[b].length), 10))

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
        let odd = true
        for (let w of list) {
            if (length > w.length || occurs > annotationData.words[w].length) {
                continue
            }
            listUL += `<li ${!(odd = !odd) && `class="odd"` || ``}><a data-word="${w}">${w} <badge>(${annotationData.words[w].length})</badge></a></li>`
        }
        listUL += `
		</ul>
        </div>`
        if(listUL.indexOf("<li") > -1) {
            occurrences.innerHTML = listUL
            for (let node of occurrences.getElementsByTagName("a")) {
                let word = node.getAttribute("data-word")
                node.onclick = function() {
                    [...document.querySelectorAll("[active]")].map(elem => elem.removeAttribute("active"))
                    node.setAttribute("active", true)
                    let term = document.querySelector('[name="' + word + '"]')
                    term.scrollIntoView({
                        behavior: 'smooth'
                    })
                    term.children[0].setAttribute("active", true)
                }
            }
            for (let node of concordance.getElementsByTagName("a")) {
                let wLength = parseInt(node.getAttribute("data-word-length"))
                let wOccurs = parseInt(node.getAttribute("data-occurs"))
                if (length > wLength || occurs > wOccurs) {
                    node.style.display = "none"
                } else {
                    node.style.display = "block"
                }
            }
        }
    }

    function extractLines(sequence) {
        var promises = []
        sequence.canvases.forEach(canvas => {
            var texts = []
            if (!canvas.otherContent) {
                return true
            } // TODO: add P3 "annotations"
            canvas.otherContent.forEach((other, i) => {
                if (!other.resources) {
                    promises.push(fetch(other["@id"]).then(response => response.json()).catch(() => []))
                    return true
                }
                other.resources.forEach((container, index) => {
                    var resource = container.resource
                    if (resource["@type"] == "cnt:ContentAsText") {
                        var line = resource['cnt:chars'] || resource.chars
                        if (!line) {
                            return true
                        }
                        texts.push(line)
                        let target = container.on || container.target
                        if(!canvas.label) {
                            canvas = getCanvas(target)
                        }
                        addWords(line, target, index + 1, canvas.label || "[unlabeled " + i + "]")
                        // TODO: the canvas.label is unknown within the promises below.
                    }
                })
            })
            annotationData.pages.push(texts.join("\n"))
        })
        if (promises.length) {
            Promise.all(promises).then(contents => extractLines({
                // TODO: maybe make an id map for canvases and then attach these to them before rerunning...
                canvases: [{
                    otherContent: contents
                }]
            })).then(renderConcordance)
        }
    }

    function addWords(line = "", source = "", lineNumber = false, label = "") {
        // regex: not in "<>", commas and dots inside words, any other digit or character, case insensitive
        var regex = /((?![^<]*>)((\w+[\.,']\w+)|[\d\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]+))/g
        var words = line.match(regex)
        if (words) {
            words = words.map(w => w.toLowerCase())
        } else {
            return
        } // only found punctuation, <tags> or blank
        var pos = 0
        words.forEach(word => {
            let offset = line.substr(pos).search(new RegExp(word, "i")) + pos
            // TODO: punctuation throws off pos
            var dict = annotationData.words;
            if (!dict[word]) {
                dict[word] = []
            }
            dict[word].push({
                line: line,
                pos: offset,
                source: source,
                lineNumber: lineNumber,
                label: label
            })
            // NB: this just takes the first letter, not any letter in, which is ultimately what we might want...
            annotationData.index[word.substr(0, 1).toUpperCase()] = true
            pos = offset + word.length
        })
    }

    function peek(event) {
        event.preventDefault()
        modal.innerHTML = peekWindow(event.detail.target)
        let imgElement = modal.getElementsByTagName("img")[0]
        imgFromSelector(imgElement, imgElement.getAttribute("selector"))
        modal.style.display = "block";
    }

    function peekLines(event) {
        event.preventDefault()
        modal.innerHTML = peekLinesWindow(event.detail.target)
        let imgs = modal.getElementsByTagName("img")
        Array(...imgs).map(el => imgFromSelector(el, el.getAttribute("selector")))
        modal.style.display = "block"
    }

    function peekWindow(element) {
        let lineNumber = element.getAttribute('data-index')
        lineNumber = (lineNumber != "false") ? `line ${lineNumber}` : ``
        let modal = `<a onclick="modal.style.display='none';"><i class="fa-close fa pull-right"></i></a>
		<header>
		<h4>${element.getAttribute('title')}</h4>
		<small>${lineNumber}</small>
		</header>
		<div>
			<img selector="${element.getAttribute('data-source')}">
		</div>
		<span class="line-quote">&ldquo;${element.textContent}&rdquo;</span>
		</div>`
        return modal
    }

    function peekLinesWindow(element) {
        let dd = element.getElementsByTagName("dd")
        let lines = Array(...dd).reduce((a, el) => {
            let lineNumber = el.getAttribute('data-index')
            lineNumber = (lineNumber != "false") ? `line ${lineNumber}` : ``
            let label = el.getAttribute('title')
            let src = el.getAttribute('data-source')
            let quote = el.textContent
            return a += `<card> ${label} (${lineNumber})
				<div>
					<img selector="${src}">
				</div>
				<span class="line-quote">&ldquo;${quote}&rdquo;</span>
			</card>`
        }, ``)
        let modal = `<a onclick="modal.style.display='none';"><i class="fa-close fa pull-right"></i></a>
		<header>
			<h4>${element.getAttribute('name')}</h4>
		</header>
		${lines}`
        return modal
    }

    window.addEventListener("line:selected", peek)
    window.addEventListener("word:selected", peekLines)

    function imgFromSelector(imgElement, selector) {
        var note = `<div class="no-image">no image</div>`
        if (!selector) {
            if (imgElement.nextElementSibling) {
                imgElement.nextElementSibling.remove()
            } // delete any backup <canvas> that has been added
            imgElement.insertAdjacentHTML("afterend", note) // add "no image" note
            imgElement.style.display = "none"
            return false;
        }
        let canvas = {}
        for (let c of manifest.sequences[0].canvases) {
            let cheapHack = c["@id"].substr(5) // http(s) mismatch, for one
            // TODO: more expensive or elegant cleanup for comparison
            if (c.images && (selector.indexOf(cheapHack) > -1)) {
                canvas = c
                continue
            }
        }
        let selectURL = new URL(selector)
        let xywh = selectURL.hash.substr(1)
        xywh = new URLSearchParams(xywh).get("xywh")
        let pos = (xywh.length) ? xywh.split(",").map(a => parseInt(a)) : [0, 0, canvas.width, canvas.height].map(a => parseInt(a))
        if (!canvas.height) {
            throw "No sc:Canvas loaded with id:" + canvas["@id"]
        }
        let hiddenCanvas = document.createElement('canvas')
        hiddenCanvas.width = pos[2]
        hiddenCanvas.height = pos[3]
        let ctx = hiddenCanvas.getContext("2d")
        let img = new Image()
        let src = canvas.images[0].resource["@id"]
        let loaded = function(e) {
            let targ = e.target
            if (imgElement.nextElementSibling) {
                imgElement.nextElementSibling.remove()
            } // delete any backup <canvas> that has been added
            imgElement.style.display = "block"
            let scale = targ.naturalWidth / canvas.width
            ctx.drawImage(targ, pos[0] * scale, pos[1] * scale, pos[2] * scale, pos[3] * scale, 0, 0, hiddenCanvas.width, hiddenCanvas.height)
            try {
                imgElement.attr('src', hiddenCanvas.toDataURL());
                imgElement.onclick = ev => window.open(src, '_blank')
            } catch (err) {
                // Doesn't serve CORS images, so this doesn't work.
                // load the canvas itself into the DOM since it is 'tainted'
                imgElement.insertAdjacentElement("afterend", hiddenCanvas)
                imgElement.style.display = "none"
                hiddenCanvas.style.width = "100%";
                hiddenCanvas.style.maxWidth = "100%";
                hiddenCanvas.style.maxHeight = "100%";
                // redraw, after width change
                ctx.drawImage(targ, pos[0] * scale, pos[1] * scale, pos[2] * scale, pos[3] * scale, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
                hiddenCanvas.onclick = ev => window.open(src, '_blank')
            } finally {
                targ.removeEventListener(e.type, arguments.callee) // one-time use
            }
        }
        img.onload = loaded
        img.onerror = (event) => {
            // CORS H8, probably, load tainted canvas
            // TODO: check for auth service on Manifest and present issue.
            imgElement.onload = loaded
            imgElement.src = src
        }
        img.crossOrigin = "anonymous"
        img.src = src;
    }

    /**
     * 
     * @param {expensive cheat until ID map is in place} query 
     */
    function getCanvas(query) {
        querying:
        for(let seq of manifest.sequences) {
            for(let c of seq.canvases) {
                if (query.indexOf(c["@id"]) > -1) {
                    return c
                }
            }
        }
        return {}
    }
}

window.onload = function() {
    let params = (new URL(document.location)).searchParams
    var manifest = params.get("manifest")
    fetch(manifest)
        .then(response => response.json()).catch() // ignore failure
        .then(payload => reloadData(payload))
}