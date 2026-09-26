// Pure educational models. Units and exclusions are part of each public result.
// No learner records, network calls, random outcomes, or pass/fail decisions.
const TAU = 2 * Math.PI;
export const clamp = (value, low, high, fallback = low) => {
  const n = Number(value);
  return Math.max(low, Math.min(high, Number.isFinite(n) ? n : fallback));
};
export const BODIES = Object.freeze({
  moon: {name:'Moon',moving:'Spacecraft',radiusKm:1737.4,contactKm:1737.4,mu:4902.800118},
  'earth-moon': {name:'Earth',moving:'Moon',radiusKm:6371,contactKm:8108.4,mu:398600.435507+4902.800118},
});

// Monotone bisection is deliberately used near e=1, where a naive Newton guess
// can diverge. The solutions below preserve the conic's time parametrization.
function solveEllipse(mean, eccentricity) {
  const turns = Math.floor((mean + Math.PI) / TAU);
  const m = mean - turns * TAU;
  let low = -Math.PI, high = Math.PI;
  for (let i=0;i<62;i++) {
    const e = (low + high)/2;
    if (e - eccentricity*Math.sin(e) < m) low = e; else high = e;
  }
  return (low + high)/2;
}
function solveHyperbola(mean, eccentricity) {
  let low = 0, high = Math.max(1,Math.asinh(mean/eccentricity)+1);
  while (eccentricity*Math.sinh(high)-high < mean) high *= 2;
  for (let i=0;i<62;i++) {
    const h=(low+high)/2;
    if (eccentricity*Math.sinh(h)-h < mean) low=h; else high=h;
  }
  return (low+high)/2;
}

export function orbitElements({body='moon',altitudeKm=100,speedKmS=1.7}={}) {
  const key = BODIES[body] ? body : 'moon', primary = BODIES[key];
  const altitude = clamp(altitudeKm,key==='moon'?10:2000,key==='moon'?20000:600000,key==='moon'?100:356925.44);
  const speed = clamp(speedKmS,0.02,12,1.7);
  const r0 = primary.radiusKm + altitude, mu = primary.mu;
  const circularSpeed = Math.sqrt(mu/r0), escapeSpeed = Math.sqrt(2*mu/r0);
  const energy = speed*speed/2-mu/r0, angularMomentum=r0*speed;
  const eccentricity = Math.abs(r0*speed*speed/mu-1);
  const parabolic = Math.abs(energy) < 1e-11*mu/r0;
  const bound = energy < 0 && !parabolic;
  const a = parabolic ? null : -mu/(2*energy);
  const periapsisKm = angularMomentum*angularMomentum/(mu*(1+eccentricity));
  const apoapsisKm = bound ? a*(1+eccentricity) : null;
  const collision = periapsisKm <= primary.contactKm && bound;
  const circularPeriod = TAU*Math.sqrt(r0**3/mu);
  const periodSeconds = bound ? TAU*Math.sqrt(a**3/mu) : null;
  const orientation = speed >= circularSpeed ? 1 : -1;
  let collisionSeconds = null;
  if (collision && eccentricity > 0) {
    const ec = TAU-Math.acos(clamp((1-primary.contactKm/a)/eccentricity,-1,1));
    collisionSeconds = Math.max(0,(ec-eccentricity*Math.sin(ec)-Math.PI)/Math.sqrt(mu/a**3));
  }
  const horizonSeconds = collisionSeconds ?? (bound ? Math.min(periodSeconds,14*circularPeriod) : 2*circularPeriod);
  return {body:key,primary,altitudeKm:altitude,speedKmS:speed,r0,mu,circularSpeed,escapeSpeed,
    energy,angularMomentum,eccentricity,a,periapsisKm,apoapsisKm,bound,parabolic,collision,
    periodSeconds,collisionSeconds,circularPeriod,orientation,horizonSeconds,
    kind:collision?'surface intersection':parabolic?'parabolic escape':!bound?'hyperbolic escape':
      eccentricity<1e-7?'circular orbit':'elliptical orbit'};
}

