$(function() {
	
	window.annotationData = {
		lines: [],
		pages: [],
		words: {},
	};

	// WHY isn't this built-in. Anyway, strip off the '?', then get the right parameter
	var projectId = location.search.substring(1).split("&").map(comp => comp.split("=")).filter(comp => comp[0] == 'projectID')[0][1];
	$.get('/getProjectTPENServlet?projectID=' + projectId, function(payload) {
		data = JSON.parse(payload.manifest);

		window.manifest = data;

		manifest.sequences.forEach(extractLines);

		showGlossary();
	});

	function showGlossary() {
		var dict = annotationData.words;
		var mainList = $('#glossary');
		Object.keys(dict).sort().filter(x => x).forEach(word => {
			var data = dict[word];
			var item = $('<li>');
			var keyword = $('<strong>');
			keyword.text(word);
			item.append(keyword);

			if (data.length == 1) {
				var separator = $('<span>');
				separator.text(": ");
				item.append(separator);
				markupWordOccurrence(item, word, data[0]);
			} else {
				var sublist = $('<ul>');
				data.forEach(line => {
					var subitem = $('<li>');
					markupWordOccurrence(subitem, word, line);
					sublist.append(subitem);
				})
				item.append(sublist);
			}
			mainList.append(item);
		});

		function markupWordOccurrence(container, word, data) {
			var start = data.pos;
			var end = data.pos + word.length;

			var pre = $('<span>');
			pre.text(data.line.substring(0, start));

			var ul = $('<span style="text-decoration: underline;">');
			ul.text(data.line.substring(start, end));

			var post = $('<span>');
			post.text(data.line.substring(end));

			container.append(pre);
			container.append(ul);
			container.append(post);
		}
	}


	function extractLines(sequence) {
		sequence.canvases.forEach(canvas => {
			var pageText = [];
			canvas.otherContent.forEach(other => {
				other.resources.forEach(wrapper => {
					var resource = wrapper.resource;
					if (resource["@type"] == "cnt:ContentAsText") {
						var line = resource['cnt:chars'] || '';
						annotationData.lines.push(line);
						pageText.push(line);
						addWords(line, annotationData.lines.length-1);
					}
				});
			})
			annotationData.pages.push(pageText.join("\n"));
		})
	}

	function addWords(line, lookupIndex) {
		var words = line.split(/\s+/);
		var pos = 0;
		words.forEach(word => {
			var offset = word.length + 1;
			var dict = annotationData.words;
			word = word.replace(/\W/g, ''); // strip punctuation
			word = word.toLowerCase(); // normalize case (might want to do this as an optional thing)
			if (!dict[word]) {
				dict[word] = [];
			}
			dict[word].push({
				index: lookupIndex,
				line: line,
				pos: pos,
			});

			pos += offset;
		});
	}
});
