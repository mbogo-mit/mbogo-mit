let ArrayOfBytes = {};
let SizeOfRID = 4;

let SequentialOperators = {
  multiply: ["\\cdot","\\ast"],
  add: ["+","\\pm"],
  substract: ["-"],
};

let ListOfOperators = [
  "\\frac", "\\sqrt", "\\int", "\\oint", "\\sum", "\\prod", "\\triangledown","\\cdot","\\ast","\\bigcup","\\coprod","\\pm", "\\times","\\circ",
  "<", ">", "=","*", "\\doteq", "\\geq", "\\leq", "\\leqslant", "\\geqslant", "\\equiv", "\\neq", "\\ngtr", "\\nless", "\\nleqslant", "\\ngeqslant", "\\approx", "\\simeq", "\\cong", "\\propto",
  "\\leftarrow", "\\rightarrow", "\\Leftarrow", "\\Rightarrow", "\\leftrightarrow", "\\Leftrightarrow", "\\leftrightharpoons", "\\rightleftharpoons",
  "\\left(", "\\right)","\\left|", "\\right|", "\\left \\|", "\\right \\|", "\\left [", "\\right ]", "\\left \\langle", "\\right \\rangle", "\\left \\{", "\\right \\}", "\\left |", "\\right |",
  "\\sin", "\\cos", "\\tan", "\\csc", "\\sec", "\\cot", "\\sinh", "\\cosh", "\\tanh", "\\coth", "\\arcsin", "\\arccos", "\\arctan", "\\exp", "\\lg", "\\ln", "\\log",
];

let LatexGreekLetters = [
  "\\nabla","\\alpha","\\beta", "\\gamma", "\\delta", "\\epsilon", "\\varepsilon", "\\zeta", "\\eta", "\\theta", "\\vartheta", "\\iota", "\\kappa", "\\lambda", "\\mu", "\\nu", "\\xi", "\\pi", "\\varpi", "\\rho", "\\varrho", "\\sigma", "\\varsigma", "\\tau", "\\upsilon", "\\phi", "\\varphi", "\\chi", "\\psi", "\\omega", "\\Gamma", "\\Delta", "\\Lambda", "\\Theta", "\\Xi", "\\Pi", "\\Upsilon", "\\Sigma", "\\Phi", "\\Psi", "\\Omega",
];

let listOfDynamicTags = [
  {tag: "\\vec", los: 6 + SizeOfRID},//ex: '\vec$NlyA$'
  {tag: "\\mathrm", los: 9 + SizeOfRID},//ex: '\mathrm$zvuu$'
  {tag: "\\hat", los: 6 + SizeOfRID},//ex: '\hat$r52f$'
  {tag: "_", los: 3 + SizeOfRID},//ex: '_$x4f7$'
  {tag: "^", los: 3 + SizeOfRID},//ex: '^$x4f7$'
  {tag: "\\frac", los: 9 + (2 * SizeOfRID)},//ex: '\frac$f73h$$t7jd$',
  {tag: "\\lim_", los: 7 + SizeOfRID},//ex: '\lim_$g6l2$',
  {tag: "\\sqrt", los: 7 + SizeOfRID},//ex: ' \sqrt$d124$',
  {tag: "\\dot", los: 6 + SizeOfRID},//ex: '\dot$4fgh$'
  {tag: "\\ddot", los: 7 + SizeOfRID},//ex: '\ddot$4fgh$',
  {tag: "\\check", los: 8 + SizeOfRID},//ex: ' \check$fghe$',
  {tag: "\\bar", los: 6 + SizeOfRID},//ex: '\bar$g43d$',
  {tag: "\\not", los: 6 + SizeOfRID},//ex: '\not$g43d$',
];

