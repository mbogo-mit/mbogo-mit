let KeyboardLayouts = {
  greek: {
    default: [
      "ς ε ρ τ υ θ ι ο π",
      "α σ δ φ γ η ξ κ λ",
      "ABC ζ χ ψ ω β ν μ",
    ],
    shift: [
      "{tab} : ΅ Ε Ρ Τ Υ Θ Ι Ο Π { } |",
      '{lock} Α Σ Δ Φ Γ Η Ξ Κ Λ ¨ " {enter}',
      "{shift} > Ζ Χ Ψ Ω Β Ν Μ < > ? {shift}",
      "ABC {space}"
    ]
  },
  operators: {
    default: [
      "\\times \\pm ρ τ υ θ ι ο π",
      "α σ δ φ γ η ξ κ λ",
      "ABC ζ χ ψ ω β ν μ",
    ],
    shift: [
      "{tab} : ΅ Ε Ρ Τ Υ Θ Ι Ο Π { } |",
      '{lock} Α Σ Δ Φ Γ Η Ξ Κ Λ ¨ " {enter}',
      "{shift} > Ζ Χ Ψ Ω Β Ν Μ < > ? {shift}",
      "ABC {space}"
    ]
  },
  functions: {
    default: [
      "ς ε ρ τ υ θ ι ο π",
      "α σ δ φ γ η ξ κ λ",
      "ABC ζ χ ψ ω β ν μ",
    ],
    shift: [
      "{tab} : ΅ Ε Ρ Τ Υ Θ Ι Ο Π { } |",
      '{lock} Α Σ Δ Φ Γ Η Ξ Κ Λ ¨ " {enter}',
      "{shift} > Ζ Χ Ψ Ω Β Ν Μ < > ? {shift}",
      "ABC {space}"
    ]
  },
  advanced: {
    default: [
      "ς ε ρ τ υ θ ι ο π",
      "α σ δ φ γ η ξ κ λ",
      "ABC ζ χ ψ ω β ν μ",
    ],
    shift: [
      "{tab} : ΅ Ε Ρ Τ Υ Θ Ι Ο Π { } |",
      '{lock} Α Σ Δ Φ Γ Η Ξ Κ Λ ¨ " {enter}',
      "{shift} > Ζ Χ Ψ Ω Β Ν Μ < > ? {shift}",
      "ABC {space}"
    ]
  },
};

function ToggleGreekKeyboard(lowercase){
  console.log(lowercase);
  if(lowercase){
    $("#greek-letters-uppercase").css("display","none");
    $("#greek-letters-lowercase").css("display","block");
  }
  else{
    $("#greek-letters-uppercase").css("display","block");
    $("#greek-letters-lowercase").css("display","none");
  }
}

function KeyboardClicked(write, typedText = ""){
  MathFields[FocusedMathFieldId].mf.write(write);
  MathFields[FocusedMathFieldId].mf.typedText(typedText);
  MathFields[FocusedMathFieldId].mf.focus();
  MathFields[FocusedMathFieldId].mf.focus();
}

function InsertComment(){
  //check if the user is already in a comment section, and if they are not then do something otherwise don't do anything
  console.log($(`#${FocusedMathFieldId} .mq-text-mode.mq-hasCursor`));
  if($(`#${FocusedMathFieldId} .mq-text-mode.mq-hasCursor`).length == 0){
    KeyboardClicked('','\\text ');
  }
}

function SetKeyboardKeys(key){
  //MyKeyboard.setOptions({layout: KeyboardLayouts[key]});

  $("#greek-letters-tab, #operators-tab, #functions-tab, #advanced-operators-tab").removeClass("active");
  //clear keyboards
  $("#greek-letters-keyboard, #operators-keyboard, #functions-keyboard, #advanced-keyboard").css('display','none');

  //selects the correct tab and keyboard
  if(key == "greek"){
    $("#greek-letters-tab").addClass("active");
    $("#greek-letters-keyboard").css('display','block');
  }
  else if(key == "operators"){
    $("#operators-tab").addClass("active");
    $("#operators-keyboard").css('display','block');
  }
  else if(key == "functions"){
    $("#functions-tab").addClass("active");
    $("#functions-keyboard").css('display','block');
  }
  else if(key == "advanced"){
    $("#advanced-operators-tab").addClass("active");
    $("#advanced-keyboard").css('display','block');
  }
}
