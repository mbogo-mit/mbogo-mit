/*

Success: unknown variable -> known,
Info: number of known and unknown variables and the number of equations you need to solve the problem and how many unique equations you have
Warning: tells you when you are using irrelevant equations, when variables with unknown units dont match on different lines, when simplifications could be done wrong
Error: dimensional analysis fails on a line

*/

function replaceLatexKeywordsWithSpace(latexString){
  let cmds = ["\\sqrt","\\frac"];
  for(var i = 0; i < cmds.length; i++){
    latexString = latexString.replace(cmds[i], new Array(cmds[i].length + 1).join(" "));
  }

  return latexString;

}

function SelectedStringPossibleVariable(str){
  //looking for any characters that is not a word or white space
  return str.search(/\+|\-|\*|\^|\\cdot/g) == -1;
}

function SelectedStringDefined(str){
  return str in DefinedVariables;
}

function RenderImportedVariablesTable(key){
  let headers = {
    mechanics: "Import Mechanics Variables Definitions",
    thermal: "Import Thermal Variables Definitions",
    waveOptics: "Import Wave Optics Variables Definitions",
    em: "Import Electricity & Magnetism Variables Definitions",
    modern: "Import Modern Physics Variables Definitions",
  }
  let vars = Object.assign({}, ImportVariableDefinitions[key]);
  //we are going to go through vars and add information to it so that we know if a checkbox should be check, unchecked, or disabled
  for(const [key, value] of Object.entries(vars)){
    vars[key].checked = false;//variable should be unchchecked until we can prove that the user has already imported it
    if(SimilarDefinedVariables[key] != undefined){
      if(SimilarDefinedVariables[key].rid == value.rid){//this means that the user has imported this variable so when they open up the import modal again the variable should already be checked
        vars[key].checked = true;
      }
      else{//this means that the user has imported a variable with the same ls but from a different section like modern physics or thermal so we must disable this option so that the definitions don't collide with each other
        vars[key].disabled = true;
      }
    }
  }

  //now we need to render the object, then inject the html into the modal
  let html = ejs.render(Templates["imported-variables-modal-content"], {header: headers[key], importedVariables: vars});
  $("#import-variable-definition-modal-content").html(html);
  //render the latex strings
  $("#modal_import_variable_definition .static-physics-equation").each(function(i){
    MQ.StaticMath($(this)[0]).latex($(this).attr("latex"));
  });
  //add event listeners for checkboxes
  $("#import-all-mechanics-variables").change(function(){
    $("#btn-update-imported-variables").removeClass("disabled");
    if($(this).prop("checked")){
      $(".variable-checkbox").prop("checked",true);
    }
    else{
      $(".variable-checkbox").prop("checked",false);
    }
  });

  $(".variable-checkbox").change(function(){
    $("#btn-update-imported-variables").removeClass("disabled");
  });
  //now open the modal
  $("#modal_import_variable_definition").modal("open");
}

function UpdateImportedVariables(){
  //we need to go through all the checkboxes and add the ones that are checked and remove the ones that are not checked
  $("#import-variable-definition-modal-content tbody .variable-checkbox").each(function(){
    let ls = $(this).attr("latex");
    if($(this).prop("checked")){
      let variableRid = $(this).attr("rid");
      let props = {};
      //getting the properties of this specific variable
      for(const [key, value] of Object.entries(ImportVariableDefinitions)){
        if(value[ls] != undefined){
          if(value[ls].rid == variableRid){
            props = {
              state: "unknown",
              type: (value[ls].vector) ? "vector" : "scalar",
              units: TrimUnitInputValue(CreateFullUnitsString(value[ls].quantity, ListOfSIUnits[value[ls].quantity].name, ListOfSIUnits[value[ls].quantity].symbol)),
              unitsMathjs: value[ls].unitsMathjs,
              quantity: value[ls].quantity,
              rid: value[ls].rid,
              canBeVector: value[ls].vector,
            };
            break;//we found the variable we are looking for and got all the information we need from it so we out
          }
        }
      }
      //then we update to import the variable in
      UpdateSimilarDefinedVariables({
        type: "update",
        ls: ls,
        props: props,
      });
      //if the variable is a vector we are also going to import its magnitude
      if(IsVariableLatexStringVector(ls)){
        props.type = "scalar"
        UpdateSimilarDefinedVariables({
          type: "update",
          ls: RemoveVectorLatexString(ls),//this takes a latex string \vec{a} and returns a
          props: props,
        });
      }
    }
    else{
      //if it is not checked we need to remove it
      UpdateSimilarDefinedVariables({
        type: "remove",
        ls: ls,
      });
      //if the variable is a vector we need to try to remove its magnitude as well
      if(IsVariableLatexStringVector(ls)){
        UpdateSimilarDefinedVariables({
          type: "remove",
          ls: RemoveVectorLatexString(ls),
        });
      }
    }
  });

  $("#modal_import_variable_definition").modal("close");

  //we need to run error logger again because we have updated the imported variables
  EL.GenerateEditorErrorMessages();
}


function UpdateSimilarDefinedVariables(opts){
  if(opts.type == "update"){
    SimilarDefinedVariables[opts.ls] = {
      state: opts.props.state,
      type: opts.props.type,
      units: opts.props.units,
      unitsMathjs: opts.props.unitsMathjs,
      quantity: opts.props.quantity,
      rid: opts.props.rid,
      canBeVector: opts.props.canBeVector
    };
  }
  else if(opts.type == "remove"){
    delete SimilarDefinedVariables[opts.ls];
  }
}

function RemoveVectorLatexString(ls){
  let startIndex = ls.indexOf("\\vec{") + "\\vec{".length;
  let i = FindIndexOfClosingBracket(ls.substring(startIndex));
  if(i != null){
    return ls.substring(startIndex, i + startIndex);
  }
  return null;
}

function RemoveBarAndOverlineFromLatexString(ls){
  let startIndex, i;
  while(ls.indexOf("\\bar{") != -1){
    startIndex = ls.indexOf("\\bar{") + "\\bar{".length;
    i = FindIndexOfClosingBracket(ls.substring(startIndex));
    if(i != null){
      ls = ls.substring(startIndex, i + startIndex);
    }
  }

  while(ls.indexOf("\\overline{") != -1){
    startIndex = ls.indexOf("\\overline{") + "\\overline{".length;
    i = FindIndexOfClosingBracket(ls.substring(startIndex));
    if(i != null){
      ls = ls.substring(startIndex, i + startIndex);
    }
  }

  return ls;
}

