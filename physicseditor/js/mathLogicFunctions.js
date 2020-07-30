let ListOfFunctions = ["\\sum", "\\prod","\\sqrt","\\sin", "\\cos", "\\tan", "\\csc", "\\sec", "\\cot", "\\sinh", "\\cosh", "\\tanh", "\\coth", "\\arcsin", "\\arccos", "\\arctan", "\\exp", "\\lg", "\\ln", "\\log",];

function TakeOutFractionLatexFormatting(ls){
  let index = 0;
  while(ls.indexOf("\\frac") != -1){
    index = ls.indexOf("\\frac");
    let i = FindIndexOfClosingBracket(ls.substring(index + 6)) + (index + 6);//this string finds the first closing bracket of the fraction latext string  {"}"{}
    let i2 = FindIndexOfClosingBracket(ls.substring(i + 2)) + (i + 2);//this string finds the second closing bracket for the fraction latex string        {}{"}"
    //this substring removes \\frac and replaces it with a "(" then puts a "/" in between {}{} -> {}/{} then wraps the end with ")"
    ls = ls.substring(0, index) + "(" + ls.substring(index + 5, i + 1) + "/" + ls.substring(i + 1, i2 + 1) + ")" + ls.substring(i2 + 1);
    //after the line above the latex string goes from "....\\frac{a}{b}...." -> "({a}/{b})"
  }

  return ls;
}

function FlattenFractionsInLatexString(ls){
  let index = 0;
  while(ls.indexOf("\\frac") != -1){
    index = ls.indexOf("\\frac");
    let i1 = FindIndexOfClosingBracket(ls.substring(index + 6)) + (index + 6);//this finds \\frac{"}"{}
    let i2 = FindIndexOfClosingBracket(ls.substring(i1 + 2)) + i1 + 2;//this finds \frac{}{"}"
    // "....\\frac{}{" + "inverse denominator" + "}........"
    ls = ls.substring(0, i1 + 2) + DenominatorIntoInverseNumerator(ls.substring(i1 + 2, i2)) + ls.substring(i2);

    ls = ls.substring(0, index) + ls.substring(index + 5);//this removes the "\frac" latex keyword
    // "....{}{inverse denonimator}........"
  }
}

function FindIndexOfClosingBracket(ls){
  let unclosedBrackets = 1;
  let i = 0;
  while(i < ls.length){
    if(ls[i] == "{"){
      unclosedBrackets += 1;
    }
    else if(ls[i] == "}"){
      unclosedBrackets -= 1;
    }

    if(unclosedBrackets > 0){
      i++;
    }
    else{
      return i;
    }

  }
  return null;
}

/*
function ParseLatexStringIntoAlgebraJsExpression(ls){

  let exprs = [];
  exprs.push(new Expression());

  let index = 0;
  let delta = 0;
  let operation = null;
  let currentExpression = null;
  let foundMatch = false;

  while(index < ls.length){
    foundMatch = false;
    currentExpression = null;
    let s = ls.substring(index);
    if(operation == ""){
      //we are checking if the current index we are at is an operation
      let sequentialOperators = SequentialOperators.multiply.concat(SequentialOperators.add).concat(SequentialOperators.subtract);
      for(var c = 0; c < sequentialOperators.length; c++){
        if(s.indexOf(sequentialOperators[c]) == 0){
          operation = sequentialOperators[c];
          delta = sequentialOperators[c].length;
          foundMatch = true;
        }
      }
    }

    if(!foundMatch){//if we still haven't figured out what is at this index we need to check if it is a variable
      let i = AlegbraJsUnitVariables.indexOf(s[0]);
      if(i != -1){
        currentExpression = new Expression(AlegbraJsUnitVariables[i]);
        foundMatch = true;
        delta = 1;
      }
    }

    //if this thing is not a plus, minus, multiply or variable it is either a \frac,\left(,^, or function like sqrt, or cos

    if(!foundMatch){
      //checking to see if this is a fraction
      if(s.indexOf("\\frac") == 0){
        let frac = GetNumeratorAndDenominatorSubstringFromLatexString(s);
        currentExpression = ParseLatexStringIntoAlgebraJsExpression(frac.numerator).divide(ParseLatexStringIntoAlgebraJsExpression(frac.denominator));
        foundMatch = true;
        delta = ("\\frac{" + frac.numerator + "}{" + frac.denominator + "}").length;
      }
    }

    if(!foundMatch){
      //checking if this is a \left(
      if(s.indexOf("\\left(") == 0){
        let parenthesesExpressionSubstring = GetParenthesesExpressionSubstringFromLatexString(s);
        currentExpression = ParseLatexStringIntoAlgebraJsExpression(parenthesesExpressionSubstring);
        delta = ("\\left(" + parenthesesExpressionSubstring + "\\right)").length;
      }
    }

    index += delta;
  }



}
*/
function RecursivePLSIAJE(){//P.L.S.I.A.J.E stands for ParseLatexStringIntoAlgebraJsExpression

}
