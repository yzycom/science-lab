import anime from 'animejs';

/**
 * 详情面板进场
 * @param {HTMLElement} panel
 */
export function showPanel(panel) {
  panel.classList.add('visible');
  anime({
    targets: panel,
    translateX: ['60px', '0px'],
    opacity: [0, 1],
    duration: 380,
    easing: 'easeOutCubic',
  });
}

/**
 * 详情面板退场
 * @param {HTMLElement} panel
 * @param {Function} [onComplete]
 */
export function hidePanel(panel, onComplete) {
  anime({
    targets: panel,
    translateX: ['0px', '60px'],
    opacity: [1, 0],
    duration: 260,
    easing: 'easeInCubic',
    complete: () => {
      panel.classList.remove('visible');
      panel.style.opacity = '';
      panel.style.transform = '';
      if (onComplete) onComplete();
    },
  });
}
