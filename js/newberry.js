    var transcriptionCanvases = [];
    var focusItem = [null,null];
    var transcriptionFile = "";
    var transcriptionObject = {};
    var projectID = 0;
    var dragHelper = "<div id='dragHelper'></div>";
    var liveTool = "none";
    var zoomMultiplier = 2;
    var isMagnifying = false;
    var currentFolio = 0; //The current folio number.  It runs from 1 -> infinity, remember to subtract 1 when referring to index.  
    var isFullscreen = true;
    var line = false;
    var isAddingLines = false;
    var charactersForButton = "";
    var tagsForButton = "";
    var colorList = ["#99FF00", "#00FFCC", "#3300CC", "#CCFF00", "#000000", "#FFFFFF", "red"];
    var colorThisTime = "#FFFFFF";
    
    function firstFolio(){
        if(parseInt(currentFolio) !== 1){
            focusItem = [null,null];
            currentFolio = 1;
            loadTranscriptionCanvas(transcriptionFolios[0]);
        }
    }
    function lastFolio(){
        var lastFolio = transcriptionFolios.length;
        if(parseInt(currentFolio) !== parseInt(lastFolio)){
            focusItem = [null,null];
            currentFolio = lastFolio;
            loadTranscriptionCanvas(transcriptionFolios[lastFolio-1]);
        }
    }
    function previousFolio(){
        if(parseInt(currentFolio) > 1){
            focusItem = [null, null];
            currentFolio -= 1;
            loadTranscriptionCanvas(transcriptionFolios[currentFolio - 1]);
        }
        else{
            console.log("BUGGER");
        }
    }
    
    function nextFolio(){
        if(parseInt(currentFolio) !== transcriptionFolios.length){
            focusItem = [null, null];  
            currentFolio += 1;
            loadTranscriptionCanvas(transcriptionFolios[currentFolio-1]);
        }
        else{
            console.log("BOOGER");
        }
    }
    
    /* Test if a given string can be parsed into a valid JSON object.
     * @param str  A string
     * @return bool
     */
    function isJSON(str) {
        var r = true;
        if(typeof str === "object"){
            console.log('str is an object');
            r = true;
        }
        else{
            try {
                JSON.parse(str);
                r=true;
            } 
            catch (e) {
               console.log('str could not be parsed: '+e);
               r = false;
            }
        }
        return r;
    };
    

    function resetTranscription(){
        window.location.reload();
//        transcriptionCanvases = [];
//        focusItem = [null,null];
//        transcriptionFile = "";
//        transcriptionObject = {};
//        projectID = 0;
//        console.log('NEW RESET CODE!');
//        $('#setTranscriptionObjectArea').show();
//        $('#transcriptionText').html("");
//        $('#transcriptionTemplate').hide();
//        $('#bookmark').css({left:"-600%", height:"0px"});
//        $('#imgTop').css('height', '0px');
//        $('#captions').empty();
//        $('.transcriptionImage').attr('src', '');
//        $('.transcriptlet').remove();
//       
//        console.log('Reset Ran');
    }
    
