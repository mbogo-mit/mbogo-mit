math.createUnit( {
  sr: '1 m^2/m^2',
  kat: '1 s^-1',
},
{
  override: true
});

math.createUnit('vector');
math.createUnit('undefinedunit');

math.import({
  myDotProduct: function (v1, v2) {
    //converting math js object to string
    v1 = v1.toString();
    v2 = v2.toString();
    //v1 = [1 unit, 1 unit, 1 unit], v2 = [1 unit, 1 unit, 1 unit]
    //format vector strings into arrays so we can multiply and add their components
    v1 = v1.substring(v1.indexOf("[") + 1,v1.indexOf("]"));//removing brackets from begining and end
    v1 = v1.split(",");//making v1 into an array
    v2 = v2.substring(v2.indexOf("[") + 1,v2.indexOf("]"));//removing brackets from begining and end
    v2 = v2.split(",");//making v2 into an array

    let expr = `(${v1[0]} * ${v2[0]} + ${v1[1]} * ${v2[1]} + ${v1[2]} * ${v2[2]}) / 1 vector^2`;
    return math.evaluate(expr);

  },
  myCrossProduct: function (v1, v2) {
    //converting math js object to string
    v1 = v1.toString();
    v2 = v2.toString();
    //v1 = [1 unit, 1 unit, 1 unit], v2 = [1 unit, 1 unit, 1 unit]
    //format vector strings into arrays so we can multiply and add their components
    v1 = v1.substring(v1.indexOf("[") + 1,v1.indexOf("]"));//removing brackets from begining and end
    v1 = v1.split(",");//making v1 into an array
    v2 = v2.substring(v2.indexOf("[") + 1,v2.indexOf("]"));//removing brackets from begining and end
    v2 = v2.split(",");//making v2 into an array
    //a x b = <a2 * b3 - a3 * b2, a3 * b1 - a1 * b3, a1 * b2 - a2 * b1>
    let expr = `[${v1[1]} * ${v2[2]} - ${v1[2]} * ${v2[1]}, ${v1[2]} * ${v2[0]} - ${v1[0]} * ${v2[2]}, ${v1[0]} * ${v2[1]} - ${v1[1]} * ${v2[0]}]/ 1 vector`;
    return math.evaluate(expr);

  }
});

function GetUnitsFromMathJsVectorString(mathjsVectorString){
  let unitsMathjs = mathjsVectorString.replace(/[\[\]]/g,"");//removing brackets
  unitsMathjs = unitsMathjs.split(",")[0].replace(/vector/g,"");
  return unitsMathjs
}

function IsSignleUndefinedVariable(ls){
  //the only way you can be a single undefined variable is if there is only one undefined variable in the string and there is only one variable in the string.
  let uvs = GetTrulyUndefinedVariables(ls);
  if(uvs.length == 1 && GetVariablesFromLatexString(ls).length == 1){
    //we need to check that this string doesn't have anything operators that would change the units of the undefined variable we are checking
    let str = uvs[0];//string that holds the latex string that represents the variable
    while(ls.indexOf(str) != -1){//this while loop removes the undefined variable from the string so we can parse the string for any unwanted operators
      let index = ls.indexOf(str);
      ls = ls.substring(0, index) + ls.substring(index + str.length);
    }
    //now i am going to remove everything that we would allow in the string and if there is stuff left over than the string has unwanted characters
    ls = ls.replace(/[\d\s\+\-\(\)\{\}]|(\\right)|(\\left)|(\\pm)/g, "");//removing white space, numbers, + or -,\pm,brackets, parentheses, \left and \right latex strings
    return ls.length == 0;//there should be nothing left if it is truly a single undefined variable
  }

  return false;
}

