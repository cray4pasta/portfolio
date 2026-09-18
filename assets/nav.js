/* Shared nav component. Renders into every <div data-component="nav">
   placeholder so nav markup lives in exactly one place. Config via
   data attributes on the placeholder:
     data-variant="home"      -> adds .home-nav (split-scroll pages: index, about)
     data-logo-link="false"   -> logo renders as plain text, not a link (homepage only)
     data-work-href="#work"   -> override the "Work" link target (homepage only) */
(function () {
  document.querySelectorAll('[data-component="nav"]').forEach((el) => {
    const isHome = el.dataset.variant === 'home';
    const logoLinked = el.dataset.logoLink !== 'false';
    const workHref = el.dataset.workHref || 'index.html#work';
    const logo = logoLinked
      ? '<a href="index.html">Prerna Kashyap</a>'
      : 'Prerna Kashyap';

    // Everything that isn't Fun/AI workflow/About counts as Work — the
    // homepage and every case-study page (copart, panacea, etc.) fall
    // under the Work nav item, so it's active by default on those pages.
    // Extension stripped before comparing so this still matches on hosts/
    // dev servers that serve clean URLs (e.g. "/fun" instead of "/fun.html").
    const page = (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');
    const nonWorkPages = ['fun', 'ai-workflow', 'about'];
    const activeLink = nonWorkPages.includes(page) ? page : 'work';
    // mo-nav-link always applies (Motion "Breathe" hover: color shift +
    // the same rolling-text reveal as the "Let's grab boba" CTA, via
    // .roll-cta — see assets/cta-roll.js and the .roll-* rules in
    // shared.css); .active is kept for pages that don't load
    // motion-breathe.css, and aria-current lets Breathe's CSS keep the
    // active link's hover color muted instead of accent.
    const linkClass = (name) => `mo-nav-link roll-cta${activeLink === name ? ' active' : ''}`;
    const ariaCurrent = (name) => (activeLink === name ? ' aria-current="page"' : '');

    // cta-roll.js finds every .roll-cta-label at load and splits its text
    // into the two-row rolling markup — same helper the CTA uses.
    const label = (text) => `<span class="roll-cta-label">${text}</span>`;

    // AI workflow link temporarily removed from nav — page still exists at
    // ai-workflow.html, just not linked from here. Restore the line below
    // (<a href="ai-workflow.html" class="${linkClass('ai-workflow')}" data-mo="3"${ariaCurrent('ai-workflow')}>${label('AI workflow')}</a>) to bring it back.
    el.outerHTML = `
  <nav${isHome ? ' class="home-nav"' : ''}>
    <div class="nav-inner">
      <div class="nav-logo" data-mo="0">${logo}</div>
      <div class="nav-links">
        <a href="${workHref}" class="${linkClass('work')}" data-mo="1"${ariaCurrent('work')}>${label('Work')}</a>
        <a href="fun.html" class="${linkClass('fun')}" data-mo="2"${ariaCurrent('fun')}>${label('Fun')}</a>
        <a href="about.html" class="${linkClass('about')}" data-mo="3"${ariaCurrent('about')}>${label('About')}</a>
      </div>
      <a class="nav-clock mo-nav-link roll-cta" href="assets/resume.pdf" target="_blank" rel="noopener" data-mo="4">${label('Resume')}</a>
    </div>
  </nav>`;
  });
})();
