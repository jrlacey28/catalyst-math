// Isolated component tests: serves only shared source files and in-memory fixtures.
// No application server, real learner, API writes, media files or browser profile.
// Optional development setup, from the dashboard directory:
//   npm install --no-save playwright
//   npx playwright install chromium
// Run with: node qa/test_compact_lesson.cjs
// Playwright and its browser are not required to run Catalyst itself.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const DASH=path.resolve(__dirname,'..');
const allowed=new Set(['autosave.js','video-catalog.js','card-art.js','answer-visuals.js','calculator-engine.js','math-input.js','step-checker.js','style.css','video-catalog.css','lesson-flow.css','answer-visuals.css','math-input.css','card-art.css']);
const fixture=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compact lesson component QA</title>
${['style','video-catalog','lesson-flow','answer-visuals','math-input','card-art'].map(s=>'<link rel="stylesheet" href="/'+s+'.css">').join('')}
<style>body{padding:0}.topbar{padding:8px 20px;height:auto}main{padding:20px;max-width:1040px}.catalog-video video{width:100%;aspect-ratio:16/9}button{min-height:28px}</style>
<div class="topbar" id="breadcrumb"></div><main id="main"></main>
<script type="module">
import {createVideoCatalogUI} from '/video-catalog.js';
import {enhanceMathInputs,enhanceMathInput} from '/math-input.js';
window.ctx={profileId:'fixture_a',topicId:'arithmetic.fractions',independentCheck:false};
window.counts={practice:0,application:0,scaffold:0,tools:0,legacyPractice:0,legacyHomework:0,disposed:0};
window.calls=[];window.errors=[];window.pendingHelp=null;window.deferNextHelp=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lessons=[{id:'arithmetic.fractions',course_id:'arithmetic',course:'Arithmetic',title:'Fractions',index:1,total:3,video_available:true,video_path:'fixture',poster:'',duration_seconds:60,transcript:'Original public narration.',practice:[1,2,3].map(i=>({id:'written-'+i,prompt:'Explain written example '+i}))},{id:'arithmetic.decimals',course_id:'arithmetic',course:'Arithmetic',title:'Decimals',index:2,total:3,video_available:false,practice:[1,2,3].map(i=>({id:'decimal-'+i,prompt:'Explain decimal example '+i})),transcript:'Source-only readable lesson.'},{id:'geometry.angles',course_id:'arithmetic',course:'Geometry',title:'Angles',index:3,total:3,video_available:false,existing_lesson_id:'4A-01',transcript:'Angle transcript.'}];
lessons.forEach((lesson,i)=>lesson.objective=['Compare equal parts of one whole.','Connect decimal places to tenths and hundredths.','Measure the turn between two rays.'][i]);
window.api=async(route,data,profile)=>{calls.push({route,data,profile});if(route==='video-catalog')return {lessons,courses:[{id:'arithmetic',title:'Arithmetic',description:'Fixture course',color:'#aabbcc'}],topic_count:3};if(route==='topic/help'&&deferNextHelp){deferNextHelp=false;await new Promise(resolve=>window.pendingHelp=resolve);}return {saved:true};};
window.learning={topic:id=>id==='arithmetic.fractions'?{lesson:{examples:[{title:'Example'}]}}:{},hasGuide:id=>id==='arithmetic.fractions',selectedStart:()=>null,mountInlinePractice:async(host,id,p,options)=>{counts.practice++;window.practiceOptions=options;host.innerHTML='<div class="inline-practice-controls"><label>Difficulty <select><option>Build the idea</option></select></label></div><div id="topic-activity">'+[1,2,3].map(i=>'<div class="question"><label class="question-title" for="answer-'+i+'"><span class="question-num">'+i+'</span><span>Calculate example '+i+'.</span></label><input class="answer-input" id="answer-'+i+'" type="text" value=""><button class="hintbutton" type="button">Need a hint?</button></div>').join('')+'<div class="batch-footer"><span class="autosave">Saved</span><button class="button">Check my work</button></div></div>';window.stopInputs=enhanceMathInputs(host,{getContext:()=>ctx,onSupport:event=>api('notation-support',event,event.profileId)});}};
window.progress={profile_id:'fixture_a',topics:{'arithmetic.fractions':{homework:{'written-1':'My saved reasoning.'}}},lessons:{}};
window.ui=createVideoCatalogUI({api,esc,toast:message=>errors.push(message),copy:()=>{},learning,legacyLesson:id=>({id}),
 mountLegacyPractice:id=>{counts.legacyPractice++;document.querySelector('#activity-panel').innerHTML='<input class="answer-input" id="legacy-answer" value="old draft">';},
 mountLegacyHomework:()=>{counts.legacyHomework++;document.querySelector('#homework-panel').innerHTML='<textarea id="legacy-homework">Saved legacy work</textarea>';},
 onCalculator:()=>calls.push({route:'calculator'}),onHelp:()=>calls.push({route:'coach'}),
 mountApplication:host=>{counts.application++;host.innerHTML='<label>Experiment draft <input id="application-draft"></label>';return()=>{counts.disposed++;host.replaceChildren();};},
 mountScaffold:host=>{counts.scaffold++;host.innerHTML='<textarea id="example-draft"></textarea><button type="button" data-back>Back to my problems</button>';host.querySelector('[data-back]').onclick=()=>{host.closest('details').open=false;document.querySelector('#answer-1').focus();};return()=>{counts.disposed++;host.replaceChildren();};},
 mountTools:host=>{counts.tools++;host.innerHTML='<input id="tool-draft" placeholder="My steps">';return()=>{counts.disposed++;host.replaceChildren();};}});
