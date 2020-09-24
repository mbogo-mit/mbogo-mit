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
    let crossProduct = math.cross(v1 , v2);
    if(crossProduct.toString().indexOf("vector") != -1){//this is if the user is just crossing to strings that do have "vector" as part of their units
      return math.evaluate(`${crossProduct.toString()} / 1 vector`)
    }
    return crossProduct;
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
  },
  ln: function(value){
    return math.evaluate(`log10(${value.toString()}) / log10(e)`);
  },
  customLog: function(base, value){
    return math.evaluate(`log10(${value.toString()}) / log10(${base.toString()})`);
  },
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

function ConvertStringToScientificNotation(str){
  let scientificNotation = Number(str).toExponential().split("e");
  scientificNotation[0] = Number(Number(scientificNotation[0]).toFixed(PrecisionSigFigs)).toString()
  if(scientificNotation[1] == "+0"){
    scientificNotation[1] = "";
  }else{
    scientificNotation[1] = `\\cdot 10^{${scientificNotation[1].replace("+","")}}`;
  }
  return scientificNotation.join("");
}

function SplitLsIntoExpressions(ls){
  let defaultExpressiosn = [ls];
  //this function takes in an ls and splits it into an array of latex expressions based on semicolons and commas
  let expressions = [];
  let i = 0;
  let i2 = 0;
  let startIndex = 0;
  let delta = 1;
  let str = "";
  while(i < ls.length){
    delta = 1;
    str = ls.substring(i);
    if(str[0] == "," || str[0] == ";"){
      expressions.push(ls.substring(startIndex, i));
      startIndex = i+1;//we want the next character we keep track of after the comma
      delta = 1;
    }
    else if(str[0] == "("){
      //we need to find the closing parentheses and not parse anything in th middle
      i2 = FindIndexOfClosingParenthesis(str.substring(1));
      if(i2 != null){
        delta = i2 + 1;//adding one accounts for the shift because we used a substring
      }
      else{
        console.log("couldn't find closing parentheses");
        return defaultExpressiosn;//if we can't parse one part of the ls right then we will not parse it at all and just send up a default expression
      }
    }
    else if(str[0] == "{"){
      //we need to find the closing bracekt and not parse anything in th middle
      i2 = FindIndexOfClosingBracket(str.substring(1));
      if(i2 != null){
        delta = i2 + 1;//adding one accounts for the shift because we used a substring
      }
      else{
        console.log("couldn't find closing bracket");
        return defaultExpressiosn;//if we can't parse one part of the ls right then we will not parse it at all and just send up a default expression
      }
    }
    else if(str[0] == "["){
      //we need to find the closing bracekt and not parse anything in th middle
      i2 = FindIndexOfClosingSquareBracket(str.substring(1));
      if(i2 != null){
        delta = i2 + 1;//adding one accounts for the shift because we used a substring
      }
      else{
        console.log("couldn't find closing bracket");
        return defaultExpressiosn;//if we can't parse one part of the ls right then we will not parse it at all and just send up a default expression
      }
    }
    i += delta;
  }

  //before we return the value we need to add the last expression to the list of expressions if it has a length greater than 0
  if(ls.substring(startIndex).length > 0){
    expressions.push(ls.substring(startIndex));
  }

  //before return this array we want to filter out any expression that are just empty strings or empty white space
  expressions = expressions.filter((value)=> {
    return value.replace(/\s*/g,"").length > 0;//this make sure that the value at this index is not just empty white space or nothing
  });

  return expressions;
}

