function checkProjects() {
    var bad = [];
    $.get('projects', function(data) {
        var toProc = data.length;

        function decCount() {
            toProc--;
            if (toProc <= 0) {
                $('#output').text("These projects error:\n\n" + JSON.stringify(bad));
            }
            $('#status').text(toProc + ' / ' + data.length);
        }
        data.forEach(project => {
            var numId = project.id.split('/').slice(1).join('/')
            $.get('project/' + numId, function() {
                console.log('good: ' + numId);
                decCount();
            }).fail(function() {
                console.log('bad: ' + numId);
                bad.push(numId);
                decCount();
            })
        })
    })
}