//    function getProjectTools(projectID){
//        var url = "http://localhost:8080/newberry/getProjectTPENServlet?projectID="+projectID;
//        $.ajax({
//            url: url,
//            type:"GET",
//            success: function(activeProject){
//                var toolArea = $("#iTools");
//                var projectTools = activeProject.projectTool; //These are all iframe tools
////                $.each(projectTools, function(){
////                    var toolLabel = this.label;
////                    var toolSource = this.source;
////                    var projectTool = $('<div id="userTool_'+toolLabel+'" class="split iTool">\n\
////                        <div class="fullScreenTrans">Full Screen Transcription</div>\n\
////                        <iframe id="tool_'+toolLabel+'" src="'+toolSource+'">\n\
////                        </iframe>\n\
////                    </div>');
////                    toolArea.append(projectTool);
////                });
//                var userTools = activeProject.userTool; //These are tools chosen by the project creator for users to have access to.  They may not be iframe tools.
////                $.each(userTools, function(){
////                    
////                });
//            }
//        });
//    }
    
    function createPreviewPages(){  
        for(var i = 0; i<transcriptionFolios.length; i++){
           var lines = transcriptionFolios[i].resources;
           var noLines = false;
           if(!transcriptionFolios[i].images){
               transcriptionFolios[i].images = [];
           }
           if(!transcriptionFolios[i].resources){
               noLines = true;
           }
           else{
                $.each(transcriptionFolios[i].resources, function(){
                    if (this.resource["@type"] === "dctypes:Image"){
                        transcriptionFolios[i].images.push(this);
                    }
                });
           }
 
           var resource = transcriptionFolios[i].images[0].resource["@id"];
           var pageLabel = transcriptionFolios[i].label;
           var pageNum = resource.substring(resource.indexOf("folioNum=")+9, resource.lastIndexOf("&height"));
           var previewPage = $('<div class="previewPage" data-pageNumber="'+pageNum+'"><span class="previewFolioNumber">'+pageLabel+'</span></div>');
           if(noLines) previewPage = $('<div class="previewPage" data-pageNumber="'+pageNum+'"><span class="previewFolioNumber">'+pageLabel+'</span>No Lines</div>');
           var currentLineX = 0;
           var lastLineX = 10000;
           var currentPage = "";
           var col = "A";
           //TODO fix column incrementor
           if(!noLines){
                for(var j=1; j<lines.length; j++){
                    var currentLine = lines[j].on;
                    var currentLineXYWH = currentLine.slice(currentLine.indexOf("#xywh=")+6);
                    currentLineXYWH = currentLineXYWH.split(",");
                    var currentLineX = currentLineXYWH[0];
                    var line = lines[j];
                    var lineURL = line["@id"];
                    var lineID = lineURL.slice(lineURL.indexOf("/line/")+6);
                    var lineText = line.resource["cnt:chars"];
                    if(j>1){
                        var lastLine = lines[j-1].on;
                        var lastLineXYWH = lastLine.slice(lastLine.indexOf("#xywh=")+6);
                        lastLineXYWH = lastLineXYWH.split(",");
                        var lastLineX = lastLineXYWH[0];
                        if(parseInt(lastLineX) < parseInt(currentLineX)){
                            col++;
                        }
                    }
                    if(i===0)currentPage="currentPage";
                    var previewLine = $('<div class="previewLine" data-lineNumber="'+j+'">\n\
                                 <span class="previewLineNumber" lineserverid="'+lineID+'" data-lineNumber="'+j+'"  data-column="'+col+'"  data-lineOfColumn="'+j+'">\n\
                                    '+col+''+j+'\n\
                                  </span>\n\
                                 <span class="previewText '+currentPage+'">'+lineText+'<span class="previewLinebreak"></span></span>\n\
                                 <span class="previewNotes" contentEditable="(permitModify||isMember)" ></span>\n\
                             </div>');
                     previewPage.append(previewLine);
                 }
            }
            $("#previewDiv").append(previewPage);
        }
    }
    
    function populateSpecialCharacters(specialCharacters){
        specialCharacters = JSON.parse(specialCharacters);
        var speCharactersInOrder = new Array(specialCharacters.length);
        for (var char = 0; char < specialCharacters.length; char++){
            var thisChar = specialCharacters[char];
            if(thisChar == ""){

            }
            else{
                var keyVal = thisChar.key;
                var position2 = parseInt(thisChar.position);
                var newCharacter = "<option onclick=\"addchar('&#"+keyVal+";');\" class='character'>&#"+keyVal+";</option>";
                if(position2-1 >= 0 && (position2-1) < specialCharacters.length){
                    speCharactersInOrder[position2-1] = newCharacter; 
                }
            }

        }
        $.each(speCharactersInOrder, function(){
            var button1 = $(''+this);
            console.log(button1);
            $(".specialCharacters").append(button1);
        });

    }
    
    function populateXML(xmlTags){
        xmlTags = xmlTags.split("</span>"); // make a array by </span>
        var tagsInOrder = [];
        for (var tag = 0; tag < xmlTags.length; tag++){ //FIXME!!!How can I get these in order?  Order them after they are in the DOM?
//                        var thisTag = xmlTags[tag];
//                        var position1 = thisTag.position;
//                        var tagText = thisTag.text;
//                        var description = thisTag.description;
//                        var color = thisTag.color;
            var newTagBtn = xmlTags[tag];
            if(newTagBtn!=="" && newTagBtn!==" "){
                 tagsInOrder.push("<option>"+newTagBtn + "</span></option>");
            }

            //tagsInOrder[position1] = newTagBtn;
        }

            $.each(tagsInOrder, function(){
                var button2 = $(''+this);
                console.log(button2);
                $(".xmlTags").append(button2);
            }); 
    }

    
    /*
     * Load the trnascription from the text in the text area. 
     */

    function loadTranscription(){
        //Object validation here.
        //Project ID is not part of the manifest data.  When a user gets to transcription, we already need to know the project ID.
            projectID = 4080;
            var userTranscription = $('#transcriptionText').val();
            currentFolio = 1;
//            console.log(userTranscription);
//            console.log($.isNumeric(userTranscription));
            if($.isNumeric(userTranscription)){ //The user can put the project ID in directly and a call will be made to newberry proper to grab it.
                projectID = userTranscription;
                //Put a header in saying it is cross origin and who I am.
                var url = "http://localhost:8080/newberry/project/"+userTranscription;
                $.ajax({
                    url: url,
                    success: function(projectData){
                        if(projectData.sequences[0] !== undefined && projectData.sequences[0].canvases !== undefined
                        && projectData.sequences[0].canvases.length > 0){
                            transcriptionFolios = projectData.sequences[0].canvases;
                            var count = 1;
                            
                            $.each(transcriptionFolios, function(){
                                $("#pageJump").append("<option folioNum='"+count+"' class='folioJump' val='"+this.label+"'>"+this.label+"</option>");
                                $("#compareJump").append("<option class='compareJump' folioNum='"+count+"' val='"+this.label+"'>"+this.label+"</option>");
                                count++;
                            });
                            loadTranscriptionCanvas(projectData.sequences[0].canvases[0]);
                            createPreviewPages(transcriptionFolios);
                            var projectTitle = projectData.label;
                            $("#trimTitle").html(projectTitle);
                            $("#trimTitle").attr("title", projectTitle);
                            //getProjectTools(projectID);
                        }
                        else{
                            //ERROR! It is a malformed transcription object.  There is no canvas sequence defined.  
                        }
                    },
                    error: function(jqXHR,error, errorThrown) {  
                        if(jqXHR.status && jqXHR.status==400){
                             alert(jqXHR.responseText); 
                        }
                        else{
                            alert("Something went wrong");
                        }
                   }
                });
            }
            else if(isJSON(userTranscription)){
                    userTranscription = JSON.parse(userTranscription);
                    if(userTranscription.sequences[0] !== undefined && userTranscription.sequences[0].canvases !== undefined
                    && userTranscription.sequences[0].canvases.length > 0){
                        transcriptionFolios = userTranscription.sequences[0].canvases;
                        var count = 1;
                        $.each(transcriptionFolios, function(){
                           $("#pageJump").append("<option folioNum='"+count+"' class='folioJump' val='"+this.label+"'>"+this.label+"</option>");
                           $("#compareJump").append("<option class='compareJump' folioNum='"+count+"' val='"+this.label+"'>"+this.label+"</option>");
                           count++;
                        });
                        loadTranscriptionCanvas(userTranscription.sequences[0].canvases[0]);
                        createPreviewPages(transcriptionFolios);
                        var projectTitle = userTranscription.label;
                        $("#trimTitle").html(projectTitle);
                        $("#trimTitle").attr("title", projectTitle);
                    }
                    else{
                        //ERROR!  It is a valid JSON object, but it is malformed and cannot be read as a transcription object. 
                    }
                
//                else{
//                    //ERROR!  Not a valid JSON object
//
//                }
            }
            else if (userTranscription.indexOf("http://") >= 0 || userTranscription.indexOf("https://") >= 0){
                projectID = parseInt(userTranscription.lastIndexOf('/project/')); //I can get the project ID from newberry URI's this way.  I do not know about others.  
                $.ajax({
                    url: userTranscription,
                    success: function(projectData){
                        if(projectData.sequences[0] !== undefined && projectData.sequences[0].canvases !== undefined
                        && projectData.sequences[0].canvases.length > 0){
                            transcriptionFolios = projectData.sequences[0].canvases;
                            var count = 1;
                            $.each(transcriptionFolios, function(){
                                $("#pageJump").append("<option folioNum='"+count+"' class='folioJump' val='"+this.label+"'>"+this.label+"</option>");
                                $("#compareJump").append("<option class='compareJump' folioNum='"+count+"' val='"+this.label+"'>"+this.label+"</option>");
                                count++;
                            });
                            loadTranscriptionCanvas(projectData.sequences[0].canvases[0]);
                            createPreviewPages(transcriptionFolios);
                            var projectTitle = projectData.label;
                            $("#trimTitle").html(projectTitle);
                            $("#trimTitle").attr("title", projectTitle);
                        }
                        else{
                            //ERROR! It is a malformed transcription object.  There is no canvas sequence defined.  
                        }
                    },
                    error: function(jqXHR,error, errorThrown) {  
                        if(jqXHR.status && jqXHR.status==400){
                             alert(jqXHR.responseText); 
                        }
                        else{
                            alert("Something went wrong");
                        }
                    }
                });
            }
            else{
                alert("The input was invalid.");
            }
            
            var url = "http://localhost:8080/newberry/getProjectTPENServlet?projectID="+projectID;
            $.ajax({
                url: url,
                type:"GET",
                success: function(activeProject){
                    var projectTools = activeProject.projectTool;
                    projectTools = JSON.parse(projectTools);
                    var count = 0;
                    $.each(projectTools, function(){
                        if(count < 4){ //allows 5 tools.  
                            var splitHeight = window.innerHeight + "px";
                            var toolLabel = this.name;
                            var toolSource = this.url;
                            var splitTool = $('<div toolName="'+toolLabel+'" class="split iTool"><div class="fullScreenTrans" onclick="fullPage();">Return To Fullscreen</div></div>');
                            var splitToolIframe = $('<iframe style="height:'+splitHeight+';" src="'+toolSource+'"></iframe>');
                            var splitToolSelector = $('<option splitter="'+toolLabel+'" class="splitTool">'+toolLabel+'</option>');
                            splitTool.append(splitToolIframe);
                            $("#splitScreenTools").append(splitToolSelector);
                            $(".iTool:last").after(splitTool);
                        }
                        count++;
                    });
                    populateSpecialCharacters(activeProject.projectButtons);
                    populateXML(activeProject.xml);
                }
            });
            //get project buttons and special characters
            
            $('#transcriptionTemplate').show();
            $('#setTranscriptionObjectArea').hide();
            $(".instructions").hide();
            $(".hideme").hide();
    }
    
    /*
     * Load a canvas from the manifest to the transcription interface. 
     */
    function loadTranscriptionCanvas(canvasObj){
        var noLines = false;
        if(!canvasObj.images) canvasObj.images = [];
        $("#imgTop, #imgBottom").css("height", "200px");
        $("#imgTop img, #imgBottom img").css("height", "200px");
        $('.transcriptionImage').attr('src', "../images/loading.gif"); //background loader
        $('.lineColIndicator').remove();
        $(".transcriptlet").remove();
        var pageTitle = canvasObj.label;
        $("#trimPage").html(pageTitle);
        $("#trimPage").attr("title", pageTitle);
        $('#transcriptionTemplate').show();
        if(!canvasObj.resources){
            alert("Canvas "+canvasObj["@id"]+" does not contain any transcription lines.");
            noLines = true;
        }
        else{
           $.each(canvasObj.resources, function(){
                if (this.resource["@type"] === "dctypes:Image"){
                    canvasObj.images.push(this);
                }
            }); 
        }
        
        if(canvasObj.images[0].resource['@id'] !== undefined && canvasObj.images[0].resource['@id'] !== ""){ //Only one image
            $("#imgTop, #imgTop img, #imgBottom img, #transcriptionCanvas").css("height", "auto");
            $('.transcriptionImage').attr('src', canvasObj.images[0].resource['@id'].replace('amp;',''));
            $("#fullPageImg").attr("src", canvasObj.images[0].resource['@id'].replace('amp;',''));
            //Fix the bug of the images height not being set because the img load didnt happen quick enough.  Made a load callback that has worked thus far. 
            $("#imgTop img").one("load",function() {
                $("#imgBottom").css("height", "inherit");
                console.log("Top image height: "+ $(this).height());
                if(!noLines)drawLinesToCanvas(canvasObj);
                else{
                    $("#noLineWarning").show();
                    $('#transcriptionCanvas').css('height', $(this).height() + "px");
                    $('.lineColIndicatorArea').css('height', $(this).height() + "px");
                }
              });
        }
        else{
            //ERROR!  Malformed canvas object.  
        }
////        $('.transcriptionImage').error(function(){
////            $(this).attr('src', basePath+"/images/missingImage.png");
////        });
        $(".previewText").removeClass("currentPage");
        console.log("Lines To Add Current Page TO");
        console.log($(".previewPage:eq("+currentFolio+")").find(".previewLine"));
        $.each($("#previewDiv").children(".previewPage:eq("+(parseInt(currentFolio)-1)+")").find(".previewLine"),function(){
            $(this).find('.previewText').addClass("currentPage");
        });
        
    }
    
    /*
     * @paran canvasObj  A canvas object to extrac transcription lines from and draw to the interface. 
     */
    function drawLinesToCanvas(canvasObj){
        var image = $('#imgTop img');
        var lines = [];
        var letterIndex = 0;
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        letters = letters.split("");
        var theHeight = image.height();
        var theWidth = image.width();
        var ratio = theWidth / theHeight;
        var counter = 0;
        var colCounter = 0;
        var update = true;
        var thisContent = "";
        originalCanvasHeight = theHeight;
        console.log("Draw lines height: "+theHeight);
        $('#transcriptionCanvas').css('height', theHeight);
        $('.lineColIndicatorArea').css('height', theHeight);
        if(canvasObj.resources !== undefined && canvasObj.resources.length > 0){
            for(var i=1; i<canvasObj.resources.length; i++){
                if(isJSON(canvasObj.resources[i])){   // it is directly an annotation
                    lines.push(canvasObj.resources[i]);
                }
                else{ //this is an annotation list URI.  get them.
                    var url = canvasObj.resources[i];
                    $.ajax({
                        url: url,
                        type:"GET",
                        success: function(lineList){
                            lineList = JSON.parse(lineList);
                            $.each(lineList,function(){
                                lines.push(this);
                            });
                        }
                    });
                    
                }
                
            }
        }
        else{
            //ERROR! Malformed canvas object.  
            update = false;
        }
        //will run on an empty array if object is malformed. 
        for(var i=0; i<lines.length;i++){
            var line = lines[i];
            var lastLine = {};
            var col = letters[letterIndex];
            if(i>0)lastLine=lines[i-1];
            var lastLineX = 10000;
            var x,y,w,h = 0;
            var XYWHarray = [x,y,w,h];
            var lineURL = "";
            var lineID = -1;
            if(line.on !== undefined){
                lineURL = line.on;
            }
            else{
                //ERROR.  malformed line.
                update = false;
            }
            if(line["@id"] !== undefined && line['@id'].indexOf('line') >=0 ){
                lineID = line['@id'].slice(line['@id'].lastIndexOf('line/') + 5);
            }
            else{
                //ERROR.  Malformed line. 
                update = false;
            }
            thisContent = "";
            if(lineURL.indexOf('#') > -1){ //string must contain this to be valid
                var XYWHsubstring = lineURL.substring(lineURL.lastIndexOf('#' + 1)); //xywh = 'x,y,w,h'
                if(lastLine.on)lastLineX = lastLine.on.slice(lastLine.on.indexOf("#xywh=") + 6).split(",")[0];
                if(XYWHsubstring.indexOf('=') > -1){ //string must contain this to be valid
                    var numberArray = XYWHsubstring.substring(lineURL.lastIndexOf('xywh=') + 5).split(',');
                    if(numberArray.length === 4){ // string must have all 4 to be valid
                        x = numberArray[0];
                        if(lastLineX < x){
                            letterIndex++;
                            col = letters[letterIndex];
                            colCounter = 0; //Reset line counter so that when the column changes the line# restarts?
                        }
                        y = numberArray[1];
                        w = numberArray[2];
                        h = numberArray[3];
                        XYWHarray = [x,y,w,h];
                    }
                    else{
                        //ERROR! Malformed line
                        update = false;
                    }
                }
                else{
                    //ERROR! Malformed line
                    update = false;
                }
            }
            else{
                //ERROR!  Malformed line.
                update = false;
            }
            if(line.resource['cnt:chars'] !== undefined){
                thisContent = line.resource['cnt:chars'];
                var newAnno = $('<div id="transcriptlet_'+counter+'" col="'+col+'" colLineNum="'+colCounter+'" lineID="'+counter+'" lineServerID="'+lineID+'" class="transcriptlet" data-answer="' + thisContent + '"><textarea>'+thisContent+'</textarea></div>');
                var left = parseFloat(XYWHarray[0]) / (10 * ratio);
                var top = parseFloat(XYWHarray[1]) / 10;
                var width = parseFloat(XYWHarray[2]) / (10 * ratio);
                var height = parseFloat(XYWHarray[3]) / 10;
                newAnno.attr({
                    lineLeft: left,
                    lineTop: top,
                    lineWidth: width,
                    lineHeight: height,
                    counter: counter
                });
                counter += 1;
                colCounter+=1;
                $("#transcriptletArea").append(newAnno);
                
                var lineColumnIndicator = $("<div pair='"+col+""+colCounter+"' lineID='"+counter+"' class='lineColIndicator' style='left:"+left+"%; top:"+top+"%; width:"+width+"%; height:"+height+"%;'><div class\n\
                ='lineColOnLine' >"+col+""+colCounter+"</div></div>");
                var fullPageLineColumnIndicator = $("<div pair='"+col+""+colCounter+"' lineID='"+counter+"' class='lineColIndicator fullP'\n\
                onclick=\"updatePresentation($('#transcriptlet_"+(parseInt(counter)-1)+"'));\" style='left:"+left+"%; top:"+top+"%; width:"+width+"%; height:"+height+"%;'><div class\n\
                ='lineColOnLine' >"+col+""+colCounter+"</div></div>"); //TODO add click event to update presentation
                //Make sure the col/line pair sits vertically in the middle of the outlined line.  
                var lineHeight = theHeight * (height/100) + "px";
                lineColumnIndicator.find('.lineColOnLine').attr("style", "line-height:"+lineHeight+";");
                //Put to the DOM
                $(".lineColIndicatorArea").append(lineColumnIndicator);
                $("#fullPageSplitCanvas").append(fullPageLineColumnIndicator);
            }
            else{
                //ERROR! malformed line
            }
        }
        
        if(update){
            updatePresentation($('.transcriptlet').eq(0));
        }
    }
    
    function updatePresentation(transcriptlet) {
        var nextCol = transcriptlet.attr("col");
        var nextLineNum = parseInt(transcriptlet.attr("id").replace("transcriptlet_", ""))+1;
        var nextColLine = nextCol+nextLineNum;
        $("#currentColLine").html(nextColLine);
        if(nextLineNum > 1){
            var currentTranscriptletNum = nextLineNum - 1;
            var previousTranscriptletNum = currentTranscriptletNum - 1;
            var prevLine = $("#transcriptlet_"+previousTranscriptletNum);
            var prevLineCol = prevLine.attr("col");
            var prevLineText = prevLine.attr("data-answer");
            $("#prevColLine").html(prevLineCol+""+currentTranscriptletNum);
            if(prevLineText === ""){
                $("#captionsText").html("This line is not transcribed.");
            }
            else{
                $("#captionsText").html(prevLineText);
            }
            
        }
        else{ //there is no previous line
            $("#prevColLine").html("**");
            $("#captionsText").html("You are on the first line");
        }
        focusItem[0] = focusItem[1];
        focusItem[1] = transcriptlet;
        if ((focusItem[0] === null) || (focusItem[0].attr("id") !== focusItem[1].attr("id"))) {
          this.adjustImgs(this.setPositions());
          this.swapTranscriptlet();
//          this.updateCaptions();
          //show previous line transcription
          $('#captions').animate({
            opacity: 1
          }, 100);
        } 
        else {
          this.adjustImgs(this.setPositions());
          focusItem[1].prevAll(".transcriptlet").addClass("transcriptletBefore").removeClass("transcriptletAfter");
          focusItem[1].nextAll(".transcriptlet").addClass("transcriptletAfter").removeClass("transcriptletBefore");
          //this.maintainWorkspace();
        }
        //prevent textareas from going invisible and not moving out of the workspace
        focusItem[1].removeClass("transcriptletBefore transcriptletAfter");
        
    //        if(document.activeElement.id === "transcriptionPage"){
    //            // nothing is focused on somehow
    //            focusItem[1].find('.theText')[0].focus();
    //        }
      };
      
     function setPositions() {
    //Determine size of section above workspace
        var bottomImageHeight = $("#imgBottom img").height();
        if (focusItem[1].attr("lineHeight") !== null) {
          var pairForBookmarkCol = focusItem[1].attr('col');
          var pairForBookmarkLine = parseInt(focusItem[1].attr('lineid'))+1;
          var pairForBookmark = pairForBookmarkCol + pairForBookmarkLine;
          var currentLineHeight = parseFloat(focusItem[1].attr("lineHeight"));
          var currentLineTop = parseFloat(focusItem[1].attr("lineTop"));
          // top of column
          var previousLine = (focusItem[1].prev().is('.transcriptlet') && (currentLineTop > parseFloat(focusItem[1].prev().attr("lineTop")))) ? parseFloat(focusItem[1].prev().attr("lineHeight")) : parseFloat(focusItem[1].attr("lineTop"));
          // oversized for screen
          var imgTopHeight = (previousLine + currentLineHeight)+1.5; // obscure behind workspace.
          var topImgPositionPercent = ((previousLine - currentLineTop)*100)/imgTopHeight;
          var topImgPositionPx = (previousLine - currentLineTop)*bottomImageHeight/100;
//          console.log("WHY IS TOP OFF?  "+currentLineTop+" + "+imgTopHeight/100+" X "+topImgPositionPercent);
//          console.log(currentLineTop+" + "+(imgTopHeight/100)*topImgPositionPercent);
//          console.log(currentLineTop + ((imgTopHeight/100)*topImgPositionPercent));
//          var bookmarkTop = (currentLineTop + ((imgTopHeight/100)*topImgPositionPercent));
          var bottomImgPositionPercent = -(currentLineTop + currentLineHeight);
          var bottomImgPositionPx = -(currentLineTop+currentLineHeight)*bottomImageHeight / 100;
        }
        var positions = {
          imgTopHeight: imgTopHeight,
          topImgPositionPercent: topImgPositionPercent,
          topImgPositionPx : topImgPositionPx,
          bottomImgPositionPercent: bottomImgPositionPercent,
          bottomImgPositionPx: bottomImgPositionPx,
          activeLine: pairForBookmark
//          bookmarkTop: (parseFloat(locationForBookmark.css("top")) / $(".lineColIndicatorArea:first").height()) * 100 + "%",
//          bookmarkHeight: currentLineHeight
        };
        return positions;
  };
  
  /**
   * Removes previous textarea and slides in the new focus.
   *
   * @see updatePresentation()
   */
    function swapTranscriptlet() {
      //focusItem[0].addClass("transcriptletBefore").removeClass('noTransition');
      // slide in the new transcriptlet
      focusItem[1].css({"width": "auto", "z-index": "5"});
      focusItem[1].removeClass("transcriptletBefore transcriptletAfter");
      focusItem[1].prevAll(".transcriptlet").addClass("transcriptletBefore").removeClass("transcriptletAfter");
      focusItem[1].nextAll(".transcriptlet").addClass("transcriptletAfter").removeClass("transcriptletBefore");
      if($('.transcriptletAfter').length == 0){
          $('#nextTranscriptlet').hide();
      }
      else{
          $('#nextTranscriptlet').show();
      }
      if($('.transcriptletBefore').length == 0){
          $('#previousTranscriptlet').hide();
      }
      else{
           $('#previousTranscriptlet').show();
      }
    };
    
  /**
   * Aligns images and workspace using defined dimensions.
   *
   * @see maintainWorkspace()
   */
    function adjustImgs(positions) {
      //move background images above and below the workspace
         var lineToMakeActive = $(".lineColIndicator[pair='"+positions.activeLine+"']:first");
         var topImageHeight = $("#imgTop img").height();
          $("#imgTop").animate({
            "height": positions.imgTopHeight + "%"
          },250)
          .find("img").animate({
            top: positions.topImgPositionPx + "px",
            left: "0px"
          },250);
          console.log("Top line/col indicator");
         $("#imgTop .lineColIndicatorArea").animate({
            top: positions.topImgPositionPx + "px",
            left: "0px"
          },250);
//          positions.bookmarkLeft = $(focusItem[1]).attr('lineLeft');
//          positions.bookmarkWidth = $(focusItem[1]).attr('lineWidth');
//          $('#bookmark').animate({
//            left: positions.bookmarkLeft + "%",
//            top: positions.bookmarkTop,
//            height: positions.bookmarkHeight + "%",
//            width: positions.bookmarkWidth + "%"
//          },350);
          $("#imgBottom").find("img").animate({
            top: positions.bottomImgPositionPx  + "px",
            left: "0px"
          },250)
          $("#imgBottom .lineColIndicatorArea").animate({
            top: positions.bottomImgPositionPx  + "px",
            left: "0px"
          },250);
//            imgBottomOriginal = $("#imgBottom img").css("top");
//            imgTopOriginalTop = $("#imgTop img").css("top");
          if($('.activeLine').hasClass('linesHidden')){
              $('.activeLine').hide();
          }
          $(".lineColIndicator").removeClass('activeLine').css("box-shadow", "none");
          lineToMakeActive.addClass("activeLine");
          $('.activeLine').css('box-shadow', '0px 0px 15px 8px '+colorThisTime);
    }
    
    function saveTransLines(){
        $('.transcriptlet').each(function(){
            var currentLineServerID = $(this).attr('lineServerID');
            var currentLineText = $(this).find('textarea').val();
            var url = "http://localhost:8080/newberry/updateLine?text="+currentLineText+"&projectID="+projectID+"&line="+currentLineServerID;
            var updateRequest = new XMLHttpRequest();
            updateRequest.open("POST", url, true);
  //          updateRequest.setRequestHeader("Access-Control-Allow-Origin", "Access-Control-Allow_Origin:*");
            updateRequest.send();
        });
        
    }
  
    /*
     * The UI control for going the the next transcriptlet in the transcription. 
     */
    function nextTranscriptlet() {
          var nextID = parseInt(focusItem[1].attr('lineID')) + 1;
          var currentLineServerID = focusItem[1].attr("lineServerID");
          var currentLineText = focusItem[1].find('textarea').val(); //.val() does not work.
          
          var url = "http://localhost:8080/newberry/updateLine?text="+currentLineText+"&projectID="+projectID+"&line="+currentLineServerID;
          var updateRequest = new XMLHttpRequest();
          if($('#transcriptlet_'+nextID)){
            updateRequest.open("POST", url, true);
  //          updateRequest.setRequestHeader("Access-Control-Allow-Origin", "Access-Control-Allow_Origin:*");
            updateRequest.send();
            updatePresentation($('#transcriptlet_'+nextID));
          }
          else{ //blink a caption warning
              var captionText = $("#captionsText").html();
              $("#captionsText").html("You are on the last line! ");
              $('#captionsText').css("background-color", 'red');
              setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8'); }, 500);
              setTimeout(function(){ $('#captionsText').css("background-color", 'red'); }, 1000);
              setTimeout(function(){ $('#captionsText').css("background-color", '#E6E7E8');  $("#captionsText").html(captionText); }, 1500);
          }
    }
    
    /*
     * The UI control for going the the previous transcriptlet in the transcription. 
     */
    function previousTranscriptlet() {
          var prevID = parseFloat(focusItem[1].attr('lineID')) - 1;
          var currentLineServerID = focusItem[1].attr("lineServerID");
          var currentLineText = focusItem[1].find('textarea').val();
          var url = "http://localhost:8080/newberry/updateLine?text="+currentLineText+"&projectID="+projectID+"&line="+currentLineServerID;
          var updateRequest = new XMLHttpRequest();
          if(prevID >= 0){
            updateRequest.open("POST", url, true);
            updateRequest.send();
            updatePresentation($('#transcriptlet_'+prevID));
          }
    }
    
    function updateLine(line){
//        var lineid = line.parent(".transcriptlet").attr("data-lineid");
//        var previewText = (line.hasClass("theText")) ? ".previewText" : ".previewNotes";
        console.log("Update Line");
        console.log(line);
        var currentLineServerID = line.attr('lineServerID');
        var currentLineText = line.find('textarea').val();
        console.log("update line "+currentLineServerID+" with text "+currentLineText);
        var url = "http://localhost:8080/newberry/updateLine?text="+currentLineText+"&projectID="+projectID+"&line="+currentLineServerID;
        var updateRequest = new XMLHttpRequest();
        updateRequest.open("POST", url, true);
        updateRequest.send();
        //$(".previewLineNumber[data-lineid='"+currentLineServerID+"']").siblings(previewText).html(scrub(line.val()));
    }
    
    function scrub(thisText){
        var workingText = $("<div/>").text(thisText).html();
        var encodedText = [workingText];
        if (workingText.indexOf("&gt;")>-1){
            var open = workingText.indexOf("&lt;");
            var beginTags = new Array();
            var endTags = new Array();
            var i = 0;
            while (open > -1){
                beginTags[i] = open;
                var close = workingText.indexOf("&gt;",beginTags[i]);
                if (close > -1){
                    endTags[i] = (close+4);
                } else {
                    beginTags[0] = null;
                    break;}
                open = workingText.indexOf("&lt;",endTags[i]);
                i++;
            }
            //use endTags because it might be 1 shorter than beginTags
            var oeLen = endTags.length; 
            encodedText = [workingText.substring(0, beginTags[0])];
            for (i=0;i<oeLen;i++){
                encodedText.push("<span class='previewTag'>",
                    workingText.substring(beginTags[i], endTags[i]),
                    "</span>");
                if (i!=oeLen-1){
                    encodedText.push(workingText.substring(endTags[i], beginTags[i+1]));
            }
            }
        if(oeLen>0)encodedText.push(workingText.substring(endTags[oeLen-1]));
        }
        return encodedText.join("");
    }
  
    
    /** 
     * Restores interface after shift key is released.
     */
    function unShiftInterface(){
       // $("#entry,.workspaceHandle,#imgTop,#imgBottom").unbind("mousedown")
        //.css("cursor","");
//        $("#bookmark").resizable("option","disabled",true)
//        .find("ui-resizable-handle").hide();
        //$(document).mouseup();
    }
    /** 
     * Allows workspace to be moved up and down on the screen.
     * Requires shift key to be held down.
     */
     function moveWorkspace(evt){
        $("#imgTop,#imgBottom,#imgBottom img").addClass('noTransition');
        var startImgTop = $("#imgTop").height();
        var startImgBottom = $("#imgBottom img").position().top;
        var startImgBottomH = $("#imgBottom").height();
        var mousedownPosition = evt.pageY;
        evt.preventDefault();
        $(dragHelper).appendTo("body");
        $(document)
        .disableSelection()
        .mousemove(function(event){

            var imgBtmSpot = startImgBottom - (event.pageY - mousedownPosition);
            $("#imgTop").height(startImgTop + event.pageY - mousedownPosition);
            $("#imgBottom").css({
                "height": startImgBottomH - (event.pageY - mousedownPosition)
            }).find("img").css({
                "top"   : startImgBottom - (event.pageY - mousedownPosition)
            });
            $("#imgBottom .lineColIndicatorArea").css("top", startImgBottom - (event.pageY - mousedownPosition)+"px");
            $("#dragHelper").css({
                top :   event.pageY - 90,
                left:   event.pageX - 90
            });
//            if(!event.altKey) unShiftInterface();
        })
        .mouseup(function(){
            $("#dragHelper").remove();
            $("#imgTop,#imgBottom,#imgBottom img").removeClass('noTransition');
            $(document)
            .enableSelection()
            .unbind("mousemove");
            isUnadjusted = false;
        });
    };
    
     function startMoveImg(){
        $("#imgTop, #imgBottom").css("cursor", "url(http://localhost:8080/newberry/images/open_grab.png),auto");
        $("#imgTop,#imgBottom").mousedown(function(event){moveImg(event);});
    }
    
    /** 
     * Allows manuscript image to be moved around.
     * Requires shift key to be held down.
     * Synchronizes movement of top and bottom images.
     * Bookmark bounding box moves with top image.
     */
     function moveImg(event){
//        if($(event.target).hasClass("ui-resizable-handle")) return true; //user is trying to resize the bookmark
//        if($(event.target).attr('id')=="workspace" || $(event.target).parents("#transWorkspace").length > 0) return true; //user is trying to move the workspace or resize the bookmark
        var startImgPositionX = parseFloat($("#imgTop img").css("left"));
        var startImgPositionY = parseInt($("#imgTop img").css("top"));
        var startBottomImgPositionX = parseInt($("#imgBottom img").css("left"));
        var startBottomImgPositionY = parseInt($("#imgBottom img").css("top"));
//        var startBookmarkX = parseInt($("#bookmark").css("left"));
//        var startBookmarkY = parseInt($("#bookmark").css("top"));
        var mousedownPositionX = event.pageX;
        var mousedownPositionY = event.pageY;
        event.preventDefault();
//        $(dragHelper).appendTo("body");
        $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark").addClass('noTransition');
        $("#imgTop, #imgBottom").css("cursor", "url(http://localhost:8080/newberry/images/close_grab.png),auto" );
        $(document)
        .disableSelection()
        .mousemove(function(event){
            $("#imgTop img").css({
                top :   startImgPositionY + event.pageY - mousedownPositionY,
                left:   startImgPositionX + event.pageX - mousedownPositionX
            });
            $("#imgTop .lineColIndicatorArea").css({
                top :   startImgPositionY + event.pageY - mousedownPositionY,
                left:   startImgPositionX + event.pageX - mousedownPositionX
            });
            $("#imgBottom img").css({
                top :   startBottomImgPositionY + event.pageY - mousedownPositionY,
                left:   startBottomImgPositionX + event.pageX - mousedownPositionX
            });
             $("#imgBottom .lineColIndicatorArea").css({
                top :   startBottomImgPositionY + event.pageY - mousedownPositionY,
                left:   startBottomImgPositionX + event.pageX - mousedownPositionX
            });
//            $("#dragHelper").css({
//                top :   event.pageY - 90,
//                left:   event.pageX - 90
//            });
            //$("#previewBtn").html((startBookmarkX + event.pageX - mousedownPositionX)+","+(startBookmarkY + event.pageY - mousedownPositionY));//debug
//            $("#bookmark").css({
//                top :   startBookmarkY + event.pageY - mousedownPositionY,
//                left:   startBookmarkX + event.pageX - mousedownPositionX
//            });
            if(!event.altKey) unShiftInterface();
        })
        .mouseup(function(){
            $("#dragHelper").remove();
            $("#imgTop img,#imgBottom img,#imgTop .lineColIndicatorArea, #imgBottom .lineColIndicatorArea, #bookmark").removeClass('noTransition');
            if(!isMagnifying)$("#imgTop, #imgBottom").css("cursor", "url(http://localhost:8080/newberry/images/open_grab.png),auto");
            $(document)
            .enableSelection()
            .unbind("mousemove");
            isUnadjusted = false;
        });
    };
    
    function restoreWorkspace(){
            $("#imgBottom").show();
            $("#imgTop").show();
            $("#imgTop").removeClass("fixingParsing");
            $("#transWorkspace").show();
            $("#imgTop").css("width", "100%");
            $("#imgTop img").css({"height":"auto", "width":"100%"});
//            $("#imgTop .lineColIndicatorArea").css({"top":imgTopOriginalTop});
//            $("#imgBottom img").css("top",imgBottomOriginal);
//            $("#imgBottom .lineColIndicatorArea").css("top",imgBottomOriginal);
            updatePresentation(focusItem[1]);
            
//            $("#bookmark").css({
//                "top" : bookmarkInfo.top,
//                "left" : bookmarkInfo.left,
//                "width" :bookmarkInfo.width,
//                "height":bookmarkInfo.height
//            });
            
            $(".hideMe").show();
            $(".showMe").hide();
            //$("#pageJump").attr("onclick", "togglePageJump();")
            var pageJumpIcons = $("#pageJump").parent().find("i");
            pageJumpIcons[0].setAttribute('onclick', 'firstFolio();');
            pageJumpIcons[1].setAttribute('onclick', 'previousFolio();');
            pageJumpIcons[2].setAttribute('onclick', 'nextFolio();');
            pageJumpIcons[3].setAttribute('onclick', 'lastFolio();');
            $("#pageJump").siblings().css("color", "white");
            $("#pageJump").removeAttr("disabled");
        }
        
    
    
    function hideWorkspaceToSeeImage(){
//        imgBottomOriginal = $("#imgBottom img").css("top");
//        imgTopOriginalTop = $("#imgTop img").css("top");
        $("#transWorkspace").hide();
        $("#imgTop").hide();
        $("#imgBottom img").css({
            "top" :"0%",
            "left":"0%"
        });
        $("#imgBottom .lineColIndicatorArea").css({
            "top": "0%"
        });
        $(".hideMe").hide();
        $(".showMe").show();
    }
    
    function magnify(img, event){
//        $("#"+img).on("mousemove",function(event){
//For separating out different imgs on which to zoom.  Right now it is just the transcription canvas.
        if(img === "trans"){
            img = $("#transcriptionTemplate");
            $("#magnifyTools").fadeIn(800);
        }
        else if(img === "compare"){
            img= $("#compareSplit");
            $("#magnifyTools").fadeIn(800).css({
                "left":$("#compareSplit").css("left"),
                "top" : "100px"
            });
        }
        else if (img === "full"){
            img = $("#fullPageSplitCanvas");
             $("#magnifyTools").fadeIn(800).css({
                "left":$("#fullPageSplit").css("left"),
                "top" : "100px"
            });
        }
        $("#zoomDiv").show();
        hideWorkspaceToSeeImage();
        $(".lineColIndicatorArea").hide();
        liveTool = "image";
//        imgBottomOriginal = $("#imgBottom img").css("top");
//        imgTopOriginalTop = $("#imgTop img").css("top");
        mouseZoom(img,event);
//        });
    };
    /** 
     * Creates a zoom on the image beneath the mouse.
     *  
     * @param img jQuery img element to zoom on
     */
    function mouseZoom($img, event){
        isMagnifying = true;
        var page = $("#transcriptionTemplate");
        //var page = $(document);
        //collect information about the img
        var imgDims = new Array($img.offset().left,$img.offset().top,$img.width(),$img.height());
        //build the zoomed div
        var zoomSize = (page.height()/3 < 120) ? 120 : page.height()/3;
       
        var zoomPos = new Array(event.pageX, event.pageY );
        $("#zoomDiv").css({
            "box-shadow"    : "2px 2px 5px black,15px 15px "+zoomSize/3+"px rgba(230,255,255,.8) inset,-15px -15px "+zoomSize/3+"px rgba(0,0,15,.4) inset",
            "width"         : zoomSize,
            "height"        : zoomSize,
            "left"          : zoomPos[0] + 3,
            "top"           : zoomPos[1] + 3 - $(document).scrollTop() - $(".magnifyBtn").offset().top,
            "background-position" : "0px 0px",
            "background-size"     : imgDims[2] * zoomMultiplier+"px",
            "background-image"    : "url('"+$('#imgTop').find("img").attr("src")+"')"
        });
        //TODO add to current tool so clickthrough is not needed - change positioning to accomodate
        //.appendTo(toolDiv)
//        .show().on("click",function(event){
//            Interaction.clickThrough(event, $(this),$("#tools"));
//        });
        $(document).on({
                mousemove: function(event){
                  if (liveTool !== "image" && liveTool !== "compare") {
                    $(document).off("mousemove");
                    $("#zoomDiv").hide();
                  }
                var mouseAt = new Array(event.pageX,event.pageY);
                var zoomPos = new Array(mouseAt[0]-zoomSize/2,mouseAt[1]-zoomSize/2);
                var imgPos = new Array((imgDims[0]-mouseAt[0])*zoomMultiplier+zoomSize/2-3,(imgDims[1]-mouseAt[1])*zoomMultiplier+zoomSize/2-3); //3px border adjustment
                $("#zoomDiv").css({
                    "left"  : zoomPos[0],
                    "top"   : zoomPos[1] - $(document).scrollTop(),
                    "background-size"     : imgDims[2] * zoomMultiplier+"px",
                    "background-position" : imgPos[0]+"px " + imgPos[1]+"px",
                    "z-index"             : 2
                });
//                if ((mouseAt[0] < imgDims[0]) || (mouseAt[0] > imgDims[0] + imgDims[2]) || (mouseAt[1] < imgDims[1]) || (mouseAt[1] > imgDims[1] + imgDims[3])){
//                    $(document).unbind("mousemove");
//                    isMagnifying = false;
//                    $("#zoomDiv").fadeOut();
//                }
            }
          }, $img
        );
    };
    
    function removeTransition(){
        $("#imgTop img").css("-webkit-transition", "");
        $("#imgTop img").css("-moz-transition", "");
        $("#imgTop img").css("-o-transition", "");
        $("#imgTop img").css("transition", "");

        $("#imgBottom img").css("-webkit-transition", "");
        $("#imgBottom img").css("-moz-transition", "");
        $("#imgBottom img").css("-o-transition", "");
        $("#imgBottom img").css("transition", "");

        $("#imgTop").css("-webkit-transition", "");
        $("#imgTop").css("-moz-transition", "");
        $("#imgTop").css("-o-transition", "");
        $("#imgTop").css("transition", "");

        $("#imgBottom").css("-webkit-transition", "");
        $("#imgBottom").css("-moz-transition", "");
        $("#imgBottom").css("-o-transition", "");
        $("#imgBottom").css("transition", "");
    };
    
    function restoreTransition(){
        $("#imgTop img").css("-webkit-transition", "left .5s, top .5s, width .5s");
        $("#imgTop img").css("-moz-transition", "left .5s, top .5s, width .5s");
        $("#imgTop img").css("-o-transition", "left .5s, top .5s, width .5s");
        $("#imgTop img").css("transition", "left .5s, top .5s, width .5s");

        $("#imgBottom img").css("-webkit-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom img").css("-moz-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom img").css("-o-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom img").css("transition", "left .5s, top .5s, width .5s");

        $("#imgTop").css("-webkit-transition", "left .5s, top .5s, width .5s");
        $("#imgTop").css("-moz-transition", "left .5s, top .5s, width .5s");
        $("#imgTop").css("-o-transition", "left .5s, top .5s, width .5s");
        $("#imgTop").css("transition", "left .5s, top .5s, width .5s");

        $("#imgBottom").css("-webkit-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom").css("-moz-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom").css("-o-transition", "left .5s, top .5s, width .5s");
        $("#imgBottom").css("transition", "left .5s, top .5s, width .5s");
    };
    
        /** 
     * Sets screen for parsing tool use.
     * Slides the workspace down and scales the top img
     * to full height. From here, we need to load to interface
     * for the selected tool. 
     */
     function hideWorkspaceForParsing(){
//        imgBottomOriginal = $("#imgBottom img").css("top");
        imgTopOriginalHeight = $("#imgTop img").height()+"px";
//        imgTopOriginalTop = $("#imgTop img").css("top");
        originalCanvasHeight = $("#transcriptionCanvas").height();
        $("#pageJump").attr("disabled", "disabled");
        //$("#pageJump").siblings().removeAttr("onclick").css("color", "red");
//        bookmarkInfo = {"top": $("#bookmark").position().top, "left":$("#bookmark").position().left,
//            "height": $("#bookmark").height()+"px", "width":$("#bookmark").width+"px"};
        $("#imgTop").addClass("fixingParsing");
        var topImg = $("#imgTop img");
        imgRatio = topImg.width() / topImg.height();
        var wrapWidth = imgRatio*$("#transcriptionTemplate").height();
        var PAGEWIDTH = $("#transcriptionTemplate").width();
        
        if (wrapWidth > PAGEWIDTH-350)wrapWidth = PAGEWIDTH-350;
        $("#tools").children("[id$='Split']").hide();
        $("#parsingSplit").css({
            "display": "block",
            "height": window.innerHeight+"px"
        }).fadeIn();
        
        topImg.css({
                "top":"0px",
                "left":"0px",
                "height":"auto",
                "overflow":"auto"
        });
        $("#imgTop .lineColIndicatorArea").css({
            "top":"0px",
            "left":"0px"
        });
        
        $("#transcriptionTemplate").css("width", "64%");
        $("#transcriptionTemplate").resizable({
              disabled:false,
              minWidth: window.innerWidth / 2,
              maxWidth: window.innerWidth * .75,
              start: function(event, ui){
                  originalRatio = $("#transcriptionCanvas").width() / $("#transcriptionCanvas").height();
              },
              resize: function(event, ui) {
                  var width = ui.size.width;
                  var height = 1/originalRatio * width;

                  $("#transcriptionCanvas").css("height", height+"px").css("width", width+"px");
                  $(".lineColIndicatorArea").css("height", height+"px");
                  var splitWidth = window.innerWidth - (width+35) + "px";
                  $(".split img").css("max-width", splitWidth);
                  $(".split:visible").css("width", splitWidth);
                  //make sure image containers grow with image.
                  console.log("Full page split should have height "+$("#fullPageImg").height());
                  //$('#fullPageSplit').css('height', $("#fullPageImg").height() + 'px');
                  //$('#compareSplit').css('height', $("#compareSplit img").height() + 'px');
              },
              stop: function(event, ui){;
                  //$(".lineColIndicator .lineColOnLine").css("line-height", $(this).height()+"px");
              }
            });
        
        $("#transWorkspace,#imgBottom").hide();
        // Safari DEBUG to include min-height
            ResizeTopImg = window.setTimeout(function(){
                $("#imgTop, #imgTop img").height($(window).innerHeight()); 
                $("#imgTop img").css("width" , "auto");
                $("#imgTop").css("width" , $("#imgTop img").width());
                //At this point, transcription canvas is the original height and width of the full page image.  We can use that for when we resume transcription. 
               // $("#transcriptionCanvas").css("width" , $("#imgTop img").width()); //This causes the resize function to bust
                $("#transcriptionCanvas").css("height" , $(window).innerHeight());
                $(".lineColIndicatorArea").css("height", $(window).innerHeight());
                $("#transcriptionCanvas").css("display" , "block");
                $("#parsingSplit").css("top", "-"+($("#imgTop img").height()+30)+"px");
            },
            850);
            ParsingInterval = window.setTimeout(function(){
                //in here we can control what interface loads up.  writeLines draws lines onto the new full size transcription image.
                $('.lineColIndicatorArea').hide();
                writeLines($("#imgTop img"));
                //$("#imgTop").children(".line").addClass("parsing").removeClass("line");
                //$("#bookmark").css("left","-9999px");
                var firstLine = $(".parsing").filter(":first");
                //if ($.browser.opera) firstLine += 2;
                // Find the correct height for a well-displayed tool with a full-height image.
                var correctHeight = (topImg.height() > $("#transcriptionTemplate").height()) ? -999 : firstLine.attr("lineheight") * topImg.height() / 1000;
                //if ((Math.abs(firstLine.height() - correctHeight) > 2.5) || (topImg.height() > $("#transcriptionTemplate").height())) {
                    // assures that the resizing of the img completely took place
                    // FIXME may cause slow loop
                   // console.log("parsing adjustment ("+firstLine.height()+", "+correctHeight+")");
                    //hideWorkspaceForParsing(); 
                    window.clearInterval(ParsingInterval);
                //} 
//                else {
//                    //hack to make the image draw correctly in some cases
//                  topImg.css('top', 'auto');
//                  topImg.css('top', '0');
//                  console.log("image position confirmed");
//                  
//                }
            },1200);
    };
    
    /** 
     * Overlays divs for each parsed line onto img indicated.
     * Divs receive different classes in different 
     *  
     * @param imgToParse img element lines will be represented over
     */
    function writeLines(imgToParse){
        $(".line,.parsing,.adjustable,.parsingColumn").remove(); //clear and old lines to put in updated ones
        var originalX = (imgToParse.width()/imgToParse.height())*1000;
        var setOfLines = [];
        $(".transcriptlet").each(function(index){
            setOfLines[index] = makeOverlayDiv($(this),originalX);
        });
        imgToParse.parent().append($(setOfLines.join("")));
//        $(".parsing").attr('onmouseenter','applyRuler($(this));').attr('onmouseleave', 'removeRuler($(this))');
//        $(".parsing").attr('onclick', 'lineChange($(this), event);');
    }
    
    function makeOverlayDiv(thisLine,originalX){
        var Y = parseFloat(thisLine.attr("lineTop"));
        var X = parseFloat(thisLine.attr("lineLeft"));
        var H = parseFloat(thisLine.attr("lineHeight"));
        var W = parseFloat(thisLine.attr("lineWidth"));
//        var oH = ($.browser.opera) ?
//            [-1/$("#imgTop img").width(),2/$("#imgTop img").height()] : 
//            [0,0]; //opera hack
        var newY = (Y);
        var newX = (X);
        var newH = (H);
        var newW = (W);
        var lineOverlay = "<div class='parsing' style='\n\
        top:"+newY+"%; \n\
        left:"+newX+"%; \n\
        height:"+newH+"%; \n\
        width:"+newW+"%; \n\
        ' lineserverid='"+thisLine.attr('lineserverid')+"'\n\
        linetop='"+Y+"'\n\
        lineleft='"+X+"'\n\
        lineheight='"+H+"'\n\
        linewidth='"+W+"'>\n\
        </div>";
        return lineOverlay;
    }

    function fullPage(){
//        window.clearInterval(ParsingInterval);
//        window.clearInterval(WaitToFocus);
//        window.clearInterval(ResizeTopImg);
//        if ($(event.target).hasClass('ui-resizable-handle')) {
//            return false;
//        }
        if ($("#overlay").is(":visible")) {
            $("#overlay").click();
            return false;
        }
//        if ($(".parsing").size() === 0 && $(".transcriptlet").size() === 0) {
//            // no lines to transcribe
//            var cfrm = confirm("There are no longer any lines on this page. Click 'OK' to reload the page or 'Cancel' to parse manually.");
//            if (cfrm) {
//                window.location.reload();
//            } else {
//                $('#parsingBtn').click();
//            }
//        }
        $(".line, .parsing, .adjustable,.parsingColumn").remove();
        isUnadjusted = isFullscreen = true;
        //currentFocus = "transcription" + focusItem[1].attr('id').substring(1);
        if($("#trascriptionTemplate").hasClass("ui-resizable")){
            $("#transcriptionTemplate").resizable('destroy');
        }
        $("#splitScreenTools").removeAttr("disabled");
        $("#splitScreenTools").find('option:eq(0)').prop("selected",true);
        $("#transcriptionCanvas").css("width", "100%");
        $("#transcriptionCanvas").css("height", "auto");
        $("#transcriptionTemplate").css("width", "100%");
        $("#transcriptionTemplate").css("height", "auto");
        $("#transcriptionTemplate").css("display", "block");
        $('.lineColIndicatorArea').show();
        $("#fullScreenBtn").fadeOut(250);
        isZoomed = false;
        $(".split").hide();
        $(".split").css("width", "34%");
        console.log("RESTORE WORKSPACE");
        restoreWorkspace();
        $("#splitScreenTools").show();
        $("#transcriptionCanvas").css("height", originalCanvasHeight+"px");
        $(".lineColIndicatorArea").css("height", originalCanvasHeight+"px");
        
        
    }

    function splitPage(event, tool) {
        //TODO imgBottom img top needs to resize with the split (as well as the lineIndicatorArea
        console.log("SPLIT PAGWE!");
        liveTool = tool;
        originalCanvasHeight = $("#transcriptionCanvas").height();
//        imgBottomOriginal = $("#imgBottom img").css("top");
//        imgTopOriginalTop = $("#imgTop img").css("top");
        $("#splitScreenTools").attr("disabled", "disabled");
        $("#pageJump").attr("disabled", "disabled");
        var imgBottomRatio = parseFloat($("#imgBottom img").css("top")) / originalCanvasHeight;
        var imgTopRatio = parseFloat($("#imgTop img").css("top")) / originalCanvasHeight;
        //$(".splitTool").hide();
        //$(".imgTool").hide();
        //$(".magnifyTool").hide();
        $("#transcriptionTemplate").css({
           "width"   :   "65%",
           "display" : "inline-table"
        });
        $("#miradorInstance").css("height", window.innerHeight - $("#toolLinks").height());
        $(".layout-slot").css("width", "100%").css("height", "100%"); //Fix for mirador bug.
        var newCanvasHeight = $("#imgTop img").height();
        var newImgBtmTop = imgBottomRatio * newCanvasHeight;
        var newImgTopTop = imgTopRatio * newCanvasHeight;
        $("#transcriptionCanvas").css("height", newCanvasHeight+"px");
        $(".lineColIndicatorArea").css("height", newCanvasHeight+"px");
        console.log("New Position: " + imgBottomRatio + " X " +newCanvasHeight+" = "+ imgBottomRatio * newCanvasHeight);
        $("#imgBottom img").css("top", newImgBtmTop + "px");
        $("#imgBottom .lineColIndicatorArea").css("top", newImgBtmTop + "px");
        $("#imgTop img").css("top", newImgTopTop + "px");
        $("#imgTop .lineColIndicatorArea").css("top", newImgTopTop + "px");
        $.each($(".lineColOnLine"),function(){$(this).css("line-height", $(this).parent().height()+"px");});
        $("#transcriptionTemplate").resizable({
              disabled:false,
              minWidth: window.innerWidth / 2,
              maxWidth: window.innerWidth * .75,
              start: function(event, ui){
                  originalRatio = $("#transcriptionCanvas").width() / $("#transcriptionCanvas").height();
              },
              resize: function(event, ui) {
                  var width = ui.size.width;
                  var height = 1/originalRatio * width;
                  $("#transcriptionCanvas").css("height", height+"px").css("width", width+"px");
                  $(".lineColIndicatorArea").css("height", height+"px");
                  
                  var splitWidth = window.innerWidth - (width+35) + "px";
                  $(".split img").css("max-width", splitWidth);
                  $(".split:visible").css("width", splitWidth);
                   console.log("Full page split should have height "+$("#fullPageImg").height());
                  var newHeight1 = parseFloat($("#fullPageImg").height()) + parseFloat($("#fullPageSplit .toolLinks").height());
                  var newHeight2 = parseFloat($("#compareSplit img").height()) + parseFloat($("#compareSplit .toolLinks").height());
                  $('#fullPageSplit').css('height', newHeight1 + 'px');
                  $('#compareSplit').css('height', newHeight2 + 'px');
              },
              stop: function(event, ui){
                  $(".lineColIndicator .lineColOnLine").css("line-height", $(this).height()+"px");
              }
            });
        $("#fullScreenBtn").fadeIn(250);
        
        //event.preventDefault();
        //show/manipulate whichever split tool is activated.
        switch(tool){
          case "essay":
            $("#essaySplit").css("display", "block");
            break;
          case "abbreviations":
            $("#abbrevSplit").css("display", "inline-table");
            break;
          case "dictionary":
            $("#dictionarySplit").css("display", "block");
            break;
          case "latinVulgate":
            $("#latinVulgateSplit").css("display", "block");
            break;
          case "preview":
            $("#previewSplit").css("display", "block");
            break;
          case "history":
            $("#historySplit").css("display", "block");
            break;
          case "fullPage":
            console.log("FULL");
            $("#fullPageSplit").css({
              "display": "block",
              "height" : window.innerHeight+"px"
            });
//            $("#fullPageImg").css({
//                "max-height":window.innerHeight+"px",
//                "max-width":$("#fullPageSplit").width()+"px"
//            });
            break;
          case "compare":
            $("#compareSplit").css({
                "display": "block",
                "height": window.innerHeight+"px",
            });
//            $(".compareImage").css({
//                "max-height":window.innerHeight+"px",
//                "max-width":$("#compareSplit").width()+"px"
//            });
            populateCompareSplit(1);
            //$("#toolLinks").show();
            break;
          case "facing":
            //??
              $("#facingSplit").css("display", "block");
            break;
          default:
              //This is a user added iframe tool.  tool is toolID= attribute of the tool div to show.  
              $('div[toolName="'+tool+'"]').css("display", "inline-table");

        }
        $(".split:visible").find('img').css({
            'max-height': window.innherHeight + 350 +"px",
            'max-width' : $(".split:visible").width() + "px"
        });
       // $("#splitScreenTools").hide();
        //$("#transcriptionCanvas").css("width" , $("#imgTop img").width()); //this causes the resize function to bust. 
        //$("#transcriptionCanvas").css("height" , $("#imgTop img").height());
    }

    function populateCompareSplit(folioIndex){
        var canvasIndex = folioIndex - 1;
        var compareSrc = transcriptionFolios[canvasIndex].resources[0].resource["@id"];
        var currentCompareSrc = $(".compareImage").attr("src");
        if(currentCompareSrc !== compareSrc) $(".compareImage").attr("src", compareSrc);
    }
    /*
     * Go through all of the parsing lines and put them into columns;
     * @see linesToColumns()
     * Global Arrray: gatheredColumns
     * 
     */
    function gatherColumns(startIndex){
        var colX,colY,colW,colH;
        var lastColumnLine = -1;
        var linesInColumn = -1;
        var hasTranscription = false;
        if($(".parsing")[startIndex + 1]){
            var line = $(".parsing")[startIndex + 1];
            console.log("START");
            console.log(line);
            colX = parseFloat($(line).attr("lineleft"));
            colY = parseFloat($(line).attr("linetop"));
            colW = parseFloat($(line).attr("linewidth"));  
            var $lastLine = $(".parsing[lineleft='"+colX+"']:last");
            console.log("END");
            console.log($lastLine);
            colH = parseFloat($lastLine.attr("linetop"))-colY+parseFloat($lastLine.attr("lineheight"));
            //While testing, this has to be out because it does not add the transcriptlet to the area. 
//            $(".parsing[lineleft='"+colX+"']").each(function(){
//                if ($(".transcriptlet[lineserverid='"+$(this).attr('lineserverid')+"']").find("textarea").val().length > 0) {
//                    hasTranscription = true;
//                    return false; //break out of each() loop
//                }
//            });
            var lastLineIndex = $(".parsing").index($lastLine);
            console.log("PUSH TO GATHERED COLUMNS");
            gatheredColumns.push([colX,colY,colW,colH,$(line).attr("lineserverid"),$lastLine.attr("lineserverid"),true]);
            console.log("RECURSIVE!");
            gatherColumns(lastLineIndex);
        }
        
        
    }
    function removeColumn(column, destroy){
        if(!destroy){
            if(column.attr("hastranscription")==="true"){
                var cfrm = confirm("This column contains transcription data that will be lost.\n\nContinue?");
                if (!cfrm) return false;
            }
        }
        var colX = column.attr("lineleft");
        // collect lines from column
        var lines = $(".parsing[lineleft='"+colX+"']");
        lines.addClass("deletable");
        var linesSize = lines.size();
        // delete from the end, alerting for any deleted data
        for (var i=linesSize; i>0;i--){
            removeLine(lines[i], true);
        }
        column.remove();
     
    }
    function removeLine(e, columnDelete){
        /**
     * Removes clicked line, merges if possible with the following line.
     * updateLine(e,additionalParameters) handles the original, resized line.
     * 
     * @param e clicked line element from lineChange(e) via saveNewLine(e)
     * @see lineChange(e)
     * @see saveNewLine(e)
     */
        $("#imageTip").hide();
        var removedLine = $(e);
        if(columnDelete){
            removedLine.remove();
            //delete from back end
            return false;
        }
        else{
            if ($(e).attr("lineleft") == $(e).next(".parsing").attr("lineleft")) {
                removedLine = $(e).next();
                var removedLineHeight = removedLine.height();
                var currentLineHeight = $(e).height();
                var newLineHeight = removedLineHeight + currentLineHeight;
                
                var convertedNewLineHeight = newLineHeight / $("#imgTop").height() * 100;
                $(e).css({
                    "height" :  convertedNewLineHeight+"%",
                    "top" :     $(e).css("top")
                }).addClass("newDiv").attr({
                    "lineheight":   convertedNewLineHeight
                });
            } else if ($(e).hasClass("deletable") && $(".transcriptlet[data-lineid='"+$(e).attr("data-lineid")+"']").find("textarea").val().length > 0){
                var toDelete = $(".transcriptlet[data-lineid='"
                    + $(e).attr("data-lineid")+"']").find("textarea").val().substr(0,15)
                    + "\u2026";
                //var cfrm = confirm("Removing this line will remove any data contained as well.\n'"+toDelete+"'\n\nContinue?");
                //if(!cfrm)return false;
                isDestroyingLine = true;
            } 
            var params = new Array({name:"remove",value:removedLine.attr("data-lineid")});
            removedLine.remove(); 
            this.removeTranscriptlet(removedLine.attr("data-lineid"),$(e).attr("data-lineid"));
            return params;
        }
    
    }
    function destroyPage(){
        $.each($('.parsingColumn'),function(){
            removeColumn($(this), true);
        });
    }
    function linesToColumns(){
        //update lines in case of changes
        gatheredColumns = []; //The array built by gatherColumns()
        $(".parsingColumn").remove();
        if ($(".transcriptlet").size() == 0) return false;
        //writeLines($("#imgTop img"));
        //loop through lines to find column dimensions
        var columnParameters = new Array(); // x,y,w,h,startID,endID
        var i = 0;
        var colX,colY,colW,colH;
        var lastColumnLine = -1;
        var linesInColumn = -1;
        gatherColumns(-1); //Gets all columns into an array.
        //build columns
        var columns = [];
        for (j = 0;j<gatheredColumns.length;j++){
            var parseImg = document.getElementById("imgTop").getElementsByTagName("img");
//            var originalX = parseImg.width/parseImg.height*1000;
//            var scaledX = Page.convertPercent(columnParameters[j][0]/originalX,2);
//            var scaledY = Page.convertPercent(columnParameters[j][1]/1000,2);
//            var scaledW = Page.convertPercent(columnParameters[j][2]/originalX,2);
//            var scaledH = Page.convertPercent(columnParameters[j][3]/1000,2);
//            
            var scaledX = gatheredColumns[j][0];
            var scaledY = gatheredColumns[j][1];
            var scaledW = gatheredColumns[j][2];
            var scaledH = gatheredColumns[j][3];
//            // recognize, alert, and adjust to out of bounds columns
            if (scaledX+scaledW > 100){
                // exceeded the right boundary of the image
                if (scaledX > 98){
                    scaledX = 98;
                    scaledW = 2;
                } else {
                    scaledW = 100-scaledX-1;
                };
            }
            if (scaledX < 0){
                // exceeded the left boundary of the image
                scaledW += scaledX;
                scaledX = 0;
            }
            if (scaledY+scaledH > 100){
                // exceeded the bottom boundary of the image
                if (scaledY > 98){
                    scaledY = 98;
                    scaledH = 2;
                } else {
                    scaledH = 100-scaledY-1;
                };
            }
            if (scaledY < 0){
                // exceeded the top boundary of the image
                scaledH += scaledY;
                scaledY = 0;
            }
            columns.push("<div class='parsingColumn' lineleft='",gatheredColumns[j][0],"'",
            " linetop='",gatheredColumns[j][1],"'",
            " linewidth='",gatheredColumns[j][2],"'",
            " lineheight='",gatheredColumns[j][3],"'",
            " startID='",gatheredColumns[j][4],"'",
            " endID='",gatheredColumns[j][5],"'",
            " hastranscription=",gatheredColumns[j][6]==true,
            " style='top:",scaledY,"%;left:",scaledX,"%;width:",scaledW,"%;height:",scaledH,"%;'>",
            "</div>");
        }
        //attach columns
        $(parseImg).before(columns.join(""));
        // avoid events on .lines
        $('#imgTop').find('.parsing').css({
          //'pointer-events': 'none',
          'z-index': '-10'
        });
        
        $(".parsingColumn")
            .mouseenter(function(){
                console.log("mouse enter column");
                var lineInfo;
                lineInfo = $("#transcription"+($(this).index(".parsing")+1)).val();
                $("#lineInfo").empty().text(lineInfo).append("<div>" + $("#t"+($(this).index(".line")+1)).find(".counter").text() +"</div>").show();
                if (!isMagnifying){
                $(this).addClass("jumpLine");
                }
            })
            .mouseleave(function(){
                console.log("mouse leave coumn")
                $(".parsing").removeClass("jumpLine");
                $("#lineInfo").hide();
            })
            .click(function(event){
                //Screen.clickedLine(this,event);
            });
        }
    
    /**
     * Allows for column adjustment in the parsing interface.
     */
     function adjustColumn(event){
        // if(!isMember && !permitParsing)return false;
        //prep for column adjustment
        console.log("adjustColumn");
        //linesToColumns();
        var thisColumnID = new Array(2);
        var thisColumn;
        var originalX = 1;
        var originalY = 1;
        var originalW = 1;
        var originalH = 1;
        var adjustment = "";
//        $.each($(".parsingColumn"),function(){
//            if($(this).hasClass("ui-resizable")){
//                $(this).resizable("destroy");
//            }
//        })
        $(".parsingColumn").resizable({
            handles     : "n,s,w,e",
            containment : 'parent',
            start       : function(event,ui){
    //                    originalX = ui.originalPosition.left;
    //                    originalY = ui.originalPosition.top;
    //                    originalW = ui.originalSize.width;
    //                    originalH = ui.originalSize.height;
    //                    var newX = ui.position.left;
    //                    var newY = ui.position.top;
    //                    var newW = ui.size.width;
    //                    var newH = ui.size.height;
                $("#progress").html("Adjusting Columns - unsaved").fadeIn();
                $("#columnResizing").show();
                $("#sidebar").fadeIn();
                thisColumn = $(".ui-resizable-resizing");
                thisColumnID = [thisColumn.attr("startid"),thisColumn.attr("endid")];
                adjustment = "new";
            },
            resize      : function(event,ui){
                if(adjustment=="new"){
                    var originalX = ui.originalPosition.left;
                    var originalY = ui.originalPosition.top;
                    var originalW = ui.originalSize.width;
                    var originalH = ui.originalSize.height;
                    var newX = ui.position.left;
                    var newY = ui.position.top;
                    var newW = ui.size.width;
                    var newH = ui.size.height;
                    if (Math.abs(originalW-newW)>5) adjustment = "right";
                    if (Math.abs(originalH-newH)>5) adjustment = "bottom";
                    if (Math.abs(originalX-newX)>5) adjustment = "left";    // a left change would affect w and x, order matters
                    if (Math.abs(originalY-newY)>5) adjustment = "top";     // a top change would affect h and y, order matters
                    $("#progress").html("Adjusting "+adjustment+" - unsaved");
                    
                    
                }
            },
            stop        : function(event,ui){
                $("#progress").html("Column Resized - Saving...");
                console.log("adjustment: "+adjustment);
                var parseRatio = $("#imgTopImg").height()/1000;
                var originalX = ui.originalPosition.left;
                var originalY = ui.originalPosition.top;
                var originalW = ui.originalSize.width;
                var originalH = ui.originalSize.height;
                var newX = ui.position.left;
                var newY = ui.position.top;
                var newW = ui.size.width;
                var newH = ui.size.height;
                var oldHeight, oldTop, oldLeft, newWidth, newLeft;
                if (adjustment === "top") {
                    //save a new height for the top line;
                    var startLine = $(".parsing[data-lineid='"+thisColumnID[0]+"']");
                    console.log('updateLine(null, removeLine(startLine))');
                    console.log(startLine);
                    oldHeight = parseInt(startLine.attr("lineheight"));
                    oldTop = parseInt(startLine.attr("linetop"));

                    startLine.attr({
                        "linetop"    : Math.round(newY/parseRatio),
                        "lineheight" : Math.round(oldTop+oldHeight-newY/parseRatio)
                    });
                    if (parseInt(startLine.attr("lineheight"))<0){
                            // top of the column is below the bottom of its top line
                            var newTopLine = startLine;
                            do {
                                newTopLine = startLine.next('.line');
                                console.log("update this line");
                                console.log(startLine);
                                //Parsing.updateLine(null, Parsing.removeLine(startLine));
                                startLine = newTopLine;
                                oldHeight = parseInt(startLine.attr("lineheight"));
                                oldTop = parseInt(startLine.attr("linetop"));
                                startLine.attr({
                                    "linetop"    : Math.round(newY/parseRatio),
                                    "lineheight" : Math.round(oldTop+oldHeight-newY/parseRatio)
                                });
                            } while (startLine.attr("lineheight")<0);
                            //Linebreak.saveWholePage();
                        };
                    $(".transcriptlet[data-lineid='"+thisColumnID[0]+"']")
        //                            .addClass("isUnsaved")
                        .find(".lineTop").val(startLine.attr("linetop")).end()
                        .find(".lineHeight").val(startLine.attr("lineheight"));
                            //Parsing.updateLine(startLine);
                            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
                        } 
                        else if(adjustment=="bottom"){
                        
                        //save a new height for the bottom line
                        var endLine = $(".line[data-lineid='"+thisColumnID[1]+"']");
                        oldHeight = parseInt(endLine.attr("lineheight"));
                        oldTop = parseInt(endLine.attr("linetop"));
                        endLine.attr({
                            "lineheight" : Math.round((newH+originalY)/parseRatio-oldTop)
                        });
                        if (parseInt(endLine.attr("lineheight"))<0){
                            //the bottom line isnt large enough to account for the change, delete lines until we get to a  line that, wehn combined with the deleted lines
                            //can account for the requested change.
                            do {
                                oldHeight = parseInt(endLine.attr("lineheight"));
                                oldTop = parseInt(endLine.attr("linetop"));
                                var nextline = endLine.prev(".parsing");
                                //updateLine(null, Parsing.removeLine(endLine));                                
                                nextline.attr({
                                    "lineheight" : Math.round((newH+originalY)/parseRatio-oldTop)
                                });
                                endLine=nextline;
                            } while (endLine.attr("lineheight")<1);
                            //Linebreak.saveWholePage();
                        };
                        $(".transcriptlet[data-lineid='"+thisColumnID[1]+"']")
                            .find(".lineTop").val(endLine.attr("linetop")).end()
                            .find(".lineHeight").val(endLine.attr("lineheight"));
                            updateLine(endLine);
                            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
                    }
                    else if(adjustment=="left"){
                            //save a new left,width for all these lines
                            var leftGuide = $(".parsing[data-lineid='"+thisColumnID[0]+"']");
                            oldLeft = parseInt(leftGuide.attr("lineleft"));
                            newWidth = Math.round(newW/parseRatio);
                            newLeft = Math.round(newX/parseRatio);
                            $(".parsing[lineleft='"+oldLeft+"']").each(function(){
                                $(this).attr({
                                    "lineleft" : newLeft,
                                    "linewidth": newWidth
                                });
                                updateLine($(this));
                                $(".transcriptlet[data-lineid='"+$(this).attr("data-lineid")+"']")
                                    .find(".lineLeft").val($(this).attr("lineleft")).end()
                                    .find(".lineWidth").val($(this).attr("linewidth"));
                            });
                            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
                        } else if (adjustment=="right"){
                            //save a new width for all these lines
                            var rightGuide = $(".parsing[data-lineid='"+thisColumnID[0]+"']");
                            oldLeft = parseInt(rightGuide.attr("lineleft"));
                            newWidth = Math.round(newW/parseRatio);
                            $(".parsing[lineleft='"+oldLeft+"']").each(function(){
                                $(this).attr({
                                    "linewidth": newWidth
                                });
                                updateLine($(this));
                                $(".transcriptlet[data-lineid='"+$(this).attr("data-lineid")+"']")
                                    .find(".lineWidth").val($(this).attr("linewidth"));
                            });
                            $("#progress").html("Column Saved").delay(3000).fadeOut(1000);
                        } else {
                            $("#progress").html("No changes made.").delay(3000).fadeOut(1000);
                        }
                        $("#lineResizing").delay(3000).fadeOut(1000);
                        adjustment = "";
                    }
            });
     }
     
     /**
     * Determines action based on transcription line clicked and tool in use.
     * Alerts 'unknown click' if all fails. Calls lineChange(e,event) for 
     * parsing tool. Jumps to transcriptlet for full page tool.
     */
    function clickedLine(e,event) {
        if ($(e).hasClass("parsing")){
            if ($("#addLines").hasClass('ui-state-active')||$("#removeLines").hasClass('ui-state-active')){
                lineChange(e,event);
            }
        }
        else{
            $("#transcription"+($(e).index(".line")+1)).focus();
        }
    }
    
    function reparseColumns(){
        $.each($('.parsingColumn'),function(){
            var colX = $(this).attr("lineleft");
            // collect lines from column
            var lines = $(".parsing[lineleft='"+colX+"']");
            lines.addClass("deletable");
            var linesSize = lines.size();
            // delete from the end, alerting for any deleted data
            for (var i=linesSize; i>0;i--){
                removeLine(lines[i], true);
            }
        });
    }
     
      
   function insertTag(tagName,fullTag){
        if (tagName.lastIndexOf("/") == (tagName.length-1)) {
            //transform self-closing tags
            var slashIndex = tagName.length;
            fullTag = fullTag.slice(0,slashIndex)+fullTag.slice(slashIndex+1,-1)+" />";
        }
        // Check for wrapped tag
        if (!addchar(escape(fullTag),escape(tagName))) {
            closeTag(escape(tagName), escape(fullTag));
        }
        
    }
    
    function closeTag(tagName,fullTag){
            // Do not create for self-closing tags
            if (tagName.lastIndexOf("/") == (tagName.length-1)) return false;
            var tagLineID = focusItem[1].attr("data-lineid");
            var closeTag = document.createElement("div");
            var tagID;
            $.get("tagTracker",{
                addTag      : true,
                tag         : tagName,
                projectID   : projectID,
                //folio       : folio,
                line        : tagLineID
            }, function(data){
                tagID = data;
                $(closeTag).attr({
                    "class"     :   "tags ui-corner-all right ui-state-error",
                    "title"     :   unescape(fullTag),
                    "data-line" :   tagLineID,
                    //"data-folio":   folio,
                    "data-tagID":   tagID
                }).text("/"+tagName);
                focusItem[1].children(".xmlClosingTags").append(closeTag);
            });
        //orderTags()
        //FIXME: tags not in the right order, just the order they are added 
    }
    
    function addchar(theChar, closingTag)
    {
        var closeTag = (closingTag == undefined) ? "" : closingTag;
        var e = focusItem[1].find('textarea')[0];
        if(e!=null) {
            //Data.makeUnsaved();
            return this.setCursorPosition(e,this.insertAtCursor(e,theChar,closeTag));
        }
        return false;
    }
    
    function setCursorPosition(e, position)
    {
        var pos = position;
        var wrapped = false;
        if (pos.toString().indexOf("wrapped") == 0) {
            pos = parseInt(pos.substr(7));
            wrapped = true;
        }
        e.focus();
        if(e.setSelectionRange) {
            e.setSelectionRange(pos,pos);
        }
        else if (e.createTextRange) {
            e = e.createTextRange();
            e.collapse(true);
            e.moveEnd('character', pos);
            e.moveStart('character', pos);
            e.select();
        }
        return wrapped;
    }
    
    function insertAtCursor (myField, myValue, closingTag) {
        var closeTag = (closingTag == undefined) ? "" : unescape(closingTag);
        //IE support
        if (document.selection) {
            myField.focus();
            sel = document.selection.createRange();
            sel.text = unescape(myValue);
            //Preview.updateLine(myField);
            return sel+unescape(myValue).length;
        }
        //MOZILLA/NETSCAPE support
        else if (myField.selectionStart || myField.selectionStart == '0') {
            var startPos = myField.selectionStart;
            var endPos = myField.selectionEnd;
            if (startPos != endPos) {
                // something is selected, wrap it instead
                var toWrap = myField.value.substring(startPos,endPos);
                myField.value = myField.value.substring(0, startPos)
                    + unescape(myValue)
                    + toWrap
                    + "</" + closeTag +">"
                    + myField.value.substring(endPos, myField.value.length);
                myField.focus();
               // Preview.updateLine(myField);
                var insertLength = startPos + unescape(myValue).length +
                    toWrap.length + 3 + closeTag.length;
                return "wrapped" + insertLength;              
            } else {
                myField.value = myField.value.substring(0, startPos)
                    + unescape(myValue)
                    + myField.value.substring(startPos, myField.value.length);
                myField.focus();
                //Preview.updateLine(myField);
                return startPos+unescape(myValue).length;
            }
        } else {
            myField.value += unescape(myValue);
            myField.focus();
            //Preview.updateLine(myField);
            return myField.length;
        }
    }

