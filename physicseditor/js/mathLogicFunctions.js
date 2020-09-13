let ListOfFunctions = ["\\sum", "\\prod","\\sqrt","\\sin", "\\cos", "\\tan", "\\csc", "\\sec", "\\cot", "\\sinh", "\\cosh", "\\tanh", "\\coth", "\\arcsin", "\\arccos", "\\arctan", "\\exp", "\\lg", "\\ln", "\\log",];

let ListOfOperators = [
  "\\frac", "\\sqrt", "\\int", "\\oint", "\\sum", "\\prod", "\\triangledown","\\cdot","\\ast","\\bigcup","\\coprod","\\pm", "-", "+", "\\times","\\circ",
  "<", ">", "=","*", "\\doteq", "\\geq", "\\leq", "\\leqslant", "\\geqslant", "\\equiv", "\\neq", "\\ngtr", "\\nless", "\\nleqslant", "\\ngeqslant", "\\approx", "\\simeq", "\\cong", "\\propto",
  "\\leftarrow", "\\rightarrow", "\\Leftarrow", "\\Rightarrow", "\\leftrightarrow", "\\Leftrightarrow", "\\leftrightharpoons", "\\rightleftharpoons",
  "\\left(", "\\right)","\\left|", "\\right|", "\\left \\|", "\\right \\|", "\\left[", "\\right]", "\\left [", "\\right ]", "\\left\\langle", "\\right\\rangle", "\\left \\{", "\\right \\}", "\\left |", "\\right |",
  "\\to", "\\lim","\\sin", "\\cos", "\\tan", "\\csc", "\\sec", "\\cot", "\\sinh", "\\cosh", "\\tanh", "\\coth", "\\arcsin", "\\arccos", "\\arctan", "\\exp", "\\lg", "\\ln", "\\log",
];

//there are some latex strings in this array that aren't greek letters but the editor treats them like letters when it parses them
let LatexGreekLetters = [
  "\\infty","\\hbar","\\nabla","\\alpha","\\beta", "\\gamma", "\\delta", "\\epsilon", "\\varepsilon", "\\zeta", "\\eta", "\\theta", "\\vartheta", "\\iota", "\\kappa", "\\lambda", "\\mu", "\\nu", "\\xi", "\\pi", "\\varpi", "\\rho", "\\varrho", "\\sigma", "\\varsigma", "\\tau", "\\upsilon", "\\phi", "\\varphi", "\\chi", "\\psi", "\\omega", "\\Gamma", "\\Delta", "\\Lambda", "\\Theta", "\\Xi", "\\Pi", "\\Upsilon", "\\Sigma", "\\Phi", "\\Psi", "\\Omega",
];


function RemoveSumsAndProdsFromLatexString(ls){
  for(let operation of ["sum", "prod"]){
    //this code clear sums from ls string that look like \sum_{...}^{...} or \sum ^{...}
    while(ls.indexOf(`\\${operation}_{`) != -1){
      i1 = ls.indexOf(`\\${operation}_{`);
      i2 = FindIndexOfClosingBracket(ls.substring(i1 + `\\${operation}_{`.length));
      if(i2 != null){
        i2 += i1 + `\\${operation}_{`.length;//accounts for the shift because we used a substring of ls
        if(ls[i2 + 1] == "^"){//this means the sum is formated like: \sum_{...}^{...}
          i3 = FindIndexOfClosingBracket(ls.substring(i2 + 3));
          if(i3 != null){
            i3 += i2 + 3;//adjust for shift
            ls = ls.substring(0,i1) + ls.substring(i3 + 1);//removing sum formatted as: \sum_{...}^{...}
          }
          else{//theere was trouble finding the closing bracket so just stop
            console.log("trouble finding closing bracket for sum or prod");
            break;
          }
        }
        else{
          ls = ls.substring(0,i1) + ls.substring(i2 + 1);//removing sum formatted as: \sum_{...}
        }
      }
      else{//theere was trouble finding the closing bracket so just stop
        console.log("trouble finding closing bracket for sum or prod");
        break;
      }
    }

    while(ls.indexOf(`\\${operation} ^{`) != -1){
      i1 = ls.indexOf(`\\${operation} ^{`);
      i2 = FindIndexOfClosingBracket(ls.substring(i1 + `\\${operation} ^{`.length));
      if(i2 != null){
        i2 += i1 + `\\${operation} ^{`.length;//accounts for the shift because we used a substring of ls
        ls = ls.substring(0,i1) + ls.substring(i2 + 1);//removing integral formatted as: \int ^{...}
      }
      else{//theere was trouble finding the closing bracket so just stop
        console.log("trouble finding closing bracket for sum or prod");
        break;
      }
    }
  }

  return ls;
}

