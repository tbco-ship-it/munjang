// Shared with the other sites: scroll reveal (blocks rise in once, staggered; skipped under reduced motion) + theme toggle.
(function () {
  const h = document.documentElement;
  const tb = document.getElementById('theme');
  if (tb) tb.onclick = () => {
    const dark = h.dataset.theme ? h.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    h.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('munjang.theme', h.dataset.theme); } catch (e) {}
  };
  // close the guides menu when clicking elsewhere
  document.addEventListener('click', e => { document.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); }); });
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