function toggleCharacters(){
    if($("#charactersPopin .character:first").is(":visible")){
        $("#charactersPopin .character").fadeOut(400);
    }
    else{
       $("#charactersPopin .character").fadeIn(400).css("display", "block"); 
    }
}
function toggleTags(){
    if($("#xmlTagPopin .lookLikeButtons:first").is(":visible")){
        $("#xmlTagPopin .lookLikeButtons").fadeOut(400);
    }
    else{
       $("#xmlTagPopin .lookLikeButtons").fadeIn(400).css("display", "block"); 
    }

}
function togglePageJump(){
    if($("#pageJump .folioJump:first").is(":visible")){
        $("#pageJump .folioJump").fadeOut(400);
    }
    else{
       $("#pageJump .folioJump").fadeIn(400).css("display", "block"); 
    }
}
function pageJump(folio){
    var folioNum = parseInt($("#pageJump").find('option:selected').attr("folioNum")); //1,2,3...
    var canvasToJumpTo = folioNum - 1; //0,1,2...
    console.log(currentFolio, folioNum);
    console.log(canvasToJumpTo);
    if(currentFolio !== folioNum && canvasToJumpTo >= 0){ //make sure the default option was not selected and that we are not jumping to the current folio 
        //focusItem = [null, null];
        currentFolio = folioNum;
        //fullPage();// If we go from parsing it must go full page.  Disabled for now in the UI.  
        loadTranscriptionCanvas(transcriptionFolios[canvasToJumpTo]);
    }
    else{
        console.log("Loaded current or invalid page");
    }
}
function compareJump(folio){
    populateCompareSplit(folio);
}

function markerColors(){
    /*
     * This function allows the user to go through annotation colors and decide what color the outlined lines are.
     */
    
    var tempColorList = ["#99FF00", "#00FFCC", "#3300CC", "#CCFF00", "#000000", "#FFFFFF", "red"];
    if (colorList.length == 0){
        colorList = tempColorList;
    }
    colorThisTime = colorList[Math.floor(Math.random()*colorList.length)];
    colorList.splice(colorList.indexOf(colorThisTime),1);

    $('.lineColIndicator').css('border', '1px solid '+colorThisTime);
    $('.lineColOnLine').css({'border-left':'1px solid '+colorThisTime, 'color':colorThisTime});
    $('.activeLine').css('box-shadow', '0px 0px 15px 8px '+colorThisTime);
}
function toggleLineMarkers(){
    if($('.lineColIndicator:first').is(":visible") && $('.lineColIndicator:eq(1)').is(":visible")){ //see if a pair of lines are visible just in case you checked the active line first. 
        $('.lineColIndicator').hide();
        $(".activeLine").show().addClass("linesHidden");
    }
    else{
        $('.lineColIndicator').show();
        $(".lineColIndicator").removeClass("linesHidden");
    }
}   