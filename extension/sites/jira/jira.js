// Jira issue page, kept as Jira draws it, with a few calm tweaks (theme "focus"):
//   - left sidebar collapsed once with Jira's own button, which keeps working
//   - right details pane hidden (a small tab on the right edge brings it back)
//   - title and description are read-only: clicking them does not open the editor;
//     an "Edit" button next to the Description heading opens Jira's own editor
//   - work item tables (subtasks, linked items) are read-only: no inline edit,
//     no status change, no drag to reorder; the issue links still open
//   - a plain click on a link to another issue opens it in this tab, never a new one
//   - title and description have no hover highlight
// Jira's own markup is targeted only through data-testid hooks, which are
// more stable than its generated class names.
(() => {
  const ROOT = document.documentElement;
  const CSS_ID = 'bt-jira-css';
  const PEEK_ID = 'bt-jira-peek';
  const EDIT_ID = 'bt-jira-edit-description';
  // Fields that should read like text, not open an editor on click.
  const READ_ONLY = [
    '[data-testid="issue-field-summary.ui.issue-field-summary-inline-edit--container"]',
    '[data-testid="issue.views.field.rich-text.description"]',
    '[data-vc="issue-table-main-container"]',
  ].join(',');
  const SIDEBAR_BTN = '[data-testid="page-layout.top-nav"] button';
  const DESCRIPTION_LABEL = '[data-testid="issue.views.issue-base.common.description.label"]';
  const DESCRIPTION = '[data-testid="issue.views.field.rich-text.description"]';
  // Jira's invisible button over the description text (hidden by jira.css); clicking it opens the editor.
  const DESCRIPTION_EDIT = 'button[aria-label^="Edit Description"]';
  let mounted = false;
  let collapsedByUs = false;
  let observer = null;
  let editing = false;

  function isIssuePage() {
    if (/\/browse\/[A-Z][A-Z0-9_]+-\d+/.test(location.pathname)) return true;
    return new URLSearchParams(location.search).has('selectedIssue');
  }

  // Stop the click (or Enter) that would open the title or description editor.
  // Only the event's propagation to Jira is stopped, never the browser default,
  // and mousedown/mouseup pass through untouched, so selecting text, clearing a
  // selection and Jira's own selection tools keep working. Links still open.
  function blockEdit(event) {
    if (!mounted || editing) return;
    const field = event.target.closest && event.target.closest(READ_ONLY);
    if (!field) return;
    // the editor is open (via the Edit button): its toolbar, Save and Cancel must work
    if (field.querySelector('[contenteditable="true"]')) return;
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

  // "Edit" next to the Description heading: presses Jira's own (hidden) edit button, which
  // opens the same editor a click on the text opens without this theme. Hidden while it's open.
  function syncEditButton() {
    if (!mounted) return;
    const label = document.querySelector(DESCRIPTION_LABEL);
    const jiraEdit = document.querySelector(`${DESCRIPTION} ${DESCRIPTION_EDIT}`);
    let btn = document.getElementById(EDIT_ID);
    if (!label) {
      btn?.remove();
      return;
    }
    if (btn && label.contains(btn)) {
      btn.hidden = !jiraEdit;
      return;
    }
    if (jiraEdit) {
      btn?.remove();
      btn = document.createElement('button');
      btn.id = EDIT_ID;
      btn.type = 'button';
      btn.textContent = 'Edit';
      btn.title = 'Edit description';
      // Keep focus where it is, so the editor Jira opens is not blurred (and closed) by it.
      btn.addEventListener('mousedown', (event) => event.preventDefault());
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const target = document.querySelector(`${DESCRIPTION} ${DESCRIPTION_EDIT}`);
        if (!target) return;
        editing = true;
        try {
          target.click();
        } finally {
          editing = false;
        }
      });
      label.append(btn);
    }
  }

  function watchPage() {
    let queued = false;
    observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        syncEditButton();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
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
    if (!observer) watchPage();
    syncEditButton();
  }

  function unmount() {
    if (mounted && collapsedByUs) sidebarButton('Expand sidebar')?.click();
    collapsedByUs = false;
    mounted = false;
    observer?.disconnect();
    observer = null;
    delete ROOT.dataset.btJira;
    delete ROOT.dataset.btShowRight;
    for (const id of [CSS_ID, PEEK_ID, EDIT_ID]) document.getElementById(id)?.remove();
  }

  for (const type of ['click', 'keydown']) {
    window.addEventListener(type, blockEdit, true);
  }

  // A plain left click on a link to another issue opens it here. Something in Jira sends some of
  // these clicks to a new tab; Cmd/Ctrl/Shift/middle clicks still open new tabs as the user asks.
  window.addEventListener('click', (event) => {
    if (!mounted || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.closest('[contenteditable="true"]')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/^\/browse\/[A-Z][A-Z0-9_]+-\d+/.test(url.pathname)) return;
    event.preventDefault();
    event.stopPropagation();
    location.assign(url.href);
  }, true);

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
    themes: [{ id: 'focus', label: 'Focus', hint: 'No side panes, read-only title, description behind an Edit button' }],
    isActive: isIssuePage,
    mount,
    unmount,
  });
})();
