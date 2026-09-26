import {cardArt} from './card-art.js';
import {labNames,mountLab} from './labs.js';
import {reasoningCatalog,mountReasoning} from './reasoning.js';
import {studioModels} from './studio-labs.js';

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const functionFamilies=Object.freeze({
  linear:{title:'Linear',slug:'coordinate-geometry',topics:['algebra-1.functions'],formula:'y = mx + b'},
  quadratic:{title:'Quadratic',slug:'quadratics',topics:['algebra-1.quadratics'],formula:'y = a(x − h)² + k'},
  cubic:{title:'Cubic',slug:'polynomials',topics:['algebra-1.polynomials','algebra-2.polynomial-functions'],formula:'y = a(x − h)³ + k'},
  exponential:{title:'Exponential',slug:'exponentials',topics:['algebra-1.exponential-functions','algebra-2.exponentials'],formula:'y = a · bˣ'},
  logarithm:{title:'Logarithm',slug:'logarithms',topics:['algebra-2.logarithms'],formula:'y = logᵦ(x)'},
  rational:{title:'Rational',slug:'rational-functions',topics:['algebra-2.rational-functions'],formula:'y = a/(x − h) + k'},
  radical:{title:'Square root',slug:'radicals',topics:['algebra-2.radicals'],formula:'y = √(x − h) + k'}
});

const freeDetails={
  functions:{symbol:'f(x)',level:'Algebra',description:'Move points and change parameters in seven function families. See the equation, graph, and input/output together.',controls:'Drag points · sliders · numbers',topics:['algebra-1.functions'],keywords:'line slope intercept parabola polynomial quadratic cubic exponential logarithm rational radical square root domain graph'},
  angles:{symbol:'α + β',level:'Geometry',description:'Turn one ray and see how a straight angle splits into two angles that always total 180°.',controls:'Drag a ray · slider · numbers',topics:['geometry.angles'],keywords:'angle degrees supplementary turn straight line'},
  triangle:{symbol:'½bh',level:'Geometry',description:'Move a triangle’s top vertex to separate perpendicular height from sideways motion and compare its area.',controls:'Drag a vertex · sliders · numbers',topics:['geometry.area'],keywords:'triangle base height shear area'},
  circles:{symbol:'πr²',level:'Geometry',description:'Change the radius and sector angle. Compare how arc length and sector area respond.',controls:'Drag the radius · sliders · numbers',topics:['geometry.circles'],keywords:'circle disk sector arc circumference radius angle'},
  data:{symbol:'x̄ · σ',level:'Data & statistics',description:'Move five observations and watch the mean, median, and population standard deviation change.',controls:'Drag observations · sliders · numbers',topics:['statistics-basics.center','statistics-basics.standard-deviation'],keywords:'data outlier mean median variance standard deviation spread statistics population'},
  probability:{symbol:'P(A)',level:'Probability',description:'Change a bag’s red and blue counts. Follow two draws without replacement and compare the branches.',controls:'Sliders · numbers',topics:['statistics-basics.basic-probability'],keywords:'probability tree red blue bag balls without replacement complement conditional'},
  complex:{symbol:'z → iz',level:'Algebra II',description:'Move a complex number and see multiplication by i turn it through 90° while preserving its length.',controls:'Drag a point · sliders · numbers',topics:['algebra-2.complex-numbers'],keywords:'complex imaginary real rotation quarter turn i modulus vector'}
};