function UpdateVectorMagnitudeVariables(opts){
  if(opts.type == "update"){
    VectorMagnitudeVariables[RemoveVectorLatexString(opts.ls)] = {
      state: opts.props.state,
      type: "scalar",
      unitsMathjs: opts.props.unitsMathjs,
      rid: opts.props.rid,
      dynamicUnits: (opts.props.dynamicUnits) ? opts.props.dynamicUnits : false,
    };
  }
  else if(opts.type == "remove"){
    for (let [key, value] of Object.entries(VectorMagnitudeVariables)) {
      if(value.rid == opts.rid){
        delete VectorMagnitudeVariables[key];
        break;
      }
    }
  }
}

function RemoveAllDynamicUnitsVariablesFromVectorMagnitudeVariables(){
  for (let [key, value] of Object.entries(VectorMagnitudeVariables)) {
    if(value.dynamicUnits == true){
      delete VectorMagnitudeVariables[key];
    }
  }
}

function CheckIfVectorMagnitudeVariablesNeedsToBeUpdated(type = "", ls = "", rid = ""){
  if(IsVariableLatexStringVector(ls)){//we should only do something if the variable that we are working with is a vector
    if(type == "update"){
      UpdateVectorMagnitudeVariables({
        type: "update",
        ls: ls,
        props: Object.assign({}, DefinedVariables[ls]),
      });
    }
    else if(type == "remove"){
      UpdateVectorMagnitudeVariables({
        type: "remove",
        rid: rid,
      });
    }
  }
}


function UpdateSimilarVectorMagnitudeVariables(opts){
  SimilarVectorMagnitudeVariables[opts.ls] = {
    state: opts.props.state,
    unitsMathjs: opts.props.unitsMathjs,
  };
}

function UpdateDefinedVariables(opts){
  if(opts.type == "add" || opts.type == "update"){
    if(opts.editable){
      let rid = (DefinedVariables[opts.ls] == undefined) ? RID(): DefinedVariables[opts.ls].rid;
      DefinedVariables[opts.ls] = opts.props;
      DefinedVariables[opts.ls].rid = rid;
      DefinedVariables[opts.ls].autoGenerated = opts.autoGenerated || false;
      CheckIfVectorMagnitudeVariablesNeedsToBeUpdated("update",opts.ls);
    }
    else{
      PreDefinedVariables[opts.ls] = opts.props;
      PreDefinedVariables[opts.ls].rid = opts.rid;
    }
  }
  else if(opts.type == "remove"){
    if(opts.editable){
      for (let [key, value] of Object.entries(DefinedVariables)) {
        if(value.rid == opts.rid){
          delete DefinedVariables[key];
          CheckIfVectorMagnitudeVariablesNeedsToBeUpdated("remove", key, opts.rid);
          break;
        }
      }
    }
    else{
      for (let [key, value] of Object.entries(PreDefinedVariables)) {
        if(value.rid == opts.rid){
          delete PreDefinedVariables[key];
          break;
        }
      }
    }
  }

  if(opts.updateErrorMessages != false){
    //after editing we need to check if there are any new Editor errors
    EL.GenerateEditorErrorMessages();
  }

  //after editing the defined variables and or predfined variables we need to check what are the relevant equations for the defined variables
  CheckForAndDisplayRelevantEquations();
}

function IsVariableLatexStringVector(ls){
  return ls.indexOf("\\vec{") != -1 || ls.indexOf("\\hat{") != -1;
}

function GetFullUnitsStringFromUnitsMathJs(unitsMathjs){
  //this function takes a unitsMathjs variable and tries to find the SI Unit that matches it
  //if it can't find the unit it returns null
  unitsMathjs = (unitsMathjs.indexOf("vector") != -1) ? GetUnitsFromMathJsVectorString(unitsMathjs) : unitsMathjs;
  for(const [key, value] of Object.entries(ListOfSIUnits)){
    try{
      //if this line doesn't through an error than these two units are equal and we have found our match
      math.evaluate(`${value.unitsMathjs} + ${unitsMathjs}`);
      return {str: CreateFullUnitsString(key, value.name, value.symbol), custom: false, canBeVector: value.canBeVector};
    }
    catch(err){}
  }
  //if we couldn't identify the unit then we assume it is custom so we need to return the unit back to them but without any constants in front of it
  unitsMathjs = unitsMathjs.split(" ");
  unitsMathjs.splice(0,1);//removing constants infront of units string
  unitsMathjs = unitsMathjs.join(" ");
  return {str: unitsMathjs, custom: true, canBeVector: true};
}

function ToggleVariableState(rid){
  let foundVariable = false;

  for(const [key, value] of Object.entries(DefinedVariables)){
    if(value.rid == rid){
      let ls = key;
      let props = Object.assign({},value);
      //changing the state
      if(props.state == "known"){
        props.state = "unknown";
      }
      else{
        props.state = "known";
      }
      UpdateDefinedVariables({
        type: "update",
        ls: ls,
        editable: true,
        props: props,
      });
      break;
    }
  }

  if(!foundVariable){
    for(const [key, value] of Object.entries(EL.undefinedVars.undefined)){
      if(value.rid == rid){
        //changing the state
        foundVariable = true;
        EL.undefinedVars.undefined[key].state = (EL.undefinedVars.undefined[key].state == "known") ? "unknown" : "known";
        break;
      }
    }
  }

  if(!foundVariable){
    for(const [key, value] of Object.entries(EL.undefinedVars.defined)){
      if(value.rid == rid){
        //changing the state
        foundVariable = true;
        EL.undefinedVars.defined[key].state = (EL.undefinedVars.defined[key].state == "known") ? "unknown" : "known";
        break;
      }
    }
  }

  //then after we have edited either DefinedVariables or EL.undefinedVars.defined then we need to update the collection with the new information
  UpdateMyVariablesCollection({update: true});
}

function TrimUnitInputValue(str){
  let start = str.indexOf(":");
  let end = str.indexOf("(");
  if(start != -1 && end != -1){
    str = str.substring(0,start) + " " + str.substring(end);
  }

  return str;
}