function CheckForErrorsInExpression(ls, lineNumber, mfID){
  //we don't want to parse comments as variables and by replacing these comments with a semicolon it forces the editor to split up equations that have comments in between them so error don't arise 
  ls = ReplaceCommentsWithSemicolonInLatexString(ls);
  ls = PutBracketsAroundAllSubsSupsAndRemoveEmptySubsSups(ls);
  ls = SimplifyFunctionDefinitionToJustFunctionVariable(ls);//converts "f(x,y)=xy" to f=xy
  ls = ReformatTrigonmetryRaisedToAPower(ls);//changes for example sin^2(x) -> (sin(x))^2, and sin^-1(x) -> arcsin(x)
  let expressions = SplitLsIntoExpressions(ls);
  let rawData = expressions.map((str) => {
    let i = 0;
    let i2 = 0;
    let delta = 1;
    let startIndex = 0;
    let splittedExpressions = [];
    let foundMatch = false;
    while(i < str.length){
      delta = 1;
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
            str: RemoveDifferentialOperatorDFromLatexString(str.substring(startIndex, i)).replace(/\\oint/g,"\\int"),
            rawStr: str.substring(startIndex, i),
            operator: delimiter,
          });
          startIndex = i + delimiter.length;
          delta = delimiter.length;
          break;
        }
      }
      if(!foundMatch){
        if(str[i] == "("){
          //we need to find the closing parentheses and not parse anything in th middle
          i2 = FindIndexOfClosingParenthesis(str.substring(i + 1));
          if(i2 != null){
            delta = i2 + 1;//adding one accounts for the shift because we used a substring
          }
          else{
            console.log("couldn't find closing parentheses");
          }
        }
        else if(str[i] == "{"){
          //we need to find the closing bracekt and not parse anything in th middle
          i2 = FindIndexOfClosingBracket(str.substring(i + 1));
          if(i2 != null){
            delta = i2 + 1;//adding one accounts for the shift because we used a substring
          }
          else{
            console.log("couldn't find closing bracket");
          }
        }
      }

      i += delta;
    }
    //then when we are done with the while loop we have to add the rest of the expression into the "splittedExpressions" array because there is no operator at the end of the string
    splittedExpressions.push({
      parsed: false,
      str: RemoveDifferentialOperatorDFromLatexString(str.substring(startIndex, i)).replace(/\\oint/g,"\\int"),
      rawStr: str.substring(startIndex, i),
      operator: null,
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
        let unitsLatexExpression = ReplaceVariablesWithUnitsInLatex(RemoveDifferentialOperatorDFromLatexString(exprs[i][j].rawStr));
        //now that we have parsed the latex string into a mathjs readable string we evaluate it and grab any errors
        //that math js throws and interprets them for the user
        try {
          math.evaluate(exprs[i][j].str).toString();
          results[i].push({success: exprs[i][j].str, operator: exprs[i][j].operator, latexExpression: exprs[i][j].rawStr, unitsLatexExpression: unitsLatexExpression});//we are passing in the raw string because in the raw format we can replace radians, steradians and vectors and we don't have to worry about them being a part of some division. For example the evaluate str could be "1 m/rad" so replacing "rad" with "" would break it. the unevaluated will never break "(1 m)/(1 rad)" -> "(1 m)/(1 )"
        }
        catch(err){
          //we need to check what the error was and if it doesn't have to do with demensions being incorrect and with units then we will continue tyring to figure out if the units are correct or not
          if(/Dimension mismatch\. Matrix A \(\d*\) must match Matrix B \(\d*\)/.test(err.message)){
            results[i].push({error: "Dimension mismatch. Adding vectors with different amount of demension"});
          }else{
            //if it throws an error then we can try evaluating the string but taking out radians and steradians because they are untiless pretty much but the editor see them as units
            try {
              math.evaluate(exprs[i][j].str.replace(/rad/g,"").replace(/sr/g,"")).toString();
              results[i].push({success: exprs[i][j].str, operator: exprs[i][j].operator, latexExpression: exprs[i][j].rawStr, unitsLatexExpression: unitsLatexExpression});//we are passing in the raw string because in the raw format we can replace radians, steradians and vectors and we don't have to worry about them being a part of some division. For example the evaluate str could be "1 m/rad" so replacing "rad" with "" would break it. the unevaluated will never break "(1 m)/(1 rad)" -> "(1 m)/(1 )"
            }
            catch(err2){
              //we need to check what the error was and if it doesn't have to do with demensions being incorrect and with units then we will continue tyring to figure out if the units are correct or not
              if(/Dimension mismatch\. Matrix A \(\d*\) must match Matrix B \(\d*\)/.test(err2.message)){
                results[i].push({error: "Dimension mismatch. Adding vectors with different amount of demension"});
              }else{
                try{
                  //by removing the vector unit we can figure out if the units don't match because the user is adding a scalar with a vector
                  math.evaluate(exprs[i][j].str.replace(/rad/g,"").replace(/sr/g,"").replace(/vector/g,"")).toString();
                  results[i].push({error: "Adding a scalar with a vector"});
                }
                catch(err3){
                  //we need to check what the error was and if it doesn't have to do with demensions being incorrect and with units then we will continue tyring to figure out if the units are correct or not
                  if(/Dimension mismatch\. Matrix A \(\d*\) must match Matrix B \(\d*\)/.test(err.message)){
                    results[i].push({error: "Dimension mismatch. Adding vectors with different amount of demension"});
                  }else{
                    results[i].push({error: err2.message, latexExpression: exprs[i][j].rawStr, unitsLatexExpression: unitsLatexExpression});
                  }  
                }
              }
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

  results.map(function(r){

    let successes = {
      str: [],
      operators: [],
      latexExpressions: [],
      unitsLatexExpressions: [],
    };
    let possiblySolvableExpressions = [];
    let errors = [];
    r.map(function(data){

      if(data.success != undefined){
        successes.str.push(data.success);
        successes.operators.push(data.operator);
        successes.latexExpressions.push(data.latexExpression);
        successes.unitsLatexExpressions.push(data.unitsLatexExpression);
      }

      if(data.undefinedExpression != undefined && data.undefinedVariables.length == 1){
        possiblySolvableExpressions.push({expression: data.undefinedExpression, undefinedVariable: data.undefinedVariables[0]});
      }

      if(data.error != undefined){
        errors.push({error: data.error, latexExpression: data.latexExpression, unitsLatexExpression: data.unitsLatexExpression});
      }

    });

    let equationUnits = "";
    if(successes.str.length > 1){

      //console.log("successes",successes);

      let allExpressionsUnitsEqualAndNoErrors = true;
      for(let i = 0; i + 1 < successes.str.length; i++){
        let stringToBeComparedForUnits = [successes.str[i], successes.str[i+1]];
        //console.log("stringToBeComparedForUnits",stringToBeComparedForUnits);
        //check if units match for success equations
        let equationUnitsMatch = false;
        let settingScalarToVector = false;
        let demensionMismatch = false;// setting vectors with different amount of dimesions equal to each other

        try {
          //trying to add the units of each equation and see if they add if they don't then they are not the same unit so an error will occur
          equationUnits = math.evaluate(stringToBeComparedForUnits.join(" + ")).toString();
          equationUnitsMatch = true;
        }
        catch(err){

          //we need to check what the error was and if it doesn't have to do with demensions being incorrect and with units then we will continue tyring to figure out if the units are correct or not
          if(/Dimension mismatch\. Matrix A \(\d*\) must match Matrix B \(\d*\)/.test(err.message)){
            demensionMismatch = true;
          }else{
            //removing rad and steradian from equations to see if they will equal each other because the editor can't recorgnize the arc formula  s=r\theta cuz units wise you are saying 1m=1m*rad
            let editedSuccesses = [
              stringToBeComparedForUnits[0].replace(/rad/g,"").replace(/sr/g,""),
              stringToBeComparedForUnits[1].replace(/rad/g,"").replace(/sr/g,""),
            ];

            try{
              equationUnits = math.evaluate(editedSuccesses.join(" + ")).toString();
              equationUnitsMatch = true;
            }
            catch(err2){
              equationUnitsMatch = false;

              //we need to check what the error was and if it doesn't have to do with demensions being incorrect and with units then we will continue tyring to figure out if the units are correct or not
              if(/Dimension mismatch\. Matrix A \(\d*\) must match Matrix B \(\d*\)/.test(err2.message)){
                demensionMismatch = true;
              }else{
                try{
                  //removing vector math js key words to see if the problem is setting scalar equal to a vector
                  editedSuccesses[0] = editedSuccesses[0].replace(/vector/g,"");
                  editedSuccesses[1] = editedSuccesses[1].replace(/vector/g,"");
                  //console.log("editedSuccesses", editedSuccesses);
                  math.evaluate(editedSuccesses.join(" + ")).toString();
                  settingScalarToVector = true;
  
                }
                catch(err3){
                  //console.log(err3);
                  settingScalarToVector = false;
                }
              }
            }
          }

          

        }

        if(!equationUnitsMatch){
          if(settingScalarToVector){
            //we are going to add this information to the correct mathfield that has this error
            MathFields[mfID].log.error.push({
              error: EL.createLoggerErrorFromMathJsError("Setting a vector equal to scalar"),
            });
            
            //if we got an error then one of the expressions units don't equal anothers
            allExpressionsUnitsEqualAndNoErrors = false;
            break;
          }else if(demensionMismatch){
            CreateInlineMathFieldError({
              mfID: mfID,
              error: "Demension mismatch. Setting to vectors with a different number of demensions equal to each other",
            });
            allExpressionsUnitsEqualAndNoErrors = false;
          }
          else{
            //we are going to add this information to the correct mathfield that has this error
            MathFields[mfID].log.error.push({
              error: EL.createLoggerErrorFromMathJsError("Units do not equal each other"),
              latexExpressions: [
                `\\text{${successes.operators[i] == '=' ? 'Equation' : 'Inequality'}}\\ ${successes.latexExpressions[i]} ${successes.operators[i]} ${successes.latexExpressions[i+1]}`,
                `\\text{${successes.operators[i] == '=' ? 'Equation' : 'Inequality'} Units}\\ ${successes.unitsLatexExpressions[i]} \\neq ${successes.unitsLatexExpressions[i+1]}`,
              ],
            });

            //if we got an error then one of the expressions units don't equal anothers
            allExpressionsUnitsEqualAndNoErrors = false;
            break;
          }
        }

      }

      //after the for loop if "allExpressionsUnitsEqualAndNoErrors" is still true then that means that we didn't have any errors comparing all the expressions on this line
      if(allExpressionsUnitsEqualAndNoErrors){
        //if all the expressions units match then we should do a high level self consistency check
        EL.linesToCheckForSelfConsistency.push(lineNumber);
      }



    }
    else{
      try {
        //trying to add the units of each equation and see if they add if they don't then they are not the same unit so an error will occur
        equationUnits = math.evaluate(successes.str[0]).toString();
      }
      catch(err){
        equationUnits = "";//couldn't get unit information from mathjs equation with all defined units
      }
    }


    if(equationUnits != ""){//that means that there is an equation or equations that have matched units that could help us defined the each variable in each of our possiblySolvableExpressions array
      //if the equations match then we can use these equations to defined the single undefined variables that may exist
      let knownUnitStringConstant = `__knownUnit`;

      for(var c = 0; c < possiblySolvableExpressions.length; c++){
        let uniqueRIDStringArray = UpdateUniqueRIDStringObjUsingLs(possiblySolvableExpressions[c].expression);//this generates an object that relates each variable to a unique rid string so that it is easier for nerdamer to parse to the equation
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

      //we are going to add this information to the correct mathfield that has this error
      MathFields[mfID].log.warning.push({
        warning: "Undefined Variables",
        variables: trulyUndefinedVars,
      });

    }


    if(errors.length > 0){
      errors.map(function(error, index){
        // we are going to add this information to the correct mathfield that has this error
        // we are adding this manually and not with "CreateInlineMathFieldError" because that function checks if the error type already exists but with
        // this setup we don't care if the error type already exist because there may be multiple errors of the same type on one line
        MathFields[mfID].log.error.push({
          error: EL.createLoggerErrorFromMathJsError(error.error),
          latexExpressions: error.latexExpression == undefined || error.unitsLatexExpression == undefined ? undefined : [
            `\\text{Expression}\\ ${error.latexExpression}\\ \\Rightarrow ${error.unitsLatexExpression}`,
          ],
        });
      });
    }


  });

  if(recordedDefinitionForUndefinedVariable){
    EL.ParsePreviousLinesAgainWithNewInfoAboutUndefinedVariables(lineNumber);
  }

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

function ReplaceVariablesWithUnitsInLatex(ls){
  let vars = Object.keys(DefinedVariables).concat(Object.keys(PreDefinedVariables)).concat(Object.keys(EL.undefinedVars.defined));
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

        //we need to check if this variable is a vector and if so then we have to format unitsMathjs variable differently
        let unitsLatex = variable.unitsLatex;
        foundMatch = true;
        delta = vars[c].length;

        newLs += `\\mathrm{${unitsLatex}}`;

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

  //before we return this string we want to take care of one edge case where two variables are being multiplied by each other but the multiplication is not explicit. For example v*v -> vv which would return \\mathrm{v}\\mathrm{v} which doesn't look good unless there is a \\cdot multplication in between
  //first we need to take out any unnecessary spaces 
  newLs = newLs.replace(/\\\s/g,"");
  //then we need to replace "}\\mathrm{" with "} \\cdot \\mathrm{"
  newLs = newLs.replace(/\}\\mathrm\{/g,"}\\cdot\\mathrm{")

  return newLs;

}

function ReplaceVariablesWithMathjsUnits(ls){
  let vars = Object.keys(DefinedVariables).concat(Object.keys(PreDefinedVariables)).concat(Object.keys(EL.undefinedVars.defined));
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
          //console.log("Error occured trying to parse vector into MathJs Vector");
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
  ls = ls.replace(/\\hat\{[\s\d\w\\\^\-]*\}/g,"1");
  ls = ReplaceVariablesWithUniqueRIDString(ls, uniqueRIDStringArray);//this object holds
  ls = CleanLatexString(ls, ["fractions","addition","parentheses","brackets", "white-space"]);
  ls = CleanLatexString(ls,["multiplication"]);
  ls = CleanLatexString(ls,["latexFunctions"]);
  try{
    let convertedLs = nerdamer.convertFromLaTeX(ls).toString();
    return convertedLs;
  }catch(err){
    return ls;
  }
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
      let nerdamerFunctions = ["integrate(","limit(","matrix(","abs(","vector(","dot(","cross(", "log(","log10(","diff("];
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
        }else if(s.indexOf(uniqueRIDStringArray[c].partialDifferentialVariable) == 0){
          foundMatch = true;
          delta = uniqueRIDStringArray[c].partialDifferentialVariable.length;
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

function GetAllUniqueRIDStringsArray(){
  let allUniqueRIDStrings = [];
  for(const[key, value] of Object.entries(UniqueRIDStringObj)){
    allUniqueRIDStrings.push(value);
  }

  allUniqueRIDStrings = allUniqueRIDStrings.sort((a,b) => {return b.variable.length - a.variable.length});

  return allUniqueRIDStrings;
}

function UpdateUniqueRIDStringObjUsingLs(ls){

  let vars = GetVariablesFromLatexString(ls);
  let existingKeys = Object.keys(UniqueRIDStringObj);
  //regardless if they are being used in the ls all uniqueRIDStringArrays should have ridString data on all
  //the different unit vectors because some functions may need to refrence this data even if the unit vector
  //doesn't appear in the ls string
  vars = vars.concat(["\\hat{x}","\\hat{i}","\\hat{r}","\\hat{y}", "\\hat{j}","\\hat{\\theta}","\\hat{z}","\\hat{k}","\\hat{\\phi}","\\dim{1}","\\dim{2}","\\dim{3}"]);
  vars = vars.filter((value, index, self) => {return self.indexOf(value) == index});
  let array = [];
  //we need to organize vars from longest variable to shortest variable just incase a long variable has a piece of a shorter variable in it
  vars.sort(function(a,b){
  	if(a.length > b.length){
    	return -1;
    }
    else{
    	return 1;
    }
  });

  
  for(let i = 0; i < vars.length; i++){
    if(vars[i] != "\\pi" && vars[i] != "i" && vars[i] != "e"){//we are not going to convert these two variables because they are predefined and understood by nerdamer if you use the convertFromLaTeX function
      if(!existingKeys.includes(vars[i])){//this is checking that we don't already have an rid for this variable
      let space = "";//this is becauase if the text after "\\partial" is a latex keyword then there is no space but if it isn't a latex key word there is a space. Exmaple "\\partial d" and "\\partial\\theta"
      //checking if the variable is not a latex keyword. and if it is not we need a space between "\\partial" and the variable string
      if(vars[i][0] != "\\"){space = " ";}  
      UniqueRIDStringObj[vars[i]] = {
          variable: vars[i],
          ridString: `__${RandomVariableString()}`,
          differentialVariable: `d${vars[i]}`,
          partialDifferentialVariable: `\\partial${space + vars[i]}`,
          differentialRidString: `__${RandomVariableString()}`,
        };
      }
      array.push(UniqueRIDStringObj[vars[i]]);
    }

    
  }

  return array;
}

function UpdateUniqueRIDStringObj(variable){

  let space = "";//this is becauase if the text after "\\partial" is a latex keyword then there is no space but if it isn't a latex key word there is a space. Exmaple "\\partial d" and "\\partial\\theta"
  //checking if the variable is not a latex keyword. and if it is not we need a space between "\\partial" and the variable string
  if(variable[0] != "\\"){space = " ";}  

  UniqueRIDStringObj[variable] = {
    variable: variable,
    ridString: `__${RandomVariableString()}`,
    differentialVariable: `d${variable}`,
    partialDifferentialVariable: `\\partial${space + variable}`,
    differentialRidString: `__${RandomVariableString()}`,
  };

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
        partialDifferentialVariable: `\\partial ${vars[i]}`,
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
      "\\\\sinh": "sinh",
      "\\\\arcsin": "asin",
      "\\\\operatorname\\{arcsinh\\}": "asinh",
      "\\\\operatorname\\(arcsinh\\)": "asinh",
      "\\\\cos": "cos",
      "\\\\cosh": "cosh",
      "\\\\arccos": "acos",
      "\\\\operatorname\\{arccosh\\}": "acosh",
      "\\\\operatorname\\(arccosh\\)": "acosh",
      "\\\\tan": "tan",
      "\\\\tanh": "tanh",
      "\\\\arctan": "atan",
      "\\\\arctanh": "atanh",
      "\\\\cot": "cot",
      "\\\\coth": "coth",
      "\\\\operatorname\\{arccot\\}": "acot",
      "\\\\operatorname\\(arccot\\)": "acot",
      "\\\\operatorname\\{arccoth\\}": "acoth",
      "\\\\operatorname\\(arccoth\\)": "acoth",
      "\\\\csc": "csc",
      "\\\\operatorname\\{csch\\}": "csch",
      "\\\\operatorname\\(csch\\)": "csch",
      "\\\\operatorname\\{arccsc\\}": "acsc",
      "\\\\operatorname\\(arccsc\\)": "acsc",
      "\\\\operatorname\\{arccsch\\}": "acsch",
      "\\\\operatorname\\(arccsch\\)": "acsch",
      "\\\\sec": "sec",
      "\\\\operatorname\\{sech\\}": "sech",
      "\\\\operatorname\\(sech\\)": "sech",
      "\\\\operatorname\\{arcsec\\}": "asec",
      "\\\\operatorname\\(arcsec\\)": "asec",
      "\\\\operatorname\\{arcsech\\}": "asech",
      "\\\\operatorname\\(arcsech\\)": "asech",
      "\\\\ln": "ln",
      "\\\\log\\s*\\\\left\\(": "log10(",
      "\\\\log\\s*\\(": "log10(",
      "\\\\log": "log10",
      "\\\\int": "",
      "\\\\lim": "",
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
            console.log("trouble finding closing parenthesis for integral");
            break;
          }
        }
        else{
          ls = ls.substring(0,i1) + ls.substring(i2 + 1);//removing integral formatted as: \int_(...)
        }
      }
      else{//theere was trouble finding the closing bracket so just stop
        console.log("trouble finding closing parenthesis for integral");
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

    while(ls.indexOf("\\lim_(") != -1){
      i1 = ls.indexOf("\\lim_(");
      i2 = FindIndexOfClosingParenthesis(ls.substring(i1 + "\\lim_(".length));
      if(i2 != null){
        i2 += i1 + "\\lim_(".length;//accounts for the shift because we used a substring of ls
        if(ls[i2 + 1] == "^"){//this means the integral is formated like: \int_(...)^(...)
          i3 = FindIndexOfClosingParenthesis(ls.substring(i2 + 3));
          if(i3 != null){
            i3 += i2 + 3;//adjust for shift
            ls = ls.substring(0,i1) + ls.substring(i3 + 1);//removing integral formatted as: \int_(...)^(...)
          }
          else{//theere was trouble finding the closing bracket so just stop
            console.log("trouble finding closing parenthesis for integral");
            break;
          }
        }
        else{
          ls = ls.substring(0,i1) + ls.substring(i2 + 1);//removing integral formatted as: \int_(...)
        }
      }
      else{//theere was trouble finding the closing bracket so just stop
        console.log("trouble finding closing parenthesis for integral");
        break;
      }
    }

    for(let operation of ["sum", "prod"]){
      //this code clear sums from ls string that look like \sum_(...)^(...) or \sum ^(...)
      while(ls.indexOf(`\\${operation}_(`) != -1){
        i1 = ls.indexOf(`\\${operation}_(`);
        i2 = FindIndexOfClosingParenthesis(ls.substring(i1 + `\\${operation}_(`.length));
        if(i2 != null){
          i2 += i1 + `\\${operation}_(`.length;//accounts for the shift because we used a substring of ls
          if(ls[i2 + 1] == "^"){//this means the integral is formated like: \int_(...)^(...)
            i3 = FindIndexOfClosingParenthesis(ls.substring(i2 + 3));
            if(i3 != null){
              i3 += i2 + 3;//adjust for shift
              ls = ls.substring(0,i1) + ls.substring(i3 + 1);//removing integral formatted as: \int_(...)^(...)
            }
            else{//theere was trouble finding the closing bracket so just stop
              console.log("trouble finding closing parenthesis for integral");
              break;
            }
          }
          else{
            ls = ls.substring(0,i1) + ls.substring(i2 + 1);//removing integral formatted as: \int_(...)
          }
        }
        else{//theere was trouble finding the closing bracket so just stop
          console.log("trouble finding closing parenthesis for integral");
          break;
        }
      }

      while(ls.indexOf(`\\${operation} ^(`) != -1){
        i1 = ls.indexOf(`\\${operation} ^(`);
        i2 = FindIndexOfClosingParenthesis(ls.substring(i1 + `\\${operation} ^(`.length));
        if(i2 != null){
          i2 += i1 + `\\${operation} ^(`.length;//accounts for the shift because we used a substring of ls
          ls = ls.substring(0,i1) + ls.substring(i2 + 1);//removing integral formatted as: \int^(...)
        }
        else{//theere was trouble finding the closing bracket so just stop
          console.log("trouble finding closing bracket for integral");
          break;
        }
      }
    }
    

    //we need to replace all custom logs like log base 2 or log base 4.5 and so on with a function that can actually parse these logs 
    //we want to convert something like this "\\log_{number}(expression)" to this "customLog(number, expression)"
    while(ls.indexOf("\\log_{") != -1){
      i1 = ls.indexOf("\\log_{");
      i2 = FindIndexOfClosingBracket(ls.substring(i1 + "\\log_{".length));
      if(i2 != null){
        i2 += i1 + "\\log_{".length;//accounts for the shift because we used a substring of ls
        //now that we have found the closing bracket we want to check that the stuff inside of it is a number otherwise we just break out of this while loop and give up
        if(isNaN(ls.substring(i1 +  "\\log_{".length, i2))){
          //if the if statement returns true than that means the string inside the log is not a number
          break;
        }
        else{
          //the string inside is a number
          if(ls.substring(i2 + 1).indexOf("\\left(") == 0){
            ls = `${ls.substring(0, i1)}customLog(${ls.substring(i1 +  "\\log_{".length, i2)},${ls.substring(i2 + 1 + "\\left(".length)}`;
          }
          else if(ls.substring(i2 + 1).indexOf("(") == 0){//this means the user has put parentheses after the custom log which means it is formatted properly to parse it and change it to a "customLog"
            ls = `${ls.substring(0, i1)}customLog(${ls.substring(i1 +  "\\log_{".length, i2)},${ls.substring(i2 + 1 + "(".length)}`;
          }
          else{
            break;//because the user hasn't yet formatted the string properly. they need to have something like "\\log_{number}(expression)" or "\\log_{number}()"
          }
          
        }
      }
      else{//theere was trouble finding the closing bracket so just stop
        console.log("trouble finding closing bracket");
        break;
      }
    }

    //we want to convert something like this "\\log_{}"
    while(ls.indexOf("\\log_(") != -1){
      i1 = ls.indexOf("\\log_(");
      i2 = FindIndexOfClosingParenthesis(ls.substring(i1 + "\\log_(".length));
      if(i2 != null){
        i2 += i1 + "\\log_(".length;//accounts for the shift because we used a substring of ls
        //now that we have found the closing bracket we want to check that the stuff inside of it is a number otherwise we just break out of this while loop and give up
        if(isNaN(ls.substring(i1 +  "\\log_(".length, i2))){
          //if the if statement returns true than that means the string inside the log is not a number
          break;
        }
        else{
          //the string inside is a number
          if(ls.substring(i2 + 1).indexOf("\\left(") == 0){
            ls = `${ls.substring(0, i1)}customLog(${ls.substring(i1 +  "\\log_(".length, i2)},${ls.substring(i2 + 1 + "\\left(".length)}`;
          }
          else if(ls.substring(i2 + 1).indexOf("(") == 0){//this means the user has put parentheses after the custom log which means it is formatted properly to parse it and change it to a "customLog"
            ls = `${ls.substring(0, i1)}customLog(${ls.substring(i1 +  "\\log_(".length, i2)},${ls.substring(i2 + 1 + "(".length)}`;
          }
          else{
            break;//because the user hasn't yet formatted the string properly. they need to have something like "\\log_{number}(expression)" or "\\log_{number}()"
          }
        }
      }
      else{//theere was trouble finding the closing bracket so just stop
        console.log("trouble finding closing parenhesis");
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

function FindAndParseVectorMultiplication(opts){
  //the first thing we need to do is convert all vectors into matrixes so we can parse them later
  let ls = FindAndConvertAllVectorsIntoNerdamerMatrixesForLs(opts.ls);
  ls = FindAndEvaluateVectorMultiplication(Object.assign(opts, {ls: ls}));
  //console.log("ls2", ls);
  return ls;
}

function FindAndConvertAllVectorsIntoNerdamerMatrixesForLs(ls){
  let newLs = "";
  let s;
  let i = 0;
  let i2 = 0;
  let i3 = 0;
  let delta = 0;
  let foundMatch = false;
  while(i < ls.length){
    foundMatch = false;
    delta = 1;
    s = ls.substring(i);
    if(s.indexOf("\\hat{") == 0 || s.indexOf("\\dim{") == 0){
      //trying to convert unit vectors to nerdamer matrix
      i2 = FindIndexOfClosingBracket(s.substring("\\hat{".length));//we can choose to use the string "\\hat{" or "\\dim{" because they are the same length
      if(i2 != null){
        foundMatch = true;
        //we can choose to use the string "\\hat{" or "\\dim{" because they are the same length
        i2 += "\\hat{".length;//accounts for substring displacement
        delta = i2 + 1;
        let unitVectorStr = s.substring(0, i2 + 1);
        if(unitVectorStr == "\\dim{1}"){
          newLs += " matrix([\\dim{1}, 0, 0])";
        }else if(unitVectorStr == "\\dim{2}"){
          newLs += " matrix([0, \\dim{2}, 0])";
        }else if(unitVectorStr == "\\dim{3}"){
          newLs += " matrix([0, 0, \\dim{3}])";
        }else if(unitVectorStr == "\\hat{x}"){
          newLs += " matrix([\\hat{x}, 0, 0])";
        }else if(unitVectorStr == "\\hat{y}"){
          newLs += " matrix([0, \\hat{y}, 0])";
        }else if(unitVectorStr == "\\hat{z}"){
          newLs += " matrix([0, 0, \\hat{z}])";
        }else if(unitVectorStr == "\\hat{i}"){
          newLs += " matrix([\\hat{i}, 0, 0])";
        }else if(unitVectorStr == "\\hat{j}"){
          newLs += " matrix([0, \\hat{j}, 0])";
        }else if(unitVectorStr == "\\hat{k}"){
          newLs += " matrix([0, 0, \\hat{k}])";
        }else if(unitVectorStr == "\\hat{r}"){
          newLs += " matrix([\\hat{r}, 0, 0])";
        }else if(unitVectorStr == "\\hat{\\theta}"){
          newLs += " matrix([0, \\hat{\\theta}, 0])";
        }else if(unitVectorStr == "\\hat{\\phi}"){
          newLs += " matrix([0, 0, \\hat{\\phi}])";
        }else{
          //this means that this is a custom unit vector so we need to make a general matrix that relates this generic unit vector with a general vector with demensions "n"
          //comp1 stands for "component one" the first component of this general vector 
          newLs +=` matrix([\\comp1{${unitVectorStr}}\\dim{1}, \\comp2{${unitVectorStr}}\\dim{2}, \\comp3{${unitVectorStr}}\\dim{3}])`
        }
      }else{return null;}
    }

    if(!foundMatch && (s.indexOf("\\comp1{") == 0 || s.indexOf("\\comp2{") == 0 || s.indexOf("\\comp3{") == 0)){
      //trying to convert generic vectors to nerdamer matrix
      i2 = FindIndexOfClosingBracket(s.substring("\\comp1{".length));
      if(i2 != null){
        foundMatch = true;
        i2 += "\\comp1{".length;
        delta = i2 + 1;
        newLs += s.substring(0, i2 + 1);
      }else{return null;}
    }

    if(!foundMatch && s.indexOf("\\vec{0}") == 0){
      //the zero vector should be treated different then a regular vector because we know what the zero vector is suppose to evaluate to
      foundMatch = true;
      delta = "\\vec{0}".length;
      newLs += ` matrix([0*\\dim{1}, 0*\\dim{2}, 0*\\dim{3}])`
    }

    if(!foundMatch && s.indexOf("\\vec{") == 0){
      //trying to convert generic vectors to nerdamer matrix
      i2 = FindIndexOfClosingBracket(s.substring("\\vec{".length));
      if(i2 != null){
        foundMatch = true;
        i2 += "\\vec{".length;
        delta = i2 + 1;
        let generalVectorStr = s.substring(0, i2 + 1);
        let vectorComponents = GetStoredVariableInfo(generalVectorStr).components;
        let coordinateSystemUsedInVector = vectorComponents != undefined ? vectorComponents.coordinateSystem : undefined;
        let vectorMatrixString = "";
        //based on the coordinate system used by the vector we will add a different matrix string to the newLs
        if(coordinateSystemUsedInVector == "cartesianXYZ"){
          vectorMatrixString = ` matrix([\\comp1{${generalVectorStr}}\\hat{x}, \\comp2{${generalVectorStr}}\\hat{y}, \\comp3{${generalVectorStr}}\\hat{z}])`;
        }else if(coordinateSystemUsedInVector == "cartesianIJK"){
          vectorMatrixString = ` matrix([\\comp1{${generalVectorStr}}\\hat{i}, \\comp2{${generalVectorStr}}\\hat{j}, \\comp3{${generalVectorStr}}\\hat{k}])`;
        }else if(coordinateSystemUsedInVector == "cylindrical"){
          vectorMatrixString = ` matrix([\\comp1{${generalVectorStr}}\\hat{r}, \\comp2{${generalVectorStr}}\\hat{\\theta}, \\comp3{${generalVectorStr}}\\hat{z}])`;
        }else if(coordinateSystemUsedInVector == "spherical"){
          vectorMatrixString = ` matrix([\\comp1{${generalVectorStr}}\\hat{r}, \\comp2{${generalVectorStr}}\\hat{\\theta}, \\comp3{${generalVectorStr}}\\theta{\\phi}])`;
        }else{
          // if "coordinateSystemUsedInVector" doesn't equal any of those values then it either equals "generic" or undefined. Either way the default string is the one below
          vectorMatrixString = ` matrix([\\comp1{${generalVectorStr}}\\dim{1}, \\comp2{${generalVectorStr}}\\dim{2}, \\comp3{${generalVectorStr}}\\dim{3}])`;
        }
        newLs += vectorMatrixString;
      }else{return null;}
    }

    if(!foundMatch && s.indexOf("\\left[") == 0){
      //trying to convert explicit vector to nerdamer matrix. example [a,b,c] -> [(a)\\dim{1}, (b)\\dim{2}, (c)\\dim{3}]
      i2 = FindIndexOfClosingSquareBracket(s.substring("\\left[".length));
      if(i2 != null){
        foundMatch = true;
        i2 += "\\left[".length;
        delta = i2 + 1;
        //this line of code that split it by "," alone is not the most secure way of doing this because you could hvae a comma in a variable definition so later we need to fix this function and do more 
        let vectorComponents = s.substring("\\left[".length, i2 - "\\right".length).split(",");//if the vector is "[a,b,c]" this substring returns "a,b,c" then we split it using the delimeter "," to get ["a","b","c"]
        let formattedComponents = vectorComponents.map((value,index) => {
          // if the demension goes above 3 we need to make sure that we add higher demesions to the UniqueRIDStringObj if the ridString for the demension "\\dim{n}" doesn't exist
          if(UniqueRIDStringObj[`\\dim{${index + 1}}`] == undefined){
            UpdateUniqueRIDStringObj(`\\dim{${index + 1}}`);
          }
          return `(${value})*\\dim{${index + 1}}`
        });
        //now we have an array that looks like ["(a)*\\dim{1}","(b)*\\dim{2}","(c)*\\dim{3}"]
        newLs += ` matrix([${formattedComponents.join(",")}])`

      }else{return null;}
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

function FindAndEvaluateVectorMultiplication(opts){
  let ls = opts.ls;
  //this function is based off of the function "FindAndWrapVectorsThatAreBeingMultiplied"
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
    i2 = s.indexOf("\\left(");//we are finding the next index of a paretheses to see if what it incloses has a "\\times" or "\\cdot" operator
    if(i2 != -1){
      newLs += s.substring(0, i2 + "\\left(".length);//adding everything before the parentheses
      i3 = FindIndexOfClosingParenthesis(s.substring(i2 + "\\left(".length));
      if(i3 != null){
        i3 += i2 + "\\left(".length;//accounts for shift because we used a substring of "s"
        //now that we know the closing parentheses and opening we are going to check if there is a "\\times" or "\\cdot" operator in it
        let stringInsideParentheses = s.substring(i2 + "\\left(".length, i3 - "\\right".length);
        if(stringInsideParentheses.indexOf("\\times") != -1 || stringInsideParentheses.indexOf("\\cdot") != -1){
          stringInsideParentheses = FindAndEvaluateVectorMultiplication({
            ls: stringInsideParentheses,
            uniqueRIDStringArray: opts.uniqueRIDStringArray,
            lineNumber: opts.lineNumber,
            mfID: opts.mfID,
          });
          if(stringInsideParentheses == null){return null;}
        }
        newLs += stringInsideParentheses;//adding everything inside the parentheses
        delta = i3 - "\\right".length;
      }
      else{
        console.log("error couldn't find closing parentheses");
        return null;
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

    let v1StartIndex = FindFirstMatrixStartIndex(newLs, multiply.index);
    let v2EndIndex = FindSecondMatrixEndIndex(newLs, multiply.index + multiply.type.length);//we want to start parsing everything after the multiplication operator

    if(v1StartIndex != null && v2EndIndex != null){
      //this string removes the multiplication operator and tries to evaluate the vector multiplication and then push the result into the orginal string
      let evaluatedVectorMultiplicationLs = null;//this variable will hold the latex string of the multplication evalauted if that be a dot product or cross product both of them will return a latex string 
      
      //console.log("matrix 1 ls", newLs.substring(v1StartIndex, multiply.index));

      let matrix1ls = newLs.substring(v1StartIndex, multiply.index);
      let matrix1UniqueRIDStringArray = UpdateUniqueRIDStringObjUsingLs(matrix1ls.replace(/matrix\(\[/g,"(["));//we put this replace function because this ls may have characters that are generated for nerdamer and that didn't appear in the original ls string the user gave us
      let matrix1Evaluated = ExactConversionFromLatexStringToNerdamerReadableString({
        ls: matrix1ls,
        uniqueRIDStringArray: matrix1UniqueRIDStringArray,
        lineNumber: opts.lineNumber,
        mfID: opts.mfID,
        throwError: opts.throwError,
        convertVectorsToNerdamerMatrices: false,
      });

      //console.log("matrix 2 ls", newLs.substring(multiply.index + multiply.type.length, v2EndIndex + 1));

      let matrix2ls = newLs.substring(multiply.index + multiply.type.length, v2EndIndex + 1);
      let matrix2UniqueRIDStringArray = UpdateUniqueRIDStringObjUsingLs(matrix2ls.replace(/matrix\(\[/g,"(["));//we put this replace function because this ls may have characters that are generated for nerdamer and that didn't appear in the original ls string the user gave us
      let matrix2Evaluated = ExactConversionFromLatexStringToNerdamerReadableString({
        ls: matrix2ls,
        uniqueRIDStringArray: matrix2UniqueRIDStringArray,
        lineNumber: opts.lineNumber,
        mfID: opts.mfID,
        throwError: opts.throwError,
        convertVectorsToNerdamerMatrices: false,
      });

      if(matrix1Evaluated == null || matrix2Evaluated == null){
        return null;
      }

      //console.log("matrix1Evaluated,matrix2Evaluated");      
      //console.log(matrix1Evaluated,matrix2Evaluated);

      if(multiply.func == "myCrossProduct"){

        //before we do the determinant of the matrix of 2 vectors and coordinate system to get the cross product we need to first figure out what coordinate system we are using and then remove all the unit vectors from the first two vectors in the determinate
        let rawCrossProduct = TryToCalculateCrossProductGivenTwoMatrices({
          matrix1: matrix1Evaluated,
          matrix2: matrix2Evaluated,
          lineNumber: opts.lineNumber,
          mfID: opts.mfID,
        });

        if(rawCrossProduct != null){//matrix == null then there was an error trying to figure out the coordinate system
          evaluatedVectorMultiplicationLs  = ReplaceUniqueRIDStringWithVariableLs(rawCrossProduct, matrix1UniqueRIDStringArray.concat(matrix2UniqueRIDStringArray));
        }
        

      }else if(multiply.func == "myDotProduct"){
        //this is a raw dot proudct because there are some checks and cleaning we need to do for this dot product to be ready to be inserted back into the original string
        let rawDotProduct = nerdamer(`matget(transpose(transpose(${matrix1Evaluated}) * ${matrix2Evaluated}),0,0)`).toString();
        
        //this makes sure that raw dot product is formatted properly so it can be converted back to an ls and represent what it is suppose to represent as a dot product
        let cleanDotProduct = CleanRawDotProduct({
          str: rawDotProduct,
          uniqueRIDStringArray: opts.uniqueRIDStringArray,
          lineNumber: opts.lineNumber,
          mfID: opts.mfID,
        });

        //console.log("clean dot product", cleanDotProduct);

        if(cleanDotProduct != null){
          evaluatedVectorMultiplicationLs = ReplaceUniqueRIDStringWithVariableLs(cleanDotProduct, GetAllUniqueRIDStringsArray());
        }
      }

      //console.log("evaluatedVectorMultiplicationLs", evaluatedVectorMultiplicationLs);

      

      if(evaluatedVectorMultiplicationLs != null){
        if(multiply.func == "myCrossProduct"){
          
          //console.log("piece 1", `${newLs.substring(0,v1StartIndex)}`);
          //console.log("piece 2", `${newLs.substring(v2EndIndex + 1)}`);

          let resultingVectorMatrix;

          if(evaluatedVectorMultiplicationLs == "0"){
            resultingVectorMatrix = "matrix([0*\\dim{1},0*\\dim{2},0*\\dim{3}])"
          }else{
            //we do this because the cross product returns a vector but this vector is not a matrix at the
            //momement it is just a string of ls variables that need to be parsed into a matrix so we can put it
            //back into the the bigger equation that may be using this vector multiplication
            resultingVectorMatrix = FindAndConvertAllVectorsIntoNerdamerMatrixesForLs(evaluatedVectorMultiplicationLs);
          }

          //console.log("resultingVectorMatrix", resultingVectorMatrix);

          newLs = `${newLs.substring(0,v1StartIndex)} \\left(${resultingVectorMatrix}\\right) ${newLs.substring(v2EndIndex + 1)}`
        }else if(multiply.func == "myDotProduct"){
          //console.log("piece 1", `${newLs.substring(0,v1StartIndex)}`);
          //console.log("piece 2", `${newLs.substring(v2EndIndex + 1)}`);
          newLs = `${newLs.substring(0,v1StartIndex)} \\left(${evaluatedVectorMultiplicationLs}\\right) ${newLs.substring(v2EndIndex + 1)}`;
        }
        
      }else{
        return null;
      }
    }
    else{
      //if we werent able to find a vector on either side of the mutliplication and the multiplication is a dot product then we will just replace the "\\cdot" with "*" because it is not a true dot product
      if(multiply.type == "\\cdot"){
        //replacing "\\cdot" with "*"
        newLs = `${newLs.substring(0,multiply.index)} * ${newLs.substring(multiply.index + multiply.type.length)}`
      }else{
        //if we werent able to find a vector on each side of the operator and the multiplication is a cross prodcut then we need to stop parsing because that means there is an error in how the user formatted their cross product
        return null;
      }
      
    }

  }
  return newLs;

}


function DoExpressionUnitVectorsMatch(opts){
  let response = {
    answer: false,
    str: opts.str,
  };
  if(opts.str == undefined){
    return response;//we don't have all the information we need to run this function
  }

  let str = opts.str;
  
  let coors = {
    generic: {
      label: "\\text{Generic N Demensional Vector}",
      coors: [UniqueRIDStringObj["\\dim{1}"].ridString, UniqueRIDStringObj["\\dim{2}"].ridString, UniqueRIDStringObj["\\dim{3}"].ridString],//generic
      coorsLs: ["\\dim{1}","\\dim{2}","\\dim{3}"],
      unique: [UniqueRIDStringObj["\\dim{1}"].ridString, UniqueRIDStringObj["\\dim{2}"].ridString, UniqueRIDStringObj["\\dim{3}"].ridString],//generic
      uniquePairs: [],
      unallowedUnitVectors: [UniqueRIDStringObj["\\hat{r}"].ridString, UniqueRIDStringObj["\\hat{\\theta}"].ridString, UniqueRIDStringObj["\\hat{z}"].ridString],//r,theta,or z
    },
    cartesianXYZ: {
      label: "\\text{Cartesian}\\ \\left(\\hat{x},\\hat{y},\\hat{z} \\right)",
      coors: [UniqueRIDStringObj["\\hat{x}"].ridString, UniqueRIDStringObj["\\hat{y}"].ridString, UniqueRIDStringObj["\\hat{z}"].ridString],//cartensian
      coorsLs: ["\\hat{x}","\\hat{y}","\\hat{z}"],
      unique: [UniqueRIDStringObj["\\hat{x}"].ridString, UniqueRIDStringObj["\\hat{y}"].ridString],
      uniquePairs: [],
      unallowedUnitVectors: [UniqueRIDStringObj["\\hat{r}"].ridString, UniqueRIDStringObj["\\hat{\\theta}"].ridString],//r or theta
    },
    cartesianIJK: {
      label: "\\text{Cartesian}\\ \\left(\\hat{i},\\hat{j},\\hat{k}\\right)",
      coors: [UniqueRIDStringObj["\\hat{i}"].ridString,UniqueRIDStringObj["\\hat{j}"].ridString,UniqueRIDStringObj["\\hat{k}"].ridString],//cartesian
      coorsLs: ["\\hat{i}","\\hat{j}","\\hat{k}"],
      unique: [UniqueRIDStringObj["\\hat{i}"].ridString,UniqueRIDStringObj["\\hat{j}"].ridString,UniqueRIDStringObj["\\hat{k}"].ridString],//cartesian
      uniquePairs: [],
      unallowedUnitVectors: [UniqueRIDStringObj["\\hat{r}"].ridString, UniqueRIDStringObj["\\hat{\\theta}"].ridString, UniqueRIDStringObj["\\hat{z}"].ridString],//r,theta,or z
    },
    cylindrical: {
      label: "\\text{Cylindrical}\\ \\left(\\hat{r},\\hat{\\theta},\\hat{z}\\right)",
      coors: [UniqueRIDStringObj["\\hat{r}"].ridString,UniqueRIDStringObj["\\hat{\\theta}"].ridString,UniqueRIDStringObj["\\hat{z}"].ridString],//cylindrical
      coorsLs: ["\\hat{r}","\\hat{\\theta}","\\hat{z}"],
      unique: [],
      uniquePairs: [
        [UniqueRIDStringObj["\\hat{r}"].ridString, UniqueRIDStringObj["\\hat{z}"].ridString],
        [UniqueRIDStringObj["\\hat{\\theta}"].ridString,UniqueRIDStringObj["\\hat{z}"].ridString],
      ],
      unallowedUnitVectors: [],
    },
    spherical: {
      label: "\\text{Spherical}\\ \\left(\\hat{r},\\hat{\\theta},\\hat{\\phi}\\right)",
      coors: [UniqueRIDStringObj["\\hat{r}"].ridString,UniqueRIDStringObj["\\hat{\\theta}"].ridString,UniqueRIDStringObj["\\hat{\\phi}"].ridString],//spherical
      coorsLs: ["\\hat{r}","\\hat{\\theta}","\\hat{\\phi}"],
      unique: [UniqueRIDStringObj["\\hat{\\phi}"].ridString],
      uniquePairs: [],
      unallowedUnitVectors: [UniqueRIDStringObj["\\hat{z}"].ridString],//z
    }
  };


  let coorKey = null;
  let coorKey2 = null;
  let foundKey = false;

  for(const [key, value] of Object.entries(coors)){
    foundKey = false;

    //checking if either strings have a unique identify unit vector
    if(value.unique.some((unitVectorRIDString) => {return str.indexOf(unitVectorRIDString) != -1})){
      if(coorKey == null){
        coorKey = key;
        foundKey = true;
      }else{
        coorKey2 = key;
        break
      }
    }

    if(!foundKey){
      //checking if either string has a unique identifing pair of unit vectors
      if(value.uniquePairs.some((pairs) => {return str.indexOf(pairs[0]) != -1 && str.indexOf(pairs[1]) != -1})){
        if(coorKey == null){
          coorKey = key;
        }else{
          coorKey2 = key;
          break
        }
      }
    }

  }

  //after the for loop we have to look at the sate of coorKey and coorKey2 to see if there are two different coordinate systems in the string. Depending on if the one of them is a generic coordinate system that we can possibly erradicate and turn it into a more specific coordinate system

  //lets first check if we found two different coordinate systems
  if(coorKey2 != null){
    // okay now we know that we found two different coordinate systems. The next questions is are one of them generic and if so can we change the generic cooridnate system to a more specific cooridnate system
    let twoDifferentCooridnateSystems = true;
    let nonGenericCoordinateSystem;
    if(coorKey == "generic" || coorKey2 == "generic"){
      //if one of the coordinate systems is generic we will see if we can replace all the generic unit vectors with specific unit vectors
      // the first thing we have to do is check if this string is using higher demensions generic unit vectors like "\\dim{4}" or "\\dim{6}" for example. If they are then we can't convert these generic into a specific cooridnate system of which all of them are only three demensional
      twoDifferentCooridnateSystems = false;
      let i = 0;
      nonGenericCoordinateSystem = coorKey == "generic" ? coorKey2 : coorKey;
      while(UniqueRIDStringObj[`\\dim{${i+1}}`] != undefined){
        if(str.indexOf(UniqueRIDStringObj[`\\dim{${i+1}}`].ridString) != -1){
          //we found a generic unit vector string now we need to see if we can change it or not
          if(i <= 2 ){
            str = str.replace(new RegExp(UniqueRIDStringObj[`\\dim{${i+1}}`].ridString, 'g'), coors[nonGenericCoordinateSystem].coors[i])
          }else{
            //if i is greater than 2 then we are dealing with a higher demensional unit vector that can't be converted to an other coordinate system
            twoDifferentCooridnateSystems = true;
            break;//the minute we find even one higher demensional unit vector that's all we need to say that we can't convert the generic coordinate system to the more specific one
          }
        }
        i++;
      }
    }

    if(twoDifferentCooridnateSystems){
      if(opts.throwError != false){
        CreateInlineMathFieldError({
          mfID: opts.mfID,
          error: "Two different coordinate systems used in expression",
          latexExpressions: [`${coors[coorKey].label}\\ \\text{and}\\ ${coors[coorKey2].label}`],
        });
      }
      // coordinate systems don't match by default resposne.answer = false
      return response;
    }else{
      //this insures that the next if statement "coorKey != null" returns true so we check if the string has any unallowed characters
      coorKey = nonGenericCoordinateSystem;
    }

  }

  //so now that we may or may not know the coordinate system we are using we need to clean the string so that generic demension unit vectors "\\dim{n}" will be specific unit vectors that line up with the coordinate system detected
  if(coorKey != null){//we couldn't detect a coordinate system.
    //if coorKey != null then that means we found a coordinate system but we need to make sure it doesn't have any unallowed characters in it
    if(coors[coorKey].unallowedUnitVectors.some((unitVectorRIDString) => {return str.indexOf(unitVectorRIDString) != -1})){
      //we have some unallowed characters so we need to throw an error
      if(opts.throwError != false){
        CreateInlineMathFieldError({
          mfID: opts.mfID,
          error: "Unit vectors from two different coordinate systems detected in expression",
        });
      }
      // unit vectors don't match and by default response.answer = false
      return response;
    }
  }


  return {
    answer: true, // if we have gotten to this point then we know no errors were found
    str: str,// the original string may have changed throughout the process so we are returning the it as well
    coorsLs: coorKey != null ? coors[coorKey].coorsLs : undefined,
  };
}

function TryToCalculateCrossProductGivenTwoMatrices(opts){
  if(opts.matrix1 == undefined || opts.matrix2 == undefined || opts.lineNumber == undefined || opts.mfID == undefined){
    return null;//we don't have all the information we need to run this function
  }

  let matrix1 = opts.matrix1;
  let matrix2 = opts.matrix2;

  /*
  let v1 = nerdamer(`transpose(${opts.matrix1})`).toString();
  v1 = v1.substring("matrix(".length, v1.length-1);//this sub string turns "matrix([...,...,...])" into "[...,...,...]". This is what we want
  let v2 = nerdamer(`transpose(${opts.matrix2})`).toString();
  v2 = v2.substring("matrix(".length, v2.length-1);//this sub string turns "matrix([...,...,...])" into "[...,...,...]". This is what we want
  */

  let coors = {
    generic: {
      label: "\\text{Generic N Demensional Vector}",
      coors: [UniqueRIDStringObj["\\dim{1}"].ridString, UniqueRIDStringObj["\\dim{2}"].ridString, UniqueRIDStringObj["\\dim{3}"].ridString],//generic
      unique: [UniqueRIDStringObj["\\dim{1}"].ridString, UniqueRIDStringObj["\\dim{2}"].ridString, UniqueRIDStringObj["\\dim{3}"].ridString],//generic
      uniquePairs: [],
      unallowedUnitVectors: [UniqueRIDStringObj["\\hat{r}"].ridString, UniqueRIDStringObj["\\hat{\\theta}"].ridString, UniqueRIDStringObj["\\hat{z}"].ridString],//r,theta,or z
    },
    cartesianXYZ: {
      label: "\\text{Cartesian}\\ \\left(\\hat{x},\\hat{y},\\hat{z} \\right)",
      coors: [UniqueRIDStringObj["\\hat{x}"].ridString, UniqueRIDStringObj["\\hat{y}"].ridString, UniqueRIDStringObj["\\hat{z}"].ridString],//cartensian
      unique: [UniqueRIDStringObj["\\hat{x}"].ridString, UniqueRIDStringObj["\\hat{y}"].ridString],
      uniquePairs: [],
      unallowedUnitVectors: [UniqueRIDStringObj["\\hat{r}"].ridString, UniqueRIDStringObj["\\hat{\\theta}"].ridString],//r or theta
    },
    cartesianIJK: {
      label: "\\text{Cartesian}\\ \\left(\\hat{i},\\hat{j},\\hat{k}\\right)",
      coors: [UniqueRIDStringObj["\\hat{i}"].ridString,UniqueRIDStringObj["\\hat{j}"].ridString,UniqueRIDStringObj["\\hat{k}"].ridString],//cartesian
      unique: [UniqueRIDStringObj["\\hat{i}"].ridString,UniqueRIDStringObj["\\hat{j}"].ridString,UniqueRIDStringObj["\\hat{k}"].ridString],//cartesian
      uniquePairs: [],
      unallowedUnitVectors: [UniqueRIDStringObj["\\hat{r}"].ridString, UniqueRIDStringObj["\\hat{\\theta}"].ridString, UniqueRIDStringObj["\\hat{z}"].ridString],//r,theta,or z
    },
    cylindrical: {
      label: "\\text{Cylindrical}\\ \\left(\\hat{r},\\hat{\\theta},\\hat{z}\\right)",
      coors: [UniqueRIDStringObj["\\hat{r}"].ridString,UniqueRIDStringObj["\\hat{\\theta}"].ridString,UniqueRIDStringObj["\\hat{z}"].ridString],//cylindrical
      unique: [],
      uniquePairs: [
        [UniqueRIDStringObj["\\hat{r}"].ridString, UniqueRIDStringObj["\\hat{z}"].ridString],
        [UniqueRIDStringObj["\\hat{\\theta}"].ridString,UniqueRIDStringObj["\\hat{z}"].ridString],
      ],
      unallowedUnitVectors: [],
    },
    spherical: {
      label: "\\text{Spherical}\\ \\left(\\hat{r},\\hat{\\theta},\\hat{\\phi}\\right)",
      coors: [UniqueRIDStringObj["\\hat{r}"].ridString,UniqueRIDStringObj["\\hat{\\theta}"].ridString,UniqueRIDStringObj["\\hat{\\phi}"].ridString],//spherical
      unique: [UniqueRIDStringObj["\\hat{\\phi}"].ridString],
      uniquePairs: [],
      unallowedUnitVectors: [UniqueRIDStringObj["\\hat{z}"].ridString],//z
    }
  };


  let coorKey = null;
  let coorKey2 = null;
  let foundKey = false;

  for(const [key, value] of Object.entries(coors)){
    foundKey = false;

    //checking if either strings have a unique identify unit vector
    if(value.unique.some((unitVectorRIDString) => {return `${matrix1} ${matrix2}`.indexOf(unitVectorRIDString) != -1})){
      if(coorKey == null || coorKey == "generic"){
        coorKey = key;
        foundKey = true;
      }else{
        coorKey2 = key;
        break
      }
    }

    if(!foundKey){
      //checking if either string has a unique identifing pair of unit vectors
      if(value.uniquePairs.some((pairs) => {return `${matrix1} ${matrix2}`.indexOf(pairs[0]) != -1 && `${matrix1} ${matrix2}`.indexOf(pairs[1]) != -1})){
        if(coorKey == null || coorKey == "generic"){
          coorKey = key;
        }else{
          coorKey2 = key;
          break
        }
      }
    }
    
    //regardless if the ridString is found in the vectors we are going to try to clear them
    //cleaning up the vectors
    matrix1 = matrix1.replace(new RegExp(value.coors[0], 'g'), "1").replace(new RegExp(value.coors[1], 'g'), "1").replace(new RegExp(value.coors[2], 'g'), "1");
    matrix2 = matrix2.replace(new RegExp(value.coors[0], 'g'), "1").replace(new RegExp(value.coors[1], 'g'), "1").replace(new RegExp(value.coors[2], 'g'), "1");

  }

  if(coorKey2 != null){
    //if coorKey2 != null that means the user is using two different cooridnate systems so we need to throw an error
    CreateInlineMathFieldError({
      mfID: opts.mfID,
      error: "Two different coordinate systems used in cross product",
      latexExpressions: [`${coors[coorKey].label}\\ \\text{and}\\ ${coors[coorKey2].label}`],
    });
    
    return null;
  }

  if(coorKey == null){
    //this means we werent able to identify what coordinate system the user is using in the equation

    CreateInlineMathFieldError({
      mfID: opts.mfID,
      error: "Couldn't identify coordinate system used in cross product",
      latexExpressions: [
        "a\\cdot\\hat{z} \\ \\text{this could either be Cartesian or Cylinderical}",
        "a\\cdot\\hat{z} \\rightarrow \\left(a\\cdot\\hat{z} + 0\\hat{x} \\right) \\ \\text{adding an extra component with coefficient 0 identifies the coordinate system as Cartensian}",
        "a\\cdot\\hat{z} \\rightarrow \\left(a\\cdot\\hat{z} + 0\\hat{\\theta} \\right) \\ \\text{adding an extra component with coefficient 0 identifies the coordinate system as Cylinderical}",
      ],
    });

    return null;
  }

  //if coorKey != null then that means we found a coordinate system but we need to make sure it doesn't have any unallowed characters in it
  if(coors[coorKey].unallowedUnitVectors.some((unitVectorRIDString) => {return `${matrix1} ${matrix2}`.indexOf(unitVectorRIDString) != -1})){
    //we have some unallowed characters so we need to throw an error
    CreateInlineMathFieldError({
      mfID: opts.mfID,
      error: "Unit vectors from two different coordinate systems detected",
    });

    return null;
  }
  
  //if we haven't returned by now then we know the coordinate system used and we will now calculate the cross product
  //3D cross product
  let a = [nerdamer(`matget(${matrix1},0,0)`),nerdamer(`matget(${matrix1},1,0)`),nerdamer(`matget(${matrix1},2,0)`)];
  let b = [nerdamer(`matget(${matrix2},0,0)`),nerdamer(`matget(${matrix2},1,0)`),nerdamer(`matget(${matrix2},2,0)`)];
  let dir = coors[coorKey].coors;//the direction / unit vector to use
  //a x b = (a1*b2-a2*b1)*i + (a2*b0 - a0*b2)*j + (a0*b1 - a1*b0)*k
  let crossProductString = `((${a[1]}*${b[2]}) - (${a[2]}*${b[1]}))*${dir[0]} + ((${a[2]}*${b[0]}) - (${a[0]}*${b[2]}))*${dir[1]} + ((${a[0]}*${b[1]}) - (${a[1]}*${b[0]}))*${dir[2]}`;
  
  return nerdamer(crossProductString).toString();
  
}

function CreateInlineMathFieldError(opts){
  //we need the mfID, the error string, optional: latexExpressions and if we should check if the error already exists
  if(opts.mfID == undefined || opts.error == undefined){return;}

  let errorAlreadyExists = false;//assume the error doesn't already exist unless we actually check
  for(let error of MathFields[opts.mfID].log.error){
    if(error.error.type == opts.error){
      errorAlreadyExists = true;
      break;
    }
  }

  if(!errorAlreadyExists){
    MathFields[opts.mfID].log.error.push({
      error: EL.createLoggerErrorFromMathJsError(opts.error),
      latexExpressions: Array.isArray(opts.latexExpressions) ? opts.latexExpressions : [],
    });
  }
  
}


function CleanRawDotProduct(opts){
  //this function takes an string that represents a dot product and checks that it is formatted properly then cleans the string and returns cleaned string which can then be injeced back into the expression it came from
  if(opts.str == undefined || opts.uniqueRIDStringArray == undefined || opts.lineNumber == undefined || opts.mfID == undefined){
    return null;
  }

  //before we clean this dot product and calculate it we need to check that the unit vectors used in the dot product match meaning that they are a part of the same coordinate system
  let expressionUnitVectorsMatchObj = DoExpressionUnitVectorsMatch({str: opts.str, mfID: opts.mfID});
  if(expressionUnitVectorsMatchObj.answer){
    opts.str = expressionUnitVectorsMatchObj.str;
  }else{return null;}

  let unitVectors = ["\\hat{x}","\\hat{i}","\\hat{r}","\\hat{y}", "\\hat{j}","\\hat{\\theta}","\\hat{z}","\\hat{k}","\\hat{\\phi}"];
  //all we need to do is replace all unit vectors and demensions "\\dim{n}" with 1 and then evaluate the rawDotproduct and return the value as the cleaned dot product
  let i = 0; 
  let cleanDotProduct = opts.str;
  let parsingGenericDemensions = true
  while(i < unitVectors.length || parsingGenericDemensions){
    parsingGenericDemensions = false;//this keeps track of wheter we have parsed through all the generic demension variables "\\dim{n}"
    if(UniqueRIDStringObj[`\\dim{${i + 1}}`] != undefined){
      let dimNRIDString = UniqueRIDStringObj[`\\dim{${i + 1}}`].ridString;
      if(cleanDotProduct.indexOf(dimNRIDString) != -1){
        parsingGenericDemensions = true;
        cleanDotProduct = cleanDotProduct.replace(new RegExp(dimNRIDString, 'g'), "1");
      }
    }
      
    if(i < unitVectors.length){
      if(UniqueRIDStringObj[unitVectors[i]] != undefined){
        cleanDotProduct = cleanDotProduct.replace(new RegExp(UniqueRIDStringObj[unitVectors[i]].ridString, 'g'), "1");
      }
    }
    i++;
  }

  return nerdamer(cleanDotProduct).toString();

}


function GetRIDStringForCoordinateSystemsAndReturnObj(uniqueRIDStringArray){
  let coor = {
    cartesian: {x: null, y: null, z: null},
    cylindrical: {r: null, theta: null, z: null},
    spherical: {r: null, theta: null, phi: null},
  };
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

    let v1StartIndex = FindFirstVectorStartIndex(newLs, multiply.index);
    let v2EndIndex = FindSecondVectorEndIndex(newLs, multiply.index + multiply.type.length);//we want to start parsing everything after the multiplication operator

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

function FindFirstMatrixStartIndex(ls, endIndex){
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
          if(closingParenthesis - "matrix".length >= 0){
            if(ls.substring(closingParenthesis - "matrix".length, closingParenthesis) == "matrix"){
              return closingParenthesis - "matrix".length;
            }
          }

          if(closingParenthesis - "\\left".length >= 0){
            if(ls.substring(closingParenthesis - "\\left".length, closingParenthesis) == "\\left"){
              return closingParenthesis - "\\left".length;
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

function FindSecondMatrixEndIndex(ls, startIndex){
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

function GetStoredVariableInfo(ls){

  // we need to check if the ls that the is given to us is a component of a vector for exmaple ls could equal "\\comp1{"
  let latexStringIsComponent = /\\comp\d*\{/.test(ls);
  let componentLs = ls;
  //is we have the string "\\comp2{\\vec{F}}" this line replaces "\\comp2{" with "" then removes the last character from the string which if the string is formatted right should be the closing bracket of the "\\comp2{" we just removed. which levaes us with just "\\vec{F}"
  ls = latexStringIsComponent ? ls.replace(/\\comp\d*\{/,"").slice(0,-1) : ls;

  //this function takes an ls and returns the variable info for this variable if it exits other wise it returns nul
  if(DefinedVariables[ls] != undefined){
    if(latexStringIsComponent){

      if(DefinedVariables[ls].components == undefined){
        return {
          state: DefinedVariables[ls].state,
          currentState: "unknown",
          value: undefined,
        };
      }

      return Object.assign({
        state: DefinedVariables[ls].state,
        currentState: (DefinedVariables[ls].components[componentLs] == undefined) ? "unknown" : "known",
        value: DefinedVariables[ls].components[componentLs] != undefined ? DefinedVariables[ls].components[componentLs].value : undefined,
      }, DefinedVariables[ls].components[componentLs] != undefined ? DefinedVariables[ls].components[componentLs] : {});

    }
    return JSON.parse(JSON.stringify(DefinedVariables[ls]));//making copy of variable
  }
  else if(PreDefinedVariables[ls] != undefined){

    if(latexStringIsComponent){

      if(PreDefinedVariables[ls].components == undefined){
        return {
          state: PreDefinedVariables[ls].state,
          currentState: "unknown",
          value: undefined,
        };
      }
      
      return Object.assign({
        state: PreDefinedVariables[ls].state,
        currentState: (PreDefinedVariables[ls].components[componentLs] == undefined) ? "unknown" : "known",
        value: PreDefinedVariables[ls].components[componentLs] != undefined ? PreDefinedVariables[ls].components[componentLs].value : undefined,
      }, PreDefinedVariables[ls].components[componentLs] != undefined ? PreDefinedVariables[ls].components[componentLs] : {});

    }

    return JSON.parse(JSON.stringify(PreDefinedVariables[ls]));//making copy of variable
  }
  else if(EL.undefinedVars.undefined[ls] != undefined){

    if(latexStringIsComponent){

      if(EL.undefinedVars.undefined[ls].components == undefined){
        return {
          state: EL.undefinedVars.undefined[ls].state,
          currentState: "unknown",
          value: undefined,
        };
      }
      
      return Object.assign({
        state: EL.undefinedVars.undefined[ls].state,
        currentState: (EL.undefinedVars.undefined[ls].components[componentLs] == undefined) ? "unknown" : "known",
        value: EL.undefinedVars.undefined[ls].components[componentLs] != undefined ? EL.undefinedVars.undefined[ls].components[componentLs].value : undefined,
      }, EL.undefinedVars.undefined[ls].components[componentLs] != undefined ? EL.undefinedVars.undefined[ls].components[componentLs] : {});

    }

    return JSON.parse(JSON.stringify(EL.undefinedVars.undefined[ls]));//making copy of variable
  }
  else if(EL.undefinedVars.defined[ls] != undefined){

    if(latexStringIsComponent){

      if(EL.undefinedVars.defined[ls].components == undefined){
        return {
          state: EL.undefinedVars.defined[ls].state,
          currentState: "unknown",
          value: undefined,
        };
      }
      
      return Object.assign({
        state: EL.undefinedVars.defined[ls].state,
        currentState: (EL.undefinedVars.defined[ls].components[componentLs] == undefined) ? "unknown" : "known",
        value: EL.undefinedVars.defined[ls].components[componentLs] != undefined ? EL.undefinedVars.defined[ls].components[componentLs].value : undefined,
      }, EL.undefinedVars.defined[ls].components[componentLs] != undefined ? EL.undefinedVars.defined[ls].components[componentLs] : {});

    }

    return JSON.parse(JSON.stringify(EL.undefinedVars.defined[ls]));//making copy of variable
  }

  return null;
}

function GenerateRidStringVariablesObjFromString(str, uniqueRIDStringArray){
  //this function returns an object of all the ridStrings used in a string and important information about the variable the rid string represents
  let i = 0;
  let ridStringsUsedInString = {};

  while(i < uniqueRIDStringArray.length){
    if(str.indexOf(uniqueRIDStringArray[i].ridString) != -1){
      ridStringsUsedInString[uniqueRIDStringArray[i].ridString] =  uniqueRIDStringArray[i].variable;
    }
    if(str.indexOf(uniqueRIDStringArray[i].differentialRidString) != -1){
      ridStringsUsedInString[uniqueRIDStringArray[i].differentialRidString] = null;
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
    let uniqueRIDStringArray = UpdateUniqueRIDStringObjUsingLs(`${expressionArray[i].rawStr} + ${expressionArray[i+1].rawStr}`);//passing both string and putting a plus inbetween them so that we generate a uniqueRIDStringArray that accounts for all the variables and differential variables used in both expressions
    //console.log(uniqueRIDStringArray);
    let expression1Obj = ExactConversionFromLatexStringToNerdamerReadableString({
      ls: expressionArray[i].rawStr,
      uniqueRIDStringArray: uniqueRIDStringArray,
      lineNumber: lineNumber,
      mfID: mfID,
      throwError: true,
      convertVectorsToNerdamerMatrices: true,
      returnFinalObject: true,//if the expression evaulates to a vector we want to return an array
    });
    let expression2Obj = ExactConversionFromLatexStringToNerdamerReadableString({
      ls: expressionArray[i+1].rawStr,
      uniqueRIDStringArray: uniqueRIDStringArray,
      lineNumber: lineNumber,
      mfID: mfID,
      throwError: true,
      convertVectorsToNerdamerMatrices: true,
      returnFinalObject: true,//return an array of the expressions we have to iterate through and the evaluated expression in latex
    });

    //console.log("expression1Obj", expression1Obj);
    //console.log("expression2Obj", expression2Obj);
    
    if(expression1Obj != null && expression2Obj != null){
      let count = 0;
      let lengthOfLongestExpression = Math.max(expression1Obj.array.length, expression2Obj.array.length);
      
      while(count < lengthOfLongestExpression){
        let expression1 = (expression1Obj.array[count] != undefined) ? expression1Obj.array[count] : "0";
        let expression2 = (expression2Obj.array[count] != undefined) ? expression2Obj.array[count] : "0";

        //because this is a high level check we need to make sure that both expressions use the same variables and if not we cannot be sure that the equations don't equal each other so we will not actaully do any check
        let expression1Variables = GenerateRidStringVariablesObjFromString(expression1, GetAllUniqueRIDStringsArray());
        let expression2Variables = GenerateRidStringVariablesObjFromString(expression2, GetAllUniqueRIDStringsArray());
        let symbolicallyEqual = "idk";
        //console.log(expression1Variables, expression2Variables);
        if(Object.keys(expression1Variables).length == Object.keys(expression2Variables).length){//the arrays have to bee the same length
          //we are now going to filter expression1Variables array using values from expression2Variables array and if there are any variables left in expression1Variable array we know that these two arrays don't hold the exact same variables as each other and therefore we can't do a high level check
          if(Object.keys(expression1Variables).filter((v) => {return !Object.keys(expression2Variables).includes(v)}).length == 0){
            //using all of nerdamer's equality functions to figure out if the expression is correct
            if(expressionArray[i].operator == "="){
              //console.log("expression1", expression1);
              //console.log("expression2", expression2);
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
                try{
                  //there is a case where both expressions are numbers but are equivalent but when calcuating their values the calculation is off by some decimal places
                  //an example would be log10(25)/log10(5) = 2 but when calculate the leftside gives a very long decimal that is approaching 2 so we use the function "toFixed" to round it to the 12th decimal place
                  let num1 = math.evaluate(expression1).toExponential().split("e");
                  let num2 = math.evaluate(expression2).toExponential().split("e");
                  isEqual = nerdamer(`${Number(num1[0]).toFixed(10)}e${num1[1]}`).eq(`${Number(num2[0]).toFixed(10)}e${num2[1]}`)
                }
                catch(err){
                  isEqual = false;
                }


                if(!isEqual){
                  symbolicallyEqual = "no";
                  //console.log("not equal");
                  expressionThatAreNotCorrect.push({
                    expression1: expressionArray[i].rawStr,
                    expression2: expressionArray[i+1].rawStr,
                    calculatedExpression1: expression1Obj.calculatedLs,
                    calculatedExpression2: expression2Obj.calculatedLs,
                    operator: expressionArray[i].operator,
                  });

                  break;//because we found a component of this expression that don't match the inequality we need to break the loop that loops through each component of the vector or expression calculated
                  
                }else{
                  symbolicallyEqual = "yes";
                  EquationSet.push({
                    equation: `${expression1} = ${expression2}`,
                    uniqueRIDStringArray: uniqueRIDStringArray,
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
                  calculatedExpression1: expression1Obj.calculatedLs,
                  calculatedExpression2: expression2Obj.calculatedLs,
                  operator: expressionArray[i].operator,
                });

                break;//because we found a component of this expression that don't match the inequality we need to break the loop that loops through each component of the vector or expression calculated
              }
            }
            else if(expressionArray[i].operator == ">"){
              if(!nerdamer(expression1).gt(expression2)){//nerdamer greater than function
                //console.log("not greater than");
                expressionThatAreNotCorrect.push({
                  expression1: expressionArray[i].rawStr,
                  expression2: expressionArray[i+1].rawStr,
                  calculatedExpression1: expression1Obj.calculatedLs,
                  calculatedExpression2: expression2Obj.calculatedLs,
                  operator: expressionArray[i].operator,
                });

                break;//because we found a component of this expression that don't match the inequality we need to break the loop that loops through each component of the vector or expression calculated
              }
            }
            else if(expressionArray[i].operator == "\\le"){
              if(!nerdamer(expression1).lte(expression2)){//nerdamer less than or equal to function
                //console.log("not less than or equal");
                expressionThatAreNotCorrect.push({
                  expression1: expressionArray[i].rawStr,
                  expression2: expressionArray[i+1].rawStr,
                  calculatedExpression1: expression1Obj.calculatedLs,
                  calculatedExpression2: expression2Obj.calculatedLs,
                  operator: expressionArray[i].operator,
                });

                break;//because we found a component of this expression that don't match the inequality we need to break the loop that loops through each component of the vector or expression calculated
              }
            }
            else if(expressionArray[i].operator == "\\ge"){
              if(!nerdamer(expression1).gte(expression2)){//nerdamer greater than or equal to function
                //console.log("not greater than or equal");
                expressionThatAreNotCorrect.push({
                  expression1: expressionArray[i].rawStr,
                  expression2: expressionArray[i+1].rawStr,
                  calculatedExpression1: expression1Obj.calculatedLs,
                  calculatedExpression2: expression2Obj.calculatedLs,
                  operator: expressionArray[i].operator,
                });

                break;//because we found a component of this expression that don't match the inequality we need to break the loop that loops through each component of the vector or expression calculated
              }
            }
          }
        }

        if(expressionArray[i].operator == "=" && symbolicallyEqual != "no"){
          //this means that this line is either symbolicallyEqual or it couldn't be determined if it was symbolicallyEqual
          if(EL.rawExpressionDataForDeeperCheck[lineNumber] == undefined){
            EL.rawExpressionDataForDeeperCheck[lineNumber] = [];
          }
          EL.rawExpressionDataForDeeperCheck[lineNumber].push([JSON.parse(JSON.stringify(expressionArray[i])), JSON.parse(JSON.stringify(expressionArray[i+1]))]);
        }

        count++;
      }

      
      
    }
  }
  return expressionThatAreNotCorrect;
}

function IdentifyAllKnownVariablesAndTheirValues(expressionArray, lineNumber, mfID){
  //so now we need to check if there is even a possiblity that we can do a high level check between these expressions
  for(let i = 0; i + 1 < expressionArray.length; i++){
    //we need to do an exact conversion from latex to a string that nerdamer can understand. they have a convertFromLatex function but it is very limited so we will use it sparingly
    //this line of code converts the two expressions we were analyzing into nerdeamer readable string then we use nerdamers .eq() function to check if they are equal. if they arent then we add these two expression to the "expressionThatDontEqualEachOther" array
    let uniqueRIDStringArray = UpdateUniqueRIDStringObjUsingLs(`${expressionArray[i].rawStr} + ${expressionArray[i+1].rawStr}`);//passing both string and putting a plus inbetween them so that we generate a uniqueRIDStringArray that accounts for all the variables and differential variables used in both expressions
    //console.log(uniqueRIDStringArray);
    let expression1Obj = ExactConversionFromLatexStringToNerdamerReadableString({
      ls: expressionArray[i].rawStr,
      uniqueRIDStringArray: uniqueRIDStringArray,
      lineNumber: lineNumber,
      mfID: mfID,
      throwError: false,
      convertVectorsToNerdamerMatrices: true,
      returnFinalObject: true,//if the expression evaulates to a vector we want to return an array
    });
    let expression2Obj = ExactConversionFromLatexStringToNerdamerReadableString({
      ls: expressionArray[i+1].rawStr,
      uniqueRIDStringArray: uniqueRIDStringArray,
      lineNumber: lineNumber,
      mfID: mfID,
      throwError: false,
      convertVectorsToNerdamerMatrices: true,
      returnFinalObject: true,//if the expression evaulates to a vector we want to return an array
    });

    let expressionsActuallyEqualEachOther = true;
    let expression1Parsed = [];
    let expression2Parsed = [];


    if(expression1Obj != null && expression2Obj != null){
      //console.log("expression1Obj", expression1Obj);
      //console.log("expression2Obj", expression2Obj);
      let count = 0;
      let lengthOfLongestExpression = Math.max(expression1Obj.array.length, expression2Obj.array.length);
      
      while(count < lengthOfLongestExpression){
        let expression1 = RemoveUnitVectorRIDStringFromString((expression1Obj.array[count] != undefined) ? expression1Obj.array[count] : "0");
        let expression2 = RemoveUnitVectorRIDStringFromString((expression2Obj.array[count] != undefined) ? expression2Obj.array[count] : "0");

        //because this is a high level check we need to make sure that both expressions use the same variables and if not we cannot be sure that the equations don't equal each other so we will not actaully do any check
        let expression1Variables = GenerateRidStringVariablesObjFromString(expression1.str, GetAllUniqueRIDStringsArray());
        let expression2Variables = GenerateRidStringVariablesObjFromString(expression2.str, GetAllUniqueRIDStringsArray());
        //console.log(expression1Variables, expression2Variables);
        //the next thing we will check is if we can solve for any unknown variables and if there are no unknown variables 
        if(expressionArray[i].operator == "="){
          //this function checks if this equations can help solve for a unknown variable in it if there are any and also plugs in the values for known or given variables and sees if the expressions are actually equal
          let returnValue = TryToSolveForUnknownVariablesAndCheckIfExpressionsActuallyEqualEachOther({
            expression1: {str: expression1.str, unitVectorLs: expression1.unitVectorLs, unitVectorRIDString: expression1.unitVectorRIDString},
            expression2: {str: expression2.str, unitVectorLs: expression2.unitVectorLs, unitVectorRIDString: expression2.unitVectorRIDString},
            expressionVariablesObj: Object.assign(expression1Variables, expression2Variables),
            uniqueRIDStringArray: uniqueRIDStringArray,
          });
          if(returnValue.type == "done"){
            return;
          }else if(returnValue.type == "stop"){
            //this means we couldn't calculate the actual value of the expression so we are just going to pass it to the array
            expression1Parsed[count] = expression1.originalString;
            expression2Parsed[count] = expression2.originalString;
          }else if(returnValue.type == "error"){
              //this means we were able to calculated the actual value of the expression and they don't equal so 
              expressionsActuallyEqualEachOther = false;
              expression1Parsed[count] = {
                alreadyLatex: true,
                value: (expression1.unitVectorLs == null) ? returnValue.num1 : `${returnValue.num1}\\cdot${expression1.unitVectorLs}`
              };
              expression2Parsed[count] = {
                alreadyLatex: true,
                value: (expression2.unitVectorLs == null) ? returnValue.num2 : `${returnValue.num2}\\cdot${expression2.unitVectorLs}`,
              };
          }
        }
        count++;
      }

      //after we have parts through all the components of the expression we need to decide if the expressions are actually equal then parse the results we go and assign them to EL.expressionsThatDontActuallyEqualEachOther Object

      if(!expressionsActuallyEqualEachOther){
        //this means that the expressions may be symbolically equal but when the variables values are plugged in they are not equal
        if(EL.expressionsThatDontActuallyEqualEachOther[lineNumber] == undefined){
          EL.expressionsThatDontActuallyEqualEachOther[lineNumber] = [];//setting the value equal to an array so that we can push values into it
        } 

        //we have an array of expressions represented in RIDStrings or exact numbers. If it is an exact number we need to figure
        //out if the expression had a unit vector that we removed to do the calculation. If it did then we need to put the unit
        //vector back and then after we have checked that for all of the components we can turn this array of expressions in RIDString
        //format to a calculatedLs (where a calculated ls is what we call an expression when it has been calculated by nerdamer and
        //needs to be returned as an ls. The  expression also has to be an array)
        let calculatedLs1 = ConvertExpressionRIDStringArrayToCalculatedLs(expression1Parsed);
        let calculatedLs2 = ConvertExpressionRIDStringArrayToCalculatedLs(expression2Parsed);
        EL.expressionsThatDontActuallyEqualEachOther[lineNumber].push(`(${expressionArray[i].rawStr} \\neq ${expressionArray[i+1].rawStr}) \\Rightarrow (${calculatedLs1} \\neq ${calculatedLs2})`);
      }
      

    }
  }
}

function RemoveUnitVectorRIDStringFromString(str){
  let originalString = str;
  //we need to remove unit vector RIDStrings from the strings and remember which one we removed so we can return it back along with the modified str without unit vector ridStrings
  //we want to remove the unit vector because we already know that the string is in the same demension as the other string
  let unitVectors = ["\\hat{x}","\\hat{i}","\\hat{r}","\\hat{y}", "\\hat{j}","\\hat{\\theta}","\\hat{z}","\\hat{k}","\\hat{\\phi}"];
  //all we need to do is replace all unit vectors and demensions "\\dim{n}" with 1 and then evaluate the rawDotproduct and return the value as the cleaned dot product
  let unitVectorRIDString = null;
  let unitVectorLs = null;
  let i = 0; 
  let parsingGenericDemensions = true;
  while(i < unitVectors.length || parsingGenericDemensions){
    parsingGenericDemensions = false;//this keeps track of wheter we have parsed through all the generic demension variables "\\dim{n}"
    if(UniqueRIDStringObj[`\\dim{${i + 1}}`] != undefined){
      parsingGenericDemensions = true;
      let dimNRIDString = UniqueRIDStringObj[`\\dim{${i + 1}}`].ridString;
      if(str.indexOf(dimNRIDString) != -1){
        str = str.replace(new RegExp(dimNRIDString, 'g'), "1");
        unitVectorRIDString = dimNRIDString;
        unitVectorLs = `\\dim{${i + 1}}`;
        break;//we found the unit vector ridString that was in this string
      }
    }
      
    if(i < unitVectors.length){
      if(UniqueRIDStringObj[unitVectors[i]] != undefined){
        if(str.indexOf(UniqueRIDStringObj[unitVectors[i]].ridString) != -1){
          str = str.replace(new RegExp(UniqueRIDStringObj[unitVectors[i]].ridString, 'g'), "1");
          unitVectorRIDString = UniqueRIDStringObj[unitVectors[i]].ridString;
          unitVectorLs = unitVectors[i];
          break;//we found the unit vector ridString that was in this string
        }
      }
    }
    i++;
  }

  return {
    unitVectorRIDString: unitVectorRIDString,
    unitVectorLs: unitVectorLs,
    str: str,
    originalString: originalString,
  };

}



function TryToSolveForUnknownVariablesAndCheckIfExpressionsActuallyEqualEachOther(opts){
  //this function takes expressions that make up an equation "{expression1} = {expression2}" and checks if the expression
  //has the right conditions to solve for an unknown variable and if it does it will try to solve for that unknown variable
  //if all the variables in the expression are known and there values are known we will plug in all of there values and see
  //if the expressions actually equal each other. For example if there is an equation "F=ma" and all variable values are konwn F=10, m=1, a=1,
  //symbolically these equations may be equal but when you plug in there values they are not equal

  let exp1 = opts.expression1;
  let exp2 = opts.expression2;
  let expVars = opts.expressionVariablesObj;
  let uniqueRIDStringArray = opts.uniqueRIDStringArray;

  //console.log(exp1, exp2, expVars);
  
  //the first thing is we are going to go through the list of expVars and try to plug in all the values for all the variables in exp1 and exp2.
  //if that doesn't work for some reason, either because a variable is known or given but the actual value is undefined or if the variable is actuallly
  //unknown we will stop that and we will transition to trying to solve for unknown variables symbolically
  let status = {
    undefinedValuesArray: [],//keeps track of how many variables don't know their value which is different then being unknown, because a varibale could be set as a give or known but not konwn its actual value
    unknownVariable: null,//keeps track of the unknown variable we are trying to solve for if there are any and if there are more than one then we don't do anything and we just "return"
    variableValues: {},//object that holds all the variable in ridString format as the "key" and the variables value as the "value"
  }

  for(const [key, value] of Object.entries(expVars)){
    let v = (value != null) ? GetStoredVariableInfo(value) : null;
    if(v == null){
      //this means there are differential variables that have not been solved for in this equation or the variable we are looking for doesn't exist so we will just stop in our tracks and not go any further
      return {type: "stop"};
    }
    
    if(v.state != "given" && v.currentState != "known"){
      if(status.unknownVariable == null){
        status.unknownVariable = key;//we set this as the unknown variable we are 
      }else{//this means that there are more than 1 unknown variable so we have to stop hear cuz we can solve for the unknown variable if there is more than one
        return {type: "stop"};
      }
    }

    if(v.value != undefined && v.value != "" && v.valueFormattingError == undefined){
      try{
        status.variableValues[key] = nerdamer.convertFromLaTeX(CleanLatexString(v.value, ["multiplication"])).toString();
      }catch(err){//we couldn't convert latex string to something that nerdamer could understand so we cant be sure that this variable's value is known
        console.log("couldn't convert variable value to nerdamer value");
        status.undefinedValuesArray.push(null);
      }
    }else{
      status.undefinedValuesArray.push(key);
    }
  }

  //if we haven't returned by this point then we can continue on and see if we can either plug in all 
  //the values for all the variables in exp1 and exp2 or if there is one unknown we can try to solve for it
  if(status.unknownVariable == null && status.undefinedValuesArray.length == 0){//this means that all the variables in exp1 and exp2 are given or known and know there exact values
    let expression1 = nerdamer(exp1.str, status.variableValues).evaluate().toString();
    let expression2 = nerdamer(exp2.str, status.variableValues).evaluate().toString();
    try{
      //there is a case where both expressions are numbers but are equivalent but when calcuating their values the calculation is off by some decimal places
      //an example would be log10(25)/log10(5) = 2 but when calculate the leftside gives a very long decimal that is approaching 2 so we use the function "toFixed" to round it to the 12th decimal place
      
      let num1 = math.evaluate(expression1).toExponential().split("e");
      let num2 = math.evaluate(expression2).toExponential().split("e");
      //we are going to the 6th significant figure because that is what the variable value goes up to everything else is truncated
      if(!nerdamer(`${Number(num1[0]).toFixed(PrecisionSigFigs-2)}e${num1[1]}`).eq(`${Number(num2[0]).toFixed(PrecisionSigFigs-2)}e${num2[1]}`)){
        //if the two expression are not equal then we need to throw an error: expression may be symbolically equal but when values are plug in for the variables they are not equal
        //console.log("error: expression may be symbolically equal but when values are plug in for the variables they are not equal");
        return {type: "error", num1: ConvertStringToScientificNotation(num1.join("e")), num2: ConvertStringToScientificNotation(num2.join("e"))};
      }
    }catch(err){
      //console.log("couldn't evaluate if expressions are equal")
      return {type: "stop"};
    }
  }else{
    //there are two cases we have to account for that act surprsingly similar.
    
    //Scenario 1: The first one is if the the variable we are solving for is unknown so status.unknownVariable != null
    //and the status.undefinedValuesArray will have a length of 1 which represents the unknown variable.
    
    //Scenario 2: the second scenario is if a variable is known but it is the only variable that doesn't know its exact value.
    //In this case status.unknownVariable == null and status.undefinedValuesArray will have a length of 1 as well, which represents
    //the one known variable that doesn't know its exact value.

    let variableToSolveFor = null;
    let scenarioNum = 0;
    if(status.unknownVariable != null){//Scenario 1
      variableToSolveFor = status.unknownVariable;
      scenarioNum = 1;
    }else if(status.undefinedValuesArray.length == 1 && status.undefinedValuesArray[0] != null){//Scenario 2
      variableToSolveFor = status.undefinedValuesArray[0];
      scenarioNum = 2;
    }

    if(variableToSolveFor != null){
      try{
        //we are going to try to solve for the unknown variable
        SqrtLoop = 0;
        let solution = nerdamer(`${exp1.str} = ${exp2.str}`).solveFor(variableToSolveFor);
        let knownVariableValue;
        if(Array.isArray(solution)){//that means we found a solution
          if(solution.length > 0){
            //we are going to gather every non-zero solution but if all solution are zero then we will send the zerio as the solution
            let allNonZeroSolutions = solution.filter((s) => {return s.toString() != "0"});
            //console.log("allNonZeroSolutions", allNonZeroSolutions);
            
            if(allNonZeroSolutions.length == 0){
              knownVariableValue = solution[0].toString();
            }
            else{
              knownVariableValue = allNonZeroSolutions[0].toString();//grab the first non zero solution
            }
          }
        }else{//if the solution is not an array then it is just a simple expression that has a value
          knownVariableValue = solution.toString();
        }
  
        if(knownVariableValue != undefined){
          /* this piece of code would eventually create latex to show what the known variable solution is rather than just saying the variable is known
          console.log("knownVariableValue",knownVariableValue);
          try{
            console.log("solution", nerdamer.convertToLaTeX(knownVariableValue).toString());
          }catch(err){
            console.log(err);
          }*/
          EquationSet.push({
            equation: `${exp1.str} = ${exp2.str}`,
            uniqueRIDStringArray: uniqueRIDStringArray,
          });
          //now that we have solved for this variable we need to see if we can calculate its actual value
          let actualValue = undefined;
          if(status.undefinedValuesArray.length <= 1){//you can only calculate the actual value of the variable if there is only one undefinedValue which would be the unknown variable we just sovled for
            try{
              //console.log(knownVariableValue, status.variableValues);
              actualValue = math.evaluate(nerdamer(knownVariableValue, status.variableValues).evaluate().toString()).toString();
            }catch(err2){
              actualValue = undefined;
              //console.log(err2);
              //console.log("couldn't get actual value of variable that was unknown and now is known");
            }
          }
  
          //now we have to do that part where we change the variables currentState to known because it is now known
          let foundMatchAndChangedVariableValueOrState = false
          let k = expVars[variableToSolveFor];
          // this if statement is important to have because if the the scenarioNum = 1. that means that we only care
          // if we were able to calculate that this variable is "known" and an actual value is a bonus. But if scenarioNum = 2,
          // that means we are trying to get the actual value of a known variable. So if we couldn't get the actual value then
          // we shouldn't try to set a variable that is known to known and say that we did something and run
          // "EL.UpdateKnownUnknownVariables(false);" later on. This will create a infinite loop
          if(scenarioNum == 1 || (scenarioNum == 2 && actualValue != undefined)){
            //the next thing we need to do is check if the the key "k" is a variable or a vector component. And if it is a vector component we need to find the vector it is a component of.
            let latexStringIsComponent = /\\comp\d*\{/.test(k);
            let componentLs = k;
            //is we have the string "\\comp2{\\vec{F}}" this line replaces "\\comp2{" with "" then removes the last character from the string which if the string is formatted right should be the closing bracket of the "\\comp2{" we just removed. which levaes us with just "\\vec{F}"
            k = latexStringIsComponent ? k.replace(/\\comp\d*\{/,"").slice(0,-1) : k;  

            if(DefinedVariables[k] != undefined){
              if(latexStringIsComponent){
                //first we need to check if this variable even has a components key
                if(DefinedVariables[k].components == undefined){
                  DefinedVariables[k].components = {};
                }
                // next we need to update the data
                DefinedVariables[k].components[componentLs] = {
                  value: (actualValue) ? ConvertStringToScientificNotation(actualValue) : undefined,
                  unitVectorLs: ChooseUnitVectorLsToUse(exp1.unitVectorLs, exp2.unitVectorLs),
                };

                // after defining one of the components for this vector we are going to see if we can update the currentState of the
                //variable and if possible render a latex string for the vectors value to be displayed in variable value input box
                let variableVectorData = CalculateVariableVectorCurrentStateAndValueFromComponents( JSON.parse(JSON.stringify(DefinedVariables[k].components)) );
                DefinedVariables[k].currentState = variableVectorData.currentState;
                DefinedVariables[k].value = variableVectorData.value;
                DefinedVariables[k].components = variableVectorData.components;
                // after we set component and value data for this vector we need to check that the vector's magnitude variable (if there is one) actually equals the magnitude of the vector with its new data and if it doesn't have a value we will see if we can set one 
                CheckThatVectorMagnitudeVariableEqualsVectorMagnitude({
                  variables: DefinedVariables,
                  vectorLs: k,
                  vectorMagnitudeLs: RemoveVectorLatexString(k),
                });
              }else{
                DefinedVariables[k].currentState = "known";
                DefinedVariables[k].value = (actualValue) ? ConvertStringToScientificNotation(actualValue) : undefined;
                // after we set component and value data for this vector we need to check that the vector's magnitude variable (if there is one) actually equals the magnitude of the vector with its new data and if it doesn't have a value we will see if we can set one 
                CheckThatVectorMagnitudeVariableEqualsVectorMagnitude({
                  variables: DefinedVariables,
                  vectorLs: `\\vec{${k}}`,
                  vectorMagnitudeLs: k,
                });
              }
              
              foundMatchAndChangedVariableValueOrState = true;
            }
            else if(EL.undefinedVars.undefined[k] != undefined){

              if(latexStringIsComponent){
                //first we need to check if this variable even has a components key
                if(EL.undefinedVars.undefined[k].components == undefined){
                  EL.undefinedVars.undefined[k].components = {};
                }
                // next we need to update the data
                EL.undefinedVars.undefined[k].components[componentLs] = {
                  value: (actualValue) ? ConvertStringToScientificNotation(actualValue) : undefined,
                  unitVectorLs: ChooseUnitVectorLsToUse(exp1.unitVectorLs, exp2.unitVectorLs),
                };

                // after defining one of the components for this vector we are going to see if we can update the currentState of the
                //variable and if possible render a latex string for the vectors value to be displayed in variable value input box
                let variableVectorData = CalculateVariableVectorCurrentStateAndValueFromComponents( JSON.parse(JSON.stringify(EL.undefinedVars.undefined[k].components)) );
                EL.undefinedVars.undefined[k].currentState = variableVectorData.currentState;
                EL.undefinedVars.undefined[k].value = variableVectorData.value;
                EL.undefinedVars.undefined[k].components = variableVectorData.components;
                // after we set component and value data for this vector we need to check that the vector's magnitude variable (if there is one) actually equals the magnitude of the vector with its new data and if it doesn't have a value we will see if we can set one 
                CheckThatVectorMagnitudeVariableEqualsVectorMagnitude({
                  variables: EL.undefinedVars.undefined,
                  vectorLs: k,
                  vectorMagnitudeLs: RemoveVectorLatexString(k),
                });
              }else{
                EL.undefinedVars.undefined[k].currentState = "known";
                EL.undefinedVars.undefined[k].value = (actualValue) ? ConvertStringToScientificNotation(actualValue) : undefined;
                // after we set component and value data for this vector we need to check that the vector's magnitude variable (if there is one) actually equals the magnitude of the vector with its new data and if it doesn't have a value we will see if we can set one 
                CheckThatVectorMagnitudeVariableEqualsVectorMagnitude({
                  variables: EL.undefinedVars.undefined,
                  vectorLs: `\\vec{${k}}`,
                  vectorMagnitudeLs: k,
                });
              }

              foundMatchAndChangedVariableValueOrState = true;
            }
            else if(EL.undefinedVars.defined[k] != undefined){

              if(latexStringIsComponent){
                //first we need to check if this variable even has a components key
                if(EL.undefinedVars.defined[k].components == undefined){
                  EL.undefinedVars.defined[k].components = {};
                }
                // next we need to update the data
                EL.undefinedVars.defined[k].components[componentLs] = {
                  value: (actualValue) ? ConvertStringToScientificNotation(actualValue) : undefined,
                  unitVectorLs: ChooseUnitVectorLsToUse(exp1.unitVectorLs, exp2.unitVectorLs),
                };

                // after defining one of the components for this vector we are going to see if we can update the currentState of the
                //variable and if possible render a latex string for the vectors value to be displayed in variable value input box
                let variableVectorData = CalculateVariableVectorCurrentStateAndValueFromComponents( JSON.parse(JSON.stringify(EL.undefinedVars.defined[k].components)) );
                EL.undefinedVars.defined[k].currentState = variableVectorData.currentState;
                EL.undefinedVars.defined[k].value = variableVectorData.value;
                EL.undefinedVars.defined[k].components = variableVectorData.components;
                CheckThatVectorMagnitudeVariableEqualsVectorMagnitude({
                  variables: EL.undefinedVars.defined,
                  vectorLs: k,
                  vectorMagnitudeLs: RemoveVectorLatexString(k),
                });
              }else{
                EL.undefinedVars.defined[k].currentState = "known";
                EL.undefinedVars.defined[k].value = (actualValue) ? ConvertStringToScientificNotation(actualValue) : undefined;
                // after we set component and value data for this vector we need to check that the vector's magnitude variable (if there is one) actually equals the magnitude of the vector with its new data and if it doesn't have a value we will see if we can set one 
                CheckThatVectorMagnitudeVariableEqualsVectorMagnitude({
                  variables: EL.undefinedVars.defined,
                  vectorLs: `\\vec{${k}}`,
                  vectorMagnitudeLs: k,
                });
              }

              foundMatchAndChangedVariableValueOrState = true;
            }
          }
          
          if(foundMatchAndChangedVariableValueOrState){
            //because we changed values and were able to identify new known variables we need
            //call "UpdateKnownUnknownVariables" function which will parse the rawExpressionData from the first line with the new information we have put into the known unknown variables.
            //By passing in "false" this function wont reset the variables currentState values which is what we want because we want the information we have just found to persist. Otherwise we would get a loop
            EL.UpdateKnownUnknownVariables(false);
            return {type: "done"};//after this function is done running it means it has already parsed all the lines starting from the top  so we just end right here
          }
        }  
      }catch(err){
        //console.log(err);
        //console.log("couldn't figure out the solution to unknown variable");
      }
    }

  }

  return {type: "stop"};

}

function CheckThatVectorMagnitudeVariableEqualsVectorMagnitude(opts){
  console.log("CheckThatVectorMagnitudeVariableEqualsVectorMagnitude");
  // this function takes a vectorLs, vectorMagnitudeLs, and a location where these variables are stored and checks that vector magnitude and vector variable equal each other
  // when you calculated the magnitude of the vector variable. And if the vector magnitude is not known then we set its value to known and calculate its value

  // making sure we have all the data we need to do what we are trying to do in this function
  if(opts.variables == undefined || opts.vectorLs == undefined || opts.vectorMagnitudeLs == undefined){return}

  let variables = opts.variables;
  let vectorLs = opts.vectorLs;
  let vectorMagnitudeLs = opts.vectorMagnitudeLs;

  // first thing we need to do is check that both the vectorLs and vectorMagnitudeLs exist in the variables object.
  if(variables[vectorLs] == undefined ||  variables[vectorMagnitudeLs] == undefined){return}

  // the next thing we need to check is if the vector is known. If it is then the magnitude by definition is known
  if(variables[vectorLs].state == "given" || variables[vectorLs].currentState == "known"){
    variables[vectorMagnitudeLs].currentState = "known";
    // the next thing we need to do is check if the vector variable has all of its components and that all the component values are defined
    let componentValues = [];
    let allComponentValuesAreDefined = true;
    if(variables[vectorLs].components != undefined){
      for(const [key, value] of Object.entries(variables[vectorLs].components)){
        if(typeof(value) == "object"){
          if(value.value == undefined){
            allComponentValuesAreDefined = false;
            break;
          }else{
            componentValues.push(value.value);
          }
        }
      }
    }
    
    
    if(componentValues.length >= 3 && allComponentValuesAreDefined){
      let calculatedVectorMagnitudeValue = `\\sqrt{${componentValues.map((value)=>{return `(${value})^{2}`}).join("+")}}`;

      calculatedVectorMagnitudeValue = nerdamer.convertFromLaTeX(calculatedVectorMagnitudeValue).evaluate().toString();
      //running it through mathjs because nerdamer produces crazy fractions 
      let calculatedVectorMagnitudeValueMathJs = math.evaluate(calculatedVectorMagnitudeValue);
      //making sure that there is a specific number of sig fig precision
      calculatedVectorMagnitudeValue = Number(calculatedVectorMagnitudeValueMathJs.toString()).toFixed(PrecisionSigFigs);
      // now we need to check if the vector magnitude has a value and if it does then we need to compare the values. If it doesn't then we set the value to what we calculated -> "calculatedVectorMagnitudeValue"
      if(variables[vectorMagnitudeLs].value == undefined || variables[vectorMagnitudeLs].value == ""){
        variables[vectorMagnitudeLs].value = ConvertStringToScientificNotation(calculatedVectorMagnitudeValue);
      }else{
        // we need to check if the two values equal
        let vectorMagnitudeValue; 

        let num1 = calculatedVectorMagnitudeValueMathJs.toExponential().split("e");
        let num2 = math.evaluate(nerdamer.convertFromLaTeX(variables[vectorMagnitudeLs].value).evaluate().toString()).toExponential().split("e");
        let isEqual = nerdamer(`${Number(num1[0]).toFixed(PrecisionSigFigs)}e${num1[1]}`).eq(`${Number(num2[0]).toFixed(PrecisionSigFigs)}e${num2[1]}`);
        if(!isEqual){
          ThrowErrorVectorMagnitudeAndVectorDontEqual();
        }
      }
    }
  }

}

function ThrowErrorVectorMagnitudeAndVectorDontEqual(){
  console.log("ThrowErrorVectorMagnitudeAndVectorDontEqual");
}


function CalculateVariableVectorCurrentStateAndValueFromComponents(components){
  // this function takes an object that represents the components of a variable vector and it figures out if the
  // variable's currentState should be known or unknown. And if it is known then it looks at the component data and
  // sees if it can render a latex string representing what the each component of the vector equals making sure
  // that everything is in the same coordinate system 
  let keys = Object.keys(components);
  let variableVectorData = {
    // this means that all three components of this vector are defined in some shape or form so overall the variable is known
    currentState: keys.filter((key) =>{return  key != "coordinateSystem"}).length >= 3 ? "known" : "unknown",
    value: undefined,
  };

  //console.log("CalculateVariableVectorCurrentStateAndValueFromComponents");

  // if the currentState is known then we will try to create a latex string for the value that represents the known values of the components
  if(variableVectorData.currentState == "known"){
    //if every component in the variable has a value that is not undefined then we can continue and try to create a latex string to represent the value of the variable
    
    //this variable keeps track of whether or not all the components are defined. if even one component is not defined then we will not try to create a latex string
    // for the variable value.
    let allComponentValuesAreDefined = true; 
    // before we try to figure out what coordinate system these components should be using we will check first if they are all using generic demension unit vectors
    // if so it will be very easy to display these components as latex string in the variable value. Other wise we will have to do a little more thoughtful parsing
    // to get what we want
    let allComponentsUseGenericUnitVector = true;

    for(const [key, value] of Object.entries(components)){
      if(typeof(value) == "object"){//components holds a key value pair which is a string and the key is "coordinateSystem" so we only want key value pairs that are objects for example "\\comp1{\\vec{F}}" : {value : "...", unitVectorLs: "..."}
        if(value.value == undefined){
          allComponentValuesAreDefined = false;
        }
        if(!/\\dim\{\d*\}/.test(value.unitVectorLs)){
          allComponentsUseGenericUnitVector = false;
        }
      }
    }

    // before we go a step further we need to run this function that edits the components object. Pretty much what it does is it looks at all
    // the components and sees if it can figure out the coordinate system used with the components and if it can it turns generic demension
    // unit vectors ("\\dim{n}") into something more specific like "\hat{i}" to match the coordinate system used. Additionally it adds a new
    // key value pair called "coordinateSystem" which stores the coordinate system used by the components. If the "coordinateSystem" key equals
    // "generic" that means that the function wasn't able to define the coordinate system
    components = FigureOutCoordinateSystemEachComponent(components);

    if(allComponentValuesAreDefined){
      //this line tries to get all of the unit vectors on the same page which coordinate system to use if possible. It does this by looking at
      //the current unitVectorLs assigned and seeing if it can figure out the coordinate system based on the ones it finds and changes all
      //generic unitVectorLs to a specific coordinate system
      
      if(allComponentsUseGenericUnitVector){
        //if all the components use generic unit vector then it will be very easy to render a latex string for the variable value
        let variableValue = [];
        for(let [key, value] of Object.entries(components)){
          if(typeof(value) == "object"){//components holds a key value pair which is a string and the key is "coordinateSystem" so we only want key value pairs that are objects for example "\\comp1{\\vec{F}}" : {value : "...", unitVectorLs: "..."}
            variableValue.push(value.value);
          }
          
        }

        variableVectorData.value = `\\left[${variableValue.join(",")}\\right]`;

      }else{
        // next we need to see if we could render the components into a variable value latex string. We do this by only looking at the components
        //whose values don't equal "0" then we check if the remain values are a part of the same coordiante system and if they are then we do the 
        // last step and actually parse the components object into a variable value latex string
        let nonZeroComponents = {};
        for(let [key, value] of Object.entries(components)){
          if(typeof(value) == "object"){//components holds a key value pair which is a string and the key is "coordinateSystem" so we only want key value pairs that are objects for example "\\comp1{\\vec{F}}" : {value : "...", unitVectorLs: "..."}
            if(value.value != "0"){
              nonZeroComponents[key] = value;
            }
          }
          
        }
        //now nonZeroComponents is populated
        // if there are no components in the nonZeroComponents object then we will render the zero vector for the variable value
        if(Object.keys(nonZeroComponents).length == 0){
          variableVectorData.value = "\\vec{0}"
        }else{
          // now we have to see if the non zero components unitVector coordinate systems match
          // the function we will use to do this takes RID Strings so we have to convert the unitVectorLs to ridStrings
          let unitVectorRIDStrings = [];
          let variableValue = [];// an array of component data in the form of latex string 
          for(let [key, value] of Object.entries(nonZeroComponents)){
            unitVectorRIDStrings.push(UniqueRIDStringObj[value.unitVectorLs].ridString);
            variableValue.push(`${value.value} ${value.unitVectorLs}`);
          }
          let originalStr = unitVectorRIDStrings.join(" ");
          let expressionUnitVectorsMatchObj = DoExpressionUnitVectorsMatch({str: originalStr,throwError: false});
          //console.log('expressionUnitVectorsMatchObj',expressionUnitVectorsMatchObj);
          if(expressionUnitVectorsMatchObj.answer){
            //console.log("variableValue", variableValue);
            if(originalStr != expressionUnitVectorsMatchObj.str && expressionUnitVectorsMatchObj.coorsLs != undefined){
              // this means that this function had to replace generic n demensional unit vectors with more specific coordinate systems 
              // so we also need to replace all unit vector latex string that are generic with their more specific unit vector counter part
              variableVectorData.value = variableValue.join(" + ").replace(/\\dim\{1\}/,expressionUnitVectorsMatchObj.coorsLs[0]).replace(/\\dim\{2\}/,expressionUnitVectorsMatchObj.coorsLs[1]).replace(/\\dim\{3\}/,expressionUnitVectorsMatchObj.coorsLs[2])
            }else{
              //otherwise if the strings match then we don't have to change anything
              variableVectorData.value = variableValue.join(" + ");
            }
            
          }
        }
      }

    }
  }

  variableVectorData.components = components;

  return variableVectorData;
}

function FigureOutCoordinateSystemEachComponent(components){
  let componentUnitVectors = [];// an array of all the unit vectors used in the variable vector components 
  for(let [key, value] of Object.entries(components)){
    if(typeof(value) == "object"){//components holds a key value pair which is a string and the key is "coordinateSystem" so we only want key value pairs that are objects for example "\\comp1{\\vec{F}}" : {value : "...", unitVectorLs: "..."}
      componentUnitVectors.push(value.unitVectorLs);
    }
    
  }
  // this function takes a components object and it tries to figure out what coordinate system the components should use and if it arrives at just generic then we return the object back the way we got it
  // this holds an array of all the generic demension unit vectors used in the editor example "\\dim{2}"
  let allGenericUnitVectors = Object.keys(UniqueRIDStringObj).filter((key)=>{ return /\\dim\{\d*\}/.test(key)})
  let coors = {
    generic: {
      label: "\\text{Generic N Demensional Vector}",
      coors: allGenericUnitVectors,//generic
      unique: allGenericUnitVectors,//generic
      uniquePairs: [],
      unallowedUnitVectors: ["\\hat{r}","\\hat{\\theta}","\\hat{z}"],//r,theta,or z
    },
    cartesianXYZ: {
      label: "\\text{Cartesian}\\ \\left(\\hat{x},\\hat{y},\\hat{z} \\right)",
      coors: ["\\hat{x}","\\hat{y}","\\hat{z}"],//cartensian
      unique: ["\\hat{x}","\\hat{y}"],
      uniquePairs: [],
      unallowedUnitVectors: ["\\hat{r}","\\hat{\\theta}"],//r or theta
    },
    cartesianIJK: {
      label: "\\text{Cartesian}\\ \\left(\\hat{i},\\hat{j},\\hat{k}\\right)",
      coors: ["\\hat{i}","\\hat{j}","\\hat{k}"],//cartesian
      unique: ["\\hat{i}","\\hat{j}","\\hat{k}"],//cartesian
      uniquePairs: [],
      unallowedUnitVectors: ["\\hat{r}","\\hat{\\theta}","\\hat{z}"],//r,theta,or z
    },
    cylindrical: {
      label: "\\text{Cylindrical}\\ \\left(\\hat{r},\\hat{\\theta},\\hat{z}\\right)",
      coors: ["\\hat{r}","\\hat{\\theta}","\\hat{z}"],//cylindrical
      unique: [],
      uniquePairs: [
        ["\\hat{r}","\\hat{z}"],
        ["\\hat{\\theta}","\\hat{z}"],
      ],
      unallowedUnitVectors: [],
    },
    spherical: {
      label: "\\text{Spherical}\\ \\left(\\hat{r},\\hat{\\theta},\\hat{\\phi}\\right)",
      coors: ["\\hat{r}","\\hat{\\theta}","\\hat{\\phi}"],//spherical
      unique: ["\\hat{\\phi}"],
      uniquePairs: [],
      unallowedUnitVectors: ["\\hat{z}"],//z
    }
  };


  let coorKey = null;
  let foundKey = false;

  for(const [key, value] of Object.entries(coors)){
    foundKey = false;

    //checking if either strings have a unique identify unit vector
    if(value.unique.some((unitVectorLs) => {return componentUnitVectors.indexOf(unitVectorLs) != -1})){
      if(coorKey == null || coorKey == "generic"){
        coorKey = key;
        foundKey = true;
      }
    }

    if(!foundKey){
      //checking if either string has a unique identifing pair of unit vectors
      if(value.uniquePairs.some((pairs) => {return componentUnitVectors.indexOf(pairs[0]) != -1 && componentUnitVectors.indexOf(pairs[1]) != -1})){
        if(coorKey == null || coorKey == "generic"){
          coorKey = key;
        }
      }
    }
  }

  //now that we have recorded possible coordinate system that these components could be a part of in the form of coorKey we need to return an editted version of components where we apply the coordinate system we found to the vectors
  if(coorKey != "generic"){// if coorKey == "generic" then we can't change the components to make them any more descriptive then they already are
    for(let [key, value] of Object.entries(components)){
      if(typeof(value) == "object"){//components holds a key value pair which is a string and the key is "coordinateSystem" so we only want key value pairs that are objects for example "\\comp1{\\vec{F}}" : {value : "...", unitVectorLs: "..."}
        if(/\\comp1\{/.test(key)){
          components[key].unitVectorLs = coors[coorKey].coors[0];
        }else if(/\\comp2\{/.test(key)){
          components[key].unitVectorLs = coors[coorKey].coors[1];
        }else if(/\\comp3\{/.test(key)){
          components[key].unitVectorLs = coors[coorKey].coors[2];
        }
      }
      
    }
  }

  //we need to save the coordinate system that this vector should overall follow
  components.coordinateSystem = coorKey;

  //now we return the component object which may or may not hvae changed
  return components;


}

function ChooseUnitVectorLsToUse(unitVectorLs1, unitVectorLs2){
  // this function takes two unitVectorLs and it figures out which one is the best one to use and is the most explicit.
  // for example if one is "\\dim{1}" and the other is "\\hat{x}" then "\\hat{x}" wins. If one is equal to null then we
  //choose the other one. If both are equal to null then we return null

  if(unitVectorLs1 == null && unitVectorLs2 == null){return null}
  if(unitVectorLs1 == null){return unitVectorLs2}
  if(unitVectorLs2 == null){return unitVectorLs1}
  //if we have gotten to this point that means that both of the strings are not equal to null so now the real comparing begins
  if(/\\dim\{\d*\}/.test(unitVectorLs1)){return unitVectorLs2}// if the first one is a generic "\\dim{n}" choose the second one
  if(/\\dim\{\d*\}/.test(unitVectorLs2)){return unitVectorLs1}// if the second one is a generic "\\dim{n}" choose the first one
  // if we get to this point that means that both unitVectors are not generic "\\dim{n}" so either one is valid so I will just choose the first one
  return unitVectorLs1;
}

function FindAndParseDerivativesAndReturnLatexStringWithNerdamerDerivatives(ls, uniqueRIDStringArray, lineNumber, mfID){
  //this function goes through the ls and replaces every instance of a derivative notation with its correct nerdamer string
  //we are going to loop through each differential variable and see if it is being used in a derivative and format it to something nerdamer can understand
  let index = 0; 
  let i1 = 0;
  let i2 = 0;
  while(index < uniqueRIDStringArray.length){
    let dv = uniqueRIDStringArray[index].differentialVariable;
    let pdv = uniqueRIDStringArray[index].partialDifferentialVariable;
    //first derivative
    while(ls.indexOf(`\\frac{d}{${dv}}`) != -1){
      //we found a differential variable operator and we are checking if it is formatted properly in such a way that we can actually do the derivative of the expression inside
      i1 = ls.indexOf(`\\frac{d}{${dv}}`);
      if(ls.substring(i1 + `\\frac{d}{${dv}}`.length).indexOf("\\left(") == 0){
        i2 = FindIndexOfClosingParenthesis(ls.substring(i1 + `\\frac{d}{${dv}}\\left(`.length));
        if(i2 != null){
          i2 += i1 + `\\frac{d}{${dv}}\\left(`.length;//this accounts for the shift because we used a substring of ls
          //next we need to format the string with nerdamer function "diff"
          ls = `${ls.substring(0, i1)} diff(${ls.substring(i1 + `\\frac{d}{${dv}}\\left(`.length, i2 - "\\right".length)}, ${uniqueRIDStringArray[index].variable})${ls.substring(i2+1)}`
        }
        else{
          console.log("couldn't find closing parenthesis");
          return null;
        }
      }
      else{
        return null;//the user hasn't formatted the derivative in such a way that we can actually calculate what it is
      }
    }

    //second derivative
    while(ls.indexOf(`\\frac{\\d^{2}}{${dv}^{2}}`) != -1){
      //we found a differential variable operator and we are checking if it is formatted properly in such a way that we can actually do the derivative of the expression inside
      i1 = ls.indexOf(`\\frac{\\d^{2}}{${dv}^{2}}`);
      if(ls.substring(i1 + `\\frac{\\d^{2}}{${dv}^{2}}`.length).indexOf("\\left(") == 0){
        i2 = FindIndexOfClosingParenthesis(ls.substring(i1 + `\\frac{\\d^{2}}{${dv}^{2}}\\left(`.length));
        if(i2 != null){
          i2 += i1 + `\\frac{\\d^{2}}{${dv}^{2}}\\left(`.length;//this accounts for the shift because we used a substring of ls
          //next we need to format the string with nerdamer function "diff"
          ls = `${ls.substring(0, i1)} diff(${ls.substring(i1 + `\\frac{\\d^{2}}{${dv}^{2}}\\left(`.length, i2 - "\\right".length)}, ${uniqueRIDStringArray[index].variable}, 2)${ls.substring(i2+1)}`
        }
        else{
          console.log("couldn't find closing parenthesis");
          return null;
        }
      }
      else{
        return null;//the user hasn't formatted the derivative in such a way that we can actually calculate what it is
      }
    }

    //first partial derivative 
    while(ls.indexOf(`\\frac{\\partial}{${pdv}}`) != -1){
      //we found a differential variable operator and we are checking if it is formatted properly in such a way that we can actually do the derivative of the expression inside
      i1 = ls.indexOf(`\\frac{\\partial}{${pdv}}`);
      if(ls.substring(i1 + `\\frac{\\partial}{${pdv}}`.length).indexOf("\\left(") == 0){
        i2 = FindIndexOfClosingParenthesis(ls.substring(i1 + `\\frac{\\partial}{${pdv}}\\left(`.length));
        if(i2 != null){
          i2 += i1 + `\\frac{\\partial}{${pdv}}\\left(`.length;//this accounts for the shift because we used a substring of ls
          //next we need to format the string with nerdamer function "diff"
          ls = `${ls.substring(0, i1)} diff(${ls.substring(i1 + `\\frac{\\partial}{${pdv}}\\left(`.length, i2 - "\\right".length)}, ${uniqueRIDStringArray[index].variable})${ls.substring(i2+1)}`
        }
        else{
          console.log("couldn't find closing parenthesis");
          return null;
        }
      }
      else{
        return null;//the user hasn't formatted the derivative in such a way that we can actually calculate what it is
      }
    }

    //second partial derivative
    while(ls.indexOf(`\\frac{\\partial^{2}}{${pdv}^{2}}`) != -1){
      //we found a differential variable operator and we are checking if it is formatted properly in such a way that we can actually do the derivative of the expression inside
      i1 = ls.indexOf(`\\frac{\\partial^{2}}{${pdv}^{2}}`);
      if(ls.substring(i1 + `\\frac{\\partial^{2}}{${pdv}^{2}}`.length).indexOf("\\left(") == 0){
        i2 = FindIndexOfClosingParenthesis(ls.substring(i1 + `\\frac{\\partial^{2}}{${pdv}^{2}}\\left(`.length));
        if(i2 != null){
          i2 += i1 + `\\frac{\\partial^{2}}{${pdv}^{2}}\\left(`.length;//this accounts for the shift because we used a substring of ls
          //next we need to format the string with nerdamer function "diff"
          ls = `${ls.substring(0, i1)} diff(${ls.substring(i1 + `\\frac{\\partial^{2}}{${pdv}^{2}}\\left(`.length, i2 - "\\right".length)}, ${uniqueRIDStringArray[index].variable}, 2)${ls.substring(i2+1)}`
        }
        else{
          console.log("couldn't find closing parenthesis");
          return null;
        }
      }
      else{
        return null;//the user hasn't formatted the derivative in such a way that we can actually calculate what it is
      }
    }

    index++;
  }

  return ls;
}

function DivideLimitIntoVariableAndValue(ls){
  let obj = null;
  let a = [];
  // the limit can either be formmatted using the "\\to" or "\\rightarrow" latex string
  if(ls.split("\\to").length == 2){
    a = ls.split("\\to");
  }else if(ls.split("\\rightarrow").length == 2){
    a = ls.split("\\rightarrow");
  }

  if(a.length == 2){
    //we need to make sure that there is only one variable on the left handside of the "\\to" operator and 0 or 1 variable on the right handside
    let v = GetVariablesFromLatexString(a[0]);
    let v2 = GetVariablesFromLatexString(a[1]);
    if(v.length == 1 && v2.length <= 1){
      let foundUnallowedCharacter = false;
      let unallowedCharacters = ListOfOperators.concat(["^"]);
      for(var j = 0; j < unallowedCharacters.length; j++){
        if(a[0].indexOf(unallowedCharacters[j]) != -1 || a[1].indexOf(unallowedCharacters[j]) != -1){
          foundUnallowedCharacter = true;
          break;
        }
      }
      if(!foundUnallowedCharacter){
        if(v.length == 1){
          obj = {
            variable: v[0],
            value: a[1],
          }
        }
      }
    }
  }

  return obj;
}


function FindAndParseLimitsAndReturnLatexStringWithNerdamerLimits(ls, uniqueRIDStringArray, lineNumber, mfID){
  //this function takes a string and tries to find all the intsances of \\lim_{x\\to y}\\left(....\\right) and converter them to a nerdamer string like limit(...,x,y)
  let newLs = "";
  let s;
  let i = 0;
  let i2 = 0;
  let i3 = 0;
  let delta = 0;
  let foundMatch = false;
  while(i < ls.length){
    foundMatch = false;
    delta = 1;
    s = ls.substring(i);
    if(s.indexOf("\\lim") == 0){
  
      if(!foundMatch && s.indexOf("\\lim_{") == 0){
        let limit;
        let expression;
        //we need to check if there is a definite integral
        i2 = FindIndexOfClosingBracket(s.substring("\\lim_{".length));
        if(i2 != null){
          i2 += "\\lim_{".length;
          limit = s.substring("\\lim_{".length, i2);
          //console.log("substring:" + s.substring(i2+1));
          if(s.substring(i2+1).indexOf("\\left(") == 0){//checking if there is an uppeerbound to this integral
            i3 = FindIndexOfClosingParenthesis(s.substring(i2 + 1 + "\\left(".length));
            if(i3 != null){
              i3 += i2 + 1 + "\\left(".length;//acounts for the shift because we used a substring
              expression = s.substring(i2 + 1 + "\\left(".length, i3 - "\\right".length);
              //so we found a match but now we need to make sure that the limit is formatted correctly
              foundMatch = true;
              //now that we have the expression and the limit we need to make sure that the limit is formatted properly
              //we need to divide the limit into the variable and the value it is approaching
              let formattedLimit = DivideLimitIntoVariableAndValue(limit);
              if(formattedLimit == null){

                CreateInlineMathFieldError({
                  mfID: mfID,
                  error: "Cannot evaluate limit",
                  latexExpressions: [
                    "x^{2}\\to a \\ \\text{variable can not be an expression}",
                    "x\\to a^2,\\ x\\to a\\cdot b,\\ x\\to 4^3 \\ \\text{the value the variable approaches can not be an expression}",
                    "x\\to a^{-},\\ x\\to a^{+} \\ \\text{the editor can not calculate or distinguish between approaching from the left or right}",
                    "x\\to\\infty \\ \\text{the editor can not calculate limits that approach infinity}"
                  ],
                });

                return null;

              }else{
                delta = i3 + 1;
                newLs += `limit(${expression}, ${formattedLimit.variable}, ${formattedLimit.value})`;
              }
              
            }
            else{
              console.log("trouble finding closing bracket");
              return null;
            }
          }
          else{
            CreateInlineMathFieldError({
              mfID: mfID,
              error: "Limit not formatted correctly for editor",
              latexExpressions: ["\\lim_{x\\to\\infty}\\frac{sin\\left(x\\right)}{x} \\Rightarrow \\lim_{x\\to\\infty}\\left(\\frac{sin\\left(x\\right)}{x}\\right)"],
            });

            return null;
          }
        }
        else{
          console.log("trouble finding closing bracket");
          return null;
        }
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
    if(s.indexOf("\\int") == 0){
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
                lowerbound = ExactConversionFromLatexStringToNerdamerReadableString({
                  ls: lowerbound,
                  uniqueRIDStringArray: uniqueRIDStringArray,
                  lineNumber: lineNumber,
                  mfID: mfID,
                  throwError: true,
                });
                upperbound = ExactConversionFromLatexStringToNerdamerReadableString({
                  ls: upperbound,
                  uniqueRIDStringArray: uniqueRIDStringArray,
                  lineNumber: lineNumber,
                  mfID: mfID,
                  throwError: true,
                });
                if(lowerbound != null && upperbound != null){
                  if(lowerbound.indexOf("matrix(") != -1 || upperbound.indexOf("matrix(") != -1){
                    //a vector cannot be in an integral bound
                    
                    CreateInlineMathFieldError({
                      mfID: mfID,
                      error: "Vector found in integral bounds",
                    });

                    return ls;
                  }

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
                //the integral we were parsing was not formatted properly so we need to add an error to its MathField if there isnt one already
                CreateInlineMathFieldError({
                  mfID: mfID,
                  error: "Integral not formatted correctly for editor",
                  latexExpressions: ["\\int_{x_1}^{x_2} xdx \\Rightarrow \\int_{x_1}^{x_2}\\left(xdx\\right)"],
                });
                
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
      if(!foundMatch){
        //if we havent found a match and we know that the character at this index is "\\int" then we known that the "\\int" doesnt have a parentheses after it so we need to throw an error 
        CreateInlineMathFieldError({
          mfID: mfID,
          error: "Integral not formatted correctly for editor",
          latexExpressions: ["\\int_{x_1}^{x_2} xdx \\Rightarrow \\int_{x_1}^{x_2}\\left(xdx\\right)"],
        });

        return ls;//we if we found an int we couldn't convert there is no reason to keep going and parsing the string
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
      
      if(expr.integral == "NaN"){

        CreateInlineMathFieldError({
          mfID: mfID,
          error: "Definite integral returned 'NaN' (not a number)",
        });
        return null;
      }else if(expr.integral == null){
        CreateInlineMathFieldError({
          mfID: mfID,
          error: "Editor couldn't evaluate a definite integral on this line",
        });
        return null;
      }


      expression.other = expr.other;//expr.other is a string that holds an expression which has the expressiosn that couldn't be put in the integral because they were not multiplied by the correct differential variable
      expression.integral += `+${expr.integral}`;//adding the calculation of the integral to expression.integral which keeps track of all the values of the integrals added up

      c++;
    }

    if(expression.other != "0"){
      //if there is other stuff in the integral that was not able to be integrated then we need to throw an error

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
    //we are going to add this information to the correct mathfield that has this error
    MathFields[mfID].log.error.push({
      error: EL.createLoggerErrorFromMathJsError("Expressions found inside integral without differential variable"),
    });

    return null;
  }

}

function ExactConversionFromLatexStringToNerdamerReadableString(opts){
  //requried params: ls, uniqueRIDStringArray, lineNumber, mfID
  if(opts.ls == undefined || opts.uniqueRIDStringArray == undefined || opts.lineNumber == undefined || opts.mfID == undefined){
    return null;
  }
  
  if(opts.ls.replace(/\s*/g,"").length == 0){return null};//this means we are trying to evaluate an empty ls string

  let ls = opts.ls;
  let uniqueRIDStringArray = opts.uniqueRIDStringArray;
  let lineNumber = opts.lineNumber;
  let mfID = opts.mfID;
  let throwError = (opts.throwError != undefined) ? opts.throwError : false;
  let returnFinalObject = (opts.returnFinalObject != undefined) ? opts.returnFinalObject: false;//default is to return a matrix if the exprssion is a vector
  let convertVectorsToNerdamerMatrices = (opts.convertVectorsToNerdamerMatrices != undefined) ? opts.convertVectorsToNerdamerMatrices : false;
  
  ls = FormatAbsoluteValuesSqrtOfDotProduct(ls,mfID);
  if(ls == null){return null;}

  if(convertVectorsToNerdamerMatrices){
    ls = FindAndParseVectorMultiplication(Object.assign(opts, {ls: ls}));
    if(ls == null){return null;}
  }

  //after converting things from vector to nerdamer matrices there may be new latex strings like "\\comp1{...}" that have been injected but are not accountted for in our UniqueRIDStringObj so we need to add these
  uniqueRIDStringArray = UpdateUniqueRIDStringObjUsingLs(ls.replace(/matrix\(\[/g,"(["));
  //console.log("ls",ls);

  if(ls.indexOf("\\times") != -1){
    if(throwError){

      CreateInlineMathFieldError({
        mfID: mfID,
        error: "Editor couldn't evaluate cross product",
      });

    }
    return null;
  }

  //we need to see if we can parse \int into a nerdamer string like integrate(x,x). and if we can't convert all of them then the if statement below will not allow us to check if the strings are equal
  ls = FindAndParseLimitsAndReturnLatexStringWithNerdamerLimits(ls, uniqueRIDStringArray, lineNumber, mfID);
  if(ls == null){return null;}//if we couldn't convert a latex limit to nerdamer limit there is no reason to continue because the evaluation wont work
  ls = FindAndParseDerivativesAndReturnLatexStringWithNerdamerDerivatives(ls, uniqueRIDStringArray, lineNumber, mfID);
  if(ls == null){return null;}//a derivative is formatted incorrectly so we can't check if expressions are equal
  ls = FindAndParseLatexIntegralsAndReturnLatexStringWithNerdamerIntegrals(ls, uniqueRIDStringArray, lineNumber, mfID);
  ls = FindAndConvertLatexLogsToNerdamerReadableStrings(ls);
  ls = FindAndConvertLatexSumsAndProductsToNerdamerReadableStrings(ls, mfID);
  //console.log("after alot of stuff ls", ls);
  //we have this if statement because if after we are done parsing the latex into nerdamer is it still has these pieces of text in it then we cant go further because nerdamer doesn't know how to handle these texts properly
  if(ls.indexOf("\\int") == -1 && ls.indexOf("\\prod") == -1 && ls.indexOf("\\sum") == -1 && ls.indexOf("\\nabla") == -1 && ls.indexOf("\\ln") == -1 && ls.indexOf("\\log") == -1){
    //we are passing all of the uniqueRIDString as an array into this function so that everything that can possibly get replaced gets replaced. It may not be the most efficient way of doing things but it insures that everything works
    ls = ReplaceVariablesWithUniqueRIDString(ls, GetAllUniqueRIDStringsArray(), true);//passing true as the last parameter tells this function that there are nerdamer functions in this string so don't try to replace the letters in the function names
    //console.log("replacing stuff", ls);
    try{
      let calculatedResults = nerdamer.convertFromLaTeX(ls).evaluate().expand().toString();
      //this function makes sure that the unit vector coordinate systems match
      let expressionUnitVectorsMatchObj = DoExpressionUnitVectorsMatch({str: calculatedResults, mfID: mfID});
      if(expressionUnitVectorsMatchObj.answer){
        //we set the calculatedResults equal to the objects str property because the string may have been changed so that generic demensions like "\\dim{1}" were changed to more specific coordinate systems for example "\\hat{x}"
        calculatedResults = expressionUnitVectorsMatchObj.str;
      }else{return null;}
      //if "calculatedResults is not a matrix then it just returns an array with one index
      if(returnFinalObject){
        let finalObj = {
          array: ConvertNerdamerMatrixToArray(calculatedResults),
        };

        finalObj.calculatedLs = ConvertExpressionRIDStringArrayToCalculatedLs(finalObj.array);

        return finalObj;
      }

      return calculatedResults;
    }catch(err){
      console.log(err);
      if(throwError){
        //we need to throw a general error that this expression couldn't be parsed so the editor can not verify if the line is correct or not
        
        let errorAlreadyExists = false;
        for(let error of MathFields[mfID].log.error){
          if(error.error.type == "Editor couldn't evaluate expression (this is probably an error with the editor)" && error.latexExpressions[0] == ls){
            errorAlreadyExists = true;
            break;
          }
        }
        if(!errorAlreadyExists){
          MathFields[mfID].log.error.push({
            error: EL.createLoggerErrorFromMathJsError("Editor couldn't evaluate expression (this is probably an error with the editor)"),
            latexExpressions: [ls],
          });
        }
      }
      return null;
    }
  }
  else{
    //console.log("unparsable characters")
    return null;
  }
}

function FormatAbsoluteValuesSqrtOfDotProduct(ls,mfID){
  //this function needs to find every instance of \\left| and \\right| and replace whats inside with the sqrt of the dot product which is mathematically the absoulte value is
  
  let i = 0;
  let i2 = 0;
  let stringInsideAbsoluteValue = "";
  let mismatchAbsoluteValueSign = false;
  while(ls.indexOf("\\left|") != -1 && ls.indexOf("\\right|") != -1){
    i = ls.indexOf("\\left|");
    i2 = FindIndexOfClosingPipe(ls.substring(i + "\\left|".length));
    if(i2 != null){
      i2 += i + "\\left|".length
      stringInsideAbsoluteValue = ls.substring(i + "\\left|".length, i2);
      if(stringInsideAbsoluteValue.replace(/(\s*)/g,"").replace(/\\/g,"").length == 0){
        //there is nothing inside the absolute value signs
        CreateInlineMathFieldError({
          mfID: mfID,
          error: "Empty absolute value sign",
        });
        return null;
      }
      ls = `${ls.substring(0,i)} \\left(\\sqrt{\\left(${stringInsideAbsoluteValue}\\right) \\cdot \\left(${stringInsideAbsoluteValue}\\right)}\\right) ${ls.substring(i2 + "\\right|".length)}`;
    }else{
      mismatchAbsoluteValueSign = true;
      break;
    }
  }

  if(ls.indexOf("\\left|") != -1 || ls.indexOf("\\right|") != -1 || mismatchAbsoluteValueSign){
    //the user has mismatched absolute value signs
    console.log("mismatched absolute value signs");
    CreateInlineMathFieldError({
      mfID: mfID,
      error: "Mismatched absolute value sign",
    });
    return null;
  }

  return ls;
}

function ReformatTrigonmetryRaisedToAPower(ls){
  let trigFunctionsAndInverses = {
    "\\sin": "\\arcsin",
    "\\sinh": "\\operatorname{arcsinh}",
    "\\arcsin": "\\sin",
    "\\operatorname{arcsinh}": "\\sinh",
    "\\sec": "\\operatorname{arcsec}",
    "\\operatorname{sech}": "\\operatorname{arcsech}",
    "\\operatorname{arcsec}": "\\sec",
    "\\operatorname{arcsech}": "\\operatorname{sech}",
    "\\cos": "\\arccos",
    "\\cosh": "\\operatorname{arccosh}",
    "\\arccos": "\\cos",
    "\\operatorname{arccosh}": "\\cosh",
    "\\csc": "\\operatorname{arccsc}",
    "\\operatorname{csch}": "\\operatorname{arccsch}",
    "\\operatorname{arccsc}": "\\csc",
    "\\operatorname{arccsch}": "\\operatorname{csch}",
    "\\tan": "\\arctan",
    "\\tanh": "\\arctanh",
    "\\arctan": "\\tan",
    "\\arctanh": "\\tanh",
    "\\cot": "\\operatorname{arccot}",
    "\\coth": "\\operatorname{arccoth}",
    "\\operatorname{arccot}": "\\cot",
    "\\operatorname{arccoth}": "\\coth",
  };
  for(const [trigFunc, inverseTrigFunc] of Object.entries(trigFunctionsAndInverses)){
    
    let i1 = 0;
    let i2 = 0;
    let i3 = 0;
    let stringInsidePow = "";
    while(ls.indexOf(`${trigFunc}^{`) != -1){
      i1 = ls.indexOf(`${trigFunc}^{`);
      i2 = FindIndexOfClosingBracket(ls.substring(i1 + `${trigFunc}^{`.length))
      if(i2 != null){
        i2 += i1 + `${trigFunc}^{`.length;//accounts for shift because we used a substring of ls
        stringInsidePow = ls.substring(i1 + `${trigFunc}^{`.length, i2);
        //next we need to see if the user has put parenthesis after the trig function
        if(ls.substring(i2+1).indexOf("\\left(") == 0){
          //if there are parentheses after the trig function then we need to find the closing parentheses and wrap
          //the whole function in parentheses and raise it to the exponent we found earlier
          i3 = FindIndexOfClosingParenthesis(ls.substring(i2 + 1 + "\\left(".length));
          if(i3 != null){
            i3 += i2 + 1 + "\\left(".length;//accounts for the shift because we used a substring of ls
            if(stringInsidePow == "-1"){//we need to assume the user is referring to the inverse of the function
              ls = `${ls.substring(0, i1)}\\left(${inverseTrigFunc}${ls.substring(i2+1,i3+1)}\\right)${ls.substring(i3+1)}`;
            }else{
              ls = `${ls.substring(0, i1)}\\left(${trigFunc}${ls.substring(i2+1,i3+1)}\\right)^{${stringInsidePow}}${ls.substring(i3+1)}`;
            }
            
          }else{
            break;
          }
        }else{
          //if there are not opening parentheses after the trig function we will put some in and raise the trig function to the exponent we found
          if(stringInsidePow == "-1"){//we need to assume the user is referring to the inverse of the function
            ls = `${ls.substring(0,i1)}\\left(${inverseTrigFunc}\\left(\\right)\\right)${ls.substring(i2+1)}`;
          }else{
            ls = `${ls.substring(0,i1)}\\left(${trigFunc}\\left(\\right)\\right)^{${stringInsidePow}}${ls.substring(i2+1)}`;
          }  
          
        }
      }else{
        break;
      }
    }

  }

  return ls;
}

function ConvertExpressionRIDStringArrayToCalculatedLs(ExpressionRIDStringArray){
  //we need to convert each string in the finalObj array to latex
  let arrayLs = ExpressionRIDStringArray.map((str) => {
    if(str.alreadyLatex == true){
      return str.value;
    }
    return ReplaceUniqueRIDStringWithVariableLs(nerdamer.convertToLaTeX(str), GetAllUniqueRIDStringsArray());
  });

  let calculatedLs = "";

  //if the array of calculated latex strings is an array because it is a general vector of demension n we
  //need to clean out our special characters "\\dim{n}" because they don't mean anything in real latex.
  //Then we need to wrap the string in brackets "[" "]" and put commas in between components so it looks like a general n demensional vector. example \\left[a,b,c\\right] 
  if(arrayLs.join(" + ").indexOf("\\dim{") != -1){
    calculatedLs = `\\left[${arrayLs.join(", ").replace(/\\cdot\s*\\dim\{\d\}/g,"")}\\right]`;
  }else{
    //if it is a normal vector like cartensian, cylinderical, or sphericial or just a string we will join its
    //components with a plus. Example ["2\\cdot\\hat{x}","3\\cdot\\hat{y}"] -> "2\\cdot\\hat{x} + 3\\cdot\\hat{y}" which is nice and readable in latex
    //removing any indexes that are just "0". We couldn't do that untill we were sure that this is not a generic n demensional vector because if it was
    //the "0"'s act as place holders for demensions so you could have a vector like [1,0,2]. but if it is a unit vector 1\hat{x} + 0 + 2\hat{z} in this case we don't need the "0"
    calculatedLs = arrayLs.filter((value)=>{return value != "0"}).join(" + ");
  }

  return calculatedLs == "" ? "0" : calculatedLs;
}

function ConvertNerdamerMatrixToArray(str){
  if(str.indexOf("matrix(") == -1){return [str];}

  let array = [];
  let foundLastIndex = false;
  let i = 0;
  while(!foundLastIndex){
    try{
      let s = nerdamer(`matget(${str},${i},0)`).toString();
      array.push(s);
    }catch(err){
      foundLastIndex = true;
    }
    i++;
  }

  return array;
}

function FormatVectorsIntoNerdamerVectors(ls){
  return ls.replace(/\(\[/g, "vector(").replace(/\]\)/g, ")");
}

function FormatNerdamerSquareBracketsToVectors(str){
  return str.replace(/\[/g,"vector(").replace(/\]/g,")");
}

function GetSummationBound(bound, ls){
  let obj;
  if(bound == "lower"){
    obj = {
      variable: null,
      lowerbound: null,
    }
    let a = ls.split("=");
    if(a.length == 2){
      if(Number.isInteger(Number(a[1]))){
        let foundUnallowedCharacter = false;
        let unallowedCharacters = ListOfOperators.concat(["^"]);
        for(var j = 0; j < unallowedCharacters.length; j++){
          if(a[0].indexOf(unallowedCharacters[j]) != -1){
            foundUnallowedCharacter = true;
            break;
          }
        }
        if(!foundUnallowedCharacter){
          let v = GetVariablesFromLatexString(a[0]);
          if(v.length == 1){
            obj = {
              variable: v[0],
              lowerbound: Number(a[1]),
            }
          }
        }
      }
    }
  }
  else{
    if(Number.isInteger(Number(ls)) && ls.length > 0){
      obj = {
        upperbound: ls,
      }
    }else{
      obj = {
        upperbound: null,
      }
    }
  }

  return obj;
}



function FindAndConvertLatexSumsAndProductsToNerdamerReadableStrings(ls, mfID){
  let i1 = 0;
  let i2 = 0;
  let i3 = 0;
  let i4 = 0;
  for(var operation of [["sum","sum","Summation"], ["prod","product","Product"]]){
    while(ls.indexOf(`\\${operation[0]}_{`) != -1){

      let params = {
        variable: null,
        lowerbound: null,
        upperbound: null,
      };
  
      i1 = ls.indexOf(`\\${operation[0]}_{`);
      i2 = FindIndexOfClosingBracket(ls.substring(i1  + `\\${operation[0]}_{`.length));
      if(i2 != null){
        i2 += i1  + `\\${operation[0]}_{`.length;//this accounts for the shift beecause we used a substring of ls
        //we need to now check that the lowerbound of this summation is formatted properly
        Object.assign(params, GetSummationBound("lower", ls.substring(i1 + `\\${operation[0]}_{`.length, i2)));
        if(params.lowerbound != null){
          //next we need to see if there is an upper bound and if it is formatted properly
          if(ls.substring(i2 + 1).indexOf("^{") == 0){
            i3 = FindIndexOfClosingBracket(ls.substring(i2 + 1 + "^{".length));
            if(i3 != null){
              i3 += i2 + 1 + "^{".length;
              //we need to now check that the upperbound is formatted properly
              Object.assign(params, GetSummationBound("upper",ls.substring(i2 + 1 + "^{".length, i3))); 
              if(params.upperbound != null){
                //now that we have checked that everything is formatted properly we need to see if  this summation has parentheses right after it so we know  what we are summing
                if(ls.substring(i3 + 1).indexOf("\\left(") == 0){
                  i4 = FindIndexOfClosingParenthesis(ls.substring(i3 + 1 + "\\left(".length));
                  if(i4 != null){
                    i4 += i3 + 1 + "\\left(".length;//this accounts for the shift because we are using a substring of ls
                    //replacing the latex sum with a nerdamer sum with the form "sum(expression, variable, lowerbound, upperbound)"
                    ls = `${ls.substring(0,i1)} ${operation[1]}(${ls.substring(i3 + 1 + "\\left(".length, i4 - "\\right".length)}, ${params.variable}, ${params.lowerbound}, ${params.upperbound}) ${ls.substring(i4+1)}`;
                  }else{
                    console.log("couldn't find index of closing parentheses");
                    break;
                  }
                }else{
                  //a summation or product is not formatted properly
                  CreateInlineMathFieldError({
                    mfID: mfID,
                    error: `${operation[2]} not formatted correctly for editor`,
                    latexExpressions: [`\\${operation[0]}_{n=1}^{2} n+1 \\Rightarrow \\${operation[0]}_{n=1}^{2}\\left( n+1\\right)`],
                  });
                  //console.log("summation doesn't have parentheses after it");
                  break;
                }
              }else{
                //console.log("upper bound not formatted properly");
                break;
              }
            }else{
              console.log("couldn't find index of closing bracket");
              break;
            }
          }else{
            console.log("no upper bound found");
            break;
          }
        }else{
          console.log("lower bound not formatted properly")
          break;
        }
      }else{
        console.log("couldn't find index of closing bracket");
        break;
      }
    }
  }
  

  return ls;
}

function FindAndConvertLatexLogsToNerdamerReadableStrings(ls){
  //first thing we need to do is change all "\\ln" natural logs in to "log" which is the way nerdamer understands natural log
  ls = ls.replace(/\\ln/g,"log");
  //then we need to find every instance of "\\log\\left(" log base 10 and change it into "log10" which is nerdamers log base 10 function
  ls = ls.replace(/\\log\\left\(/g,"log10(").replace(/\\log\(/g,"log10(");
  while(ls.indexOf("\\log_{") != -1){
    i1 = ls.indexOf("\\log_{");
    i2 = FindIndexOfClosingBracket(ls.substring(i1 + "\\log_{".length));
    if(i2 != null){
      i2 += i1 + "\\log_{".length;//accounts for the shift because we used a substring of ls
      //now that we have found the closing bracket we want to check that the stuff inside of it is a number otherwise we just break out of this while loop and give up
      //ls.substring(i1 +  "\\log_{".length, i2) holds the base of the log
      //the string inside is a number
      if(ls.substring(i2 + 1).indexOf("\\left(") == 0){
        ls = `${ls.substring(0, i1)}log10(${ls.substring(i1 +  "\\log_{".length, i2)})^(-1)*log10(${ls.substring(i2 + 1 + "\\left(".length)}`;
      }
      else{
        break;//because the user hasn't yet formatted the string properly. they need to have something like "\\log_{number}(expression)" or "\\log_{number}()"
      }
    }
    else{//theere was trouble finding the closing bracket so just stop
      console.log("trouble finding closing bracket");
      break;
    }
  }
  
  return ls;

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

  //we have to first evaluate the integral using integral not a definite integral because that creates unnecessary huge fractions and then plug in the bounds
  let evaluatedIntegral = nerdamer(`integrate(${expression.integral},${variableRidString})`).toString();
  let definiteIntegral = null;
  let upperboundObj = {};
  upperboundObj[variableRidString] = upperbound;
  let lowerboundObj = {};
  lowerboundObj[variableRidString] = lowerbound;
  //we are going to create a definite integral using nerdamer integrate function and then evaluate the integral at two different points and subtract them. We do it this way because the "defint" function evaluates fractions wierd. For example if the answer is suppose to be 4/3 "defint" will produce 1.3333 then convert that to a hug fraction -> "1333214809761/999911107321"
  //when we do it this way the intefrals so far always return clean fractions
  try{
    //evaluating the integral at the upperbound then subtracting the evalaution at the lowerbound of the same integral to create the answer fr othe definite integral
    definiteIntegral = nerdamer(evaluatedIntegral).evaluate(upperboundObj).subtract(nerdamer(evaluatedIntegral).evaluate(lowerboundObj).toString()).toString();
  }catch(err){
    //we couldn't calculate the definite integral
    definiteIntegral = null;
  }

  return {
    integral: definiteIntegral,
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
