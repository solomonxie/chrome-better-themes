// Jira issue page, kept as Jira draws it, with a few calm tweaks (theme "focus"):
//   - left sidebar collapsed once with Jira's own button, which keeps working
//   - right details pane hidden (a small tab on the right edge brings it back)
//   - title and description are read-only: clicking them does not open the editor
//   - work item tables (subtasks, linked items) are read-only: no inline edit,
//     no status change, no drag to reorder; the issue links still open
//   - title and description have no hover highlight
// Jira's own markup is targeted only through data-testid hooks, which are
// more stable than its generated class names.
(() => {
  const ROOT = document.documentElement;
  const CSS_ID = 'bt-jira-css';
  const PEEK_ID = 'bt-jira-peek';
  // Fields that should read like text, not open an editor on click.
  const READ_ONLY = [
    '[data-testid="issue-field-summary.ui.issue-field-summary-inline-edit--container"]',
    '[data-testid="issue.views.field.rich-text.description"]',
    '[data-vc="issue-table-main-container"]',
  ].join(',');
  const SIDEBAR_BTN = '[data-testid="page-layout.top-nav"] button';
  let mounted = false;
  let collapsedByUs = false;

  function isIssuePage() {
    if (/\/browse\/[A-Z][A-Z0-9_]+-\d+/.test(location.pathname)) return true;
    return new URLSearchParams(location.search).has('selectedIssue');
  }

  // Stop the click (or Enter) that would open the title or description editor.
  // Only the event's propagation to Jira is stopped, never the browser default,
  // and mousedown/mouseup pass through untouched, so selecting text, clearing a
  // selection and Jira's own selection tools keep working. Links still open.
  function blockEdit(event) {
    if (!mounted) return;
    const field = event.target.closest && event.target.closest(READ_ONLY);
    if (!field) return;
    if (event.target.closest('a[href]')) return;
    if (event.target.closest('[contenteditable="true"]')) return;
    if (event.type === 'keydown' && event.key !== 'Enter') return;
    event.stopPropagation();
  }

  // Jira's top-left button, labelled "Collapse sidebar" or "Expand sidebar".
  function sidebarButton(label) {
    return [...document.querySelectorAll(SIDEBAR_BTN)].find((b) => b.textContent.trim() === label);
  }

  // Collapse the left sidebar once per mount, waiting up to ~10s for Jira to draw it.
  // After that the user's own clicks on Jira's button decide.
  function collapseSidebar(tries = 40) {
    if (!mounted) return;
    const btn = sidebarButton('Collapse sidebar');
    if (btn) {
      btn.click();
      collapsedByUs = true;
      return;
    }
    if (sidebarButton('Expand sidebar')) return;
    if (tries > 0) setTimeout(() => collapseSidebar(tries - 1), 250);
  }

  // A small tab on the right edge that shows the hidden details pane while toggled.
  function buildPeek() {
    const btn = document.createElement('button');
    btn.id = PEEK_ID;
    btn.type = 'button';
    btn.title = 'Show details';
    btn.textContent = '‹';
    btn.addEventListener('click', () => {
      const on = ROOT.dataset.btShowRight !== '1';
      if (on) ROOT.dataset.btShowRight = '1';
      else delete ROOT.dataset.btShowRight;
      btn.textContent = on ? '›' : '‹';
      btn.title = on ? 'Hide details' : 'Show details';
    });
    return btn;
  }

  function mount(theme) {
    ROOT.dataset.btJira = theme;
    if (mounted) return;
    mounted = true;
    if (!document.getElementById(CSS_ID)) {
      const link = document.createElement('link');
      link.id = CSS_ID;
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('sites/jira/jira.css');
      document.head.append(link);
    }
    if (!document.getElementById(PEEK_ID)) document.body.append(buildPeek());
    collapseSidebar();
  }

  function unmount() {
    if (mounted && collapsedByUs) sidebarButton('Expand sidebar')?.click();
    collapsedByUs = false;
    mounted = false;
    delete ROOT.dataset.btJira;
    delete ROOT.dataset.btShowRight;
    for (const id of [CSS_ID, PEEK_ID]) document.getElementById(id)?.remove();
  }

  for (const type of ['click', 'keydown']) {
    window.addEventListener(type, blockEdit, true);
  }

  // No drag to reorder rows in work item tables.
  window.addEventListener('dragstart', (event) => {
    if (!mounted) return;
    if (!event.target.closest || !event.target.closest('[data-vc="issue-table-main-container"]')) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  BT.register({
    site: 'jira',
    label: 'Jira',
    themes: [{ id: 'focus', label: 'Focus', hint: 'No side panes, read-only title and text' }],
    isActive: isIssuePage,
    mount,
    unmount,
  });
})();