function CheckForErrorsInExpression(ls, lineNumber, mfID){
  ls = RemoveCommentsFromLatexString(ls);
  ls = PutBracketsAroundAllSubsSupsAndRemoveEmptySubsSups(ls);
  ls = SimplifyFunctionDefinitionToJustFunctionVariable(ls);//converts "f(x,y)=xy" to f=xy

  let expressions = ls.split(",");
  let exprs = [];
  expressions.map(function(value, i){
    let v = value.split("=");//getting all the latex string split by = sign
    let a = [];
    for(var c = 0; c < v.length; c++){
      //making an array that holds all the latex strings that are set to each other which will keep track if the string was parsed on not based on whether it had undefined variables in it
      a.push({
        parsed: false,
        str: v[c],
      });
    }
    exprs.push(a);
  });


  for(var i = 0; i < exprs.length; i++){
    for(var j = 0; j < exprs[i].length; j++){
      let trulyUndefinedVars = GetTrulyUndefinedVariables(exprs[i][j].str);
      if(trulyUndefinedVars.length == 0){//there must be 0 truly undefined variables for the string to be parsed

        let str = ReplaceVariablesWithMathjsUnits(exprs[i][j].str);
        str = CleanLatexString(str, ["fractions","addition","parentheses","brackets", "white-space"]);
        str = FindAndWrapVectorsThatAreBeingMultiplied(str);
        str = CleanLatexString(str,["multiplication"]);
        str = CleanLatexString(str,["latexFunctions"]);//this takes functions in latex and converts them to something mathjs can understand. for example converting \sqrt into sqrt so math js understands

        exprs[i][j].parsed = true;
        exprs[i][j].str = str;
      }
      else{
        exprs[i][j].isSingleUndefinedVariable = IsSignleUndefinedVariable(exprs[i][j].str);
        exprs[i][j].singleUndefinedVariable = (exprs[i][j].isSingleUndefinedVariable) ? trulyUndefinedVars[0] : "";
      }
    }
  }

  //console.log(exprs);


  let results = [];
  for(let i = 0; i < exprs.length; i++){
    results.push([]);
    for(let j = 0; j < exprs[i].length; j++){
      //we first have to check if the string we are evaluating has been parsed. If it hasn't then it has an undefined variables in it so it can't be parsed
      if(exprs[i][j].parsed){
        //now that we have parsed the latex string into a mathjs readable string we evaluate it and grab any errors
        //that math js throws and interprets them for the user
        let str = "";
        try {
          str = math.evaluate(exprs[i][j].str).toString();
          results[i].push({success: str});
        }
        catch(err){
          //if it throws an error then we can try evaluating the string but taking out radians and steradians because they are untiless pretty much but the editor see them as units
          try {
            str = math.evaluate(exprs[i][j].str.replace(/rad/g,"(m / m)").replace(/sr/g,"(m^2 / m^2)")).toString();
            results[i].push({success: str});
          }
          catch(err2){
            results[i].push({error: err2.message});
          }
        }

      }
      else{
        //if a string is not parsed it is because it has undefined variables in it.
        //however if it only has one undefined variable, then the user could be using the editor to define a variable interms of other variables
        if(exprs[i][j].isSingleUndefinedVariable){
          results[i].push({singleUndefinedVariable: exprs[i][j].singleUndefinedVariable});
        }
        else{
          results[i].push({undefinedVariables: exprs[i][j].str});
        }

      }


    }

  }

  //console.log(results);
  ParseResultsArrayAndGenerateLoggerList(results, lineNumber, mfID);

}

