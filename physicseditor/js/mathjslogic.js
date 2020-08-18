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
    if(math.typeOf(v1) == "Matrix" && math.typeOf(v2) == "Matrix"){
      if(v1._data.length == v2._data.length){//vector have to be the same size to dot product
        let i = 0;
        let expr = [];
        while(i < v1._data.length){
          expr.push(`${v1._data[i]} * ${v2._data[i]}`);
          i++;
        }
        expr = expr.join(" + ");
        return math.evaluate(`(${expr}) / 1 vector ^ 2`);
      }
    }
    else{
      return math.evaluate(`${v1.toString()} * ${v2.toString()}`);
    }
  },
  myCrossProduct: function (v1, v2) {
    return math.evaluate(math.cross(v1 , v2).toString() + "/ 1 vector");
  },
  absoluteValue: function(v){
    if(v == undefined){
      return "";
    }
    //we need to check that this is a vector before we square root the dot product of it self
    if(v._data == undefined){//a high level check to check if v is a vector based on looking at what vectors returned when they are evaluated
      v = v.toString();
      return math.evaluate(`sqrt((${v})(${v}))`);
    }
    v = v.toString();
    return math.evaluate(`sqrt(myDotProduct(${v},${v}))`);
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


function IdentifyAllKnownVariablesAndTheirValues(exprs){
  for(var i = 0; i < exprs.length; i++){
    let exprsCopy;
    if(exprs[i].length >= 2){//if there aren't at least two expressions set equal to each other there is no way that a variable that was previously unknown could be equal to all known variables
      exprsCopy = JSON.parse(JSON.stringify(exprs[i]));//copying exprs data to be used later and information added
      for(var j = 0; j < exprsCopy.length; j++){
        let vars = GetVariablesFromLatexString(exprsCopy[j].rawStr);
        let unknownVars = [];
        let variableValues = {
          unknown: {},//this holds an object of all the variables in this expression with unknown values
          known: {},//this holds an object of all the variables in this expression with known values
        };
        vars.map(function(v){
          if(DefinedVariables[v] != undefined){
            //trying to figure out if this variable is unknown
            if(DefinedVariables[v].state != "given" && DefinedVariables[v].currentState != "known"){
              unknownVars.push(v);
            }
            //trying to figure out if this variables values is undefined or defined
            if(DefinedVariables[v].value != undefined){
              variableValues.known[v] = DefinedVariables[v].value;
            }
            else{
              variableValues.unknown[v] = undefined;
            }
          }
          else if(PreDefinedVariables[v] != undefined){
            //because this is a predefined variable we known that it is known so all we want to do is pass its value as a into the set of known values for this expression
            //trying to figure out if this variables values is undefined or defined
            if(PreDefinedVariables[v].value != undefined){
              variableValues.known[v] = PreDefinedVariables[v].value;
            }
            else{
              variableValues.unknown[v] = undefined;
            }
          }
          else if(EL.undefinedVars.undefined[v] != undefined){
            //trying to figure out if this variable is unknown
            if(EL.undefinedVars.undefined[v].state != "given" && EL.undefinedVars.undefined[v].currentState != "known"){
              unknownVars.push(v);
            }
            //trying to figure out if this variables values is undefined or defined
            if(EL.undefinedVars.undefined[v].value != undefined){
              variableValues.known[v] = EL.undefinedVars.undefined[v].value;
            }
            else{
              variableValues.unknown[v] = undefined;
            }
          }
          else if(EL.undefinedVars.defined[v] != undefined){
            //trying to figure out if this variable is unknown
            if(EL.undefinedVars.defined[v].state != "given" && EL.undefinedVars.defined[v].currentState != "known"){
              unknownVars.push(v);
            }
            //trying to figure out if this variables values is undefined or defined
            if(EL.undefinedVars.defined[v].value != undefined){
              variableValues.known[v] = EL.undefinedVars.defined[v].value;
            }
            else{
              variableValues.unknown[v] = undefined;
            }
          }
        });

        exprsCopy[j].unknownVars = unknownVars;
        exprsCopy[j].variableValues = variableValues;

      }

      //now that we have gathered the necessary information to check if a unknown variable can become known and to check if a now known variable could have its actual value calculated we need to actaully do these checks and calculations
      let index = 0;
      while(index < exprsCopy.length){
        //first we need to see if the expression are related using an equal sign '=' if not there is no way we could say this value is known and therefore actauly calcualte this "known value"
        if(exprsCopy[index].operator == "="){
          if(exprsCopy[index].unknownVars.length + exprsCopy[index + 1].unknownVars.length == 1){//this means that out of these two expression one is completely known and the other only has one unknown variable which we can say is known because it is apart of an equation where it is the only unknown
            let uniqueRIDStringArray = GenerateUniqueRIDStringForVariables(`${exprsCopy[index].rawStr} + ${exprsCopy[index + 1].rawStr}`);
            let unknownVariable;
            if(exprsCopy[index].unknownVars.length == 0){//if this current expression is completely known then the unknown variable is in the other expression
              unknownVariable = exprsCopy[index + 1].unknownVars[0];
            }
            else{
              unknownVariable = exprsCopy[index].unknownVars[0];
            }
            //we are now going to try to solve for the one variable that is unknown in the other expression
            let expression1 = ExactConversionFromLatexStringToNerdamerReadableString(exprsCopy[index].rawStr, uniqueRIDStringArray);
            let expression2 = ExactConversionFromLatexStringToNerdamerReadableString(exprsCopy[index + 1].rawStr, uniqueRIDStringArray);
            if(expression1 != null && expression2 != null){//the conversion from latex to nerdamer readable string was successful
              SqrtLoop = 0;//resetting this global variable to 0 which makes sure that nerdamer doesn't go into a loop trying to solve for a variable
              let unknownVariableRIDString = ReplaceVariablesWithUniqueRIDString(unknownVariable, uniqueRIDStringArray).replace(/(\(|\)|\s)/g,"");//removing parentheses on the ends and white space because if the rid variable is "_ertyuio" this function will return " (_ertyuio) "
              //console.log(`${expression1} = ${expression2}, solved for: ${unknownVariableRIDString}`);
              let solution = nerdamer(`${expression1} = ${expression2}`).solveFor(unknownVariableRIDString);
              //console.log("solution",solution.toString());
              if(solution.length > 0){//that means we found a solution
                //we are going to gather every non-zero solution but if all solution are zero then we will send the zerio as the solution
                let allNonZeroSolutions = solution.filter((s) => {return s.toString() != "0"});
                //console.log("allNonZeroSolutions", allNonZeroSolutions);
                let knownVariableValue;
                if(allNonZeroSolutions.length == 0){
                  knownVariableValue = solution[0].toString();
                }
                else{
                  knownVariableValue = allNonZeroSolutions[0].toString();//grab the first non zero solution
                }
                //now that we have solved for this variable, we need to see if we can calculate its actual value
                if(Object.keys(exprsCopy[index].variableValues.unknown).length + Object.keys(exprsCopy[index + 1].variableValues.unknown).length == 1){
                  //this means that the only unknown variable value in these two expression set equal to each other is the variable we are trying to calculate its value
                  //we now need to replace every UniqueRIDString with the value of the latex variable 
                  let count = 0;
                  let r;
                  let allKnownVariableValues = Object.assign(exprsCopy[index].variableValues.known, exprsCopy[index + 1].variableValues.known);
                  //console.log("allKnownVariableValues", allKnownVariableValues);
                  //console.log("uniqueRIDStringArray",uniqueRIDStringArray);
                  while(count < uniqueRIDStringArray.length){
                    if(allKnownVariableValues[uniqueRIDStringArray[count].variable] != undefined){
                      //console.log("uniqueRIDStringArray[count].ridString",uniqueRIDStringArray[count].ridString);
                      r = new RegExp(uniqueRIDStringArray[count].ridString, 'g');
                      knownVariableValue = knownVariableValue.replace(r, `(${allKnownVariableValues[uniqueRIDStringArray[count].variable]})`);
                    }
                    count++;
                  }
                  try{
                    //making sure that anything we replaced this string with is 
                    knownVariableValue = CleanLatexString(knownVariableValue,["multiplication"]);
                    knownVariableValue = nerdamer.convertFromLaTeX(knownVariableValue).toString();
                    //console.log("knownVariableValue", knownVariableValue);
                    //once we have replaced all unique rid strings with there variable values we need to try to evaluate this string using mathjs because it only allows for simple numbers and arrays so if it throws an error then we don't have a simple number or array (vector)
                    try{
                      knownVariableValue = math.evaluate(knownVariableValue).toString();
                    }catch(err2){
                      knownVariableValue = undefined;
                      //console.log(err2);
                    }
                  }
                  catch(err){
                    knownVariableValue = undefined;
                    //console.log(err);

                  }
                  
                }
                else{
                  knownVariableValue = undefined;
                }

                //now that we have tried to calcuate this known value regardless if we were succesful or failed we were able to solve for a unknown variable using all known values so we need to set the variable's "currenState" equal to "knonwn"
                let foundMatchAndChangedVariableValueOrState = false
                if(DefinedVariables[unknownVariable] != undefined){
                  DefinedVariables[unknownVariable].currentState = "known";
                  DefinedVariables[unknownVariable].value = (knownVariableValue) ? ConvertStringToScientificNotation(knownVariableValue) : undefined;
                  foundMatchAndChangedVariableValueOrState = true;
                }
                else if(EL.undefinedVars.undefined[unknownVariable] != undefined){
                  EL.undefinedVars.undefined[unknownVariable].currentState = "known";
                  EL.undefinedVars.undefined[unknownVariable].value = (knownVariableValue) ? ConvertStringToScientificNotation(knownVariableValue) : undefined;
                  foundMatchAndChangedVariableValueOrState = true;
                }
                else if(EL.undefinedVars.defined[unknownVariable] != undefined){
                  EL.undefinedVars.defined[unknownVariable].currentState = "known";
                  EL.undefinedVars.defined[unknownVariable].value = (knownVariableValue) ? ConvertStringToScientificNotation(knownVariableValue) : undefined;
                  foundMatchAndChangedVariableValueOrState = true;
                }

                if(foundMatchAndChangedVariableValueOrState){
                  //because we changed values and were able to identify new known variables we need
                  //call "UpdateKnownUnknownVariables" function which will parse the rawExpressionData from the first line with the new information we have put into the known unknown variables.
                  //By passing in "false" this function wont reset the variables currentState values which is what we want because we want the information we have just found to persist. Otherwise we would get a loop
                  EL.UpdateKnownUnknownVariables(false);
                  return;//after this function is done running it means it has already parsed all the lines starting from the top  so we just end right here
                }
              }
            }
          }
        }
        index++;
      }
    }
  }
}

function ConvertStringToScientificNotation(str){
  let scientificNotation = Number(str).toExponential().split("e");
  scientificNotation[0] = Number(scientificNotation[0]).toFixed(6).toString()
  if(scientificNotation[1] == "+0"){
    scientificNotation[1] = "";
  }else{
    scientificNotation[1] = `\\cdot 10^{${scientificNotation[1].replace("+","")}}`;
  }
  return scientificNotation.join("");
}

function CheckForErrorsInExpression(ls, lineNumber, mfID){
  ls = RemoveCommentsFromLatexString(ls);
  ls = PutBracketsAroundAllSubsSupsAndRemoveEmptySubsSups(ls);
  ls = SimplifyFunctionDefinitionToJustFunctionVariable(ls);//converts "f(x,y)=xy" to f=xy

  let expressions = ls.split(";");
  let rawData = expressions.map((str) => {
    let i = 0;
    let startIndex = 0;
    let splittedExpressions = [];
    let foundMatch = false;
    while(i < str.length){
      foundMatch = false;
      for(let delimiter of EqualityOperators){
        if(delimiter.indexOf("\\") == 0){
          foundMatch = (str.substring(i).indexOf(`${delimiter} `) == 0 || str.substring(i).indexOf(`${delimiter}\\`) == 0);
        }
        else{
          foundMatch = (str.substring(i).indexOf(delimiter) == 0);
        }
        if(foundMatch){
          splittedExpressions.push({
            parsed: false,
            str: RemoveDifferentialOperatorDFromLatexString(str.substring(startIndex, i)),
            rawStr: str.substring(startIndex, i),
            operator: delimiter,
          });
          startIndex = i + delimiter.length;
          i += delimiter.length -1;
          break;
        }
      }

      i++;
    }
    //then when we are done with the while loop we have to add the rest of the expression into the "splittedExpressions" array because there is no operator at the end of the string
    splittedExpressions.push({
      parsed: false,
      str: RemoveDifferentialOperatorDFromLatexString(str.substring(startIndex, i)),
      rawStr: str.substring(startIndex, i),
      operation: null,
    });

    return splittedExpressions;
  });

  let exprs = JSON.parse(JSON.stringify(rawData));//making a deep copy of the raw data

  EL.rawExpressionData[lineNumber] = JSON.parse(JSON.stringify(rawData));//making a deep copy of the raw data


  for(var i = 0; i < exprs.length; i++){
    for(var j = 0; j < exprs[i].length; j++){
      let trulyUndefinedVars = GetTrulyUndefinedVariables(exprs[i][j].str);
      if(trulyUndefinedVars.length == 0){//there must be 0 truly undefined variables for the string to be parsed
        let str = ReplaceVariablesWithMathjsUnits(exprs[i][j].str);

        str = CleanLatexString(str,["absolute-value"]);
        str = CleanLatexString(str, ["fractions","addition","parentheses","brackets", "white-space", "square-brackets"]);
        str = FindAndFormatUnitsOfMathjsVector(str);//we have to do this step after all the square brackets have been formatted
        str = FindAndWrapVectorsThatAreBeingMultiplied(str);
        str = CleanLatexString(str,["multiplication"]);
        str = CleanLatexString(str,["latexFunctions"]);//this takes functions in latex and converts them to something mathjs can understand. for example converting \sqrt into sqrt so math js understands

        exprs[i][j].parsed = true;
        exprs[i][j].str = str;
      }
      else{
        exprs[i][j].undefinedVars = trulyUndefinedVars;
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
            try{
              //by removing the vector unit we can figure out if the units don't match because the user is adding a scalar with a vector
              math.evaluate(exprs[i][j].str.replace(/rad/g,"(m / m)").replace(/sr/g,"(m^2 / m^2)").replace(/vector/g,"")).toString();
              results[i].push({error: "Adding a scalar with a vector"});
            }
            catch(err3){
              results[i].push({error: err2.message});
            }
            
          }
        }

      }
      else{
        results[i].push({undefinedExpression: exprs[i][j].str, undefinedVariables: exprs[i][j].undefinedVars});
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
    let possiblySolvableExpressions = [];
    let errors = [];
    r.map(function(data, i){

      if(data.success != undefined){
        successes.push(data.success);
      }

      if(data.undefinedExpression != undefined && data.undefinedVariables.length == 1){
        possiblySolvableExpressions.push({expression: data.undefinedExpression, undefinedVariable: data.undefinedVariables[0]});
      }

      if(data.error != undefined){
        errors.push(data.error);
      }

    });

    let equationUnits = "";
    if(successes.length > 1){

      //check if units match for success equations
      let equationUnitsMatch = false;
      let settingScalarToVector = false;

      try {
        //trying to add the units of each equation and see if they add if they don't then they are not the same unit so an error will occur
        equationUnits = math.evaluate(successes.join(" + ")).toString();
        equationUnitsMatch = true;
      }
      catch(err){
        let editedSuccesses = [];
        try{
          //removing rad and steradian from equations to see if they will equal each other because the editor can't recorgnize the arc formula  s=r\theta cuz units wise you are saying 1m=1m*rad
          for(var i = 0; i < successes.length; i++){
            editedSuccesses.push(successes[i].replace(/rad/g,"").replace(/sr/g,""));
          }
          equationUnits = math.evaluate(editedSuccesses.join(" + ")).toString();
          equationUnitsMatch = true;
        }
        catch(err2){
          equationUnitsMatch = false;
          try{
            for(var i = 0; i < editedSuccesses.length; i++){
              editedSuccesses[i] = editedSuccesses[i].replace(/vector/g,"");
            }
            math.evaluate(editedSuccesses.join(" + ")).toString();
            settingScalarToVector = true;
          }
          catch(err3){
            settingScalarToVector = false;
          }
        }

      }

      if(!equationUnitsMatch){
        if(settingScalarToVector){
          log.error.push({
            error: EL.createLoggerErrorFromMathJsError("Setting a vector equal to scalar"),
            info: successes,
            lineNumber: lineNumber,
            mfID: mfID,
          });

          //we are going to add this information to the correct mathfield that has this error
          MathFields[mfID].log.error.push({
            error: EL.createLoggerErrorFromMathJsError("Setting a vector equal to scalar"),
            info: successes,
          });
          
        }
        else{
          log.error.push({
            error: EL.createLoggerErrorFromMathJsError("Units do not equal each other"),
            info: successes,
            lineNumber: lineNumber,
            mfID: mfID,
          });

          //we are going to add this information to the correct mathfield that has this error
          MathFields[mfID].log.error.push({
            error: EL.createLoggerErrorFromMathJsError("Units do not equal each other"),
            info: successes,
          });

        }
        
      }
      else{
        //if the units match then we should do a high level self consistency check
        EL.linesToCheckForSelfConsistency.push(lineNumber);
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


    if(equationUnits != ""){//that means that there is an equation or equations that have matched units that could help us defined the each variable in each of our possiblySolvableExpressions array
      //if the equations match then we can use these equations to defined the single undefined variables that may exist
      let knownUnitStringConstant = "__knownUnit";
      for(var c = 0; c < possiblySolvableExpressions.length; c++){
        let uniqueRIDStringArray = GenerateUniqueRIDStringForVariables(possiblySolvableExpressions[c].expression);//this generates an object that relates each variable to a unique rid string so that it is easier for nerdamer to parse to the equation
        uniqueRIDStringArray.push({//we are adding this because it represents the units of the equations that are set equal to the equation we are parsing currently
          variable: knownUnitStringConstant,
          ridString: knownUnitStringConstant,
          unitsMathjs: equationUnits,
        });
        //we dont have support for figuring out the units of a vector's components quite yet
        if(possiblySolvableExpressions[c].expression.indexOf("\\left[") == -1 && possiblySolvableExpressions[c].expression.indexOf("\\right]") == -1){
          let expression = `${SimpleConvertLatexStringToNerdamerReadableString(possiblySolvableExpressions[c].expression, uniqueRIDStringArray)} = ${knownUnitStringConstant}`;
          let undefinedVariable = SimpleConvertLatexStringToNerdamerReadableString(possiblySolvableExpressions[c].undefinedVariable, uniqueRIDStringArray);//this just gets the undefined variable interms of its random id string

          try{
            SqrtLoop = 0;//resetting this global variable to 0 which makes sure that nerdamer doesn't go into a loop trying to solve for a variable
            let solution = nerdamer(expression).solveFor(undefinedVariable).toString();
            //console.log(solution);
            if(solution.length != 0){
              //we need to convert the solution into math js units
              let mathjsString = ReplaceUniqueRIDStringWithMathjsUnits(solution, uniqueRIDStringArray);
              try{//we are going to try to evaluate the math js string to get the units of this unknown variable. if it works we will added it to defined undefined vars if it doesn't work then we just catch the error
                let mathjsUnits = math.evaluate(mathjsString).toString();
                //if the above line doesn't through an error then we have found a unit definition for this undefined variable so we need to record it
                EL.recordDefinitionForUndefinedVariable(possiblySolvableExpressions[c].undefinedVariable, mathjsUnits);
                recordedDefinitionForUndefinedVariable = true;
              }
              catch(err){
                //do nothing
                //console.log(err);
              }
            }
          }
          catch(err){
            //console.log(err);
          }
        }


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

      //we are going to add this information to the correct mathfield that has this error
      MathFields[mfID].log.warning.push({
        warning: "Undefined Variables",
        variables: trulyUndefinedVars,
      });

    }


    if(errors.length > 0){
      errors.map(function(error, index){
        log.error.push({
          error: EL.createLoggerErrorFromMathJsError(error),
          info: "",
          lineNumber: lineNumber,
          mfID: mfID,
        });

        //we are going to add this information to the correct mathfield that has this error
        MathFields[mfID].log.error.push({
          error: EL.createLoggerErrorFromMathJsError(error),
        });
      });
    }


  });

  if(recordedDefinitionForUndefinedVariable){
    EL.ParsePreviousLinesAgainWithNewInfoAboutUndefinedVariables(lineNumber);
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
          unitsMathjs = `[(${unitsMathjs}), (${unitsMathjs}), (${unitsMathjs})]`;//making math js representation of a vector
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

function FindAndFormatUnitsOfMathjsVector(ls){
  //this function goes through latex string and multiplies
  let i = 0;
  let i2 = 0;
  let delta = 1;
  let s;
  let newLs = "";
  while(i < ls.length){
    delta = 1;
    s = ls.substring(i);
    if(s.indexOf("([") == 0){
      i2 = FindIndexOfClosingParenthesis(s.substring(1));
      if(i2 != null){
        i2 += 1;//accounts for the shift that occured because we used a substring of "s"
        delta = i2 + 1;
        try{
          let formattedVector = math.evaluate(`${s.substring(0,i2 + 1)} (1 vector)`).toString();
          newLs += `(${formattedVector})`;
        }
        catch(err){
          console.log("Error occured trying to parse vector into MathJs Vector");
          //console.log(err);
        }
      }
      else{
        console.log("couldn't find closing parentheses");
        return ls;
      }
    }
    else{
      newLs += s[0];
    }
    i += delta;
  }

  return newLs;
}

function ReplaceUniqueRIDStringWithMathjsUnits(ls, uniqueRIDStringArray){//this function works exactly like ReplaceVariablesWithMathjsUnits() except it doesn't care about the distincition between vectors and scalars only units

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
    for(var c = 0; c < uniqueRIDStringArray.length; c++){
      if(s.indexOf(uniqueRIDStringArray[c].ridString) == 0){
        let variable = {};
        if(uniqueRIDStringArray[c].ridString == "__knownUnit"){
          variable.unitsMathjs = uniqueRIDStringArray[c].unitsMathjs;
        }
        else if(Object.keys(DefinedVariables).includes(uniqueRIDStringArray[c].variable)){
          variable = Object.assign({}, DefinedVariables[uniqueRIDStringArray[c].variable]);
        }
        else if(Object.keys(PreDefinedVariables).includes(uniqueRIDStringArray[c].variable)){
          variable = Object.assign({}, PreDefinedVariables[uniqueRIDStringArray[c].variable]);
        }
        else if(Object.keys(EL.undefinedVars.defined).includes(uniqueRIDStringArray[c].variable)){
          variable = Object.assign({}, EL.undefinedVars.defined[uniqueRIDStringArray[c].variable]);
        }
        else if(Object.keys(VectorMagnitudeVariables).includes(uniqueRIDStringArray[c].variable)){
          variable = Object.assign({}, VectorMagnitudeVariables[uniqueRIDStringArray[c].variable]);
        }

        //we don't care if this variable is a vector or scalar so the only thing we will record is its units
        let unitsMathjs = variable.unitsMathjs;
        foundMatch = true;
        delta = uniqueRIDStringArray[c].ridString.length;

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

function ReplaceUniqueRIDStringWithVariableLs(ls, uniqueRIDStringArray){
  //this function replaces the unique rid string with its variable ls
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
    for(var c = 0; c < uniqueRIDStringArray.length; c++){
      if(s.indexOf(uniqueRIDStringArray[c].differentialRidString) == 0){

        foundMatch = true;
        delta = uniqueRIDStringArray[c].differentialRidString.length;

        newLs += uniqueRIDStringArray[c].differentialVariable;

        break;
      }
      else if(s.indexOf(uniqueRIDStringArray[c].ridString) == 0){

        foundMatch = true;
        delta = uniqueRIDStringArray[c].ridString.length;

        newLs += uniqueRIDStringArray[c].variable;

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

function SimpleConvertLatexStringToNerdamerReadableString(ls, uniqueRIDStringArray){
  //first thing we need to do is convert all vectors latex string into a simple string so that Nerdamer can parse the variable
  //ls = ReplaceLatexVectorsWithNerdamerReadableVariables(ls);
  //we then need to remove unit vectors so \hat{ } because with this simple conversion we don't care about vectors we only care about units
  ls = ls.replace(/\\hat\{[\s\d\w\\\^\-]*\}/g,"(1)");
  ls = ReplaceVariablesWithUniqueRIDString(ls, uniqueRIDStringArray);//this object holds
  ls = CleanLatexString(ls, ["fractions","addition","parentheses","brackets", "white-space"]);
  ls = CleanLatexString(ls,["multiplication"]);
  ls = CleanLatexString(ls,["latexFunctions"]);
  return nerdamer.convertFromLaTeX(ls).toString();
}

function ReplaceVariablesWithUniqueRIDString(ls, uniqueRIDStringArray, recognizeNerdamerFunctions = false){
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

    //if this is true then we have converted things to nerdamer functions before we passed it to this function so
    //we need to make sure that we dont recognize a letter in a nerdamer function as a variable
    if(recognizeNerdamerFunctions){
      let nerdamerFunctions = ["integrate(","abs(","vector(","dot(","cross("];
      for(var c = 0; c < nerdamerFunctions.length; c++){
        if(s.indexOf(nerdamerFunctions[c]) == 0){
          foundMatch = true;
          newLs += nerdamerFunctions[c];
          delta = nerdamerFunctions[c].length;
          break;
        }
      }

    }

    //lets first check if its a variable
    if(!foundMatch){
      for(var c = 0; c < uniqueRIDStringArray.length; c++){
        if(s.indexOf(uniqueRIDStringArray[c].differentialVariable) == 0){
          foundMatch = true;
          delta = uniqueRIDStringArray[c].differentialVariable.length;
          newLs += ` (${uniqueRIDStringArray[c].differentialRidString}) `;
          break;
        }
        else if(s.indexOf(uniqueRIDStringArray[c].variable) == 0){
          foundMatch = true;
          delta = uniqueRIDStringArray[c].variable.length;
          newLs += ` (${uniqueRIDStringArray[c].ridString}) `;
          break;
        }
      }
    }


    //if it is not a variable then it could be an operator or greek letter so we need to check
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

function GenerateUniqueRIDStringForVariables(ls){
  let vars = GetVariablesFromLatexString(ls);
  //we need to organize vars from longest variable to shortest variable just incase a long variable has a piece of a shorter variable in it
  vars.sort(function(a,b){
  	if(a.length > b.length){
    	return -1;
    }
    else{
    	return 1;
    }
  });

  let array = [];
  for(let i = 0; i < vars.length; i++){
    if(vars[i] != "\\pi" && vars[i] != "i" && vars[i] != "e"){//we are not going to convert these two variables because they are predefined and understood by nerdamer if you use the convertFromLaTeX function
      array.push({
        variable: vars[i],
        ridString: `__${RandomVariableString()}`,
        differentialVariable: `d${vars[i]}`,
        differentialRidString: `__${RandomVariableString()}`,
      });
    }

  }
  return array;
}

function RandomVariableString(){//this function is like rid but it doesn't use any numbers
  let c = "abcdefghijklmnopqrstuvwxyz";
  let rid = "";
  for(var i = 0; i < 5; i++){
    let r = Math.random() * c.length;
    rid += c.substring(r, r+1);
  }

  return rid;
}

function ReplaceLatexVectorsWithNerdamerReadableVariables(ls){
  let i;
  let i2;
  while(ls.indexOf("\\vec{") != -1){
    i = ls.indexOf("\\vec{");
    i2 = FindIndexOfClosingBracket(ls.substring(i + "\\vec{".length));
    if(i2 != null){//make sure the function got the value we want
      i2 += (i + "\\vec{".length);//adding the shift the comes from using substring in previous line
    }
    else{
      return undefined;//stop the process and break so that we can figure out what happened
    }
    //i put a space because when we convert this from latex to Nerdamer readable string it can understand that "a b" = "a * b" so i am putting a space just incase the multiplication was explicity defined
    ls = ls.substring(0,i) + " _vec___" + ls.substring(i + "\\vec{".length, i2) + "___ " + ls.substring(i2 + 1);
  }
  return ls;
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
  if(types.includes("square-brackets")){
    ls = ls.replace(/\\left\[/g,"([").replace(/\\right\]/g,"])");//replacing brackets for parentheses
  }
  if(types.includes("white-space")){
    ls = ls.replace(/\\\s/g, '');//removing "\ " blackslash with space after
  }
  if(types.includes("latexFunctions")){
    //console.log("latexFunctions");
    let latexFunctionConversions = {//i have to put 4 backslashes because these strings are going into a regex statement so i have to escape the backslashes
      "\\\\sqrt": "sqrt",
      "\\\\sin": "sin",
      "\\\\cos": "cos",
      "\\\\int": "",
      "\\\\sum": "",
    };

    //the code below clears any integrals that are formatted as \int_{...}^{...},\int_(...)^(...), or when the upper or lower bound is not filled so -> \int_{...}, \int^{...}, \int_(...), \int^(...)
    let i1;
    let i2;
    let i3;
    while(ls.indexOf("\\int_(") != -1){
      i1 = ls.indexOf("\\int_(");
      i2 = FindIndexOfClosingParenthesis(ls.substring(i1 + "\\int_(".length));
      if(i2 != null){
        i2 += i1 + "\\int_(".length;//accounts for the shift because we used a substring of ls
        if(ls[i2 + 1] == "^"){//this means the integral is formated like: \int_(...)^(...)
          i3 = FindIndexOfClosingParenthesis(ls.substring(i2 + 3));
          if(i3 != null){
            i3 += i2 + 3;//adjust for shift
            ls = ls.substring(0,i1) + ls.substring(i3 + 1);//removing integral formatted as: \int_(...)^(...)
          }
          else{//theere was trouble finding the closing bracket so just stop
            console.log("trouble finding closing bracket for integral");
            break;
          }
        }
        else{
          ls = ls.substring(0,i1) + ls.substring(i2 + 1);//removing integral formatted as: \int_(...)
        }
      }
      else{//theere was trouble finding the closing bracket so just stop
        console.log("trouble finding closing bracket for integral");
        break;
      }
    }

    while(ls.indexOf("\\int^(") != -1){
      i1 = ls.indexOf("\\int^(");
      i2 = FindIndexOfClosingParenthesis(ls.substring(i1 + "\\int^(".length));
      if(i2 != null){
        i2 += i1 + "\\int^(".length;//accounts for the shift because we used a substring of ls
        ls = ls.substring(0,i1) + ls.substring(i2 + 1);//removing integral formatted as: \int^(...)
      }
      else{//theere was trouble finding the closing bracket so just stop
        console.log("trouble finding closing bracket for integral");
        break;
      }
    }


    let r;
    for(const [key, value] of Object.entries(latexFunctionConversions)){
      r = new RegExp(key, 'g');
      ls = ls.replace(r, value);
    }
    //console.log(ls);
  }
  if(types.includes("absolute-value")){
    ls = ls.replace(/\\left\|/g,"absoluteValue(").replace(/\\right\|/g, ")");
  }

  return ls;
}


function FindAndWrapVectorsThatAreBeingMultiplied(ls){

  //before we start finding "\\times" and "\\cdot" operator we need to go through the string and parse everything in parentheses that has these operators first
  let i = 0;
  let i2 = 0;
  let i3 = 0;
  let delta = 0;
  let s;
  let newLs = "";
  while(i < ls.length){
    delta = 1;
    s = ls.substring(i);
    i2 = s.indexOf("(");//we are finding the next index of a paretheses to see if what it incloses has a "\\times" or "\\cdot" operator
    if(i2 != -1){
      newLs += s.substring(0, i2 + 1);//adding everything before the parentheses
      i3 = FindIndexOfClosingParenthesis(s.substring(i2 + 1));
      if(i3 != null){
        i3 += i2 + 1;//accounts for shift because we used a substring of "s"
        //now that we know the closing parentheses and opening we are going to check if there is a "\\times" or "\\cdot" operator in it
        let stringInsideParentheses = s.substring(i2+1, i3);
        if(stringInsideParentheses.indexOf("\\times") != -1 || stringInsideParentheses.indexOf("\\cdot") != -1){
          stringInsideParentheses = FindAndWrapVectorsThatAreBeingMultiplied(stringInsideParentheses);
          //console.log("stringInsideParentheses", stringInsideParentheses);
        }
        newLs += stringInsideParentheses;//adding everything inside the parentheses
        delta = i3;
      }
      else{
        console.log("error couldn't find closing parentheses");
        return ls;
      }
      i += delta
    }
    else{
      //if we couldn't find another parentheses we need to make sure to add the rest of the string to "newLs"
      newLs += s;
      break;
    }

  }

  //now that we have parsed the string and did parentheses first using recursion we can finish up by taking this parsed string and actually wrapping the vectors in there proper functions
  while(newLs.lastIndexOf('\\times') != -1 || newLs.lastIndexOf("\\cdot") != -1){
    let crossProductIndex = newLs.lastIndexOf('\\times');
    let dotProductIndex = newLs.lastIndexOf("\\cdot");
    //the default is to do cross product first because when two vectors are crossed the resulting vector can still  be dotted  with another vector. But once two vectors are dotted, the resulting vector can't then be crossed with another vector
    let multiply = {
      index: (crossProductIndex != -1) ? crossProductIndex: dotProductIndex,
      type: (crossProductIndex != -1) ? "\\times": "\\cdot",
      func: (crossProductIndex != -1) ? "myCrossProduct": "myDotProduct",
     };

     //console.log(multiply);

    let v1StartIndex = FindFirstVectorStartIndex(newLs, multiply.index);
    let v2EndIndex = FindSecondVectorEndIndex(newLs, multiply.index + multiply.type.length);//we want to start parsing everything after the multiplication operator

    //console.log(v1StartIndex, v2EndIndex);

    if(v1StartIndex != null && v2EndIndex != null){
      //this string removes the multiplication operator and wraps the vectors in a function and uses each vector as a parameter for the function
      newLs = newLs.substring(0,v1StartIndex) + (multiply.func) + "(" + newLs.substring(v1StartIndex, multiply.index) + ", " + newLs.substring(multiply.index + multiply.type.length, v2EndIndex + 1) + ")" + newLs.substring(v2EndIndex + 1);
    }
    else{
      //if it broke once then it will just keep breaking so we just got to end it
      return newLs;
    }

  }
  return newLs;
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
        //now we have the range we need to make sure there are no operators inside this range because then we need to assume it is implicit multiplication
        let stringInsideParentheses = ls.substring(index + target.length, closingParenthesis + 1 - "\\right)".length);
        let foundOperator = false;
        for(let c = 0; c < ListOfOperators.length; c++){
          if(stringInsideParentheses.indexOf(ListOfOperators[c]) != -1){
            foundOperator = true;
            break;//we found one operator so we don't need to parse anymore we know that we can't assume this is a variable apart of a function definition. we must assume this is implicit multiplication
          }
        }

        //if we found an operator then we will keep the string inside the parentheses but replace its parentheses "\\left(" -> "(" and "\\right" -> ")" to signify implicit multiplciation.
        //but if we didn't find an operator we can assume that the string was just apart of a function definition
        ls = ls.substring(0, index + vars[i].length) + `${(foundOperator) ? "(" + stringInsideParentheses + ")" : "" }` + ls.substring(closingParenthesis + 1);

      }
    }
  }

  return ls;

}

function AreIntegralBoundsFormattedProperly(expressionArray){
  let c = 0;
  let ls;
  while(c < expressionArray.length){
    ls = expressionArray[c].rawStr;//checking each latex string to see if there is badly formatted integrals
    //this function takes in an expression array of latex strings and checks if the "\int" latex string and its bounds are formatted properly.
    //when no bounds are explicitly defined by the user the integral will have a latex string of "\\int" becayse earlier the Editor Logger "EL" takes out all empty Subscripts and superscripts so "\\int_{ }^{ }" would turn into this "\\int"
    //if an upperbound is explicitly defined but a lower bound is not the integral will look like this "\\int^{...}"
    if(ls.indexOf("\\int^{") == -1){
      //the next thing we need to check is if a lower bound is defined but an upper bound is not. In this case the integral will look like this "\\int_{...}". But this is how an integral with both bounds look like in the beginning so we can't just do a simple indexOf("\\int_{"). because that will catch a properly formated integral like "\\int_{...}^{...}"
      let i = 0;
      let i2;
      let delta = 1;
      let s;
      while(i < ls.length){
        delta += 1;
        s = ls.substring(i);
        if(s.indexOf("\\int_{") == 0){
          i2 = FindIndexOfClosingBracket(s.substring("\\int_{".length));
          if(i2 != null){
            i2 += "\\int_{".length;//this accounts for the shift that occurs because of using a substring
            if(s[i2 + 1] != "^"){//if it doesnt equal "^" that means that this is an integral with lower bound defined but not upper bound
              return false;
            }
            else{//this is an integral with both bounds defined
              delta = i2 + 1;//so now on the next loop through i will start on the character write after the first closing bracket
            }
          }
          else{
            console.log("trouble finding closing bracket for integral");
            return false;
          }
        }
        i += delta;
      }
    }
    else{
      return false;
    }

    c++;
  }
  //if we haven't returned false by this point, meaning we didn't find anything wrong as we parsed through all the latex strings using the while loops, then the string must be formatted properly
  return true;
}

function GetRidStringVariablesFromString(str, uniqueRIDStringArray){
  //this function gets all the ridStrings used in the string and returns an array
  let i = 0;
  let ridStringsUsedInString = [];
  while(i < uniqueRIDStringArray.length){
    if(str.indexOf(uniqueRIDStringArray[i].ridString) != -1){
      ridStringsUsedInString.push(uniqueRIDStringArray[i].ridString);
    }
    if(str.indexOf(uniqueRIDStringArray[i].differentialRidString) != -1){
      ridStringsUsedInString.push(uniqueRIDStringArray[i].differentialRidString);
    }
    i++;
  }

  return ridStringsUsedInString;
}

function DoHighLevelSelfConsistencyCheck(expressionArray, lineNumber, mfID){
  let expressionThatAreNotCorrect = [];
  //so now we need to check if there is even a possiblity that we can do a high level check between these expressions
  for(let i = 0; i + 1 < expressionArray.length; i++){
    //we need to do an exact conversion from latex to a string that nerdamer can understand. they have a convertFromLatex function but it is very limited so we will use it sparingly
    //this line of code converts the two expressions we were analyzing into nerdeamer readable string then we use nerdamers .eq() function to check if they are equal. if they arent then we add these two expression to the "expressionThatDontEqualEachOther" array
    let uniqueRIDStringArray = GenerateUniqueRIDStringForVariables(`${expressionArray[i].rawStr} + ${expressionArray[i+1].rawStr}`);//passing both string and putting a plus inbetween them so that we generate a uniqueRIDStringArray that accounts for all the variables and differential variables used in both expressions
    //console.log(uniqueRIDStringArray);
    let expression1 = ExactConversionFromLatexStringToNerdamerReadableString(expressionArray[i].rawStr, uniqueRIDStringArray, lineNumber, mfID);
    let expression2 = ExactConversionFromLatexStringToNerdamerReadableString(expressionArray[i+1].rawStr, uniqueRIDStringArray, lineNumber, mfID)
    console.log("uniqueRIDStringArray", uniqueRIDStringArray);
    console.log(expression1 + " ?= " +  expression2);
    if(expression1 != null && expression2 != null){
      //because this is a high level check we need to make sure that both expressions use the same variables and if not we cannot be sure that the equations don't equal each other so we will not actaully do any check
      let expression1Variables = GetRidStringVariablesFromString(expression1, uniqueRIDStringArray);
      let expression2Variables = GetRidStringVariablesFromString(expression2, uniqueRIDStringArray);
      //console.log(expression1Variables, expression2Variables);
      if(expression1Variables.length == expression2Variables.length){//the arrays have to bee the same length
        //we are now going to filter expression1Variables array using values from expression2Variables array and if there are any variables left in expression1Variable array we know that these two arrays don't hold the exact same variables as each other and therefore we can't do a high level check
        if(expression1Variables.filter((v) => {return !expression2Variables.includes(v)}).length == 0){
          //using all of nerdamer's equality functions to figure out if the expression is correct
          if(expressionArray[i].operator == "="){
            if(!nerdamer(expression1).eq(expression2)){//nerdamer equal to function
              let isEqual = false;
              //before we can be sure that these two expression are not equal we need to check if both are vectors because for some reason nerdamer returns false even if the expressions are both "[x,y,z]"
              let resultingVector = nerdamer(expression1).subtract(expression2);
              if(resultingVector.symbol.elements){//if this doens't equal undefined we know our result "r" is a vector so we can do an extra check before we assume the expressions don't equal
                isEqual = true;
                let count = 0;
                while(count < resultingVector.symbol.elements.length){
                  if(nerdamer.vecget(resultingVector, count).toString() != "0"){//checking if each component of this vector is equal to 0
                    isEqual = false;
                    break;
                  }
                  count++;
                }
              }
              if(!isEqual){
                //console.log("not equal");
                expressionThatAreNotCorrect.push({
                  expression1: expressionArray[i].rawStr,
                  expression2: expressionArray[i+1].rawStr,
                  operator: expressionArray[i].operator,
                });
              }
            }
          }
          else if(expressionArray[i].operator == "<"){
            if(!nerdamer(expression1).lt(expression2)){//nerdamer less than function
              //console.log("not less than");
              expressionThatAreNotCorrect.push({
                expression1: expressionArray[i].rawStr,
                expression2: expressionArray[i+1].rawStr,
                operator: expressionArray[i].operator,
              });
            }
          }
          else if(expressionArray[i].operator == ">"){
            if(!nerdamer(expression1).gt(expression2)){//nerdamer greater than function
              //console.log("not greater than");
              expressionThatAreNotCorrect.push({
                expression1: expressionArray[i].rawStr,
                expression2: expressionArray[i+1].rawStr,
                operator: expressionArray[i].operator,
              });
            }
          }
          else if(expressionArray[i].operator == "\\le"){
            if(!nerdamer(expression1).lte(expression2)){//nerdamer less than or equal to function
              //console.log("not less than or equal");
              expressionThatAreNotCorrect.push({
                expression1: expressionArray[i].rawStr,
                expression2: expressionArray[i+1].rawStr,
                operator: expressionArray[i].operator,
              });
            }
          }
          else if(expressionArray[i].operator == "\\ge"){
            if(!nerdamer(expression1).gte(expression2)){//nerdamer greater than or equal to function
              //console.log("not greater than or equal");
              expressionThatAreNotCorrect.push({
                expression1: expressionArray[i].rawStr,
                expression2: expressionArray[i+1].rawStr,
                operator: expressionArray[i].operator,
              });
            }
          }
        }
      }
    }
  }
  return expressionThatAreNotCorrect;
}

function FindAndParseLatexIntegralsAndReturnLatexStringWithNerdamerIntegrals(ls, uniqueRIDStringArray, lineNumber, mfID){
  //this function takes a string and tries to find all the intsances of \\int_{}^{}(...) and converter them to a nerdamer string like integarte(x,x)
  let newLs = "";
  let s;
  let i = 0;
  let i2 = 0;
  let i3 = 0;
  let i4 = 0;
  let delta = 0;
  let foundMatch = false;
  while(i < ls.length){
    foundMatch = false;
    delta = 1;
    s = ls.substring(i);
    if(s.indexOf("\\int  \\left(") == 0){//checking for
      i2 = FindIndexOfClosingParenthesis(s.substring("\\int  \\left(".length));
      if(i2 != null){
        i2 += "\\int  \\left(".length;
        delta = i2 + 1;
        let stringInsideIntegral = s.substring("\\int  \\left(".length, i2 - "\\right".length);
        //console.log(stringInsideIntegral);
        let newString = EvaluateStringInsideIntegralAndReturnNerdamerString(stringInsideIntegral, uniqueRIDStringArray, lineNumber, mfID);
        if(newString != null){
          foundMatch = true;
          newLs += `(${newString})`;
        }
        else{
          console.log("couldn't evaluate string inside integral");
          return ls;
        }
      }
      else{
        //if we can't figure out where the parentheses is then a latex inegral expression won't be parsed and for this reason there is not reason to continue parsing so we will just return the original string we astarted with
        console.log("trouble finding closing paraenthesis");
        return ls;
      }
    }

    if(!foundMatch && s.indexOf("\\int_{") == 0){
      let lowerbound;
      let upperbound;
      //we need to check if there is a definite integral
      i2 = FindIndexOfClosingBracket(s.substring("\\int_{".length));
      if(i2 != null){
        i2 += "\\int_{".length;
        lowerbound = s.substring("\\int_{".length, i2);
        //console.log("substring:" + s.substring(i2+1));
        if(s.substring(i2+1).indexOf("^{") == 0){//checking if there is an uppeerbound to this integral
          i3 = FindIndexOfClosingBracket(s.substring(i2 + 3));//adding 3 because if the integral looks like this "\\int_{...}^{..}" you need to add 3 to get inside the next set of brackets
          if(i3 != null){
            i3 += i2 + 3;//this accounts for the shift created by using a substring. i3 holds the index of the second closing bracket in a defined integral
            upperbound = s.substring(i2 + 3, i3);
            if(s.substring(i3 + 1).indexOf("\\left(") == 0){//we need to have a opening parathensis
              //console.log("lowerbound", lowerbound);
              //console.log("upperbound", upperbound);
              lowerbound = ExactConversionFromLatexStringToNerdamerReadableString(lowerbound, uniqueRIDStringArray, lineNumber, mfID);
              upperbound = ExactConversionFromLatexStringToNerdamerReadableString(upperbound, uniqueRIDStringArray, lineNumber, mfID);
              if(lowerbound != null && upperbound != null){
                i4 = FindIndexOfClosingParenthesis(s.substring(i3 + 1 + "\\left(".length));
                if(i4 != null){
                  i4 += i3 + 1 + "\\left(".length;
                  delta = i4 + 1;
                  let stringInsideDefiniteIntegral = s.substring(i3 + 1 + "\\left(".length, i4 - "\\right".length);
                  //console.log("stringInsideDefiniteIntegral:" + stringInsideDefiniteIntegral);
                  let newString = EvaluateStringInsideDefiniteIntegralAndReturnNerdamerString(stringInsideDefiniteIntegral, uniqueRIDStringArray, lowerbound, upperbound, lineNumber, mfID);
                  if(newString != null){
                    foundMatch = true;
                    newLs += `(${newString})`;
                  }
                  else{
                    console.log("couldn't evaluate string inside integral");
                    return ls;
                  }
                }
                else{
                  console.log("trouble finding closing paraenthesis");
                  return ls;
                }
              }
              else{
                return ls;
              }


            }
            else{
              return ls;
            }
          }
          else{
            console.log("trouble finding closing bracket");
            return ls;
          }
        }
        else{
          console.log("couldn't find upperbound");
          return ls;
        }
      }
      else{
        console.log("trouble finding closing bracket");
        return ls;
      }
    }

    if(!foundMatch && s[0] == "\\"){
      //it is possible that it is an operator or a greek letter
      for(var c = 0; c < ListOfOperators.length; c++){
        if(s.indexOf(ListOfOperators[c]) == 0){
          foundMatch = true;
          newLs += ListOfOperators[c];
          if(["\\cdot","\\times"].includes(ListOfOperators[c])){
            newLs += " ";//mathquill for some reason doesn't put a space after \\cdot or \\times
          }
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

function EvaluateStringInsideIntegralAndReturnNerdamerString(ls, uniqueRIDStringArray, lineNumber, mfID){
  //first we need to check if there is an integral latex string inside of this one
  let indexOfAnotherIntegral = ls.indexOf("\\int");
  if(indexOfAnotherIntegral != -1){
    //if we find an integral inside of this one we will see if we can evaluate it and take the latex function "\\int" out of it
    ls = ls.substring(0, indexOfAnotherIntegral) + FindAndParseLatexIntegralsAndReturnLatexStringWithNerdamerIntegrals(ls.substring(indexOfAnotherIntegral), uniqueRIDStringArray, lineNumber, mfID);
    if(ls.indexOf("\\int") != -1){//so we tried to evaluate the integral inside of this one and if it still has the latex function "\\int" that means we can't take it out for some reason
      return null;
    }
  }

  let differentialVariableIndexes = [];//this holds the indexes of the variables of the variables whose differential form is being used in this current "ls"
  let i = 0;
  while(i < uniqueRIDStringArray.length){
    //unqiueRIDStringArray holds all the variables that are relevant to this ls and we are grabbing the information it has on all the differentialVariables that might exist in the string
    if(ls.indexOf(uniqueRIDStringArray[i].differentialVariable) != -1){
      differentialVariableIndexes.push(i);
    }
    i++;
  }
  //we need to check if there were any differential variables detected. if there none then we return null because we cant convert this this latex integral string into a nerdamer integral string
  if(differentialVariableIndexes.length > 0){
    //so the next thing we need to do is change the latex variables to RIDStrings so that nerdamer doesn't try to do stuff with them. it should just see these complex latex variables as just a variable.
    //For example \\vec{x} if we don't convert that to an unique ridString nerdamer will think it is the variable vec*x which is wrong
    let str = ReplaceVariablesWithUniqueRIDString(ls, uniqueRIDStringArray);
    //so now that we have converted variables into something that nerdamer can understand and wont try to change we need to convert the string to a nerdamer string
    let expression = {//this object keeps track of which parts of the expression are going to be in the integral and which parts arent
      integral: "",
      other: nerdamer.convertFromLaTeX(str).toString(),//initally nothing is in an integral unitl we can parse through the this string in the other property and slowly understand which parts are actaully apart of the integral
    }
    //after we have the nerdamer string we need to divide the nerdamer string by each differential variable found in the latex string to figure out which expressions are multiplied by which differential variables so if we need to we can split the integral into different integrals
    let c = 0;
    let dividedString;
    while(c < differentialVariableIndexes.length){
      //we are using the differentalRidString bevause this string was converted to a string where the variables were replaced with their uniqueRidString
      dividedString = nerdamer(expression.other).divide(uniqueRIDStringArray[differentialVariableIndexes[c]].differentialRidString).expand().toString();
      //now that we have divided the expressions by a specific differnetial variable and have expanded it we need to look at each expressions seperated by a "+" or "-" to see which expression are divided by the differential variable
      //Such expression means that they were not multiplied by the differential variable to begin with and for this reason they will not be apart of the integral we are going to make with this differential variable
      //the line below returns an object that holds the nerdamer integral string and an object that holds all other strings not divided by the differental variable (so back to normal)
      let expr = ReturnIntegralExpressionAndOtherExpression(dividedString, uniqueRIDStringArray[differentialVariableIndexes[c]].differentialRidString, uniqueRIDStringArray[differentialVariableIndexes[c]].ridString);
      expression.other = expr.other;//expr.other is a string that holds an expression which has the expressiosn that couldn't be put in the integral because they were not multiplied by the correct differential variable
      expression.integral += `+${expr.integral}`;//adding the calculation of the integral to expression.integral which keeps track of all the values of the integrals added up

      c++;
    }

    if(expression.other != "0"){
      //if there is other stuff in the integral that was not able to be integrated then we need to throw an error
      EL.addLog({error: [{
        error: EL.createLoggerErrorFromMathJsError("Expressions found inside integral without differential variable"),
        info: "",
        lineNumber: lineNumber,
        mfID: mfID,
      }]});

      //we are going to add this information to the correct mathfield that has this error
      MathFields[mfID].log.error.push({
        error: EL.createLoggerErrorFromMathJsError("Expressions found inside integral without differential variable"),
      });

      return null;
    }

    //we do it in this order because expression.integral always has "+" starting out the string because of how the integrate functions are being added to the integral property of expressions.
    return ReplaceUniqueRIDStringWithVariableLs(nerdamer(expression.other + expression.integral).toString(), uniqueRIDStringArray);
  }
  else{
    //if we couldn't find any differential variables and the user has typed out an integral we need to throw an error
    EL.addLog({error: [{
      error: EL.createLoggerErrorFromMathJsError("Expressions found inside integral without differential variable"),
      info: "",
      lineNumber: lineNumber,
      mfID: mfID,
    }]});

    //we are going to add this information to the correct mathfield that has this error
    MathFields[mfID].log.error.push({
      error: EL.createLoggerErrorFromMathJsError("Expressions found inside integral without differential variable"),
    });

    return null;
  }

}

function EvaluateStringInsideDefiniteIntegralAndReturnNerdamerString(ls, uniqueRIDStringArray, lowerbound, upperbound, lineNumber, mfID){
  //first we need to check if there is an integral latex string inside of this one
  let indexOfAnotherIntegral = ls.indexOf("\\int");
  if(indexOfAnotherIntegral != -1){
    //if we find an integral inside of this one we will see if we can evaluate it and take the latex function "\\int" out of it
    ls = ls.substring(0, indexOfAnotherIntegral) + FindAndParseLatexIntegralsAndReturnLatexStringWithNerdamerIntegrals(ls.substring(indexOfAnotherIntegral), uniqueRIDStringArray, lineNumber, mfID);
    if(ls.indexOf("\\int") != -1){//so we tried to evaluate the integral inside of this one and if it still has the latex function "\\int" that means we can't take it out for some reason
      return null;
    }
  }

  let differentialVariableIndexes = [];//this holds the indexes of the variables of the variables whose differential form is being used in this current "ls"
  let i = 0;
  while(i < uniqueRIDStringArray.length){
    //unqiueRIDStringArray holds all the variables that are relevant to this ls and we are grabbing the information it has on all the differentialVariables that might exist in the string
    if(ls.indexOf(uniqueRIDStringArray[i].differentialVariable) != -1){
      differentialVariableIndexes.push(i);
    }
    i++;
  }
  //we need to check if there were any differential variables detected. if there none then we return null because we cant convert this this latex integral string into a nerdamer integral string
  if(differentialVariableIndexes.length > 0){
    //so the next thing we need to do is change the latex variables to RIDStrings so that nerdamer doesn't try to do stuff with them. it should just see these complex latex variables as just a variable.
    //For example \\vec{x} if we don't convert that to an unique ridString nerdamer will think it is the variable vec*x which is wrong
    let str = ReplaceVariablesWithUniqueRIDString(ls, uniqueRIDStringArray);
    //so now that we have converted variables into something that nerdamer can understand and wont try to change we need to convert the string to a nerdamer string
    let expression = {//this object keeps track of which parts of the expression are going to be in the integral and which parts arent
      integral: "",
      other: nerdamer.convertFromLaTeX(str).toString(),//initally nothing is in an integral unitl we can parse through the this string in the other property and slowly understand which parts are actaully apart of the integral
    }
    //after we have the nerdamer string we need to divide the nerdamer string by each differential variable found in the latex string to figure out which expressions are multiplied by which differential variables so if we need to we can split the integral into different integrals
    let c = 0;
    let dividedString;
    while(c < differentialVariableIndexes.length){
      //we are using the differentalRidString bevause this string was converted to a string where the variables were replaced with their uniqueRidString
      dividedString = nerdamer(expression.other).divide(uniqueRIDStringArray[differentialVariableIndexes[c]].differentialRidString).expand().toString();
      //now that we have divided the expressions by a specific differnetial variable and have expanded it we need to look at each expressions seperated by a "+" or "-" to see which expression are divided by the differential variable
      //Such expression means that they were not multiplied by the differential variable to begin with and for this reason they will not be apart of the integral we are going to make with this differential variable
      //the line below returns an object that holds the nerdamer integral string and an object that holds all other strings not divided by the differental variable (so back to normal)
      let expr = ReturnDefiniteIntegralExpressionAndOtherExpression(dividedString, uniqueRIDStringArray[differentialVariableIndexes[c]].differentialRidString, uniqueRIDStringArray[differentialVariableIndexes[c]].ridString, lowerbound, upperbound);
      expression.other = expr.other;//expr.other is a string that holds an expression which has the expressiosn that couldn't be put in the integral because they were not multiplied by the correct differential variable
      expression.integral += `+${expr.integral}`;//adding the calculation of the integral to expression.integral which keeps track of all the values of the integrals added up

      c++;
    }

    if(expression.other != "0"){
      //if there is other stuff in the integral that was not able to be integrated then we need to throw an error
      EL.addLog({error: [{
        error: EL.createLoggerErrorFromMathJsError("Expressions found inside integral without differential variable"),
        info: "",
        lineNumber: lineNumber,
        mfID: mfID,
      }]});

      //we are going to add this information to the correct mathfield that has this error
      MathFields[mfID].log.error.push({
        error: EL.createLoggerErrorFromMathJsError("Expressions found inside integral without differential variable"),
      });

      return null;
    }

    //we do it in this order because expression.integral always has "+" starting out the string because of how the integrate functions are being added to the integral property of expressions.
    return ReplaceUniqueRIDStringWithVariableLs(nerdamer(expression.other + expression.integral).toString(), uniqueRIDStringArray);
  }
  else{
    //if we couldn't find any differential variables and the user has typed out an integral we need to throw an error
    EL.addLog({error: [{
      error: EL.createLoggerErrorFromMathJsError("Expressions found inside integral without differential variable"),
      info: "",
      lineNumber: lineNumber,
      mfID: mfID,
    }]});

    //we are going to add this information to the correct mathfield that has this error
    MathFields[mfID].log.error.push({
      error: EL.createLoggerErrorFromMathJsError("Expressions found inside integral without differential variable"),
    });

    return null;
  }

}

function ExactConversionFromLatexStringToNerdamerReadableString(ls, uniqueRIDStringArray, lineNumber, mfID){
  //I'm wrapping the absolute value function in parentheses "(abs(....))" so that it doesn't through off the wrap vector
  ls = ls.replace(/\\left\|/g,"(abs(").replace(/\\right\|/g,"))");//this converts all absolute value signs into nerdamer function "abs(......)"
  ls = CleanLatexString(ls, ["square-brackets"]);//we need to make sure that brackets formatted in latex are cleaned and
  ls = FindAndWrapVectorsThatAreBeingMultiplied(ls).replace(/(myCrossProduct)/g,"cross").replace(/(myDotProduct)/g,"dot");//the replacing what i call cross and dot product with what nerdamer recognizes as a cross or dot product
  ls = FormatVectorsIntoNerdamerVectors(ls);
  //we need to see if we can parse \int into a nerdamer string like integrate(x,x). and if we can't convert all of them then the if statement below will not allow us to check if the strings are equal
  ls = FindAndParseLatexIntegralsAndReturnLatexStringWithNerdamerIntegrals(ls, uniqueRIDStringArray, lineNumber, mfID);
  //this line is temporary. We will soon be able to support parsing and using these operators and notations
  if(ls.indexOf("\\int") == -1 && ls.indexOf("\\nabla") == -1 && ls.indexOf("[") == -1 && ls.indexOf("]") == -1){
    ls = ReplaceVariablesWithUniqueRIDString(ls, uniqueRIDStringArray, true);//passing true as the last parameter tells this function that there are nerdamer functions in this string so don't try to replace the letters in the function names
    try{
      return nerdamer.convertFromLaTeX(ls).expand().toString();//this is just a place holder for the actual value we will return
    }catch(err){
      console.log(err);
      return null;
    }
  }
  else{
    console.log("unparsable characters")
    return null;
  }
}

function FormatVectorsIntoNerdamerVectors(ls){
  return ls.replace(/\(\[/g, "vector(").replace(/\]\)/g, ")");
}

function ReturnIntegralExpressionAndOtherExpression(dividedString, differentialVariableRidString, variableRidString){
  //the first thing we need to do to generate an integral using some of the expressions given to us in the dividedString is split the dividedString up by pluses and minus
  let expressionArray = SplitExpandedExpressionByPlusesAndMinuses(dividedString);
  let expression = {
    integral: "",
    other: "",
  }
  let i = 0;
  let r = new RegExp(`(${differentialVariableRidString}\\^\\(\\-[\\d]*\\))`,'g');//if differentVariable = dx, this regex statement would match with strings like dx^(-1) or dx^(-2) which is what we want
  while(i < expressionArray.length){
    //so now that we have the expression array we need to figure out which expression in this array should be part of the integral and which should not be.
    //the way we will determine that is looking at which expressions are being multiplied by the differential variable to a negative power. If that be -1 or -2 or so on
    //we will use a simple regex statement to do this because we know how the information is formatted.
    if(expressionArray[i].search(r) == -1){
      //if this string is not be divided by the differential variable in any way then it should be apart of the integral
      expression.integral += expressionArray[i];
    }
    else{//if it is being divided by the differential variable is some way it shouldn't be apart of of the integral
      expression.other += expressionArray[i];
    }
    i++;
  }

  return {
    integral: nerdamer(`integrate(${expression.integral},${variableRidString})`).toString(),//now that we have gathered the information we need for the integral, we need to format the information properly so nerdamer can understand
    other: nerdamer(expression.other).multiply(differentialVariableRidString).expand().toString(),//we need to multiply everything that was left over by the differntial variable so that it goes back to how it was before it was part of the "dividedString"
  };
}

function ReturnDefiniteIntegralExpressionAndOtherExpression(dividedString, differentialVariableRidString, variableRidString, lowerbound, upperbound){
  //the first thing we need to do to generate an integral using some of the expressions given to us in the dividedString is split the dividedString up by pluses and minus
  let expressionArray = SplitExpandedExpressionByPlusesAndMinuses(dividedString);
  let expression = {
    integral: "",
    other: "",
  }
  let i = 0;
  let r = new RegExp(`(${differentialVariableRidString}\\^\\(\\-[\\d]*\\))`,'g');//if differentVariable = dx, this regex statement would match with strings like dx^(-1) or dx^(-2) which is what we want
  while(i < expressionArray.length){
    //so now that we have the expression array we need to figure out which expression in this array should be part of the integral and which should not be.
    //the way we will determine that is looking at which expressions are being multiplied by the differential variable to a negative power. If that be -1 or -2 or so on
    //we will use a simple regex statement to do this because we know how the information is formatted.
    if(expressionArray[i].search(r) == -1){
      //if this string is not be divided by the differential variable in any way then it should be apart of the integral
      expression.integral += expressionArray[i];
    }
    else{//if it is being divided by the differential variable is some way it shouldn't be apart of of the integral
      expression.other += expressionArray[i];
    }
    i++;
  }

  console.log(`defint(${expression.integral},${lowerbound},${upperbound},${variableRidString})`);

  return {
    integral: nerdamer(`defint(${expression.integral},${lowerbound},${upperbound},${variableRidString})`).toString(),//now that we have gathered the information we need for the integral, we need to format the information properly so nerdamer can understand
    other: nerdamer(expression.other).multiply(differentialVariableRidString).expand().toString(),//we need to multiply everything that was left over by the differntial variable so that it goes back to how it was before it was part of the "dividedString"
  };
}

function SplitExpandedExpressionByPlusesAndMinuses(str){
  //this function has to go through the string character by character and split it appropriately into an array of expressions
  let expressionsArray = [];
  let startIndex = 0;
  let i = 0;
  let i2;
  let delta = 1;
  while(i < str.length){
    delta = 1;
    if((str[i] == "+" || str[i] == "-") && i > 0){
      expressionsArray.push(str.substring(startIndex, i));
      startIndex = i;//the new startIndex is exactly where we left off
    }
    else if(str.substring(i).indexOf("^(") == 0){//this means something is being raised to a power that could be an expressions with pluses and minuses and so we need to skip over anything that is inside the parentheses
      i2 = FindIndexOfClosingParenthesis(str.substring(i + "^(".length));
      if(i2 != null){
        delta = i2 + "^(".length + 1;//calculating the change that needs to happen for us to skip over everything in the parentheses and setting that value equal to "delta"
      }
      else{
        //if wwe can't find the closing parentheses then we just need to stop
        return undefined;
      }

    }
    i += delta;
  }

  //lastly we need to add the last expression in because it finishes at the end of the string
  expressionsArray.push(str.substring(startIndex, str.length));

  return expressionsArray;
}
