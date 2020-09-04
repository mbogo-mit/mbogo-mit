//Demensional Analysis, Getting Relevant and Unique Equations, Checks Simplifications
function RID(){
  let c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let rid = "";
  for(var i = 0; i < 15; i++){
    let r = Math.random() * c.length;
    rid += c.substring(r, r+1);
  }

  return rid;
}

let EditorData = {
  SimilarDefinedVariables: {},
  SimilarVectorMagnitudeVariables: {},
  DefinedVariables: {},
  PreDefinedVariables: {},
  VectorMagnitudeVariables: {},
  MathFieldsLatex: {},
  OrderedIds: {1: "first_math_field"},
  FocusedMathFieldId: "first_math_field",
  LastVariableRIDChangedToGiven: null,
};
try{
  if(localStorage.getItem("editor-data") != null){
    EditorData = JSON.parse(localStorage.getItem("editor-data"));
  }
}catch(err){

}
let EquationSet = [];
let SqrtLoop = 0;
let LastVariableRIDChangedToGiven = null;
let EditingMathFields = false;
let UnitsDropdownMenuOpen = false
let ListOfPhysicsConstants;

let PrecisionSigFigs = 6;

let EditorKeyPresses = {};
let HotKeySequenceReset = true;

let EqualityOperators = ["\\le", "\\ge", "=", "<", ">", "\\approx"];

let PhysicsConstantToQuantity = {//this object keeps track of what physics constants are a specific quantity
  "speed of light in vacuum": "velocity",
  "Acceleration due to gravity": "acceleration",
  "Charge of electron": "electric charge",
  "electron mass": "mass",
  "proton mass": "mass",
  "neutron mass": "mass",
  "magnetic flux quantum h/2e": "magnetic flux",
};

