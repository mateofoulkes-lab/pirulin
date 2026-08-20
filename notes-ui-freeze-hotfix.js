// Prevent the notes UI enhancement observer from recursively observing its own preview rewrites.
// Loaded after notes-live-adapter and before notes-ui-enhancements.
const NativeMutationObserver = window.MutationObserver;

window.MutationObserver = class PirulinMutationObserver extends NativeMutationObserver {
  observe(target, options = {}) {
    if (target?.id === 'notesGrid' && options?.childList && options?.subtree) {
      return super.observe(target, { ...options, subtree: false });
    }
    return super.observe(target, options);
  }
};
