// Swipe-down-to-close for bottom sheets (phone Menu, "Get the app" guide), in the spirit of Vaul:
// the sheet follows the finger 1:1, and a quick flick or a pull past ~25% of its height closes it.
// Anything less springs back. Pulling upward is damped so the sheet never detaches from the bottom.
export function swipeToClose(sheet: HTMLElement, onClose: () => void) {
  let startY = 0, lastY = 0, lastT = 0, velocity = 0, dragging = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  sheet.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Let taps on links and buttons through; only start a drag from the sheet surface or its grip.
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, select, textarea') && !target.closest('[data-grip]')) return;
    dragging = true; startY = lastY = e.clientY; lastT = e.timeStamp; velocity = 0;
    sheet.style.transition = 'none';
    sheet.setPointerCapture(e.pointerId);
  });
  sheet.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    const dt = Math.max(1, e.timeStamp - lastT);
    velocity = (e.clientY - lastY) / dt; lastY = e.clientY; lastT = e.timeStamp;
    sheet.style.transform = `translateY(${dy > 0 ? dy : dy / 6}px)`;
  });
  const end = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    const dy = e.clientY - startY;
    sheet.style.transition = reduce ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
    if (dy > sheet.offsetHeight * 0.25 || velocity > 0.5) {
      sheet.style.transform = `translateY(${sheet.offsetHeight + 40}px)`;
      setTimeout(() => { onClose(); sheet.style.transform = ''; sheet.style.transition = ''; }, reduce ? 0 : 260);
    } else {
      sheet.style.transform = '';
      setTimeout(() => (sheet.style.transition = ''), 300);
    }
  };
  sheet.addEventListener('pointerup', end);
  sheet.addEventListener('pointercancel', end);
}

/** Plays the element's closing animation (adds `is-closing`), then runs `done`. */
export function closeWithMotion(el: HTMLElement, done: () => void, ms = 200) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
  el.classList.add('is-closing');
  setTimeout(() => { el.classList.remove('is-closing'); done(); }, ms);
}
