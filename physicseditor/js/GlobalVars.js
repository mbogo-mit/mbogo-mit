//Demensional Analysis, Getting Relevant and Unique Equations, Checks Simplifications
function RID(){
  let c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let rid = "";
  for(var i = 0; i < 10; i++){
    let r = Math.random() * c.length;
    rid += c.substring(r, r+1);
  }

  return rid;
}

let SqrtLoop = 0;
let LastVariableRIDChangedToGiven = null;
let EditingMathFields = false;
let UnitsDropdownMenuOpen = false
let ListOfPhysicsConstants;

let EditorKeyPresses = {};
let HotKeySequenceReset = true;

let EqualityOperators = ["\\le", "\\ge", "=", "<", ">", "\\approx"];

let ImportVariableDefinitions = {
  //the key is the variable, unit is the latex string the describes the units for that variable, and key is the quantity name and key for ListOfSIUnits for the specific variable
  mechanics: {
    "t": {units: "s", quantityDescription: "time", quantity: "time", vector: false, unitsMathjs: "1 s", rid: RID(),},
    "T": {units: "s", quantityDescription: "period", quantity: "time", vector: false, unitsMathjs: "1 s", rid: RID(),},
    "f": {units: "Hz", quantityDescription: "frequency", quantity: "frequency", vector: false, unitsMathjs: "1 Hz",rid: RID(),},
    "m": {units: "kg", quantityDescription: "mass", quantity: "mass", vector: false, unitsMathjs: "1 kg",rid: RID(),},
    "l": {units: "m", quantityDescription: "length", quantity: "length", vector: false, unitsMathjs: "1 m",rid: RID(),},
    "\\vec{x}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: RID(),},
    "\\vec{y}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: RID(),},
    "\\vec{z}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: RID(),},
    "\\vec{r}": {units: "m", quantityDescription: "radius", quantity: "length", vector: true, unitsMathjs: "1 m",rid: RID(),},
    "h": {units: "m", quantityDescription: "height", quantity: "length", vector: false, unitsMathjs: "1 m",rid: RID(),},
    "A": {units: "m^2", quantityDescription: "area", quantity: "area", vector: false, unitsMathjs: "1 m^2",rid: RID(),},
    "V": {units: "m^3", quantityDescription: "volume", quantity: "volume", vector: false, unitsMathjs: "1 m^3",rid: RID(),},
    "\\vec{v}": {units: "m/s", quantityDescription: "velocity", quantity: "velocity", vector: true, unitsMathjs: "1 m/s",rid: RID(),},
    "\\vec{a}": {units: "m/s^2", quantityDescription: "velocity", quantity: "acceleration", vector: true, unitsMathjs: "1 m/s^2", rid: RID(),},
    "\\vec{F}": {units: "N", quantityDescription: "force", quantity: "force", vector: true, unitsMathjs: "1 N", rid: RID(),},
    "\\vec{N}": {units: "N", quantityDescription: "normal force", quantity: "force", vector: true, unitsMathjs: "1 N", rid: RID(),},
    "\\mu": {units: "unitless", quantityDescription: "coefficient of friction", quantity: "coefficient of friction", vector: false, unitsMathjs: "1", rid: RID(),},
    "\\vec{\\theta}": {units: "rad", quantityDescription: "plane angle", quantity: "plane angle", vector: true, unitsMathjs: "1 rad", rid: RID(),},
    "\\vec{\\omega}": {units: "rad/s", quantityDescription: "angular velocity", quantity: "angular velocity", vector: true, unitsMathjs: "1 rad/s", rid: RID(),},
    "\\vec{\\alpha}": {units: "rad/s^2", quantityDescription: "angular acceleration", quantity: "angular acceleration", vector: true, unitsMathjs: "1 rad/s^2", rid: RID(),},
    "\\vec{p}": {units: "kg*m/s", quantityDescription: "momentum", quantity: "momentum", vector: true, unitsMathjs: " 1 kg m/s", rid: RID(),},
    "\\vec{J}": {units: "kg*m/s", quantityDescription: "impulse", quantity: "impulse", vector: true, unitsMathjs: "1 kg m/s", rid: RID(),},
    "W": {units: "J", quantityDescription: "work", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: RID(),},
    "E": {units: "J", quantityDescription: "energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: RID(),},
    "K": {units: "J", quantityDescription: "kinetic energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: RID(),},
    "U": {units: "J", quantityDescription: "potential energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: RID(),},
    "P": {units: "W", quantityDescription: "power", quantity: "power", vector: false, unitsMathjs: "1 W", rid: RID(),},
    "\\eta": {units: "unitless", quantityDescription: "energy efficiency", quantity: "energy efficiency", vector: false, unitsMathjs: "1", rid: RID(),},
    "\\vec{\\tau}": {units: "N*m", quantityDescription: "torque", quantity: "torque/moment of force", vector: true, unitsMathjs: "1 N m", rid: RID(),},
    "I": {units: "kg*m^2", quantityDescription: "moment of inertia", quantity: "moment of inertia", vector: false, unitsMathjs: "1 kg m^2", rid: RID(),},
    "\\vec{L}": {units: "kg*m^2/s", quantityDescription: "angular momentum", quantity: "angular momentum", vector: true, unitsMathjs: "1 kg m^2/s", rid: RID(),},
    "\\vec{H}": {units: "kg*m^2/s", quantityDescription: "angular impulse", quantity: "angular impulse", vector: true, unitsMathjs: "", rid: RID(),},
    "k": {units: "N/m", quantityDescription: "spring constant", quantity: "spring constant", vector: false, unitsMathjs: "1 N/m", rid: RID(),},
    "\\rho": {units: "kg/m^3", quantityDescription: "mass density", quantity: "mass density", vector: false, unitsMathjs: "1 kg/m^3", rid: RID(),},
  },
  thermal: {
    "t": {units: "s", quantityDescription: "time", quantity: "time", vector: false, unitsMathjs: "1 s", rid: RID(),},
    "T": {units: "K", quantityDescription: "Temperature", quantity: "thermodynamic temperature", vector: false, unitsMathjs: "1 K", rid: RID(),},
    "m": {units: "kg", quantityDescription: "mass", quantity: "mass", vector: false, unitsMathjs: "1 kg",rid: RID(),},
    "l": {units: "m", quantityDescription: "length", quantity: "length", vector: false, unitsMathjs: "1 m",rid: RID(),},
    "\\lambda": {units: "m", quantityDescription: "wave length", quantity: "length", vector: false, unitsMathjs: "1 m",rid: RID(),},
    "\\vec{x}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: RID(),},
    "\\vec{y}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: RID(),},
    "\\vec{z}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: RID(),},
    "\\vec{r}": {units: "m", quantityDescription: "radius", quantity: "length", vector: true, unitsMathjs: "1 m",rid: RID(),},
    "v": {units: "m/s", quantityDescription: "velocity", quantity: "velocity", vector: true, unitsMathjs: "1 m/s",rid: RID(),},
    "A": {units: "m^2", quantityDescription: "area", quantity: "area", vector: false, unitsMathjs: "1 m^2",rid: RID(),},
    "V": {units: "m^3", quantityDescription: "volume", quantity: "volume", vector: false, unitsMathjs: "1 m^3",rid: RID(),},
    "U": {units: "J", quantityDescription: "potential energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: RID(),},
    "P": {units: "Pa", quantityDescription: "pressure", quantity: "pressure", vector: false, unitsMathjs: "1 Pa", rid: RID(),},
    "c": {units: "J/(kg K)", quantityDescription: "specific heat capacity", quantity: "specific heat capacity", vector: false, unitsMathjs: "1 J/(kg K)", rid: RID(),},
    "\\alpha": {units: "K^-1", quantityDescription: "coefficient of thermal expansion", quantity: "coefficient of thermal expansion", vector: false, unitsMathjs: "1 / K", rid: RID(),},
    "\\beta": {units: "K^-1", quantityDescription: "coefficient of thermal expansion", quantity: "coefficient of thermal expansion", vector: false, unitsMathjs: "1 / K", rid: RID(),},
    "Q": {units: "J", quantityDescription: "heat", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: RID(),},
    "W": {units: "J", quantityDescription: "work", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: RID(),},
    "L": {units: "J/kg", quantityDescription: "specific latent heat", quantity: "specific latent heat", vector: false, unitsMathjs: "1 J / kg", rid: RID(),},
    "n": {units: "mol", quantityDescription: "amount of substance", quantity: "amount of substance", vector: false, unitsMathjs: "1 mol", rid: RID(),},
    "N": {units: "unitless", quantityDescription: "number of molecules", quantity: "unitless", vector: false, unitsMathjs: "1", rid: RID(),},
    "S": {units: "J/K", quantityDescription: "entropy", quantity: "entropy", vector: false, unitsMathjs: "1 J/K", rid: RID(),},
    "\\eta": {units: "unitless", quantityDescription: "energy efficiency", quantity: "energy efficiency", vector: false, unitsMathjs: "1", rid: RID(),},
    "k": {units: "W/(m*K)", quantityDescription: "thermal conductivity", quantity: "thermal conductivity", vector: false, unitsMathjs: "1 W/(m*K)", rid: RID(),},
  },
  waveOptics: {},
  em: {},
  modern: {},

};

let VectorMagnitudeVariables = {};
let SimilarVectorMagnitudeVariables = {};

let PreDefinedVariables = {
  "\\hat{x}": {
    state: "given",
    type: "vector",
    units: "unitless",
    value: undefined,
    unitsMathjs: "1",
  },
  "\\hat{y}": {
    state: "given",
    type: "vector",
    units: "unitless",
    value: undefined,
    unitsMathjs: "1",
  },
  "\\hat{z}": {
    state: "given",
    type: "vector",
    units: "unitless",
    value: undefined,
    unitsMathjs: "1",
  },
  "\\hat{r}": {
    state: "given",
    type: "vector",
    units: "unitless",
    value: undefined,
    unitsMathjs: "1",
  },
  "\\hat{\\theta}": {
    state: "given",
    type: "vector",
    units: "unitless",
    value: undefined,
    unitsMathjs: "1",
  },
  "\\hat{\\phi}": {
    state: "given",
    type: "vector",
    units: "unitless",
    value: undefined,
    unitsMathjs: "1",
  },
  "\\nabla": {
    state: "given",
    type: "vector",
    units: "wave number (m^(-1))",
    value: undefined,
    unitsMathjs: "1/m",
  },
  "\\pi": {
    state: "given",
    type: "constant",
    units: "unitless",
    value: Math.PI.toFixed(5),
    unitsMathjs: "1",
  },
  "e": {
    state: "given",
    type: "constant",
    units: "unitless",
    value: Math.exp(1).toFixed(5),
    unitsMathjs: "1",
  },
  "i": {
    state: "given",
    type: "constant",
    units: "unitless",
    value: "i",
    unitsMathjs: "1i",
  },
}

let SimilarDefinedVariables = {};

let DefinedVariables = {};

let ConventialPhysicsConstants = [];//an array of predefined variables that are physics constants

let MessageBoxMathFields = {
  question: {
    m1: null,
  },
  warning: {
    m1: null,
  },
  error: {
    m1: null
  }
};

let ParsedHoverRequest = false;
let MOUSEDOWN = false;
let VariableRightClicked = false;
let MathFields = {};
let FocusedMathFieldId = "first_math_field";
let VariableValueMathFields = {};

let HoveredOutOfTaggedVariable = true;
let HoveringOverVariableDescriptionMenu = false;
let ShowMenuTimeout = 500;
let HideMenuTimeout = 500;


let AutoGeneratedUnitData = {};
let UnitReference = {};


let ListOfSIUnits = {
  "unitless" : {name: "unitless variable", symbol: "none", unitsMathjs: "1", canBeVector: true,},
  "length" : {name: "meter", symbol: "m", unitsMathjs: "1 m", canBeVector: true,},
  "mass" : {name: "kilogram", symbol: "kg", unitsMathjs: "1 kg", canBeVector: false, },//kilogram will be represented with a g
  "time" : {name: "second", symbol: "s", unitsMathjs: "1 s", canBeVector: false,},
  "electric current" : {name: "ampere", symbol: "A", unitsMathjs: "1 A", canBeVector: true, },
  "thermodynamic temperature" : {name: "kelvin", symbol: "K", unitsMathjs: "1 K", canBeVector: false, },
  "amount of substance" : {name: "mole", symbol: "mol", unitsMathjs: "1 mol", canBeVector: false,},
  "luminous intensity" : {name: "candela", symbol: "cd",   unitsMathjs: "1 cd", canBeVector: true,},//candela will be represented as a "c" in my equations
  "area" : {name: "square meter", symbol: "m^2",   unitsMathjs: "1 m^2", canBeVector: false, },
  "volume" : {name: "cubic meter", symbol: "m^3",   unitsMathjs: "1 m^3", canBeVector: false, },
  "velocity" : {name: "meter per second", symbol: "m/s",   unitsMathjs: "1 m/s", canBeVector: true,},
  "acceleration" : {name: "meter per second squared", symbol: "m/s^2",   unitsMathjs: "1 m/s^2", canBeVector: true,},
  "wave number" : {name: "reciprocal meter", symbol: "m^(-1)",   unitsMathjs: "1 m^(-1)", canBeVector: false, },
  "mass density" : {name: "kilogram per cubic meter", symbol: "kg/m^3",   unitsMathjs: "1 kg/m^3", canBeVector: false, },
  "specific volume" : {name: "cubic meter per kilogram", symbol: "m^3/kg",   unitsMathjs: "1 m^3/kg", canBeVector: false, },
  "current density" : {name: "ampere per square meter", symbol: "A/m^2",   unitsMathjs: "1 A/m^2", canBeVector: true, },
  "magnetic field strength" : {name: "ampere per meter", symbol: "A/m",   unitsMathjs: "1 A/m", canBeVector: true,},
  "amount of substance concentration" : {name: "mole per cubic meter", symbol: "mol/m^3",   unitsMathjs: "1 mol/m^3", canBeVector: false, },
  "luminance" : {name: "candela per square meter", symbol: "cd/m^2",   unitsMathjs: "1 cd/m^2", canBeVector: true, },
  "mass fraction" : {name: "kilogram per kilogram", symbol: "kg/kg",   unitsMathjs: "1 kg/kg", canBeVector: false,},
  "mass flow rate" : {name: "kilogram per second", symbol: "kg/s",   unitsMathjs: "1 kg/s", canBeVector: false,},
  "volume flow rate" : {name: "cubic meter per second", symbol: "m^3/s",   unitsMathjs: "1 m^3/s", canBeVector: false,},
  "plane angle" : {name: "radian", symbol: "rad",   unitsMathjs: "1 rad", canBeVector: true, },
  "solid angle" : {name: "steradian", symbol: "sr",   unitsMathjs: "1 sr", canBeVector: false, },
  "frequency" : {name: "hertz", symbol: "Hz",   unitsMathjs: "1 Hz", canBeVector: false,},
  "impulse" : {name: "newton second", symbol: "N*s",   unitsMathjs: "1 N s", canBeVector: true,},
  "force" : {name: "newton", symbol: "N",   unitsMathjs: "1 N", canBeVector: true,},
  "pressure" : {name: "pascal", symbol: "Pa",   unitsMathjs: "1 Pa", canBeVector: true,},
  "energy/work" : {name: "joule", symbol: "J",   unitsMathjs: "1 J", canBeVector: false,},
  "power" : {name: "watt", symbol: "W",   unitsMathjs: "1 W", canBeVector: false,},
  "electric charge" : {name: "coulomb", symbol: "C",   unitsMathjs: "1 C", canBeVector: false,},
  "electric potential" : {name: "volt", symbol: "V",   unitsMathjs: "1 V", canBeVector: false, },
  "gravitational potential" : {name: "joule per kilogram", symbol: "J/kg",   unitsMathjs: "1 J/kg", canBeVector: false, },
  "capacitance" : {name: "Farad", symbol: "F",   unitsMathjs: "1 F", canBeVector: false, },
  "electric resistance" : {name: "ohm", symbol: "ohm",   unitsMathjs: "1 ohm", canBeVector: false,},
  "electric conductance" : {name: "siemens", symbol: "S",   unitsMathjs: "1 S", canBeVector: false,},
  "electric field strength": {name: "volt per meter", symbol: "V/m",   unitsMathjs: "1 V/m", canBeVector: true,},
  "magnetic flux" : {name: "weber", symbol: "Wb",   unitsMathjs: "1 Wb", canBeVector: false, },
  "magnetic flux density" : {name: "tesla", symbol: "T",   unitsMathjs: "1 T", canBeVector: true, },
  "inductance" : {name: "henry", symbol: "H",   unitsMathjs: "1 H", canBeVector: false, },
  "celsius temperature" : {name: "degree celsius", symbol: "<sup>o</sup>C",   unitsMathjs: "1 degC", canBeVector: false,  },
  "luminous flux" : {name: "lumen", symbol: "lm",   unitsMathjs: "1 cd sr", canBeVector: true,},
  "illuminance" : {name: "lux", symbol: "lx",   unitsMathjs: "1 cd/m^2", canBeVector: true,},
  "activity (of a radionuclide)" : {name: "becquerel", symbol: "Bq",   unitsMathjs: "1 s^(-1)", canBeVector: false, },
  "specific energy" : {name: "gray", symbol: "Gy",   unitsMathjs: "1 J/kg", canBeVector: false, },
  "dose equivalent" : {name: "sievert", symbol: "Sv",   unitsMathjs: "1 J/kg", canBeVector: false,  },
  "catalytic activity" : {name: "katal", symbol: "kat",   unitsMathjs: "1 kat", canBeVector: false,   },
  "dynamic viscosity" : {name: "pascal second", symbol: "Pa*s",   unitsMathjs: "1 Pa s", canBeVector: false,  },
  "momentum" : {name: "kilogram meter per second", symbol: "kg*m/s",   unitsMathjs: "1 kg m/s", canBeVector: true, },
  "torque/moment of force" : {name: "newton per meter", symbol: "N*m",   unitsMathjs: "1 N m", canBeVector: true, },
  "moment of inertia" : {name: "kilogram meter squared", symbol: "kg*m^2",   unitsMathjs: "1 kg m^2", canBeVector: false, },
  "surface tension" : {name: "newton per meter", symbol: "N/m",   unitsMathjs: "1 N/m", canBeVector: false,   },
  "spring constant" : {name: "newton per meter", symbol: "N/m",   unitsMathjs: "1 N/m", canBeVector: false,   },
  "angular velocity" : {name: "radian per second", symbol: "rad/s",   unitsMathjs: "1 rad/s", canBeVector: true, },
  "angular acceleration" : {name: "radian per second squared", symbol: "rad/s^2",   unitsMathjs: "1 rad/s^2", canBeVector: true, },
  "angular momentum" : {name: "kilogram meter squared per second", symbol: "kg*m^2/s",   unitsMathjs: "1 kg m^2/s", canBeVector: true, },
  "angular impulse" : {name: "kilogram meter squared per second", symbol: "kg*m^2/s",   unitsMathjs: "1 kg m^2/s", canBeVector: true, },
  "heat flux density" : {name: "watt per square meter", symbol: "W/m^2",   unitsMathjs: "1 W/m^2", canBeVector: false,   },
  "heat capacity" : {name: "joule per kelvin", symbol: "J/K",   unitsMathjs: "1 J/K", canBeVector: false,   },
  "entropy" : {name: "joule per kelvin", symbol: "J/K",   unitsMathjs: "1 J/K", canBeVector: false,   },
  "specific heat capacity" : {name: "joule per kilogram kelvin", symbol: "J/(kg*K)",   unitsMathjs: "1 J/(kg K)", canBeVector: false,   },
  "specific latent heat" : {name: "joule per kilogram", symbol: "J / kg",   unitsMathjs: "1 J / kg", canBeVector: false,   },
  "specific energy" : {name: "joule per kilogram", symbol: "J/kg",   unitsMathjs: "1 J/kg", canBeVector: false,  },
  "thermal conductivity" : {name: "watt per meter kelvin", symbol: "W/(m*K)",   unitsMathjs: "1 W/(m K)", canBeVector: false,   },
  "energy density" : {name: "joule per cubic meter", symbol: "J/m^3",   unitsMathjs: "1 J/m^3", canBeVector: false, },
  "electric charge density" : {name: "coulomb per cubic meter", symbol: "C/m^3",   unitsMathjs: "1 C/m^3", canBeVector: false,  },
  "electric flux density" : {name: "coulomb per square meter", symbol: "C/m^2",   unitsMathjs: "1 C/m^2", canBeVector: false,  },
  "permittivity" : {name: "farad per meter", symbol: "F/m",   unitsMathjs: "1 F/m", canBeVector: false,  },
  "permeability" : {name: "henry per meter", symbol: "H/m",   unitsMathjs: "1 H/m", canBeVector: false,  },
  "molar energy" : {name: "joule per mole", symbol: "J/mol",   unitsMathjs: "1 J/mol", canBeVector: false,  },
  "molar entropy" : {name: "joule per mole kelvin", symbol: "J/(mol*K)",   unitsMathjs: "1 J/(mol K)", canBeVector: false, },
  "exposure" : {name: "coulomb per kilogram", symbol: "C/kg",   unitsMathjs: "1 C/kg", canBeVector: false,  },
  "absorbed dose rate" : {name: "gray per second", symbol: "Gy/s",   unitsMathjs: "1 J/(kg s)", canBeVector: false,  },
  "radiant intensity" : {name: "watt per steradian", symbol: "W/sr",   unitsMathjs: "1 W/sr", canBeVector: false, },
  "radiance" : {name: "watt per square meter steradian", symbol: "W/(m^2*sr)",   unitsMathjs: "1 W/(m^2 sr)", canBeVector: false, },
  "catalytic concentration" : {name: "katal per cubic meter", symbol: "kat/m^3",   unitsMathjs: "1 kat/m^3", canBeVector: false, },
  "unknown" : {name: "unknown units", symbol: "?", unitsMathjs: "1", canBeVector: true,},
  "coefficient of friction" : {name: "unitless variable", symbol: "none", unitsMathjs: "1", canBeVector: false,},
  "energy efficiency" : {name: "unitless variable", symbol: "none", unitsMathjs: "1", canBeVector: false,},
  "coefficient of thermal expansion" : {name: "inverse kelvin", symbol: "1/K", unitsMathjs: "1 / K", canBeVector: false,},
  "undefined": {name: "undefined variable", symbol: "none", unitsMathjs: "1 undefinedunit", canBeVector: true,},
};