let listOfStaticTags = [
  "\\int", "\\oint", "\\sum", "\\prod", "\\triangledown","\\cdot","\\ast","\\bigcup","\\coprod","\\pm", "\\times","\\circ",
  "\\alpha","\\beta", "\\gamma", "\\delta", "\\epsilon", "\\varepsilon", "\\zeta", "\\eta", "\\theta", "\\vartheta", "\\iota", "\\kappa", "\\lambda", "\\mu", "\\nu", "\\xi", "\\pi", "\\varpi", "\\rho", "\\varrho", "\\sigma", "\\varsigma", "\\tau", "\\upsilon", "\\phi", "\\varphi", "\\chi", "\\psi", "\\omega", "\\Gamma", "\\Delta", "\\Lambda", "\\Theta", "\\Xi", "\\Pi", "\\Upsilon", "\\Sigma", "\\Phi", "\\Psi", "\\Omega",
  "<", ">", "=","*", "\\doteq", "\\geq", "\\leq", "\\leqslant", "\\geqslant", "\\equiv", "\\neq", "\\ngtr", "\\nless", "\\nleqslant", "\\ngeqslant", "\\approx", "\\simeq", "\\cong", "\\propto",
  "\\leftarrow", "\\rightarrow", "\\Leftarrow", "\\Rightarrow", "\\leftrightarrow", "\\Leftrightarrow", "\\leftrightharpoons", "\\rightleftharpoons",
  "\\left (", "\\right )", "\\left \\|", "\\right \\|", "\\left [", "\\right ]", "\\left \\langle", "\\right \\rangle", "\\left \\{", "\\right \\}", "\\left |", "\\right |",
  "\\sin", "\\cos", "\\tan", "\\csc", "\\sec", "\\cot", "\\sinh", "\\cosh", "\\tanh", "\\coth", "\\arcsin", "\\arccos", "\\arctan", "\\exp", "\\lg", "\\ln", "\\log",
];

function RandomID(){
  let rid = "";
  let a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for(var i = 0; i < SizeOfRID; i++){
    rid += a[Math.floor(Math.random() * a.length)];
  }


  return rid;
}

let ByteCreator = {
  "{}": function CreateBytes(textString){
          //console.log(textString);
          let startIndex = null;
          let endIndex = null;
          for(var i = 0; i < textString.length; i++){
            let char = textString.substring(i,i+1);
            if(char == "{"){
              startIndex = i;
              endIndex = null;
            }
            else if(char == "}" && startIndex != null){
              endIndex = i;
            }

            if(endIndex != null){
              //so we need to save this substring of information and replace with an id so we can run through this process again until textString is divided up as much as possible
              let b = textString.substring(startIndex, endIndex + 1);
              let cid = (b.indexOf("$") == -1) ? null : b.substring(b.indexOf("$") + 1, (b.indexOf("$") + 1) + SizeOfRID);//getting the $id$ id in the string and saving it
              let rid = RandomID();
              ArrayOfBytes[rid] = {byte: b, html: null, tag: "", type: "{}", cid: cid};

              textString = textString.substring(0, startIndex) + `$${rid}$` + textString.substring(endIndex + 1);

              i = -1;//starting the for loop again
              startIndex = null;
              endIndex = null;

              //
            }

          }

          //console.log(textString);

          return textString;

        },

  "dynamic_tags": function(textString){

            for(var i = 0; i < listOfDynamicTags.length; i++){
              while(textString.indexOf(listOfDynamicTags[i].tag + "$") != -1){
                let startIndex = textString.indexOf(listOfDynamicTags[i].tag + "$");
                let b = textString.substring(startIndex, startIndex + listOfDynamicTags[i].los);
                let cid = (b.indexOf("$") == -1) ? null : b.substring(b.indexOf("$") + 1, (b.indexOf("$") + 1) + SizeOfRID);//getting the $id$ id in the string and saving it
                let rid = RandomID();
                ArrayOfBytes[rid] = {byte: b, html: null, tag: listOfDynamicTags[i].tag, type: "dynamic_tags", cid: cid};
                //cid = rid because that is the Id that this byte refrences inside
                textString = textString.substring(0, startIndex) + `$${rid}$` + textString.substring(startIndex + listOfDynamicTags[i].los);
              }
            }


            //console.log(textString);

            return textString;

          },

  "static_tags": function(textString){
            for(var i = 0; i < listOfStaticTags.length; i++){
              let los  = listOfStaticTags[i].length; //getting the length of the string we are trying to find so we can identify an end Index
              while(textString.indexOf(listOfStaticTags[i]) != -1){
                let startIndex = textString.indexOf(listOfStaticTags[i]);
                let b = textString.substring(startIndex, startIndex + los);
                let rid = RandomID();
                //for static bytes the html can be render immeditately because it is not dependent on any varying entity like dynamic tags
                ArrayOfBytes[rid] = {byte: b, html: FunctionsStaticByteToHTML[listOfStaticTags[i]](), tag: listOfStaticTags[i], type: "static_tags", cid: null};
                //cid value is null beecause this byte does have any Ids in it because it is not dynamic
                textString = textString.substring(0, startIndex) + `$${rid}$` + textString.substring(startIndex + los);
              }
            }

            //console.log(textString);

            return textString

          },
}

