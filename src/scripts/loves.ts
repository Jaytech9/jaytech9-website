// Gallery hearts: shows how many people love each design and lets a visitor love (or un-love) it.
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.glove[data-love]'));
if (buttons.length) {
  const fmt = (n: number) => (n ? n.toLocaleString('en-GH') : '');
  const paint = (b: HTMLButtonElement, n: number, loved: boolean) => {
    b.querySelector('.glove__n')!.textContent = fmt(n);
    b.setAttribute('aria-pressed', String(loved));
    const title = b.getAttribute('aria-label')!.replace(/^(Love|Unlove) /, '');
    b.setAttribute('aria-label', `${loved ? 'Unlove' : 'Love'} ${title}${n ? `, ${n} ${n === 1 ? 'person loves' : 'people love'} this` : ''}`);
    b.dataset.n = String(n);
  };
  fetch('/api/loves', { cache: 'no-store' }).then((r) => r.json()).then((d: { counts?: Record<string, number>; mine?: string[] }) => {
    for (const b of buttons) paint(b, d.counts?.[b.dataset.love!] ?? 0, !!d.mine?.includes(b.dataset.love!));
  }).catch(() => {});
  for (const b of buttons) {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const on = b.getAttribute('aria-pressed') !== 'true';
      const before = Number(b.dataset.n ?? 0);
      paint(b, Math.max(0, before + (on ? 1 : -1)), on);   // show it at once
      if (on) { b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop'); }
      try {
        const res = await fetch('/api/loves', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: b.dataset.love, on }) });
        if (!res.ok) throw new Error();
        const d = (await res.json()) as { count: number; loved: boolean };
        paint(b, d.count, d.loved);
      } catch { paint(b, before, !on); }
    });
  }
}