function GetVariablesFromLatexString(ls){
  ls = PutBracketsAroundAllSubsSupsAndRemoveEmptySubsSups(ls);
  ls = RemoveDifferentialOperatorDFromLatexString(ls);
  ls = RemoveSumsAndProdsFromLatexString(ls);//we will implement this line once we have more support for setting and defining parameters from summations
  let vars = [];
  let str = "";
  let answer;
  let state = {
    index: 0,
    ls: ls,
    currentlyParsingVariable: false,
    numberOfRightBracketsNeeded: 0,
  };
  while(state.index < ls.length){
    answer = ThisIsTheBeginningOfAVariable(state);
    if(answer.yes){
      str = answer.substring;
    }
    else{
      answer = ThisIsTheContinuationOfAVariable(state);
      if(answer.yes){
        str += answer.substring;
      }
      else{
        answer = ThisIsTheEndOfAVariable(state)
        if(answer.yes){
          vars.push(str);//Adding
          str = "";
        }
        else{
          answer = ThisIsFormattingText(state);
        }
      }
    }

    state = Object.assign({}, answer.newState);

  }

  if(state.currentlyParsingVariable){
    vars.push(str);
  }

  //we need to filter the array for only unique values
  let uniqueVars = vars.filter((value, index, self)=>{
    return self.indexOf(value) === index
  });

  return uniqueVars;
}

function ThisIsTheBeginningOfAVariable(state){
  let subLs = state.ls.substring(state.index);
  let alpha = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
  let answer = {
    yes: false,
    newState: Object.assign({}, state),
    substring: "",
  }
  if(!state.currentlyParsingVariable){
    //we need to see if the current character could be the start of a variable
    if(subLs[0] == "\\"){
      //it could equal a blackslash because it is the start of a vector variable '\vec{}'
      let size = null;
      if(subLs.indexOf("\\vec{") == 0 || subLs.indexOf("\\bar{") == 0 || subLs.indexOf("\\hat{") == 0 || subLs.indexOf("\\dot{") == 0){
        size = "\\vec{".length;
      }else if(subLs.indexOf("\\overline{") == 0){
        size = "\\overline{".length;
      }else if(subLs.indexOf("\\comp1{") == 0 || subLs.indexOf("\\comp2{") == 0 || subLs.indexOf("\\comp3{") == 0){
        size = "\\comp1{".length;
      }else if(subLs.indexOf("\\dim{") == 0){
        size = "\\dim{".length;
      }

      if(size != null){
        answer.yes = true;
        answer.substring = subLs.substring(0,size);
        answer.newState.currentlyParsingVariable = true;
        answer.newState.numberOfRightBracketsNeeded = 1;//because the vec has a left bracket
        answer.newState.index += size;
      }else{
        //this checks if the variable is like a greek letter which be formatted in a latex keyword
        for(var i = 0; i < LatexGreekLetters.length; i++){
          if(subLs.indexOf(LatexGreekLetters[i]) == 0){
            //this is a variable
            answer.yes = true;
            answer.substring = subLs.substring(0,LatexGreekLetters[i].length);
            answer.newState.currentlyParsingVariable = true;
            answer.newState.index += LatexGreekLetters[i].length;
            break;//we found a match so no need to parse any more
          }
        }
      }
    }
    else if(alpha.includes(subLs[0])){
      answer.yes = true;
      answer.substring = subLs[0];
      answer.newState.currentlyParsingVariable = true;
      answer.newState.index++;
    }
  }

  return answer;
}