function AddNewEditorLineToEnd(){
  MathFieldKeyPressEnter($("#math_field_editor_container .editor_line:last-child"));
}


function MathFieldKeyPressEnter(el){
  //create a new div element then initialize a math field in it
  let rid = RID();
  $(`
    <div class="editor_line row">
      <div class="line_label col m1">
        <span class="active line-number">1</span>
        <span onclick="OpenEditorLog('warning')" class="line-warning" mf="${rid}">
          <svg width="1em" height="1em" viewBox="0 0 16 16" class="amber-text text-lighten-2 bi bi-exclamation-triangle-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 5zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
          </svg>
        </span>
        <span onclick="OpenEditorLog('error')" class="line-error" mf="${rid}">
          <svg width="1em" height="1em" viewBox="0 0 16 16" class="red-text text-lighten-2 bi bi-bug-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M4.978.855a.5.5 0 1 0-.956.29l.41 1.352A4.985 4.985 0 0 0 3 6h10a4.985 4.985 0 0 0-1.432-3.503l.41-1.352a.5.5 0 1 0-.956-.29l-.291.956A4.978 4.978 0 0 0 8 1a4.979 4.979 0 0 0-2.731.811l-.29-.956zM13 6v1H8.5v8.975A5 5 0 0 0 13 11h.5a.5.5 0 0 1 .5.5v.5a.5.5 0 1 0 1 0v-.5a1.5 1.5 0 0 0-1.5-1.5H13V9h1.5a.5.5 0 0 0 0-1H13V7h.5A1.5 1.5 0 0 0 15 5.5V5a.5.5 0 0 0-1 0v.5a.5.5 0 0 1-.5.5H13zm-5.5 9.975V7H3V6h-.5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 0-1 0v.5A1.5 1.5 0 0 0 2.5 7H3v1H1.5a.5.5 0 0 0 0 1H3v1h-.5A1.5 1.5 0 0 0 1 11.5v.5a.5.5 0 1 0 1 0v-.5a.5.5 0 0 1 .5-.5H3a5 5 0 0 0 4.5 4.975z"/>
          </svg>
        </span>
        <span class="line-question" mf="${rid}"><i class="fas fa-question-circle"></i></span>
      </div>
      <div class="col m11 my_math_field_col">
        <div id="${rid}" class="my_math_field"></div>
      </div>
    </div>
    `).insertAfter(el);

  FocusedMathFieldId = rid;
  SetMathFieldsUI();

  //adding keypress event for the new mathfield element
  $(`#${rid}`).click(function(){
    FocusedMathFieldId = $(this).attr("id");
    SetMathFieldsUI();
  });

  AdjustLineLabelNumber();//make sure that the line is label with the correct number

  CreateNewMathField(rid);
}

function MoveCursor1Line(id, move = "down", direction = "right"){
  BlurMathFields();
  let nextLineId = undefined;
  if(move == "down"){
    nextLineId = $(`#${id}`).parents(".editor_line").next().find(".my_math_field").attr("id");

    if(nextLineId == undefined){//there is no line below so we must create one
      MathFieldKeyPressEnter($(`#${id}`).parents(".editor_line"));
    }
    else{
      FocusedMathFieldId = nextLineId;
      SetMathFieldsUI();
      MathFields[FocusedMathFieldId].mf.focus();
      if(direction == "right"){
        MathFields[FocusedMathFieldId].mf.moveToLeftEnd();
      }
      else{
        MathFields[FocusedMathFieldId].mf.moveToLeftEnd();
      }

    }

  }
  else if(move == "up"){
    nextLineId = $(`#${id}`).parents(".editor_line").prev().find(".my_math_field").attr("id");
    if(nextLineId != undefined){
      FocusedMathFieldId = nextLineId;
      SetMathFieldsUI();
      MathFields[FocusedMathFieldId].mf.focus();
      if(direction == "left"){
        MathFields[FocusedMathFieldId].mf.moveToRightEnd();
      }
      else{
        MathFields[FocusedMathFieldId].mf.moveToLeftEnd();
      }
    }
    else{
      MathFields[FocusedMathFieldId].mf.focus();
    }
  }

}

function UpdateLineLabelHeight(id){
  $(`#${id}`).parents(".editor_line").children(".line_label").css({
    height: $(`#${id}`).parent(".my_math_field_col").css("height")
  });
  RecalculateHeightOfLineEmptySpace();
}

function BlurMathFields(){
  for (let [key, value] of Object.entries(MathFields)) {
    value.mf.blur();
  }
}

function AdjustLineLabelNumber(){
  $(".editor_line").each(function(index){
    $(this).find(".line_label span.line-number").html(index + 1);
  });

  //whenever we are adjust the line number that means the number of lines have change so we need to recalculate the height of the empty space below the lines
  RecalculateHeightOfLineEmptySpace();
}

function RecalculateHeightOfLineEmptySpace(){
  $("#editor_empty_space_container").css("height",`${$("#math_field_editor_container").height() - $("#editor_lines_container").height() - 5}px`);
}

function CreateFullUnitsString(quantity, name, symbol){
  return `${quantity}: ${name} (${symbol})`;
}

function GenerateAutoCompleteData(){
  let data = {};
  let unitReference = {};
  UnitReference = {};
  for (let [key, value] of Object.entries(ListOfSIUnits)) {
    let k = CreateFullUnitsString(key, value.name, value.symbol);
    data[k] = null;
    value.quantity = key;
    unitReference[k] = value;
  }

  UnitReference = Object.assign({}, unitReference);

  return data;
}

function SetMathFieldsUI(){
  $(".line_label").removeClass('active');
  $(`#${FocusedMathFieldId}`).parents(".editor_line").children(".line_label").addClass("active");
  $(".my_math_field_col").removeClass("active");
  $(`#${FocusedMathFieldId}`).parent(".my_math_field_col").addClass("active");
}