const appliedDetails={
  recipe:{symbol:'3 : 2',level:'Fractions & ratios',description:'Scale a recipe while both ingredient amounts keep the same ratio. Connect servings, cups, and milliliters.',keywords:'recipe proportions fraction scale ratio unit conversion cooking servings'},
  plans:{symbol:'8 + 3h',level:'Linear relationships',description:'Compare two hire plans using their graphs, equations, and cost table. Move time or change a fixed fee.',keywords:'linear plans hire cost fee slope intercept systems break even business'},
  garden:{symbol:'w(P/2 − w)',level:'Quadratics & optimization',description:'Use a fixed amount of fence. Change a rectangle’s width and connect its shape to an area graph.',keywords:'garden fence perimeter length width area quadratic maximum optimization derivative geometry'},
  motion:{symbol:'s(t) → v(t)',level:'Calculus · motion',description:'Move through a cart’s trip. Compare position, velocity, distance, and displacement; shrink a secant interval.',keywords:'motion cart position velocity derivative difference quotient secant tangent limit displacement distance'},
  chain:{symbol:'dA/dt',level:'Calculus · linked rates',description:'Change how fast a circle’s radius grows. Follow time → radius → area and compare the linked rates.',keywords:'chain rule related rates radius area derivative composition growing circle time'},
  bayes:{symbol:'P(D | F)',level:'Conditional probability',description:'Change defect prevalence and inspection accuracy. Compare true flags, false flags, and what a flag means.',keywords:'bayes conditional probability base rate defect flag false positive sensitivity inspection frequency'},
  graphics:{symbol:'RA ≠ AR',level:'Linear algebra',description:'Scale and rotate a map vector in both orders. Compare the matrix products, arrows, and coordinates.',keywords:'matrix matrices linear algebra vector rotation scale transformation noncommutative order graphics'},
  sampling:{symbol:'sample → mean',level:'Sampling & statistics',description:'Choose subsets of a six-person population. Compare each mean with the population and all possible sample means.',keywords:'sampling sample population mean statistics distribution variability without replacement deterministic subset'}
};

const pathDescriptions={
  fractions:'Build a common denominator, first with numbers and then with algebraic fractions.',
  distribute:'Multiply every required pair and see where the middle term of a binomial square comes from.',
  cancel:'Factor the whole expression, cancel nonzero factors, and keep the original excluded inputs.',
  rationalize:'Use a conjugate to rewrite a radical expression and prepare a limit without losing its domain.',
  roots:'Track signs and principal roots, including why √(x²) = |x| and when exponent rules apply.',
  trig:'Use identities to reveal structure while keeping the denominator’s angle restrictions.',
  'difference-quotient':'Simplify with h ≠ 0, then take the limit. Follow both square and reciprocal examples.',
  'chain-rule':'Identify the inside and outside functions, follow both rates, and justify the resulting simplification.',
  'product-rule':'Separate the product and chain rules from the factoring that simplifies a longer derivative.'
};

export const playgroundCatalog=Object.freeze([
  {id:'compare',group:'free',title:'Compare expressions & missing inputs',symbol:'≠ at x = a',level:'Algebra → calculus',description:'Move x and a to compare (x² − a²)/(x − a) with x + a. Test the excluded input directly.',controls:'Live comparison · curated expression pair',href:'#lab/compare',keywords:'compare expressions equivalence cancel factoring quotient domain hole missing point limit algebra why this step'},
  ...Object.entries(labNames).map(([id,title])=>({id,group:'free',title,href:`#lab/${id}`,...freeDetails[id]})),
  ...reasoningCatalog.map(path=>({id:path.id,group:'guided',title:path.short,symbol:path.symbol,level:path.level,description:pathDescriptions[path.id]||path.lead,controls:`${path.examples.length} worked examples · predictions · invalid steps`,href:`#reasoning/${path.id}`,keywords:[path.title,path.short,path.level,path.lead,...path.prerequisites.map(p=>p.label)].join(' ')})),
  ...Object.entries(studioModels).map(([id,model])=>({id,group:'applied',title:model.title,href:`#studio/${id}/explore`,controls:'Prediction → live model → explain what changed',...appliedDetails[id]}))
]);

export const playgroundCounts=Object.freeze({freeLabs:Object.keys(labNames).length,functionFamilies:Object.keys(functionFamilies).length,guidedPaths:reasoningCatalog.length,workedExamples:reasoningCatalog.reduce((n,p)=>n+p.examples.length,0),expressionComparisons:1,appliedModels:Object.keys(studioModels).length,entries:playgroundCatalog.length});