function ParseResultsArrayAndGenerateLoggerList(results, lineNumber, mfID){
  let log = {
    success: [],
    info: [],
    warning: [],
    error: [],
  };

  //keeps track of wheter we have recorded any new defined undefined variables because if we have then we need to parse previous lines that uses these newly defined variables
  let recordedDefinitionForUndefinedVariable = false;

  results.map(function(r, index){

    let successes = [];
    let singleUndefinedVariables = [];
    let errors = [];
    r.map(function(data, i){

      if(data.success != undefined){
        successes.push(data.success);
      }

      if(data.singleUndefinedVariable != undefined){
        singleUndefinedVariables.push(data.singleUndefinedVariable);
      }

      if(data.error != undefined){
        errors.push(data.error);
      }

    });

    let equationUnits = "";
    if(successes.length > 1){
      //check if units match for success equations
      let equationUnitsMatch = false;

      try {
        //trying to add the units of each equation and see if they add if they don't then they are not the same unit so an error will occur
        equationUnits = math.evaluate(successes.join(" + ")).toString();
        equationUnitsMatch = true;
      }
      catch(err){
        try{
          //removing rad and steradian from equations to see if they will equal each other because the editor can't recorgnize the arc formula  s=r\theta cuz units wise you are saying 1m=1m*rad
          let editedSuccesses = [];
          for(var i = 0; i < successes.length; i++){
            editedSuccesses.push(successes[i].replace(/rad/g,"(m / m)").replace(/sr/g,"(m^2 / m^2)"));
          }
          equationUnits = math.evaluate(editedSuccesses.join(" + ")).toString();
          equationUnitsMatch = true;
        }
        catch(err2){
          equationUnitsMatch = false;
        }

      }

      if(!equationUnitsMatch){
        log.error.push({
          error: EL.createLoggerErrorFromMathJsError("Units do not equal each other"),
          info: successes,
          lineNumber: lineNumber,
          mfID: mfID,
        });
      }

    }
    else{
      try {
        //trying to add the units of each equation and see if they add if they don't then they are not the same unit so an error will occur
        equationUnits = math.evaluate(successes[0]).toString();
      }
      catch(err){
        equationUnits = "";//couldn't get unit information from mathjs equation with all defined units
      }
    }


    if(equationUnits != ""){//that means that there is an equation or equations that have matched units that could help us defined our single undefined variables
      //if the equations match then we can use these equations to defined the single undefined variables that may exist
      for(var c = 0; c < singleUndefinedVariables.length; c++){
        //going through each single undefined variable and giving it units of the equations that they are set equal too
        EL.recordDefinitionForUndefinedVariable(singleUndefinedVariables[c], equationUnits);
        recordedDefinitionForUndefinedVariable = true;
      }


    }

    //so after possibly updating the list of defined undefined variables we need to see if there are any truly undefined variables and log them as a warning
    let trulyUndefinedVars = GetTrulyUndefinedVariables(MathFields[mfID].mf.latex());
    if(trulyUndefinedVars.length > 0){
      EL.addLog({warning: {
        warning: "Undefined Variables",
        variables: trulyUndefinedVars,
        lineNumber: lineNumber,
        mfID: mfID,
      }});
    }


    if(errors.length > 0){
      errors.map(function(error, index){
        log.error.push({
          error: EL.createLoggerErrorFromMathJsError(error),
          info: "",
          lineNumber: lineNumber,
          mfID: mfID,
        });
      });
    }


  });

  if(recordedDefinitionForUndefinedVariable){
    EL.ParsePreviousLinesAgainWithNewInfo(lineNumber);
  }

  EL.addLog(log);



}

function GetTrulyUndefinedVariables(ls){
  let undefinedVars = GetUndefinedVariables(ls);
  let definedUndefinedVariables = Object.keys(EL.undefinedVars.defined);
  let trulyUndefinedVars = [];
  for(var i = 0; i < undefinedVars.length; i++){
    if(!definedUndefinedVariables.includes(undefinedVars[i])){
      trulyUndefinedVars.push(undefinedVars[i]);//something is only truly undefined when the logger could it define it based on equations that the user wrote
    }
  }

  return trulyUndefinedVars;
}

