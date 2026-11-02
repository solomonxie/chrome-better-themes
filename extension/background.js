// Keyboard shortcuts: forward to the content script in the active tab.
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const type = command === 'cycle-theme' ? 'bt:cycle' : 'bt:toggle-original';
  chrome.tabs.sendMessage(tab.id, { type }).catch(() => {});
});