function ThisIsTheContinuationOfAVariable(state){
  let subLs = state.ls.substring(state.index);
  let answer = {
    yes: false,
    newState: Object.assign({}, state),
    substring: "",
  }

  if(state.currentlyParsingVariable){
    if(subLs.indexOf("'") == 0){
      answer.yes = true;
      answer.substring = subLs.substring(0,1);
      answer.newState.index += 1;
    }
    else if(subLs.indexOf("_{") == 0){//this is the only that is an acceptable continuation of a variable without the need of brackets
      answer.yes = true;
      answer.substring = subLs.substring(0,2);
      answer.newState.numberOfRightBracketsNeeded += 1;//because the "_" needs an opening and closing bracket
      answer.newState.index += 2;
    }
    else{
      //the only other way we are still parsing a variable is if there are open left brackets that are in the string that need right brackets
      if(state.numberOfRightBracketsNeeded > 0){
        if(subLs[0] == "}"){
          answer.newState.numberOfRightBracketsNeeded -= 1
        }
        else if(subLs[0] == "{"){
          answer.newState.numberOfRightBracketsNeeded += 1
        }
        //regardless of what the character is we are still continuing to make a variable because we haven't closed off all of the brackets yet
        answer.yes = true;
        answer.substring = subLs[0];
        answer.newState.index ++;

      }
    }
  }

  return answer
}

function ThisIsTheEndOfAVariable(state){
  let subLs = state.ls.substring(state.index);
  let answer = {
    yes: false,
    newState: Object.assign({}, state),
    substring: "",
  }
  //the only way that this character is not a continuation but the next character after the end of another one is that it is not an "_" and numberOfRightBracketsNeeded = 0
  if(state.currentlyParsingVariable && subLs[0] != "_" && state.numberOfRightBracketsNeeded == 0){
    answer.yes = true;
    answer.newState.currentlyParsingVariable = false;
    //ther is no substring and there is not index to change because all we are saying is that this character is not a continuation of the varaible that we were creating
  }

  return answer;
}

function ThisIsFormattingText(state){//if something is formating text than we don't really need to parse it we can just skip it
  let subLs = state.ls.substring(state.index);
  let answer = {
    yes: false,
    newState: Object.assign({}, state),
    substring: "",
  }

  if(!state.currentlyParsingVariable){//the only way something can just be formatting text is if you are first not parsing a variable
    if(subLs[0] == "\\"){
      let foundMatch = false;
      for(var i = 0; i < ListOfOperators.length; i++){
        if(subLs.indexOf(ListOfOperators[i]) == 0){
          foundMatch = true;
          answer.newState.index += ListOfOperators[i].length;//so we skip all of the irrelevant opperator text
          break;//found a match
        }
      }
      if(!foundMatch){
        answer.newState.index ++;
      }
    }
    else{
      answer.newState.index ++;
    }

  }

  return answer;
}



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

function FindIndexOfClosingSquareBracket(ls){
  let unclosedBrackets = 1;
  let i = 0;
  while(i < ls.length){
    if(ls[i] == "["){
      unclosedBrackets += 1;
    }
    else if(ls[i] == "]"){
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

function FindIndexOfClosingPipe(ls){
  let unclosedBrackets = 1;
  let i = 0;
  while(i < ls.length){
    if(ls.substring(i).indexOf("\\left|") == 0){
      unclosedBrackets += 1;
    }
    else if(ls.substring(i).indexOf("\\right|") == 0){
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