function ReplaceVariablesWithMathjsUnits(ls){
  let vars = Object.keys(DefinedVariables).concat(Object.keys(PreDefinedVariables)).concat(Object.keys(EL.undefinedVars.defined)).concat(Object.keys(VectorMagnitudeVariables));
  //sorting them by length so the longer string are the ones that get tested first because the longer strings
  //may have pieces of shorter string in them so if we are trying to find the variable "a_{r}"", and we defined "a" and "a_{r}"
  //if "a" comes before "a_{r}" it will find instances of "a_{r}". But if "a_{r}" goes first than those variables will be already
  //taken care of before "a" can screw things up
  vars.sort(function(a,b){
  	if(a.length > b.length){
    	return -1;
    }
    else{
    	return 1;
    }
  });

  //now we have to go character by character and replace variables with their unitsMathjs string
  let i = 0;
  let delta = 0;
  let s = "";
  let newLs = "";
  let foundMatch = false;
  while(i < ls.length){
    foundMatch = false;
    s = ls.substring(i);
    //we need to identify what set of characters is at the index we are at

    //lets first check if its a Defined Variable
    for(var c = 0; c < vars.length; c++){
      if(s.indexOf(vars[c]) == 0){
        let variable = {};
        if(Object.keys(DefinedVariables).includes(vars[c])){
          variable = Object.assign({}, DefinedVariables[vars[c]]);
        }
        else if(Object.keys(PreDefinedVariables).includes(vars[c])){
          variable = Object.assign({}, PreDefinedVariables[vars[c]]);
        }
        else if(Object.keys(EL.undefinedVars.defined).includes(vars[c])){
          variable = Object.assign({}, EL.undefinedVars.defined[vars[c]]);
        }
        else if(Object.keys(VectorMagnitudeVariables).includes(vars[c])){
          variable = Object.assign({}, VectorMagnitudeVariables[vars[c]]);
        }

        //we need to check if this variable is a vector and if so then we have to format unitsMathjs variable differently
        let unitsMathjs = variable.unitsMathjs;
        if(variable.type == "vector"){
          unitsMathjs = `[(${unitsMathjs}) vector, (${unitsMathjs}) vector, (${unitsMathjs}) vector]`;//making math js representation of a vector
        }
        foundMatch = true;
        delta = vars[c].length;

        newLs += ` (${unitsMathjs}) `;

        break;
      }
    }

    if(!foundMatch && s[0] == "\\"){
      //it is possible that it is an operator or a greek letter
      for(var c = 0; c < ListOfOperators.length; c++){
        if(s.indexOf(ListOfOperators[c]) == 0){
          foundMatch = true;
          newLs += ListOfOperators[c];
          delta = ListOfOperators[c].length;
          break;
        }
      }

      if(!foundMatch){
        for(var c = 0; c < LatexGreekLetters.length; c++){
          if(s.indexOf(LatexGreekLetters[c]) == 0){
            foundMatch = true;
            newLs += LatexGreekLetters[c];
            delta = LatexGreekLetters[c].length;
            break;
          }
        }
      }

    }

    if(!foundMatch){
      delta = 1;
      newLs += s[0];//just pass the value directly to the new latex string
    }

    i += delta;

  }

  return newLs;

}

function CleanLatexString(ls, types){
  //so this function removes latex based formating like \frac
  if(types.includes('fractions')){
    ls = TakeOutFractionLatexFormatting(ls);//all \frac formatting is gone: \frac{...}{...} -> {...}/{...}
  }
  ls = ReplaceSpecialLatexCharacterWithBasicCharacterCounterpart(ls, types);

  return ls;
}