export function orbitState(elements, seconds) {
  const e=elements, t=clamp(seconds,0,e.collisionSeconds ?? Number.MAX_SAFE_INTEGER,0);
  let x,y,vx,vy;
  if (e.parabolic) {
    const q=e.r0, k=Math.sqrt(2*q**3/e.mu);
    const d=2*Math.sinh(Math.asinh(1.5*t/k)/3);
    x=q*(1-d*d); y=2*q*d;
    vx=-2*q*d/(k*(1+d*d)); vy=2*q/(k*(1+d*d));
  } else if (e.bound) {
    const n=Math.sqrt(e.mu/e.a**3), m0=e.orientation===1?0:Math.PI;
    const E=solveEllipse(m0+n*t,e.eccentricity), c=Math.cos(E), s=Math.sin(E);
    const p=e.angularMomentum**2/e.mu,bFactor=Math.sqrt(p/e.a),halfSin=Math.sin(E/2);
    // Use the semilatus rectum and half-angle forms instead of subtracting
    // nearly equal huge terms when a bound orbit is close to escape.
    const radius=e.periapsisKm+2*e.a*e.eccentricity*halfSin**2, factor=Math.sqrt(e.mu*e.a)/radius;
    x=e.orientation*(e.periapsisKm-2*e.a*halfSin**2); y=e.orientation*Math.sqrt(e.a*p)*s;
    vx=-e.orientation*factor*s; vy=e.orientation*factor*bFactor*c;
  } else {
    const A=-e.a, H=solveHyperbola(Math.sqrt(e.mu/A**3)*t,e.eccentricity);
    const c=Math.cosh(H),s=Math.sinh(H),p=e.angularMomentum**2/e.mu,bFactor=Math.sqrt(p/A);
    const radius=e.periapsisKm+2*A*e.eccentricity*Math.sinh(H/2)**2,factor=Math.sqrt(e.mu*A)/radius;
    x=e.periapsisKm-2*A*Math.sinh(H/2)**2; y=Math.sqrt(A*p)*s;
    vx=-factor*s; vy=factor*bFactor*c;
  }
  const radius=Math.hypot(x,y),speed=Math.hypot(vx,vy);
  return {t,x,y,vx,vy,radius,speed,altitudeKm:radius-e.primary.radiusKm,
    ax:-e.mu*x/radius**3,ay:-e.mu*y/radius**3,
    impact:e.collisionSeconds!==null && t>=e.collisionSeconds-1e-7};
}

export function orbitModel(inputs={}) {
  const elements=orbitElements(inputs), progress=clamp(inputs.progress,0,100,0);
  const points=Array.from({length:361},(_,i)=>orbitState(elements,elements.horizonSeconds*i/360));
  const dots=Array.from({length:13},(_,i)=>orbitState(elements,elements.horizonSeconds*i/12));
  return {...elements,progress,current:orbitState(elements,elements.horizonSeconds*progress/100),points,dots,
    completePath:elements.collision || !elements.bound || elements.horizonSeconds===elements.periodSeconds};
}

export function lunarDistancePreset() {
  const a=384400,e=.0549,r=a*(1-e),mu=BODIES['earth-moon'].mu;
  return {body:'earth-moon',altitudeKm:r-BODIES['earth-moon'].radiusKm,
    speedKmS:Math.sqrt(mu*(1+e)/(a*(1-e))),progress:0};
}

export function rocketModel(inputs={}) {
  const dryMass=clamp(inputs.dryMass,500,10000,2000);
  const propellant=clamp(inputs.propellant,0,20000,6000);
  const flow=clamp(inputs.flow,5,500,100),exhaust=clamp(inputs.exhaust,1000,4500,3000);
  const progress=clamp(inputs.progress,0,100,50),initialMass=dryMass+propellant;
  const burnSeconds=propellant/flow,seconds=burnSeconds*progress/100;
  function at(t) {
    const time=clamp(t,0,burnSeconds,0),used=flow*time,mass=initialMass-used;
    const logRatio=-Math.log1p(-used/initialMass);
    const velocity=exhaust*logRatio;
    const distance=exhaust/flow*(used-mass*logRatio);
    return {seconds:time,mass,velocity,distance:Math.max(0,distance),
      acceleration:propellant===0?0:exhaust*flow/mass};
  }
  return {dryMass,propellant,flow,exhaust,progress,initialMass,burnSeconds,current:at(seconds),
    deltaV:exhaust*Math.log(initialMass/dryMass),
    points:Array.from({length:121},(_,i)=>at(burnSeconds*i/120))};
}

export function supplyModel(inputs={}) {
  const crew=Math.round(clamp(inputs.crew,1,8,3)),days=Math.round(clamp(inputs.days,1,14,4));
  const perPerson=clamp(inputs.perPerson,.5,4,2.5),tankLitres=5;
  const daily=crew*perPerson,total=daily*days,tanks=Math.ceil(total/tankLitres-1e-12);
  return {crew,days,perPerson,tankLitres,daily,total,tanks,unusedCapacity:tanks*tankLitres-total,
    fullTanks:Math.floor(total/tankLitres),lastFill:total%tankLitres};
}