window.start=async(id='arithmetic.fractions',tab='video')=>{stopInputs?.();await ui.render('watch',id,tab,progress);};
window.stopInputs=null;window.enhanceMathInput=enhanceMathInput;
await ui.load();await start();window.ready=true;
</script></html>`;
let browser;
const server=http.createServer((req,res)=>{
 const filename=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1);
 if(!filename){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fixture);}
 if(!allowed.has(filename)){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':filename.endsWith('.css')?'text/css':'text/javascript'});res.end(fs.readFileSync(path.join(DASH,filename)));
});
const report={checks:[],pageErrors:[]};
const okay=name=>{report.checks.push(name);console.log('PASS '+name);};
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1220,height:940}});page.setDefaultTimeout(6000);page.on('pageerror',e=>report.pageErrors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
 assert.equal(await page.locator('#inline-practice-host .answer-input').count(),3);
 assert.deepEqual(await page.evaluate(()=>({practice:counts.practice,application:counts.application,scaffold:counts.scaffold,tools:counts.tools})),{practice:1,application:0,scaffold:0,tools:0});
 for(const id of ['lesson-application','lesson-example','lesson-transcript','video-written-extra','lesson-tools'])assert.equal(await page.locator('#'+id).evaluate(e=>e.open),false);
 assert.equal(await page.locator('[data-video-work]').count(),0);
 assert.equal(await page.locator('#lesson-transcript-host').textContent(),'');
 await page.locator('#lesson-practice-calculator').click();assert.equal(await page.evaluate(()=>calls.filter(c=>c.route==='calculator').length),1);
 const layout=await page.evaluate(()=>({height:document.querySelector('.lesson-practice').getBoundingClientRect().height,helper:document.querySelector('.math-input-helper').getBoundingClientRect().height,summary:document.querySelector('.math-input-details>summary').getBoundingClientRect().width,between:document.querySelector('.lesson-practice').previousElementSibling.className}));
 assert(layout.height<580,JSON.stringify({...layout,detail:await page.locator('.lesson-practice').evaluate(e=>Array.from(e.querySelectorAll('.question,.question-title,.answer-input,.hintbutton,.batch-footer')).map(n=>({tag:n.tagName,cls:n.className,height:n.getBoundingClientRect().height,margin:getComputedStyle(n).margin,padding:getComputedStyle(n).padding})))}));assert(layout.helper<=30,JSON.stringify(layout));assert(layout.summary<150,JSON.stringify(layout));assert.match(layout.between,/catalog-video/);
 okay('Video leads directly to three compact problems; all extras initially unmounted.');

 await page.locator('#answer-1').fill('a saved attempt');
 await page.locator('#lesson-application>summary').click();await page.locator('#application-draft').waitFor();await page.locator('#application-draft').fill('My orbit experiment');
 await page.locator('#lesson-application>summary').click();await page.locator('#lesson-application>summary').click();
 assert.equal(await page.locator('#application-draft').inputValue(),'My orbit experiment');assert.equal(await page.evaluate(()=>counts.application),1);
 await page.locator('#lesson-open-example').click();await page.locator('#example-draft').waitFor();await page.locator('#example-draft').fill('Why this factor cancels');assert.equal(await page.locator('#lesson-example-return').textContent(),'← Back to my problems');await page.locator('#lesson-example-return').click();
 assert.equal(await page.locator('#answer-1').inputValue(),'a saved attempt');assert.equal(await page.evaluate(()=>document.activeElement.id),'answer-1');assert.equal(await page.locator('#lesson-example').evaluate(e=>e.open),false);assert.equal(await page.evaluate(()=>counts.practice),1);
 await page.locator('#lesson-open-example').click();assert.equal(await page.locator('#example-draft').inputValue(),'Why this factor cancels');assert.equal(await page.evaluate(()=>counts.scaffold),1);
 okay('Lazy applications and examples preserve drafts and return to the same practice session.');

 await page.locator('#video-written-extra>summary').click();await page.locator('[data-video-work]').first().waitFor();assert.equal(await page.locator('[data-video-work]').count(),3);assert.equal(await page.locator('[data-video-work]').first().inputValue(),'My saved reasoning.');
 await page.locator('[data-video-work]').first().fill('New reasoning after opening');await page.waitForFunction(()=>calls.some(c=>c.route==='topic/homework'&&c.data.answers['written-1']==='New reasoning after opening'));
 assert.equal(await page.evaluate(()=>calls.filter(c=>c.route==='topic/homework').at(-1).profile),'fixture_a');
 await page.locator('#video-written-extra>summary').click();await page.locator('#video-written-extra>summary').click();assert.equal(await page.locator('[data-video-work]').first().inputValue(),'New reasoning after opening');
 await page.locator('#lesson-transcript>summary').click();await page.waitForFunction(()=>document.querySelector('#lesson-transcript-host').textContent==='Original public narration.');
 await page.locator('#lesson-tools>summary').click();await page.locator('#tool-draft').waitFor();assert.equal(await page.evaluate(()=>counts.tools),1);
 okay('Written work, transcript, and tools mount only when opened; saves remain profile-bound.');

 await page.locator('#answer-2').fill('x+1');const helper=page.locator('#answer-2 + .math-input-helper'),summary=helper.locator('summary');
 assert.equal(await summary.textContent(),'Math symbols');assert.equal(await helper.locator('details').evaluate(e=>e.open),false);
 await summary.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#answer-2 + .math-input-helper details').open);
 assert.equal(await page.locator('#answer-2').inputValue(),'x+1');assert.equal(await page.evaluate(()=>calls.filter(c=>c.route==='notation-support').length),1);
 await page.locator('#answer-2').evaluate(e=>{e.focus();e.setSelectionRange(0,3);});await helper.locator('[data-symbol=fraction]').click();assert.equal(await page.locator('#answer-2').inputValue(),'(x+1)/()');
 await helper.locator('[data-symbol=fraction]').focus();await page.keyboard.press('Escape');assert.equal(await helper.locator('details').evaluate(e=>e.open),false);
 await page.evaluate(()=>{ctx.independentCheck=true;document.querySelector('#answer-2').dispatchEvent(new Event('math-input-context'));});assert.equal(await helper.locator('details').isVisible(),false);assert.equal(await page.locator('#answer-2').isEditable(),true);
 await page.evaluate(()=>{ctx.independentCheck=false;document.querySelector('#answer-2').dispatchEvent(new Event('math-input-context'));});
 okay('Small keyboard-accessible Math symbols palette records support, inserts text, and respects independent checks.');

 await page.evaluate(()=>{ui.dispose();stopInputs?.();document.querySelector('#main').innerHTML='<input id="stale-input" type="text" value="keep this">';ctx={profileId:'fixture_a',topicId:'arithmetic.fractions'};window.stopStale=enhanceMathInput(document.querySelector('#stale-input'),{getContext:()=>ctx,onSupport:()=>new Promise(resolve=>window.releaseSymbols=resolve)});});
 await page.locator('.math-input-details>summary').click();await page.waitForFunction(()=>typeof releaseSymbols==='function');
 await page.evaluate(()=>{ctx={profileId:'fixture_b',topicId:'arithmetic.fractions'};document.querySelector('#stale-input').dispatchEvent(new Event('math-input-context'));releaseSymbols();});
 await page.waitForFunction(()=>!document.querySelector('.math-input-details>summary').hasAttribute('aria-busy'));assert.equal(await page.locator('.math-input-details').evaluate(e=>e.open),false);assert.equal(await page.locator('#stale-input').inputValue(),'keep this');
 await page.evaluate(()=>stopStale());assert.equal(await page.locator('.math-input-helper').count(),0);
 okay('A delayed notation-help response cannot reopen the palette after a profile switch.');

 await page.evaluate(()=>{ctx={profileId:'fixture_a',topicId:'arithmetic.fractions',independentCheck:false};return start();});
 await page.evaluate(()=>window.deferNextHelp=true);await page.locator('#lesson-application>summary').click();await page.waitForFunction(()=>typeof pendingHelp==='function');
 const mountedBefore=await page.evaluate(()=>counts.application);
 await page.evaluate(async()=>{stopInputs?.();await ui.render('videos','all','video',{profile_id:'fixture_b',topics:{},lessons:{}});pendingHelp();});
 await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>counts.application),mountedBefore);assert.equal(await page.locator('#breadcrumb').textContent(),'Courses');assert.equal(await page.locator('#lesson-mission-host').count(),0);
 okay('Late lazy-panel work cannot mount into a new route or profile.');

 assert.equal(await page.locator('.video-library-heading h1').textContent(),'Courses');
 assert.equal(await page.locator('.video-course-card').count(),1);
 assert.equal(await page.locator('.video-course-card .card-art').count(),1);
 assert.equal(await page.locator('.video-course-card p').count(),0);
 assert.equal(await page.locator('.video-course-card small').textContent(),'3 lessons');
 await page.locator('#video-search').fill('Fractions');assert.equal(await page.locator('.video-course-card').count(),1);
 await page.locator('#video-search').fill('not a topic');assert.equal(await page.locator('.video-course-card').count(),0);
 await page.evaluate(()=>ui.render('videos','arithmetic','video',progress));
 assert.equal(await page.locator('.video-lesson-row').count(),3);
 assert.deepEqual(await page.locator('.video-lesson-row h2').allTextContents(),['Fractions','Decimals','Angles']);
 assert.deepEqual(await page.locator('.video-lesson-row p').allTextContents(),['Compare equal parts of one whole.','Connect decimal places to tenths and hundredths.','Measure the turn between two rays.']);
 assert.equal(await page.locator('.video-lesson-row small').count(),0);
 assert.match(await page.locator('.watch-arrow').first().textContent(),/^Play/);
 assert.equal(await page.locator('.video-course-details').evaluate(e=>e.open),false);
 await page.locator('.video-course-details>summary').click();assert.equal(await page.locator('.video-course-details p').textContent(),'Fixture course');
 await page.evaluate(()=>{progress.topics['arithmetic.fractions'].video_seconds=15;return ui.render('videos','arithmetic','video',progress);});
 assert.match(await page.locator('.watch-arrow').first().textContent(),/^Continue/);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.watch-arrow').first().isVisible(),true);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.evaluate(()=>ui.render('videos','all','video',progress));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.setViewportSize({width:1220,height:940});
 okay('Course cards are art/title/count; course rows show one goal and play status, with optional details and responsive search.');

 for(const tab of ['guide','homework','steps']){await page.evaluate(tab=>start('arithmetic.fractions',tab),tab);await page.waitForFunction(tab=>document.querySelector(tab==='guide'?'#lesson-example':tab==='homework'?'#video-written-extra':'#lesson-tools').open,tab);}
 await page.evaluate(()=>start('arithmetic.decimals'));assert.equal(await page.locator('[data-video-work]').count(),3);await page.locator('#lesson-read-transcript').click();await page.waitForFunction(()=>document.querySelector('#lesson-transcript-host').textContent==='Source-only readable lesson.');
 await page.evaluate(()=>start('geometry.angles'));assert.equal(await page.evaluate(()=>counts.legacyPractice),1);assert.equal(await page.evaluate(()=>counts.legacyHomework),0);await page.locator('#legacy-written-extra>summary').click();await page.locator('#legacy-homework').waitFor();assert.equal(await page.evaluate(()=>counts.legacyHomework),1);
 okay('Guide/homework/steps aliases, source-only lessons, and legacy callbacks still work.');

 await page.evaluate(()=>start());await page.setViewportSize({width:390,height:844});await page.waitForTimeout(40);
 assert.equal(await page.locator('#inline-practice-host .answer-input').count(),3);
 const width=await page.evaluate(()=>({client:innerWidth,scroll:document.documentElement.scrollWidth}));assert(width.scroll<=width.client+1,JSON.stringify(width));
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(await page.evaluate(()=>errors),[]);
 okay('Mobile layout has no horizontal overflow; no component errors.');
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(resolve=>server.close(resolve));});