function ReplaceSpecialLatexCharacterWithBasicCharacterCounterpart(ls, types){
  if(types.includes("multiplication")){
    ls = ls.replace(/\\cdot/g,"*").replace(/\\times/g,"*").replace(/\\ast/g,"*");//replacing latex special operators with standard operators
  }
  if(types.includes("addition")){
    ls = ls.replace(/\\pm/g,"+");//replacing latex special operators with standard operators
  }
  if(types.includes("parentheses")){
    ls = ls.replace(/\\left\(/g,"(").replace(/\\right\)/g,")");//replacing latex parentheses with normal "(" and ")"
  }
  if(types.includes("brackets")){
    ls = ls.replace(/\{/g,"(").replace(/\}/g,")");//replacing brackets for parentheses
  }
  if(types.includes("white-space")){
    ls = ls.replace(/\\\s/g, '');//removing "\ " blackslash with space after
  }
  if(types.includes("latexFunctions")){
    //console.log("latexFunctions");
    let latexFunctionConversions = {//i have to put 4 backslashes because these strings are going into a regex statement so i have to escape the backslashes
      "\\\\sqrt": "sqrt",
      "\\\\sin": "sin",
      "\\\\int": "",
      "\\\\sum": "",
    };
    let r;
    for(const [key, value] of Object.entries(latexFunctionConversions)){
      r = new RegExp(key, 'g');
      ls = ls.replace(r, value);
    }
    //console.log(ls);
  }

  return ls;
}

function FindAndWrapVectorsThatAreBeingMultiplied(ls){
  while(ls.lastIndexOf('\\times') != -1 || ls.lastIndexOf("\\cdot") != -1){
    let crossProductIndex = ls.lastIndexOf('\\times');
    let dotProductIndex = ls.lastIndexOf("\\cdot");
    //the default is to do cross product first because when two vectors are crossed the resulting vector can still  be dotted  with another vector. But once two vectors are dotted, the resulting vector can't then be crossed with another vector
    let multiply = {
      index: (crossProductIndex != -1) ? crossProductIndex: dotProductIndex,
      type: (crossProductIndex != -1) ? "\\times": "\\cdot",
      func: (crossProductIndex != -1) ? "myCrossProduct": "myDotProduct",
     };

     //console.log(multiply);

    let v1StartIndex = FindFirstVectorStartIndex(ls, multiply.index);
    let v2EndIndex = FindSecondVectorEndIndex(ls, multiply.index + multiply.type.length + 1);//we want to start parsing everything after the multiplication operator

    //console.log(v1StartIndex, v2EndIndex);

    if(v1StartIndex != null && v2EndIndex != null){
      //this string removes the multiplication operator and wraps the vectors in a function and uses each vector as a parameter for the function
      ls = ls.substring(0,v1StartIndex) + (multiply.func) + "(" + ls.substring(v1StartIndex, multiply.index) + ", " + ls.substring(multiply.index + multiply.type.length + 1, v2EndIndex + 1) + ")" + ls.substring(v2EndIndex + 1);
    }
    else{
      //if it broke once then it will just keep breaking so we just got to end it
      return ls;
    }

  }

  return ls;
}

function FindFirstVectorStartIndex(ls, endIndex){
  let unwantedChars = ["=","(","+","-","\\times","\\cdot"];
  let i = endIndex;
  while(i > 0){
    if(ls[i] == ")"){
      //this parenthesis could hold a vector inside of it so we need to find the closing parenthesis and check if a vector is inside the range
      let closingParenthesis = FindIndexOfOpeningParenthesis(ls.substring(0,i));
      if(closingParenthesis != null){
        //we need to check if there is a vector inside these parentheses
        if(ThereIsAVectorInsideString(ls.substring(closingParenthesis, i + 1))){
          //there is one case where this parenthesis is the opening parenthesis for the function myDotProduct or myCrossProduct and if so we need to include those indexes so that we are wrapping the whole statement
          //checking if the parethesis belongs to the function myDotProduct
          if(closingParenthesis - "myDotProduct".length >= 0){
            if(ls.substring(closingParenthesis - "myDotProduct".length, closingParenthesis) == "myDotProduct"){
              return closingParenthesis - "myDotProduct".length;
            }
          }

          if(closingParenthesis - "myCrossProduct".length >= 0){
            if(ls.substring(closingParenthesis - "myCrossProduct".length, closingParenthesis) == "myCrossProduct"){
              return closingParenthesis - "myCrossProduct".length;
            }
          }

          //none of the special cases returned so we just return the index of the closingParenthesis
          return closingParenthesis;
        }
        i = closingParenthesis;//just skip over the indexes before that because all that stuff is in parentheses and will be dealt with using other functions
      }

    }
    else{
      //we need to check if out of all the characters we have parsed if any of them were unwanted chars
      for(var c = 0; c < unwantedChars.length; c++){
        let char = unwantedChars[c];
        //if this is not true then this can't be the unwanted character we are looking for because there is not enough characters before this character to even spell out the unwanted character
        if((i + 1) - char.length >= 0){
          if(ls.substring((i + 1) - char.length, i + 1) == char){
            //we found an unwanted character
            return null;
          }
        }
      }
    }

    i--;
  }

  return null;
}


