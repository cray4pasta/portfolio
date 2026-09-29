/* Split-scroll columns + footer reveal. Opt in with:
     <… class="split-stage">  the block holding the columns (its columns are
                               whichever descendants the page's CSS gives
                               overflow-y: auto — found automatically)
     <footer class="reveal-footer">  right after the stage

   Desktop: the stage is sized to end exactly at the bottom of the viewport,
   so each column scrolls on its own and the window itself doesn't scroll.
   The footer sits pinned underneath the page (position: sticky; bottom: 0,
   covered by the stage). Once there's no column content left to scroll,
   further scrolling moves the window instead — the whole page slides up
   like a sheet and uncovers the footer. Scrolling back up lowers the page
   first, then the columns take over again.

   Wheel routing over the stage, scrolling down:
     1. the column under the cursor scrolls natively while it can
     2. if it's at its end (or too short to scroll), another column that
        still has content left takes the scroll — so a short intro column
        never feels "dead"
     3. once every column is at its end, the page lifts (window scroll)
   Scrolling up: if the page is lifted, lower it first; else native.

   Below each page's column breakpoint the CSS flattens the columns into
   normal document flow; the stage height is released and the footer is
   revealed by plain window scroll at the end of the page.

   --lift (0 → 1, how much of the footer is uncovered) is set on <html> for
   the sheet's shadow/corners and the footer's settle-in (shared.css). */
(function () {
  const stage = document.querySelector('.split-stage');
  const footer = document.querySelector('footer.reveal-footer');
  if (!stage) return;
  const root = document.documentElement;

  let cols = [];
  let split = false;

  const isCol = (el) => {
    const oy = getComputedStyle(el).overflowY;
    return oy === 'auto' || oy === 'scroll';
  };
  const room = (el) => el.scrollHeight - el.clientHeight - el.scrollTop; // px left below
  const canDown = (el) => room(el) > 1;

  function layout() {
    // Columns: outermost scrollable descendants of the stage
    stage.querySelectorAll('.split-col').forEach((c) => c.classList.remove('split-col'));
    cols = [...stage.querySelectorAll('*')].filter(isCol);
    cols = cols.filter((el) => !cols.some((o) => o !== el && o.contains(el)));
    cols.forEach((c) => c.classList.add('split-col'));
    split = cols.length > 0;

    root.classList.toggle('split-active', split);
    if (split) {
      // Stage ends exactly at the viewport's bottom edge (measured with the
      // page lowered), so the footer below it starts just out of view.
      const top = stage.getBoundingClientRect().top + window.scrollY;
      stage.style.height = Math.max(240, window.innerHeight - top) + 'px';
    } else {
      stage.style.height = '';
    }
    updateLift();
  }

  function updateLift() {
    if (!footer) return;
    const h = footer.offsetHeight || 1;
    const uncovered = window.innerHeight - stage.getBoundingClientRect().bottom;
    const p = Math.min(1, Math.max(0, uncovered / h));
    root.style.setProperty('--lift', p.toFixed(4));
  }

  stage.addEventListener('wheel', (e) => {
    if (!split || e.ctrlKey || e.defaultPrevented) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    const dy = e.deltaY * unit;
    if (!dy) return;

    if (dy < 0) {
      // Page lifted: lower it back over the footer before columns scroll up
      if (window.scrollY > 0) {
        e.preventDefault();
        window.scrollBy({ top: dy, behavior: 'instant' });
      }
      return;
    }

    // Down. Let the browser scroll whatever scrollable thing is under the
    // cursor (the column, or something nested inside it) while it can.
    for (let el = e.target; el && el !== stage; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight && isCol(el) && canDown(el)) return;
    }

    e.preventDefault();
    const other = cols.filter(canDown).sort((a, b) => room(b) - room(a))[0];
    if (other) other.scrollTop += dy;
    else window.scrollBy({ top: dy, behavior: 'instant' });
  }, { passive: false });

  // In-page links (the case studies' side-column section links). A native
  // #hash jump scrolls every scrollable ancestor of the target, the window
  // included, which lifts the page and flashes the footer. Instead scroll
  // only the column that holds the section, and lower the page if it was
  // lifted.
  function columnOf(el) {
    return cols.find((c) => c.contains(el));
  }
  function jumpTo(target, smooth) {
    const col = columnOf(target);
    if (!col) return false;
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const top = col.scrollTop + target.getBoundingClientRect().top - col.getBoundingClientRect().top - margin;
    const behavior = smooth ? 'smooth' : 'instant';
    col.scrollTo({ top, behavior });
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior });
    return true;
  }
  document.addEventListener('click', (e) => {
    if (!split || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    let target;
    try { target = document.querySelector(a.getAttribute('href')); } catch (_) { return; }
    if (!target || !stage.contains(target)) return;
    if (!jumpTo(target, true)) return;
    e.preventDefault();
    history.replaceState(null, '', a.getAttribute('href'));
  });

  window.addEventListener('scroll', updateLift, { passive: true });
  window.addEventListener('resize', layout);
  // Late-loading media/fonts can change what's scrollable or the footer height
  window.addEventListener('load', layout);
  if (window.ResizeObserver && footer) new ResizeObserver(updateLift).observe(footer);
  layout();

  // Opened with a #section in the URL: the browser's own jump may have
  // lifted the page, so settle it back and scroll just the column.
  if (split && location.hash) {
    let target = null;
    try { target = document.querySelector(location.hash); } catch (_) {}
    if (target && stage.contains(target)) jumpTo(target, false);
  }
})();
