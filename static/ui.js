// Shared with the other sites: scroll reveal (blocks rise in once, staggered; skipped under reduced motion) + theme toggle.
(function () {
  const h = document.documentElement;
  const tb = document.getElementById('theme');
  if (tb) tb.onclick = () => {
    const dark = h.dataset.theme ? h.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    h.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('munjang.theme', h.dataset.theme); } catch (e) {}
  };
  // Keep disclosure menus usable with a pointer, keyboard, or JS disabled.
  const langMenu = document.querySelector('details.lang-menu');
  if (langMenu) {
    const trigger = langMenu.querySelector('summary');
    const options = [...langMenu.querySelectorAll('[role="menuitem"]')];
    const syncLangMenu = () => {
      trigger.setAttribute('aria-expanded', langMenu.open ? 'true' : 'false');
      options.forEach(option => option.tabIndex = -1);
    };
    const closeLangMenu = (focusTrigger = false) => {
      if (!langMenu.open) return;
      langMenu.removeAttribute('open');
      if (focusTrigger) trigger.focus();
    };
    langMenu.addEventListener('toggle', syncLangMenu);
    langMenu.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLangMenu(true);
        return;
      }
      if (!langMenu.open || !options.length) return;
      const current = options.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        const next = current < 0 ? (step > 0 ? 0 : options.length - 1) : (current + step + options.length) % options.length;
        options[next].focus();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        options[e.key === 'Home' ? 0 : options.length - 1].focus();
      }
    });
    syncLangMenu();
  }
  const navScroll = document.getElementById('nav-scroll');
  if (navScroll) {
    const nav = navScroll.querySelector('nav');
    const previous = document.getElementById('nav-scroll-prev');
    const next = document.getElementById('nav-scroll-next');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const syncNavScroll = () => {
      const max = Math.max(0, nav.scrollWidth - nav.clientWidth);
      const left = nav.scrollLeft;
      const scrollable = max > 2;
      const atStart = !scrollable || left <= 2;
      const atEnd = !scrollable || max - left <= 2;
      navScroll.dataset.scrollable = scrollable ? 'true' : 'false';
      navScroll.dataset.atStart = atStart ? 'true' : 'false';
      navScroll.dataset.atEnd = atEnd ? 'true' : 'false';
      previous.hidden = !scrollable || !atEnd;
      next.hidden = !scrollable || atEnd;
    };
    const move = direction => {
      const amount = direction * 200;
      if (typeof nav.scrollBy === 'function') nav.scrollBy({ left: amount, behavior: reduced.matches ? 'auto' : 'smooth' });
      else nav.scrollLeft += amount;
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    nav.addEventListener('scroll', syncNavScroll, { passive: true });
    window.addEventListener('resize', syncNavScroll);
    if ('ResizeObserver' in window) new ResizeObserver(syncNavScroll).observe(nav);
    requestAnimationFrame(syncNavScroll);
  }
  document.addEventListener('click', e => {
    document.querySelectorAll('details.menu[open], details.lang-menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { window.__reveal = () => {}; return; }
  const SEL = ':scope > section, :scope > aside, :scope > .panel, :scope > .prose, :scope > .side > *';
  const io = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
  window.__reveal = (root, force, base) => {
    if (!root) return;
    root.querySelectorAll(SEL).forEach((t, i) => {
      if (t.id === 'rail' || (!force && t.getBoundingClientRect().top <= innerHeight)) return;
      t.classList.add('rv', 'reveal'); t.style.setProperty('--d', ((base || 0) + i * 90) + 'ms'); io.observe(t);
    });
  };
  window.__reveal(document.querySelector('main'), false, 0);
})();