function DeleteCurrentMathFieldAndCopyContentIntoPreviousMathField(id){
  //the id of the mathfield that needs to be focused because this one is getting deleted
  let newId = $(`#${id}`).parents(".editor_line").prev().find(".my_math_field").attr("id");
  if(newId != undefined){
    //setting new mathfield
    FocusedMathFieldId = newId;
    //copying latex string from the line that will be deleted
    let addedLs =  MathFields[id].mf.latex();
    let existingLs = MathFields[FocusedMathFieldId].mf.latex();
    //deleting mathfield
    delete MathFields[id];
    $(`#${id}`).parents(".editor_line").remove();

    EditingMathFields = true;
    MathFields[FocusedMathFieldId].mf.latex(addedLs);
    MathFields[FocusedMathFieldId].mf.moveToLeftEnd();
    EditingMathFields = false;
    MathFields[FocusedMathFieldId].mf.write(existingLs);
    MathFields[FocusedMathFieldId].mf.focus();
    SetMathFieldsUI();
    AdjustLineLabelNumber();

  }
}

function ToggleKeyboard(){
  console.log("Toggle Keyboard");
  if($("#toggle-dir").hasClass("fa-caret-down")){
    $("#toggle-dir").removeClass("fa-caret-down");
    $("#toggle-dir").addClass("fa-caret-up");
    $("#keyboard-container").css("bottom","-150px");
  }
  else{
    $("#toggle-dir").removeClass("fa-caret-up");
    $("#toggle-dir").addClass("fa-caret-down");
    $("#keyboard-container").css("bottom","0px");
  }
}

function RenderMessageUI(id){

  let elmnt = $(`#${id}`).parents(".editor_line");
  elmnt.find(".line_label span").removeClass('active');

  if(MathFields[id].message.question != null){
    elmnt.find(".line_label span.line-question").addClass('active');
  }
  else if(MathFields[id].message.warning != null){
    elmnt.find(".line_label span.line-warning").addClass('active');
  }
  else if(MathFields[id].message.error != null){
    elmnt.find(".line_label span.line-error").addClass('active');
  }
  else{
    elmnt.find(".line_label span.line-number").addClass('active');
  }
}

function GetUndefinedVariables(ls){
  ls = RemoveCommentsFromLatexString(ls);
  //first we need to get all the variables
  let vars = GetVariablesFromLatexString(ls);
  //console.log("........................vars");
  //console.log(vars);
  let definedVars = Object.keys(DefinedVariables).concat(Object.keys(PreDefinedVariables)).concat(Object.keys(VectorMagnitudeVariables));
  //console.log("........................definedVars");
  //console.log(definedVars);
  let undefinedVars = [];
  for(var i = 0; i < vars.length; i++){
    if(!definedVars.includes(vars[i])){
      undefinedVars.push(vars[i]);
    }
  }

  //so now we have this list of undefined variables but we need to check if we can automatically assign values to some of the variables using the SimilarDefinedVariables object
  //if we can then they are no longer undefined
  let newSetOfUndefinedVars = TryToAssignDefinitionsToUndefinedVariables(undefinedVars)

  return newSetOfUndefinedVars;

}

function TryToAssignDefinitionsToUndefinedVariables(undefinedVars){
  let keys = Object.keys(SimilarDefinedVariables);
  let newSetOfUndefinedVars = [];
  for(var i = 0; i < undefinedVars.length; i++){
    let ls = undefinedVars[i];

    let uv = ls.replace(/_\{[^\}\{\s]*\}/g,"");//removing underscores to make it more generic to see if it can match with any of the generic variables that are in SimilarDefinedVariables
    uv = RemoveBarAndOverlineFromLatexString(uv);
    let index = keys.indexOf(uv);
    if(index != -1){//we found a match
      //so now we will define this variable that was before seen as undefined by seeding with the information found in SimilarDefinedVariables object

      UpdateDefinedVariables({
        updateErrorMessages: false,
        type: "update",
        ls: ls,
        editable: true,
        props: Object.assign({},SimilarDefinedVariables[keys[index]]),//seeding it with base information about a variable for example F_{0} that was seen as a force so a similar variable F_{1} should also be seen as a force
        autoGenerated: true,
      });
      UpdateMyVariablesCollection({update: true});
    }
    else{
      //if we didn't find a match then we know for a fact that this variable is still undefined
      newSetOfUndefinedVars.push(ls);
    }
  }

  return newSetOfUndefinedVars;
}

function RemoveCommentsFromLatexString(ls){
  //we need to find the index of "\text{" in the string and find the closing bracket and remove everthing in between
  while(ls.indexOf("\\text{") != -1){
    let startIndex = ls.indexOf("\\text{");
    let i = startIndex;
    let foundClosingBracket = false;
    while(i < ls.length){
      if(ls[i] == "}"){
        //we need to check that it is not an escaped closing bracket meaning that it is just text and not a latex closing bracket
        if(ls[i - 1] != "\\"){
          foundClosingBracket = true;
          break;
        }
      }
      i++;
    }

    ls = ls.substring(0, startIndex) + ls.substring(i + 1);
  }

  return ls;
}

function PutBracketsAroundAllSubsSupsAndRemoveEmptySubsSups(ls){
  //puts brackets around all superscripts and subscripts if they don't have them already
  let i = 0;
  let foundIndicator = false;
  while(i < ls.length){
    if(foundIndicator){
      if(ls[i] != "{"){
        ls = ls.substring(0,i) + "{" + ls[i] + "}" + ls.substring(i+1);
      }
    }

    foundIndicator = (ls[i] == "_" || ls[i] == "^");

    i++;
  }

  ls = ls.replace(/_\{(\s|\\)*}/g,"");//remnoving all empty subscripts from latex string
  ls = ls.replace(/\^\{(\s|\\)*}/g,"");//remnoving all empty superscripts from latex string
  return ls;
}

function AddLineLabelHoverEvent(id){
  $(`.line_label [mf='${id}']`).hover(function(){
    OpenLineMessageBox(id);
  },function(){
    CloseLineMessageBox();
  });
}

function OpenLineMessageBox(id){

  //console.log("OpenLineMessageBox.................");
  $("#line-message-box-question, #line-message-box-warning, #line-message-box-error").removeClass("active");

  if(MathFields[id].message.question != null){
    $("#line-message-box-question").addClass('active');
  }
  else if(MathFields[id].message.warning != null){
    $("#line-message-box-warning").addClass('active');
    if(MathFields[id].message.warning.type == 1){
      MessageBoxMathFields.warning.m1.latex(MathFields[id].message.warning.vars.join(","));
    }
  }
  else if(MathFields[id].message.error != null){
    $("#line-message-box-error").addClass('active');
    if(MathFields[id].message.error.type == 1){
      $("#line-message-box-error").html("click to view error in log");
    }
  }

  //after setting up the message box we need to display it in the right place
  let r = $(`#${id}`).parents(".editor_line").find(".line_label")[0].getBoundingClientRect();
  $("#line-message-box").css({
    top: r.top + r.height + 10,
    left: 10
  });

  $("#line-message-box").css("display","block");

}

