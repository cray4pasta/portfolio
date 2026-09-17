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
    const activeClass = (name) => (activeLink === name ? ' class="active"' : '');

    // AI workflow link temporarily removed from nav — page still exists at
    // ai-workflow.html, just not linked from here. Restore the line below
    // (<a href="ai-workflow.html"${activeClass('ai-workflow')}>AI workflow</a>) to bring it back.
    el.outerHTML = `
  <nav${isHome ? ' class="home-nav"' : ''}>
    <div class="nav-inner">
      <div class="nav-logo">${logo}</div>
      <div class="nav-links">
        <a href="${workHref}"${activeClass('work')}>Work</a>
        <a href="fun.html"${activeClass('fun')}>Fun</a>
        <a href="about.html"${activeClass('about')}>About</a>
      </div>
      <a class="nav-clock" href="assets/resume.pdf" target="_blank" rel="noopener">Resume</a>
    </div>
  </nav>`;
  });
})();