function FindSecondVectorEndIndex(ls, startIndex){
  let unwantedChars = ["=",")","+","-","\\times","\\cdot"];
  let i = startIndex;
  while(i < ls.length){
    if(ls[i] == "("){
      //this parenthesis could hold a vector inside of it so we need to find the closing parenthesis and check if a vector is inside the range
      let closingParenthesis =  FindIndexOfClosingParenthesis(ls.substring(i + 1));
      if(closingParenthesis){
        closingParenthesis += (i + 1);//this correts for the shift that occurs from only using a substring in the FindIndexOfClosingParenthesis function
        //we need to check if there is a vector inside these parentheses
        if(ThereIsAVectorInsideString(ls.substring(i, closingParenthesis + 1))){
          return closingParenthesis;
        }
        i = closingParenthesis;//just skip over the indexes before that because all that stuff is in parentheses and will be dealt with using other functions
      }

    }
    else{
      //if we find any unwanted characters before finding the second vector then there is a formating error on the part of the user so we will just return null
      for(var c = 0; c < unwantedChars.length; c++){
        if(ls.substring(i).indexOf(unwantedChars[c]) == 0){
          return null;//we found an unwanted character when we were trying to find a vector to multiply
        }
      }
    }


    i++;
  }

  return null;
}

function FindIndexOfClosingParenthesis(ls){
  let unclosedBrackets = 1;
  let i = 0;
  while(unclosedBrackets > 0){
    if(i > ls.length){
      return null;
    }
    if(ls[i] == "("){
      unclosedBrackets += 1;
    }
    else if(ls[i] == ")"){
      unclosedBrackets -= 1;
    }

    if(unclosedBrackets > 0){
      i++;
    }

  }
  return i;
}

function FindIndexOfOpeningParenthesis(ls){
  let unclosedBrackets = 1;
  let i = ls.length - 1;
  while(unclosedBrackets > 0){
    if(i < 0){
      return null;
    }
    if(ls[i] == ")"){
      unclosedBrackets += 1;
    }
    else if(ls[i] == "("){
      unclosedBrackets -= 1;
    }

    if(unclosedBrackets > 0){
      i--;
    }

  }
  return i;
}

function ThereIsAVectorInsideString(str){
  //checking that it has brackets and commas
  return str.indexOf("([") != -1 && str.indexOf("])") != -1 && str.indexOf(",") != -1;
}

function SimplifyFunctionDefinitionToJustFunctionVariable(ls){
  //this function simplifies the string "f\left(x\right)=x" to "f = x" because the extra stuff was just the user being explicit what variables the "f" function uses
  let vars = Object.keys(DefinedVariables);
  for(let i = 0; i < vars.length; i++){
    let target = vars[i] + "\\left(";
    while(ls.indexOf(target) != -1){
      let index = ls.indexOf(target);
      let closingParenthesis = FindIndexOfClosingParenthesis(ls.substring(index + target.length));
      if(closingParenthesis != null){
        closingParenthesis += index + target.length;//accounts for the shift because we were only using a substring of the actaul string
        //we are going to remove everything inside the parenthesis and including the parenthesis
        ls = ls.substring(0, index + vars[i].length) + ls.substring(closingParenthesis + 1);
      }
    }
  }

  return ls;

}