function CloseLineMessageBox(){
  $("#line-message-box").css("display","none");
}

function CheckIfPhysicsConstantCheckboxIsDisabled(el){
  //we need to check if variable is being used in the editor and if it is this can't be removed
  if(el.prev().attr("disabled") == "disabled"){
    M.toast({html: "This variable can't be removed because it is being used", displayLength: 3000});
  }
}

function TogglePhysicsConstant(el, index){
    let obj = Object.assign({}, ListOfPhysicsConstants[index]);
    if(el.prop("checked")){
      M.toast({html: `<span class='green-text text-lighten-4'>${obj.quantityDescription}</span> &nbsp; added to 'My Variables' Tab`, displayLength: 3000});
      UpdateMyVariablesCollection({ls: obj.symbol, rid: el.attr("rid"), add: true, pc: obj, editable: false});
      DisablePhysicsConstantCheckboxesThatAreBeingUsed();
    }
    else{
      M.toast({html: `<span class='red-text text-lighten-4'>${obj.quantityDescription}</span> 	&nbsp; removed from 'My Variables' Tab`, displayLength: 3000});
      UpdateMyVariablesCollection({ls: obj.symbol, rid: el.attr("rid"), remove: true, editable: false});
    }
}

function GetDefinedPhysicsConstants(){
  let vars = [];
  for(const [key, value] of Object.entries(PreDefinedVariables)){
    if(value.type == "physics constant"){
      vars.push(key);
    }
  }
  return vars;
}


function OrderCompileAndRenderMyVariablesCollection(){
  //ORDER
  //get all the variables we need
  let trulyUndefinedVars = Object.keys(EL.undefinedVars.undefined);
  let orderedTrulyUndefinedVars = [];
  let definedVars = GetDefinedPhysicsConstants().concat(Object.keys(DefinedVariables)).concat(Object.keys(EL.undefinedVars.defined));
  //we need to remove vector magniutdes from definedVars that appear in VectorMagnitudeVariables object because we don't need to display the magnitude of a vector if the vector is already going to be displayed in the variables collection
  definedVars = definedVars.filter(v => !Object.keys(VectorMagnitudeVariables).includes(v));
  let orderedDefinedVars = [];
  //now we have to order them by when they show up in the editor
  let orderedIds = OrderMathFieldIdsByLineNumber(Object.keys(MathFields));
  for(const [lineNumber, id] of Object.entries(orderedIds)){
    //before we do anything there are some edge case we need to take care of specifically \nabla^2 need to be formatted as \nabla \cdot \nabla
    let variables = GetVariablesFromLatexString(MathFields[id].mf.latex());
    for(var i = 0; i < variables.length; i++){
      let index = trulyUndefinedVars.indexOf(variables[i]);
      if(index != -1){
        orderedTrulyUndefinedVars.push(variables[i]);
        trulyUndefinedVars.splice(index,1);//remove it form array because we have accounted for it in the ordered list
      }
      else{
        index = definedVars.indexOf(variables[i]);
        if(index != -1){
          orderedDefinedVars.push(variables[i]);
          definedVars.splice(index,1);//remove it form array because we have accounted for it in the ordered list
        }
      }

    }
  }

  //if there is anything left in the unorded arrays then just append it to the ordered lists
  orderedTrulyUndefinedVars = orderedTrulyUndefinedVars.concat(trulyUndefinedVars);
  orderedDefinedVars = orderedDefinedVars.concat(definedVars);

  //COMPILE
  html = "";
  for(var i = 0; i < orderedTrulyUndefinedVars.length; i++){
    let opts = {
      ls: orderedTrulyUndefinedVars[i],
      variable: Object.assign({}, EL.undefinedVars.undefined[orderedTrulyUndefinedVars[i]]),
    }
    html += ejs.render(Templates["VariableCollection"]["undefined-variable"], {opts: opts});
  }

  for(var i = 0; i < orderedDefinedVars.length; i++){
    let opts = {
      ls: orderedDefinedVars[i],
    };

    if(Object.keys(DefinedVariables).includes(orderedDefinedVars[i])){
      opts.variable = Object.assign({}, DefinedVariables[orderedDefinedVars[i]]);
      html += ejs.render(Templates["VariableCollection"]["defined-variable"], {opts: opts});
    }
    else if(Object.keys(PreDefinedVariables).includes(orderedDefinedVars[i])){
      opts.variable = Object.assign({}, PreDefinedVariables[orderedDefinedVars[i]]);
      html += ejs.render(Templates["VariableCollection"]["physics-constant"], {opts: opts});
    }
    else if(Object.keys(EL.undefinedVars.defined).includes(orderedDefinedVars[i])){
      opts.variable = Object.assign({}, EL.undefinedVars.defined[orderedDefinedVars[i]]);
      html += ejs.render(Templates["VariableCollection"]["defined-variable"], {opts: opts});
    }

  }

  //RENDER
  $("#my_variables-collection-container .collection").html(html);//rendering new collection
  //Add event listeners and initialize static math fields
  $("#my_variables .collection span").each(function(){
    if($(this).attr("rid") != undefined && $(this).attr("latex") != undefined){
      MQ.StaticMath($(this)[0]).latex($(this).attr("latex"));
    }
  });

  //tooltipping everything that was just created and needs a tooltip
  $("#my_variables .tooltipped").tooltip();

  //updating hover event
  $("#my_variables .collection-item").unbind("mouseout mouseover");
  $("#my_variables .collection-item").hover(function(){
    $("#my_variables .collection-item").removeClass('active');
    $(this).addClass('active');
  },function(){
    $(this).removeClass('active');
  });
  //checking how many variables are defined and if there are none adding the no-variables-defined class to the collection
  //this helps with ui look and feel
  if($("#my_variables .collection-item").length == 0){
    $("#my_variables .collection").addClass("no-variables-defined");
  }
  else{
    $("#my_variables .collection").removeClass("no-variables-defined");
  }

}

