// Gold records independent check passes, never video views or practice scores.
export function deriveSkillTree(courses, progress = {}) {
  const byId = new Map(courses.map(c => [c.id, c]));
  const depths = new Map();
  function depth(id, visiting = new Set()) {
    if (depths.has(id)) return depths.get(id);
    if (visiting.has(id)) return 0;
    const next = new Set(visiting).add(id);
    const parents = (byId.get(id)?.prerequisites || []).filter(p => byId.has(p));
    const value = parents.length ? Math.max(...parents.map(p => depth(p, next))) + 1 : 0;
    depths.set(id, value);
    return value;
  }
  return courses.map(c => {
    const topics = (c.topics || []).map(t => ({
      id: t.id, title: t.title,
      refreshDue:progress.learning_support?.due_topic_ids?.includes(t.id),
      recalls:progress.learning_support?.recall?.[t.id]?.recall_successes||0,
      passed: !!(progress.topics?.[t.id]?.check_passed || progress.lessons?.[t.existing_lesson_id]?.check_passed),
      checkAvailable: !!(t.existing_lesson_id || t.lesson),
      started: !!(progress.topics?.[t.id]?.video_seconds || progress.lessons?.[t.existing_lesson_id]?.video_seconds || progress.topics?.[t.id]?.last_practice),
    }));
    const passed = topics.filter(t => t.passed).length;
    return {id: c.id, title: c.title, color: c.color, depth: depth(c.id), topics, passed,
      total: topics.length, gold: topics.length > 0 && passed === topics.length,
      prerequisites: (c.prerequisites || []).filter(p => byId.has(p)).map(p => ({id: p, title: byId.get(p).title}))};
  });
}

export function mountSkillTree(host, {courses, progress, esc}) {
  const nodes = deriveSkillTree(courses, progress);
  const awards = nodes.reduce((sum, n) => sum + n.passed, 0);
  const maxDepth = Math.max(0, ...nodes.map(n => n.depth));
  const selected = progress.preferences?.starting_course || progress.placement?.recommendation?.course_id;
  let visibleDepth = Math.min(maxDepth, Math.max(2, ...nodes.filter(n => n.passed || n.id === selected).map(n => n.depth + 1)));
  const expanded = new Set(nodes.filter(n => n.depth === 0 || n.id === selected || n.passed > 0).map(n => n.id));
  const symbol = n => n.gold ? '★' : ({'number-sense':'123','arithmetic':'½','pre-algebra':'x','algebra-1':'f(x)','geometry':'△','statistics-basics':'▥','calculus-1':'d/dx','calculus-2':'∫','linear-algebra':'Av','probability':'P','multivariable':'∇'})[n.id] || '◇';
  function draw() {
    host.innerHTML = `<section class="skill-journey" aria-labelledby="journey-title"><div class="journey-heading"><div><span class="eyebrow">YOUR MATH JOURNEY</span><h1 id="journey-title">Watch your understanding grow.</h1><p>Open a branch. Learn an idea. Earn a golden star when you pass its independent check.</p></div><div class="journey-awards" aria-label="${awards} topic checks passed"><span aria-hidden="true">★</span><strong>${awards}</strong><small>earned stars</small></div></div><p class="journey-legend"><span class="legend-gold">★ Check passed</span><span>○ Still exploring</span><span>You can preview every branch.</span></p><div class="skill-tree">${Array.from({length:visibleDepth + 1}, (_, d) => {
      const row = nodes.filter(n => n.depth === d);
      return `<section class="tree-tier" aria-label="Learning branch ${d + 1}"><div class="tree-junction" aria-hidden="true"></div><div class="tree-branches">${row.map(n => `<details class="tree-course ${n.gold?'tree-gold':''}" data-tree-course="${n.id}" ${expanded.has(n.id)?'open':''} style="--tree-color:${/^#[0-9a-f]{6}$/i.test(n.color||'')?n.color:'#668e81'}"><summary><span class="tree-emblem" aria-hidden="true">${symbol(n)}</span><span class="tree-course-copy"><strong>${esc(n.title)}</strong><small>${n.gold?'All topic checks passed':`${n.passed} / ${n.total} stars earned`}</small><span class="tree-meter" aria-hidden="true"><span style="width:${n.total?n.passed/n.total*100:0}%"></span></span></span><span class="tree-chevron" aria-hidden="true">⌄</span></summary><div class="tree-topics">${n.prerequisites.length?`<p class="tree-foundations">Builds on ${n.prerequisites.map(p=>`<a href="#videos/${p.id}">${esc(p.title)}</a>`).join(', ')}</p>`:'<p class="tree-foundations">Your first building blocks.</p>'}${n.topics.map((t,i)=>`<a class="tree-topic ${t.passed?'topic-gold':''}" href="#watch/${t.id}"><span class="tree-topic-token" aria-hidden="true">${t.passed?'★':i+1}</span><span><strong>${esc(t.title)}</strong><small>${t.passed?'Independent check passed':t.started?'Continue learning':t.checkAvailable?'Video · practice · check':'Video · written practice · tutor review'}</small>${t.refreshDue?'<small class="tree-recall-due">↻ Ready for a refresh</small>':t.recalls?`<small class="tree-recall-ok">Recalled later on ${t.recalls} ${t.recalls===1?'occasion':'occasions'}</small>`:''}</span><span aria-hidden="true">→</span></a>`).join('')}<a class="tree-course-link" href="#videos/${n.id}">Explore this course →</a></div></details>`).join('')}</div></section>`;
    }).join('')}</div>${visibleDepth<maxDepth?'<button class="button secondary tree-grow" id="tree-grow">Explore the next branches ↓</button>':'<p class="tree-end">A path from your first numbers to advanced mathematics.</p>'}<a class="tree-course-link" href="#session">Keep earlier ideas fresh →</a><p class="journey-note">Stars record check passes. Later review and explaining your reasoning help you keep what you learn. A short check is evidence for its tasks; advanced proofs and written reasoning still need review.</p></section>`;
    host.querySelectorAll('[data-tree-course]').forEach(el => el.addEventListener('toggle', () => {if(el.open) expanded.add(el.dataset.treeCourse); else expanded.delete(el.dataset.treeCourse);}));
    host.querySelector('#tree-grow')?.addEventListener('click', () => {
      visibleDepth++;
      draw();
      const next = host.querySelector('.tree-tier:last-child');
      next?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
      const target=next?.querySelector('summary');target?.focus({preventScroll:true});
    });
  }
  draw();
  return () => {host.replaceChildren();};
}
