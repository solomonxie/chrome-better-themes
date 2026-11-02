// Toolbar popup: reads the active tab's theme state and changes it via the
// content-script messages in core/themes.js (bt:get, bt:set, bt:toggle-original).
const $ = (id) => document.getElementById(id);
const ORIGINAL = 'original';
let tabId;
let state;

async function send(msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    return null;
  }
}

async function choose(theme) {
  state.theme = theme;
  render();
  await send({ type: 'bt:set', theme });
}

function row(t) {
  const li = document.createElement('li');
  if (t.id === ORIGINAL) li.className = 'sep';
  const btn = document.createElement('button');
  btn.className = 'row';
  btn.setAttribute('role', 'radio');
  btn.setAttribute('aria-checked', String(t.id === state.theme));
  btn.innerHTML = '<span><span class="row-label"></span><span class="row-hint"></span></span><span class="dot"></span>';
  btn.querySelector('.row-label').textContent = t.label;
  btn.querySelector('.row-hint').textContent = t.hint;
  btn.addEventListener('click', () => choose(t.id));
  li.append(btn);
  return li;
}

function render() {
  $('toggle').setAttribute('aria-checked', String(state.theme !== ORIGINAL));
  const themes = state.themes.filter((t) => t.id !== ORIGINAL);
  const original = state.themes.find((t) => t.id === ORIGINAL);
  if (original) themes.push(original);
  $('list').replaceChildren(...themes.map(row));
}

// Same as Alt+Shift+O: the content script remembers the last theme.
$('toggle').addEventListener('click', async () => {
  await send({ type: 'bt:toggle-original' });
  state = (await send({ type: 'bt:get' })) || state;
  render();
});

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab && tab.id;
  state = tabId == null ? null : await send({ type: 'bt:get' });
  if (!state) {
    $('empty').hidden = false;
    return;
  }
  $('site').textContent = state.label;
  $('note').hidden = state.active;
  $('main').hidden = false;
  render();
})();