function UpdateMyVariablesCollection(opts = {ls: "", rid: "", update: true, add: false, pc: {}, remove: false, editable: true}){

  if(opts.add){
    //adding variable to defined variables
    UpdateDefinedVariables({
      type: "add",
      ls: opts.pc.symbol,
      rid: opts.rid,
      editable: opts.editable,
      props: {
        state: "known",
        type: 'physics constant',
        unitString: opts.pc.unitString,
        unit: opts.pc.unit,
        value: opts.pc.value,
        unitsMathjs: opts.pc.unitsMathjs,
        quantity: opts.pc.quantity,
        quantityDescription: opts.pc.quantityDescription
      },
    });
  }
  else if(opts.remove){
    if(!opts.cantRemove){
      //before we remove this variable we need to check if it is being used in the editor
      if(!isVariableBeingUsedInEditor({rid: opts.rid, editable: opts.editable})){
        //if it is a physics constant unchecking the box
        if($(`.physics-constant-checkbox-span[rid='${opts.rid}']`).length > 0 && opts.uncheckbox){
          $(`.physics-constant-checkbox-span[rid='${opts.rid}']`).prev().prop("checked",false);
        }
        //removing variable from defined variables object
        UpdateDefinedVariables({
          type: "remove",
          rid: opts.rid,
          editable: opts.editable,
        });
      }
      else{
        //if it is being used then we just show a notitication that the variable can't be deleted
        M.toast({html: "This variable can't be removed because it is being used", displayLength: 3000});
      }
    }
    else{
      //if it is being used then we just show a notitication that the variable can't be deleted
      M.toast({html: "This variable can't be removed because it is being used", displayLength: 3000});
    }


  }

  //after the variables have been edited we need to rerender the my variables collection
  OrderCompileAndRenderMyVariablesCollection();

}

function isVariableBeingUsedInEditor(opts){
  let vars = (opts.editable) ? (Object.assign({}, DefinedVariables)) : (Object.assign({}, PreDefinedVariables));
  let latexString = undefined;
  for (const [key, value] of Object.entries(vars)) {
    if(value.rid == opts.rid){
      latexString = key;
    }
  }
  //if we couldn't find the variable in the DefinedVariables then it has to be in the EL.undefinedVars.defined object
  if(latexString == undefined){
    vars = Object.assign({}, EL.undefinedVars.defined);
    for (const [key, value] of Object.entries(vars)) {
      if(value.rid == opts.rid){
        latexString = key;
      }
    }
  }

  if(latexString != undefined){
    for (const [key, value] of Object.entries(MathFields)) {
      //getting all the variables in a specific mathfield and checking if any of them match the latexString we are looking for
      if(GetVariablesFromLatexString(value.mf.latex()).indexOf(latexString) != -1){
        return true;
      }
    }
  }

  return false;

}

function CopyPhysicsEquationToClipboard(el){
  CopyToClipboard(el.attr("latex"));
  M.toast({html: "Equation copied to clipboard", displayLength: 3000});
}

function CopyPhysicsConstantToClipboard(el){
  CopyToClipboard(el.attr("latex"));
  M.toast({html: "physics constant copied to clipboard", displayLength: 3000});
}

function CopyToClipboard(str) {
  //console.log(str);
  const el = document.createElement('textarea');
  el.value = str;
  //console.log(el.value);
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
};

function CloseEditorLog(){
  $("#editor-log-container").animate({
    right: -0.416 * window.innerWidth,
  },250);
}

function OpenEditorLog(type){
  $('#editor-log-container .collapsible.log-container').collapsible('close', 0);
  $('#editor-log-container .collapsible.log-container').collapsible('close', 1);
  $('#editor-log-container .collapsible.log-container').collapsible('close', 2);
  $('#editor-log-container .collapsible.log-container').collapsible('close', 3);
  $(".success-log, .info-log, .warning-log, .error-log").removeClass('active');
  switch(type) {
    case 'success':
      $('#editor-log-container .collapsible.log-container').collapsible('open', 0);
      break;
    case 'info':
      $('#editor-log-container .collapsible.log-container').collapsible('open', 1);
      break;
    case 'warning':
      $('#editor-log-container .collapsible.log-container').collapsible('open', 2);
      break;
    case 'error':
      $('#editor-log-container .collapsible.log-container').collapsible('open', 3);
      break;
    default:
      // code block
  }
  $("#editor-log-container").animate({
    right: 0,
  },250);
}

function GetLineNumberFromMathFieldId(mfId){
  return parseInt($(`#${mfId}`).parents(".editor_line").find(".line-number").html());
}

function CheckForAndDisplayRelevantEquations(){
  let usedQuantities = GetAllUsedQuantities();//an object that has the quanitity as the key and true if it is known or and false if it is unknown
  //this function goes through the dom of physics equations and checks the quanities they relate and sees if the equation is relevant for the defined quanities in the editor
  //an equation is relevant when there are no quanitites that the user is not using  and when it has one quantity that the user is using and has set as known.
  //additionally the user has to have the same number of each quantity or more for an equation to be relevant

  let sections = ["mechanics-equations","thermal-equations","waves-optics-equations","electricity-magnetism-equations","modern-physics-equations"];

  let totalNumberOfRelevantEquationsInSection = 0;

  sections.map(function(section,index){

    let numberOfRelevantEquationsInSection = 0;

    $(`#physics_equations .${section} .static-physics-equation.mq-math-mode`).each(function(){
      let quantities = JSON.parse($(this).attr("quantities"));
      let isRelevantEquation = false;
      for (const [key, value] of Object.entries(quantities)) {
        if(usedQuantities[key] != undefined){//checking if user has defined the quantity that this equation uses
          if(usedQuantities[key].number >= value){//the user has defined this variable at least the same number of times this equation needs or more
            if(usedQuantities[key].state == "known"){
              isRelevantEquation = true;
            }
          }
          else{
            isRelevantEquation = false;//the equation is not relevant because this equation needs a specific quantity a specific number of times and the user hasn't defined a quantity enough times
            break;
          }
        }
        else{
          isRelevantEquation = false;//the equation is not relevant because there is a quantity that this equation needs that the user hasn't defined
          break;
        }
      }

      if(isRelevantEquation){
        $(this).addClass("relevant-equation");
        numberOfRelevantEquationsInSection += 1;
      }
      else{
        $(this).removeClass("relevant-equation");
      }

    });

    totalNumberOfRelevantEquationsInSection += numberOfRelevantEquationsInSection;

    //updating the label that shows how many relevant equations are in a specific physics equation section
    $(`#physics_equations .${section} .relevant-equations-badge`).html(numberOfRelevantEquationsInSection);
    if(numberOfRelevantEquationsInSection > 0){//making the badge and count visibile if there are relevant equations in this section
      $(`#physics_equations .${section} .relevant-equations-badge`).addClass('active');
    }
    else{
      $(`#physics_equations .${section} .relevant-equations-badge`).removeClass('active');
    }

  });

  $("#relevant-physics-equations-total-count > span").html(totalNumberOfRelevantEquationsInSection);
  if(totalNumberOfRelevantEquationsInSection > 0){
    $("#relevant-physics-equations-total-count").addClass("active");
  }
  else{
    $("#relevant-physics-equations-total-count").removeClass("active");
  }

}

