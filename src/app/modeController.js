export function createModeController(buttons, modes, initialMode) {
  let currentMode = null;

  function activate(modeName) {
    if (modeName === currentMode) return;
    if (!modes[modeName]) {
      throw new Error(`Unknown mode: ${modeName}`);
    }
    if (currentMode) {
      modes[currentMode].leave?.();
    }
    currentMode = modeName;
    buttons.forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === modeName);
    });
    modes[currentMode].enter?.();
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => activate(button.dataset.mode));
  });

  activate(initialMode);

  return {
    activate,
    get currentMode() {
      return currentMode;
    },
  };
}
