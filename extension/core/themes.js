// Shared theme state for every site module.
// A site module calls BT.register({ site, label, themes, isActive, mount, unmount }).
//   site      short id, used in the storage key ("jira")
//   themes    [{ id, label, hint }], the first one is the default; "original" is added
//   isActive  () => bool, true when the current URL is a page this module changes
//   mount     (theme) => void, apply theme id to the page (called again on SPA navigation)
//   unmount   () => void, undo everything and restore the original page
// The chosen theme is stored per site in chrome.storage.sync under "theme:<site>".
// "original" means the module is unmounted and the site looks as it ships.
(() => {
  const ORIGINAL = { id: 'original', label: 'Original', hint: 'The site as it ships' };
  const modules = [];
  let lastHref = location.href;

  const key = (site) => `theme:${site}`;

  // Reloading or updating the extension orphans the script already running in open tabs: its
  // chrome.* calls then throw "Extension context invalidated". The page keeps the theme as it
  // is; a reload of the tab picks up the new script.
  const alive = () => Boolean(chrome.runtime?.id);

  const ids = (mod) => mod.themes.map((t) => t.id);

  // Falls back to the module's first theme when nothing (or a retired id) is stored.
  async function getTheme(mod, name = key(mod.site)) {
    const got = (await chrome.storage.sync.get(name))[name];
    return got === 'original' || ids(mod).includes(got) ? got : mod.themes[0].id;
  }

  async function setTheme(site, theme) {
    const data = { [key(site)]: theme };
    if (theme !== 'original') data[`last:${site}`] = theme;
    await chrome.storage.sync.set(data);
  }

  async function apply(mod) {
    if (!alive()) return;
    let theme;
    try {
      theme = await getTheme(mod);
    } catch (error) {
      if (!alive()) return;
      throw error;
    }
    if (theme === 'original' || !mod.isActive()) {
      mod.unmount();
      delete document.documentElement.dataset.btTheme;
      return;
    }
    document.documentElement.dataset.btTheme = theme;
    mod.mount(theme);
  }

  function register(mod) {
    modules.push(mod);
    apply(mod);
  }

  function current() {
    return modules.find((m) => m.isActive()) || modules[0];
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const mod of modules) {
      if (changes[key(mod.site)]) apply(mod);
    }
  });

  // Single-page apps change the URL without a reload.
  const watcher = setInterval(() => {
    if (!alive()) {
      clearInterval(watcher);
      return;
    }
    if (location.href === lastHref) return;
    lastHref = location.href;
    modules.forEach(apply);
  }, 400);

  // The popup and keyboard commands talk to the page through these messages.
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    const mod = current();
    if (!mod) {
      reply(null);
      return;
    }
    (async () => {
      const theme = await getTheme(mod);
      if (msg.type === 'bt:get') {
        reply({ site: mod.site, label: mod.label, active: mod.isActive(), theme, themes: [...mod.themes, ORIGINAL] });
        return;
      }
      if (msg.type === 'bt:set') await setTheme(mod.site, msg.theme);
      if (msg.type === 'bt:cycle') {
        const list = [...ids(mod), 'original'];
        const next = list[(list.indexOf(theme) + 1) % list.length];
        await setTheme(mod.site, next);
      }
      if (msg.type === 'bt:toggle-original') {
        const last = await getTheme(mod, `last:${mod.site}`);
        await setTheme(mod.site, theme === 'original' ? last : 'original');
      }
      reply({ ok: true });
    })();
    return true;
  });

  window.BT = { register, setTheme };
})();