let ImportVariableDefinitions = {
  //the key is the variable, unit is the latex string the describes the units for that variable, and key is the quantity name and key for ListOfSIUnits for the specific variable
  mechanics: {
    "A": {units: "m^2", quantityDescription: "area", quantity: "area", vector: false, unitsMathjs: "1 m^2",rid: "gecpg68gx9un534",},
    "\\vec{a}": {units: "m/s^2", quantityDescription: "velocity", quantity: "acceleration", vector: true, unitsMathjs: "1 m/s^2", rid: "8xh791opeweoxs0",},
    "\\vec{\\alpha}": {units: "rad/s^2", quantityDescription: "angular acceleration", quantity: "angular acceleration", vector: true, unitsMathjs: "1 rad/s^2", rid: "sbhdkjkhle3fszt",},
    "B": {units: "Pa", quantityDescription: "Bulk modulus", quantity: "pressure", vector: false, unitsMathjs: "1 Pa", rid: "slq88c8g25zsqtl",},
    "D": {units: "m", quantityDescription: "diameter", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "lgob06cbhcuyyh4",},
    "E": {units: "J", quantityDescription: "energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "4h166z1v9k3y2ag",},
    "\\epsilon": {units: "unitless", quantityDescription: "strain", quantity: "strain", vector: false, unitsMathjs: "1", rid: "w02wmbk4x84c8nk",},
    "\\eta": {units: "Pa*s", quantityDescription: "dynamic viscosity", quantity: "dynamic viscosity", vector: false, unitsMathjs: "1 Pa*s", rid: "antioelytfwq5eg",},
    "\\vec{F}": {units: "N", quantityDescription: "force", quantity: "force", vector: true, unitsMathjs: "1 N", rid: "ky8mpjekjmdpmga",},
    "f": {units: "Hz", quantityDescription: "frequency", quantity: "frequency", vector: false, unitsMathjs: "1 Hz",rid: "x773jbj3ec6726e",},
    "G": {units: "Pa", quantityDescription: "Shear modulus", quantity: "pressure", vector: false, unitsMathjs: "1 Pa", rid: "3j8yr3b6h5v8e10",},
    "\\vec{H}": {units: "kg*m^2/s", quantityDescription: "angular impulse", quantity: "angular impulse", vector: true, unitsMathjs: "", rid: "3z4k0jfy19slzte",},
    "h": {units: "m", quantityDescription: "height", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "oeeq5a0tc7ryt86",},
    "I": {units: "kg*m^2", quantityDescription: "moment of inertia", quantity: "moment of inertia", vector: false, unitsMathjs: "1 kg m^2", rid: "zxa21ryz2ye8ztc",},
    "\\vec{J}": {units: "kg*m/s", quantityDescription: "impulse", quantity: "impulse", vector: true, unitsMathjs: "1 kg m/s", rid: "n4nhlv5ovw9tqgh",},
    "K": {units: "J", quantityDescription: "kinetic energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "6x51dx32cy1e8mv",},
    "k": {units: "N/m", quantityDescription: "spring constant", quantity: "spring constant", vector: false, unitsMathjs: "1 N/m", rid: "8ueo8dr5pik3q6p",},
    "\\vec{L}": {units: "kg*m^2/s", quantityDescription: "angular momentum", quantity: "angular momentum", vector: true, unitsMathjs: "1 kg m^2/s", rid: "u4kyb7v1meufqio",},
    "l": {units: "m", quantityDescription: "length", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "70bj2lqm01lcs8t",},
    "M": {units: "unitless", quantityDescription: "mach angle", quantity: "unitless", vector: false, unitsMathjs: "1",rid: "9tdufrhwvwupslu",},
    "m": {units: "kg", quantityDescription: "mass", quantity: "mass", vector: false, unitsMathjs: "1 kg",rid: "98jkrp21qgja3n2",},
    "\\mu": {units: "unitless", quantityDescription: "coefficient of friction", quantity: "coefficient of friction", vector: false, unitsMathjs: "1", rid: "q6iw0krmyktf4d1",},
    "\\vec{N}": {units: "N", quantityDescription: "normal force", quantity: "force", vector: true, unitsMathjs: "1 N", rid: "k9s9447q6jiglk2",},
    "\\nu": {units: "m^2/s", quantityDescription: "kinematic viscosity", quantity: "kinematic viscosity", vector: false, unitsMathjs: "1 m^2/s", rid: "3jidcpjri8qovlj",},
    "\\vec{\\omega}": {units: "rad/s", quantityDescription: "angular velocity", quantity: "angular velocity", vector: true, unitsMathjs: "1 rad/s", rid: "for9fgp8etgy7pj",},
    "P": {units: "W", quantityDescription: "power", quantity: "power", vector: false, unitsMathjs: "1 W", rid: "057komnucbl2ygy",},
    "\\vec{p}": {units: "kg*m/s", quantityDescription: "momentum", quantity: "momentum", vector: true, unitsMathjs: " 1 kg m/s", rid: "mbufdwva9fxhnb6",},
    "R": {units: "unitless", quantityDescription: "Reynolds number", quantity: "unitless", vector: false, unitsMathjs: "1", rid: "7y6lykoh72sqh40",},
    "\\vec{r}": {units: "m", quantityDescription: "radius", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "r4hwiw6kapaqgyt",},
    "\\rho": {units: "kg/m^3", quantityDescription: "mass density", quantity: "mass density", vector: false, unitsMathjs: "1 kg/m^3", rid: "jdhnosgpbbztuit",},
    "\\vec{s}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "au9f8b960nfwxjh",},
    "\\sigma": {units: "N/m^2", quantityDescription: "uniaxial stress", quantity: "stress", vector: false, unitsMathjs: "1 N/m^2", rid: "pc0zh73hf42w7yz",},
    "T": {units: "s", quantityDescription: "period", quantity: "time", vector: false, unitsMathjs: "1 s", rid: "ax54k3au1knuzjw",},
    "t": {units: "s", quantityDescription: "time", quantity: "time", vector: false, unitsMathjs: "1 s", rid: "lz17xkn4w6v012r",},
    "\\vec{\\tau}": {units: "N*m", quantityDescription: "torque", quantity: "torque/moment of force", vector: true, unitsMathjs: "1 N m", rid: "pjiqc5x1v6bmnkd",},
    "\\vec{\\theta}": {units: "rad", quantityDescription: "plane angle", quantity: "plane angle", vector: true, unitsMathjs: "1 rad", rid: "5hljmdn0hilxwwj",},
    "U": {units: "J", quantityDescription: "potential energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "gc9bapfqwgkxc4t",},
    "V": {units: "m^3", quantityDescription: "volume", quantity: "volume", vector: false, unitsMathjs: "1 m^3",rid: "45lk5i7wv4fy2wa",},
    "\\vec{v}": {units: "m/s", quantityDescription: "velocity", quantity: "velocity", vector: true, unitsMathjs: "1 m/s",rid: "8qozb4ylgy703da",},
    "W": {units: "J", quantityDescription: "work", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "ueivmz9lnnqqj40",},
    "\\vec{x}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "2tcwrtc3xxrbz43",},
    "\\vec{y}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "2ptaip5pm39ai27",},
    "\\vec{z}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "nsxu7hnpgvhthpx",},    
  },
  thermal: {
    "A": {units: "m^2", quantityDescription: "area", quantity: "area", vector: false, unitsMathjs: "1 m^2",rid: "aig4vvzsj7dvnir",},
    "\\alpha": {units: "K^-1", quantityDescription: "coefficient of thermal expansion", quantity: "coefficient of thermal expansion", vector: false, unitsMathjs: "1 / K", rid: "lh8jwko53itkmhd",},
    "\\beta": {units: "K^-1", quantityDescription: "coefficient of thermal expansion", quantity: "coefficient of thermal expansion", vector: false, unitsMathjs: "1 / K", rid: "tlk5w5tr2vn0iik",},
    "c": {units: "J/(kg K)", quantityDescription: "specific heat capacity", quantity: "specific heat capacity", vector: false, unitsMathjs: "1 J/(kg K)", rid: "2rsnecz0s05cdhf",},
    "\\epsilon": {units: "unitless", quantityDescription: "emissivity", quantity: "unitless", vector: false, unitsMathjs: "1", rid: "ujn2wwqogxry8vp",},
    "\\eta": {units: "unitless", quantityDescription: "energy efficiency", quantity: "energy efficiency", vector: false, unitsMathjs: "1", rid: "xve1retbkcja2mz",},
    "\\kappa": {units: "W/(m*K)", quantityDescription: "thermal conductivity", quantity: "thermal conductivity", vector: false, unitsMathjs: "1 W/(m*K)", rid: "aigbkhfrol6k0gx",},
    "L": {units: "J/kg", quantityDescription: "specific latent heat", quantity: "specific latent heat", vector: false, unitsMathjs: "1 J / kg", rid: "hppwwduo9n3oq0q",},
    "l": {units: "m", quantityDescription: "length", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "9ryw1dzldtrbfhh",},
    "\\lambda": {units: "m", quantityDescription: "wave length", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "mfcp4r2rq8vttn2",},
    "m": {units: "kg", quantityDescription: "mass", quantity: "mass", vector: false, unitsMathjs: "1 kg",rid: "esvmvewgsk9iwcc",},
    "N": {units: "unitless", quantityDescription: "number of molecules", quantity: "unitless", vector: false, unitsMathjs: "1", rid: "y6syt6x9588cz5a",},
    "n": {units: "mol", quantityDescription: "amount of substance", quantity: "amount of substance", vector: false, unitsMathjs: "1 mol", rid: "4hy5oahxmsz34f5",},
    "P": {units: "Pa", quantityDescription: "pressure", quantity: "pressure", vector: false, unitsMathjs: "1 Pa", rid: "z61oidxafl5gtfb",},
    "Q": {units: "J", quantityDescription: "heat", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "0sk1ma3ouigspga",},
    "q": {units: "J", quantityDescription: "heat", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "3ux8ro322vkhnse",},
    "\\vec{r}": {units: "m", quantityDescription: "radius", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "in14wz9b6emp1e6",},
    "S": {units: "J/K", quantityDescription: "entropy", quantity: "entropy", vector: false, unitsMathjs: "1 J/K", rid: "9hqxkmgshrf87og",},
    "T": {units: "K", quantityDescription: "Temperature", quantity: "thermodynamic temperature", vector: false, unitsMathjs: "1 K", rid: "3omutwiywvpha34",},  
    "t": {units: "s", quantityDescription: "time", quantity: "time", vector: false, unitsMathjs: "1 s", rid: "xumno4us3nefe7r",},
    "U": {units: "J", quantityDescription: "potential energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "475uxj913dpoct2",},
    "V": {units: "m^3", quantityDescription: "volume", quantity: "volume", vector: false, unitsMathjs: "1 m^3",rid: "0pdlhilxzlz1irs",},
    "v": {units: "m/s", quantityDescription: "velocity", quantity: "velocity", vector: true, unitsMathjs: "1 m/s",rid: "zq9fe0zra8iu5cw",},
    "W": {units: "J", quantityDescription: "work", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "iy6wjdverkjclge",},
    "w": {units: "unitless", quantityDescription: "number of microstates", quantity: "unitless", vector: false, unitsMathjs: "1", rid: "go5envxbxfguv52",},
    "\\vec{x}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "mla71oubudxf7zo",},
    "\\vec{y}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "jrhv44lxeoddv0i",},
    "\\vec{z}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "8m7khgl0kd5keo8",},
  },
  waveOptics: {
    "A": {units: "m^2", quantityDescription: "area", quantity: "area", vector: false, unitsMathjs: "1 m^2",rid: "nz6xjvkef65z4v0",},
    "d": {units: "m", quantityDescription: "height", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "qsqvpv1gbka1emi",},
    "f": {units: "Hz", quantityDescription: "frequency", quantity: "frequency", vector: false, unitsMathjs: "1 Hz",rid: "6sibfh3y3z19q0k",},
    "h": {units: "m", quantityDescription: "height", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "9e2vvxb5c3dbh9a",},
    "I": {units: "W/m^2", quantityDescription: "intensity of radiant energy", quantity: "intensity of radiant energy", vector: false, unitsMathjs: "1 W/m^2", rid: "ysslfu80zoimfpq",},
    "L": {units: "unitless", quantityDescription: "ratio", quantity: "unitless", vector: false, unitsMathjs: "1",rid: "lz4qs3h6j7c84or",},
    "l": {units: "m", quantityDescription: "height", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "jmofvigk6jt09es",},
    "\\lambda": {units: "m", quantityDescription: "wave length", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "z049cqdcvnk5pj2",},
    "M": {units: "unitless", quantityDescription: "magnification", quantity: "unitless", vector: false, unitsMathjs: "1", rid: "rw5mch82guof67g",},
    "\\mu": {units: "rad", quantityDescription: "plane angle", quantity: "plane angle", vector: false, unitsMathjs: "1 rad", rid: "w78k2cn6fmjnwet",},
    "n": {units: "unitless", quantityDescription: "index of refraction", quantity: "index of refraction", vector: false, unitsMathjs: "1", rid: "sbekilryt9yzpju",},
    "P": {units: "W", quantityDescription: "power", quantity: "power", vector: false, unitsMathjs: "1 W", rid: "3aa490dr85uhj20",},
    "r": {units: "m", quantityDescription: "radius", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "cil73urby4tmpau",},
    "T": {units: "s", quantityDescription: "period", quantity: "time", vector: false, unitsMathjs: "1 s", rid: "pbxbffj6dus940g",},
    "t": {units: "s", quantityDescription: "time", quantity: "time", vector: false, unitsMathjs: "1 s", rid: "n1u2od19jt4zi5d",},
    "\\vec{\\theta}": {units: "rad", quantityDescription: "plane angle", quantity: "plane angle", vector: true, unitsMathjs: "1 rad", rid: "lcpqzmf6y8aihzk",},
    "\\vec{v}": {units: "m/s", quantityDescription: "velocity", quantity: "velocity", vector: true, unitsMathjs: "1 m/s",rid: "es6wzmy1l4ljb2o",},
    "\\vec{x}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "rpgdq82a62xdlrx",},
    "\\vec{y}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "nq7ivcyad67ecyn",},
    "\\vec{z}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "r62h2m4gq3d4y70",},    
  },
  em: {
    "A": {units: "m^2", quantityDescription: "area", quantity: "area", vector: false, unitsMathjs: "1 m^2",rid: "rwtxg5i4dxzmdhg",},
    "\\vec{B}": {units: "T", quantityDescription: "magnetic flux density", quantity: "magnetic flux density", vector: true, unitsMathjs: "1 T", rid: "b99tyodqahhdiu0",},
    "C": {units: "F", quantityDescription: "capacitance", quantity: "capacitance", vector: false, unitsMathjs: "1 F", rid: "ln5714lz6rm3ayd",},
    "\\vec{d}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "tbnnxxyh7wcptv2",},
    "\\vec{E}": {units: "V/m", quantityDescription: "electric field strength", quantity: "electric field strength", vector: true, unitsMathjs: "1 V/m", rid: "2ql9ud0z985dvfm",},
    "\\eta": {units: "J/m^3", quantityDescription: "energy density", quantity: "energy density", vector: false, unitsMathjs: "1 J/m^3", rid: "qnsv09zs9zsj3le",},
    "\\vec{F}": {units: "N", quantityDescription: "force", quantity: "force", vector: true, unitsMathjs: "1 N", rid: "ga1uop8ibsqjdxl",},
    "f": {units: "Hz", quantityDescription: "frequency", quantity: "frequency", vector: false, unitsMathjs: "1 Hz",rid: "qpspw1kuq8y9wu5",},
    "I": {units: "A", quantityDescription: "electric current", quantity: "electric current", vector: false, unitsMathjs: "1 A", rid: "2c9vcht7xgzrx99",},
    "\\vec{J}": {units: "A/m^2", quantityDescription: "current density", quantity: "current density", vector: true, unitsMathjs: "1 A/m^2", rid: "7sgspxcvsatpi99",},
    "\\kappa": {units: "unitless", quantityDescription: "unitless", quantity: "unitless", vector: false, unitsMathjs: "1",rid: "tgsfejnbsdmrqgf",},
    "\\vec{l}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "pel643bs1oteyit",},
    "\\lambda": {units: "m", quantityDescription: "length", quantity: "length", vector: false, unitsMathjs: "1 m",rid: "iwo4xkuzung9lg6",},
    "n": {units: "m^-1", quantityDescription: "turns per length", quantity: "wave number", vector: false, unitsMathjs: "1 / m",rid: "8xa07euu9x7onj0",},
    "P": {units: "W", quantityDescription: "power", quantity: "power", vector: false, unitsMathjs: "1 W", rid: "ppb55pgg8hnf574",},
    "\\Phi": {units: "Wb", quantityDescription: "magnetic flux", quantity: "magnetic flux", vector: false, unitsMathjs: "1 Wb", rid: "5698sy3qnwx2fky",},
    "\\phi": {units: "rad", quantityDescription: "plane angle", quantity: "plane angle", vector: false, unitsMathjs: "1 rad", rid: "pma8uow06dygszc",},
    "Q": {units: "C", quantityDescription: "electric charge", quantity: "electric charge", vector: false, unitsMathjs: "1 C", rid: "q58f0u5ekkb3msw",},
    "q": {units: "C", quantityDescription: "electric charge", quantity: "electric charge", vector: false, unitsMathjs: "1 C", rid: "71xrjqii2qw29my",},
    "R": {units: "ohm", quantityDescription: "electric resistance", quantity: "electric resistance", vector: false, unitsMathjs: "1 ohm",rid: "386d7ozon0yq4mo",},
    "\\vec{r}": {units: "m", quantityDescription: "radius", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "srloqhfg11wteha",},
    "\\rho": {units: "C/m^3", quantityDescription: "electric charge density", quantity: "electric charge density", vector: false, unitsMathjs: " 1 C/m^3", rid: "bevbzuqac63eey1",},
    "\\vec{S}": {units: "W/m^2", quantityDescription: "energy flux density", quantity: "energy flux density", vector: true, unitsMathjs: "1 W/m^2", rid: "hpivmjubq4it53e",},
    "\\vec{s}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "k1oh4ww8xifgh89",},
    "\\sigma": {units: "(ohm*m)^-1", quantityDescription: "conductivity", quantity: "conductivity", vector: false, unitsMathjs: "1 / (ohm*m)",rid: "1mf4a2faoh7wvm1",},
    "t": {units: "s", quantityDescription: "time", quantity: "time", vector: false, unitsMathjs: "1 s", rid: "gxa0gs5mf43twq4",},
    "\\vec{\\theta}": {units: "rad", quantityDescription: "plane angle", quantity: "plane angle", vector: true, unitsMathjs: "1 rad", rid: "e666a0toirut4o3",},
    "U": {units: "J", quantityDescription: "potential energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "ptot65j4i150s78",},
    "V": {units: "V", quantityDescription: "voltage", quantity: "electric potential", vector: false, unitsMathjs: "1 V",rid: "mllssbimuksks1k",},
    "\\vec{v}": {units: "m/s", quantityDescription: "velocity", quantity: "velocity", vector: true, unitsMathjs: "1 m/s",rid: "3tm29vb4mmvon1q",},
    "\\vec{x}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "a7gucmvqszez528",},
    "\\xi": {units: "V", quantityDescription: "voltage", quantity: "electric potential", vector: false, unitsMathjs: "1 V",rid: "6u46xpw17uiwq8b",},
    "\\vec{y}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "cinuyvs57ic95cr",},
    "\\vec{z}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m",rid: "4qimu4vxbw558lj",},
  },
  modern: {
    "E": {units: "J", quantityDescription: "energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "iq1zhq87fa05f1o",},
    "f": {units: "Hz", quantityDescription: "frequency", quantity: "frequency", vector: false, unitsMathjs: "1 Hz", rid: "b9gei1ygej3eubb",},
    "\\gamma": {units: "unitless", quantityDescription: "lorentz factor", quantity: "unitless", vector: false, unitsMathjs: "1", rid: "u6z989spqb8llfb",},
    "K": {units: "J", quantityDescription: "kinetic energy", quantity: "energy/work", vector: false, unitsMathjs: "1 J", rid: "sb6yo0kia0jwe3j",},
    "\\vec{l}": {units: "m", quantityDescription: "length", quantity: "length", vector: true, unitsMathjs: "1 m", rid: "s39g5hof5nrvhzz",},
    "\\lambda": {units: "m", quantityDescription: "wave length", quantity: "length", vector: false, unitsMathjs: "1 m", rid: "h3odypmzx9yqwyu",},
    "m": {units: "kg", quantityDescription: "mass", quantity: "mass", vector: false, unitsMathjs: "1 kg",rid: "x6a07jc32qolipq",},
    "\\vec{p}": {units: "kg*m/s", quantityDescription: "momentum", quantity: "momentum", vector: true, unitsMathjs: " 1 kg m/s", rid: "0jlkibyd4gxcesh",},
    "t": {units: "s", quantityDescription: "time", quantity: "time", vector: false, unitsMathjs: "1 s", rid: "lgci5ux30npke3w",},
    "\\vec{u}": {units: "m/s", quantityDescription: "velocity", quantity: "velocity", vector: true, unitsMathjs: "1 m/s", rid: "rdih1ojta961f2g",},
    "\\vec{v}": {units: "m/s", quantityDescription: "velocity", quantity: "velocity", vector: true, unitsMathjs: "1 m/s", rid:"7kakd1kk31gv0ge",},
  },

};

let VectorMagnitudeVariables = {};
let SimilarVectorMagnitudeVariables = {};

let SaveEditorData = true;
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
  "\\hat{i}": {
    state: "given",
    type: "vector",
    units: "unitless",
    value: undefined,
    unitsMathjs: "1",
  },
  "\\hat{j}": {
    state: "given",
    type: "vector",
    units: "unitless",
    value: undefined,
    unitsMathjs: "1",
  },
  "\\hat{k}": {
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
    value: Math.PI.toFixed(PrecisionSigFigs),
    unitsMathjs: "1",
  },
  "\\infty": {
    state: "given",
    type: "constant",
    units: "unitless",
    value: undefined,
    unitsMathjs: "1",
  },
  "e": {
    state: "given",
    type: "constant",
    units: "unitless",
    value: Math.exp(1).toFixed(PrecisionSigFigs),
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
  "index of refraction" : {name: "unitless variable", symbol: "none", unitsMathjs: "1", canBeVector: false,},
  "strain" : {name: "unitless variable", symbol: "none", unitsMathjs: "1", canBeVector: false,},
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
  "resistivity" : {name: "ohm meter", symbol: "ohm*m",   unitsMathjs: "1 ohm*m", canBeVector: false,},
  "conductivity" : {name: "inverse ohm meter", symbol: "(ohm*m)^-1",   unitsMathjs: "1 / (ohm*m)", canBeVector: false,},
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
  "kinematic viscosity" : {name: "meter squared per second", symbol: "m^2/s",   unitsMathjs: "1 m^2/s", canBeVector: false,  },
  "momentum" : {name: "kilogram meter per second", symbol: "kg*m/s",   unitsMathjs: "1 kg m/s", canBeVector: true, },
  "torque/moment of force" : {name: "newton per meter", symbol: "N*m",   unitsMathjs: "1 N m", canBeVector: true, },
  "moment of inertia" : {name: "kilogram meter squared", symbol: "kg*m^2",   unitsMathjs: "1 kg m^2", canBeVector: false, },
  "surface tension" : {name: "newton per meter", symbol: "N/m",   unitsMathjs: "1 N/m", canBeVector: false,   },
  "spring constant" : {name: "newton per meter", symbol: "N/m",   unitsMathjs: "1 N/m", canBeVector: false,   },
  "elasticity" : {name: "newton per meter squared", symbol: "N/m^2",   unitsMathjs: "1 N/m^2", canBeVector: false,   },
  "stress": {name: "newton per meter squared", symbol: "N/m^2",   unitsMathjs: "1 N/m^2", canBeVector: false,   },
  "angular velocity" : {name: "radian per second", symbol: "rad/s",   unitsMathjs: "1 rad/s", canBeVector: true, },
  "angular acceleration" : {name: "radian per second squared", symbol: "rad/s^2",   unitsMathjs: "1 rad/s^2", canBeVector: true, },
  "angular momentum" : {name: "kilogram meter squared per second", symbol: "kg*m^2/s",   unitsMathjs: "1 kg m^2/s", canBeVector: true, },
  "angular impulse" : {name: "kilogram meter squared per second", symbol: "kg*m^2/s",   unitsMathjs: "1 kg m^2/s", canBeVector: true, },
  "intensity of radiant energy" : {name: "watt per square meter", symbol: "W/m^2",   unitsMathjs: "1 W/m^2", canBeVector: true,   },
  "energy flux density" : {name: "watt per square meter", symbol: "W/m^2",   unitsMathjs: "1 W/m^2", canBeVector: true,   },
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
  "coefficient of friction" : {name: "unitless variable", symbol: "none", unitsMathjs: "1", canBeVector: false,},
  "energy efficiency" : {name: "unitless variable", symbol: "none", unitsMathjs: "1", canBeVector: false,},
  "coefficient of thermal expansion" : {name: "inverse kelvin", symbol: "1/K", unitsMathjs: "1 / K", canBeVector: false,},
  "undefined units": {name: "undefined units", symbol: "none", unitsMathjs: "1 undefinedunit", canBeVector: true,},
};

let AcceptablePhysicalQuantities = ["speed of light in vacuum", "Planck constant","Reduced Plank's constant (h/2pi)","Newtonian constant of gravitation","Acceleration due to gravity","Boltzmann constant","molar gas constant","Avogadro's number","Charge of electron","Permeability of vacuum","Permittivity of vacuum","Coulomb constant","Faraday constant","electron mass","proton mass","neutron mass","Atomic mass unit","Stefan-Boltzmann constant","Rydberg constant","Bohr magneton","magnetic flux quantum h/2e","Wien displacement constant"].concat(Object.keys(ListOfSIUnits));