function GetAllUsedQuantities(){
  let usedQuantities = {};

  for (const [key, value] of Object.entries(PreDefinedVariables)) {
    if(value.quantity != undefined){
      if(usedQuantities[value.quantity] == undefined){
        usedQuantities[value.quantity] = {number: 1, state: value.state};
      }
      else{
        usedQuantities[value.quantity].number += 1;
      }
    }
  }

  for (const [key, value] of Object.entries(DefinedVariables)) {
    if(value.quantity != undefined){
      if(usedQuantities[value.quantity] == undefined){
        usedQuantities[value.quantity] = {number: 1, state: value.state};
      }
      else{
        usedQuantities[value.quantity].number += 1;
      }
    }
  }

  return usedQuantities;

}

function DisablePhysicsConstantCheckboxesThatAreBeingUsed(){
  //first we need to make sure that all check boxes are enabled
  $(".physics-constant-checkbox-span").prev().removeAttr("disabled");
  let physicsConstants = {};
  for (const [key, value] of Object.entries(PreDefinedVariables)) {
    if(value.type == "physics constant"){
      //pushing the latex string because this variable is a physics constant
      physicsConstants[key] = value.rid;
    }
  }

  //when some edits the editor we need to check if the auto generated variables are being used and if not we need to remove them
  for (const [key, obj] of Object.entries(MathFields)) {
    let physicsConstantsKeys = Object.keys(physicsConstants);
    if(physicsConstantsKeys.length > 0){//making sure there are physics constants to check
      let ls = obj.mf.latex();//getting the latex string from a specific mathfield
      let vars = GetVariablesFromLatexString(ls);

      for(let i = 0; i <  physicsConstantsKeys.length; i++){
        //loop through the physicsConstants check if the variable is included in the vars list.
        //if it is then we know this physicsConstant variable is being used so we remove it from the list of physicsConstants.
        if(vars.includes(physicsConstantsKeys[i])){
          $(`[rid='${physicsConstants[physicsConstantsKeys[i]]}']`).prev().attr("disabled","disabled");
          delete physicsConstants[physicsConstantsKeys[i]];//then we remove this physics constant because we have already disabled it
        }
      }
    }
  }

}


function CheckIfAutoGeneratedVariablesAreBeingUsed(){

  let autoGeneratedVars = [];
  for (const [key, value] of Object.entries(DefinedVariables)) {
    if(value.autoGenerated){
      //pushing the latex string because this variable is auto Generated
      autoGeneratedVars.push(key);
    }
  }

  //when some edits the editor we need to check if the auto generated variables are being used and if not we need to remove them
  for (const [key, obj] of Object.entries(MathFields)) {
    if(autoGeneratedVars.length > 0){
      let ls = obj.mf.latex();//getting the latex string from a specific mathfield
      let vars = GetVariablesFromLatexString(ls);

      for(let i = 0; i < autoGeneratedVars.length; i++){
        //loop through the autoGeneratedVars array and check if the variable is included in the vars list.
        //if it is then we know this autoGenerated variable is being used so we remove it from the list of autoGeneratedVars.
        if(vars.includes(autoGeneratedVars[i])){
          autoGeneratedVars.splice(i,1);
          i--;//to adjust for the shift in indexes after the splice
        }
      }
    }
  }

  //after we have looped through all of the mathfields and checked all the auotGenerated variables the autoGeneratedVars array will only have the unused auto Generated variables in it
  //so we take this list of keys that are latex string and will remove these variables
  for(let i = 0; i < autoGeneratedVars.length; i++){
    UpdateMyVariablesCollection({rid: DefinedVariables[autoGeneratedVars[i]].rid, remove: true, editable: true});
  }
}