let FunctionsStaticByteToHTML = {
  "\\cursor": function(){},
  "\\int": function(){
    return `<span class='block_wrapper'>
              <div class="_integral_unicode">&#8747;</div>
            </span>`;
  },
  "\\oint": function(){},
  "\\sum": function(){},
  "\\prod": function(){},
  "\\triangledown": function(){},
  "\\cdot": function(){return "<span class='block_wrapper'>&#8901</span>";},
  "\\ast": function(){},
  "\\bigcup": function(){},
  "\\coprod": function(){},
  "\\pm": function(){},
  "\\times": function(){},
  "\\circ": function(){},
  "\\alpha": function(){},
  "\\beta": function(){},
  "\\gamma": function(){},
  "\\delta": function(){},
  "\\epsilon": function(){},
  "\\varepsilon": function(){},
  "\\zeta": function(){},
  "\\eta": function(){},
  "\\theta": function(){},
  "\\vartheta": function(){},
  "\\iota": function(){},
  "\\kappa": function(){},
  "\\lambda": function(){},
  "\\mu": function(){},
  "\\nu": function(){},
  "\\xi": function(){},
  "\\pi": function(){},
  "\\varpi": function(){},
  "\\rho": function(){},
  "\\varrho": function(){},
  "\\sigma": function(){},
  "\\varsigma": function(){},
  "\\tau": function(){},
  "\\upsilon": function(){},
  "\\phi": function(){},
  "\\varphi": function(){},
  "\\chi": function(){},
  "\\psi": function(){},
  "\\omega": function(){},
  "\\Gamma": function(){},
  "\\Delta": function(){},
  "\\Lambda": function(){},
  "\\Theta": function(){},
  "\\Xi": function(){},
  "\\Pi": function(){},
  "\\Upsilon": function(){},
  "\\Sigma": function(){},
  "\\Phi": function(){},
  "\\Psi": function(){},
  "\\Omega": function(){},
  "<": function(){},
  ">": function(){}, "=": function(){},
  "*": function(){return "*";},
  "\\doteq": function(){},
  "\\geq": function(){},
  "\\leq": function(){},
  "\\leqslant": function(){}, "\\geqslant": function(){}, "\\equiv": function(){}, "\\neq": function(){}, "\\ngtr": function(){}, "\\nless": function(){}, "\\nleqslant": function(){}, "\\ngeqslant": function(){}, "\\approx": function(){}, "\\simeq": function(){}, "\\cong": function(){}, "\\propto": function(){},
  "\\leftarrow": function(){}, "\\rightarrow": function(){}, "\\Leftarrow": function(){}, "\\Rightarrow": function(){}, "\\leftrightarrow": function(){}, "\\Leftrightarrow": function(){}, "\\leftrightharpoons": function(){}, "\\rightleftharpoons": function(){},
  "\\left (": function(){}, "\\right )": function(){}, "\\left \\|": function(){}, "\\right \\|": function(){}, "\\left [": function(){}, "\\right ]": function(){}, "\\left \\langle": function(){}, "\\right \\rangle": function(){}, "\\left \\{": function(){}, "\\right \\}": function(){}, "\\left |": function(){}, "\\right |": function(){},
  "\\sin": function(){}, "\\cos": function(){}, "\\tan": function(){}, "\\csc": function(){}, "\\sec": function(){}, "\\cot": function(){}, "\\sinh": function(){}, "\\cosh": function(){}, "\\tanh": function(){}, "\\coth": function(){}, "\\arcsin": function(){}, "\\arccos": function(){}, "\\arctan": function(){}, "\\exp": function(){}, "\\lg": function(){}, "\\ln": function(){}, "\\log": function(){},

};

let FunctionsDynamicByteToHTML = {
  "\\vec": function(html){
    return `<span class='block_wrapper'>
              <div class="_vector_unicode">&#8594;</div>
              <div>${html}</div>
            </span>`;
  },
  "\\mathrm": function(){return "dynamic html stuff";},
  "\\hat": function(){return "dynamic html stuff";},
  "_": function(html){return `<sub>${html}</sub>`;},
  "^": function(html){return `<sup>${html}</sup>`;},
  "\\frac": function(){return "dynamic html stuff";},
  "\\lim_": function(){return "dynamic html stuff";},
  "\\sqrt": function(){return "dynamic html stuff";},
  "\\dot": function(){return "dynamic html stuff";},
  "\\ddot": function(){return "dynamic html stuff";},
  "\\check": function(){return "dynamic html stuff";},
  "\\bar": function(){return "dynamic html stuff";},
  "\\not": function(){return "dynamic html stuff";},
};

