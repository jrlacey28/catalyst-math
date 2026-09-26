// Educational models in SI units, except the explicitly named display inputs.
// No profile, DOM, network, timing or assessment state belongs in this module.
export const PURPOSE_DEFAULTS=Object.freeze({
  physics:Object.freeze({time:4,speed:3,acceleration:1,mass:2}),
  mechanical:Object.freeze({drivenTeeth:36,inputSpeed:120,inputTorque:2,compression:.12}),
  electrical:Object.freeze({voltage:6,resistance:1000,capacitance:1000,time:1}),
  architecture:Object.freeze({span:4,load:5,depth:.3,width:.2}),
  finance:Object.freeze({years:10,rate:5,contribution:200,inflation:2})
});
function input(c,key,fallback,min=0){
  const n=c?.[key]===undefined?fallback:Number(c[key]);
  if(!Number.isFinite(n)||n<min)throw new RangeError('Invalid '+key);
  return n;
}
export function physicsModel(c={}){
  const d=PURPOSE_DEFAULTS.physics,t=input(c,'time',d.time),v0=input(c,'speed',d.speed);
  const a=input(c,'acceleration',d.acceleration),mass=input(c,'mass',d.mass,Number.EPSILON);
  const velocity=v0+a*t,distance=v0*t+.5*a*t*t;
  return {time:t,speed:v0,acceleration:a,mass,velocity,distance,
    kineticEnergy:.5*mass*velocity**2,initialEnergy:.5*mass*v0**2,
    netWork:mass*a*distance,positionAt:s=>v0*s+.5*a*s*s,velocityAt:s=>v0+a*s};
}
export function mechanicalModel(c={}){
  const d=PURPOSE_DEFAULTS.mechanical,drivenTeeth=input(c,'drivenTeeth',d.drivenTeeth,1);
  if(!Number.isInteger(drivenTeeth))throw new RangeError('Gear teeth must be whole');
  const inputSpeed=input(c,'inputSpeed',d.inputSpeed),inputTorque=input(c,'inputTorque',d.inputTorque);
  const compression=input(c,'compression',d.compression),driverTeeth=12,ratio=drivenTeeth/driverTeeth;
  const outputSpeed=inputSpeed/ratio,outputTorque=inputTorque*ratio;
  const inputOmega=inputSpeed*2*Math.PI/60,outputOmega=outputSpeed*2*Math.PI/60;
  const stiffness=120;
  return {driverTeeth,drivenTeeth,ratio,inputSpeed,outputSpeed,inputTorque,outputTorque,inputOmega,outputOmega,
    inputPower:inputTorque*inputOmega,outputPower:outputTorque*outputOmega,
    oppositeDirections:true,stiffness,compression,springForce:stiffness*compression,springEnergy:.5*stiffness*compression**2};
}
export function electricalModel(c={}){
  const d=PURPOSE_DEFAULTS.electrical,voltage=input(c,'voltage',d.voltage);
  const resistance=input(c,'resistance',d.resistance,Number.EPSILON);
  const capacitanceMicrofarads=input(c,'capacitance',d.capacitance,Number.EPSILON);
  const capacitance=capacitanceMicrofarads*1e-6,time=input(c,'time',d.time),tau=resistance*capacitance;
  const current=voltage/resistance,capacitorVoltage=voltage*(-Math.expm1(-time/tau));
  const chargingCurrent=current*Math.exp(-time/tau),capacitorCharge=capacitance*capacitorVoltage;
  return {voltage,resistance,capacitanceMicrofarads,capacitance,time,tau,current,currentMilliamps:current*1000,
    power:voltage*current,capacitorVoltage,chargingCurrent,capacitorCharge,
    capacitorEnergy:.5*capacitance*capacitorVoltage**2,
    voltageAt:t=>voltage*(-Math.expm1(-t/tau))};
}
export function architectureModel(c={}){
  const d=PURPOSE_DEFAULTS.architecture,span=input(c,'span',d.span,Number.EPSILON);
  const loadKilonewtons=input(c,'load',d.load),load=loadKilonewtons*1000;
  const depth=input(c,'depth',d.depth,Number.EPSILON),width=input(c,'width',d.width,Number.EPSILON);
  const modulus=11e9,secondMoment=width*depth**3/12,deflection=load*span**3/(48*modulus*secondMoment);
  const deflectionAt=x=>{
    if(!Number.isFinite(x)||x<0||x>span)throw new RangeError('Position must lie on the beam');
    const s=Math.min(x,span-x);
    return load*s*(3*span**2-4*s**2)/(48*modulus*secondMoment);
  };
  return {span,loadKilonewtons,load,depth,width,modulus,secondMoment,volume:width*depth*span,
    leftReaction:load/2,rightReaction:load/2,deflection,deflectionMillimeters:deflection*1000,deflectionAt};
}
export function financeModel(c={}){
  const d=PURPOSE_DEFAULTS.finance,years=input(c,'years',d.years);
  if(!Number.isInteger(years)||years>100)throw new RangeError('Use a whole number of years from 0 through 100');
  const rate=input(c,'rate',d.rate)/100,contribution=input(c,'contribution',d.contribution);
  const inflation=input(c,'inflation',d.inflation)/100,principal=1000;
  let balance=principal;const history=[{year:0,balance,contributed:principal,real:principal}];
  for(let year=1;year<=years;year++){
    balance=balance*(1+rate)+contribution;
    history.push({year,balance,contributed:principal+year*contribution,real:balance/(1+inflation)**year});
  }
  return {years,rate,contribution,inflation,principal,balance,contributed:principal+years*contribution,
    interest:balance-principal-years*contribution,purchasingPower:balance/(1+inflation)**years,
    realGrowthFactor:(1+rate)/(1+inflation),history};
}
export const purposeModels=Object.freeze({
  physics:physicsModel,mechanical:mechanicalModel,electrical:electricalModel,
  architecture:architectureModel,finance:financeModel
});
export function normalizePurposeDraft(field,raw={}){
  raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const controls={},predictions={};
  for(const [key,spec] of Object.entries(field.controls||{})){
    const candidate=raw.controls?.[key];
    const n=typeof candidate==='number'&&Number.isFinite(candidate)?candidate:spec.default;
    const clamped=Math.max(spec.min,Math.min(spec.max,n));
    controls[key]=Number(Math.max(spec.min,Math.min(spec.max,spec.min+Math.round((clamped-spec.min)/spec.step)*spec.step)).toFixed(10));
  }
  for(const s of field.stages||[]){
    const value=raw.predictions?.[s.id];
    if(typeof value==='string')predictions[s.id]=value.slice(0,1200);
  }
  const index=Number.isInteger(raw.stage)?raw.stage:0;
  return {version:1,stage:Math.max(0,Math.min(Math.max(0,(field.stages?.length||1)-1),index)),controls,predictions};
}
export function purposeResult(fieldId,stageId,controls={}){
  if(!purposeModels[fieldId])throw new RangeError('Unknown application field');
  const c=fieldId==='physics'&&stageId==='distance'?{...controls,acceleration:0}:controls;
  const model=purposeModels[fieldId](c);
  const values={
    physics:{distance:['Distance',model.distance,'m'],velocity:['Final velocity',model.velocity,'m/s'],
      energy:['Final kinetic energy',model.kineticEnergy,'J'],accumulation:['Distance from area',model.distance,'m']},
    mechanical:{gears:['Output speed',model.outputSpeed,'rpm'],torque:['Output torque',model.outputTorque,'N·m'],
      power:['Power in = power out',model.outputPower,'W'],spring:['Stored spring work',model.springEnergy,'J']},
    electrical:{current:['Current',model.currentMilliamps,'mA'],power:['Resistor power',model.power,'W'],
      charging:['Capacitor voltage',model.capacitorVoltage,'V']},
    architecture:{volume:['Material volume',model.volume,'m³'],balance:['Each support reaction',model.leftReaction/1000,'kN'],
      stiffness:['Center deflection',model.deflectionMillimeters,'mm']},
    finance:{time:['Future balance',model.balance,'$'],rate:['Future balance',model.balance,'$'],
      contributions:['Future balance',model.balance,'$'],'buying-power':['In today’s dollars',model.purchasingPower,'$']}
  }[fieldId]?.[stageId];
  if(!values)throw new RangeError('Unknown application stage');
  return {model,label:values[0],value:values[1],unit:values[2]};
}
