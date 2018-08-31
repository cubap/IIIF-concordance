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
		console.log("ran");
		console.log(data.__proto__.constructor);
		console.log(data.length);
		console.log(Object.keys(data));

		window.manifest = data;

		manifest.sequences.forEach(extractLines);

		showGlossary();
	});

	function showGlossary() {
		var dict = annotationData.words;
		var mainList = $('#glossary');
		console.log(Object.keys(dict));
		Object.keys(dict).sort().filter(x => x).forEach(word => {
			var data = dict[word];
			var item = $('<li>');
			var keyword = $('<strong>');
			keyword.text(word);
			item.append(keyword);

			if (data.length == 1) {
				var info = $('<span>');
				info.text(": " + data[0].line);
				item.append(info);
			} else {
				var sublist = $('<ul>');
				data.forEach(line => {
					var subitem = $('<li>');
					subitem.text(line.line);
					sublist.append(subitem);
				})
				item.append(sublist);
			}
			mainList.append(item);
		});
	}


	function extractLines(sequence) {
		sequence.canvases.forEach(canvas => {
			var pageText = [];
			canvas.otherContent.forEach(other => {
				other.resources.forEach(wrapper => {
					var resource = wrapper.resource;
					console.log("res");
					if (resource["@type"] == "cnt:ContentAsText") {
						var line = resource['cnt:chars'] || '';
						annotationData.lines.push(line);
						pageText.push(line);
						addWords(line, annotationData.lines.length-1);
					} else {
						console.log(resource["@type"]);
					}
				});
			})
			annotationData.pages.push(pageText.join("\n"));
		})
	}

	function addWords(line, lookupIndex) {
		var words = line.split(/\s+/);
		words.forEach(word => {
			var dict = annotationData.words;
			word = word.replace(/\W/g, ''); // strip punctuation
			word = word.toLowerCase(); // normalize case (might want to do this as an optional thing)
			if (!dict[word]) {
				dict[word] = [];	
			}
			dict[word].push({
				index: lookupIndex,
				line: line,
			});
		});
	}
});