export function signalModel(inputs={}) {
  const frequency=clamp(inputs.frequency,80,440,220),harmonic=Math.round(clamp(inputs.harmonic,1,6,2));
  const mix=clamp(inputs.mix,0,1,0.5),phase=clamp(inputs.phase,0,360,0),phi=phase*Math.PI/180;
  const sample=t=>({t,first:Math.sin(TAU*frequency*t),
    second:mix*Math.sin(TAU*frequency*harmonic*t+phi),
    y:Math.sin(TAU*frequency*t)+mix*Math.sin(TAU*frequency*harmonic*t+phi)});
  const squareMean=Math.max(0,(1+mix*mix+(harmonic===1?2*mix*Math.cos(phi):0))/2);
  return {frequency,harmonic,mix,phase,periodSeconds:1/frequency,rms:Math.sqrt(squareMean),sample,
    points:Array.from({length:721},(_,i)=>sample(2/frequency*i/720))};
}

export function cameraModel(inputs={}) {
  const angle=clamp(inputs.angle,-180,180,30),sx=clamp(inputs.sx,-2.5,2.5,1.5);
  const sy=clamp(inputs.sy,-2.5,2.5,1),pan=clamp(inputs.pan,-2,2,0);
  const c=Math.cos(angle*Math.PI/180),s=Math.sin(angle*Math.PI/180);
  const matrix=[[c*sx,-s*sy],[s*sx,c*sy]],det=sx*sy;
  const transform=([x,y])=>[matrix[0][0]*x+matrix[0][1]*y+pan,matrix[1][0]*x+matrix[1][1]*y];
  const ship=[[0,1.3],[-.8,-.7],[0,-.25],[.8,-.7]];
  return {angle,sx,sy,pan,matrix,det,transform,ship,image:ship.map(transform),
    origin:transform([0,0]),unitX:transform([1,0]),unitY:transform([0,1]),
    invertible:Math.abs(det)>1e-12};
}

export function solarEnergy(peak, start, end) {
  const a=clamp(start,6,18,6),b=clamp(end,6,18,18);
  return b<=a?0:peak*12/Math.PI*(Math.cos(Math.PI*(a-6)/12)-Math.cos(Math.PI*(b-6)/12));
}
export function energyModel(inputs={}) {
  const peak=clamp(inputs.peak,0,10,4),capacity=clamp(inputs.capacity,0,24,12),load=clamp(inputs.load,0,3,1);
  let stored=capacity/2,spill=0,unserved=0;
  const initial=stored,points=[{hour:0,stored,power:0,spill:0,unserved:0}];
  // Exact solar energy on each half-minute interval; battery dispatch is stepped.
  const steps=2880,dt=24/steps;
  for(let i=1;i<=steps;i++) {
    const a=(i-1)*dt,b=i*dt,net=solarEnergy(peak,a,b)-load*dt;
    const raw=stored+net;
    if(raw>capacity)spill+=raw-capacity;
    if(raw<0)unserved-=raw;
    stored=clamp(raw,0,capacity);
    if(i%20===0)points.push({hour:b,stored,spill,unserved,
      power:b>=6&&b<=18?peak*Math.sin(Math.PI*(b-6)/12):0});
  }
  const produced=solarEnergy(peak,0,24),demand=24*load;
  return {peak,capacity,load,initial,stored,spill,unserved,produced,demand,served:demand-unserved,points};
}

export const NETWORK_NODES=Object.freeze([
  {id:'A',name:'Base',x:0,y:0},{id:'B',name:'Ridge',x:1,y:1},
  {id:'C',name:'Crater',x:1,y:-1},{id:'D',name:'Relay',x:2,y:0},{id:'E',name:'Outpost',x:3,y:0},
]);
export function networkModel(inputs={}) {
  const ridge=clamp(inputs.ridge,1,15,4),crater=clamp(inputs.crater,1,15,6);
  const failure=clamp(inputs.failure,0,40,10)/100,packets=Math.round(clamp(inputs.packets,1,100,20));
  const edges=[['A','B',ridge],['A','C',3],['B','D',2],['C','D',crater],['C','E',10],['D','E',4],['B','E',12]];
  const routes=[];
  function walk(node,visited,cost) {
    if(node==='E') {
      const hops=visited.length-1,reliability=(1-failure)**hops;
      routes.push({nodes:visited,cost,hops,reliability,expected:packets*reliability});return;
    }
    for(const [a,b,w] of edges) {
      const next=a===node?b:b===node?a:null;
      if(next&&!visited.includes(next))walk(next,[...visited,next],cost+w);
    }
  }
  walk('A',['A'],0);routes.sort((a,b)=>a.cost-b.cost || a.hops-b.hops || a.nodes.join('').localeCompare(b.nodes.join('')));
  return {ridge,crater,failure,packets,edges,routes,best:routes[0],ties:routes.filter(r=>Math.abs(r.cost-routes[0].cost)<1e-9)};
}

export const missionModels = Object.freeze({
  orbit:orbitModel,rocket:rocketModel,supply:supplyModel,signal:signalModel,
  camera:cameraModel,energy:energyModel,network:networkModel,
});
