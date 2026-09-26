// Context is bound separately from learner text. Current work is sent only by opt-in.
export function createLessonCoach({api, esc}) {
  const host = document.createElement('aside');
  host.id = 'lesson-coach';
  host.hidden = true;
  document.body.append(host);
  const uid = () => crypto.randomUUID().replaceAll('-', '_');
  const clientId = uid();
  const drafts = new Map();
  let context = null, epoch = 0, pageRevision = 0, pageId = '', binding = Promise.resolve();
  let visible = false, busy = false, destroyed = false, blocked = '', greeting = null;
  let thread = {revision: 0, messages: []}, mode = 'authored', model = '', connection = null;
  let key = '', previousProfile = '', focusBeforeOpen = null, openRequest = 0;
  const $ = selector => host.querySelector(selector);
  const fresh = number => !destroyed && number === epoch && Boolean(context);
  const payload = () => ({client_id: clientId, context_id: pageId, context_revision: pageRevision, topic_id: context?.topicId});
  const entry = () => {
    if (!drafts.has(key)) drafts.set(key, {text: '', attachment: null});
    return drafts.get(key);
  };
  const safeHref = value => typeof value === 'string' && value.startsWith('#') && !/[<>\r\n]/.test(value) ? value : '';

  function rememberText() {
    if (context && $('#lc-question')) entry().text = $('#lc-question').value;
  }

  function messageCard(message) {
    const author = message.role === 'user' ? 'You' : message.source === 'local' ? 'Local AI · unverified' : 'Authored lesson guidance';
    const attachment = message.attachment ? `<details class="lc-attached"><summary>Work you chose to share</summary>${message.attachment.prompt ? `<p>${esc(message.attachment.prompt)}</p>` : ''}<pre>${esc(message.attachment.draft)}</pre></details>` : '';
    return `<article class="lc-message lc-${message.role === 'user' ? 'user' : 'reply'}"><span class="lc-author">${author}</span><p>${esc(message.text)}</p>${attachment}</article>`;
  }

  function render() {
    if (!context || destroyed) { host.hidden = true; return; }
    host.hidden = false;
    const draft = entry();
    const content = blocked
      ? `<div class="lc-check-note"><strong>Keep this check independent.</strong><p>${esc(blocked)}</p><button type="button" class="lc-primary" data-lc-practice>Return to practice</button></div>`
      : `<div class="lc-conversation" id="lc-conversation" role="log" aria-label="Lesson coach conversation" aria-live="polite" aria-relevant="additions text">${greeting ? messageCard({...greeting, role: 'assistant'}) : ''}${thread.messages.map(messageCard).join('')}</div>
        <div class="lc-prompts" aria-label="Authored help prompts"><button type="button" data-lc-kind="idea">Core idea</button><button type="button" data-lc-kind="step">Show one step</button><button type="button" data-lc-kind="why">Why this step?</button><button type="button" data-lc-kind="next">Try the next step</button></div>
        <form id="lc-form"><label class="lc-question-label" for="lc-question">Where did you get stuck?</label><textarea id="lc-question" maxlength="1500" rows="3" placeholder="Name the symbol or step that feels unclear…">${esc(draft.text)}</textarea>
          <label class="lc-attach"><input type="checkbox" id="lc-attach" ${draft.attachment ? 'checked' : ''}> Include my current problem and work</label>
          <details class="lc-preview" id="lc-preview" ${draft.attachment ? 'open' : 'hidden'}><summary>Review what will be shared</summary><pre>${esc(draft.attachment ? [draft.attachment.prompt, draft.attachment.draft].filter(Boolean).join('\n\n') : '')}</pre><small>Only this visible excerpt is attached. Check it before sending.</small></details>
          <div class="lc-send-row"><span id="lc-mode-note">${mode === 'local' ? 'Local AI · unverified' : 'Authored lesson guidance'}</span><button type="submit" class="lc-primary" id="lc-send">Send</button></div>
        </form>
        <details class="lc-settings" id="lc-settings"><summary>Optional local AI</summary><p>Authored guidance works offline. An installed local model can discuss your own questions; its replies can be wrong and never grade your work.</p><button type="button" class="lc-small-button" data-lc-connect>Check connection</button><div id="lc-connection"></div><label for="lc-mode">Reply with</label><select id="lc-mode"><option value="authored" ${mode === 'authored' ? 'selected' : ''}>Authored lesson guidance</option><option value="local" ${mode === 'local' ? 'selected' : ''} ${!connection?.available ? 'disabled' : ''}>Local AI · unverified</option></select><label for="lc-model">Installed model</label><select id="lc-model" ${connection?.models?.length ? '' : 'disabled'}>${(connection?.models || []).map(name => `<option value="${esc(name)}" ${name === model ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select><p class="lc-settings-note">No model is downloaded by Catalyst. Model size and computer requirements vary. <a href="https://docs.ollama.com/quickstart" target="_blank" rel="noopener noreferrer">Local model setup ↗</a></p></details>
        <p class="lc-retention-note">Sent messages save to this learning space. The latest 12 exchanges are kept. Unsent questions stay in this page's draft.</p>`;
    host.innerHTML = `<button type="button" class="lc-launcher" id="lc-launcher" aria-expanded="${visible}" aria-controls="lc-panel"><span aria-hidden="true">?</span> Need a hand?</button><section class="lc-panel" id="lc-panel" role="dialog" aria-modal="false" aria-labelledby="lc-title" ${visible ? '' : 'hidden'}><header class="lc-header"><div><h2 id="lc-title">Let's work through it.</h2><p>${esc(context.title || context.topicId)}</p></div><button type="button" class="lc-close" aria-label="Close lesson coach">×</button></header>${content}<p class="lc-status" id="lc-status" role="status"></p></section>`;
    $('#lc-launcher').onclick = () => visible ? close() : open();
    $('.lc-close').onclick = close;
    $('[data-lc-practice]')?.addEventListener('click', returnToPractice);
    $('#lc-question')?.addEventListener('input', rememberText);
    $('#lc-question')?.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); send('ask'); }
    });
    $('#lc-form')?.addEventListener('submit', event => { event.preventDefault(); send('ask'); });
    host.querySelectorAll('[data-lc-kind]').forEach(button => button.onclick = () => send(button.dataset.lcKind));
    $('#lc-attach')?.addEventListener('change', attach);
    $('[data-lc-connect]')?.addEventListener('click', checkConnection);
    $('#lc-mode')?.addEventListener('change', event => { mode = event.target.value; $('#lc-mode-note').textContent = mode === 'local' ? 'Local AI · unverified' : 'Authored lesson guidance'; });
    $('#lc-model')?.addEventListener('change', event => { model = event.target.value; });
    if (connection && $('#lc-connection')) $('#lc-connection').textContent = connection.message;
    setBusy(busy);
    if ($('#lc-conversation')) $('#lc-conversation').scrollTop = $('#lc-conversation').scrollHeight;
  }

  function status(message, error = false) {
    const node = $('#lc-status');
    if (node) { node.textContent = message; node.classList.toggle('lc-error', error); }
  }

  function setBusy(value) {
    busy = value;
    host.querySelectorAll('#lc-send, [data-lc-kind]').forEach(button => button.disabled = value);
    if ($('#lc-send')) $('#lc-send').textContent = value ? 'Working…' : 'Send';
  }

  function attach(event) {
    const draft = entry();
    if (!event.target.checked) { draft.attachment = null; $('#lc-preview').hidden = true; return; }
    try {
      const value = typeof context.getWork === 'function' ? context.getWork() : context.work || '';
      const work = typeof value === 'string' ? value : value?.draft || value?.text || '';
      const prompt = context.problem?.prompt || (typeof value === 'object' ? value?.prompt : '') || '';
      if (typeof work !== 'string' || typeof prompt !== 'string' || !(work.trim() || prompt.trim())) throw Error('There is no current work to attach. You can type the confusing step in your question.');
      draft.attachment = {prompt: prompt.slice(0, 2000), draft: work.slice(0, 4000)};
      $('#lc-preview pre').textContent = [draft.attachment.prompt, draft.attachment.draft].filter(Boolean).join('\n\n');
      $('#lc-preview').hidden = false; $('#lc-preview').open = true;
      status(work.length > 4000 || prompt.length > 2000 ? 'An excerpt is selected. Review it before sending.' : 'Review the attached excerpt. It is sent only when you press Send.');
    } catch (error) { draft.attachment = null; event.target.checked = false; status(error.message, true); }
  }

  async function checkConnection() {
    const number = epoch;
    status('Checking for an installed local model…');
    try {
      const next = await api('coach/status');
      if (!fresh(number) || !visible) return;
      connection = next;
      model = next.models?.includes(model) ? model : next.models?.[0] || '';
      if (!next.available) mode = 'authored';
      rememberText(); render(); $('#lc-settings').open = true;
      status(next.available ? 'A local model is available. Choose Local AI to use it.' : 'Authored guidance is ready to use.');
    } catch (error) { if (fresh(number)) status('The connection check failed. Authored guidance remains available. ' + error.message, true); }
  }

  async function open() {
    if (!context || destroyed) return;
    if (visible) return;
    focusBeforeOpen = document.activeElement;
    const number = epoch, request = ++openRequest, profile = context.profileId, data = payload();
    visible = true; blocked = context.independentCheck ? 'Return to practice before asking for help, then use a fresh check.' : '';
    greeting = null; thread = {revision: 0, messages: []}; render();
    if (blocked) { $('[data-lc-practice]')?.focus(); return; }
    setBusy(true); status('Opening the lesson guidance…');
    try {
      await binding;
      if (!fresh(number) || !visible || request !== openRequest) return;
      const result = await api('coach/open', data, profile);
      if (!fresh(number) || !visible || result.context_id !== pageId || request !== openRequest) return;
      blocked = result.blocked ? result.reason : '';
      if ((result.thread?.revision || 0) >= thread.revision) thread = result.thread || {revision: 0, messages: []};
      greeting = result.greeting || null;
      busy = false; render();
      if (!blocked) $('#lc-question')?.focus(); else $('[data-lc-practice]')?.focus();
    } catch (error) { if (fresh(number) && visible && request === openRequest) status(error.message, true); }
    finally { if (fresh(number) && request === openRequest) setBusy(false); }
  }

  function close() {
    rememberText(); visible = false; openRequest += 1;
    if ($('#lc-panel')) $('#lc-panel').hidden = true;
    $('#lc-launcher')?.setAttribute('aria-expanded', 'false');
    if (focusBeforeOpen?.isConnected && host.contains(document.activeElement)) focusBeforeOpen.focus();
  }

  async function returnToPractice() {
    const selected = context;
    close();
    if (typeof selected?.onReturnToPractice === 'function') await selected.onReturnToPractice();
    else location.hash = safeHref(selected?.practiceHref) || '#watch/' + encodeURIComponent(selected.topicId) + '/practice';
  }

  async function send(kind) {
    if (!context || busy || blocked || !visible) return;
    rememberText();
    const prompts = {idea: 'Explain the idea.', step: 'Show a step.', why: 'Why this step?', next: 'Next step.'};
    const draft = entry(), question = kind === 'ask' ? draft.text.trim() : prompts[kind];
    if (!question) { status('Write a question or choose a lesson prompt.', true); $('#lc-question').focus(); return; }
    if (mode === 'local' && !model) { status('Choose an installed model in Optional local AI, or use authored guidance.', true); return; }
    const number = epoch, profile = context.profileId;
    const sentText = draft.text, attachment = draft.attachment ? {...draft.attachment} : null;
    const data = {...payload(), request_id: uid(), base_revision: thread.revision, kind, question, mode, model,
      attach_work: Boolean(attachment), ...(attachment ? {problem: {prompt: attachment.prompt}, draft: attachment.draft} : {})};
    setBusy(true); status(mode === 'local' ? 'Preparing a local reply. Your question is still in the draft.' : 'Opening the next authored idea…');
    try {
      await binding;
      if (!fresh(number)) return;
      const result = await api('coach/message', data, profile);
      if (!fresh(number) || result.context_id !== pageId) return;
      thread = result.thread;
      if (kind === 'ask' && entry().text === sentText) entry().text = '';
      entry().attachment = null;
      busy = false; render();
      status('Saved. Try a step before asking for the next hint.');
      if (visible) $('#lc-question')?.focus();
    } catch (error) {
      if (fresh(number)) status(error.message + (data.mode === 'local' ? ' You can switch to authored lesson guidance in the connection settings.' : ''), true);
    } finally { if (fresh(number)) setBusy(false); }
  }

  function setContext(next) {
    if (destroyed) return;
    const page = next?.pageKey || location.hash;
    const signature = next ? [next.profileId, next.topicId, Boolean(next.independentCheck), page, next.problem?.id || '', next.problem?.prompt || ''].join('|') : '';
    if (context?.signature === signature && next) { context = {...next, signature}; return; }
    rememberText();
    const previous = context;
    epoch += 1; pageRevision += 1; pageId = uid(); visible = false; busy = false; blocked = ''; greeting = null; thread = {revision: 0, messages: []};
    if (!next?.topicId || !next?.profileId) {
      context = null; host.hidden = true; host.replaceChildren();
      if (previous) binding = api('coach/context', {...payload(), client_id: clientId, context_id: pageId, context_revision: pageRevision, active: false}, previous.profileId).catch(() => {});
      return;
    }
    if (previousProfile && previousProfile !== next.profileId) { drafts.clear(); mode = 'authored'; model = ''; connection = null; }
    previousProfile = next.profileId;
    context = {...next, signature}; key = [next.profileId, next.topicId, page].join('|');
    entry().attachment = null;
    if (drafts.size > 30) drafts.delete(drafts.keys().next().value);
    const number = epoch;
    binding = api('coach/context', {...payload(), active: true, independent_check: Boolean(next.independentCheck)}, next.profileId);
    binding.catch(error => { if (fresh(number) && visible) status(error.message, true); });
    render();
  }

  function onKey(event) { if (event.key === 'Escape' && visible) { event.preventDefault(); close(); } }
  document.addEventListener('keydown', onKey);
  function destroy() { if (destroyed) return; setContext(null); destroyed = true; document.removeEventListener('keydown', onKey); host.remove(); drafts.clear(); }
  return {setContext, open, close, destroy};
}
