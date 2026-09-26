import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {cardArt, cardArtInfo, cardArtCoverage} from '../card-art.js';
import {playgroundCatalog, functionFamilies} from '../playground.js';

const load = async name => JSON.parse(await readFile(new URL('../' + name, import.meta.url), 'utf8'));
const [roadmap, studios, projects, missions, videos] = await Promise.all([
  load('curriculum_catalog.json'), load('studio_content.json'), load('project-journeys.json'),
  load('mission-content.json'), load('video_catalog.json')
]);
const topicList = roadmap.courses.flatMap(c => c.topics);
const sorted = values => [...values].sort();
const exact = (actual, expected) => assert.deepEqual(sorted(actual), sorted(expected));
const close = (actual, expected, tolerance = 0.001) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  String(actual) + ' differs from ' + String(expected)
);
const tags = (markup, name) => [...markup.matchAll(new RegExp('<' + name + '\\b([^>]*)>', 'g'))].map(m =>
  Object.fromEntries([...m[1].matchAll(/([-\w:]+)="([^"]*)"/g)].map(x => [x[1], x[2]]))
);
const polygon = d => [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
const area = points => Math.abs(points.reduce((sum, p, i) => {
  const next = points[(i + 1) % points.length];
  return sum + p[0] * next[1] - p[1] * next[0];
}, 0)) / 2;
const art = id => cardArt({id, title: id, kind: 'lesson'});
const green = '#56876a', gold = '#ba883c', purple = '#8866a6', sage = '#cbdcc9', lavender = '#ded2eb';

test('exact canonical course, topic and video coverage', () => {
  assert.equal(roadmap.courses.length, 29);
  assert.equal(topicList.length, 159);
  exact(cardArtCoverage.courses, roadmap.courses.map(c => c.id));
  exact(cardArtCoverage.topics, topicList.map(t => t.id));
  exact(videos.lessons.map(l => l.id), cardArtCoverage.topics);
  for (const id of cardArtCoverage.topics) {
    const info = cardArtInfo({id, kind: 'lesson'});
    assert.equal(info.mapped, true, id);
    assert.equal(info.key, id);
    assert.ok(info.description.length > 25, id);
  }
});

test('all public application, project, playground and function-family cards are mapped', () => {
  exact(cardArtCoverage.studios, studios.projects.map(p => p.id));
  exact(cardArtCoverage.projects, projects.projects.map(p => p.id));
  exact(cardArtCoverage.playground, playgroundCatalog.map(p => p.id));
  exact(cardArtCoverage.functions, Object.keys(functionFamilies));
  exact(cardArtCoverage.missions, missions.models.map(m => m.id));
  for (const [kind, ids] of [
    ['course', cardArtCoverage.courses], ['studio', cardArtCoverage.studios],
    ['project', cardArtCoverage.projects], ['playground', cardArtCoverage.playground],
    ['function', cardArtCoverage.functions], ['path', ['ai-ml']]
  ]) for (const id of ids) assert.equal(cardArtInfo({id, kind}).mapped, true, kind + ':' + id);
});

test('all 24 existing lesson IDs resolve to their actual canonical topic', () => {
  const legacy = topicList.filter(t => t.existing_lesson_id);
  assert.equal(legacy.length, 24);
  exact(cardArtCoverage.legacy, legacy.map(t => t.existing_lesson_id));
  for (const t of legacy) assert.equal(cardArtInfo({id: t.existing_lesson_id}).key, t.id);
  assert.equal(cardArtInfo({id: '4a', kind: 'course'}).key, 'geometry');
  assert.equal(cardArtInfo({id: '4b', kind: 'course'}).key, 'statistics-basics');
});

test('all 159 missions combine the actual model with their canonical topic', () => {
  for (const mission of missions.missions) {
    const options = {id: mission.topic_id, kind: 'mission', modelId: mission.model_id, title: mission.title};
    const info = cardArtInfo(options);
    assert.equal(info.mapped, true, mission.topic_id);
    assert.equal(info.inset.key, mission.topic_id);
    assert.equal(info.key, mission.model_id + ':' + mission.topic_id);
    assert.ok(cardArt(options).includes('scale(.3)'), mission.topic_id);
  }
});

test('each generated image has local, unique accessible naming and finite geometry', () => {
  const all = [
    ...topicList.map(t => ({id: t.id, title: t.title})),
    ...cardArtCoverage.courses.map(id => ({id, kind: 'course'})),
    ...cardArtCoverage.studios.map(id => ({id, kind: 'studio'})),
    ...cardArtCoverage.projects.map(id => ({id, kind: 'project'})),
    ...cardArtCoverage.playground.map(id => ({id, kind: 'playground'}))
  ];
  const ids = new Set();
  for (const options of all) {
    const markup = cardArt(options);
    assert.equal(tags(markup, 'svg').length, 1, options.id);
    const svg = tags(markup, 'svg')[0];
    assert.equal(svg.role, 'img');
    assert.equal(svg.focusable, 'false');
    assert.equal(svg.viewBox, '0 0 320 160');
    for (const id of svg['aria-labelledby'].split(' ')) {
      assert.ok(markup.includes('id="' + id + '"'), options.id);
      assert.ok(!ids.has(id), 'repeated SVG label ID');
      ids.add(id);
    }
    assert.doesNotMatch(markup, /NaN|Infinity|undefined|<script|<foreignObject|\shref=|\son[a-z]+="/);
    assert.ok(['path','rect','circle','line','ellipse'].reduce((n,tag) => n+tags(markup,tag).length,0) >= 3, options.id);
    for (const box of tags(markup, 'rect')) {
      assert.ok(Number(box.width) > 0 && Number(box.height) >= 0, options.id);
      assert.ok(Number(box.x) >= 0 && Number(box.y) >= 0, options.id);
      assert.ok(Number(box.x) + Number(box.width) <= 320.001, options.id);
      assert.ok(Number(box.y) + Number(box.height) <= 160.001, options.id);
    }
  }
});

test('untrusted text cannot inject SVG or HTML; unmapped cards stay honest', () => {
  const hostile = '" onload="alert(1)"><script>bad</script>&';
  const markup = cardArt({id: hostile, title: hostile, kind: 'constructor'});
  assert.equal(cardArtInfo({id: hostile, kind: 'constructor'}).mapped, false);
  assert.ok(markup.includes('&lt;script&gt;bad&lt;/script&gt;&amp;'));
  assert.doesNotMatch(markup, /<script|onload="/);
  assert.doesNotThrow(() => cardArt(null));
  assert.doesNotThrow(() => cardArt({id: 'constructor', kind: '__proto__'}));
});

test('topic previews have broad geometric variety, beyond changing a badge', () => {
  const shapes = new Set(topicList.map(t => art(t.id)
    .replace(/<title[\s\S]*?<\/title>/, '').replace(/<desc[\s\S]*?<\/desc>/, '')
    .replace(/data-card-art="[^"]*"/, '').replace(/catalyst-card-art-\d+/g, 'local')));
  assert.ok(shapes.size >= 90, 'Only ' + shapes.size + ' distinct diagrams');
});

test('counting, fractions, decimals, percentages and ratios depict their stated quantities', () => {
  assert.equal(tags(art('number-sense.counting'), 'circle').length, 8);
  for (const [id, width, total, shaded, fill] of [
    ['arithmetic.fractions', 34, 6, 4, green],
    ['arithmetic.decimals', 26, 10, 7, green],
    ['arithmetic.percentages', 17, 50, 15, green],
    ['arithmetic.ratios', 34, 10, 4, gold]
  ]) {
    const cells = tags(art(id), 'rect').filter(r => Number(r.width) === width);
    assert.equal(cells.length, total, id);
    assert.equal(cells.filter(r => r.fill === fill).length, shaded, id);
  }
});

test('the matrix preview preserves equal coordinate units and its determinant-three area factor', () => {
  const shapes = tags(art('linear-algebra.matrices'), 'path');
  const original = polygon(shapes.find(p => p.fill === sage).d);
  const image = polygon(shapes.find(p => p.fill === lavender).d);
  close(Math.hypot(original[1][0]-original[0][0], original[1][1]-original[0][1]),
    Math.hypot(original[3][0]-original[0][0], original[3][1]-original[0][1]));
  close(area(image) / area(original), 3);
});

test('product increments include the mixed term and matching triangle arcs mark equal angles', () => {
  const markup=art('calculus-1.product-quotient-rule');
  const cells=tags(markup,'rect').filter(r=>Number(r.width)!==320);
  assert.equal(cells.length,4);
  const base=cells[0],u=Number(base.width),v=Number(base.height);
  const du=Number(cells[1].width),dv=Number(cells[2].height);
  close(cells.slice(1).reduce((sum,r)=>sum+Number(r.width)*Number(r.height),0),(u+du)*(v+dv)-u*v);
  assert.ok(markup.includes('ΔuΔv'));
  const triangle=polygon(tags(art('geometry.proof-basics'),'path').find(p=>p.fill===sage).d);
  close(Math.hypot(triangle[0][0]-triangle[2][0],triangle[0][1]-triangle[2][1]),
    Math.hypot(triangle[1][0]-triangle[2][0],triangle[1][1]-triangle[2][1]));
});

test('multiplication by i is a genuine right-angle, length-preserving rotation', () => {
  const lines = tags(art('algebra-2.complex-numbers'), 'line').filter(l =>
    l['stroke-width'] === '3' && [green, purple].includes(l.stroke));
  assert.equal(lines.length, 2);
  const vectors = lines.map(l => [Number(l.x2)-Number(l.x1), Number(l.y2)-Number(l.y1)]);
  close(vectors[0][0]*vectors[1][0] + vectors[0][1]*vectors[1][1], 0);
  close(Math.hypot(...vectors[0]), Math.hypot(...vectors[1]));
});

test('unit circle coordinates and reciprocal sequence positions match their scales', () => {
  const markup = art('trigonometry.unit-circle');
  const outline = tags(markup, 'circle').find(c => Number(c.r) === 51);
  const point = tags(markup, 'circle').find(c => c.fill === purple);
  close(Math.hypot(Number(point.cx)-Number(outline.cx), Number(point.cy)-Number(outline.cy)), 51);
  const sequence = tags(art('real-analysis.sequences-limits'), 'circle').filter(c => Number(c.r) === 5);
  assert.equal(sequence.length, 6);
  sequence.forEach((p, i) => close((Number(p.cx)-68)/190, [1, 1/2, 1/3, 1/4, 1/6, 1/10][i]));
});

test('lunar illustration uses a true focus, an exterior orbit point and a tangent velocity', () => {
  const markup = cardArt({id: 'lunar-expedition', kind: 'project'});
  const orbit = tags(markup, 'ellipse')[0], circles = tags(markup, 'circle');
  const body = circles.find(c => c.fill === sage), ship = circles.find(c => c.fill === gold);
  const [a,b,cx,cy] = [orbit.rx,orbit.ry,orbit.cx,orbit.cy].map(Number);
  const x=Number(ship.cx)-cx,y=Number(ship.cy)-cy;
  close(x*x/(a*a)+y*y/(b*b), 1);
  close(Math.abs(Number(body.cx)-cx), Math.sqrt(a*a-b*b));
  assert.ok(a-Math.sqrt(a*a-b*b) > Number(body.r), 'orbit enters the central body');
  const velocity = tags(markup, 'line').find(l => l.stroke === green);
  const vx=Number(velocity.x2)-Number(velocity.x1),vy=Number(velocity.y2)-Number(velocity.y1);
  close(x*vx/(a*a)+y*vy/(b*b), 0);
});

test('ellipse derivative preview is tangent at its marked point', () => {
  const markup=art('calculus-1.implicit-differentiation');
  const ellipse=tags(markup,'ellipse')[0],point=tags(markup,'circle').find(c=>c.fill===gold);
  const tangent=tags(markup,'line').find(l=>l.stroke===gold);
  const x=Number(point.cx)-Number(ellipse.cx),y=Number(point.cy)-Number(ellipse.cy);
  const a=Number(ellipse.rx),b=Number(ellipse.ry);
  close(x*x/(a*a)+y*y/(b*b),1);
  close(x*(Number(tangent.x2)-Number(tangent.x1))/(a*a)+y*(Number(tangent.y2)-Number(tangent.y1))/(b*b),0);
});