const groups={
  free:{title:'Explore freely',count:`${playgroundCounts.freeLabs+playgroundCounts.expressionComparisons} live explorations`,symbol:'↗',description:'Move a point or change a number. Watch a diagram, equation, and readout respond.'},
  guided:{title:'Why this step?',count:`${playgroundCounts.guidedPaths} paths · ${playgroundCounts.workedExamples} examples`,symbol:'⇄',description:'Reveal one justified step at a time. Predict the next move and check tempting wrong turns.'},
  applied:{title:'Apply the math',count:`${playgroundCounts.appliedModels} investigations`,symbol:'✧',description:'Start with a situation and prediction. Use a live model, units, and linked quantities to explain a decision.'}
};

export function filterPlayground(query='',group='all'){
  const terms=String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return playgroundCatalog.filter(item=>(group==='all'||item.group===group)&&terms.every(term=>`${item.title} ${item.description} ${item.level} ${item.keywords}`.toLocaleLowerCase().includes(term)));
}

export function mountPlayground(host,options={}){
  const esc=options.esc||escapeHTML,events=new AbortController(),notified=new Set();let disposeTool=null;
  const notify=topicIds=>{
    const fresh=[...new Set(topicIds||[])].filter(id=>id&&!notified.has(id));fresh.forEach(id=>notified.add(id));
    if(fresh.length)options.onSupport?.(fresh);
  };
  const on=(node,event,fn)=>node?.addEventListener(event,fn,{signal:events.signal});
  const card=item=>`<article class="pg-tool pg-${item.group}" data-pg-item="${esc(item.group+':'+item.id)}">${cardArt({id:item.id,kind:'playground',title:item.title})}<div class="pg-tool-top"><span class="pg-level">${esc(item.level)}</span></div><h3><a href="${esc(item.href)}">${esc(item.title)} <span aria-hidden="true">↗</span></a></h3><p>${esc(item.description)}</p>${item.id==='functions'&&item.group==='free'?`<div class="pg-families" aria-label="Open a function family">${Object.entries(functionFamilies).map(([id,f])=>`<a href="#lab/functions/${id}">${cardArt({id,kind:'function',title:f.title})}<span>${esc(f.title)}</span></a>`).join('')}</div>`:''}<div class="pg-tool-bottom"><small>${esc(item.controls)}</small><a href="${esc(item.href)}" aria-label="Open ${esc(item.title)}">Open <span aria-hidden="true">→</span></a></div></article>`;

  function directory(){
    host.innerHTML=`<div class="playground-directory"><div class="intro"><div><div class="eyebrow">ALL THE WAYS TO WORK WITH MATH</div><h1>The math playground</h1><p>Change something. Understand why. Use it to make a decision.</p></div></div><div class="pg-modes" role="group" aria-label="Choose a way to explore">${Object.entries(groups).map(([id,g])=>`<button class="pg-mode pg-${id}" data-pg-group="${id}" aria-pressed="false"><span class="pg-mode-title"><span aria-hidden="true">${g.symbol}</span><strong>${g.title}</strong></span><span class="pg-mode-description">${g.description}</span><small>${g.count}</small></button>`).join('')}</div><div class="pg-searchbar"><label for="pg-search"><span>Find an idea or tool</span><input id="pg-search" type="search" placeholder="Try fractions, graph, chain rule, or sampling…"></label><button class="button secondary small" data-pg-all aria-pressed="true">Show all tools</button></div><p class="pg-results" role="status" aria-live="polite"></p><div class="pg-directory-results"></div><p class="pg-learning-note">Exploration and guided help support learning. Independent checks and later review provide separate evidence of what you can do on your own.</p></div>`;
    let group='all',query='';
    const draw=()=>{
      const items=filterPlayground(query,group);
      host.querySelector('.pg-results').textContent=`${items.length} ${items.length===1?'entry':'entries'}${group==='all'?' across all three ways to learn':' in '+groups[group].title}${query.trim()?' matching “'+query.trim()+'”':''}.`;
      host.querySelectorAll('[data-pg-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pgGroup===group)));
      host.querySelector('[data-pg-all]').setAttribute('aria-pressed',String(group==='all'));
      host.querySelector('.pg-directory-results').innerHTML=items.length?Object.entries(groups).map(([id,g])=>{
        const chosen=items.filter(item=>item.group===id);return chosen.length?`<section class="pg-section" aria-labelledby="pg-heading-${id}"><div class="pg-section-heading"><h2 id="pg-heading-${id}">${g.title}</h2><span>${chosen.length} ${id==='guided'?'paths':id==='applied'?'investigations':'tools'}</span></div><div class="pg-tools">${chosen.map(card).join('')}</div></section>`:'';
      }).join(''):'<div class="pg-empty"><h2>No tools match those words yet.</h2><p>Try a broader idea such as graphs, fractions, probability, or motion.</p><button class="button secondary small" data-pg-clear>Clear the search</button></div>';
      const clear=host.querySelector('[data-pg-clear]');on(clear,'click',()=>{query='';group='all';host.querySelector('#pg-search').value='';draw();host.querySelector('#pg-search').focus();});
    };
    on(host.querySelector('#pg-search'),'input',event=>{query=event.target.value;draw();});
    host.querySelectorAll('[data-pg-group]').forEach(b=>on(b,'click',()=>{group=group===b.dataset.pgGroup?'all':b.dataset.pgGroup;draw();}));
    on(host.querySelector('[data-pg-all]'),'click',()=>{group='all';draw();});draw();
  }

  function freeLab(kind){
    const detail=freeDetails[kind],family=functionFamilies[options.family]?options.family:'quadratic';
    host.innerHTML=`<div class="playground-tool"><a class="backlink" href="#lab">← All interactive tools</a><div class="intro"><div><div class="eyebrow">EXPLORE FREELY</div><h1>${esc(labNames[kind])}</h1><p>${esc(detail.description)}</p></div><span class="pill">${esc(detail.controls)}</span></div><nav class="lab-selector" aria-label="Free exploration tools">${Object.entries(labNames).map(([id,title])=>`<a class="tab ${id===kind?'active':''}" ${id===kind?'aria-current="page"':''} href="#lab/${id}">${esc(title)}</a>`).join('')}<a class="tab" href="#lab/compare">Compare expressions</a></nav><div id="full-lab"></div><div class="pg-connect"><div><strong>Make the connection</strong><p>Use the visual to notice a pattern, then explain the mathematical reason behind it.</p></div><div><a href="#reasoning">Work through the steps ↗</a><a href="#studio">Apply an idea in a situation ↗</a><a href="#lab">Find another interactive tool ↗</a></div></div></div>`;
    disposeTool=mountLab(host.querySelector('#full-lab'),kind,kind==='functions'?functionFamilies[family].slug:undefined);
    notify([...detail.topics,...(kind==='functions'?functionFamilies[family].topics:[])]);
    // The existing function selector and Reset remain owned by the original lab.
    // Observe changes at the host so a reset cannot detach support tracking.
    if(kind==='functions')on(host,'change',event=>{if(event.target.id==='function-model')notify(['algebra-1.functions',...(functionFamilies[event.target.value]?.topics||[])]);});
  }

  function comparison(){
    host.innerHTML=`<div class="playground-tool"><a class="backlink" href="#lab">← All interactive tools</a><div class="intro"><div><div class="eyebrow">EXPLORE FREELY · EXPRESSION COMPARISON</div><h1>Same values. What about the domain?</h1><p>Compare a factored quotient with its simplified line. Move the input, then test the missing point.</p></div></div><div class="pg-comparison-host"></div><div class="pg-connect"><div><strong>Explain what you observed</strong><p>The graph shows the effect. The guided example explains why cancellation keeps the original restriction.</p></div><div><a href="#reasoning/cancel">Why can this factor cancel? ↗</a><a href="#reasoning/difference-quotient">Connect this idea to a derivative ↗</a><a href="#lab">All interactive tools ↗</a></div></div></div>`;
    disposeTool=mountReasoning(host.querySelector('.pg-comparison-host'),{path:'cancel',section:'live',onCopy:options.onCopy,onEvent:event=>{notify(event.topicIds||[event.topicId]);options.onReasoningEvent?.(event);}});
  }

  if(options.tool==='compare')comparison();
  else if(Object.hasOwn(labNames,options.tool))freeLab(options.tool);
  else directory();
  return ()=>{events.abort();disposeTool?.();host.replaceChildren();};
}