let RenderPlainTextToHTML = function(plainString){
  //this function wraps every letter or space in the string with a span so that when the user use it or clicks on it the program knows what the user is clicking on
  let htmlString = "";
  for(var i = 0; i < plainString.length; i++){
    htmlString += `<span>${plainString[i]}</span>`
  }

  return htmlString
}

let FunctionsBracketByteToHTML = function(byte){
  //the first thing we need to do is strip the byte of its brackets "{....}" if it has any
  let html = "";
  if(byte[0] == "{" && byte[byte.length-1] == "}"){
    byte = byte.substring(1,byte.length-1);
  }
  //ok now the byte doesn't have any brackets
  //so now we need to go through each character of the string and if we find $...$ get the html for that byte otherwie just rap the character in with some simple html
  let startIndex, endIndex = null;
  for(var i = 0; i < byte.length; i++){
    if(byte[i] == "$"){
      //if startIndex == null then that means that this is the first "$" we found
      if(startIndex == null){
        startIndex = i;
      }
      else{//if startIndex != null then this is the second "$" we found
        endIndex = i;
        //now we know the beginning and ending index so we can grap the ID inside of the range and get the corresponding html
        let k = byte.substring(startIndex + 1, endIndex);//this graps the unique Id and leaves the $ signs out of the string
        html += ArrayOfBytes[k].html;//this sends over the html of the byte that this ID was refrencing
        //then after we reset
        startIndex, endIndex = null;
      }
    }
    else if(startIndex == null){//if the byte is not a $ and startIndex == null meaning that we are not in the middle of parsing an Id we can streat the byte[i] as plain text
      //if it is not a special character "$" then it is just plain text so...
      html += RenderPlainTextToHTML(byte[i]);
    }

  }

  return html;
}


function RunByteCreator(textString){
  for(key in ByteCreator){
    textString = ByteCreator[key](textString);
  }

  //after we need to run some parsing on the bytes that are type "{}" because these bytes weren't parsed because they were removed from the textString before the  other parsing functions in the ByteCreator Object could parse them
  for(key2 in ArrayOfBytes){
    if(ArrayOfBytes[key2].type == "{}"){
      for(key3 in ByteCreator){
        let b = ArrayOfBytes[key2].byte;
        if(b[0] == "{" && b[b.length-1] == "}"){
          //we are stripping the byte of its first and last character because those characters are { and } repsectively which will interact with first function in the ByteCreator Object which is not what we want because we are tyring to avoid this so the string actually gets parsed by the other two functions
          b = ArrayOfBytes[key2].byte.substring(1,ArrayOfBytes[key2].byte.length - 1);
        }
        ArrayOfBytes[key2].byte = ByteCreator[key3](b);
        ArrayOfBytes[key2].cid = (ArrayOfBytes[key2].byte.indexOf("$") == -1) ? null : ArrayOfBytes[key2].byte.substring(ArrayOfBytes[key2].byte.indexOf("$") + 1, (ArrayOfBytes[key2].byte.indexOf("$") + 1) + SizeOfRID);//getting the $id$ id in the string and saving it
      }
    }
  }

  return textString;
}

function GenerateHTMLFromArrayOfBytes(){
  for(var key in ArrayOfBytes){
    if(ArrayOfBytes[key].html == null){
      if(ArrayOfBytes[key].type == "dynamic_tags"){
        //
        ArrayOfBytes[key].html = FunctionsDynamicByteToHTML[ArrayOfBytes[key].tag](ArrayOfBytes[key].byte);
      }
      else if(ArrayOfBytes[key].type == "{}"){
        ArrayOfBytes[key].html = FunctionsBracketByteToHTML(ArrayOfBytes[key].byte);
      }
    }

    //we don't worry about the "static_tags" because their html is inject the minute they are parsed earlier in the code using the function "FunctionsStaticByteToHTML"

  }
}

function LoopThroughRGH(){
  //rgh stands for the function "RecursiveGenerateHTMLFromArrayOfBytes"
  for(var key in ArrayOfBytes){
    RecursiveGenerateHTMLFromArrayOfBytes(key);
  }
}