function RemoveDifferentialOperatorDFromLatexString(ls){
  let acceptableStrings = ["\\vec"].concat("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("")).concat(LatexGreekLetters);
  let newLs = "";
  let i = 0;
  let str = "";
  let delta = 1;
  let skipCharacter = false;
  while(i < ls.length){
    delta = 1;
    skipCharacter = false;
    str = ls.substring(i);
    if(str[0] == "d" && str.length > 1){//checking that the "d" we are looking at is not the last character in the string if it is we must assume that it is not a differntial operator
      for(let c = 0; c < acceptableStrings.length; c++){
        if(str.indexOf(acceptableStrings[c]) == 1){//this means that the acceptable character comes right after "d" and uses "d" as a differntial operator for example the equation: dxdydz=dv, where x,y,z,v all use "d" as an operator
          skipCharacter = true;//we want to skip this character
          delta = 1;
          break;//once we find a character that works we don't have to continue to parse through the rest of the array
        }
      }

    }
    else if(str.indexOf("\\Delta ") == 0 && str.length > "\\Delta ".length){//checking that the "d" we are looking at is not the last character in the string if it is we must assume that it is not a differntial operator
      for(let c = 0; c < acceptableStrings.length; c++){
        if(str.substring("\\Delta ".length).indexOf(acceptableStrings[c]) == 0){//this means that the acceptable character comes right after "d" and uses "d" as a differntial operator for example the equation: dxdydz=dv, where x,y,z,v all use "d" as an operator
          skipCharacter = true;//we want to skip this character
          delta = "\\Delta ".length;
          break;//once we find a character that works we don't have to continue to parse through the rest of the array
        }
      }

    }
    else if(str.indexOf("\\Delta") == 0 && str.length > "\\Delta".length){//we check for \Delta again without a space because in latex when a latex string comes after another one there is no need for a space. the space is only for no latex strings
      for(let c = 0; c < acceptableStrings.length; c++){
        if(str.substring("\\Delta".length).indexOf(acceptableStrings[c]) == 0){//this means that the acceptable character comes right after "d" and uses "d" as a differntial operator for example the equation: dxdydz=dv, where x,y,z,v all use "d" as an operator
          skipCharacter = true;//we want to skip this character
          delta = "\\Delta".length;
          break;//once we find a character that works we don't have to continue to parse through the rest of the array
        }
      }
    }
    else if(str.indexOf("_{") == 0 || str.indexOf("^{") == 0){
      //we don't parse any information in a sup or sub because those wouldnt have any actual operations happening inside them so we just record everything inside these ranges and move on
      delta = FindIndexOfClosingBracket(str.substring(2)) + 3;//adding 2 this value would get us to the index of the closing bracket and then adding one more would get us to the next character we want to parse
    }
    else if(str.indexOf("\\") == 0){
      let a = ListOfOperators.concat(LatexGreekLetters);//this is a list of special latex strings that we should not parse and just add to newLs
      for(let i = 0; i < a.length; i++){
        if(str.indexOf(a[i]) == 0){//if we find a match then change delta and stop parsing through the array
          delta = a[i].length;
          break;
        }
      }
    }

    if(!skipCharacter){
      newLs += ls.substring(i, i + delta);//recording information into newLs
    }

    i += delta;
  }
  return newLs;
}

function FormatNablaSquared(ls){
  //we need to replace all instances of \nabla^2 with \nabla \cdot \nabla for our editor to know what we mean
  return ls.replace(/nabla\^2/g,"\\nabla\\cdot\\nabla ");

}

function OrderMathFieldIdsByLineNumber(ids){
  let orderedIds = {};
  for(var i = 0; i < ids.length; i++){
    orderedIds[GetLineNumberFromMathFieldId(ids[i])] = ids[i];
  }

  return orderedIds;
}

function DefineVariableUnits(el, rid){
  if(!UnitsDropdownMenuOpen){//if the menu is not open then open it
    //expanding unit badge
    ToggleVariableBadgeUnitsSize(el, rid, true);
    //displaying dropdown search menu
    DisplayUnitDropdownSearchMenu(el, rid);
  }

}

function ToggleVariableBadgeUnitsSize(el = null, rid = "", expand = false){
  if(expand){
    //we need to calculate how large to expand it
    let w = el.parent(".collection-item").width() - $(`.static-physics-equation[rid='${rid}']`).width() - 185;
    el.css("width",`${w}px`);
  }
  else{
    $("#my_variables-collection-container .badge.units").css("width","auto");
  }
}

function DisplayUnitDropdownSearchMenu(el, rid){
  let r = el[0].getBoundingClientRect();
  if(r.top < window.innerHeight / 2){
    $("#units-dropdown-menu").css({top: r.top + r.height + 10, left: r.left, width: r.width, display: "block"});
  }
  else{
    $("#units-dropdown-menu").css({top: r.top - ($("#units-dropdown-menu").height() + 10), left: r.left, width: r.width, display: "block"});
  }

  //setting value so that the menu knowns what to update once the user has chosen the unit they want
  $("#units-search-results").attr("rid",rid);

  RenderSIUnitsSearch();//start a search to bring up all the variables

  //this line of code is needed because we need a slight delay so that the dropdown is not immediately closed by MainScreenClicked() function
  setTimeout(function(){UnitsDropdownMenuOpen = true;}, 500);

}

function RenderSIUnitsSearch(){
  //everytime you search you should disable the updated button because no si unit is selected
  $("#btn-update-variable-units").addClass("disabled");
  let search = $("#input-user-units-search").val();
  results = [];
  for(const [key, value] of Object.entries(UnitReference)){
    if(key.search(search) != -1){
      results.push(key);
    }
  }
  let html = ejs.render(Templates["units-search-results"], {results: results});
  $("#units-search-results").html(html);
}

function CloseUnitDropdownSearchMenu(){
  UnitsDropdownMenuOpen = false;
  $("#units-dropdown-menu").css({display: "none", top: -1000});
  $("#input-user-units-search").val("");
  $("#units-search-results").html("");
  $("#btn-update-variable-units").removeAttr("rid");
  $("#btn-update-variable-units").addClass("disabled");
  ToggleVariableBadgeUnitsSize();
}

function UpdateVariableUnits(el){

    let rid = $("#units-search-results").attr("rid");
    let fullUnitsString = el.attr("fullUnitssString");

    let foundVariable = false;
    let ls = "";
    let props = {};

    for(const [key, value] of Object.entries(DefinedVariables)){
      if(value.rid == rid){
        foundVariable = true;
        ls = key;
        props.type = value.type;
        props.state = value.state;
        break;
      }
    }

    if(!foundVariable){
      for(const [key, value] of Object.entries(EL.undefinedVars.undefined)){
        if(value.rid == rid){
          foundVariable = true;
          ls = key;
          props.type = value.type;
          props.state = value.state;
          break;
        }
      }
    }

    if(!foundVariable){
      for(const [key, value] of Object.entries(EL.undefinedVars.defined)){
        if(value.rid == rid){
          foundVariable = true;
          ls = key;
          props.type = value.type;
          props.state = value.state;
          break;
        }
      }
    }

    props.fullUnitsString = fullUnitsString;
    props.units = TrimUnitInputValue(fullUnitsString);
    props.unitsMathjs = UnitReference[fullUnitsString].unitsMathjs;
    props.quantity = UnitReference[fullUnitsString].quantity;
    props.canBeVector = UnitReference[fullUnitsString].canBeVector;

    UpdateDefinedVariables({
      type: "update",
      ls: ls,
      editable: true,
      props: props,
    });

    CloseUnitDropdownSearchMenu();

    //then after we have edited either DefinedVariables or EL.undefinedVars.defined then we need to update the collection with the new information
    UpdateMyVariablesCollection({update: true});

}

function MainScreenClicked(e){
  if(UnitsDropdownMenuOpen){
    if($("#units-dropdown-menu").find(e.target).length == 0){
      CloseUnitDropdownSearchMenu();
    };
  }
}