function RecursiveGenerateHTMLFromArrayOfBytes(key){
  //console.log(key);
  if(ArrayOfBytes[key].html == null){

    if(ArrayOfBytes[key].cid != null){//if it were null that means that this byte doesn't depend on any other byte
      if(ArrayOfBytes[ArrayOfBytes[key].cid].html == null){
        RecursiveGenerateHTMLFromArrayOfBytes(ArrayOfBytes[key].cid);
      }
    }

    if(ArrayOfBytes[key].type == "dynamic_tags"){
      if(ArrayOfBytes[key].cid == null){
        //this byte is not dependent on any other piece of html
        ArrayOfBytes[key].html = FunctionsDynamicByteToHTML[ArrayOfBytes[key].tag]("");
      }
      else{
        //this byte is dependent on the html inside the byte with key of "cid"
        ArrayOfBytes[key].html = FunctionsDynamicByteToHTML[ArrayOfBytes[key].tag](ArrayOfBytes[ArrayOfBytes[key].cid].html);
      }

    }
    else if(ArrayOfBytes[key].type == "{}"){
      ArrayOfBytes[key].html = FunctionsBracketByteToHTML(ArrayOfBytes[key].byte);
    }
  }
}

let CompiledTextStringToHTML = function(textString){
  let html = "";

  //so now we need to go through each character of the string and if we find $...$ get the html for that byte otherwie just rap the character in with some simple html
  let startIndex = null;
  let endIndex = null;
  for(var i = 0; i < textString.length; i++){
    if(textString[i] == "$"){
      //if startIndex == null then that means that this is the first "$" we found
      if(startIndex == null){
        startIndex = i;
      }
      else{//if startIndex != null then this is the second "$" we found
        endIndex = i;
        //now we know the beginning and ending index so we can grap the ID inside of the range and get the corresponding html
        let k = textString.substring(startIndex + 1, endIndex);//this graps the unique Id and leaves the $ signs out of the string
        //console.log(k);
        //console.log("............");
        html += ArrayOfBytes[k].html;//this sends over the html of the byte that this ID was refrencing
        //then after we reset
        startIndex = null;
        endIndex = null;
      }
    }
    else if(startIndex == null){//if the byte is not a $ and startIndex == null meaning that we are not in the middle of parsing an Id we can streat the byte[i] as plain text
      //if it is not a special character "$" then it is just plain text so...
      html += RenderPlainTextToHTML(textString[i]);
    }

  }

  return html;
}

function RenderLatexStringToHTMLLine(){
  //console.log($("#editor").val());
  let textString = RunByteCreator(($("#editor").val()));//put everything initial in Arrya Bytes
  //console.log(textString);
  LoopThroughRGH();//then render the bytes to HTML
  //then take the rendered html from each byte and apply it to the compiled textString which shows how this html should be ordered in the dom
  $("#test").html(CompiledTextStringToHTML(textString));
}


function ConstructVarFromBytes(key){
  let listOfCIds = [key];
  let str = ArrayOfBytes[key].byte;
  if(ArrayOfBytes[key].cid != null){//if it were null that means that this byte doesn't depend on any other byte
    let data = ConstructVarFromBytes(ArrayOfBytes[key].cid);
    listOfCIds = listOfCIds.concat(data.cids);
    if(ArrayOfBytes[key].tag == "\\vec" || ArrayOfBytes[key].tag == "_"){
      str = str.replace(`$${ArrayOfBytes[key].cid}$`,`{${data.str}}`);
    }
    else{
      str = str.replace(`$${ArrayOfBytes[key].cid}$`,`${data.str}`);
    }
  }

  return {str: str, cids: listOfCIds};
}

function GetVariablesFromLatexString(ls){
  ls = PutBracketsAroundAllSubsSupsAndRemoveEmptySubsSups(ls);
  ls = RemoveDifferentialOperatorDFromLatexString(ls);
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
      if(subLs.indexOf("\\vec{") == 0 || subLs.indexOf("\\bar{") == 0 || subLs.indexOf("\\hat{") == 0 || subLs.indexOf("\\overline{") == 0){
        let size = (subLs.indexOf("\\vec{") == 0 || subLs.indexOf("\\bar{") == 0 || subLs.indexOf("\\hat{") == 0) ? "\\bar{".length : "\\overline{".length;
        answer.yes = true;
        answer.substring = subLs.substring(0,size);
        answer.newState.currentlyParsingVariable = true;
        answer.newState.numberOfRightBracketsNeeded = 1;//because the vec has a left bracket
        answer.newState.index += size;
      }
      else{
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
    if(subLs.indexOf("_{") == 0){//this is the only that is an acceptable continuation of a variable without the need of brackets
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
